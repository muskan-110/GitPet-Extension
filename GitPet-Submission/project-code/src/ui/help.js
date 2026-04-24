// ============================================================
// help.js — Help screen (press H)
// ============================================================

import bus                from '../core/eventBus.js';
import { formatTricksTable } from '../features/tricks.js';
import { LEVELS, MOODS }     from '../utils/constants.js';

const A = {
  clear:   '\x1b[2J\x1b[H',
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
};
const c = (code, str) => `${code}${str}${A.reset}`;

export function renderHelp() {
  const KEY_ROWS = [
    ['F', 'Feed — Scan for TODOs, FIXMEs, console.logs'],
    ['P', 'Play — Smart dog tricks (git commands)'],
    ['L', 'Level — View level, HP & XP info'],
    ['S', 'Stats — Dashboard with heatmap'],
    ['C', 'Commit — Smart commit message generator'],
    ['T', 'Timer — Focus/Pomodoro mode'],
    ['A', 'Awards — View achievements'],
    ['R', 'Refresh — Re-scan repository health'],
    ['H', 'Help — Show this screen'],
    ['E', 'Exit — Save and exit'],
    ['X', 'Reset — Reset game (delete pet)'],
  ];

  const LEVEL_ROWS = LEVELS.map(l =>
    `  Lv.${l.level}  ${l.name.padEnd(16)} ${l.xpRequired.toString().padStart(5)} XP  — ${l.special}`
  );

  const MOOD_ROWS = Object.values(MOODS)
    .filter(m => m.min >= 0)
    .map(m => `  ${m.emoji}  ${m.label.padEnd(10)} HP ${m.min}–${m.max}`);

  // ← removed .map(line => line + '\x1b[K') — was causing [K in webview
  const lines = [
    '',
    c(A.bold + A.cyan, '  🐶 GitPet — Help'),
    c(A.dim,           '  ' + '═'.repeat(55)),
    '',
    c(A.bold, '  Controls'),
    ...KEY_ROWS.map(([k, d]) =>
      `    ${c(A.yellow + A.bold, `[${k}]`)}  ${d}`
    ),
    '',
    c(A.bold, '  Evolution Levels'),
    ...LEVEL_ROWS,
    '',
    c(A.bold, '  Mood States'),
    ...MOOD_ROWS,
    '',
    c(A.bold, '  Smart Tricks (press P)'),
    '',
    ...formatTricksTable().split('\n').map(l => `    ${l}`),
    '',
    c(A.bold, '  Tips for a Happy Pet'),
    c(A.dim, '    • Commit frequently (1+ per day)'),
    c(A.dim, '    • Keep your working tree clean'),
    c(A.dim, '    • Add test files to your project'),
    c(A.dim, '    • Include a README.md'),
    c(A.dim, '    • Address TODOs and FIXMEs'),
    c(A.dim, '    • Use focus mode to stay productive!'),
    '',
    c(A.dim, '  Press [H] to return…'),
    '',
  ];

  return lines.join('\n');
}