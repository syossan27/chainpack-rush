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
  rainbow: boolean; // 10段以上: 色が虹色に巡る
  /** 'arc': 弧を描いて飛び、地面で弾む（ダメージ）。'float': ふわっと上へ（文字） */
  mode: 'arc' | 'float';
  vx: number;
  floor: number;
  bounces: number;
  spin: number;
  squash: number; // 着地のつぶれ（時間で戻る）
}

/** ダメージ数字の重力（px/秒²） */
const NUMBER_GRAVITY = 1500;

/** 連鎖の段数ごとの数字の飾り（0: 1〜2段、1: 3〜4段、2: 5〜6段、3: 7〜9段、4: 10段以上） */
const STEP_TIERS: {
  scale: number;
  stroke: string;
  strokeWidth: number;
  color?: string;
  glow?: string;
  punch: number;
}[] = [
  { scale: 1, stroke: '#1a1424', strokeWidth: 6, punch: 0 },
  { scale: 1.1, stroke: '#3a2410', strokeWidth: 7, color: '#fff2a0', punch: 0.1 },
  { scale: 1.25, stroke: '#5a2a00', strokeWidth: 8, color: '#ffc84a', glow: '#ff9a20', punch: 0.2 },
  { scale: 1.4, stroke: '#4a0a10', strokeWidth: 9, color: '#ff7a3a', glow: '#ff3a3a', punch: 0.3 },
  { scale: 1.6, stroke: '#2a0a3a', strokeWidth: 10, glow: '#ffffff', punch: 0.45 },
];

export function stepTier(step: number): number {
  return step >= 10 ? 4 : step >= 7 ? 3 : step >= 5 ? 2 : step >= 3 ? 1 : 0;
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
  /** 次に飛ばす向き（左右交互） */
  private side = 1;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < UI.maxDamageNumbers; i++) {
      const text = scene.add
        .text(0, 0, '', textStyle(24))
        .setOrigin(0.5)
        .setDepth(depth)
        .setVisible(false);
      this.slots.push({
        text,
        life: 0,
        age: 0,
        vy: 0,
        punch: 0,
        rainbow: false,
        mode: 'float',
        vx: 0,
        floor: 0,
        bounces: 0,
        spin: 0,
        squash: 0,
      });
    }
  }

  /**
   * ダメージ数字: 出た瞬間に弾けるように大きくなり、左右へ弧を描いて飛び出し、地面で弾んで消える。
   * 大きいほど・段が深いほど高く遠くへ飛び、回転する。左右は交互にして積み重ならないようにする。
   * floorY: 弾む地面の高さ（省略時は出た位置の少し下）
   */
  show(
    x: number,
    y: number,
    value: number,
    color?: string,
    crit = false,
    step = 0,
    floorY?: number,
  ): void {
    const s = this.slots[this.next]!;
    this.next = (this.next + 1) % this.slots.length;
    // 連鎖の段数が深いほど、数字が大きく・色も豪華に（3段・5段・7段・10段で段階）
    const tier = stepTier(step);
    const size = Math.round(
      Math.min(
        100,
        (22 + Math.log10(Math.max(1, value)) * 15) * (crit ? 1.25 : 1) * STEP_TIERS[tier]!.scale,
      ),
    );
    const big = crit || value >= JUICE.bigHit || tier >= 2;
    const st = STEP_TIERS[tier]!;
    s.rainbow = tier === STEP_TIERS.length - 1 && !color;
    s.text
      .setText(crit ? `会心 ${Math.round(value)}` : `${Math.round(value)}`)
      .setFontSize(size)
      .setStroke(st.stroke, st.strokeWidth)
      .setShadow(0, 0, st.glow ?? '#000000', st.glow ? 12 : 0, true, true)
      .setColor(color ?? (crit ? '#ff7ad0' : (st.color ?? damageColor(value))))
      .setPosition(x + (Math.random() - 0.5) * 20, y)
      .setAngle(0)
      .setAlpha(1)
      .setVisible(true);
    this.side = -this.side;
    const power = (big ? 1.25 : 1) + tier * 0.12 + (crit ? 0.25 : 0);
    s.mode = 'arc';
    s.vx = this.side * (70 + Math.random() * 90) * power;
    s.vy = -(330 + Math.random() * 90) * power;
    s.floor = floorY ?? y + 90;
    s.bounces = 0;
    s.spin = big ? this.side * (30 + Math.random() * 40) : 0;
    s.squash = 0;
    s.life = big ? 1.25 : 1.0;
    s.age = 0;
    s.punch = crit || value >= JUICE.hugeHit ? 1.2 : big ? 0.9 : 0.55;
    s.punch += st.punch;
  }

  showText(x: number, y: number, label: string, size: number, color: string): void {
    const s = this.slots[this.next]!;
    this.next = (this.next + 1) % this.slots.length;
    s.rainbow = false;
    s.mode = 'float';
    s.spin = 0;
    s.squash = 0;
    s.text
      .setStroke('#1a1424', 6)
      .setAngle(0)
      .setShadow(0, 0, '#000000', 0)
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
      if (s.mode === 'arc') {
        // 放物線。地面で2回まで弾む（弾むたびに弱く）
        s.vy += NUMBER_GRAVITY * dt;
        s.text.x += s.vx * dt;
        s.text.y += s.vy * dt;
        if (s.text.y > s.floor && s.vy > 0) {
          s.text.y = s.floor;
          if (s.bounces < 2) {
            s.vy = -s.vy * 0.42;
            s.vx *= 0.6;
            s.spin *= 0.4;
            s.squash = 1;
            s.bounces++;
          } else {
            s.vy = 0;
            s.vx = 0;
            s.spin = 0;
          }
        }
        s.text.angle += s.spin * dt;
        // 弾んだら傾きを戻して、読みやすい向きに落ち着かせる
        if (s.bounces >= 1) s.text.angle *= 0.8;
        s.squash = Math.max(0, s.squash - dt * 8);
        // 出た瞬間: 大きく弾けて、ぷるんと揺れながら戻る
        const pop = 1 + s.punch * Math.exp(-s.age * 9) * Math.cos(s.age * 26);
        s.text.setScale(pop * (1 + s.squash * 0.25), pop * (1 - s.squash * 0.3));
      } else {
        s.text.y += s.vy * dt;
        s.text.setScale(1 + s.punch * Math.max(0, 1 - s.age / 0.14));
      }
      s.text.setAlpha(Math.min(1, s.life / 0.3));
      if (s.rainbow) {
        const c = Phaser.Display.Color.HSVToRGB((s.age * 1.5) % 1, 0.55, 1) as Phaser.Display.Color;
        s.text.setColor(`#${c.color.toString(16).padStart(6, '0')}`);
      }
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
