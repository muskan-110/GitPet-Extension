// ============================================================
// dashboard.js — Stats dashboard (press S)
// ============================================================

import stateManager        from '../core/stateManager.js';
import pet                 from '../pet/pet.js';
import { generateHeatmap } from '../git/heatmapGenerator.js';
import { progressBar }     from '../utils/formatters.js';

const A = {
  clear:   '\x1b[2J\x1b[H',
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
};
const c = (code, str) => `${code}${str}${A.reset}`;
const box = (title, lines) => {
  const inner = lines.map(l => `  ${l}`).join('\n');
  return `${c(A.bold + A.cyan, `── ${title} ──`)}\n${inner}`;
};

export function renderDashboard() {
  const state = stateManager.get();
  const git   = state.git;

  const sections = [];

  const xpThresholds = [0, 0, 100, 300, 600, 1000];
  const currLvlXP    = xpThresholds[pet.level]     ?? 0;
  const nextLvlXP    = xpThresholds[pet.level + 1] ?? Infinity;
  const xpPct        = isFinite(nextLvlXP)
    ? Math.min(100, Math.round(((pet.xp - currLvlXP) / (nextLvlXP - currLvlXP)) * 100))
    : 100;

  sections.push(box('Pet Progress', [
    `Name:   ${c(A.yellow, pet.name)}  ${pet.moodEmoji}  ${pet.moodLabel}`,
    `Level:  ${c(A.bold, String(pet.level))} — ${pet.levelName}  (${pet.levelSpecial})`,
    `HP:     ${progressBar(pet.hp, 100, 30)}  ${pet.hp}/100`,
    `XP:     ${progressBar(xpPct, 100, 30)}  ${pet.xp} XP${isFinite(nextLvlXP) ? ` / ${nextLvlXP}` : ' (MAX)'}`,
    `Days:   ${pet.daysTogether} day${pet.daysTogether !== 1 ? 's' : ''} together`,
  ]));

  const heatmap = generateHeatmap(git.commitsByDay ?? {});
  sections.push(box('Commit Heatmap (last 4 weeks)', heatmap.split('\n')));

  sections.push(box('Git Stats', [
    `Total commits:    ${c(A.green, String(git.totalCommits ?? 0))}`,
    `Today's commits:  ${c(A.green, String(_todayCommits(git.commitsByDay)))}`,
    `Current streak:   ${c(A.yellow, `${git.streak ?? 0} day${(git.streak ?? 0) !== 1 ? 's' : ''}`)}`,
    `Last commit:      ${c(A.dim, git.lastCommit ?? 'never')}`,
    `Repo health:      ${progressBar(git.health ?? 0, 100, 20)}  ${git.health ?? 0}/100`,
  ]));

  sections.push(box('Activity', [
    `Feeds (scans):  ${state.pet.feedCount ?? 0}`,
    `Plays (tricks): ${state.pet.playCount ?? 0}`,
    `Focus sessions: ${state.focus.totalSessions ?? 0}  (${state.focus.totalMinutes ?? 0} min total)`,
    `Achievements:   ${state.achievements.length} unlocked`,
  ]));

  // ← removed .map(line => line + '\x1b[K') — this was causing [K in webview
  const output = [
    '',
    c(A.bold + A.cyan, '  📊 GitPet — Stats Dashboard'),
    c(A.dim, '  ' + '═'.repeat(56)),
    '',
    ...sections.map(s => s.split('\n').map(l => `  ${l}`).join('\n')),
    '',
    c(A.dim, '  Press [S] to return…'),
    '',
  ].join('\n');

  return output;
}

function _todayCommits(commitsByDay) {
  if (!commitsByDay) return 0;
  const key = new Date().toISOString().slice(0, 10);
  return commitsByDay[key] ?? 0;
}