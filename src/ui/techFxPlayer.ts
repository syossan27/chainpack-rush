// Drawing a special technique's effect (src/data/techFx.ts): the charge at the sword tip, the body
// sent to the target, and the screen shake. The big impact at the target is ElementFx.technique.
// Everything is made with scene.add / tweens / scene.time, so leaving the scene cleans it up.
// The tweens and timers made here are kept so the scene can hold them while the game is paused.
import Phaser from 'phaser';
import { CHARACTER_SCALE } from '../data/sprites';
import {
  bodyOrigin,
  flyFormation,
  flyStart,
  fxSheetKey,
  scaleMs,
  spikeTrail,
  strikePoint,
  type TechFx,
} from '../data/techFx';
import { H, W } from './theme';

type Pt = { x: number; y: number };
/** The hit point on the target, and its feet when known (sky bodies land there) */
export type Target = Pt & { footY?: number };
type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;

/** Where a sky body starts falling from */
const SKY_TOP = -60;
/** How long a body that ran to the target stays on it, and how much it swells there */
const LINGER_MS = 350;
const LINGER_GROW = 1.3;
/** A bursting body's white flash on the target, and how much it swells as it fades */
const BURST_FLASH_MS = 60;
const BURST_GROW = 1.3;
/** The slowest the effect runs (a stopped game counts as 0.1x, as in scaleMs) */
const MIN_RATE = 0.1;
/** Extra time a one-shot strike may take past its animation before it is removed anyway */
const ANIM_GRACE_MS = 150;
/** Gap between the charge motes */
const MOTE_GAP_MS = 30;

export class TechFxPlayer {
  private chargeTimer: Phaser.Time.TimerEvent | null = null;
  /** The game speed of the last release; body art animates at it like the hero does */
  private rate = 1;
  /** The tweens and timers this player made that are still running */
  private readonly live = new Set<Phaser.Tweens.Tween | Phaser.Time.TimerEvent>();
  private halted = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    /** The ground line on screen (ground bodies run along it) */
    private readonly groundY: number,
  ) {}

  /**
   * Hold (true) or let go (false) every tween and timer of the effect: the scene calls this
   * each frame with its pause state, so a special does not play on under the pause menu
   */
  setHalted(halted: boolean): void {
    if (halted === this.halted) return;
    this.halted = halted;
    for (const t of this.live) {
      if (t instanceof Phaser.Time.TimerEvent) t.paused = halted;
      else if (halted) t.pause();
      else t.resume();
    }
  }

  /** Call fn after ms (real ms); held while the game is paused, like the effect itself */
  after(ms: number, fn: () => void): void {
    const ev = this.scene.time.delayedCall(ms, () => {
      this.live.delete(ev);
      fn();
    });
    this.track(ev);
  }

  /** Motes at the sword tip for durationMs (real ms). tipAt returns null when there is no tip */
  charge(fx: TechFx, tipAt: () => Pt | null, durationMs: number): void {
    this.stopCharge();
    // Counted in motes, not by the clock, so a pause does not eat the charge
    const ev = this.scene.time.addEvent({
      delay: MOTE_GAP_MS,
      repeat: Math.max(0, Math.ceil(durationMs / MOTE_GAP_MS) - 1),
      callback: () => {
        const p = tipAt();
        if (p) this.mote(fx, p);
        if (ev.getRepeatCount() === 0) this.stopCharge();
      },
    });
    this.chargeTimer = ev;
    this.track(ev);
  }

  stopCharge(): void {
    if (this.chargeTimer) {
      this.live.delete(this.chargeTimer);
      this.chargeTimer.remove();
    }
    this.chargeTimer = null;
  }

  /**
   * Send the body from the sword tip to the target. Called at the swing; timing is the
   * technique's timeline at game speed 1, speed the current game speed.
   * The scenes run tweens at the game speed (tweens.timeScale), so tween durations stay at
   * speed 1 and only scene.time delays are scaled here
   */
  release(
    fx: TechFx,
    from: Pt,
    to: Target,
    timing: { releaseMs: number; landMs: number },
    speed: number,
  ): void {
    const { count, gapMs, travel } = fx.body;
    this.rate = Math.max(MIN_RATE, speed);
    const travelMs = timing.landMs - timing.releaseMs - (count - 1) * gapMs;
    if (travel === 'fly') {
      for (const f of flyFormation(count))
        this.fly(fx, { x: from.x + f.dx, y: from.y }, { x: to.x + f.dx, y: to.y + f.dy }, travelMs);
      return;
    }
    const strike = strikePoint(to);
    for (let i = 0; i < count; i++) {
      const spread = i - (count - 1) / 2;
      const go = () => {
        if (travel === 'sky') this.fall(fx, { x: strike.x + spread * 20, y: strike.y }, travelMs);
        else this.run(fx, from.x, to.x, travelMs);
      };
      if (i === 0) go();
      else this.after(scaleMs(i * gapMs, this.rate), go);
    }
  }

  /** Flash, shake and (for some techniques) dim the screen. Off when screen shake is turned off */
  screen(fx: TechFx, enabled: boolean): void {
    if (!enabled) return;
    // No whole-screen flash: it strobed during long chains (2026-11-22). The shake carries the hit
    this.scene.cameras.main.shake(140, fx.screen.shake);
    if (fx.screen.dim) {
      const dim = this.scene.add
        .rectangle(0, 0, W, H, 0x000000, 0.35)
        .setOrigin(0, 0)
        .setDepth(this.depth - 1);
      this.tween({
        targets: dim,
        alpha: 0,
        duration: 200,
        onComplete: () => dim.destroy(),
      });
    }
  }

  // ---- bookkeeping ----

  private track(t: Phaser.Tweens.Tween | Phaser.Time.TimerEvent): void {
    this.live.add(t);
    if (!this.halted) return;
    if (t instanceof Phaser.Time.TimerEvent) t.paused = true;
    else t.pause();
  }

  /** A scene tween that is held while the game is paused */
  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    const done = () => this.live.delete(t);
    t.once(Phaser.Tweens.Events.TWEEN_COMPLETE, done);
    t.once(Phaser.Tweens.Events.TWEEN_STOP, done);
    this.track(t);
    return t;
  }

  // ---- bodies ----

  /** The body's sprite, or a stand-in drawn in code until the art exists */
  private body(fx: TechFx, x: number, y: number): Body {
    const key = fxSheetKey(fx.techId);
    if (this.scene.textures.exists(key)) {
      const o = bodyOrigin(fx.body.travel);
      const s = this.scene.add
        .sprite(x, y, key)
        .setOrigin(o.x, o.y)
        .setScale(CHARACTER_SCALE)
        .setDepth(this.depth);
      if (this.scene.anims.exists(key)) {
        s.play(key);
        s.anims.timeScale = this.rate;
      }
      return s;
    }
    const g = this.scene.add.graphics({ x, y }).setDepth(this.depth);
    if (fx.body.travel === 'sky') {
      g.fillStyle(0x2a1a60, 0.6).fillRect(-9, -120, 18, 130);
      g.fillStyle(fx.color, 1).fillRect(-6, -120, 12, 126);
      g.fillStyle(0xffffff, 1).fillRect(-2, -120, 4, 122);
    } else if (fx.body.travel === 'ground') {
      g.fillStyle(fx.color, 0.9).fillTriangle(-18, 0, 0, -44, 18, 0);
      g.fillStyle(0xffffff, 0.9).fillTriangle(-6, 0, 0, -30, 6, 0);
    } else {
      g.lineStyle(12, fx.color, 1).beginPath().arc(-10, 0, 30, -1.1, 1.1).strokePath();
      g.lineStyle(4, fx.color2 ?? 0xffffff, 1)
        .beginPath()
        .arc(-6, 0, 30, -0.9, 0.9)
        .strokePath();
    }
    return g;
  }

  private fly(fx: TechFx, from: Pt, to: Pt, ms: number): void {
    const start = flyStart(from, to);
    const b = this.body(fx, start.x, start.y);
    this.tween({
      targets: b,
      x: to.x,
      y: to.y,
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => (fx.body.burst ? this.burst(b) : this.vanish(b)),
    });
  }

  /** A body that is the impact itself (Venom Cross): flashes white, then swells as it fades */
  private burst(b: Body): void {
    if (b instanceof Phaser.GameObjects.Sprite) {
      b.setTintFill(0xffffff);
      this.after(scaleMs(BURST_FLASH_MS, this.rate), () => b.clearTint());
    }
    const s = b.scaleX * BURST_GROW;
    this.tween({
      targets: b,
      scaleX: s,
      scaleY: s,
      alpha: 0,
      delay: BURST_FLASH_MS,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => b.destroy(),
    });
  }

  private fall(fx: TechFx, to: Pt, ms: number): void {
    const b = this.body(fx, to.x, SKY_TOP);
    this.tween({
      targets: b,
      y: to.y,
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => this.vanishAfterAnim(b),
    });
  }

  /**
   * A strike stays where it landed until its (one-shot) animation has played, then fades. It is
   * removed anyway a little after the animation's length, in case the animation never ends
   */
  private vanishAfterAnim(b: Body): void {
    const anim = b instanceof Phaser.GameObjects.Sprite ? b.anims.currentAnim : null;
    if (!(b instanceof Phaser.GameObjects.Sprite) || !anim || anim.repeat === -1) {
      this.vanish(b);
      return;
    }
    let gone = false;
    const go = () => {
      if (gone || !b.active) return;
      gone = true;
      this.vanish(b);
    };
    b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, go);
    this.after(scaleMs(anim.duration + ANIM_GRACE_MS, this.rate), go);
  }

  private run(fx: TechFx, fromX: number, toX: number, ms: number): void {
    // A frost wave is only its spikes popping up one after another (a sliding spike read oddly)
    if (fx.charge === 'frost') {
      for (const s of spikeTrail(fromX, toX))
        this.after(scaleMs(ms * s.at, this.rate), () => this.spike(fx, s.x, s.scale));
      return;
    }
    const b = this.body(fx, fromX, this.groundY);
    this.tween({
      targets: b,
      x: toX,
      duration: ms,
      ease: 'Linear',
      onComplete: () => this.linger(b),
    });
  }

  /**
   * A body that ran to the target (the tornado) stays on it: it swells while it spins, then
   * rises and fades
   */
  private linger(b: Body): void {
    const s = b.scaleX * LINGER_GROW;
    this.tween({
      targets: b,
      scaleX: s,
      scaleY: s,
      duration: 150,
      ease: 'Back.easeOut',
    });
    this.tween({
      targets: b,
      y: b.y - 60,
      alpha: 0,
      delay: LINGER_MS,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => b.destroy(),
    });
  }

  /**
   * An ice spike popping up behind the frost wave. The art plays its crack-and-shatter and
   * then fades; the stand-in drawn in code just fades
   */
  private spike(fx: TechFx, x: number, scale: number): void {
    const s = this.body(fx, x, this.groundY);
    s.setScale(s.scaleX * scale);
    if (s instanceof Phaser.GameObjects.Sprite) {
      this.vanishAfterAnim(s);
      return;
    }
    this.tween({
      targets: s,
      alpha: 0,
      delay: 120,
      duration: 160,
      onComplete: () => s.destroy(),
    });
  }

  private vanish(b: Body): void {
    this.tween({ targets: b, alpha: 0, duration: 80, onComplete: () => b.destroy() });
  }

  // ---- charge motes ----

  private mote(fx: TechFx, p: Pt): void {
    const jitter = () => (Math.random() - 0.5) * 14;
    const x = p.x + jitter();
    const y = p.y + jitter();
    switch (fx.charge) {
      case 'flame':
        return this.rise(x, y, Math.random() < 0.5 ? 0xff6a20 : 0xffd040, -36, true);
      case 'spark':
        return this.flicker(x, y, Math.random() < 0.5 ? 0xffe040 : 0xffffff);
      case 'frost':
        return this.rise(x, y, Math.random() < 0.6 ? 0x9adfff : 0xffffff, -14, true);
      case 'shine':
        return this.flicker(x, y, 0xffffff);
      case 'wind':
        return this.swirl(p, Math.random() < 0.5 ? 0xb8f0c8 : 0xffffff);
      case 'drip':
        return this.rise(x, y, Math.random() < 0.7 ? 0x6ee83c : 0xff1a3c, 30, false);
      default: {
        const never: never = fx.charge;
        return never;
      }
    }
  }

  /** A square drifting up (dy < 0) or down, fading out */
  private rise(x: number, y: number, color: number, dy: number, add: boolean): void {
    const m = this.scene.add.rectangle(x, y, 6, 6, color).setDepth(this.depth);
    if (add) m.setBlendMode(Phaser.BlendModes.ADD);
    this.tween({
      targets: m,
      y: y + dy,
      alpha: 0,
      scale: 0.4,
      duration: 260,
      onComplete: () => m.destroy(),
    });
  }

  /** A short line that flashes at a random angle (sparks, glints) */
  private flicker(x: number, y: number, color: number): void {
    const m = this.scene.add
      .rectangle(x, y, 14, 3, color)
      .setAngle(Math.random() * 180)
      .setDepth(this.depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tween({ targets: m, alpha: 0, duration: 90, onComplete: () => m.destroy() });
  }

  /** A streak circling the tip */
  private swirl(p: Pt, color: number): void {
    const m = this.scene.add.rectangle(p.x, p.y, 10, 3, color).setDepth(this.depth);
    const start = Math.random() * Math.PI * 2;
    const state = { t: 0 };
    this.tween({
      targets: state,
      t: 1,
      duration: 220,
      onUpdate: () => {
        const a = start + state.t * Math.PI * 2;
        m.setPosition(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 10).setRotation(a + Math.PI / 2);
        m.setAlpha(1 - state.t);
      },
      onComplete: () => m.destroy(),
    });
  }
}
