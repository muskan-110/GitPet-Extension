// ============================================================
// behaviour.js — Pet's high-level action handlers
// ============================================================

import bus              from '../core/eventBus.js';
import stateManager     from '../core/stateManager.js';
import gameLoop         from '../core/gameLoop.js';
import { scanRepo }     from '../git/repoScanner.js';
import { syncMood }     from './moodEngine.js';
import { checkLevelUp } from './evolution.js';
import { XP_REWARDS }   from '../utils/constants.js';
import log              from '../utils/logger.js';

// ← read workspace path from env (set by extension.js)
function getWorkspace() {
  return process.env.GITPET_WORKSPACE ?? null;
}

export function initBehaviour() {
  bus.on('input:feed',    handleFeed);
  bus.on('action:play',   handlePlayAction);
  bus.on('input:refresh', handleRefresh);
  bus.on('input:exit',    handleExit);
  bus.on('input:reset',   handleReset);
  log.debug('Behaviour handlers registered.');
}

export async function handleFeed() {
  gameLoop.resetActivity?.();
  bus.emit('ui:message', { text: '🔍 Scanning repository…', type: 'info' });

  const oldHP = stateManager.get().pet.hp;
  const result = await scanRepo(getWorkspace(), true);  // ← workspace + addXP
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

export function handlePlayAction({ trick, output }) {
  gameLoop.resetActivity?.();
  const state = stateManager.get();

  stateManager.addXP(XP_REWARDS.PLAY, 'play');
  stateManager.updatePet({
    playCount:  (state.pet.playCount ?? 0) + 1,
    lastActive: new Date().toISOString(),
  });
  checkLevelUp();
  stateManager.save();
}

export async function handleRefresh() {
  gameLoop.resetActivity?.();
  bus.emit('ui:message', { text: '🔄 Refreshing…', type: 'info' });

  await scanRepo(getWorkspace(), false);  // ← workspace + no XP
  syncMood();

  const newHP = stateManager.get().pet.hp;
  bus.emit('ui:message', {
    text: `✅ Refreshed! Health: ${Math.round(newHP)}/100`,
    type: 'success',
  });
}

export function handleExit() {
  stateManager.updatePet({ lastActive: new Date().toISOString() });
  stateManager.save();
  bus.emit('ui:message', { text: '👋 Goodbye! See you next commit!', type: 'info' });
  setTimeout(() => {
    gameLoop.stop();
    process.exit(0);
  }, 600);
}

export function handleReset() {
  stateManager.reset?.();
  syncMood();
  bus.emit('ui:message', { text: '🔁 Pet reset! Starting fresh!', type: 'warn' });
}