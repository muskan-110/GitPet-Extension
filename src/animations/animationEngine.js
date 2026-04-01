// ============================================================
// animationEngine.js — Stateful animation player
// ============================================================
// Subscribes to 'animation:tick' from the game loop and
// advances the current animation frame at the correct FPS.
// Other modules call play() to switch animations.

import bus              from '../core/eventBus.js';
import stateManager     from '../core/stateManager.js';
import { getAnimation } from './animationMap.js';
import { IDLE }         from './frames.js';
import log              from '../utils/logger.js';

// ── Internal state ────────────────────────────────────────────
let _current      = IDLE;   // active animation object
let _frameIndex   = 0;      // which frame we're on
let _ticksSinceFrame = 0;   // accumulator (ticks advance at TICK_MS=1s)
let _oneShotDone  = false;  // true after a non-looping anim completes
let _oneShotCallback = null;// called when one-shot finishes

// Ticks per game-loop tick (game loop is always 1 s)
const GAME_TICK_S = 1;

// ── Public API ────────────────────────────────────────────────
const animationEngine = {
  /**
   * Boot the engine — subscribe to tick events.
   * Call once at startup.
   */
  init() {
    bus.on('animation:tick', ({ tick }) => _onTick(tick));
    bus.on('pet:leveled-up', () => this.play('level_up'));
    bus.on('pet:updated', () => {
      this.syncToMood();
    }); 
    bus.on('action:play',    () => this.play('trick'));
    this.syncToMood();
    log.debug('AnimationEngine initialised.');
  },

  /**
   * Switch to a named animation.
   * @param {string}    name      - 'trick' | 'level_up' | 'idle' | …
   * @param {Function}  [onDone]  - Called when a one-shot animation ends
   */
  play(name, onDone = null) {
    const mood  = stateManager.get().pet.mood;
    const anim  = getAnimation(mood, name);

    if (_current.name === anim.name && !_oneShotDone) return; // already playing

    _current           = anim;
    _frameIndex        = 0;
    _ticksSinceFrame   = 0;
    _oneShotDone       = false;
    _oneShotCallback   = onDone;
    log.debug(`Animation → "${anim.name}"`);
  },

  /**
   * Returns the ASCII art string for the current frame.
   * @returns {string}
   */
  currentFrame() {
    return _current.frames[_frameIndex] ?? _current.frames[0];
  },

  /**
   * Forces the engine to re-evaluate the correct idle animation
   * for the current mood (e.g. after mood changes).
   */
  syncToMood() {
    const mood = stateManager.get().pet.mood;
    // Only sync if we're not mid one-shot
    if (_current.loop || _oneShotDone) {
      this.play('idle');
    }
  },
};

// ── Internal tick handler ─────────────────────────────────────

function _onTick() {
  if (!_current || _current.frames.length === 0) return;

  _ticksSinceFrame++;

  const ticksPerFrame = Math.max(1, Math.round(GAME_TICK_S / (_current.fps * GAME_TICK_S)));

  if (_ticksSinceFrame >= ticksPerFrame) {
    _ticksSinceFrame = 0;

    const lastFrame = _current.frames.length - 1;

    if (_frameIndex < lastFrame) {
      _frameIndex++;
    } else if (_current.loop) {
      _frameIndex = 0; // loop back
    } else {
      // One-shot complete
      if (!_oneShotDone) {
        _oneShotDone = true;
        if (_oneShotCallback) _oneShotCallback();
        // Transition back to idle mood animation
        animationEngine.syncToMood();
      }
    }
  }
}

export default animationEngine;