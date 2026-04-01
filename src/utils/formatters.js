// ============================================================
// formatters.js — Pure display-formatting utilities
// ============================================================
// All functions here are PURE (no side-effects, no imports of
// mutable state) so they're trivially unit-testable.

import { HEATMAP_SYMBOLS, LEVELS } from './constants.js';

// ── Progress bars ─────────────────────────────────────────────

/**
 * Renders an ASCII progress bar.
 * @param {number} value   - Current value (0–max)
 * @param {number} max     - Maximum value
 * @param {number} width   - Bar character width (default 20)
 * @returns {string}  e.g. "[████████░░░░░░░░░░░░] 40%"
 */
export function progressBar(value, max, width = 20) {
  const pct   = Math.min(Math.max(value / max, 0), 1);
  const filled = Math.round(pct * width);
  const empty  = width - filled;
  const bar    = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${Math.round(pct * 100)}%`;
}

// ── Time/duration ─────────────────────────────────────────────

/**
 * Formats seconds into MM:SS display.
 * @param {number} totalSeconds
 * @returns {string}  e.g. "04:35"
 */
export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Returns a human-friendly "time ago" string.
 * @param {Date|string|number} date
 * @returns {string}  e.g. "3 days ago" | "just now"
 */
export function timeAgo(date) {
  const ms      = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours   = Math.floor(ms / 3_600_000);
  const days    = Math.floor(ms / 86_400_000);

  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours   < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Returns a "days together" string from a creation timestamp.
 * @param {string|null} createdAt - ISO date string
 * @returns {number}
 */
export function daysTogether(createdAt) {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

// ── Heatmap ───────────────────────────────────────────────────

/**
 * Converts a commit count into a heatmap intensity symbol.
 * @param {number} count
 * @returns {string}
 */
export function commitIntensity(count) {
  if (count >= 4) return HEATMAP_SYMBOLS.HIGH;
  if (count >= 2) return HEATMAP_SYMBOLS.MED;
  if (count >= 1) return HEATMAP_SYMBOLS.LOW;
  return HEATMAP_SYMBOLS.NONE;
}

// ── Level / XP ────────────────────────────────────────────────

/**
 * Returns the XP needed to reach the *next* level (or Infinity at max).
 * @param {number} currentLevel
 * @returns {number}
 */
export function xpToNextLevel(currentLevel) {
  const next = LEVELS.find(l => l.level === currentLevel + 1);
  return next ? next.xpRequired : Infinity;
}

/**
 * Derives level from total XP.
 * @param {number} xp
 * @returns {number}  1–5
 */
export function levelFromXP(xp) {
  let level = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l.level;
  }
  return level;
}

// ── Strings ───────────────────────────────────────────────────

/**
 * Pads a string to a fixed width (right-aligned spaces).
 * @param {string} str
 * @param {number} width
 * @returns {string}
 */
export function padRight(str, width) {
  return str.toString().padEnd(width, ' ');
}

/**
 * Centres a string within a given width using spaces.
 * @param {string} str
 * @param {number} width
 * @returns {string}
 */
export function centre(str, width) {
  const pad = Math.max(0, width - str.length);
  const left  = Math.floor(pad / 2);
  const right = pad - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}