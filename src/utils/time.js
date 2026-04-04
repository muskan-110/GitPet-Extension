// ============================================================
// time.js — Date/time boundary helpers
// ============================================================

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Generates heatmap date range ending TODAY (not last Sunday).
 * Goes back `weeks` full weeks from today, Sunday-aligned start.
 */
export function heatmapDateRange(weeks = 4) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  // Start from the Sunday that is `weeks` weeks before the Sunday of this week
  const startSunday = new Date(today);
  startSunday.setDate(today.getDate() - dayOfWeek - (weeks - 1) * 7);
  startSunday.setHours(0, 0, 0, 0);

  const totalDays = weeks * 7;
  const keys = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startSunday);
    d.setDate(startSunday.getDate() + i);
    // Only include up to today
    if (d <= today) {
      keys.push(toDateKey(d));
    }
  }

  return keys; // oldest → newest, includes today
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function calcStreak(commitsByDay) {
  let streak = 0;
  const today = toDateKey(new Date());

  let cursor = new Date();
  if (!commitsByDay[today]) {
    cursor = daysAgo(1);
  }

  while (true) {
    const key = toDateKey(cursor);
    if ((commitsByDay[key] ?? 0) > 0) {
      streak++;
      cursor = daysAgo(1, cursor);
    } else {
      break;
    }
    if (streak > 365) break;
  }

  return streak;
}