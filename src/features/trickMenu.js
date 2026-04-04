// ============================================================
// trickMenu.js — Trick execution logic
// ============================================================

import { simpleGit } from 'simple-git';
import bus from '../core/eventBus.js';
import inputHandler from '../core/inputHandler.js';
import stateManager from '../core/stateManager.js';
import gameLoop from '../core/gameLoop.js';
import log from '../utils/logger.js';

function getGit() {
  const workspace = process.env.GITPET_WORKSPACE ?? process.cwd();
  return simpleGit(workspace);
}

// ← all 10 tricks matching constants.js exactly
const TRICKS = [
  { id: 1,  name: 'Fetch',      command: () => getGit().fetch(['--all']),                    level: 1 },
  { id: 2,  name: 'Sniff',      command: () => getGit().status(),                            level: 1 },
  { id: 3,  name: 'Roll Over',  command: () => getGit().branch(['-a']),                      level: 2 },
  { id: 4,  name: 'Bury Bone',  command: () => getGit().stash(['list']),                     level: 2 },
  { id: 5,  name: 'Sit & Show', command: () => getGit().log({ maxCount: 10 }),               level: 2 },
  { id: 6,  name: 'Point',      command: () => getGit().diff(['--stat']),                    level: 3 },
  { id: 7,  name: 'Howl',       command: () => getGit().remote(['-v']),                      level: 3 },
  { id: 8,  name: 'Pack Call',  command: () => getGit().raw(['shortlog', '-sn']),            level: 4 },
  { id: 9,  name: 'Play Dead',  command: () => getGit().log({ maxCount: 10 }),               level: 4 },
  { id: 10, name: 'Shake',      command: () => getGit().remote(['prune', 'origin', '--dry-run']), level: 5 },
];

export function initTrickMenu() {
  bus.on('input:play', openTrickMenu);
  bus.on('input:play:select', runSelectedTrick);
}

function openTrickMenu() {
  const state    = stateManager.get();
  const petLevel = state.pet.level;

  if (process.env.VSCODE_EXTENSION === 'true') {
    const available = TRICKS.filter(t => petLevel >= t.level);
    bus.emit('ui:trick-menu', available);
    bus.emit('ui:mode', 'play');
    return;
  }

  gameLoop.stop();
  inputHandler.stop();

  console.log('\n🐶 Choose a trick:');
  TRICKS.forEach(trick => {
    if (petLevel >= trick.level) {
      console.log(`${trick.id}. ${trick.name}`);
    } else {
      console.log(`${trick.id}. [Locked - Requires Level ${trick.level}]`);
    }
  });

  const onData = async (data) => {
    const key = data.toString().trim();
    if (key === '\u001b' || key.toLowerCase() === 'q') { cleanup(); return; }
    const trick = TRICKS[parseInt(key, 10) - 1];
    if (!trick || petLevel < trick.level) return;
    await executeTrick(trick);
    cleanup();
  };

  const cleanup = () => {
    process.stdin.removeListener('data', onData);
    inputHandler.start();
    gameLoop.start();
    bus.emit('ui:mode', 'home');
  };

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', onData);
}

async function runSelectedTrick({ id }) {
  const state    = stateManager.get();
  const petLevel = state.pet.level;
  const trick    = TRICKS.find(t => t.id === id && petLevel >= t.level);
  if (!trick) {
    bus.emit('ui:message', { text: '🔒 That trick is locked!', type: 'warn' });
    return;
  }
  await executeTrick(trick);
  bus.emit('ui:mode', 'home');
}

async function executeTrick(trick) {
  try {
    bus.emit('ui:message', { text: `Running ${trick.name}...`, type: 'info' });

    const raw = await trick.command();
    let shortOutput = 'done';

    if (!raw) {
      shortOutput = 'done';
    } else if (typeof raw === 'string' && raw.trim()) {
      shortOutput = raw.split('\n').filter(Boolean)[0].substring(0, 50);
    } else if (typeof raw === 'object') {
      if (raw.files?.length)              shortOutput = `${raw.files.length} file(s) changed`;
      else if (raw.all?.length)           shortOutput = raw.all[0]?.message?.substring(0, 50) ?? 'done';
      else if (raw.branches)              shortOutput = `${Object.keys(raw.branches).length} branches found`;
      else if (raw.current)               shortOutput = `on branch ${raw.current}`;
      else if (raw.total !== undefined)   shortOutput = 'fetched successfully';
      else if (typeof raw === 'string' && raw.trim()) shortOutput = raw.trim().split('\n')[0].substring(0, 50);
      else if (Array.isArray(raw) && raw.length) shortOutput = String(raw[0]).substring(0, 50);
      else                                shortOutput = 'done';
    }

    bus.emit('action:play', { trick: trick.name, output: shortOutput });
    bus.emit('ui:message', {
      text: `✅ ${trick.name} done! ${shortOutput}`,
      type: 'success',
    });

  } catch (err) {
    log.error('Trick error:', err);
    bus.emit('ui:message', {
      text: `❌ ${trick.name} failed: ${err.message?.substring(0, 40) ?? 'unknown error'}`,
      type: 'error',
    });
  }
}