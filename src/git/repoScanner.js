// ============================================================
// repoScanner.js — Orchestrates the full repository scan
// ============================================================

import bus                 from '../core/eventBus.js';
import stateManager        from '../core/stateManager.js';
import { collectStats }    from './statsCollector.js';
import { calculateHealth } from './healthCalculator.js';
import { isGitRepo, gitLines } from './gitService.js';
import log                 from '../utils/logger.js';
import { XP_REWARDS }      from '../utils/constants.js';

// ← addXP param: true for feed, false for refresh
export async function scanRepo(basePath = null, addXP = true) {
  log.info('Scanning repository…');

  // Only add XP when called from feed, not refresh
  if (addXP) {
    const xpBefore = stateManager.get().pet.xp;
    stateManager.addXP(XP_REWARDS.FEED, 'feed/scan');
    const xpAfter = stateManager.get().pet.xp;
    log.debug(`XP updated: ${xpBefore} → ${xpAfter}`);
  }

  const isRepo = await isGitRepo(basePath);

  if (!isRepo) {
    log.warn('Not inside a git repository.');
    stateManager.updatePet({
      scanCount:  (stateManager.get().pet.scanCount ?? 0) + 1,
      lastActive: new Date().toISOString(),
    });
    stateManager.save();
    const empty = { isRepo: false, stats: {}, health: { score: 50 }, codeIssues: [] };
    bus.emit('git:scanned', empty);
    return empty;
  }

  const [stats, codeIssues] = await Promise.all([
    collectStats(basePath),
    _scanCodeIssues(basePath),
  ]);

  const health = await calculateHealth(stats, basePath);

  stateManager.updateGit({
    commitsByDay: stats.commitsByDay,
    streak:       stats.streak,
    totalCommits: stats.totalCommits,
    lastCommit:   stats.lastCommitDate,
    health:       health.score,
  });

  // ← Always update HP regardless of whether it changed
  stateManager.setHP(health.score);

  stateManager.updatePet({
    scanCount:  (stateManager.get().pet.scanCount ?? 0) + 1,
    lastActive: new Date().toISOString(),
  });

  stateManager.save();

  const result = { isRepo: true, stats, health, codeIssues };
  bus.emit('git:scanned', result);
  log.ok(`Scan complete. Health: ${health.score}/100`);
  return result;
}

const ISSUE_PATTERNS = [
  { pattern: /\bTODO\b/,       label: 'TODO' },
  { pattern: /\bFIXME\b/,      label: 'FIXME' },
  { pattern: /console\.log\(/, label: 'console.log' },
];

async function _scanCodeIssues(cwd = null) {
  const issues = [];
  for (const { pattern, label } of ISSUE_PATTERNS) {
    const lines = await gitLines(
      ['grep', '-n', '-i', '--', pattern.source],
      cwd
    );
    if (lines.length > 0) {
      issues.push(`${label}: ${lines.length} occurrence${lines.length > 1 ? 's' : ''}`);
    }
  }
  return issues;
}