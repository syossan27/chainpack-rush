// Trial (charms): the board's edge slots (one under each column, one left of each row) and the
// combo meter. The loadout screen uses full slots outside the frame (tappable); the battle screens
// use small badges on the frame's edge (a tall board leaves no room under it there).
import Phaser from 'phaser';
import { boardSize } from '../core/boards';
import { slotOpen, type CharmSlots } from '../core/charms';
import type { BoardDef } from '../data/boards';
import { getCharm } from '../data/charms';
import { t } from '../i18n';
import { BackpackView } from './backpackView';
import { bindTap } from './kit/widgets';
import { JUICE, rarityColor, textStyle } from './theme';

export interface CharmStripOpts {
  /** Small badges on the frame's edge (battle screens) instead of full slots outside it */
  compact?: boolean;
  /** The slots can be tapped (loadout screen); empty ones show a "+" */
  onTapSlot?: (slot: number) => void;
  /** Where the combo meter shows (screen coordinates; default: under the column slots) */
  meterAt?: { x: number; y: number };
}

const FULL = 56;
const COMPACT = 32;
/** The meter's color steps up past these multipliers (JUICE.chainColors) */
const METER_STEPS = [2, 4, 8, 16];

export class CharmStrip extends Phaser.GameObjects.Container {
  private readonly view: BackpackView;
  private readonly board: BoardDef;
  private readonly opts: CharmStripOpts;
  private readonly size: number;
  private slots: CharmSlots;
  private selected: number | null = null;
  private lit: ReadonlySet<number> = new Set();
  private readonly slotLayer: Phaser.GameObjects.Container;
  /** Each open slot's box (it hops when its charm reacts) */
  private boxes = new Map<number, Phaser.GameObjects.Container>();
  private readonly meter: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    view: BackpackView,
    board: BoardDef,
    slots: CharmSlots,
    opts: CharmStripOpts = {},
  ) {
    super(scene, 0, view.y);
    this.view = view;
    this.board = board;
    this.slots = slots;
    this.opts = opts;
    this.size = opts.compact ? COMPACT : FULL;
    this.slotLayer = scene.add.container(0, 0);
    this.add(this.slotLayer);
    const at = opts.meterAt ?? { x: this.view.left + this.gridWidth / 2, y: this.bottom + 36 };
    // The meter lives on the scene (screen coordinates), above the field's numbers
    this.meter = scene.add
      .text(at.x, at.y, '', textStyle(30))
      .setOrigin(0.5)
      .setDepth(66)
      .setAlpha(0);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.meter.destroy());
    scene.add.existing(this);
    this.redraw();
  }

  private get gridWidth(): number {
    return boardSize(this.board).width * this.view.cell;
  }

  private get gridHeight(): number {
    return boardSize(this.board).height * this.view.cell;
  }

  /** Distance from the grid's edge to a slot's center */
  private get offset(): number {
    return this.opts.compact
      ? BackpackView.FRAME_PAD / 2
      : BackpackView.FRAME_PAD + 6 + this.size / 2;
  }

  /** The screen y of the column slots' bottom edge */
  get bottom(): number {
    return this.y + this.gridHeight + this.offset + this.size / 2;
  }

  /** A slot's center (in this container) */
  slotPos(slot: number): { x: number; y: number } {
    const { width } = boardSize(this.board);
    const cell = this.view.cell;
    if (slot < width)
      return { x: this.view.left + slot * cell + cell / 2, y: this.gridHeight + this.offset };
    return { x: this.view.left - this.offset, y: (slot - width) * cell + cell / 2 };
  }

  setSlots(slots: CharmSlots): void {
    this.slots = slots;
    this.redraw();
  }

  setSelected(slot: number | null): void {
    this.selected = slot;
    this.redraw();
  }

  setLit(lit: ReadonlySet<number>): void {
    this.lit = lit;
    this.redraw();
  }

  private redraw(): void {
    this.slotLayer.removeAll(true);
    this.boxes.clear();
    const { width, height } = boardSize(this.board);
    const s = this.size;
    for (let slot = 0; slot < width + height; slot++) {
      if (!slotOpen(slot, this.board)) continue;
      const p = this.slotPos(slot);
      const c = this.slots[slot] ?? null;
      const def = c ? getCharm(c.defId) : undefined;
      const lit = this.lit.has(slot);
      const sel = this.selected === slot;
      const box = this.scene.add.container(p.x, p.y);
      const g = this.scene.add.graphics();
      g.fillStyle(0x1a1426, c ? 0.95 : 0.6).fillRoundedRect(-s / 2, -s / 2, s, s, 8);
      const edge = sel ? 0xffffff : lit ? 0xffd25a : c ? rarityColor(c.rarity) : 0x5a5070;
      g.lineStyle(sel || lit ? 4 : 3, edge, 1).strokeRoundedRect(-s / 2, -s / 2, s, s, 8);
      box.add(g);
      if (def) {
        box.add(
          this.scene.add
            .text(0, 0, t(def.mark), textStyle(this.opts.compact ? 15 : 24, '#ffffff'))
            .setOrigin(0.5),
        );
      } else if (this.opts.onTapSlot) {
        box.add(this.scene.add.text(0, -2, '+', textStyle(28, '#8a80a0')).setOrigin(0.5));
      }
      const tap = this.opts.onTapSlot;
      if (tap) {
        const zone = this.scene.add
          .zone(0, 0, s + 8, s + 8)
          .setInteractive({ useHandCursor: true });
        bindTap(zone, () => tap(slot));
        box.add(zone);
      }
      this.slotLayer.add(box);
      this.boxes.set(slot, box);
    }
  }

  /** A charm reacted: the slot hops and its step ("+0.3", "×1.5") floats up */
  pulse(slot: number, label: string): void {
    const p = this.slotPos(slot);
    const ring = this.scene.add
      .graphics()
      .lineStyle(3, 0xffd25a, 1)
      .strokeRoundedRect(p.x - this.size / 2, p.y - this.size / 2, this.size, this.size, 8);
    this.add(ring);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
    const txt = this.scene.add
      .text(p.x, p.y - this.size / 2 - 4, label, textStyle(this.opts.compact ? 20 : 24, '#ffe27a'))
      .setOrigin(0.5, 1);
    this.add(txt);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 34,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
    const box = this.boxes.get(slot);
    if (box) {
      this.scene.tweens.killTweensOf(box);
      this.scene.tweens.add({
        targets: box,
        scale: { from: 1.3, to: 1 },
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
  }

  /** The combo meter: bigger and warmer as the multiplier grows */
  showMeter(m: number): void {
    const step = METER_STEPS.filter((v) => m >= v).length;
    const colors = JUICE.chainColors;
    this.scene.tweens.killTweensOf(this.meter);
    this.meter
      .setText(t('コンボ ×{m}', { m: m.toFixed(1) }))
      .setColor(colors[Math.min(colors.length - 1, step)]!)
      .setFontSize(30 + step * 5)
      .setAlpha(1)
      .setScale(1.35);
    this.scene.tweens.add({ targets: this.meter, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  hideMeter(): void {
    this.scene.tweens.killTweensOf(this.meter);
    this.scene.tweens.add({ targets: this.meter, alpha: 0, duration: 300 });
  }
}

/** "+0.3" / "×1.5": the step a charm adds, as it floats over its slot */
export function charmStepLabel(op: '+' | '×', value: number): string {
  return `${op}${Math.round(value * 100) / 100}`;
}
