// ============================================================
// moodEngine.js — HP → mood mapping + mood update logic
// ============================================================
// Mood is always derived from HP (and sleep state).
// Call syncMood() whenever HP or sleep state changes to keep
// state.pet.mood up to date and emit the change event.

import bus          from '../core/eventBus.js';
import stateManager from '../core/stateManager.js';
import gameLoop     from '../core/gameLoop.js';
import { MOODS }    from '../utils/constants.js';
import log          from '../utils/logger.js';

/**
 * Deterministic mood mapping based strictly on HP.
 */
export function getMoodFromHP(hp) {
  if (hp >= 90) return 'EXCITED';
  if (hp >= 70) return 'HAPPY';
  if (hp >= 50) return 'NEUTRAL';
  if (hp >= 25) return 'SAD';
  return 'SICK';
}

export function getMoodMessage(mood) {
  const messages = {
    EXCITED: "🤩 I'm loving this repo!",
    HAPPY:   "😊 Things are looking good!",
    NEUTRAL: "😐 Not bad... not great.",
    SAD:     "😢 Repo needs some love...",
    SICK:    "🤒 I'm not feeling well... fix things!"
  };
  return messages[mood];
}

/**
 * Reads current HP and sleep state, derives the correct mood,
 * updates stateManager if it changed, and emits the event.
 * Call this after any HP or sleep change.
 */
export function syncMood() {
  const state   = stateManager.get();
  const hp      = state.pet.hp;
  const sleeping = gameLoop.sleeping;

  const newMood = sleeping ? 'SLEEPING' : getMoodFromHP(hp);
  const oldMood = state.pet.mood;

  if (newMood !== oldMood) {
    stateManager.updatePet({ mood: newMood });
    bus.emit('pet:mood-changed', { mood: newMood, was: oldMood });
    log.debug(`Mood: ${oldMood} → ${newMood} (HP=${hp})`);
  }
}

/**
 * Returns the display emoji and label for a mood key.
 * @param {string} moodKey
 * @returns {{ emoji: string, label: string }}
 */
export function moodDisplay(moodKey) {
  const m = MOODS[moodKey] ?? MOODS.NEUTRAL;
  return { emoji: m.emoji, label: m.label };
}

/**
 * Initialise: subscribe to HP and sleep events to auto-sync mood.
 */
export function initMoodEngine() {
  bus.on('pet:hp-changed', () => syncMood());
  bus.on('pet:sleep',      () => syncMood());
  bus.on('pet:wake',       () => syncMood());
  log.debug('MoodEngine initialised.');
}