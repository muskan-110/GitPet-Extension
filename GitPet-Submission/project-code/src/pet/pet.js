// ============================================================
// pet.js — Pet entity: public API wrapper
// ============================================================
// A thin convenience class so UI / feature code can write
//   pet.name, pet.hp, pet.moodEmoji
// instead of drilling into stateManager every time.
//
// This is NOT the authoritative state — stateManager is.
// Think of Pet as a "view" over the state with helper getters.

import stateManager       from '../core/stateManager.js';
import { moodDisplay }    from './moodEngine.js';
import { applyCosmetics, levelInfo } from './evolution.js';
import animationEngine    from '../animations/animationEngine.js';

class Pet {
  // ── Identity ────────────────────────────────────────────────

  get name()  { return stateManager.get().pet.name; }
  get hp()    { return Math.round(stateManager.get().pet.hp); }
  get xp()    { return stateManager.get().pet.xp; }
  get level() { return stateManager.get().pet.level; }
  get mood()  { return stateManager.get().pet.mood; }

  // ── Derived display helpers ─────────────────────────────────

  get moodEmoji()  { return moodDisplay(this.mood).emoji; }
  get moodLabel()  { return moodDisplay(this.mood).label; }
  get levelName()  { return levelInfo(this.level).name; }
  get levelSpecial(){ return levelInfo(this.level).special; }

  /** Days since the pet was created */
  get daysTogether() { return stateManager.getDaysTogether(); }

  /** XP required for the next level (Infinity at max) */
  get xpToNext() {
    const next = stateManager.get().pet.level + 1;
    const def  = [null, 0, 100, 300, 600, 1000][next];
    return def ?? Infinity;
  }

  /** XP progress within the current level (0–100%) */
  get xpProgress() {
    const curr    = [0, 0, 100, 300, 600, 1000][this.level] ?? 0;
    const next    = this.xpToNext;
    if (!isFinite(next)) return 100;
    return Math.min(100, Math.round(((this.xp - curr) / (next - curr)) * 100));
  }

  // ── ASCII art ───────────────────────────────────────────────

  /**
   * Returns the current animation frame with level cosmetics applied.
   * @returns {string}
   */
  get currentFrame() {
    const raw = animationEngine.currentFrame();
    return applyCosmetics(raw, this.level);
  }

  // ── Action counts (for achievements) ────────────────────────

  get feedCount() { return stateManager.get().pet.feedCount ?? 0; }
  get playCount() { return stateManager.get().pet.playCount ?? 0; }
  get scanCount() { return stateManager.get().pet.scanCount ?? 0; }
}

// Export singleton — there is only one pet
const pet = new Pet();
export default pet;