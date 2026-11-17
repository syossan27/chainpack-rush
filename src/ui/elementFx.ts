// 属性ごとの攻撃エフェクト（雷は稲妻、炎は火柱と火の粉、氷は結晶、打撃は衝撃波、水はしぶき、油は黒いしずく）。
// コンボ（感電・爆発・粉砕）はさらに大きく。描画だけで、core には何も書き戻さない。
import Phaser from 'phaser';
import type { Element } from '../core/types';
import { CHARACTER_SCALE } from '../data/sprites';
import { fxSheetKey, type TechImpactKind } from '../data/techFx';

/** 同時に出しすぎないための上限（100ミリ秒あたり） */
const BUDGET = 10;
/** Frost Breaker's impact crystal against the size of the frost body's art */
const ICE_CRYSTAL_SCALE = 1.7;
/** The frost art's frame (1-based) where the crystal bursts into shards */
const ICE_SHATTER_FRAME = 4;
/** Venom Cross impact colors (the X art's red and green) */
const VENOM_RED = 0xff1a3c;
const VENOM_GREEN = 0x6ee83c;

export class ElementFx {
  private windowStart = 0;
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    /** 稲妻が落ちてくる高さ（画面の上の方） */
    private readonly skyY: number,
    /** 衝撃波を出す地面の高さ */
    private readonly groundY: number,
  ) {}

  private allow(now: number): boolean {
    if (now - this.windowStart > 100) {
      this.windowStart = now;
      this.used = 0;
    }
    return this.used++ < BUDGET;
  }

  /** strength: 0〜1（ダメージの大きさ）。combo: そのヒットで起きたコンボ */
  hit(
    x: number,
    y: number,
    element: Element | undefined,
    strength: number,
    combo: string | null,
  ): void {
    if (!this.allow(this.scene.time.now)) return;
    if (combo === 'shock') return this.shock(x, y);
    if (combo === 'explode') return this.explode(x, y);
    if (combo === 'shatter') return this.shatter(x, y);
    if (combo === 'purify') return this.purify(x, y);
    if (combo === 'seal') return this.seal(x, y);
    if (combo === 'venom') return this.venom(x, y);
    switch (element) {
      case 'thunder':
        this.bolt(x, y, 1 + strength);
        break;
      case 'fire':
        this.flames(x, y, 8 + Math.round(strength * 10));
        break;
      case 'ice':
        this.shards(x, y, 6 + Math.round(strength * 8), 0xc8f0ff);
        break;
      case 'blunt':
        this.shockwave(x, 0.8 + strength);
        break;
      case 'water':
        this.drops(x, y, 0x5aa0e8, 8);
        break;
      case 'oil':
        this.drops(x, y, 0x3a2a40, 6);
        break;
      case 'wind':
        this.gust(x, y, 5 + Math.round(strength * 6));
        break;
      case 'light':
        this.rays(x, y, 0xfff4b0, 5 + Math.round(strength * 5));
        break;
      case 'dark':
        this.smoke(x, y, 0x6a3aa8, 5 + Math.round(strength * 5));
        break;
      default:
        break;
    }
  }

  /** 必殺技の一撃: 属性の演出を特大で（予算に関係なく出す） */
  technique(kind: TechImpactKind, x: number, y: number): void {
    switch (kind) {
      case 'crimson':
        this.explode(x, y);
        this.flames(x, y, 30);
        this.pillar(x, 0xff6a20);
        break;
      case 'thunder':
        this.shock(x, y);
        this.electricRing(x, y);
        break;
      case 'frost':
        if (!this.iceCrystal(x)) this.icePillar(x);
        this.ring(x, y, 0xffffff, 6, 300);
        break;
      case 'triple':
        this.triangle(x, y);
        this.ring(x, y, 0xffffff, 7, 320);
        break;
      case 'whirl':
        this.vortex(x, y);
        this.shockwave(x, 1.6);
        break;
      case 'venom':
        // The X art itself bursts on the target (TechFxPlayer); the drawn X is its stand-in
        if (!this.scene.textures.exists(fxSheetKey('venom'))) this.xMark(x, y);
        // Kept abstract: red and green shards of light fly out, two rings pulse (the poison
        // spreading), and a few poison bubbles rise off the target
        this.shards(x, y, 12, VENOM_RED);
        this.shards(x, y, 12, VENOM_GREEN);
        this.ring(x, y, VENOM_GREEN, 6, 320);
        this.scene.time.delayedCall(90, () => this.ring(x, y, VENOM_RED, 4.5, 280));
        this.bubbles(x, y, 8);
        break;
      default: {
        const never: never = kind;
        return never;
      }
    }
  }

  // ---- 必殺技の着弾の部品 ----

  /** A column of fire rising from the ground */
  private pillar(x: number, color: number): void {
    const h = 220;
    const col = this.scene.add
      .rectangle(x, this.groundY, 40, h, color)
      .setOrigin(0.5, 1)
      .setScale(1, 0.1)
      .setDepth(this.depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.scene.add
      .rectangle(x, this.groundY, 16, h, 0xffe060)
      .setOrigin(0.5, 1)
      .setScale(1, 0.1)
      .setDepth(this.depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: [col, core],
      scaleY: 1,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () =>
        this.scene.tweens.add({
          targets: [col, core],
          scaleX: 0.2,
          alpha: 0,
          duration: 230,
          onComplete: () => {
            col.destroy();
            core.destroy();
          },
        }),
    });
  }

  /** Two yellow rings spreading out, with short sparks shooting outward */
  private electricRing(x: number, y: number): void {
    this.ring(x, y, 0xfff060, 7, 300);
    this.scene.time.delayedCall(80, () => this.ring(x, y, 0xffffff, 5, 260));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = this.scene.add
        .rectangle(x, y, 22, 4, i % 2 ? 0xffffff : 0xffe040)
        .setDepth(this.depth)
        .setAngle(Phaser.Math.RadToDeg(a))
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 90,
        y: y + Math.sin(a) * 90,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** An ice pillar pushes up from the ground, then shatters */
  /**
   * Frost Breaker's impact with the art: the ice crystal (the frost body's art) thrusts up big
   * from the ground, glints, then cracks and shatters. False when the art is missing
   */
  private iceCrystal(x: number): boolean {
    const key = fxSheetKey('frost');
    if (!this.scene.textures.exists(key) || !this.scene.anims.exists(key)) return false;
    const scale = CHARACTER_SCALE * ICE_CRYSTAL_SCALE;
    const s = this.scene.add
      .sprite(x, this.groundY, key, 0)
      .setOrigin(0.5, 1)
      .setScale(scale, scale * 0.05)
      .setDepth(this.depth);
    // Animate at the game speed like the tweens (the scenes set tweens.timeScale to it)
    s.anims.timeScale = this.scene.tweens.timeScale;
    s.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_a: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        // The frame where it bursts apart: add flying shards on top of the art's
        if (frame.index === ICE_SHATTER_FRAME) {
          this.shards(x, this.groundY - 80, 22, 0x9adfff);
          this.shards(x, this.groundY - 150, 10, 0xe8fbff);
        }
      },
    );
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.scene.tweens.add({ targets: s, alpha: 0, duration: 120, onComplete: () => s.destroy() }),
    );
    this.scene.tweens.add({
      targets: s,
      scaleY: scale,
      duration: 110,
      ease: 'Back.easeOut',
      // Hold the glint a moment, then crack and shatter
      onComplete: () => s.playAfterDelay(key, 150),
    });
    return true;
  }

  private icePillar(x: number): void {
    const h = 150;
    const parts = [
      this.scene.add.rectangle(x, this.groundY, 44, h, 0x9adfff),
      this.scene.add.rectangle(x - 6, this.groundY, 12, h - 20, 0xe8fbff),
    ];
    for (const p of parts)
      p.setOrigin(0.5, 1).setScale(1, 0.05).setStrokeStyle(3, 0x2a6aa0, 0.9).setDepth(this.depth);
    this.scene.tweens.add({
      targets: parts,
      scaleY: 1,
      duration: 110,
      ease: 'Back.easeOut',
      onComplete: () =>
        this.scene.time.delayedCall(150, () => {
          for (const p of parts) p.destroy();
          this.shards(x, this.groundY - h / 2, 22, 0x9adfff);
          this.shards(x, this.groundY - h, 10, 0xe8fbff);
        }),
    });
  }

  /** Three white lines meet in a triangle over the target, flash, and burst outward */
  private triangle(x: number, y: number): void {
    const r = 46;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      const b = a + (2 * Math.PI) / 3;
      const mx = x + ((Math.cos(a) + Math.cos(b)) / 2) * r;
      const my = y + ((Math.sin(a) + Math.sin(b)) / 2) * r;
      const len = Math.sqrt(3) * r;
      const line = this.scene.add
        .rectangle(mx, my, len * 1.4, 6, 0xffffff)
        .setAngle(
          Phaser.Math.RadToDeg(Math.atan2(Math.sin(b) - Math.sin(a), Math.cos(b) - Math.cos(a))),
        )
        .setScale(0, 1)
        .setDepth(this.depth)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: line,
        scaleX: 1,
        duration: 90,
        delay: i * 50,
        ease: 'Quad.easeOut',
        onComplete: () =>
          this.scene.tweens.add({
            targets: line,
            scaleY: 3,
            alpha: 0,
            duration: 220,
            delay: 60,
            onComplete: () => line.destroy(),
          }),
      });
    }
    this.scene.time.delayedCall(200, () => this.rays(x, y, 0xffffff, 12));
  }

  /** Debris and leaves circling the target as they rise */
  private vortex(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      const p = this.scene.add
        .rectangle(x, y + 30, 8, 5, [0xb8f0c8, 0x6ab070, 0xc8a070][i % 3]!)
        .setDepth(this.depth);
      const start = (i / 18) * Math.PI * 2;
      const state = { t: 0 };
      this.scene.tweens.add({
        targets: state,
        t: 1,
        duration: 520 + (i % 4) * 60,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          const a = start + state.t * Math.PI * 3;
          const radius = 26 + state.t * 40;
          p.setPosition(x + Math.cos(a) * radius, y + 30 - state.t * 120);
          p.setAngle(state.t * 540);
          p.setAlpha(1 - state.t);
        },
        onComplete: () => p.destroy(),
      });
    }
  }

  /** A green and red X stays on the target for a moment, then fades */
  private xMark(x: number, y: number): void {
    const bars = [
      this.scene.add.rectangle(x, y, 110, 12, 0x6ee83c).setAngle(45),
      this.scene.add.rectangle(x, y, 110, 12, 0xff1a3c).setAngle(-45),
    ];
    for (const b of bars) b.setStrokeStyle(3, 0x1a0a14, 0.9).setScale(0.3).setDepth(this.depth);
    this.scene.tweens.add({
      targets: bars,
      scale: 1,
      duration: 90,
      ease: 'Back.easeOut',
      onComplete: () =>
        this.scene.tweens.add({
          targets: bars,
          alpha: 0,
          delay: 400,
          duration: 200,
          onComplete: () => bars.forEach((b) => b.destroy()),
        }),
    });
  }

  // ---- 部品 ----

  /** 空から落ちる稲妻（折れ線）。太さ w */
  private bolt(x: number, y: number, w: number): void {
    // 明るい空でも見えるように、加算ではなく縁取りつきで描く
    const g = this.scene.add.graphics().setDepth(this.depth);
    const pts: { x: number; y: number }[] = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({
        x: x + (i === 0 || i === n ? 0 : (Math.random() - 0.5) * 50),
        y: this.skyY + (y - this.skyY) * t,
      });
    }
    const draw = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
    };
    draw(12 * w, 0x2a1a60, 0.45);
    draw(7 * w, 0xffd030, 0.95);
    draw(3 * w, 0xffffff, 1);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    this.ring(x, y, 0xfff060, 3, 180);
  }

  /** 火柱と火の粉 */
  private flames(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const c = [0xff5a20, 0xffa030, 0xffe060][i % 3]!;
      const p = this.scene.add
        .rectangle(x + (Math.random() - 0.5) * 40, y + 20, 8, 8, c)
        .setDepth(this.depth)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: p,
        y: y - 60 - Math.random() * 90,
        x: p.x + (Math.random() - 0.5) * 30,
        scale: 0.2,
        alpha: 0,
        duration: 420 + Math.random() * 260,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 氷の結晶が砕けて飛び散る */
  private shards(x: number, y: number, n: number, color: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 50 + Math.random() * 60;
      const p = this.scene.add
        .rectangle(x, y, 6, 14, i % 3 === 0 ? 0xffffff : color)
        .setDepth(this.depth)
        .setAngle(Phaser.Math.RadToDeg(a))
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        angle: p.angle + 180,
        alpha: 0,
        duration: 380 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 地面を走る衝撃波と土ぼこり */
  private shockwave(x: number, s: number): void {
    const e = this.scene.add
      .ellipse(x, this.groundY, 40, 12)
      .setStrokeStyle(5, 0xfff0c0, 0.9)
      .setDepth(this.depth);
    this.scene.tweens.add({
      targets: e,
      scaleX: 5 * s,
      scaleY: 2 * s,
      alpha: 0,
      duration: 320,
      onComplete: () => e.destroy(),
    });
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add
        .rectangle(x + (Math.random() - 0.5) * 30, this.groundY - 4, 7, 7, 0xb89870)
        .setDepth(this.depth);
      this.scene.tweens.add({
        targets: p,
        x: p.x + (Math.random() - 0.5) * 120,
        y: this.groundY - 20 - Math.random() * 30,
        alpha: 0,
        duration: 360,
        onComplete: () => p.destroy(),
      });
    }
  }

  /** しずく（水・油） */
  private drops(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add.circle(x, y, 4 + Math.random() * 3, color).setDepth(this.depth);
      const vx = (Math.random() - 0.5) * 160;
      this.scene.tweens.add({
        targets: p,
        x: x + vx,
        y: { value: y + 40 + Math.random() * 30, ease: 'Quad.easeIn' },
        alpha: 0,
        duration: 420,
        onComplete: () => p.destroy(),
      });
    }
  }

  /** Poison bubbles that well up on the target, rise and pop */
  private bubbles(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const b = this.scene.add
        .circle(
          x + (Math.random() - 0.5) * 60,
          y + (Math.random() - 0.3) * 60,
          4 + Math.random() * 6,
        )
        .setFillStyle(0x6ee83c, 0.75)
        .setStrokeStyle(2, 0xe6ff8c, 0.9)
        .setDepth(this.depth)
        .setScale(0);
      const delay = i * 45;
      this.scene.tweens.add({ targets: b, scale: 1, delay, duration: 100 });
      this.scene.tweens.add({
        targets: b,
        y: b.y - 40 - Math.random() * 40,
        x: b.x + (Math.random() - 0.5) * 16,
        delay,
        duration: 480,
        ease: 'Sine.easeOut',
        onComplete: () =>
          this.scene.tweens.add({
            targets: b,
            scale: 1.8,
            alpha: 0,
            duration: 110,
            onComplete: () => b.destroy(),
          }),
      });
    }
  }

  private ring(x: number, y: number, color: number, scale: number, ms: number): void {
    const r = this.scene.add
      .circle(x, y, 16)
      .setStrokeStyle(5, color, 1)
      .setDepth(this.depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: r,
      scale,
      alpha: 0,
      duration: ms,
      onComplete: () => r.destroy(),
    });
  }

  /** 風: 横に走る細い筋 */
  private gust(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const yy = y - 40 + Math.random() * 70;
      const p = this.scene.add
        .rectangle(x + 60, yy, 34 + Math.random() * 30, 4, i % 2 ? 0xe8fff0 : 0xa0f0c8)
        .setDepth(this.depth)
        .setAlpha(0.9);
      this.scene.tweens.add({
        targets: p,
        x: x - 70 - Math.random() * 40,
        alpha: 0,
        scaleX: 0.4,
        duration: 260 + Math.random() * 120,
        delay: i * 25,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 光: 中心から伸びる光の筋 */
  private rays(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const p = this.scene.add
        .rectangle(x, y, 6, 30, i % 3 === 0 ? 0xffffff : color)
        .setDepth(this.depth)
        .setAngle(Phaser.Math.RadToDeg(a) + 90)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 70,
        y: y + Math.sin(a) * 70,
        scaleY: 2,
        alpha: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 闇: ゆっくり上る暗い煙（明るい空でも見えるよう、加算にしない） */
  private smoke(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add
        .rectangle(x + (Math.random() - 0.5) * 50, y + 10, 12, 12, i % 3 === 0 ? 0x2a1640 : color)
        .setStrokeStyle(2, 0x1a0a28, 0.8)
        .setDepth(this.depth)
        .setAlpha(0.85);
      this.scene.tweens.add({
        targets: p,
        y: y - 50 - Math.random() * 50,
        x: p.x + (Math.random() - 0.5) * 30,
        scale: 1.8,
        alpha: 0,
        duration: 520 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ---- コンボ ----

  private purify(x: number, y: number): void {
    this.rays(x, y, 0xfff4b0, 14);
    this.ring(x, y, 0xffffff, 6, 320);
    this.ring(x, y, 0xffe080, 4, 260);
  }

  private seal(x: number, y: number): void {
    this.smoke(x, y, 0x6a3aa8, 12);
    this.ring(x, y, 0xb080ff, 6, 360);
  }

  private venom(x: number, y: number): void {
    this.drops(x, y - 20, 0x8ae04a, 14);
    this.ring(x, y, 0x8ae04a, 7, 360);
    this.ring(x, y, 0xe0ff80, 4, 260);
  }

  private shock(x: number, y: number): void {
    for (let i = 0; i < 3; i++) this.bolt(x + (i - 1) * 26, y, 1.6 - i * 0.2);
    this.ring(x, y, 0xfff060, 6, 320);
  }

  private explode(x: number, y: number): void {
    this.flames(x, y, 24);
    this.ring(x, y, 0xff7a20, 7, 360);
    this.ring(x, y, 0xffe060, 4, 260);
  }

  private shatter(x: number, y: number): void {
    this.shards(x, y, 22, 0xc8f0ff);
    this.ring(x, y, 0xffffff, 6, 300);
  }
}
