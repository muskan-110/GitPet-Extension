// ============================================================
// time.js — Date/time boundary helpers
// ============================================================
// All returned values are plain numbers or Date objects — no
// external dependencies, completely portable.

/**
 * Returns a Date set to midnight (00:00:00.000) of the given date,
 * in the local timezone.
 * @param {Date} [date=new Date()]
 * @returns {Date}
 */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for a given Date.
 * Used as map keys in heatmap data.
 * @param {Date} [date=new Date()]
 * @returns {string}  e.g. "2024-03-15"
 */
export function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns the Date `n` days before `from`.
 * @param {number} n
 * @param {Date}   [from=new Date()]
 * @returns {Date}
 */
export function daysAgo(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Generates an array of `HEATMAP_WEEKS * 7` date-keys starting from
 * the most-recent Sunday and going back `weeks` full weeks.
 *
 * The result is ordered oldest → newest so it renders
 * left-to-right in a grid.
 *
 * @param {number} [weeks=4]
 * @returns {string[]}  array of YYYY-MM-DD strings
 */
export function heatmapDateRange(weeks = 4) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat

  // Snap to the most-recent Sunday
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() - dayOfWeek);
  endSunday.setHours(0, 0, 0, 0);

  const totalDays = weeks * 7;
  const keys = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(endSunday);
    d.setDate(endSunday.getDate() - i);
    keys.push(toDateKey(d));
  }

  return keys; // length = weeks * 7, oldest first
}

/**
 * Returns true if two dates fall on the same calendar day.
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

/**
 * Calculates the current consecutive-day commit streak from a map
 * of { 'YYYY-MM-DD': commitCount }.
 *
 * The streak is the number of consecutive days ending on today (or
 * yesterday, if the user hasn't committed today yet) that each have
 * at least one commit.
 *
 * @param {Object} commitsByDay  - { 'YYYY-MM-DD': number }
 * @returns {number}
 */
export function calcStreak(commitsByDay) {
  let streak = 0;
  const today = toDateKey(new Date());

  // Start checking from today; allow yesterday as starting point
  let cursor = new Date();
  if (!commitsByDay[today]) {
    // If no commit today, start from yesterday
    cursor = daysAgo(1);
  }

  // Walk backward counting consecutive days with ≥1 commit
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = toDateKey(cursor);
    if ((commitsByDay[key] ?? 0) > 0) {
      streak++;
      cursor = daysAgo(1, cursor);
    } else {
      break;
    }
    if (streak > 365) break; // safety
  }

  return streak;
}