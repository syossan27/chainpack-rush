// 倉庫の一覧（スクロール、種類・レアリティで絞り込み、タップ・長押し・ドラッグ）
import Phaser from 'phaser';
import type { ItemInstance, ItemKind, Rarity } from '../core/types';
import { RARITIES } from '../core/types';
import { getItemDef, RARITY_NAMES } from '../data/items';
import { ItemIcon } from './itemIcon';
import { COLORS, W, textStyle } from './theme';

export interface ItemListHandlers {
  onTap?: (it: ItemInstance) => void;
  onLongPress?: (it: ItemInstance) => void;
  /** 一覧から外へドラッグを始めたとき（配置画面） */
  onDragStart?: (it: ItemInstance, pointer: Phaser.Input.Pointer) => void;
}

export type KindFilter = ItemKind | 'all';
export type RarityFilter = Rarity | 'all';

const KIND_LABEL: Record<KindFilter, string> = {
  all: '全部',
  origin: '起点',
  attack: '攻撃',
  defense: '防御',
  consumable: '消耗品',
};

const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD = 14;
const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export class ItemList extends Phaser.GameObjects.Container {
  private items: ItemInstance[] = [];
  private kind: KindFilter = 'all';
  private rarity: RarityFilter = 'all';
  private readonly content: Phaser.GameObjects.Container;
  private readonly filterBar: Phaser.GameObjects.Container;
  private scrollY = 0;
  private contentHeight = 0;
  private readonly viewTop: number;
  private readonly viewHeight: number;
  private readonly cellSize = 96;
  private readonly cols: number;
  private selectedUid: string | null = null;
  private readonly handlers: ItemListHandlers;
  private readonly emptyText: Phaser.GameObjects.Text;
  private readonly marks: (it: ItemInstance) => string | null;

  constructor(
    scene: Phaser.Scene,
    top: number,
    bottom: number,
    handlers: ItemListHandlers,
    marks: (it: ItemInstance) => string | null = () => null,
  ) {
    super(scene, 0, 0);
    this.handlers = handlers;
    this.marks = marks;
    this.filterBar = scene.add.container(0, top);
    this.viewTop = top + 100;
    this.viewHeight = bottom - this.viewTop;
    this.cols = Math.floor((W - 24) / this.cellSize);
    const bg = scene.add
      .rectangle(W / 2, this.viewTop + this.viewHeight / 2, W - 12, this.viewHeight, COLORS.panel)
      .setStrokeStyle(2, COLORS.panelEdge);
    this.content = scene.add.container(0, this.viewTop);
    const maskShape = scene.make.graphics({}, false);
    maskShape.fillRect(0, this.viewTop, W, this.viewHeight);
    this.content.setMask(maskShape.createGeometryMask());
    this.emptyText = scene.add
      .text(
        W / 2,
        this.viewTop + this.viewHeight / 2,
        '倉庫は空です',
        textStyle(24, COLORS.textDim),
      )
      .setOrigin(0.5);
    this.add([bg, this.content, this.filterBar, this.emptyText]);
    scene.add.existing(this);
    this.buildFilters();
    this.setupScroll(bg);
  }

  setItems(items: ItemInstance[]): void {
    this.items = items;
    this.render();
  }

  setSelected(uid: string | null): void {
    this.selectedUid = uid;
    this.render();
  }

  private buildFilters(): void {
    this.filterBar.removeAll(true);
    const kinds: KindFilter[] = ['all', 'origin', 'attack', 'defense', 'consumable'];
    kinds.forEach((k, i) => {
      const on = this.kind === k;
      const b = this.scene.add
        .text(
          20 + i * 136,
          8,
          KIND_LABEL[k],
          textStyle(24, on ? COLORS.accentText : COLORS.textDim),
        )
        .setInteractive({ useHandCursor: true });
      b.on('pointerup', () => {
        this.kind = k;
        this.scrollY = 0;
        this.buildFilters();
        this.render();
      });
      this.filterBar.add(b);
    });
    const rs: RarityFilter[] = ['all', ...RARITIES];
    rs.forEach((r, i) => {
      const on = this.rarity === r;
      const label = r === 'all' ? '全部' : RARITY_NAMES[r]!;
      const b = this.scene.add
        .text(20 + i * 136, 52, label, textStyle(22, on ? COLORS.accentText : COLORS.textDim))
        .setInteractive({ useHandCursor: true });
      b.on('pointerup', () => {
        this.rarity = r;
        this.scrollY = 0;
        this.buildFilters();
        this.render();
      });
      this.filterBar.add(b);
    });
  }

  private filtered(): ItemInstance[] {
    return this.items
      .filter((it) => {
        const def = getItemDef(it.defId);
        if (this.kind !== 'all' && def.kind !== this.kind) return false;
        if (this.rarity !== 'all' && it.rarity !== this.rarity) return false;
        return true;
      })
      .sort(
        (a, b) =>
          RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
          a.defId.localeCompare(b.defId) ||
          a.uid.localeCompare(b.uid),
      );
  }

  private render(): void {
    this.content.removeAll(true);
    const list = this.filtered();
    const left = (W - this.cols * this.cellSize) / 2;
    list.forEach((it, i) => {
      const cx = left + (i % this.cols) * this.cellSize + this.cellSize / 2;
      const cy = Math.floor(i / this.cols) * this.cellSize + this.cellSize / 2 + 6;
      const icon = new ItemIcon(this.scene, cx, cy, it, this.cellSize - 6);
      this.content.add(icon);
      if (it.uid === this.selectedUid) {
        this.content.add(
          this.scene.add
            .rectangle(cx, cy, this.cellSize - 2, this.cellSize - 2)
            .setStrokeStyle(4, COLORS.accent),
        );
      }
      const mark = this.marks(it);
      if (mark)
        this.content.add(
          this.scene.add.text(cx + 40, cy + 40, mark, textStyle(16, COLORS.gold)).setOrigin(1, 1),
        );
    });
    this.contentHeight = Math.ceil(list.length / this.cols) * this.cellSize + 12;
    this.emptyText.setVisible(list.length === 0);
    this.clampScroll();
  }

  private clampScroll(): void {
    const max = Math.max(0, this.contentHeight - this.viewHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, max);
    this.content.y = this.viewTop - this.scrollY;
  }

  private itemAt(x: number, y: number): ItemInstance | null {
    const list = this.filtered();
    const left = (W - this.cols * this.cellSize) / 2;
    const lx = x - left;
    const ly = y - this.viewTop + this.scrollY - 6;
    if (lx < 0 || ly < 0 || y < this.viewTop || y > this.viewTop + this.viewHeight) return null;
    const col = Math.floor(lx / this.cellSize);
    if (col >= this.cols) return null;
    const idx = Math.floor(ly / this.cellSize) * this.cols + col;
    return list[idx] ?? null;
  }

  private setupScroll(bg: Phaser.GameObjects.Rectangle): void {
    bg.setInteractive();
    let start: { x: number; y: number; scroll: number; time: number } | null = null;
    let mode: 'pending' | 'scroll' | 'drag' | 'done' = 'done';
    let pressed: ItemInstance | null = null;
    let timer: Phaser.Time.TimerEvent | null = null;

    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      start = { x: p.x, y: p.y, scroll: this.scrollY, time: p.downTime };
      mode = 'pending';
      pressed = this.itemAt(p.x, p.y);
      timer?.remove();
      if (pressed && this.handlers.onLongPress) {
        const it = pressed;
        timer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
          if (mode === 'pending') {
            mode = 'done';
            this.handlers.onLongPress?.(it);
          }
        });
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!start || !p.isDown || mode === 'done' || mode === 'drag') return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (mode === 'pending' && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        timer?.remove();
        const wantsDrag = pressed && this.handlers.onDragStart && Math.abs(dx) > Math.abs(dy);
        mode = wantsDrag ? 'drag' : 'scroll';
        if (mode === 'drag' && pressed) {
          this.handlers.onDragStart?.(pressed, p);
          return;
        }
      }
      if (mode === 'scroll') {
        // 一覧の上端より上へ指を出したら、押していたアイテムのドラッグに切り替える
        if (pressed && this.handlers.onDragStart && p.y < this.viewTop - 10) {
          mode = 'drag';
          this.handlers.onDragStart(pressed, p);
          return;
        }
        this.scrollY = start.scroll - dy;
        this.clampScroll();
      }
    });
    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      timer?.remove();
      if (
        mode === 'pending' &&
        start &&
        pressed &&
        Math.hypot(p.x - start.x, p.y - start.y) <= DRAG_THRESHOLD
      ) {
        this.handlers.onTap?.(pressed);
      }
      mode = 'done';
      start = null;
      pressed = null;
    });
  }
}
