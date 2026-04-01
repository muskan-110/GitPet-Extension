// ============================================================
// behaviour.js — Pet's high-level action handlers
// ============================================================
// Listens to input events from the bus and executes the
// corresponding pet action. This is the "brain" layer that
// glues input → business-logic → state → UI feedback.

import bus              from '../core/eventBus.js';
import stateManager     from '../core/stateManager.js';
import gameLoop         from '../core/gameLoop.js';
import animationEngine  from '../animations/animationEngine.js';
import { scanRepo }     from '../git/repoScanner.js';
import { syncMood }     from './moodEngine.js';
import { checkLevelUp } from './evolution.js';
import { XP_REWARDS, TRICKS } from '../utils/constants.js';
import { gitLines, git }      from '../git/gitService.js';
import log              from '../utils/logger.js';

// ── Initialise ────────────────────────────────────────────────

export function initBehaviour() {
  bus.on('input:feed',    handleFeed);
  bus.on('action:play',   handlePlayAction);
  bus.on('input:refresh', handleRefresh);
  bus.on('input:exit',    handleExit);
  bus.on('input:reset',   handleReset);
  log.debug('Behaviour handlers registered.');
}

// ── Action handlers ───────────────────────────────────────────

/**
 * F — Feed: scan repo for TODOs/issues, award XP, update HP.
 */
export async function handleFeed() {
  gameLoop.resetActivity?.();
  bus.emit('ui:message', { text: '🔍 Scanning repository…', type: 'info' });

  const oldHP = stateManager.get().pet.hp;
  const result = await scanRepo();
  syncMood();
  checkLevelUp();

  stateManager.updatePet({
    feedCount: (stateManager.get().pet.feedCount ?? 0) + 1,
  });
  stateManager.save();

  const newHP = stateManager.get().pet.hp;
  if (Math.round(oldHP) === Math.round(newHP)) {
    bus.emit('ui:message', {
      text: `🍖 Scanned! Health: ${Math.round(newHP)}/100 | +${XP_REWARDS.FEED} XP`,
      type: 'success',
    });
  }
  bus.emit('action:feed', { result });
}

/**
 * Handles the post-action logic after trickMenu executes a trick.
 */
export function handlePlayAction({ trick, output }) {
  gameLoop.resetActivity?.();
  const state = stateManager.get();

  stateManager.addXP(XP_REWARDS.PLAY, 'play');
  stateManager.updatePet({
    playCount: (state.pet.playCount ?? 0) + 1,
    lastActive: new Date().toISOString(),
  });
  checkLevelUp();
  stateManager.save();
}

/**
 * R — Refresh: re-scan repo without awarding feed XP.
 */
export async function handleRefresh() {
  gameLoop.resetActivity?.();
  bus.emit('ui:message', { text: '🔄 Refreshing…', type: 'info' });
  
  const oldHP = stateManager.get().pet.hp;
  await scanRepo();
  syncMood();
  
  const newHP = stateManager.get().pet.hp;
  if (Math.round(oldHP) === Math.round(newHP)) {
    bus.emit('ui:message', { text: '✅ Refreshed!', type: 'success' });
  }
}

/**
 * E — Exit: save and quit.
 */
export function handleExit() {
  stateManager.updatePet({ lastActive: new Date().toISOString() });
  stateManager.save();
  bus.emit('ui:message', { text: '👋 Goodbye! See you next commit!', type: 'info' });
  // Small delay so the message renders before process exits
  setTimeout(() => {
    gameLoop.stop();
    process.exit(0);
  }, 600);
}

/**
 * X — Reset: wipe save data and restart state.
 */
export function handleReset() {
  stateManager.reset();
  syncMood();
  bus.emit('ui:message', { text: '🔁 Pet reset! Starting fresh!', type: 'warn' });
}