// 倉庫の一覧（スクロール、種類・レアリティで絞り込み、タップ・長押し・ドラッグ）
import { bindTap } from './kit/widgets';
import Phaser from 'phaser';
import type { ItemInstance, ItemKind, Rarity } from '../core/types';
import { RARITIES } from '../core/types';
import { getItemDef, RARITY_NAMES } from '../data/items';
import { k, t } from '../i18n';
import { ItemIcon } from './itemIcon';
import { SKIN, SLICE } from './kit/skin';
import { fitText, panel } from './kit/widgets';
import { sfx } from '../audio/sfx';
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
  all: k('全部'),
  origin: k('起点'),
  attack: k('攻撃'),
  defense: k('防御'),
  consumable: k('消耗品'),
};

const LONG_PRESS_MS = 450;
const FILTER_H = 58;
const HOLD_TO_DRAG_MS = 150; // これだけ押さえてから動かすとドラッグ（素早い払いはスクロール）
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
  private readonly cellSize = 100;
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
    this.viewTop = top + FILTER_H;
    this.viewHeight = bottom - this.viewTop;
    this.cols = Math.floor((W - 24) / this.cellSize);
    const bg = panel(
      scene,
      W / 2,
      this.viewTop + this.viewHeight / 2,
      W - 16,
      this.viewHeight + 8,
      'inset',
    );
    this.content = scene.add.container(0, this.viewTop);
    const maskShape = scene.make.graphics({}, false);
    maskShape.fillRect(0, this.viewTop, W, this.viewHeight);
    this.content.setMask(maskShape.createGeometryMask());
    this.emptyText = scene.add
      .text(
        W / 2,
        this.viewTop + this.viewHeight / 2,
        t('倉庫は空です'),
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
    const chip = (x: number, w: number, label: string, on: boolean, onTap: () => void) => {
      const m = SLICE.tab;
      const bg = this.scene.add
        .nineslice(x + w / 2, 24, on ? SKIN.tabOn : SKIN.tab, undefined, w, 46, m, m, 14, 14)
        .setInteractive({ useHandCursor: true });
      const text = fitText(
        this.scene.add
          .text(x + w / 2, 22, label, textStyle(20, on ? '#fff6d0' : COLORS.text))
          .setOrigin(0.5),
        w - 10,
      );
      bindTap(bg, () => {
        sfx('click');
        onTap();
      });
      this.filterBar.add([bg, text]);
    };
    const kinds: KindFilter[] = ['all', 'origin', 'attack', 'defense', 'consumable'];
    const cw = 100;
    kinds.forEach((kind, i) =>
      chip(12 + i * (cw + 4), cw, t(KIND_LABEL[kind]), this.kind === kind, () => {
        this.kind = kind;
        this.scrollY = 0;
        this.buildFilters();
        this.render();
      }),
    );
    // レアリティはタップで順に切り替え
    const rs: RarityFilter[] = ['all', ...RARITIES];
    const label =
      this.rarity === 'all'
        ? t('★全部')
        : t('★{rarity}', { rarity: t(RARITY_NAMES[this.rarity]!) });
    chip(12 + 5 * (cw + 4), W - 24 - 5 * (cw + 4), label, this.rarity !== 'all', () => {
      this.rarity = rs[(rs.indexOf(this.rarity) + 1) % rs.length]!;
      this.scrollY = 0;
      this.buildFilters();
      this.render();
    });
  }

  private filtered(): ItemInstance[] {
    return this.items
      .filter((it) => {
        const def = getItemDef(it.defId);
        if (this.kind !== 'all' && def.kind !== this.kind) return false;
        // 消耗品はレアリティを持たない（★の絞り込みには出さない）
        if (this.rarity !== 'all' && (it.rarity !== this.rarity || def.kind === 'consumable'))
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          // 消耗品は装備のあと（別枠）
          Number(getItemDef(a.defId).kind === 'consumable') -
            Number(getItemDef(b.defId).kind === 'consumable') ||
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
      if (mark) {
        const b = this.scene.add
          .rectangle(cx - 22, cy - 34, 48, 22, 0x0c0a12, 0.85)
          .setStrokeStyle(2, 0xffd25a);
        // The badge is 48px wide; a longer mark (translation, typed preset name) shrinks to fit
        const markText = fitText(
          this.scene.add.text(cx - 22, cy - 34, mark, textStyle(13, COLORS.gold)).setOrigin(0.5),
          56,
        );
        this.content.add([b, markText]);
      }
    });
    this.contentHeight = Math.ceil(list.length / this.cols) * this.cellSize + 12;
    this.emptyText.setVisible(list.length === 0);
    this.clampScroll();
  }

  /** The item shown first (top left) */
  firstUid(): string | null {
    return this.filtered()[0]?.uid ?? null;
  }

  /** Screen rect of an item's cell (null if filtered out or scrolled out of view). For guides */
  cellRect(uid: string): { x: number; y: number; w: number; h: number } | null {
    const i = this.filtered().findIndex((it) => it.uid === uid);
    if (i < 0) return null;
    const left = (W - this.cols * this.cellSize) / 2;
    const x = left + (i % this.cols) * this.cellSize + this.cellSize / 2;
    const y =
      this.viewTop -
      this.scrollY +
      Math.floor(i / this.cols) * this.cellSize +
      this.cellSize / 2 +
      6;
    const half = this.cellSize / 2;
    if (y - half < this.viewTop || y + half > this.viewTop + this.viewHeight) return null;
    return { x, y, w: this.cellSize, h: this.cellSize };
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

  private setupScroll(bg: Phaser.GameObjects.NineSlice): void {
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
        // 少し押さえてから動かした、または横へ動かした → ドラッグ。素早く縦に払った → スクロール
        // 押してからの時間は入力イベント自体の時刻で測る（フレームが遅くても判定がぶれない）
        const held = p.moveTime - start.time >= HOLD_TO_DRAG_MS;
        const wantsDrag =
          pressed && this.handlers.onDragStart && (held || Math.abs(dx) > Math.abs(dy));
        mode = wantsDrag ? 'drag' : 'scroll';
        if (mode === 'drag' && pressed) {
          this.handlers.onDragStart?.(pressed, p);
          return;
        }
      }
      if (mode === 'scroll') {
        // スクロールを始めたら、指が一覧の外へ出てもスクロールのまま（位置は戻さない）
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
