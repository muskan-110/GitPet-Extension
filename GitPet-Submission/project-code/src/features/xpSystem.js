// ============================================================
// xpSystem.js — XP ledger watcher
// ============================================================
// Listens to 'xp:gained' events and runs the achievement +
// level-up checklist after each gain.
// This keeps XP side-effects out of every individual feature.

import bus                  from '../core/eventBus.js';
import { checkAchievements } from './achievements.js';
import { checkLevelUp }      from '../pet/evolution.js';
import log                   from '../utils/logger.js';

/**
 * Initialise XP system listeners. Call once at startup.
 */
export function initXPSystem() {
  bus.on('xp:gained', ({ amount, reason }) => {
    log.debug(`XP gained: +${amount} (${reason})`);
    // Order matters: level-up first, then achievement (achievement
    // conditions often check the new level).
    checkLevelUp();
    checkAchievements();
    bus.emit('pet:updated');
  });

  log.debug('XP system initialised.');
}

/**
 * Returns a breakdown of XP required for each level, plus
 * how much the user still needs for the next level.
 * Used by the stats/level display.
 *
 * @param {number} currentXP
 * @param {number} currentLevel
 * @returns {{ xpForNext: number, xpInLevel: number, progressPct: number }}
 */
export function xpBreakdown(currentXP, currentLevel) {
  const thresholds = [0, 0, 100, 300, 600, 1000];
  const curr = thresholds[currentLevel]    ?? 0;
  const next = thresholds[currentLevel + 1] ?? Infinity;

  if (!isFinite(next)) {
    return { xpForNext: 0, xpInLevel: currentXP - curr, progressPct: 100 };
  }

  const xpInLevel   = currentXP - curr;
  const levelRange  = next - curr;
  const progressPct = Math.min(100, Math.round((xpInLevel / levelRange) * 100));

  return { xpForNext: next - currentXP, xpInLevel, progressPct };
}