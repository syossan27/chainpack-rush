// 勇者のオーラ: 置いている装備の強さが見た目に出る（レア→青、エピック→紫、レジェンダリー→金、アーティファクト→虹）
import Phaser from 'phaser';
import type { AuraTier } from '../core/aura';

export { auraTier, type AuraTier } from '../core/aura';

const COLOR: Record<Exclude<AuraTier, 'none'>, number> = {
  rare: 0x4a8cff,
  epic: 0xb060ff,
  legendary: 0xffc634,
  artifact: 0xff8ce8,
};

/** 勇者の足元から立ちのぼるオーラ（後光・揺らめき・のぼる光の粒） */
export class HeroAura extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Image | null = null;
  private hue = 0;
  private readonly motes: Phaser.GameObjects.Rectangle[] = [];
  private readonly tier: AuraTier;
  private readonly heightPx: number;

  /** x, y: 足元。height: 勇者の見た目の高さ */
  constructor(scene: Phaser.Scene, x: number, y: number, tier: AuraTier, height: number) {
    super(scene, x, y);
    this.tier = tier;
    this.heightPx = height;
    scene.add.existing(this);
    if (tier === 'none') return;
    const color = COLOR[tier];
    this.glow = scene.add
      .image(0, -height * 0.45, 'sk_glow')
      .setScale(height / 60, height / 42)
      .setTint(color)
      .setAlpha(0.8);
    this.add(this.glow);
    // 足元の光の輪
    const ring = scene.add.ellipse(0, -2, height * 0.75, height * 0.16, color, 0.35);
    this.addAt(ring, 0);
    scene.tweens.add({ targets: ring, alpha: 0.12, yoyo: true, repeat: -1, duration: 900 });
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.45,
      scaleX: (height / 60) * 1.12,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
    // のぼる光の粒（エピック以上で多く）
    const n = tier === 'rare' ? 4 : tier === 'epic' ? 7 : 10;
    for (let i = 0; i < n; i++) {
      const m = scene.add.rectangle(0, 0, 6, 6, color).setStrokeStyle(1, 0xffffff, 0.8).setAlpha(0);
      this.add(m);
      this.motes.push(m);
      this.launch(m, i * 180);
    }
  }

  private launch(m: Phaser.GameObjects.Rectangle, delay: number): void {
    const w = this.heightPx * 0.5;
    m.setPosition((Math.random() - 0.5) * w, -4).setAlpha(0);
    this.scene.tweens.add({
      targets: m,
      y: -this.heightPx * (0.7 + Math.random() * 0.5),
      x: m.x + (Math.random() - 0.5) * 20,
      alpha: { from: 0.9, to: 0 },
      delay,
      duration: 900 + Math.random() * 500,
      onComplete: () => {
        if (m.active) this.launch(m, 0);
      },
    });
  }

  /** アーティファクト: 色が虹色に巡る（毎フレーム呼ぶ） */
  tick(dt: number): void {
    if (this.tier !== 'artifact' || !this.glow) return;
    this.hue = (this.hue + dt * 0.25) % 1;
    const c = (Phaser.Display.Color.HSVToRGB(this.hue, 0.6, 1) as Phaser.Display.Color).color;
    this.glow.setTint(c);
    for (const m of this.motes) m.setFillStyle(c);
  }
}
