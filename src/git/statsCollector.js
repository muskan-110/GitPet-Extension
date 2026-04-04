// ============================================================
// statsCollector.js — Aggregates raw git output → game stats
// ============================================================

import { allCommitDates } from './gitService.js';
import { toDateKey, calcStreak } from '../utils/time.js';
import log from '../utils/logger.js';

export async function collectStats(cwd = null) {
  log.debug('Collecting git stats…');

  const dates = await allCommitDates(1000, cwd);  // ← pass cwd

  if (!dates.length) {
    log.debug('No commit history found.');
    return emptyStats();
  }

  const commitsByDay = {};
  for (const isoDate of dates) {
    const key = isoDate.slice(0, 10);
    commitsByDay[key] = (commitsByDay[key] ?? 0) + 1;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todayCommits   = commitsByDay[today] ?? 0;
  const streak         = calcStreak(commitsByDay);
  const lastCommitDate = dates[0] ? dates[0].slice(0, 10) : null;
  const commitsThisWeek = _sumLastNDays(commitsByDay, 7);

  const stats = {
    commitsByDay,
    totalCommits: dates.length,
    todayCommits,
    streak,
    lastCommitDate,
    commitsThisWeek,
  };

  log.debug('Stats collected:', {
    total: stats.totalCommits,
    today: stats.todayCommits,
    streak: stats.streak,
    thisWeek: stats.commitsThisWeek,
  });

  return stats;
}

function emptyStats() {
  return {
    commitsByDay:    {},
    totalCommits:    0,
    todayCommits:    0,
    streak:          0,
    lastCommitDate:  null,
    commitsThisWeek: 0,
  };
}

function _sumLastNDays(commitsByDay, n) {
  let total = 0;
  const cursor = new Date();
  for (let i = 0; i < n; i++) {
    const key = toDateKey(cursor);
    total += commitsByDay[key] ?? 0;
    cursor.setDate(cursor.getDate() - 1);
  }
  return total;
}