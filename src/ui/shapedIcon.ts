// Trial 「拾って組む」: a piece with a shape drawn on the board — a tile on each of its cells, the
// picture on its middle cell, and each arrow on the cell it leaves from (its port). The container
// sits at the middle of the piece's box, so it pops and tilts round its centre like an ItemIcon
import Phaser from 'phaser';
import { shapeOf, shapeOffsets, shapeSize } from '../core/shapes';
import type { Dir, ItemInstance } from '../core/types';
import { getItemDef } from '../data/items';
import { iconKey } from '../data/sprites';
import { itemTileKey } from './itemIcon';
import { SKIN, SLICE } from './kit/skin';

const STEP: Record<Dir, [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

export class ShapedIcon extends Phaser.GameObjects.Container {
  readonly item: ItemInstance;
  private readonly tiles: Phaser.GameObjects.NineSlice[] = [];
  private readonly img: Phaser.GameObjects.Image;

  /** x, y: the middle of the piece's box; cell: the board's cell size */
  constructor(scene: Phaser.Scene, x: number, y: number, item: ItemInstance, cell: number) {
    super(scene, x, y);
    this.item = item;
    const { w, h } = shapeSize(item.defId);
    const offs = shapeOffsets(item.defId);
    // Cell centres, relative to the box's middle
    const at = ([dx, dy]: [number, number]) => ({
      x: (dx - (w - 1) / 2) * cell,
      y: (dy - (h - 1) / 2) * cell,
    });
    const m = SLICE.tile;
    for (const o of offs) {
      const p = at(o);
      const tile = scene.add.nineslice(
        p.x,
        p.y,
        itemTileKey(item),
        undefined,
        cell,
        cell,
        m,
        m,
        m,
        m,
      );
      this.tiles.push(tile);
      this.add(tile);
    }
    // The piece's outline: every cell edge not shared with another of its cells
    if (offs.length > 1) {
      const has = (x: number, y: number) => offs.some(([ox, oy]) => ox === x && oy === y);
      const line = scene.add.graphics().lineStyle(3, 0xfff2c0, 0.9);
      const half = cell / 2 - 1;
      for (const o of offs) {
        const c = at(o);
        const [x, y] = o;
        if (!has(x, y - 1)) line.lineBetween(c.x - half, c.y - half, c.x + half, c.y - half);
        if (!has(x, y + 1)) line.lineBetween(c.x - half, c.y + half, c.x + half, c.y + half);
        if (!has(x - 1, y)) line.lineBetween(c.x - half, c.y - half, c.x - half, c.y + half);
        if (!has(x + 1, y)) line.lineBetween(c.x + half, c.y - half, c.x + half, c.y + half);
      }
      this.add(line);
    }
    // The picture on the cell nearest the box's middle
    const mid = offs
      .map(at)
      .reduce((best, p) => (Math.hypot(p.x, p.y) < Math.hypot(best.x, best.y) ? p : best));
    const scale = offs.length > 1 ? 3 : 2;
    this.img = scene.add.image(mid.x, mid.y, iconKey(getItemDef(item.defId).id)).setScale(scale);
    this.add(this.img);
    // Each arrow on the edge of its port cell
    const g = scene.add.graphics();
    const ports = shapeOf(item.defId).ports;
    for (const d of item.exits) {
      const c = at(offs[ports[d]]!);
      const [dx, dy] = STEP[d];
      const cx = c.x + dx * (cell / 2 - 5);
      const cy = c.y + dy * (cell / 2 - 5);
      const len = Math.max(8, cell * 0.14);
      const tip = { x: cx + dx * 4, y: cy + dy * 4 };
      const back = { x: cx - dx * len, y: cy - dy * len };
      const px = -dy * len * 0.7;
      const py = dx * len * 0.7;
      g.fillStyle(0x0c0a12, 1);
      g.fillTriangle(
        tip.x + dx * 2,
        tip.y + dy * 2,
        back.x + px * 1.25,
        back.y + py * 1.25,
        back.x - px * 1.25,
        back.y - py * 1.25,
      );
      g.fillStyle(0xfff080, 1);
      g.fillTriangle(tip.x, tip.y, back.x + px, back.y + py, back.x - px, back.y - py);
    }
    this.add(g);
    this.setSize(w * cell, h * cell);
    scene.add.existing(this);
  }

  setDimmed(d: boolean): this {
    this.img.setTint(d ? 0x555566 : 0xffffff);
    for (const t of this.tiles) t.setTexture(d ? SKIN.cellEmpty : itemTileKey(this.item));
    this.setAlpha(d ? 0.7 : 1);
    return this;
  }
}

/** A small drawing of a piece's shape (for the hand): one square per cell */
export function shapeMark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  defId: string,
  unit = 6,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  for (const [dx, dy] of shapeOffsets(defId)) {
    g.fillStyle(0x0c0a12, 1).fillRect(dx * unit - 1, dy * unit - 1, unit + 1, unit + 1);
    g.fillStyle(0xfff2c0, 1).fillRect(dx * unit, dy * unit, unit - 1, unit - 1);
  }
  return g;
}
