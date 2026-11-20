// The 3 relics a beaten boss offers, over the field while the run waits. Drag a card
// onto a cell of the board, or tap a card and then a cell; 「いらない」 or the time running out goes on
// without one.
import Phaser from 'phaser';
import { relicValue } from '../core/relics';
import { getRelic, type RelicId } from '../data/relics';
import { t } from '../i18n';
import { sfx } from '../audio/sfx';
import { Button, fitText, panel } from './kit/widgets';
import { COLORS, RUN_LAYOUT, W, textStyle } from './theme';

export interface RelicPickerHooks {
  /** The board cell under a screen point (-1 if none) */
  cellAt(x: number, y: number): number;
  /** A board cell's screen rectangle */
  cellRect(cell: number): { x: number; y: number; size: number };
  cellCount: number;
  canStick(id: RelicId, cell: number): boolean;
  onPick(id: RelicId, cell: number): void;
  onSkip(): void;
}

const CARD_W = 206;
const CARD_H = 214;
const CARD_Y = 400;
/** The time bar and 「いらない」, under the cards */
const FOOT_Y = 532;
const DRAG_START = 12;

/** The text a relic shows on its card ({v} filled in) */
export function relicText(id: RelicId): string {
  const def = getRelic(id)!;
  const v = relicValue(id);
  return v === undefined ? t(def.text) : t(def.text, { v });
}

export class RelicPicker extends Phaser.GameObjects.Container {
  private readonly hooks: RelicPickerHooks;
  private readonly ids: RelicId[];
  private readonly cards: Phaser.GameObjects.Container[] = [];
  private readonly cellMarks: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private selected: RelicId | null = null;
  private drag: { id: RelicId; ghost: Phaser.GameObjects.Container; moved: boolean } | null = null;
  private done = false;

  constructor(scene: Phaser.Scene, ids: RelicId[], hooks: RelicPickerHooks) {
    super(scene, 0, 0);
    this.ids = ids;
    this.hooks = hooks;
    this.setDepth(80);
    // The field dims; the board stays bright (it is where the cards go)
    const dim = scene.add
      .rectangle(0, 0, W, RUN_LAYOUT.fieldHeight, 0x0c0a12, 0.62)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(dim);
    this.add(
      fitText(
        scene.add
          .text(W / 2, 266, t('レリックを1つ、盤面のマスへ'), textStyle(28, COLORS.gold))
          .setOrigin(0.5),
        W - 40,
      ),
    );
    ids.forEach((id, i) => this.cards.push(this.card(id, W / 2 + (i - 1) * (CARD_W + 16))));
    // Time left
    this.add(scene.add.rectangle(W / 2 - 150, FOOT_Y, 300, 12, 0x2a2538).setOrigin(0, 0.5));
    this.bar = scene.add.rectangle(W / 2 - 150, FOOT_Y, 300, 10, 0xf8d040).setOrigin(0, 0.5);
    this.add(this.bar);
    this.add(
      new Button(scene, W - 92, FOOT_Y, t('いらない'), () => this.skip(), {
        width: 150,
        height: 52,
        fontSize: 22,
        skin: 'gray',
      }),
    );
    // Valid cells glow on the board (world coordinates, above the board)
    this.cellMarks = scene.add.graphics().setDepth(47);
    scene.add.existing(this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    this.once('destroy', () => {
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      this.cellMarks.destroy();
    });
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 160 });
  }

  /** Share of the choosing time left (0..1) */
  setTimeLeft(ratio: number): void {
    this.bar.width = 300 * Math.max(0, Math.min(1, ratio));
    this.bar.setFillStyle(ratio < 0.3 ? 0xff8a7a : 0xf8d040);
  }

  /** A tap on the board while a card is chosen */
  tapCell(cell: number): void {
    if (this.selected && this.hooks.canStick(this.selected, cell)) this.pick(this.selected, cell);
  }

  close(): void {
    if (this.done) return;
    this.done = true;
    this.drag?.ghost.destroy();
    this.destroy();
  }

  private card(id: RelicId, x: number): Phaser.GameObjects.Container {
    const def = getRelic(id)!;
    const c = this.scene.add.container(x, CARD_Y);
    const bg = panel(this.scene, 0, 0, CARD_W, CARD_H, 'panel').setInteractive({
      useHandCursor: true,
    });
    const mark = this.badge(0, -62, t(def.mark), 34);
    const name = fitText(
      this.scene.add.text(0, -6, t(def.name), textStyle(21, COLORS.gold)).setOrigin(0.5),
      CARD_W - 20,
    );
    const body = this.scene.add
      .text(0, 42, relicText(id), {
        ...textStyle(16, COLORS.text, false),
        align: 'center',
        wordWrap: { width: CARD_W - 24, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
    // A long translation shrinks to stay on the card
    if (body.height > 66) body.setScale(66 / body.height);
    const where = fitText(
      this.scene.add
        .text(
          0,
          CARD_H / 2 - 18,
          def.target === 'attack' ? t('攻撃装備のマスに貼れる') : t('どの装備のマスにも貼れる'),
          textStyle(13, COLORS.textDim, false),
        )
        .setOrigin(0.5),
      CARD_W - 16,
    );
    c.add([bg, mark, name, body, where]);
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.done) return;
      this.drag = { id, ghost: this.ghost(id, p.x, p.y), moved: false };
      this.markCells(id);
    });
    this.add(c);
    return c;
  }

  /** A round badge with the relic's mark */
  private badge(x: number, y: number, mark: string, size: number): Phaser.GameObjects.Container {
    const b = this.scene.add.container(x, y);
    b.add(this.scene.add.circle(0, 0, size, 0x3a2a10).setStrokeStyle(4, 0xf8d040));
    b.add(
      this.scene.add.text(0, 0, mark, textStyle(Math.round(size * 1.1), '#fff2c0')).setOrigin(0.5),
    );
    return b;
  }

  private ghost(id: RelicId, x: number, y: number): Phaser.GameObjects.Container {
    const g = this.badge(x, y, t(getRelic(id)!.mark), 30);
    g.setDepth(90).setVisible(false);
    this.scene.add.existing(g);
    return g;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !p.isDown) return;
    if (!d.moved && Math.hypot(p.x - p.downX, p.y - p.downY) < DRAG_START) return;
    d.moved = true;
    d.ghost.setVisible(true).setPosition(p.x, p.y);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.ghost.destroy();
    if (!d.moved) {
      // A tap chooses the card; then a tap on a cell sticks it
      this.choose(d.id);
      return;
    }
    const cell = this.hooks.cellAt(p.x, p.y);
    if (cell >= 0 && this.hooks.canStick(d.id, cell)) this.pick(d.id, cell);
    else this.markCells(this.selected);
  }

  private choose(id: RelicId): void {
    sfx('click');
    this.selected = id;
    this.cards.forEach((c, i) => c.setScale(this.ids[i] === id ? 1.06 : 0.94));
    this.markCells(id);
  }

  private markCells(id: RelicId | null): void {
    const g = this.cellMarks.clear();
    if (!id) return;
    for (let cell = 0; cell < this.hooks.cellCount; cell++) {
      if (!this.hooks.canStick(id, cell)) continue;
      const r = this.hooks.cellRect(cell);
      g.lineStyle(4, 0xf8d040, 0.95).strokeRect(r.x + 3, r.y + 3, r.size - 6, r.size - 6);
      g.fillStyle(0xf8d040, 0.14).fillRect(r.x + 3, r.y + 3, r.size - 6, r.size - 6);
    }
  }

  private pick(id: RelicId, cell: number): void {
    if (this.done) return;
    this.hooks.onPick(id, cell);
  }

  private skip(): void {
    if (this.done) return;
    this.hooks.onSkip();
  }
}
