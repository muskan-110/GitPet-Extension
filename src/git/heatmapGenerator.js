// ============================================================
// heatmapGenerator.js — GitHub-style 4-week commit heatmap
// ============================================================

import { commitIntensity } from '../utils/formatters.js';
import { HEATMAP_WEEKS }   from '../utils/constants.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ← use local date instead of UTC to avoid timezone shift
function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateHeatmap(commitsByDay, weeks = HEATMAP_WEEKS) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7 - 1));
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const grid = Array.from({ length: 7 }, () => Array(weeks).fill('░'));

  const cursor = new Date(startDate);
  let weekIndex = 0;

  while (cursor <= today) {
    const dayOfWeek = cursor.getDay();
    const key = toLocalDateKey(cursor);  // ← local date key
    const count = commitsByDay[key] ?? 0;

    if (weekIndex < weeks) {
      grid[dayOfWeek][weekIndex] = commitIntensity(count);
    }

    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) weekIndex++;
  }

  const lines = grid.map((row, dayIdx) => {
    const label = DAY_LABELS[dayIdx].padEnd(4);
    return `${label} ${row.join('  ')}`;
  });

  const weekHeaders = Array.from({ length: weeks }, (_, i) =>
    `W${i + 1}`.padEnd(3)
  ).join('');
  lines.push(`     ${weekHeaders}`);

  return lines.join('\n');
}

export function heatmapGrid(commitsByDay, weeks = HEATMAP_WEEKS) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7 - 1));
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const grid = Array.from({ length: 7 }, () => Array(weeks).fill('░'));
  const cursor = new Date(startDate);
  let weekIndex = 0;

  while (cursor <= today) {
    const dayOfWeek = cursor.getDay();
    const key = toLocalDateKey(cursor);  // ← local date key
    const count = commitsByDay[key] ?? 0;

    if (weekIndex < weeks) {
      grid[dayOfWeek][weekIndex] = commitIntensity(count);
    }

    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) weekIndex++;
  }

  return grid;
}