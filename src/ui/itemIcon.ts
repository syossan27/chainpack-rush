// アイテムのアイコン（レアリティの枠色＋出口の矢印）
import Phaser from 'phaser';
import type { Dir, ItemInstance } from '../core/types';
import { getItemDef } from '../data/items';
import { ICON_SCALE, ICON_SIZE, iconKey } from '../data/sprites';
import { iconTex } from './kit/icons';
import { SKIN, SLICE, tileKey } from './kit/skin';

const ARROW: Record<Dir, { dx: number; dy: number; rot: number }> = {
  up: { dx: 0, dy: -1, rot: -Math.PI / 2 },
  right: { dx: 1, dy: 0, rot: 0 },
  down: { dx: 0, dy: 1, rot: Math.PI / 2 },
  left: { dx: -1, dy: 0, rot: Math.PI },
};

export class ItemIcon extends Phaser.GameObjects.Container {
  readonly item: ItemInstance;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly img: Phaser.GameObjects.Image;
  private readonly arrows: Phaser.GameObjects.Graphics;
  readonly size: number;

  constructor(scene: Phaser.Scene, x: number, y: number, item: ItemInstance, size: number) {
    super(scene, x, y);
    this.item = item;
    this.size = size;
    const def = getItemDef(item.defId);
    const m = SLICE.tile;
    this.frame = scene.add.nineslice(
      0,
      0,
      tileKey(item.rarity),
      undefined,
      size - 4,
      size - 4,
      m,
      m,
      m,
      m,
    );
    // 原画16×16を整数倍（基本×4 = 64px）で表示。小さい枠では×3/×2に落とす
    const scale = Math.max(2, Math.min(ICON_SCALE, Math.floor((size - 20) / ICON_SIZE)));
    this.img = scene.add.image(0, 0, iconKey(def.id)).setScale(scale);
    this.arrows = scene.add.graphics();
    this.drawArrows();
    this.add([this.frame, this.img, this.arrows]);
    // アーティファクト: 虹色にゆらめく縁取り
    if (def.artifact) {
      const ring = scene.add.graphics();
      const w = size - 4;
      let hue = 0;
      const draw = () => {
        ring.clear();
        const c = Phaser.Display.Color.HSVToRGB(hue, 0.6, 1) as Phaser.Display.Color;
        ring.lineStyle(Math.max(3, size * 0.05), c.color, 1);
        ring.strokeRoundedRect(-w / 2, -w / 2, w, w, 8);
      };
      draw();
      const ev = scene.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => {
          hue = (hue + 0.02) % 1;
          if (ring.active) draw();
        },
      });
      this.once('destroy', () => ev.remove());
      this.addAt(ring, 1);
    }
    // ロック中は右上に鍵
    if (item.locked) {
      const lock = scene.add
        .image(size / 2 - 12, -size / 2 + 12, iconTex('lock'))
        .setScale(Math.max(1.5, size / 60));
      this.add(lock);
    }
    // 追加効果の数を左下に小さな星で
    const n = item.affixes?.length ?? 0;
    if (n > 0) {
      const star = scene.add
        .text(-size / 2 + 8, size / 2 - 8, '✦'.repeat(n), {
          fontFamily: 'sans-serif',
          fontSize: `${Math.max(14, Math.round(size * 0.22))}px`,
          color: '#ffe27a',
          stroke: '#0c0a12',
          strokeThickness: 4,
        })
        .setOrigin(0, 1);
      this.add(star);
    }
    this.setSize(size, size);
    scene.add.existing(this);
  }

  drawArrows(): void {
    const g = this.arrows;
    g.clear();
    const r = this.size / 2 - 5;
    for (const d of this.item.exits) {
      const a = ARROW[d];
      const cx = a.dx * r;
      const cy = a.dy * r;
      const len = Math.max(8, this.size * 0.14);
      // 三角の矢印（外向き）
      const tip = { x: cx + a.dx * 4, y: cy + a.dy * 4 };
      const back = { x: cx - a.dx * len, y: cy - a.dy * len };
      const px = -a.dy * len * 0.7;
      const py = a.dx * len * 0.7;
      g.fillStyle(0x0c0a12, 1);
      g.fillTriangle(
        tip.x + a.dx * 2,
        tip.y + a.dy * 2,
        back.x + px * 1.25,
        back.y + py * 1.25,
        back.x - px * 1.25,
        back.y - py * 1.25,
      );
      g.fillStyle(0xfff080, 1);
      g.fillTriangle(tip.x, tip.y, back.x + px, back.y + py, back.x - px, back.y - py);
    }
  }

  setDimmed(d: boolean): this {
    this.img.setTint(d ? 0x555566 : 0xffffff);
    this.frame.setTexture(d ? SKIN.cellEmpty : tileKey(this.item.rarity));
    this.setAlpha(d ? 0.7 : 1);
    return this;
  }
}
