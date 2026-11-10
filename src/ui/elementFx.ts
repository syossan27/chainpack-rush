// 属性ごとの攻撃エフェクト（雷は稲妻、炎は火柱と火の粉、氷は結晶、打撃は衝撃波、水はしぶき、油は黒いしずく）。
// コンボ（感電・爆発・粉砕）はさらに大きく。描画だけで、core には何も書き戻さない。
import Phaser from 'phaser';
import type { Element } from '../core/types';

/** 同時に出しすぎないための上限（100ミリ秒あたり） */
const BUDGET = 10;

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
      default:
        break;
    }
  }

  /** 必殺技の一撃: 属性の演出を特大で（予算に関係なく出す） */
  special(x: number, y: number, element: Element | undefined): void {
    switch (element) {
      case 'fire':
        this.explode(x, y);
        this.flames(x, y, 30);
        break;
      case 'thunder':
        this.shock(x, y);
        this.bolt(x, y, 2.4);
        break;
      case 'ice':
        this.shatter(x, y);
        this.shards(x, y, 18, 0x9adfff);
        break;
      default:
        this.shockwave(x, 2.4);
        this.ring(x, y, 0xffffff, 8, 360);
        this.ring(x, y, 0xffe060, 5, 280);
        break;
    }
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

  // ---- コンボ ----

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
