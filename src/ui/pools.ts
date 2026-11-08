// オブジェクトプール: ダメージ数字（最大50）とエフェクトの粒（最大200）。ラン中に new しない
import Phaser from 'phaser';
import { UI } from '../config/balance';
import { SKIN } from './kit/skin';
import { JUICE, textStyle } from './theme';

interface NumberSlot {
  text: Phaser.GameObjects.Text;
  life: number;
  age: number;
  vy: number;
  punch: number; // 出た瞬間の拡大率（ポンと跳ねる）
}

/** ダメージ量に応じた色 */
export function damageColor(value: number): string {
  let c: string = JUICE.damageTiers[0]!.color;
  for (const t of JUICE.damageTiers) if (value >= t.min) c = t.color;
  return c;
}

export class DamageNumbers {
  private readonly slots: NumberSlot[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < UI.maxDamageNumbers; i++) {
      const text = scene.add
        .text(0, 0, '', textStyle(24))
        .setOrigin(0.5)
        .setDepth(depth)
        .setVisible(false);
      this.slots.push({ text, life: 0, age: 0, vy: 0, punch: 0 });
    }
  }

  /** ダメージが大きいほど文字を大きく、色も白→金→朱へ。出た瞬間にポンと跳ねる */
  show(x: number, y: number, value: number, color?: string, crit = false): void {
    const s = this.slots[this.next]!;
    this.next = (this.next + 1) % this.slots.length;
    const size = Math.round(
      Math.min(84, (22 + Math.log10(Math.max(1, value)) * 15) * (crit ? 1.25 : 1)),
    );
    const big = crit || value >= JUICE.bigHit;
    s.text
      .setText(crit ? `会心 ${Math.round(value)}` : `${Math.round(value)}`)
      .setFontSize(size)
      .setColor(color ?? (crit ? '#ff7ad0' : damageColor(value)))
      .setPosition(x + (Math.random() - 0.5) * 36, y - (big ? 20 : 0))
      .setAngle(big ? (Math.random() - 0.5) * 16 : 0)
      .setAlpha(1)
      .setVisible(true);
    s.life = big ? 1.0 : 0.8;
    s.age = 0;
    s.vy = big ? -50 : -80;
    s.punch = crit || value >= JUICE.hugeHit ? 1.0 : big ? 0.7 : 0.35;
  }

  showText(x: number, y: number, label: string, size: number, color: string): void {
    const s = this.slots[this.next]!;
    this.next = (this.next + 1) % this.slots.length;
    s.text
      .setText(label)
      .setFontSize(size)
      .setColor(color)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    s.life = 0.9;
    s.age = 0;
    s.vy = -40;
    s.punch = 0.4;
  }

  update(dt: number): void {
    for (const s of this.slots) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.age += dt;
      s.text.y += s.vy * dt;
      s.text.setScale(1 + s.punch * Math.max(0, 1 - s.age / 0.14));
      s.text.setAlpha(Math.min(1, s.life / 0.3));
      if (s.life <= 0) s.text.setVisible(false);
    }
  }

  activeCount(): number {
    return this.slots.filter((s) => s.life > 0).length;
  }
}

interface Particle {
  img: Phaser.GameObjects.Image;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  gravity: number;
  tx: number | null; // 吸い込まれる先
  ty: number | null;
}

interface Flash {
  img: Phaser.GameObjects.Image;
  life: number;
  maxLife: number;
  grow: number;
}

export class Effects {
  private readonly parts: Particle[] = [];
  private next = 0;
  private readonly flashes: Flash[] = [];
  private nextFlash = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < UI.maxEffects; i++) {
      const img = scene.add.image(0, 0, 'px').setDepth(depth).setVisible(false);
      this.parts.push({ img, life: 0, maxLife: 1, vx: 0, vy: 0, gravity: 0, tx: null, ty: null });
    }
    // 光（斬撃の閃光・着弾の光）は加算合成の別プール
    for (let i = 0; i < JUICE.maxFlashes; i++) {
      const img = scene.add
        .image(0, 0, SKIN.glow)
        .setDepth(depth + 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      this.flashes.push({ img, life: 0, maxLife: 1, grow: 0 });
    }
  }

  /** 着弾の光（丸く広がって消える） */
  flash(x: number, y: number, color: number, scale: number, life = 0.18): void {
    const f = this.flashes[this.nextFlash]!;
    this.nextFlash = (this.nextFlash + 1) % this.flashes.length;
    f.img.setPosition(x, y).setTint(color).setScale(scale).setAngle(0).setAlpha(1).setVisible(true);
    f.life = f.maxLife = life;
    f.grow = scale * 1.5;
  }

  /** 斬撃の閃光（細長い光が斜めに走る） */
  slash(x: number, y: number, color: number, size = 1): void {
    const f = this.flashes[this.nextFlash]!;
    this.nextFlash = (this.nextFlash + 1) % this.flashes.length;
    f.img
      .setPosition(x, y)
      .setTint(color)
      .setScale(3.2 * size, 0.35 * size)
      .setAngle(-35 + (Math.random() - 0.5) * 40)
      .setAlpha(1)
      .setVisible(true);
    f.life = f.maxLife = 0.14;
    f.grow = 0;
  }

  /** コインが (tx, ty)（戦利品の表示）へ飛んでいく */
  coins(x: number, y: number, tx: number, ty: number, count: number): void {
    this.absorb(x, y, tx, ty, 0xffffff, count, 'ic_coin', 1.6);
  }

  private take(): Particle {
    const p = this.parts[this.next]!;
    this.next = (this.next + 1) % this.parts.length;
    return p;
  }

  burst(x: number, y: number, color: number, count: number, speed = 220): void {
    for (let i = 0; i < count; i++) {
      const p = this.take();
      p.img.setTexture('px');
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      p.img
        .setPosition(x, y)
        .setTint(color)
        .setScale(2 + Math.random() * 2)
        .setAlpha(1)
        .setVisible(true);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - speed * 0.3;
      p.gravity = 600;
      p.life = p.maxLife = 0.5 + Math.random() * 0.3;
      p.tx = p.ty = null;
    }
  }

  /** 光の粒が (tx, ty) へ吸い込まれる */
  absorb(
    x: number,
    y: number,
    tx: number,
    ty: number,
    color: number,
    count: number,
    texture = 'px',
    scale = 3,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.take();
      p.img
        .setTexture(texture)
        .setPosition(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40)
        .setTint(color)
        .setScale(scale)
        .setAlpha(1)
        .setVisible(true);
      p.life = p.maxLife = 0.6 + i * 0.03;
      p.tx = tx;
      p.ty = ty;
      p.vx = p.vy = p.gravity = 0;
    }
  }

  update(dt: number): void {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.tx !== null && p.ty !== null) {
        const k = 1 - p.life / p.maxLife;
        p.img.x += (p.tx - p.img.x) * Math.min(1, k * 0.35 + 0.05);
        p.img.y += (p.ty - p.img.y) * Math.min(1, k * 0.35 + 0.05);
      } else {
        p.vy += p.gravity * dt;
        p.img.x += p.vx * dt;
        p.img.y += p.vy * dt;
      }
      p.img.setAlpha(Math.min(1, p.life / 0.2));
      if (p.life <= 0) p.img.setVisible(false);
    }
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= dt;
      const k = Math.max(0, f.life / f.maxLife);
      f.img.setAlpha(k);
      if (f.grow > 0) f.img.setScale(f.img.scaleX + f.grow * dt * 6);
      if (f.life <= 0) f.img.setVisible(false);
    }
  }

  activeCount(): number {
    return this.parts.filter((p) => p.life > 0).length;
  }
}
