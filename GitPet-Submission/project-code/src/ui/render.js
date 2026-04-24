// ============================================================
// render.js — Terminal + Webview renderer
// ============================================================

import bus from '../core/eventBus.js';
import { xpBreakdown } from '../features/xpSystem.js';
import pet from '../pet/pet.js';
import stateManager from '../core/stateManager.js';
import focusTimer from '../features/focusTimer.js';
import { progressBar, formatDuration } from '../utils/formatters.js';
import log from '../utils/logger.js';
import { renderDashboard } from './dashboard.js';
import { renderHelp } from './help.js';
import { renderTrickMenu } from './trickMenuRenderer.js';  // ← new

// ── STATE ───────────────────────────────────────────────────
let _mode = 'home';
let _staticRendered = false;
let _message = '';
let _messageType = 'info';
let _messageTTL = 0;

// ── ANSI → HTML ─────────────────────────────────────────────
function ansiToHtml(str) {
  return str
    .replace(/\x1b\[0m/g, '</span>')
    .replace(/\x1b\[1m/g, '<span style="font-weight:bold">')
    .replace(/\x1b\[2m/g, '<span style="opacity:0.7">')
    .replace(/\x1b\[32m/g, '<span style="color:#90be6d">')
    .replace(/\x1b\[36m/g, '<span style="color:#4cc9f0">')
    .replace(/\x1b\[33m/g, '<span style="color:#f9c74f">')
    .replace(/\x1b\[31m/g, '<span style="color:#f94144">')
    .replace(/\x1b\[35m/g, '<span style="color:#c77dff">')
    .replace(/\x1b\[34m/g, '<span style="color:#4895ef">')
    .replace(/\x1b\[37m/g, '<span style="color:#eeeeee">');
}

// ── ANSI helpers ────────────────────────────────────────────
const A = {
  clear:   '\x1b[H',
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  white:   '\x1b[37m',
};

const MOOD_COLOR = {
  EXCITED:  A.cyan + A.bold,
  HAPPY:    A.green,
  NEUTRAL:  A.white,
  SAD:      A.yellow + A.dim,
  SICK:     A.red + A.bold,
  SLEEPING: A.blue + A.dim,
};

const c = (code, str) => `${code}${str}${A.reset}`;

// ── INIT ────────────────────────────────────────────────────
export function initRenderer() {
  bus.on('pet:updated', _draw);
  bus.on('animation:tick', _draw);
  bus.on('xp:gained', _draw);

  bus.on('ui:message', ({ text, type = 'info' }) => {
    _message = text;
    _messageType = type;
    _messageTTL = 5;
  });

  bus.on('ui:mode', (mode) => {
    _mode = mode;
    _staticRendered = false;
    _draw();
  });
}

// ── DRAW ────────────────────────────────────────────────────
function _draw() {
  const state    = stateManager.get();
  const petState = state.pet;

  if (_mode === 'home') {
    if (_messageTTL > 0) _messageTTL--;
    if (_messageTTL === 0) _message = '';
  }

  // ── STATS MODE ──────────────────────────────────────────
  if (_mode === 'stats') {
    const output = renderDashboard();
    bus.emit('ui:render:full', ansiToHtml(output));
    return;
  }

  // ── HELP MODE ───────────────────────────────────────────
  if (_mode === 'help') {
    const output = renderHelp();
    bus.emit('ui:render:full', ansiToHtml(output));
    return;
  }

  // ── PLAY MODE ───────────────────────────────────────────
  if (_mode === 'play') {
    const output = renderTrickMenu(petState.level);
    bus.emit('ui:render:full', ansiToHtml(output));
    return;
  }

  // ── HOME MODE ───────────────────────────────────────────
  const lines = [];
  const sep = c(A.dim, '  ' + '─'.repeat(56));

  lines.push('');
  lines.push(
    `  ${c(A.bold + A.cyan, '🐶 GitPet')} ${c(A.dim, 'v1.0')}    ` +
    c(A.yellow, `${pet.name}`) +
    c(A.dim, ` — ${pet.levelName} (Lv.${petState.level})`)
  );
  lines.push(sep);

  if (focusTimer.isActive) {
    const status = focusTimer.isPaused ? '⏸ PAUSED' : '🎯 FOCUS';
    lines.push(
      `  ${c(A.bold + A.magenta, status)} ` +
      c(A.yellow, formatDuration(focusTimer.remaining)) +
      c(A.dim, '  [Space] pause  [X] end')
    );
    lines.push(`  ${progressBar(focusTimer.progress * 100, 100, 40)}`);
    lines.push(sep);
  }

  pet.currentFrame.split('\n').forEach(line => {
    lines.push(`    ${c(MOOD_COLOR[pet.mood] || A.white, line)}`);
  });

  const hpColor = petState.hp >= 70 ? A.green : petState.hp >= 40 ? A.yellow : A.red;
  lines.push(
    `  HP  ${c(hpColor, progressBar(petState.hp, 100, 20))}  ` +
    c(A.dim, `${Math.round(petState.hp)}/100`)
  );

  const safeLevel = Math.max(1, petState.level || 1);
  const { progressPct, xpForNext } = xpBreakdown(petState.xp, safeLevel);
  lines.push(
    `  XP  ${c(A.cyan, progressBar(progressPct, 100, 20))}  ` +
    c(A.dim, `${xpForNext} to next level`)
  );

  lines.push('');
  lines.push(
    `  Mood: ${pet.moodEmoji} ${c(MOOD_COLOR[pet.mood], pet.moodLabel)} ` +
    c(A.dim, `| 📅 ${pet.daysTogether} days together`)
  );

  lines.push('');
  lines.push(sep);

  if (_message) {
    const msgColor = {
      info:    A.cyan,
      success: A.green,
      warn:    A.yellow,
      error:   A.red,
    }[_messageType] || A.white;
    lines.push(`  ${c(msgColor, `› ${_message}`)}`);
  } else {
    lines.push(c(A.dim, '  › 🐶 What\'s the next move, hooman?'));
  }

  lines.push('');
  lines.push(c(A.dim, '  [F]eed [P]lay [C]ommit [T]imer [R]efresh'));
  lines.push(c(A.dim, '  [S]tats [A]wards [L]evel [H]elp [W]Save'));

  const output = lines.join('\n');
  process.stdout.write(A.clear + output);
  bus.emit('ui:render:full', ansiToHtml(output));
}

export default { initRenderer };