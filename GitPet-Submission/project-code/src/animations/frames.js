// ============================================================
// frames.js — All animation frame data
// ============================================================
// Each animation is an object:
//   {
//     name:   string          — identifier
//     frames: string[]        — ASCII art frames (one per tick)
//     fps:    number          — frames per second
//     loop:   boolean         — loops indefinitely when true
//     mood:   string[]        — moods that can play this animation
//   }
//
// Frame strings use plain ASCII + box-drawing chars.
// Keep each frame the same HEIGHT (pad with \n if needed) so the
// terminal doesn't jump when switching frames.

export const FRAME_HEIGHT = 6; // all frames must be this many lines

// ── Helper: pad a frame string to FRAME_HEIGHT lines ─────────
function pad(str) {
  const lines = str.split('\n');
  while (lines.length < FRAME_HEIGHT) lines.push('');
  return lines.slice(0, FRAME_HEIGHT).join('\n');
}

// ── IDLE ──────────────────────────────────────────────────────
export const IDLE = {
  name: 'idle',
  fps: 1,
  loop: true,
  mood: ['EXCITED','HAPPY','NEUTRAL'],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/   (____/\n/_____/  U\n`),
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/   (____/\n/_____/ U \n`), // tail wag
  ],
};

// ── WALK LEFT ─────────────────────────────────────────────────
export const WALK_LEFT = {
  name: 'walk_left',
  fps: 2,
  loop: true,
  mood: ['EXCITED','HAPPY'],
  frames: [
    pad(`  / \\__\n (  ^.^ @\\\n /        O\n /  (____/\n/ /   U\n`),
    pad(`  / \\__\n (  ^.^ @\\\n /        O\n /  (____/\n/   U /\n`),
    pad(`  / \\__\n (  ^.^ @\\\n /        O\n /  (____/\n/ U   /\n`),
  ],
};

// ── WALK RIGHT ────────────────────────────────────────────────
export const WALK_RIGHT = {
  name: 'walk_right',
  fps: 2,
  loop: true,
  mood: ['EXCITED','HAPPY'],
  frames: [
    pad(`   __/ \\\n  /@.^  )\n  O       \\\n   \\____) \\\n      U\\ \\\n`),
    pad(`   __/ \\\n  /@.^  )\n  O       \\\n   \\____) \\\n     \\ U\\\n`),
    pad(`   __/ \\\n  /@.^  )\n  O       \\\n   \\____) \\\n    \\ \\ U\n`),
  ],
};

// ── SNIFF ─────────────────────────────────────────────────────
export const SNIFF = {
  name: 'sniff',
  fps: 2,
  loop: false,
  mood: ['HAPPY','NEUTRAL'],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/  (____/\n/__/ U\n`),
    pad(` / \\__\n(  0.0  @\\\n/  *sniff* O\n/  (____/\n/__/ U\n`),
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/  (____/\n/__/ U\n`),
  ],
};

// ── SCRATCH ───────────────────────────────────────────────────
export const SCRATCH = {
  name: 'scratch',
  fps: 2,
  loop: false,
  mood: ['HAPPY','NEUTRAL','EXCITED'],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n|/o       O\n/  (____/\n/_____/ U\n`),
    pad(` / \\__\n(  x.^  @\\\n|\\o       O\n/  (____/\n/_____/ U\n`),
    pad(` / \\__\n(  ^.^  @\\\n|/o       O\n/  (____/\n/_____/ U\n`),
  ],
};

// ── ROLL OVER ─────────────────────────────────────────────────
export const ROLL_OVER = {
  name: 'roll_over',
  fps: 1,
  loop: false,
  mood: ['EXCITED','HAPPY'],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/   (____/\n/_____/ U\n`),
    pad(`\n  _______\n /^.^    \\\n| legs up|\n\\_______/\n`),
    pad(`\n  _______\n /  U U  \\\n| rolled! |\n\\_______/\n`),
    pad(` / \\__\n(  ^.^  @\\\n/         O\n/   (____/\n/_____/ U\n`),
  ],
};

// ── CHASE TAIL ────────────────────────────────────────────────
export const CHASE_TAIL = {
  name: 'chase_tail',
  fps: 2,
  loop: false,
  mood: ['EXCITED'],
  frames: [
    pad(` / \\__\n(  o.o  @\\\n/ > spin  O\n/   (____/\n/_____/ U\n`),
    pad(` / \\__\n(  @.@  \\\n/ spin <  O\n/   (____/\nU /_____/\n`),
    pad(` / \\__\n(  o.o  @\\\n/ > spin  O\n/   (____/\n/_____/ U\n`),
    pad(` / \\__\n(  ^.^  @\\\n/ got it! O\n/   (____/\n/_____/ U\n`),
  ],
};

// ── WHIMPER (sad) ─────────────────────────────────────────────
export const WHIMPER = {
  name: 'whimper',
  fps: 1,
  loop: true,
  mood: ['SAD'],
  frames: [
    pad(` / \\__\n(  ;.; @\\\n/    '    O\n/  (____/\n/____/ U\n`),
    pad(` / \\__\n(  ;.;  @\\\n/   ''    O\n/  (____/\n/____/ U\n`),
  ],
};

// ── SICK ─────────────────────────────────────────────────────
export const SICK = {
  name: 'sick',
  fps: 1,
  loop: true,
  mood: ['SICK'],
  frames: [
    pad(` / \\__\n(  x.x  @\\\n/ *shiver* O\n/  (____/\n/____/ U\n`),
    pad(` / \\__\n(  x.x  @\\\n/ *shiver* O\n/ *(____/\n/____/ U\n`),
  ],
};

// ── SLEEP ─────────────────────────────────────────────────────
export const SLEEP = {
  name: 'sleep',
  fps: 1,
  loop: true,
  mood: ['SLEEPING'],
  frames: [
    pad(`  z\n / \\__\n(-  @\\\n/  zzz  O\n\\_______/\n`),
    pad(`  z Z\n / \\__\n(-  @\\\n/  zzz  O\n\\_______/\n`),
    pad(`  z Z z\n / \\__\n(-  @\\\n/  zzz  O\n\\_______/\n`),
  ],
};

// ── LEVEL UP CELEBRATION ─────────────────────────────────────
export const LEVEL_UP = {
  name: 'level_up',
  fps: 2,
  loop: false,
  mood: [],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n/  \\o/   O\n/  (____/\n/_____/ U\n`),
    pad(` ★ ★ ★\n/ \\__★\n( ^.^ @\\\n/  \\o/ O\n/_____/ U\n`),
    pad(` / \\__\n(  ^.^  @\\\n/ LEVEL UP O\n/  (____/\n/_____/ U\n`),
    pad(` ★ ★ ★\n/ \\__★\n( ^.^ @\\\n/  \\o/ O\n/_____/ U\n`),
  ],
};

// ── TRICK ─────────────────────────────────────────────────────
export const TRICK = {
  name: 'trick',
  fps: 2,
  loop: false,
  mood: [],
  frames: [
    pad(` / \\__\n(  ^.^  @\\\n/ * yip! * O\n/  (____/\n/_____/ U\n`),
    pad(` / \\__\n(  >.<  @\\\n/ working  O\n/  (____/\n/_____/ U\n`),
    pad(` / \\__\n(  ^-^  @\\\n/ * done! * O\n/  (____/\n/_____/ U\n`),
  ],
};

// ── Master list (used by animationMap) ───────────────────────
export const ALL_ANIMATIONS = [
  IDLE, WALK_LEFT, WALK_RIGHT, SNIFF, SCRATCH,
  ROLL_OVER, CHASE_TAIL, WHIMPER, SICK, SLEEP,
  LEVEL_UP, TRICK,
];