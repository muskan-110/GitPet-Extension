// ============================================================
// stateManager.js — Singleton state manager
// ============================================================

import fs   from 'fs';
import path from 'path';
import bus  from './eventBus.js';
import log  from '../utils/logger.js';
import { SAVE_FILE, DEFAULT_PET_STATE } from '../utils/constants.js';
import { daysTogether } from '../utils/formatters.js';
import { getMoodFromHP, getMoodMessage } from '../pet/moodEngine.js';

const GLOBAL_KEY = '__GITPET_STATE_MANAGER__';

let stateManager = globalThis[GLOBAL_KEY];

if (!stateManager) {

  const DEFAULT_STATE = {
    pet: {
      ...DEFAULT_PET_STATE,
      lastActive: null,
    },
    git: {
      commitsByDay: {},
      streak: 0,
      totalCommits: 0,
      lastCommit: null,
      health: 80,
    },
    focus: {
      totalSessions: 0,
      totalMinutes: 0,
    },
    achievements: [],
  };

  let _state    = null;
  let SAVE_PATH = null;  // ← dynamic, set on load()

  function _ensureDir() {
    const dir = path.dirname(SAVE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  function _deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        out[key] = _deepMerge(target[key] ?? {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  stateManager = {

    load(basePath = null) {
      // ← resolve save path from workspace folder, not process.cwd()
      SAVE_PATH = path.resolve(basePath ?? process.cwd(), SAVE_FILE);

      try {
        if (fs.existsSync(SAVE_PATH)) {
          const raw  = fs.readFileSync(SAVE_PATH, 'utf8');
          const saved = JSON.parse(raw);
          _state = _deepMerge(DEFAULT_STATE, saved);
        } else {
          _state = _deepMerge({}, DEFAULT_STATE);
          _state.pet.createdAt = new Date().toISOString();
        }
      } catch {
        _state = _deepMerge({}, DEFAULT_STATE);
        _state.pet.createdAt = new Date().toISOString();
      }
      return _state;
    },

    save() {
      if (!SAVE_PATH) {
        log.warn('save() called before load() — skipping');
        return;
      }
      try {
        _ensureDir();
        fs.writeFileSync(SAVE_PATH, JSON.stringify(_state, null, 2), 'utf8');
      } catch (err) {
        log.error('Save failed:', err.message);
      }
    },

    get() {
      if (!_state) this.load();
      return _state;
    },

    updatePet(partial) {
      Object.assign(_state.pet, partial);
      bus.emit('pet:updated', { pet: _state.pet });
    },

    addXP(amount, reason = '') {
      _state.pet.xp = (_state.pet.xp ?? 0) + amount;

      log.debug(`XP +${amount} (${reason}) → total ${_state.pet.xp}`);

      const thresholds = [0, 100, 300, 600, 1000];
      let level = 1;
      for (let i = 0; i < thresholds.length; i++) {
        if (_state.pet.xp >= thresholds[i]) level = i + 1;
      }

      if (level !== _state.pet.level) {
        _state.pet.level = level;
        bus.emit('pet:leveled-up', { level });
      }

      bus.emit('xp:gained', { amount, reason });
      bus.emit('pet:updated');
    },

    setHP(hp) {
      const prevHP  = _state.pet.hp;
      const newHP   = Math.round(Math.max(0, Math.min(100, hp)));
      const oldMood = _state.pet.mood;
      const newMood = getMoodFromHP(newHP);
      const diff    = newHP - prevHP;

      if (Math.abs(diff) >= 1) {
        bus.emit('ui:message', {
          text: diff > 0 ? `🐶 HP +${diff}` : `🐶 HP -${Math.abs(diff)}`,
          type: diff > 0 ? 'success' : 'warn',
        });
      }

      this.updatePet({ hp: newHP, mood: newMood });

      if (newMood !== oldMood && newMood !== 'SLEEPING') {
        const msg = getMoodMessage(newMood);
        if (msg) bus.emit('ui:message', { text: msg, type: 'info' });
      }
    },

    updateGit(partial) {
      Object.assign(_state.git, partial);
    },

    recordFocusSession(minutes) {
      _state.focus.totalSessions++;
      _state.focus.totalMinutes += minutes;
    },

    hasAchievement(id) {
      return (_state.achievements ?? []).includes(id);
    },

    unlockAchievement(id) {
      if (!_state.achievements.includes(id)) {
        _state.achievements.push(id);
        bus.emit('achievement:unlock', { id });
        return true;   // ← signals newly unlocked (achievements.js uses this)
      }
      return false;
    },

    getDaysTogether() {
      return daysTogether(_state.pet.createdAt);
    },
  };

  globalThis[GLOBAL_KEY] = stateManager;
}

export default stateManager;