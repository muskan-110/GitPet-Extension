// ============================================================
// gitService.js — Safe, promise-based git command runner
// ============================================================

import { execFile } from 'child_process';
import log          from '../utils/logger.js';

const DEFAULT_TIMEOUT_MS = 8_000;

export async function git(args, timeout = DEFAULT_TIMEOUT_MS, cwd = null) {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd: cwd ?? process.cwd(), timeout, maxBuffer: 1024 * 512 },
      (err, stdout, stderr) => {
        if (err) {
          log.debug(`git ${args.join(' ')} → error:`, err.message);
          resolve(null);
          return;
        }
        if (stderr && !stdout) {
          log.debug(`git ${args.join(' ')} → stderr:`, stderr.trim());
        }
        resolve(stdout.trim());
      }
    );
  });
}

export async function gitLines(args, cwd = null) {
  const out = await git(args, DEFAULT_TIMEOUT_MS, cwd);
  if (!out) return [];
  return out.split('\n').map(l => l.trim()).filter(Boolean);
}

export async function isGitRepo(cwd = null) {
  const out = await git(['rev-parse', '--is-inside-work-tree'], DEFAULT_TIMEOUT_MS, cwd);
  return out === 'true';
}

export async function repoRoot(cwd = null) {
  return git(['rev-parse', '--show-toplevel'], DEFAULT_TIMEOUT_MS, cwd);
}

export const status      = (cwd = null) => gitLines(['status', '--short'], cwd);
export const branches    = (cwd = null) => gitLines(['branch', '-a'], cwd);
export const stashList   = (cwd = null) => gitLines(['stash', 'list'], cwd);
export const recentLog   = (n = 10, cwd = null) => gitLines(['log', '--oneline', `-${n}`], cwd);
export const diffStat    = (cwd = null) => gitLines(['diff', '--stat'], cwd);
export const remotes     = (cwd = null) => gitLines(['remote', '-v'], cwd);
export const shortlog    = (cwd = null) => gitLines(['shortlog', '-sn'], cwd);
export const fetchAll    = (cwd = null) => git(['fetch', '--all'], DEFAULT_TIMEOUT_MS, cwd);
export const pruneDryRun = (cwd = null) => gitLines(['remote', 'prune', 'origin', '--dry-run'], cwd);

export async function allCommitDates(limit = 500, cwd = null) {
  const lines = await gitLines(['log', `--max-count=${limit}`, '--format=%aI'], cwd);
  return lines;
}