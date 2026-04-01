// ============================================================
// tricks.js — Tricks menu display and execution coordinator
// ============================================================
// Exposes functions for the UI layer to display the available
// tricks table and execute a chosen trick.
// The actual git execution is handled by behaviour.js handlePlay();
// this module just formats the data for display.

import stateManager from '../core/stateManager.js';
import { TRICKS }   from '../utils/constants.js';
import { padRight } from '../utils/formatters.js';

/**
 * Returns the list of tricks available at the current level,
 * formatted as display rows.
 *
 * @returns {Array<{name:string, command:string, level:number, locked:boolean}>}
 */
export function getAvailableTricks() {
  const level = stateManager.get().pet.level;
  return TRICKS.map(t => ({
    ...t,
    command: t.command ?? 'git log --oneline -10 (recent commits)',
    locked:  t.level > level,
  }));
}

/**
 * Builds a printable tricks table.
 *
 * Example output:
 *  Trick        Command                         Level  Status
 *  ──────────── ──────────────────────────────  ─────  ──────
 *  Fetch        git fetch --all                  1      ✅
 *  Roll Over    git branch -a                    2      ✅
 *  Howl         git remote -v                    3      🔒
 *
 * @returns {string}
 */
export function formatTricksTable() {
  const tricks = getAvailableTricks();
  const W = { name: 14, cmd: 36, lvl: 6 };

  const header = [
    padRight('Trick', W.name),
    padRight('Command', W.cmd),
    padRight('Lvl', W.lvl),
    'Status',
  ].join('  ');

  const divider = [
    '─'.repeat(W.name),
    '─'.repeat(W.cmd),
    '─'.repeat(W.lvl),
    '──────',
  ].join('  ');

  const rows = tricks.map(t => [
    padRight(t.name, W.name),
    padRight(t.command.slice(0, W.cmd - 1), W.cmd),
    padRight(String(t.level), W.lvl),
    t.locked ? '🔒 Locked' : '✅ Ready',
  ].join('  '));

  return [header, divider, ...rows].join('\n');
}

/**
 * Returns the next trick the pet would perform (round-robin by playCount).
 * @returns {object|null}
 */
export function nextTrick() {
  const state    = stateManager.get();
  const level    = state.pet.level;
  const playCount = state.pet.playCount ?? 0;
  const available = TRICKS.filter(t => t.level <= level);
  if (!available.length) return null;
  return available[playCount % available.length];
}