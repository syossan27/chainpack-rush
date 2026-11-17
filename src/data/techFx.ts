// How each special technique looks. Every hero plays the same shared special motion (body only);
// what tells the techniques apart is this effect, in four parts:
//   charge: drawn at the sword tip while the hero winds up
//   body:   an animated sprite released at the swing and sent to the target
//   impact: the big effect at the target (ElementFx.technique)
//   screen: a flash / shake / dim of the whole screen (off when the player turns screen shake off)
// The body art lives in assets/sprites/fx/<file>; until it exists the game draws a stand-in in code.

export type ChargeKind = 'flame' | 'spark' | 'frost' | 'shine' | 'wind' | 'drip';
/** fly: straight from the sword tip to the target. sky: falls onto the target from above.
 *  ground: runs along the ground from the hero's feet to the target's */
export type Travel = 'fly' | 'sky' | 'ground';
export type TechImpactKind = 'crimson' | 'thunder' | 'frost' | 'triple' | 'whirl' | 'venom';

export interface FxSheet {
  /** Path under assets/sprites, one row of frames */
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface TechFx {
  techId: string;
  color: number;
  color2?: number;
  charge: ChargeKind;
  /**
   * speed: on-screen px per second. count / gapMs: several bodies, gapMs apart.
   * burst: the body is the impact itself — on the target it flashes white and swells as it
   * fades, instead of just fading
   */
  body: FxSheet & {
    travel: Travel;
    speed: number;
    count: number;
    gapMs: number;
    burst?: boolean;
  };
  impact: TechImpactKind;
  screen: { flash: number; shake: number; dim: boolean };
}

const sheet = (
  file: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
  fps: number,
  loop: boolean,
): FxSheet => ({ file, frameWidth, frameHeight, frames, fps, loop });

export const TECH_FX: Readonly<Record<string, TechFx>> = {
  crimson: {
    techId: 'crimson',
    color: 0xff6a20,
    charge: 'flame',
    body: {
      ...sheet('fx/crimson.png', 64, 64, 6, 16, true),
      travel: 'fly',
      speed: 1600,
      count: 1,
      gapMs: 0,
    },
    impact: 'crimson',
    screen: { flash: 0xff8a30, shake: 0.009, dim: false },
  },
  thunder: {
    techId: 'thunder',
    color: 0xffe040,
    charge: 'spark',
    body: {
      ...sheet('fx/thunder.png', 48, 160, 5, 20, false),
      travel: 'sky',
      speed: 0,
      count: 3,
      gapMs: 80,
    },
    impact: 'thunder',
    screen: { flash: 0xffffff, shake: 0.01, dim: true },
  },
  frost: {
    techId: 'frost',
    color: 0x9adfff,
    charge: 'frost',
    body: {
      ...sheet('fx/frost.png', 48, 48, 5, 18, false),
      travel: 'ground',
      speed: 1100,
      count: 1,
      gapMs: 0,
    },
    impact: 'frost',
    screen: { flash: 0xc8f0ff, shake: 0.008, dim: false },
  },
  triple: {
    techId: 'triple',
    color: 0xffffff,
    charge: 'shine',
    body: {
      ...sheet('fx/triple.png', 64, 64, 4, 16, true),
      travel: 'fly',
      speed: 1800,
      // The three fly together in a ">" formation (flyFormation)
      count: 3,
      gapMs: 0,
    },
    impact: 'triple',
    screen: { flash: 0xffffff, shake: 0.008, dim: false },
  },
  whirl: {
    techId: 'whirl',
    color: 0xb8f0c8,
    charge: 'wind',
    body: {
      ...sheet('fx/whirl.png', 64, 80, 6, 16, true),
      travel: 'ground',
      speed: 900,
      count: 1,
      gapMs: 0,
    },
    impact: 'whirl',
    screen: { flash: 0xe0fff0, shake: 0.012, dim: false },
  },
  venom: {
    techId: 'venom',
    color: 0x8ae04a,
    color2: 0xff1a3c,
    charge: 'drip',
    body: {
      // The bright X alone: it flies, then flashes and swells away on the target
      ...sheet('fx/venom.png', 96, 96, 1, 14, false),
      travel: 'fly',
      speed: 1500,
      count: 1,
      gapMs: 0,
      burst: true,
    },
    impact: 'venom',
    screen: { flash: 0xb0ff70, shake: 0.009, dim: false },
  },
};

export function techFxFor(techId: string | undefined): TechFx | undefined {
  return techId ? TECH_FX[techId] : undefined;
}

/** Texture and animation key of a technique's body sprite */
export const fxSheetKey = (techId: string) => `fx_${techId}`;

/** A sky body takes this long to fall onto the target */
const SKY_FALL_MS = 60;
/** The effect ends this long after the big impact */
const TAIL_MS = 250;

/**
 * When the parts happen, in ms at game speed 1 from the start of the special motion:
 * releaseMs: the swing (the body leaves), landMs: the big impact, endMs: everything is over
 */
export function specialTimeline(
  body: { frames: number; fps: number; impactFrame: number },
  fx: TechFx,
  distancePx: number,
): { releaseMs: number; landMs: number; endMs: number } {
  const releaseMs = (body.impactFrame / body.fps) * 1000;
  const spread = (fx.body.count - 1) * fx.body.gapMs;
  const travelMs =
    fx.body.travel === 'sky'
      ? SKY_FALL_MS
      : Math.min(260, Math.max(90, (distancePx / fx.body.speed) * 1000));
  const landMs = releaseMs + travelMs + spread;
  return { releaseMs, landMs, endMs: Math.max((body.frames / body.fps) * 1000, landMs + TAIL_MS) };
}

/**
 * Where a flying body starts: in front of the sword tip, level with the target. It then flies
 * straight across facing right (a body tilted toward the target read oddly)
 */
export function flyStart(
  tip: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  return { x: tip.x, y: to.y };
}

/** How far the outer bodies of a ">" formation sit behind and above / below the lead one */
const FORMATION_BACK = 36;
const FORMATION_SIDE = 36;

/**
 * Where each body of a flying technique sits against the lead one: a ">" formation, the middle
 * one in front and the others behind it above and below. They all fly together
 */
export function flyFormation(count: number): { dx: number; dy: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const s = i - (count - 1) / 2;
    // 0 - … keeps the lead at +0 (not -0)
    return { dx: 0 - Math.abs(s) * FORMATION_BACK, dy: s * FORMATION_SIDE };
  });
}

/**
 * The point of a body's art that sits on its position: the bottom edge for bodies that strike
 * from the sky or run along the ground (the bolt's tip on the target, the spike on the ground),
 * the middle for flying ones
 */
export function bodyOrigin(travel: Travel): { x: number; y: number } {
  return travel === 'fly' ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 1 };
}

/**
 * Where a body from the sky lands: the target's feet, so the bolt runs through the whole body
 * whatever the enemy's size (the hit point when the feet are not known)
 */
export function strikePoint(to: { x: number; y: number; footY?: number }): {
  x: number;
  y: number;
} {
  return { x: to.x, y: to.footY ?? to.y };
}

/**
 * The ice spikes of a frost wave: always two, popping up from the sword tip toward the target
 * and growing as they go (at: when, as a share of the travel time). The big crystal at the
 * target is the impact (ElementFx). A fixed count keeps the wave readable when the enemy
 * stands close
 */
export function spikeTrail(fromX: number, toX: number): { x: number; at: number; scale: number }[] {
  return [1, 2].map((i) => {
    const at = i / 3;
    return { x: fromX + (toX - fromX) * at, at, scale: 0.6 + 0.4 * at };
  });
}

/** A time at game speed 1 turned into real ms (a stopped game counts as 0.1x, as elsewhere) */
export function scaleMs(ms: number, speed: number): number {
  return ms / Math.max(0.1, speed);
}
