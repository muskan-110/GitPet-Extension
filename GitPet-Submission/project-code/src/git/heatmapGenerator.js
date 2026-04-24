// ============================================================
// heatmapGenerator.js — GitHub-style 4-week commit heatmap
// ============================================================
// Produces a columnar (weeks as columns, days as rows) ASCII
// heatmap identical to GitHub's contribution graph layout.
//
// Output example (4 weeks × 7 days):
//
//   Mon  ░ ▒ ▓ █
//   Tue  ░ ░ ▒ ░
//   Wed  ▒ ░ ░ ▒
//   Thu  ░ ▒ ▓ ░
//   Fri  █ ░ ░ ▒
//   Sat  ░ ░ ░ ░
//   Sun  ░ ░ ▒ ░
//        W1 W2 W3 W4

import { heatmapDateRange } from '../utils/time.js';
import { commitIntensity }  from '../utils/formatters.js';
import { HEATMAP_WEEKS }    from '../utils/constants.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Generates a printable heatmap string.
 * @param {Object.<string,number>} commitsByDay  - { 'YYYY-MM-DD': count }
 * @param {number}                 [weeks]       - Number of weeks to show
 * @returns {string}  Multiline ASCII heatmap
 */
export function generateHeatmap(commitsByDay, weeks = HEATMAP_WEEKS) {
  const dateKeys = heatmapDateRange(weeks); // oldest → newest, length = weeks*7

  // Organise into a 2D grid: grid[row=dayOfWeek][col=weekIndex]
  // dateKeys are Sunday-aligned, so index 0 = Sunday of oldest week
  const grid = Array.from({ length: 7 }, () => Array(weeks).fill('░'));

  for (let i = 0; i < dateKeys.length; i++) {
    const weekIndex = Math.floor(i / 7);
    const dayIndex  = i % 7; // 0=Sun … 6=Sat
    const count     = commitsByDay[dateKeys[i]] ?? 0;
    grid[dayIndex][weekIndex] = commitIntensity(count);
  }

  // Build display lines
  const lines = grid.map((row, dayIdx) => {
    const label = DAY_LABELS[dayIdx].padEnd(4);
    return `${label} ${row.map(c => c.padEnd(3)).join('')}`;
  });

  // Week headers
  const weekHeaders = Array.from({ length: weeks }, (_, i) =>
    `W${i + 1}`.padEnd(3)
  ).join('');

  lines.push(`     ${weekHeaders}`);

  return lines.join('\n');
}

/**
 * Returns just the raw 2D symbol grid (no labels).
 * Useful for UI renderers that want to colour symbols.
 * @param {Object.<string,number>} commitsByDay
 * @param {number}                 [weeks]
 * @returns {string[][]}  grid[dayOfWeek][weekIndex]
 */
export function heatmapGrid(commitsByDay, weeks = HEATMAP_WEEKS) {
  const dateKeys = heatmapDateRange(weeks);
  const grid = Array.from({ length: 7 }, () => Array(weeks).fill('░'));

  for (let i = 0; i < dateKeys.length; i++) {
    const weekIndex = Math.floor(i / 7);
    const dayIndex  = i % 7;
    const count     = commitsByDay[dateKeys[i]] ?? 0;
    grid[dayIndex][weekIndex] = commitIntensity(count);
  }

  return grid;
}