// ============================================================
// trickMenu.js — Trick execution logic
// ============================================================

import { simpleGit } from 'simple-git';
import bus from '../core/eventBus.js';
import inputHandler from '../core/inputHandler.js';
import stateManager from '../core/stateManager.js';
import gameLoop from '../core/gameLoop.js';
import log from '../utils/logger.js';

const git = simpleGit();

const TRICKS = [
  { id: 1, name: 'Fetch',      command: () => git.fetch(['--all']),          level: 1 },
  { id: 2, name: 'Sniff',      command: () => git.status(['--short']),       level: 1 },
  { id: 3, name: 'Roll Over',  command: () => git.branch(['-a']),            level: 2 },
  { id: 4, name: 'Bury Bone',  command: () => git.raw('stash', 'list'),      level: 2 },
  { id: 5, name: 'Sit & Show', command: () => git.log({ maxCount: 10 }),     level: 2 },
];

export function initTrickMenu() {
  bus.on('input:play', openTrickMenu);
  bus.on('input:play:select', runSelectedTrick);
}

// ── OPEN TRICK MENU ─────────────────────────────────────────

function openTrickMenu() {
  const state    = stateManager.get();
  const petLevel = state.pet.level;

  // ── EXTENSION MODE ──────────────────────────────────────
  if (process.env.VSCODE_EXTENSION === 'true') {
    // Emit available tricks for button rendering in webview
    const available = TRICKS.filter(t => petLevel >= t.level);
    bus.emit('ui:trick-menu', available);
    // Switch to play mode → render.js renders trickMenuRenderer
    bus.emit('ui:mode', 'play');
    return;
  }

  // ── CLI MODE ────────────────────────────────────────────
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
    if (key === '\u001b' || key.toLowerCase() === 'q') {
      cleanup();
      return;
    }
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

// ── EXTENSION: RUN SELECTED TRICK ───────────────────────────

async function runSelectedTrick({ id }) {
  const state    = stateManager.get();
  const petLevel = state.pet.level;
  const trick    = TRICKS.find(t => t.id === id && petLevel >= t.level);
  if (!trick) return;
  await executeTrick(trick);
  // Return to home after trick runs
  bus.emit('ui:mode', 'home');
}

// ── SHARED EXECUTION ────────────────────────────────────────

async function executeTrick(trick) {
  try {
    bus.emit('ui:message', { text: `Running ${trick.name}...`, type: 'info' });

    const raw = await trick.command();
    let shortOutput = '(no output)';

    if (typeof raw === 'string' && raw.trim()) {
      shortOutput = raw.split('\n').filter(Boolean)[0].substring(0, 50);
    } else if (typeof raw === 'object' && raw !== null) {
      if (raw.files?.length)    shortOutput = `Modified ${raw.files.length} files`;
      else if (raw.all?.length) shortOutput = raw.all[0].message ?? 'Done';
      else if (raw.branches)    shortOutput = `Branches: ${Object.keys(raw.branches).length}`;
    }

    bus.emit('action:play', { trick: trick.name, output: shortOutput });
    bus.emit('ui:message', { text: `✅ ${trick.name} done! Result: ${shortOutput}`, type: 'success' });

  } catch (err) {
    log.error('Trick error:', err);
    bus.emit('ui:message', { text: `❌ ${trick.name} failed!`, type: 'error' });
  }
}