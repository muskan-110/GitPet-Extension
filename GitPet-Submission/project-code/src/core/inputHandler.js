// ============================================================
// inputHandler.js — Terminal keypress → game action bridge
// ============================================================

import bus from './eventBus.js';
import log from '../utils/logger.js';
import { KEY_BINDINGS } from '../utils/constants.js';

const KEY_TO_ACTION = Object.fromEntries(
  Object.entries(KEY_BINDINGS).map(([action, key]) => [key, action])
);

let _active = false;

function start() {
  if (_active) return;

  // ❌ Skip stdin in extension
  if (process.env.VSCODE_EXTENSION === "true") {
    log.debug('InputHandler skipped (VS Code extension mode)');
    return;
  }

  _active = true;

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', _handleKey);

  log.debug('InputHandler started.');
}

function stop() {
  if (!_active) return;

  // ❌ Skip stdin cleanup in extension
  if (process.env.VSCODE_EXTENSION === "true") {
    return;
  }

  _active = false;

  process.stdin.removeListener('data', _handleKey);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  process.stdin.pause();

  log.debug('InputHandler stopped.');
}

function _handleKey(key) {
  if (key === '\u0003') {
    log.info('Ctrl+C detected — exiting.');
    bus.emit('app:exit');
    process.exit(0);
  }

  const lower  = key.toLowerCase();

  // "E" strictly for app exit
  if (lower === 'e') {
    log.info('Exiting app...');
    bus.emit('app:exit');
    process.exit(0);
  }

  // "X" strictly for timer exit
  if (lower === 'x') {
    bus.emit('input:timer-exit');
    return;
  }

  if (key === ' ') {
    bus.emit('input:space');
    return;
  }

  const action = KEY_TO_ACTION[lower];

  const FEEDBACK = {
    FEED: 'Feeding pet...',
    PLAY: 'Playing with pet...',
    STATS: 'Opening stats...',
    HELP: 'Opening help...',
    LEVEL: 'Checking level...',
    AWARDS: 'Checking awards...',
    TIMER: 'Toggling timer...',
    COMMIT: 'Generating commit...',
    REFRESH: 'Refreshing...',
    EXIT: 'Exiting...',
    RESET: 'Resetting...'
  };

  if (action) {
    log.debug(`Key "${lower}" → action "${action}"`);

    if (FEEDBACK[action]) {
      bus.emit('ui:message', { text: FEEDBACK[action], type: 'info' });
    }

    bus.emit(`input:${action.toLowerCase()}`, { key: lower });
  } else {
    log.debug(`Unmapped key: "${lower}"`);
    bus.emit('input:unmapped', { key: lower });
  }
}

function triggerAction(actionName) {
  const key = KEY_BINDINGS[actionName];
  if (key) {
    bus.emit(`input:${actionName.toLowerCase()}`, { key, programmatic: true });
  }
}

const inputHandler = { start, stop, triggerAction };
export default inputHandler;