// ============================================================
// GitPet VS Code Extension — Sidebar Version
// ============================================================

const vscode = require('vscode');
const path = require('path');
const { pathToFileURL } = require('url');
process.env.VSCODE_EXTENSION = "true";

let core = null;

function getWorkspaceFolder() {
  return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath ?? null;
}

function getProjectRoot() {
  return path.resolve(__dirname);
}

async function importModule(p) {
  return import(pathToFileURL(p).href);
}

async function loadCore() {
  const root = getProjectRoot();
  const mod = async (p) => (await importModule(path.join(root, 'src', p)));

  return {
    stateManager:    (await mod('core/stateManager.js')).default,
    animationEngine: (await mod('animations/animationEngine.js')).default,
    gameLoop:        (await mod('core/gameLoop.js')).default,
    bus:             (await mod('core/eventBus.js')).default,
    scanRepo:        (await mod('git/repoScanner.js')).scanRepo,
    initMoodEngine:  (await mod('pet/moodEngine.js')).initMoodEngine,
    initEvolution:   (await mod('pet/evolution.js')).initEvolution,
    initXPSystem:    (await mod('features/xpSystem.js')).initXPSystem,
    initBehaviour:   (await mod('pet/behaviour.js')).initBehaviour,
    initTrickMenu:   (await mod('features/trickMenu.js')).initTrickMenu,
    initRenderer:    (await mod('ui/render.js')).initRenderer,
    initSmartCommit: (await mod('features/smartCommit.js')),
    initFocusTimer:  (await mod('features/focusTimer.js')),
  };
}

class GitPetViewProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
  }

  async resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = getWebviewHtml();

    if (!core) {
      core = await loadCore();
      const workspaceFolder = getWorkspaceFolder();

      // ← store workspace path in env so all ESM modules can read it
      if (workspaceFolder) {
        process.env.GITPET_WORKSPACE = workspaceFolder;
      }

      core.stateManager.load(workspaceFolder);
      core.initMoodEngine();
      core.initEvolution();
      core.initXPSystem();
      core.animationEngine.init();
      core.initBehaviour();
      core.initTrickMenu();
      core.initRenderer();

      core.gameLoop.start();

      try {
        await core.scanRepo(workspaceFolder, false);
      } catch {}
    }

    core.bus.on('ui:render:full', (output) => {
      webviewView.webview.postMessage({ type: 'fullRender', output });
    });

    core.bus.on('ui:message', (msg) => {
      webviewView.webview.postMessage({ type: 'message', text: msg.text, msgType: msg.type });
    });

    core.bus.on('ui:trick-menu', (tricks) => {
      webviewView.webview.postMessage({ type: 'trickMenu', tricks });
    });

    core.bus.on('ui:mode', (mode) => {
      webviewView.webview.postMessage({ type: 'mode', mode });
    });

    let uiMode = 'home';
    const setMode = (mode) => {
      uiMode = mode;
      core.bus.emit('ui:mode', mode);
    };

    core.bus.on('input:stats', () => setMode(uiMode === 'stats' ? 'home' : 'stats'));
    core.bus.on('input:help',  () => setMode(uiMode === 'help'  ? 'home' : 'help'));
    core.bus.on('input:play',  () => setMode(uiMode === 'play'  ? 'home' : 'play'));

    core.bus.on('input:level', () => {
      const pet = core.stateManager.get().pet;
      const names = ['', 'Puppy', 'Young Dog', 'Adult Dog', 'Cool Dog', 'Legendary Doge'];
      core.bus.emit('ui:message', {
        text: `⭐ Lv.${pet.level} ${names[pet.level] || 'Legendary Doge'} | HP:${Math.round(pet.hp)} XP:${pet.xp}`,
        type: 'info',
      });
      setMode('home');
    });

    core.bus.on('input:awards', async () => {
      try {
        const achievementsMod = await importModule(
          path.join(getProjectRoot(), 'src', 'features', 'achievements.js')
        );
        const all      = achievementsMod.getAllAchievements();
        const unlocked = all.filter(a => a.unlocked);
        core.bus.emit('ui:message', {
          text: `🏅 ${unlocked.length}/${all.length} achievements unlocked`,
          type: 'info',
        });
      } catch (err) {
        console.error('[Awards] Failed:', err);
        core.bus.emit('ui:message', { text: '🏅 Could not load achievements', type: 'warn' });
      }
      setMode('home');
    });

    core.bus.on('app:exit', () => {
      core.stateManager.updatePet({ lastActive: new Date().toISOString() });
      core.stateManager.save();
      core.bus.emit('ui:message', { text: '💾 Game saved!', type: 'success' });
    });

    ['feed', 'timer', 'commit', 'refresh', 'space'].forEach(act => {
      core.bus.on(`input:${act}`, () => {
        if (uiMode !== 'home') setMode('home');
      });
    });

    core.bus.emit('pet:updated');

    webviewView.webview.onDidReceiveMessage((msg) => {
      setTimeout(() => {
        try {
          if (msg.command === 'space') {
            core.bus.emit('input:space');
          } else if (msg.command === 'timer-exit') {
            core.bus.emit('input:timer-exit');
          } else if (msg.command.startsWith('play_trick_')) {
            const id = parseInt(msg.command.split('_').pop());
            core.bus.emit('input:play:select', { id });
          } else if (msg.command === 'exit') {
            core.bus.emit('app:exit');
          } else {
            core.bus.emit(`input:${msg.command}`);
          }
        } catch (err) {
          console.error("ERROR:", err);
        }
      }, 0);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        core.bus.emit('pet:updated');
      }
    });
  }
}

async function activate(context) {
  console.log('[GitPet] Extension Activated');

  const provider = new GitPetViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitpet.sidebarView', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitpet.open', () => {
      vscode.commands.executeCommand('gitpet.sidebarView.focus');
    })
  );
}

function deactivate() {
  if (core) {
    core.stateManager.updatePet({ lastActive: new Date().toISOString() });
    core.stateManager.save();
  }
}

function getWebviewHtml() {
  return `
  <html>
  <body tabindex="0" style="background:#111;color:#eee;font-family:monospace;margin:0;padding:4px">

    <pre id="screen" style="
      font-family: 'Courier New', monospace;
      white-space: pre;
      line-height: 1.4;
      font-size: 11px;
      margin: 0;
    "></pre>

    <div id="trickMenu" style="margin-top:6px;"></div>

    <div id="controls" style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
      <button data-cmd="feed">[F] Feed</button>
      <button data-cmd="play">[P] Play</button>
      <button data-cmd="commit">[C] Commit</button>
      <button data-cmd="timer">[T] Timer</button>
      <button data-cmd="refresh">[R] Refresh</button>
      <button data-cmd="stats">[S] Stats</button>
      <button data-cmd="awards">[A] Awards</button>
      <button data-cmd="level">[L] Level</button>
      <button data-cmd="help">[H] Help</button>
      <button data-cmd="exit">[W] Save</button>
    </div>

    <style>
      body { overflow-x: hidden; }
      button {
        background:#1a1a2e;
        color:#ccc;
        border:1px solid #333;
        padding:3px 6px;
        border-radius:4px;
        font-family:monospace;
        font-size:10px;
        cursor:pointer;
      }
      button:hover {
        border-color:#4cc9f0;
        color:#4cc9f0;
      }
    </style>

    <script>
      const vscode = acquireVsCodeApi();

      function send(cmd) {
        vscode.postMessage({ command: cmd });
        document.body.focus();
      }

      let currentMode = "home";

      window.addEventListener('message', (event) => {
        if (event.data.type === 'mode') {
          currentMode = event.data.mode;
        }
        if (event.data.type === 'fullRender') {
          document.getElementById('screen').innerHTML = event.data.output;
        }
        if (event.data.type === 'trickMenu') {
          const container = document.getElementById('trickMenu');
          container.innerHTML = "<b style='font-size:11px'>🐶 Choose a trick:</b><br>";
          event.data.tricks.forEach(t => {
            const btn = document.createElement('button');
            btn.textContent = t.name;
            btn.onclick = () => send('play_trick_' + t.id);
            container.appendChild(btn);
          });
        }
        if (event.data.type === 'mode' && event.data.mode === 'home') {
          document.getElementById('trickMenu').innerHTML = '';
        }
      });

      document.getElementById('controls').addEventListener('click', (e) => {
        const cmd = e.target.getAttribute('data-cmd');
        if (cmd) send(cmd);
      });

      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mousedown', e => e.preventDefault());
      });

      window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const map = {
          f: 'feed', p: 'play', c: 'commit', t: 'timer',
          r: 'refresh', s: 'stats', a: 'awards', l: 'level',
          h: 'help', w: 'exit'
        };
        if (key === ' ')  { vscode.postMessage({ command: 'space' });      return; }
        if (key === 'x')  { vscode.postMessage({ command: 'timer-exit' }); return; }
        if (map[key]) vscode.postMessage({ command: map[key] });
      });

      window.addEventListener('click', () => document.body.focus());
      document.body.focus();
    </script>

  </body>
  </html>
  `;
}

module.exports = { activate, deactivate };