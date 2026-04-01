// ============================================================
// animationMap.js — Maps mood / event → animation selection
// ============================================================
// Returns the best animation to play given the current mood
// and an optional triggering event (trick, level-up, etc.)

import {
  IDLE, WALK_LEFT, WALK_RIGHT, SNIFF, SCRATCH,
  ROLL_OVER, CHASE_TAIL, WHIMPER, SICK, SLEEP,
  LEVEL_UP, TRICK,
} from './frames.js';

// ── Mood → idle-pool (randomly chosen when nothing special) ──
const MOOD_IDLE_POOL = {
  EXCITED:  [WALK_LEFT, WALK_RIGHT, CHASE_TAIL, ROLL_OVER, SCRATCH, SNIFF],
  HAPPY:    [WALK_LEFT, WALK_RIGHT, SCRATCH, SNIFF, IDLE],
  NEUTRAL:  [IDLE, SNIFF],
  SAD:      [WHIMPER],
  SICK:     [SICK],
  SLEEPING: [SLEEP],
};

// ── Event → forced animation (overrides mood pool) ───────────
const EVENT_ANIMATION = {
  'level_up': LEVEL_UP,
  'trick':    TRICK,
  'play':     TRICK,
};

/**
 * Returns the animation to play right now.
 * @param {string}      mood   - Current pet mood key
 * @param {string|null} event  - Optional event name (e.g. 'trick')
 * @returns {object}  An animation object from frames.js
 */
export function getAnimation(mood, event = null) {
  // Event-driven overrides always win
  if (event && EVENT_ANIMATION[event]) {
    return EVENT_ANIMATION[event];
  }

  // Sleeping overrides everything else
  if (mood === 'SLEEPING') return SLEEP;

  const pool = MOOD_IDLE_POOL[mood] ?? [IDLE];

  // Weighted random pick: walk variants feel more common in excited mood
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Returns the animation that should play after a special event,
 * then transitions back to the mood-appropriate idle.
 * (Useful for one-shot animations.)
 */
export function getEventThenIdle(mood, event) {
  return {
    event: getAnimation(mood, event),
    idle:  getAnimation(mood, null),
  };
}