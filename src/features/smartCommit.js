// ============================================================
// smartCommit.js — AI-assisted commit message generator
// ============================================================
// Reads the current `git diff --staged` and asks the Anthropic
// API to suggest three conventional-commit messages.
//
// Requires: ANTHROPIC_API_KEY environment variable.
// Falls back to template suggestions if API key is absent.

import { git, gitLines } from '../git/gitService.js';
import bus               from '../core/eventBus.js';
import stateManager      from '../core/stateManager.js';
import { XP_REWARDS }    from '../utils/constants.js';
import log               from '../utils/logger.js';

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-20250514';

/**
 * Generates commit message suggestions for the current staged diff.
 * @returns {Promise<string[]>}  Array of 3 message suggestions
 */
export async function generateCommitMessages() {
  // Get the staged diff
  const diff = await git(['diff', '--staged', '--stat']);
  const diffDetail = await git(['diff', '--staged']);

  if (!diff && !diffDetail) {
    bus.emit('ui:message', {
      text: '⚠️ No staged changes found. Stage files with `git add` first.',
      type: 'warn',
    });
    return [];
  }

  // Try AI-powered suggestions first
  if (API_KEY) {
    try {
      const suggestions = await _aiSuggestions(diff, diffDetail);
      if (suggestions.length) return suggestions;
    } catch (err) {
      log.warn('AI commit suggestions failed, falling back to templates.', err.message);
    }
  } else {
    log.debug('No ANTHROPIC_API_KEY — using template suggestions.');
  }

  // Template fallback
  return _templateSuggestions(diff);
}

/**
 * Stages all changes and creates a commit with the given message.
 * Awards XP and emits the commit event.
 * @param {string} message
 * @returns {Promise<boolean>}  true on success
 */
export async function doCommit(message) {
  if (!message?.trim()) return false;

  const result = await git(['commit', '-m', message.trim()]);
  if (result === null) {
    bus.emit('ui:message', { text: '❌ Commit failed. Check git status.', type: 'warn' });
    return false;
  }

  stateManager.addXP(XP_REWARDS.COMMIT, 'commit');
  stateManager.save();
  bus.emit('action:commit', { message });
  bus.emit('ui:message', {
    text: `✅ Committed! "${message}" +${XP_REWARDS.COMMIT} XP`,
    type: 'success',
  });
  return true;
}

// ── Internal ─────────────────────────────────────────────────

async function _aiSuggestions(stat, detail) {
  const prompt = [
    'You are a commit message expert. Based on the following git diff, ',
    'suggest exactly 3 commit messages following the Conventional Commits spec ',
    '(feat/fix/refactor/chore/docs/style/test). ',
    'Return ONLY a JSON array of 3 strings, no explanation.\n\n',
    `### git diff --stat\n${stat}\n\n`,
    `### git diff (first 3000 chars)\n${(detail ?? '').slice(0, 3000)}`,
  ].join('');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '[]';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function _templateSuggestions(stat) {
  // Naive heuristic based on file names in the stat
  const lines = stat?.split('\n') ?? [];
  const hasFix  = lines.some(l => /fix|bug|error|issue/i.test(l));
  const hasTest = lines.some(l => /test|spec/i.test(l));
  const hasDoc  = lines.some(l => /readme|doc|md/i.test(l));

  const suggestions = [];
  if (hasFix)  suggestions.push('fix: resolve issue with recent changes');
  if (hasTest) suggestions.push('test: add tests for updated functionality');
  if (hasDoc)  suggestions.push('docs: update documentation');

  // Always add a generic option
  suggestions.push('chore: update project files');
  suggestions.push('refactor: improve code structure');
  suggestions.push('feat: add new functionality');

  return suggestions.slice(0, 3);
}

// 🔥 EXTENSION MODE: Hook directly into event bus for commits
bus.on('input:commit', async () => {
  if (process.env.VSCODE_EXTENSION === "true") {
    bus.emit('ui:message', { text: '🤖 Generating commit suggestions…', type: 'info' });
    const suggestions = await generateCommitMessages();
    if (!suggestions.length) return;
    
    // Auto-select first suggestion in extension mode
    await doCommit(suggestions[0]);
  }
});