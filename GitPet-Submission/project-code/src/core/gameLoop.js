// ============================================================
// gameLoop.js — Tick-based game update cycle
// ============================================================
// Runs a `setInterval` every TICK_MS milliseconds.
// On each tick it:
//   1. Advances the animation frame
//   2. Checks inactivity → triggers sleep
//   3. Slowly decays HP over time (encourages daily commits)
//   4. Emits 'ui:render' so the renderer redraws
//
// Start / stop are explicit so tests can control time.

import bus          from './eventBus.js';
import stateManager from './stateManager.js';
import log          from '../utils/logger.js';
import { SLEEP_TIMEOUT_MS } from '../utils/constants.js';

// Tick rate — 1 second feels responsive without hammering CPU
const TICK_MS     = 1_000;

// HP drains at this rate per minute of inactivity (very gentle)
const HP_DECAY_PER_MINUTE = 0.2;

let _intervalId    = null;
let _tickCount     = 0;
let _lastInputTime = Date.now();
let _isSleeping    = false;

// ── Public API ────────────────────────────────────────────────

const gameLoop = {
  start() {
    if (_intervalId) return; // already running
    _lastInputTime = Date.now();

    // Track user activity through the event bus
    bus.on('input:feed',    _resetActivity);
    bus.on('input:play',    _resetActivity);
    bus.on('input:commit',  _resetActivity);
    bus.on('input:stats',   _resetActivity);
    bus.on('input:level',   _resetActivity);
    bus.on('input:timer',   _resetActivity);
    bus.on('input:awards',  _resetActivity);
    bus.on('input:help',    _resetActivity);
    bus.on('input:refresh', _resetActivity);

    _intervalId = setInterval(_tick, TICK_MS);
    log.debug('GameLoop started.');
  },

  stop() {
    if (!_intervalId) return;
    clearInterval(_intervalId);
    _intervalId = null;
    log.debug('GameLoop stopped.');
  },

  /** Returns total elapsed ticks (useful for animation offsets) */
  get ticks() { return _tickCount; },

  /** Returns whether the pet is currently sleeping */
  get sleeping() { return _isSleeping; },

  /** Call this whenever meaningful user activity happens */
  resetActivity: _resetActivity,
};

// ── Internal ─────────────────────────────────────────────────

function _resetActivity() {
  _lastInputTime = Date.now();
  if (_isSleeping) {
    _isSleeping = false;
    stateManager.updatePet({ mood: 'HAPPY' });
    bus.emit('pet:wake');
    log.debug('Pet woke up.');
  }
}

function _tick() {
  _tickCount++;

  const state = stateManager.get();
  const now = Date.now();

  // ── Sleep check ───────────────────────────────────────────
  const idleMs = now - _lastInputTime;

  if (!_isSleeping && idleMs >= SLEEP_TIMEOUT_MS) {
    _isSleeping = true;
    stateManager.updatePet({ mood: 'SLEEPING' });
    bus.emit('pet:sleep');
    log.debug('Pet fell asleep (idle).');
  }

  // ── Gentle HP decay (once per minute = every 60 ticks) ───
  if (_tickCount % 60 === 0 && !_isSleeping) {
    const currentHP = state.pet.hp;
    const newHP = Math.max(0, currentHP - HP_DECAY_PER_MINUTE);

    if (newHP !== currentHP) {
      stateManager.setHP(newHP);
    }
  }

  // ── 🔥 Animation tick (REQUIRED)
  bus.emit('animation:tick', { tick: _tickCount });

  // ── 🔥 FORCE UI UPDATE (VERY IMPORTANT)
  bus.emit('pet:updated'); // triggers render correctly
}


export default gameLoop;