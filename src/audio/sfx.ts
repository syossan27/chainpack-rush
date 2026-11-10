// WebAudio 合成音。音素材ファイルは使わない。
// 音色のパラメータ（周波数・長さ）は演出用の定数としてここにまとめる。

type Wave = OscillatorType;

interface Tone {
  wave: Wave;
  freq: number;
  to?: number; // 終わりの周波数（スライド）
  dur: number;
  gain: number;
  delay?: number;
}

const TONES = {
  click: [{ wave: 'square', freq: 660, dur: 0.04, gain: 0.15 }],
  error: [
    { wave: 'square', freq: 200, dur: 0.08, gain: 0.15 },
    { wave: 'square', freq: 150, dur: 0.1, gain: 0.15, delay: 0.08 },
  ],
  fire: [{ wave: 'triangle', freq: 300, to: 600, dur: 0.12, gain: 0.25 }],
  hit: [{ wave: 'square', freq: 180, to: 90, dur: 0.06, gain: 0.12 }],
  heroHurt: [{ wave: 'sawtooth', freq: 140, to: 70, dur: 0.15, gain: 0.18 }],
  whiff: [{ wave: 'triangle', freq: 240, to: 200, dur: 0.05, gain: 0.06 }],
  shock: [
    { wave: 'sawtooth', freq: 900, to: 300, dur: 0.18, gain: 0.2 },
    { wave: 'square', freq: 1200, to: 400, dur: 0.12, gain: 0.12, delay: 0.05 },
  ],
  explode: [
    { wave: 'sawtooth', freq: 120, to: 40, dur: 0.35, gain: 0.3 },
    { wave: 'square', freq: 80, to: 30, dur: 0.3, gain: 0.2, delay: 0.03 },
  ],
  shatter: [
    { wave: 'triangle', freq: 1600, to: 800, dur: 0.12, gain: 0.2 },
    { wave: 'triangle', freq: 2000, to: 1000, dur: 0.12, gain: 0.15, delay: 0.06 },
  ],
  enemyDown: [{ wave: 'square', freq: 400, to: 120, dur: 0.1, gain: 0.1 }],
  bossDown: [
    { wave: 'square', freq: 262, dur: 0.12, gain: 0.2 },
    { wave: 'square', freq: 330, dur: 0.12, gain: 0.2, delay: 0.12 },
    { wave: 'square', freq: 392, dur: 0.12, gain: 0.2, delay: 0.24 },
    { wave: 'square', freq: 523, dur: 0.3, gain: 0.22, delay: 0.36 },
  ],
  defense: [{ wave: 'sine', freq: 500, to: 900, dur: 0.15, gain: 0.15 }],
  drop: [{ wave: 'triangle', freq: 880, to: 1320, dur: 0.1, gain: 0.12 }],
  open: [{ wave: 'triangle', freq: 520, to: 780, dur: 0.1, gain: 0.15 }],
  openRare: [
    { wave: 'triangle', freq: 660, dur: 0.08, gain: 0.18 },
    { wave: 'triangle', freq: 990, dur: 0.12, gain: 0.18, delay: 0.08 },
  ],
  openEpic: [
    { wave: 'square', freq: 523, dur: 0.1, gain: 0.18 },
    { wave: 'square', freq: 659, dur: 0.1, gain: 0.18, delay: 0.1 },
    { wave: 'square', freq: 784, dur: 0.1, gain: 0.18, delay: 0.2 },
    { wave: 'triangle', freq: 1046, dur: 0.5, gain: 0.25, delay: 0.3 },
  ],
  openLegend: [
    { wave: 'square', freq: 523, dur: 0.1, gain: 0.2 },
    { wave: 'square', freq: 784, dur: 0.1, gain: 0.2, delay: 0.1 },
    { wave: 'square', freq: 1046, dur: 0.1, gain: 0.2, delay: 0.2 },
    { wave: 'sawtooth', freq: 1318, dur: 0.6, gain: 0.18, delay: 0.3 },
    { wave: 'triangle', freq: 1568, dur: 0.6, gain: 0.2, delay: 0.3 },
  ],
  // ボス接近の警報（2回うねる）
  warning: [
    { wave: 'sawtooth', freq: 440, to: 660, dur: 0.22, gain: 0.14 },
    { wave: 'sawtooth', freq: 660, to: 440, dur: 0.22, gain: 0.14, delay: 0.22 },
    { wave: 'sawtooth', freq: 440, to: 660, dur: 0.22, gain: 0.14, delay: 0.5 },
    { wave: 'sawtooth', freq: 660, to: 440, dur: 0.22, gain: 0.14, delay: 0.72 },
  ],
  runEnd: [
    { wave: 'triangle', freq: 392, dur: 0.15, gain: 0.2 },
    { wave: 'triangle', freq: 330, dur: 0.15, gain: 0.2, delay: 0.15 },
    { wave: 'triangle', freq: 262, dur: 0.35, gain: 0.2, delay: 0.3 },
  ],
} satisfies Record<string, Tone[]>;

export type SfxName = keyof typeof TONES;

/** 連鎖の1段ごとの音: 段数が進むほど音程が上がる（半音ずつ、上限あり） */
const STEP_BASE_FREQ = 330;
const STEP_SEMITONES = 2;
const STEP_MAX = 16;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
let suspended = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return ctx;
}

/** iOS などはユーザー操作の中で一度鳴らす必要がある */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === 'suspended' && !suspended) void c.resume();
}

export function setMasterVolume(v: number): void {
  volume = v;
  if (master) master.gain.value = v;
}

export function setAudioSuspended(s: boolean): void {
  suspended = s;
  if (!ctx) return;
  if (s) void ctx.suspend();
  else void ctx.resume();
}

function playTones(tones: readonly Tone[]): void {
  const c = ensure();
  if (!c || !master || suspended || volume <= 0 || c.state !== 'running') return;
  const now = c.currentTime;
  for (const t of tones) {
    const start = now + (t.delay ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = t.wave;
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    g.gain.setValueAtTime(t.gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export function sfx(name: SfxName): void {
  playTones(TONES[name]);
}

export function sfxChainStep(step: number): void {
  const n = Math.min(STEP_MAX, Math.max(0, step));
  const freq = STEP_BASE_FREQ * Math.pow(2, (n * STEP_SEMITONES) / 12);
  playTones([{ wave: 'square', freq, dur: 0.07, gain: 0.12 }]);
}
