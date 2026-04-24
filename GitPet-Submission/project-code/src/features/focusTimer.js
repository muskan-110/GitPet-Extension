// ============================================================
// focusTimer.js — Pomodoro focus mode
// ============================================================

import bus          from '../core/eventBus.js';
import stateManager from '../core/stateManager.js';
import inputHandler from '../core/inputHandler.js';
import { XP_REWARDS, FOCUS_DURATIONS } from '../utils/constants.js';
import { formatDuration } from '../utils/formatters.js';
import { collectStats }   from '../git/statsCollector.js';
import log          from '../utils/logger.js';

// ── Module state ──────────────────────────────────────────────
let _active       = false;
let _paused       = false;
let _remaining    = 0;
let _total        = 0;
let _intervalId   = null;
let _commitCountAtStart = 0;

const focusTimer = {
  get isActive() { return _active; },
  get isPaused() { return _paused; },
  get remaining(){ return _remaining; },
  get progress() { return _total > 0 ? 1 - _remaining / _total : 0; },

  async start(minutes) {
    // 🔥 FIX: prevent multiple timers
    if (_active || _intervalId) {
      bus.emit('ui:message', { text: '⏱️ Session already running!', type: 'warn' });
      return;
    }

    if (!FOCUS_DURATIONS.includes(minutes)) {
      bus.emit('ui:message', {
        text: `❌ Invalid duration. Choose: ${FOCUS_DURATIONS.join(', ')} min`,
        type: 'warn',
      });
      return;
    }

    const stats = await collectStats();
    _commitCountAtStart = stats.totalCommits;

    _active    = true;
    _paused    = false;
    _total     = minutes * 60;
    _remaining = _total;

    bus.on('input:space', _togglePause);
    bus.on('input:timer-exit', _endEarly); // 🔥 FIX

    if (process.env.VSCODE_EXTENSION !== "true") {
      inputHandler.stop(); // Isolate input
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', _handleTimerKey);
    }

    bus.emit('focus:start', { minutes, remaining: _remaining });
    bus.emit('ui:message', {
      text: `🐶 Focus session started! ${minutes} min — you've got this!`,
      type: 'info',
    });

    _intervalId = setInterval(_tick, 1_000);
    log.info(`Focus session started: ${minutes} min`);
  },

  pauseResume() { _togglePause(); },
  end() { _endEarly(); },
};

// ── Internal ─────────────────────────────────────────────────

function _tick() {
  if (_paused) return;

  _remaining = Math.max(0, _remaining - 1);

  bus.emit('focus:tick', {
    remaining: _remaining,
    total:     _total,
    display:   formatDuration(_remaining),
    progress:  focusTimer.progress,
  });

  if (_remaining > 0 && _remaining % 60 === 0) {
    const minLeft = Math.round(_remaining / 60);
    bus.emit('ui:message', {
      text: _encouragement(minLeft),
      type: 'info',
    });
  }

  if (_remaining === 0) {
    _complete();
  }
}

async function _complete() {
  _cleanup();

  const totalMinutes = Math.round(_total / 60);
  stateManager.recordFocusSession(totalMinutes);
  stateManager.addXP(XP_REWARDS.FOCUS_SESSION, 'focus:complete');

  const stats = await collectStats();
  const newCommits = Math.max(0, stats.totalCommits - _commitCountAtStart);

  if (newCommits > 0) {
    const bonus = newCommits * XP_REWARDS.FOCUS_COMMIT;
    stateManager.addXP(bonus, 'focus:commits');
    bus.emit('ui:message', {
      text: `🔥 ${newCommits} commit${newCommits > 1 ? 's' : ''} during focus! +${bonus} bonus XP`,
      type: 'success',
    });
  }

  stateManager.save();

  bus.emit('focus:end', { completed: true, minutes: totalMinutes });
  bus.emit('ui:message', {
    text: `🎉 Focus session complete! +${XP_REWARDS.FOCUS_SESSION} XP. Great work!`,
    type: 'success',
  });

  log.ok('Focus session completed.');
}

function _endEarly() {
  if (!_active) return;
  _cleanup();
  bus.emit('focus:end', { completed: false });
  bus.emit('ui:message', { text: '⏹️ Focus session ended early.', type: 'warn' });
}

function _togglePause() {
  if (!_active) return;

  _paused = !_paused;

  bus.emit('focus:pause', { paused: _paused });
  bus.emit('ui:message', {
    text: _paused ? '⏸️ Paused — take a breath!' : '▶️ Resumed — back to it!',
    type: 'info',
  });
}

function _handleTimerKey(data) {
  const key = data.toString().toLowerCase();
  
  if (key === 'x') {
    bus.emit('input:timer-exit');
  } else if (key === ' ') {
    bus.emit('input:space');
  }
}

function _cleanup() {
  clearInterval(_intervalId);
  _intervalId = null;

  _active = false;
  _paused = false;

  if (process.env.VSCODE_EXTENSION !== "true") {
    process.stdin.removeListener('data', _handleTimerKey);
    inputHandler.start();
  }

  bus.off('input:space', _togglePause);
  bus.off('input:timer-exit', _endEarly); // 🔥 FIX
}

function _encouragement(minutesLeft) {
  const lines = [
    `🐶 ${minutesLeft} min left — you're doing great!`,
    `💪 Keep going! ${minutesLeft} more minutes!`,
    `🌟 Almost there! ${minutesLeft} min remaining!`,
    `🔥 On fire! ${minutesLeft} min to go!`,
  ];
  return lines[minutesLeft % lines.length];
}

// 🔥 EXTENSION MODE: Hook directly into event bus for timer
bus.on('input:timer', async () => {
  if (process.env.VSCODE_EXTENSION === "true") {
    if (focusTimer.isActive) {
      bus.emit('ui:message', { text: '⏱️ Session active — Space=pause, X=end', type: 'warn' });
      return;
    }
    await focusTimer.start(25);
  }
});

export default focusTimer;