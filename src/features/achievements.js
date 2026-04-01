// ============================================================
// achievements.js — Achievement definitions & unlock checker
// ============================================================
// Each achievement has an id, name, description, and a
// condition function (state) => boolean.
//
// Call checkAchievements() after any action that might trigger
// one. It's idempotent — stateManager tracks what's been unlocked.

import bus          from '../core/eventBus.js';
import stateManager from '../core/stateManager.js';
import { XP_REWARDS } from '../utils/constants.js';
import log          from '../utils/logger.js';

// ── Achievement definitions ───────────────────────────────────
export const ACHIEVEMENTS = [
  {
    id: 'first_feed',
    name: 'First Meal 🍖',
    desc: 'Feed your pet for the first time.',
    condition: (s) => (s.pet.feedCount ?? 0) >= 1,
  },
  {
    id: 'first_play',
    name: 'Good Boy 🎾',
    desc: 'Play with your pet for the first time.',
    condition: (s) => (s.pet.playCount ?? 0) >= 1,
  },
  {
    id: 'level_2',
    name: 'Growing Up 🐕',
    desc: 'Reach Level 2.',
    condition: (s) => s.pet.level >= 2,
  },
  {
    id: 'level_5',
    name: 'Legendary! 👑',
    desc: 'Reach Level 5 — Legendary Doge!',
    condition: (s) => s.pet.level >= 5,
  },
  {
    id: 'streak_3',
    name: 'On a Roll 🔥',
    desc: 'Maintain a 3-day commit streak.',
    condition: (s) => (s.git.streak ?? 0) >= 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior ⚡',
    desc: 'Maintain a 7-day commit streak.',
    condition: (s) => (s.git.streak ?? 0) >= 7,
  },
  {
    id: 'commits_50',
    name: 'Prolific Coder 💻',
    desc: 'Make 50 total commits.',
    condition: (s) => (s.git.totalCommits ?? 0) >= 50,
  },
  {
    id: 'commits_100',
    name: 'Century Club 🏆',
    desc: 'Make 100 total commits.',
    condition: (s) => (s.git.totalCommits ?? 0) >= 100,
  },
  {
    id: 'perfect_health',
    name: 'Top Shape 💪',
    desc: 'Reach 100 HP.',
    condition: (s) => Math.round(s.pet.hp) >= 100,
  },
  {
    id: 'focus_1',
    name: 'In the Zone ⏱️',
    desc: 'Complete your first focus session.',
    condition: (s) => (s.focus.totalSessions ?? 0) >= 1,
  },
  {
    id: 'focus_10',
    name: 'Deep Work 🧠',
    desc: 'Complete 10 focus sessions.',
    condition: (s) => (s.focus.totalSessions ?? 0) >= 10,
  },
  {
    id: 'play_50',
    name: 'Trick Master 🌟',
    desc: 'Play 50 times (run 50 git tricks).',
    condition: (s) => (s.pet.playCount ?? 0) >= 50,
  },
  {
    id: 'week_commits',
    name: 'Sprint Coder 🏃',
    desc: 'Make 10+ commits in a single week.',
    condition: (s) => {
      // Sum last 7 days from commitsByDay
      const map = s.git.commitsByDay ?? {};
      let total = 0;
      const cursor = new Date();
      for (let i = 0; i < 7; i++) {
        const key = cursor.toISOString().slice(0, 10);
        total += map[key] ?? 0;
        cursor.setDate(cursor.getDate() - 1);
      }
      return total >= 10;
    },
  },
];

// ── Checker ───────────────────────────────────────────────────

/**
 * Checks all achievements against current state.
 * Unlocks any that haven't been unlocked yet and whose
 * condition is now true. Awards bonus XP per unlock.
 * @returns {string[]}  IDs of newly unlocked achievements
 */
export function checkAchievements() {
  const state   = stateManager.get();
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (stateManager.hasAchievement(ach.id)) continue; // already unlocked
    try {
      if (ach.condition(state)) {
        const unlocked = stateManager.unlockAchievement(ach.id);
        if (unlocked) {
          stateManager.addXP(XP_REWARDS.ACHIEVEMENT, `achievement:${ach.id}`);
          newlyUnlocked.push(ach.id);
          log.ok(`Achievement unlocked: ${ach.name}`);
          bus.emit('ui:message', {
            text: `🏅 Achievement unlocked: ${ach.name}`,
            type: 'success',
          });
        }
      }
    } catch (err) {
      log.debug(`Achievement check error (${ach.id}):`, err.message);
    }
  }

  if (newlyUnlocked.length) stateManager.save();
  return newlyUnlocked;
}

/**
 * Returns all achievement definitions with their unlocked status.
 * @returns {Array<{id,name,desc,unlocked:boolean}>}
 */
export function getAllAchievements() {
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: stateManager.hasAchievement(a.id),
  }));
}