// バックパックの描画（配置画面・ラン・カカシで共用）
// レイヤー: マス → アイコン（出口矢印・レアリティ枠つき）→ 連鎖の線 → 光 → 段数・倍率・起点番号
import Phaser from 'phaser';
import type { ChainPreview } from '../core/chain';
import type { ItemInstance, Loadout } from '../core/types';
import { getItemDef } from '../data/items';
import { ItemIcon } from './itemIcon';
import { SKIN } from './kit/skin';
import { panel } from './kit/widgets';
import { CELL_SIZE, COLORS, W, textStyle } from './theme';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

export function originLabel(index: number): string {
  return CIRCLED[index] ?? `${index + 1}`;
}

export class BackpackView extends Phaser.GameObjects.Container {
  readonly cell = CELL_SIZE;
  private loadout: Loadout;
  private items: ReadonlyMap<string, ItemInstance>;
  private readonly cellLayer: Phaser.GameObjects.Container;
  private cellImgs: Phaser.GameObjects.Image[] = [];
  private readonly iconLayer: Phaser.GameObjects.Container;
  private readonly lineG: Phaser.GameObjects.Graphics;
  private readonly glowG: Phaser.GameObjects.Graphics;
  private readonly labelLayer: Phaser.GameObjects.Container;
  private icons = new Map<number, ItemIcon>();
  private glows: { cell: number; color: number; until: number }[] = [];
  private blinkUid: string | null = null;
  private highlightCell = -1;

  constructor(
    scene: Phaser.Scene,
    top: number,
    loadout: Loadout,
    items: ReadonlyMap<string, ItemInstance>,
  ) {
    super(scene, 0, top);
    this.loadout = loadout;
    this.items = items;
    this.cellLayer = scene.add.container(0, 0);
    this.iconLayer = scene.add.container(0, 0);
    this.lineG = scene.add.graphics();
    this.glowG = scene.add.graphics();
    this.labelLayer = scene.add.container(0, 0);
    this.add([this.cellLayer, this.iconLayer, this.lineG, this.glowG, this.labelLayer]);
    scene.add.existing(this);
    this.rebuild();
  }

  get left(): number {
    return Math.round((W - this.loadout.width * this.cell) / 2);
  }

  get gridHeight(): number {
    return this.loadout.height * this.cell;
  }

  setLoadout(loadout: Loadout, items: ReadonlyMap<string, ItemInstance>): void {
    this.loadout = loadout;
    this.items = items;
    this.rebuild();
  }

  /** マス中心（このコンテナ内の座標） */
  cellCenter(i: number): { x: number; y: number } {
    const x = i % this.loadout.width;
    const y = Math.floor(i / this.loadout.width);
    return { x: this.left + x * this.cell + this.cell / 2, y: y * this.cell + this.cell / 2 };
  }

  /** 画面座標からマス番号（外なら -1） */
  cellAt(worldX: number, worldY: number): number {
    const lx = worldX - this.x - this.left;
    const ly = worldY - this.y;
    if (lx < 0 || ly < 0) return -1;
    const cx = Math.floor(lx / this.cell);
    const cy = Math.floor(ly / this.cell);
    if (cx >= this.loadout.width || cy >= this.loadout.height) return -1;
    return cy * this.loadout.width + cx;
  }

  iconAt(cell: number): ItemIcon | undefined {
    return this.icons.get(cell);
  }

  /** 額縁の外寸（グリッド＋余白） */
  static readonly FRAME_PAD = 22;

  private rebuild(): void {
    this.cellLayer.removeAll(true);
    const pad = BackpackView.FRAME_PAD;
    const gw = this.loadout.width * this.cell;
    const gh = this.loadout.height * this.cell;
    this.cellLayer.add(panel(this.scene, W / 2, gh / 2, gw + pad * 2, gh + pad * 2, 'panel'));
    this.cellImgs = [];
    for (let i = 0; i < this.loadout.cells.length; i++) {
      const c = this.cellCenter(i);
      const img = this.scene.add
        .image(c.x, c.y, SKIN.cellEmpty)
        .setDisplaySize(this.cell - 2, this.cell - 2);
      this.cellImgs.push(img);
      this.cellLayer.add(img);
    }
    this.highlightCell = -1;
    this.iconLayer.removeAll(true);
    this.icons.clear();
    this.loadout.cells.forEach((uid, i) => {
      if (!uid) return;
      const it = this.items.get(uid);
      if (!it) return;
      const c = this.cellCenter(i);
      const icon = new ItemIcon(this.scene, c.x, c.y, it, this.cell);
      this.iconLayer.add(icon);
      this.icons.set(i, icon);
    });
    this.lineG.clear();
    this.labelLayer.removeAll(true);
    this.drawOriginBadges();
  }

  setHighlightCell(i: number): void {
    if (i === this.highlightCell) return;
    this.cellImgs[this.highlightCell]?.clearTint();
    this.highlightCell = i;
    this.cellImgs[i]?.setTint(0x80ffff);
  }

  private drawOriginBadges(): void {
    this.loadout.originOrder.forEach((uid, idx) => {
      const cell = this.loadout.cells.indexOf(uid);
      if (cell < 0) return;
      const c = this.cellCenter(cell);
      // 起点の発火順: 金の丸バッジ
      const bx = c.x - this.cell / 2 + 16;
      const by = c.y - this.cell / 2 + 16;
      this.labelLayer.add(this.scene.add.circle(bx, by, 15, 0xffd25a).setStrokeStyle(3, 0x5c3608));
      this.labelLayer.add(
        this.scene.add
          .text(bx, by, `${idx + 1}`, textStyle(20, '#3a2410', true))
          .setOrigin(0.5)
          .setStroke('#fff6d0', 3)
          .setShadow(0, 0, '#000', 0),
      );
    });
  }

  /** 配置画面のプレビュー: 連鎖の通り道を線で、各マスの段数と倍率、届かない装備はグレー */
  showPreview(p: ChainPreview): void {
    this.lineG.clear();
    this.labelLayer.removeAll(true);
    this.drawOriginBadges();
    for (const [cell, icon] of this.icons) icon.setDimmed(p.unreachable.has(cell));
    const colors = [0xfff080, 0x80e0ff, 0xff90c0, 0xa0ff90, 0xffb060];
    p.plans.forEach((plan, pi) => {
      const color = colors[pi % colors.length]!;
      this.lineG.lineStyle(4, color, 0.85);
      for (const s of plan.steps) {
        if (s.parentIndex < 0) continue;
        const a = this.cellCenter(plan.steps[s.parentIndex]!.cell);
        const b = this.cellCenter(s.cell);
        this.lineG.lineBetween(a.x, a.y, b.x, b.y);
        this.lineG.fillStyle(color, 1);
        this.lineG.fillCircle(b.x, b.y, 5);
      }
      for (const s of plan.steps) {
        if (s.step === null) continue;
        const c = this.cellCenter(s.cell);
        const t = this.scene.add
          .text(
            c.x + this.cell / 2 - 4,
            c.y + this.cell / 2 - 2,
            `${s.step}段 ×${s.mult.toFixed(2)}`,
            textStyle(13, '#fff4a0'),
          )
          .setOrigin(1, 1);
        this.labelLayer.add(t);
      }
    });
  }

  clearPreview(): void {
    this.lineG.clear();
    this.labelLayer.removeAll(true);
    this.drawOriginBadges();
    for (const icon of this.icons.values()) icon.setDimmed(false);
  }

  /** ラン: マスを光らせる（time は scene.time.now 基準のミリ秒） */
  glow(cell: number, color: number, now: number, ms: number): void {
    this.glows.push({ cell, color, until: now + ms });
  }

  /** ラン: マスからマスへ走る光の線 */
  flashLine(fromCell: number, toCell: number, color: number): void {
    const a = this.cellCenter(fromCell);
    const b = this.cellCenter(toCell);
    const line = this.scene.add
      .line(0, 0, a.x, a.y, b.x, b.y, color, 1)
      .setOrigin(0, 0)
      .setLineWidth(6);
    this.add(line);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 450,
      onComplete: () => line.destroy(),
    });
  }

  setBlinkOrigin(uid: string | null): void {
    this.blinkUid = uid;
  }

  /** 毎フレーム呼ぶ（光と点滅） */
  tick(now: number): void {
    const g = this.glowG;
    g.clear();
    this.glows = this.glows.filter((gl) => gl.until > now);
    for (const gl of this.glows) {
      const c = this.cellCenter(gl.cell);
      const a = Math.min(1, (gl.until - now) / 300);
      g.lineStyle(6, gl.color, a);
      g.strokeRect(c.x - this.cell / 2 + 3, c.y - this.cell / 2 + 3, this.cell - 6, this.cell - 6);
      g.fillStyle(gl.color, a * 0.25);
      g.fillRect(c.x - this.cell / 2 + 3, c.y - this.cell / 2 + 3, this.cell - 6, this.cell - 6);
    }
    if (this.blinkUid) {
      const cell = this.loadout.cells.indexOf(this.blinkUid);
      if (cell >= 0 && Math.floor(now / 300) % 2 === 0) {
        const c = this.cellCenter(cell);
        g.lineStyle(4, COLORS.accent, 1);
        g.strokeRect(
          c.x - this.cell / 2 + 1,
          c.y - this.cell / 2 + 1,
          this.cell - 2,
          this.cell - 2,
        );
      }
    }
  }

  /** 防御装備のマス（連鎖終了時の光の粒の出どころ） */
  isDefenseCell(cell: number): boolean {
    const uid = this.loadout.cells[cell];
    const it = uid ? this.items.get(uid) : undefined;
    return !!it && getItemDef(it.defId).kind === 'defense';
  }
}
