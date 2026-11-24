// Trial 「拾って組む」 on the run screen: the hand (2 slots left and 2 right of the board, 6 below
// it), the trash under it, dragging pieces onto the board while the fight goes on, and the calm
// arrange time (before setting out and after each boss)
import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { BUILD_RUN } from '../config/balance';
import { addToHand, startHand, type Hand } from '../core/buildRun';
import type { Combat } from '../core/combat';
import { putShaped, shapeOf, takeShaped, type ShapeBlock } from '../core/shapes';
import type { ItemInstance, Loadout } from '../core/types';
import { getItemDef } from '../data/items';
import { k, t } from '../i18n';
import { BackpackView } from './backpackView';
import { ItemIcon } from './itemIcon';
import { Button, fitText, panel } from './kit/widgets';
import { COLORS, H, RUN_LAYOUT, W, textStyle } from './theme';

const SLOT = 56;
const DRAG_THRESHOLD = 12;
/** The ghost floats above the finger, and the drop point is the ghost */
const LIFT = 40;
/** Each side of the board holds 2 columns × 3 rows; the rest is the row below the board */
const SIDE_COLS = 2;
const SIDE_ROWS = 3;
const SIDE = SIDE_COLS * SIDE_ROWS;
const BELOW = BUILD_RUN.handSize - SIDE * 2;

export interface BuildRunHost {
  scene: Phaser.Scene;
  view: BackpackView;
  combat: Combat;
  /** The run's loadout (the one Combat holds; edits land on it via Combat.applyLoadout) */
  loadout: Loadout;
  items: ReadonlyMap<string, ItemInstance>;
  /** The screen is stopped (paused, an item card open) or the run is over */
  halted: () => boolean;
  say: (text: string, color?: string) => void;
}

const BLOCK_TEXT: Record<ShapeBlock, string> = {
  space: k('そこには入らない'),
  origin: k('起点石は盤面に1つだけ'),
};

type Drag = {
  item: ItemInstance;
  /** A hand slot, or the board */
  from: number | 'board';
  ghost: ItemIcon | null;
  x: number;
  y: number;
};

export class BuildRunUi {
  private hand: Hand;
  /** The board as the player left it, not yet taken by Combat (it waits for the chain to end) */
  private draft: Loadout | null = null;
  private readonly handLayer: Phaser.GameObjects.Container;
  private readonly arrangeLayer: Phaser.GameObjects.Container;
  private readonly trash: Phaser.GameObjects.Container;
  private readonly trashRect: Phaser.Geom.Rectangle;
  private readonly goButton: Button;
  private drag: Drag | null = null;
  /** Where each hand slot sits */
  private readonly slots: { x: number; y: number }[];

  constructor(
    private readonly host: BuildRunHost,
    brought: ItemInstance[],
  ) {
    const { scene, view } = host;
    this.hand = startHand(brought);
    const top = RUN_LAYOUT.backpackTop;
    const pad = BackpackView.FRAME_PAD;
    // The side columns share the space between the screen edge and the board's frame
    const sideW = view.left - pad;
    const colX = (c: number) => (sideW / SIDE_COLS) * (c + 0.5);
    const belowY = top + view.gridHeight + pad + SLOT / 2 + 8;
    const step = (W - 40) / BELOW;
    const side = (mirror: boolean) =>
      Array.from({ length: SIDE }, (_, i) => {
        const x = colX(i % SIDE_COLS);
        return { x: mirror ? W - x : x, y: top + view.cell * (Math.floor(i / SIDE_COLS) + 0.5) };
      });
    this.slots = [
      ...side(false),
      ...side(true),
      ...Array.from({ length: BELOW }, (_, i) => ({ x: 20 + step * (i + 0.5), y: belowY })),
    ];
    this.handLayer = scene.add.container(0, 0).setDepth(70);
    // The trash: the band under the hand
    const trashTop = belowY + SLOT / 2 + 12;
    this.trashRect = new Phaser.Geom.Rectangle(30, trashTop, W - 60, H - 12 - trashTop);
    this.trash = scene.add.container(0, 0).setDepth(69);
    this.trash.add(
      scene.add
        .rectangle(
          W / 2,
          this.trashRect.centerY,
          this.trashRect.width,
          this.trashRect.height,
          0x2a0e12,
          0.8,
        )
        .setStrokeStyle(3, 0x7a3040),
    );
    this.trash.add(
      fitText(
        scene.add
          .text(
            W / 2,
            this.trashRect.centerY,
            t('ゴミ箱（ここへ運ぶと捨てる）'),
            textStyle(20, '#e0a0a8'),
          )
          .setOrigin(0.5),
        this.trashRect.width - 20,
      ),
    );
    // The arrange time sits in the middle band, left of the "next chain" panel
    this.arrangeLayer = scene.add.container(0, 0).setDepth(72);
    const midY = RUN_LAYOUT.middleTop + 86;
    this.arrangeLayer.add(panel(scene, 190, midY, 350, 150, 'inset'));
    this.arrangeLayer.add(
      fitText(
        scene.add.text(190, midY - 44, t('配置タイム'), textStyle(26, '#ffe27a')).setOrigin(0.5),
        320,
      ),
    );
    this.arrangeLayer.add(
      fitText(
        scene.add
          .text(
            190,
            midY - 10,
            t('手札から盤面へ。並べ替えもできる'),
            textStyle(16, COLORS.textDim),
          )
          .setOrigin(0.5),
        320,
      ),
    );
    this.goButton = new Button(scene, 190, midY + 36, t('出発'), () => this.setOff(), {
      width: 240,
      height: 60,
      fontSize: 26,
      skin: 'gold',
    });
    this.arrangeLayer.add(this.goButton);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
    });
    this.renderHand();
  }

  /** An enemy dropped gear: it takes an empty slot, and is lost when the hand is full */
  addDrop(item: ItemInstance): void {
    this.host.combat.adopt(item);
    const r = addToHand(this.hand, item);
    if (!r.kept) return;
    this.hand = r.hand;
    this.renderHand();
  }

  /** Every frame: hand the waiting board to Combat once the chain is over, and the arrange panel */
  update(): void {
    this.flush();
    const c = this.host.combat;
    const arranging = c.arranging && !c.ended;
    this.arrangeLayer.setVisible(arranging && !c.relicOffer);
    if (arranging) {
      this.goButton.label.setText(c.bossesDefeated === 0 ? t('出発') : t('再開'));
      this.goButton.setDisabled(!this.hasOrigin());
    }
  }

  private get board(): Loadout {
    return this.draft ?? this.host.loadout;
  }

  private hasOrigin(): boolean {
    return this.board.cells.some(
      (u) => !!u && getItemDef(this.host.items.get(u)!.defId).kind === 'origin',
    );
  }

  private flush(): void {
    if (this.draft && this.host.combat.applyLoadout(this.draft)) {
      this.draft = null;
      this.host.view.setLoadout(this.host.loadout, this.host.items);
    }
  }

  private setBoard(next: Loadout): void {
    this.draft = next;
    this.host.view.setLoadout(next, this.host.items);
    this.flush();
  }

  private setOff(): void {
    this.flush();
    if (!this.hasOrigin()) return;
    if (this.host.combat.resume()) sfx('click');
  }

  private renderHand(): void {
    const { scene } = this.host;
    this.handLayer.removeAll(true);
    this.slots.forEach(({ x, y }, i) => {
      this.handLayer.add(
        scene.add.circle(x, y, SLOT / 2, 0x0c0a12, 0.7).setStrokeStyle(3, 0x4a4460),
      );
      const it = this.hand[i];
      if (!it) return;
      this.handLayer.add(new ItemIcon(scene, x, y, it, SLOT - 6));
      // A piece bigger than a cell shows its size
      const { w, h } = shapeOf(it.defId);
      if (w * h > 1)
        this.handLayer.add(
          scene.add
            .text(x + SLOT / 2 - 2, y + SLOT / 2 - 2, `${w}×${h}`, textStyle(14, '#fff2c0'))
            .setOrigin(1, 1),
        );
    });
  }

  private slotAt(x: number, y: number): number {
    return this.slots.findIndex((s) => Math.hypot(x - s.x, y - s.y) <= SLOT / 2 + 6);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const c = this.host.combat;
    if (this.host.halted() || c.ended || c.relicOffer) return;
    const si = this.slotAt(p.x, p.y);
    const held = si >= 0 ? this.hand[si] : null;
    if (held) {
      this.drag = { item: held, from: si, ghost: null, x: p.x, y: p.y };
      return;
    }
    // The board's pieces move only in the arrange time (the fight never stops for them)
    if (!c.arranging) return;
    const cell = this.host.view.cellAt(p.x, p.y);
    const uid = cell >= 0 ? this.board.cells[cell] : null;
    const it = uid ? this.host.items.get(uid) : undefined;
    if (it) this.drag = { item: it, from: 'board', ghost: null, x: p.x, y: p.y };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost) {
      if (Math.hypot(p.x - d.x, p.y - d.y) < DRAG_THRESHOLD) return;
      // The ghost has the piece's size on the board
      const { w, h } = shapeOf(d.item.defId);
      const cell = this.host.view.cell;
      d.ghost = new ItemIcon(this.host.scene, p.x, p.y - LIFT, d.item, w * cell, h * cell);
      d.ghost.setDepth(500).setAlpha(0.85);
    }
    d.ghost.setPosition(p.x, p.y - LIFT);
    this.host.view.setHighlightCell(this.dropCell(d.item, p));
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    this.drag = null;
    if (!d?.ghost) return;
    d.ghost.destroy();
    this.host.view.setHighlightCell(-1);
    const x = p.x;
    const y = p.y - LIFT;
    const cell = this.dropCell(d.item, p);
    if (this.trashRect.contains(x, y)) this.discard(d);
    else if (this.slotAt(x, y) >= 0) this.toSlot(d, this.slotAt(x, y));
    else if (cell >= 0) this.toCell(d, cell);
  }

  /** The cell under the ghost's top-left cell (a shaped piece is placed from its top-left) */
  private dropCell(item: ItemInstance, p: Phaser.Input.Pointer): number {
    const { w, h } = shapeOf(item.defId);
    const cell = this.host.view.cell;
    return this.host.view.cellAt(p.x - ((w - 1) * cell) / 2, p.y - LIFT - ((h - 1) * cell) / 2);
  }

  private toCell(d: Drag, cell: number): void {
    const r = putShaped(this.board, this.host.items, d.item.uid, cell);
    if (r.block) {
      sfx('error');
      this.host.say(t(BLOCK_TEXT[r.block]), COLORS.textWarn);
      return;
    }
    if (r.loadout === this.board) return;
    sfx('click');
    if (d.from !== 'board') this.setSlot(d.from, null);
    this.setBoard(r.loadout);
  }

  /** Into a hand slot: from the hand the two swap; from the board only into an empty slot */
  private toSlot(d: Drag, slot: number): void {
    if (d.from === slot) return;
    const there = this.hand[slot] ?? null;
    if (d.from === 'board') {
      if (there) {
        sfx('error');
        return;
      }
      sfx('click');
      this.setSlot(slot, d.item);
      this.setBoard(takeShaped(this.board, this.host.items, d.item.uid));
      return;
    }
    sfx('click');
    const next = this.hand.slice();
    next[slot] = d.item;
    next[d.from] = there;
    this.hand = next;
    this.renderHand();
  }

  private discard(d: Drag): void {
    sfx('click');
    if (d.from === 'board') this.setBoard(takeShaped(this.board, this.host.items, d.item.uid));
    else this.setSlot(d.from, null);
  }

  private setSlot(slot: number, item: ItemInstance | null): void {
    const next = this.hand.slice();
    next[slot] = item;
    this.hand = next;
    this.renderHand();
  }
}
