// ============================================================
// index.js — GitPet entry point
// ============================================================
// Boot order:
//   1. Load saved state
//   2. Initialise all systems (events, XP, mood, animation, UI)
//   3. Wire input → feature actions
//   4. Start game loop
//   5. Do initial repo scan

import stateManager    from './core/stateManager.js';
import gameLoop        from './core/gameLoop.js';
import inputHandler    from './core/inputHandler.js';
import bus             from './core/eventBus.js';
import animationEngine from './animations/animationEngine.js';
import { initMoodEngine }  from './pet/moodEngine.js';
import { initEvolution }   from './pet/evolution.js';
import { initBehaviour }   from './pet/behaviour.js';
import { initXPSystem }    from './features/xpSystem.js';
import { initRenderer }    from './ui/render.js';
import { getAllAchievements } from './features/achievements.js';
import focusTimer        from './features/focusTimer.js';
import { generateCommitMessages, doCommit } from './features/smartCommit.js';
import { initTrickMenu } from './features/trickMenu.js';
import { scanRepo }      from './git/repoScanner.js';
import { FOCUS_DURATIONS } from './utils/constants.js';
import log               from './utils/logger.js';

async function main() {
  log.info('🐶 GitPet starting…');

  // ── 1. Load state ─────────────────────────────────────────
  stateManager.load();

  // ── 2. Initialise systems ─────────────────────────────────
  initMoodEngine();
  initEvolution();
  initXPSystem();
  animationEngine.init();
  initRenderer();

  // ── 3. Wire UI-specific actions ───────────────────────────

  let uiMode = 'home';
  const setMode = (mode) => {
    uiMode = mode;
    bus.emit('ui:mode', mode); // this will trigger render via render.js
  };

  // S — Stats dashboard
  bus.on('input:stats', () => {
    setMode(uiMode === 'stats' ? 'home' : 'stats');
  });

  // H — Help screen
  bus.on('input:help', () => {
    setMode(uiMode === 'help' ? 'home' : 'help');
  });

  // Any unmapped key while in stats/help -> go home
  bus.on('input:unmapped', () => {
    if (uiMode !== 'home') setMode('home');
  });
  
  // Make sure other actions go home too
  ['feed', 'play', 'level', 'timer', 'awards', 'commit', 'refresh', 'space'].forEach(act => {
    bus.on(`input:${act}`, () => {
      if (uiMode !== 'home') setMode('home');
    });
  });

  // L — Level info (inline message)
  bus.on('input:level', () => {
    const pet   = stateManager.get().pet;
    const names = ['','Puppy','Young Dog','Adult Dog','Cool Dog','Legendary Doge'];
    bus.emit('ui:message', {
      text: `⭐ Lv.${pet.level} ${names[pet.level]} | HP:${Math.round(pet.hp)} XP:${pet.xp}`,
      type: 'info',
    });
  });

  // A — Achievements
  bus.on('input:awards', () => {
    const all      = getAllAchievements();
    const unlocked = all.filter(a => a.unlocked);
    bus.emit('ui:message', {
      text: `🏅 ${unlocked.length}/${all.length} achievements unlocked`,
      type: 'info',
    });
  });

  // T — Focus timer (ask duration via inline prompt)
  bus.on('input:timer', async () => {
    if (focusTimer.isActive) {
      bus.emit('ui:message', { text: '⏱️ Session active — Space=pause, X=end', type: 'warn' });
      return;
    }
    // In a real terminal we'd use readline; here we default to 25 min
    const duration = 25;
    bus.emit('ui:message', {
      text: `⏱️ Starting ${duration}-min focus session…`,
      type: 'info',
    });
    await focusTimer.start(duration);
  });

  // C — Smart commit
  bus.on('input:commit', async () => {
    bus.emit('ui:message', { text: '🤖 Generating commit suggestions…', type: 'info' });
    const suggestions = await generateCommitMessages();
    if (!suggestions.length) return;

    // Display suggestions and pick first (in real app: interactive menu)
    suggestions.forEach((s, i) => log.info(`  ${i + 1}. ${s}`));
    log.info('Auto-selecting suggestion 1 (interactive selection in full UI)');
    await doCommit(suggestions[0]);
  });

  // ── 4. Behaviour (feed, play, refresh, exit, reset) ──────
  initBehaviour();
  initTrickMenu();

  // ── 5. Input handler + game loop ─────────────────────────
  inputHandler.start();
  gameLoop.start();

  // ── 6. Initial scan ──────────────────────────────────────
  bus.emit('ui:message', { text: '🔍 Performing initial scan…', type: 'info' });
  await scanRepo().catch(err => log.warn('Initial scan failed:', err.message));

  log.ok('GitPet ready! Press H for help.');
}

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGINT', () => {
  stateManager.updatePet({ lastActive: new Date().toISOString() });
  stateManager.save();
  log.info('Saved. Goodbye! 🐾');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
  stateManager.save();
  process.exit(1);
});

main().catch(err => {
  log.error('Fatal startup error:', err);
  process.exit(1);
});