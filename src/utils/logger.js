// ============================================================
// logger.js — Lightweight, leveled console logger
// ============================================================
// Usage:
//   import log from './logger.js';
//   log.info('Scanning repo...');
//   log.warn('No README found');
//   log.error('Git not available', err);
//   log.debug('Raw git output:', raw); // only shown if DEBUG=true

const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

// ANSI colour codes (work in most terminals)
const C = {
  reset:  '\x1b[0m',
  grey:   '\x1b[90m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
};

/**
 * Formats a log line with timestamp and coloured prefix.
 * @param {string} level - INFO | WARN | ERROR | DEBUG
 * @param {string} color - ANSI colour escape
 * @param {...any}  args - Original arguments passed to the logger
 */
function write(level, color, ...args) {
  const ts = new Date().toTimeString().slice(0, 8); // HH:MM:SS
  // eslint-disable-next-line no-console
  console.log(`${C.grey}[${ts}]${C.reset} ${color}${level}${C.reset}`, ...args);
}

const log = {
  /** General information — always visible */
  info(...args)  { write('INFO ', C.cyan,   ...args); },

  /** Non-fatal warning — always visible */
  warn(...args)  { write('WARN ', C.yellow, ...args); },

  /** Error — always visible, prints to stderr */
  error(...args) {
    const ts = new Date().toTimeString().slice(0, 8);
    // eslint-disable-next-line no-console
    console.error(`${C.grey}[${ts}]${C.reset} ${C.red}ERROR${C.reset}`, ...args);
  },

  /** Debug — only shown when DEBUG=true */
  debug(...args) {
    if (DEBUG) write('DEBUG', C.grey, ...args);
  },

  /** Success indicator (info-level, green) */
  ok(...args)    { write('OK   ', C.green,  ...args); },
};

export default log;