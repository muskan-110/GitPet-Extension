// ============================================================
// evolution.js — Level-up logic & cosmetic upgrades
// ============================================================
// Each level grants the pet a visual upgrade applied as a
// text prefix/suffix to the ASCII art frame string.
//
// Cosmetics are purely additive — they wrap the base frame
// so frames.js never needs to know about levels.

import bus          from '../core/eventBus.js';
import stateManager from '../core/stateManager.js';
import { LEVELS }   from '../utils/constants.js';
import log          from '../utils/logger.js';

// ── Cosmetic decorators per level ────────────────────────────
// Each entry is a function that takes the raw ASCII frame string
// and returns a decorated version.
const LEVEL_DECORATOR = {
  1: frame => frame,  // Puppy — no extras
  2: frame => frame,  // Young Dog — no extras yet
  3: frame => _addSpots(frame),       // Adult Dog — spotted coat
  4: frame => _addSunglasses(frame),  // Cool Dog — sunglasses
  5: frame => _addCrown(frame) + '\n✨ Legendary Doge ✨', // Legendary
};

/**
 * Applies the cosmetic decorator for the current level to an ASCII frame.
 * @param {string} frame        - Raw ASCII art string
 * @param {number} level        - Current pet level (1–5)
 * @returns {string}  Decorated frame
 */
export function applyCosmetics(frame, level) {
  const decorator = LEVEL_DECORATOR[level] ?? LEVEL_DECORATOR[1];
  return decorator(frame);
}

/**
 * Checks whether the pet should level up given its current XP.
 * If so, updates state, plays the animation, and returns the new level.
 * (stateManager.addXP already calls levelFromXP and emits 'pet:leveled-up';
 *  this function adds the cosmetic/celebration layer on top.)
 * @returns {number|null}  New level if leveled up, else null
 */
export function checkLevelUp() {
  const state   = stateManager.get();
  const xp      = state.pet.xp;
  let level     = state.pet.level;

  let leveledUp = false;

  // 🔥 loop to handle multiple level-ups
  while (true) {
    const nextDef = LEVELS.find(l => l.level === level + 1);

    if (!nextDef || xp < nextDef.xpRequired) break;

    level = nextDef.level;
    leveledUp = true;

    log.ok(`Level up! → Lv.${level} (${nextDef.name})`);

    bus.emit('pet:leveled-up', {
      level,
      name: nextDef.name
    });
  }

  // 🔥 IMPORTANT: update state
  if (leveledUp) {
    stateManager.updatePet({ level });
    bus.emit('pet:updated'); // 🔥 force UI update
  }

  return leveledUp ? level : null;
}

/**
 * Returns the LEVELS definition for a given level number.
 * @param {number} level
 * @returns {object}
 */
export function levelInfo(level) {
  return LEVELS.find(l => l.level === level) ?? LEVELS[0];
}

// ── Cosmetic helpers ─────────────────────────────────────────

function _addSpots(frame) {
  // Replace some spaces with '.' to hint at a spotted coat
  return frame.replace(/ {3}/g, ' . ');
}

function _addSunglasses(frame) {
  // Replace the eyes pattern (^.^) with shaded glasses (B.B)
  return frame.replace(/\^\.?\^/g, 'B.B');
}

function _addCrown(frame) {
  return `   👑\n${frame}`;
}

/**
 * Initialise evolution listener.
 */
export function initEvolution() {
  // Re-emit level-up with full info when stateManager fires the event
  bus.on('pet:leveled-up', ({ level }) => {
    const info = levelInfo(level);
    log.ok(`🎉 ${info.name} unlocked! "${info.special}"`);
  });
}