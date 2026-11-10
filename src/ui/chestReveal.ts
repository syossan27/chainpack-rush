// 宝箱の開封演出（結果画面・合成で共用）。
// まず全部を閉じた宝箱で並べ、1つずつ開ける。レアリティが高いほど、開く前のため（揺れ・光）が長く、
// 開いたときの演出（粒・光の柱・画面の光と揺れ）が派手になる。アーティファクトは虹色。
import Phaser from 'phaser';
import type { ItemInstance, Rarity } from '../core/types';
import { getItemDef } from '../data/items';
import { sfx } from '../audio/sfx';
import { hapticMedium, hapticSuccess } from '../platform/haptics';
import { ItemIcon } from './itemIcon';
import { iconTex } from './kit/icons';
import { bindTap } from './kit/widgets';
import { rarityColor, rarityCss, textStyle } from './theme';

type Tier = Rarity | 'artifact';

/** レアリティごとの演出の強さ */
const TIER: Record<
  Tier,
  { hold: number; shake: number; particles: number; pillar: boolean; flash: boolean; quake: number }
> = {
  common: { hold: 0, shake: 0, particles: 6, pillar: false, flash: false, quake: 0 },
  rare: { hold: 180, shake: 2, particles: 14, pillar: false, flash: false, quake: 0 },
  epic: { hold: 420, shake: 4, particles: 26, pillar: true, flash: true, quake: 0.004 },
  legendary: { hold: 700, shake: 6, particles: 40, pillar: true, flash: true, quake: 0.008 },
  artifact: { hold: 1000, shake: 8, particles: 60, pillar: true, flash: true, quake: 0.012 },
};

export function tierOf(it: ItemInstance): Tier {
  return getItemDef(it.defId).artifact ? 'artifact' : it.rarity;
}

export interface ChestRevealOptions {
  /** i 番目の位置 */
  position: (i: number) => { x: number; y: number };
  iconSize: number;
  shake: boolean;
  /** 開き終わった装備のタップ（全部開いたあとだけ） */
  onTapItem?: (it: ItemInstance) => void;
  onDone?: () => void;
  /** 次の宝箱までの間（ミリ秒） */
  gap?: number;
  /** 自動売却した装備（開けたあと暗くして「売却」と出す） */
  sold?: ReadonlySet<string>;
  /** 先頭のこの数は、開けた状態ですぐ並べる（宝箱にしない） */
  preopened?: number;
  /** 広告のご褒美でもらった装備（緑の縁と、右上に「広告」の札） */
  bonus?: ReadonlySet<string>;
}

export class ChestReveal {
  private readonly chests: (Phaser.GameObjects.Image | null)[] = [];
  private next = 0;
  private busy = false;
  private fast = false;
  private done = false;
  readonly root: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: readonly ItemInstance[],
    private readonly opts: ChestRevealOptions,
  ) {
    this.root = scene.add.container(0, 0);
    const pre = Math.min(items.length, opts.preopened ?? 0);
    items.forEach((it, i) => {
      if (i < pre) {
        this.chests.push(null);
        this.showItem(i, it, false);
        return;
      }
      const p = opts.position(i);
      const t = tierOf(it);
      const chest = scene.add.image(p.x, p.y, iconTex('chest')).setScale(opts.iconSize / 20);
      // レア以上は宝箱の色で予告する
      if (t !== 'common') chest.setTint(t === 'artifact' ? 0xff8ce8 : rarityColor(it.rarity));
      chest.setAlpha(0);
      scene.tweens.add({ targets: chest, alpha: 1, duration: 160, delay: i * 30 });
      this.chests.push(chest);
      this.root.add(chest);
    });
  }

  get finished(): boolean {
    return this.done;
  }

  start(): void {
    this.scene.time.delayedCall(350, () => this.openNext());
  }

  /** 残りを一気に開ける（ためと大きな演出を省く） */
  fastForward(): void {
    this.fast = true;
    if (!this.busy) this.openNext();
  }

  private openNext(): void {
    const i = this.next;
    const it = this.items[i];
    if (!it) {
      if (!this.done) {
        this.done = true;
        this.opts.onDone?.();
      }
      return;
    }
    this.next++;
    const chest = this.chests[i];
    if (!chest) {
      // 開けた状態で並べてあるものは飛ばす
      this.openNext();
      return;
    }
    this.busy = true;
    const t = TIER[tierOf(it)];
    const hold = this.fast ? 0 : t.hold;
    if (hold > 0) {
      // ため: 宝箱が震えて、光がにじむ
      const glow = this.scene.add
        .image(chest.x, chest.y, 'sk_glow')
        .setScale(1.5)
        .setAlpha(0)
        .setTint(chest.tintTopLeft)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.root.addAt(glow, 0);
      this.scene.tweens.add({ targets: glow, alpha: 0.9, scale: 3, duration: hold });
      this.scene.tweens.add({
        targets: chest,
        x: { from: chest.x - t.shake, to: chest.x + t.shake },
        yoyo: true,
        repeat: Math.max(1, Math.floor(hold / 60)),
        duration: 30,
      });
      this.scene.time.delayedCall(hold, () => {
        glow.destroy();
        this.burst(i, it);
      });
    } else {
      this.burst(i, it);
    }
  }

  private burst(i: number, it: ItemInstance): void {
    const scene = this.scene;
    const chest = this.chests[i];
    const x = this.opts.position(i).x;
    const y = this.opts.position(i).y;
    chest?.destroy();
    const tier = tierOf(it);
    const t = TIER[tier];
    const color = tier === 'artifact' ? 0xff8ce8 : rarityColor(it.rarity);
    const big = !this.fast;

    // 粒
    const n = big ? t.particles : 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.3;
      const d = 40 + Math.random() * (60 + t.particles * 2);
      const c =
        tier === 'artifact'
          ? Phaser.Display.Color.HSVToRGB(k / n, 0.6, 1).color
          : k % 3 === 0
            ? 0xffffff
            : color;
      const p = scene.add.rectangle(x, y, 6, 6, c).setBlendMode(Phaser.BlendModes.ADD);
      this.root.add(p);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        angle: 180,
        duration: 500 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    // 後光（エピック以上は残る）
    if (t.pillar) {
      const halo = scene.add
        .image(x, y, 'sk_glow')
        .setScale(3)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.root.addAt(halo, 0);
      scene.tweens.add({
        targets: halo,
        angle: 360,
        scale: 3.4,
        yoyo: true,
        repeat: -1,
        duration: 1400,
      });
      if (tier === 'artifact') {
        let h = 0;
        const ev = scene.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
            h = (h + 0.02) % 1;
            if (halo.active) halo.setTint(Phaser.Display.Color.HSVToRGB(h, 0.6, 1).color);
            else ev.remove();
          },
        });
      }
    }
    if (big && t.pillar) {
      // 光の柱
      const pillar = scene.add
        .rectangle(
          x,
          y - 260,
          this.opts.iconSize * (tier === 'common' ? 0.6 : 0.9),
          640,
          color,
          0.55,
        )
        .setBlendMode(Phaser.BlendModes.ADD);
      this.root.add(pillar);
      scene.tweens.add({
        targets: pillar,
        alpha: 0,
        scaleX: tier === 'legendary' || tier === 'artifact' ? 2.4 : 1.6,
        duration: 1000,
        onComplete: () => pillar.destroy(),
      });
      // 広がる輪
      const ring = scene.add.circle(x, y, 20).setStrokeStyle(6, color, 1);
      this.root.add(ring);
      scene.tweens.add({
        targets: ring,
        scale: 8,
        alpha: 0,
        duration: 700,
        onComplete: () => ring.destroy(),
      });
    }
    if (big && this.opts.shake) {
      if (t.flash) {
        const c = Phaser.Display.Color.IntegerToColor(color);
        scene.cameras.main.flash(tier === 'epic' ? 140 : 260, c.red, c.green, c.blue);
      }
      if (t.quake > 0) scene.cameras.main.shake(tier === 'epic' ? 160 : 320, t.quake);
    }
    // 音と振動
    if (big) {
      if (tier === 'artifact' || tier === 'legendary') {
        sfx('openLegend');
        hapticSuccess();
      } else if (tier === 'epic') {
        sfx('openEpic');
        hapticMedium();
      } else sfx(tier === 'rare' ? 'openRare' : 'open');
    }
    this.showItem(i, it, big);
    const gap = this.fast ? 40 : (this.opts.gap ?? 300) + (t.pillar ? 250 : 0);
    scene.time.delayedCall(gap, () => {
      this.busy = false;
      this.openNext();
    });
  }

  /** 中身（装備のアイコン・名前・売却・ボーナスの札）。big なら弾けて出る */
  private showItem(i: number, it: ItemInstance, big: boolean): void {
    const scene = this.scene;
    const { x, y } = this.opts.position(i);
    const tier = tierOf(it);
    const icon = new ItemIcon(scene, x, y, it, this.opts.iconSize);
    this.root.add(icon);
    icon.setInteractive({ useHandCursor: true });
    bindTap(icon, () => {
      if (this.done) this.opts.onTapItem?.(it);
    });
    if (this.opts.sold?.has(it.uid)) {
      icon.setDimmed(true);
      const tag = scene.add
        .text(x, y, '売却', textStyle(22, '#ffe27a'))
        .setOrigin(0.5)
        .setAngle(-12);
      this.root.add(tag);
    }
    const name = scene.add
      .text(
        x,
        y + this.opts.iconSize / 2 + 2,
        getItemDef(it.defId).name,
        textStyle(16, tier === 'artifact' ? '#ff8ce8' : rarityCss(it.rarity)),
      )
      .setOrigin(0.5, 0);
    this.root.add(name);
    if (big) {
      icon.setScale(0.2);
      scene.tweens.add({
        targets: icon,
        scale: 1,
        duration: tier === 'common' ? 200 : 320,
        ease: 'Back.easeOut',
      });
      if (tier !== 'common') {
        const label = scene.add
          .text(
            x,
            y - this.opts.iconSize / 2 - 6,
            tier === 'artifact' ? 'ARTIFACT!' : `${it.rarity.toUpperCase()}!`,
            textStyle(
              tier === 'rare' ? 16 : 20,
              tier === 'artifact' ? '#ff8ce8' : rarityCss(it.rarity),
            ),
          )
          .setOrigin(0.5, 1);
        this.root.add(label);
        scene.tweens.add({
          targets: label,
          y: label.y - 24,
          alpha: 0,
          delay: 500,
          duration: 600,
          onComplete: () => label.destroy(),
        });
      }
    }
    // 広告のご褒美でもらった装備: 緑の縁と、右上の角に「広告」の札（上の出口の矢印にかからない位置）
    if (this.opts.bonus?.has(it.uid)) {
      const s = this.opts.iconSize;
      const ring = scene.add
        .rectangle(x, y, s - 2, s - 2)
        .setStrokeStyle(4, 0x6ee06a)
        .setFillStyle(0x6ee06a, 0.08);
      this.root.addAt(ring, 0);
      const tag = scene.add
        .text(x + s / 2 + 2, y - s / 2 + 4, '広告', {
          ...textStyle(15, '#ffffff'),
          stroke: '#1a5a1a',
          strokeThickness: 3,
          backgroundColor: '#3aa83a',
          padding: { x: 4, y: 1 },
        })
        .setOrigin(1, 0.5);
      this.root.add(tag);
    }
  }
}
