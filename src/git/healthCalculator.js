// ============================================================
// healthCalculator.js — Composite repository health score
// ============================================================

import fs   from 'fs';
import path from 'path';
import { gitLines, git } from './gitService.js';
import {
  HEALTH_WEIGHTS,
  COMMIT_FREQ_THRESHOLDS,
} from '../utils/constants.js';
import bus from '../core/eventBus.js';
import stateManager from '../core/stateManager.js';
import log from '../utils/logger.js';

export async function calculateHealth(stats, cwd = null) {
  const [treeScore,    treeIssues]  = await _workingTreeScore(cwd);
  const [testScore,    testIssue]   = await _testFilesScore(cwd);
  const [readmeScore,  readmeIssue] = _readmeScore(cwd);
  const [freqScore,    freqNote]    = _commitFrequencyScore(stats.commitsThisWeek);
  const [streakScore,  streakNote]  = _streakScore(stats.streak);
  const [recencyScore, recencyNote] = _recentActivityScore(stats.lastCommitDate);

  const W = HEALTH_WEIGHTS;
  const composite = Math.round(
    freqScore    * W.COMMIT_FREQUENCY +
    streakScore  * W.COMMIT_STREAK    +
    treeScore    * W.WORKING_TREE     +
    testScore    * W.TEST_FILES       +
    readmeScore  * W.README           +
    recencyScore * W.RECENT_ACTIVITY
  );

  const finalScore = Math.min(100, Math.max(0, composite));
  const issues     = [treeIssues, testIssue, readmeIssue].flat().filter(Boolean);
  const positives  = [freqNote, streakNote, recencyNote].flat().filter(Boolean);

  const prevHP = stateManager.get().pet.hp;
  if (finalScore !== prevHP) {
    const diff = finalScore - prevHP;
    if (diff > 0) {
      const reason = positives[0] || 'good activity';
      bus.emit('ui:message', { text: `🐶 HP +${diff}: ${reason}`, type: 'success' });
    } else {
      const reason = issues[0] || 'needs attention';
      bus.emit('ui:message', { text: `🐶 HP ${diff}: ${reason}`, type: 'warn' });
    }
  }

  log.debug('Health breakdown:', {
    freq: freqScore, streak: streakScore, tree: treeScore,
    tests: testScore, readme: readmeScore, recency: recencyScore,
    composite,
  });

  return {
    score: finalScore,
    breakdown: {
      commitFrequency: freqScore,
      commitStreak:    streakScore,
      workingTree:     treeScore,
      testFiles:       testScore,
      readme:          readmeScore,
      recentActivity:  recencyScore,
    },
    issues,
    positives,
  };
}

// ── Sub-scorers ───────────────────────────────────────────────

function _commitFrequencyScore(commitsThisWeek) {
  for (const { min, score } of COMMIT_FREQ_THRESHOLDS) {
    if (commitsThisWeek >= min) {
      const note = commitsThisWeek >= 10
        ? `${commitsThisWeek} commits this week — amazing!`
        : null;
      return [score, note];
    }
  }
  return [0, null];
}

function _streakScore(streak) {
  if (streak >= 7) return [100, `${streak}-day streak — unstoppable!`];
  if (streak >= 3) return [70,  `${streak}-day streak — keep it up!`];
  if (streak >= 1) return [40,  null];
  return [0, null];
}

async function _workingTreeScore(cwd = null) {
  // ← use git directly instead of status() to get raw output
  const raw = await git(['status', '--porcelain'], 8000, cwd);
  const issues = [];

  if (!raw) return [100, []];

  const lines = raw.split('\n').filter(Boolean);
  if (!lines.length) return [100, []];

  // porcelain format: XY filename — X=index, Y=worktree
  // modified/added = any line where either column is not '?' or ' '
  const modified  = lines.filter(l => {
    const xy = l.substring(0, 2);
    return xy !== '??' && xy.trim() !== '';
  }).length;

  const untracked = lines.filter(l => l.startsWith('??')).length;

  if (modified  > 0) issues.push(`${modified} uncommitted change${modified > 1 ? 's' : ''}`);
  if (untracked > 5) issues.push(`${untracked} untracked files`);

  const penalty = modified * 15 + Math.max(0, untracked - 5) * 5;
  const score   = Math.max(0, 100 - penalty);

  return [score, issues];
}

async function _testFilesScore(cwd = null) {
  const patterns = ['*.test.js', '*.spec.js', '*.test.ts', '*.spec.ts', 'jest.config.js', 'jest.config.ts'];
  const results  = await gitLines(
    ['ls-files', '--', ...patterns],
    cwd
  );
  if (results.length > 0) return [100, null];
  return [0, 'No test files found — add tests for a happier pet!'];
}

function _readmeScore(cwd = null) {
  const base = cwd ?? process.cwd();
  const candidates = ['README.md', 'README.txt', 'README', 'README.rst'];
  const found = candidates.some(f => fs.existsSync(path.resolve(base, f)));
  if (found) return [100, null];
  return [0, 'No README found — add documentation!'];
}

function _recentActivityScore(lastCommitDate) {
  if (!lastCommitDate) return [0, null];

  // ← compare date strings directly to avoid timezone issues
  const today     = new Date().toISOString().slice(0, 10);
  const commitDay = lastCommitDate.slice(0, 10);

  const todayMs  = new Date(today).getTime();
  const commitMs = new Date(commitDay).getTime();
  const daysSince = Math.floor((todayMs - commitMs) / 86_400_000);

  if (daysSince === 0) return [100, 'Committed today — great work!'];
  if (daysSince <= 1)  return [80,  null];
  if (daysSince <= 3)  return [50,  null];
  if (daysSince <= 7)  return [25,  null];
  return [0, null];
}