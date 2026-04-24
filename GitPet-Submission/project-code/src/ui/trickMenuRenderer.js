// ============================================================
// trickMenuRenderer.js — Renders trick menu as ANSI/HTML
// ============================================================

import { TRICKS } from '../utils/constants.js';

const A = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  white:   '\x1b[37m',
};
const c = (code, str) => `${code}${str}${A.reset}`;

export function renderTrickMenu(petLevel = 1) {
  const lines = [];
  const sep = c(A.dim, '  ' + '─'.repeat(56));

  lines.push('');
  lines.push(`  ${c(A.bold + A.cyan, '🐶 Trick Menu')}  ${c(A.dim, `(Your level: ${petLevel})`)}`);
  lines.push(sep);
  lines.push('');

  // Column headers
  lines.push(
    `  ${c(A.bold, 'Trick'.padEnd(14))}` +
    `${c(A.bold, 'Command'.padEnd(36))}` +
    `${c(A.bold, 'Lvl'.padEnd(6))}` +
    `${c(A.bold, 'Status')}`
  );
  lines.push(c(A.dim, '  ' + '─'.repeat(56)));

  for (const trick of TRICKS) {
    const unlocked = petLevel >= trick.level;
    const name    = trick.name.padEnd(14);
    const cmd     = (trick.command ?? 'git log --oneline -10 (recent commits)').substring(0, 34).padEnd(36);
    const lvl     = String(trick.level).padEnd(6);
    const status  = unlocked
      ? c(A.green,  '✅ Ready')
      : c(A.yellow, `🔒 Locked`);

    lines.push(
      `  ${c(unlocked ? A.white : A.dim, name)}` +
      `${c(A.dim, cmd)}` +
      `${c(A.dim, lvl)}` +
      status
    );
  }

  lines.push('');
  lines.push(sep);
  lines.push(c(A.dim, '  Press [P] to close'));
  lines.push('');

  return lines.join('\n');
}