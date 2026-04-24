// ============================================================
// constants.js — Single source of truth for all config values
// ============================================================
// Every magic number, threshold, and label lives here so you
// can tune the game without hunting through business logic.

export const VERSION = '1.0.0';

// ── Pet Evolution Levels ─────────────────────────────────────
export const LEVELS = [
  { level: 1, name: 'Puppy',         xpRequired: 0,    special: 'Small and extra cute!' },
  { level: 2, name: 'Young Dog',     xpRequired: 100,  special: 'Unlocks more tricks' },
  { level: 3, name: 'Adult Dog',     xpRequired: 300,  special: 'Gets spotted coat' },
  { level: 4, name: 'Cool Dog',      xpRequired: 600,  special: 'Gets sunglasses!' },
  { level: 5, name: 'Legendary Doge',xpRequired: 1000, special: 'Crown and sparkles!' },
];

// ── Mood thresholds (HP-based) ───────────────────────────────
export const MOODS = {
  EXCITED: { min: 90,  max: 100, label: 'Excited', emoji: '🤩' },
  HAPPY:   { min: 70,  max: 89,  label: 'Happy',   emoji: '😊' },
  NEUTRAL: { min: 50,  max: 69,  label: 'Neutral', emoji: '😐' },
  SAD:     { min: 25,  max: 49,  label: 'Sad',     emoji: '😢' },
  SICK:    { min: 0,   max: 24,  label: 'Sick',    emoji: '🤒' },
  SLEEPING:{ min: -1,  max: -1,  label: 'Sleeping',emoji: '😴' },
};

// ── XP Rewards ───────────────────────────────────────────────
export const XP_REWARDS = {
  FEED:            10,   // scanning for TODOs/FIXMEs
  PLAY:            15,   // performing a trick
  COMMIT:          20,   // making a commit
  FOCUS_SESSION:   50,   // completing a focus session
  FOCUS_COMMIT:    10,   // extra XP per commit during focus
  ACHIEVEMENT:     25,   // unlocking an achievement
};

// ── Health Weights (must sum to 1.0) ─────────────────────────
export const HEALTH_WEIGHTS = {
  COMMIT_FREQUENCY: 0.30,
  COMMIT_STREAK:    0.15,
  WORKING_TREE:     0.20,
  TEST_FILES:       0.15,
  README:           0.05,
  RECENT_ACTIVITY:  0.15,
};

// ── Health sub-scores: commits/week → score ──────────────────
export const COMMIT_FREQ_THRESHOLDS = [
  { min: 10, score: 100 },
  { min: 7,  score: 85  },
  { min: 4,  score: 65  },
  { min: 1,  score: 40  },
  { min: 0,  score: 0   },
];

// ── Inactivity timeout before pet sleeps (ms) ────────────────
export const SLEEP_TIMEOUT_MS = 60_000; // 60 seconds

// ── Focus/Pomodoro durations (minutes) ───────────────────────
export const FOCUS_DURATIONS = [15, 25, 45, 60];

// ── Heatmap display window ───────────────────────────────────
export const HEATMAP_WEEKS = 4;

// ── Heatmap intensity symbols ────────────────────────────────
export const HEATMAP_SYMBOLS = {
  NONE:   '░', // 0 commits
  LOW:    '▒', // 1 commit
  MED:    '▓', // 2-3 commits
  HIGH:   '█', // 4+ commits
};

// ── Git trick definitions (unlocked by level) ────────────────
export const TRICKS = [
  { name: 'Fetch',     command: 'git fetch --all',               level: 1 },
  { name: 'Sniff',     command: 'git status --short',            level: 1 },
  { name: 'Roll Over', command: 'git branch -a',                 level: 2 },
  { name: 'Bury Bone', command: 'git stash list',                level: 2 },
  { name: 'Sit & Show',command: 'git log --oneline -10',         level: 2 },
  { name: 'Point',     command: 'git diff --stat',               level: 3 },
  { name: 'Howl',      command: 'git remote -v',                 level: 3 },
  { name: 'Pack Call', command: 'git shortlog -sn',              level: 4 },
  { name: 'Play Dead', command: null /* recent commits */,       level: 4 },
  { name: 'Shake',     command: 'git remote prune origin --dry-run', level: 5 },
];

// ── Key bindings ─────────────────────────────────────────────
export const KEY_BINDINGS = {
  FEED:    'f',
  PLAY:    'p',
  LEVEL:   'l',
  STATS:   's',
  COMMIT:  'c',
  TIMER:   't',
  AWARDS:  'a',
  REFRESH: 'r',
  HELP:    'h',
  EXIT:    'e',
  RESET:   'x',
};

// ── Save file path ───────────────────────────────────────────
export const SAVE_FILE = '.gitpet/save.json';

// ── Default pet state (used on first run / reset) ────────────
export const DEFAULT_PET_STATE = {
  name:        'Buddy',
  hp:          80,
  xp:          0,
  level:       1,
  mood:        'HAPPY',
  daysTogther: 0,
  feedCount:   0,
  playCount:   0,
  scanCount:   0,
  createdAt:   null, // set at runtime
};