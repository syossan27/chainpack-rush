// Trial (charms): the charm case on the loadout screen, in place of the item list while an edge slot
// is chosen. Tap a row to put that charm in the slot; hold a row to see it and sell it.
import Phaser from 'phaser';
import { CHARM } from '../config/balance';
import { charmValue, type CharmInstance } from '../core/charms';
import { getCharm } from '../data/charms';
import { t } from '../i18n';
import { RARITIES } from '../core/types';
import { Button, fitText, panel } from './kit/widgets';
import { COLORS, W, rarityColor, rarityCss, textStyle } from './theme';

export interface CharmListHooks {
  onTap(c: CharmInstance): void;
  onLongPress(c: CharmInstance): void;
  onBack(): void;
}

const HEAD_H = 58;
const ROW_H = 76;
const LONG_PRESS_MS = 450;
const MOVE_SLOP = 12;

/** A charm's text with its value filled in */
export function charmText(c: CharmInstance): string {
  const def = getCharm(c.defId);
  return def ? t(def.text, { v: Math.round(charmValue(c) * 100) / 100 }) : '';
}

export class CharmList extends Phaser.GameObjects.Container {
  private readonly hooks: CharmListHooks;
  private readonly viewTop: number;
  private readonly viewHeight: number;
  private readonly content: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly emptyText: Phaser.GameObjects.Text;
  private charms: CharmInstance[] = [];
  private scrollY = 0;

  constructor(scene: Phaser.Scene, top: number, bottom: number, hooks: CharmListHooks) {
    super(scene, 0, 0);
    this.hooks = hooks;
    this.viewTop = top + HEAD_H;
    this.viewHeight = bottom - this.viewTop;
    // The panel covers the item list underneath (it takes every touch in this area)
    const bg = panel(scene, W / 2, (top + bottom) / 2, W - 16, bottom - top + 8, 'inset');
    bg.setInteractive();
    this.title = scene.add.text(28, top + 26, '', textStyle(22, '#ffe27a')).setOrigin(0, 0.5);
    const back = new Button(scene, W - 84, top + 26, t('戻る'), () => this.hooks.onBack(), {
      width: 128,
      height: 46,
      fontSize: 20,
      skin: 'gray',
    });
    this.content = scene.add.container(0, this.viewTop);
    const maskShape = scene.make.graphics({}, false);
    maskShape.fillRect(0, this.viewTop, W, this.viewHeight);
    this.content.setMask(maskShape.createGeometryMask());
    this.emptyText = scene.add
      .text(
        W / 2,
        this.viewTop + this.viewHeight / 2,
        t('アクセサリーはまだありません'),
        textStyle(22, COLORS.textDim),
      )
      .setOrigin(0.5);
    this.add([bg, this.title, back, this.content, this.emptyText]);
    scene.add.existing(this);
    this.setupInput(bg);
  }

  /** Best first; `equippedHere`: the charms already on this board's edge */
  setCharms(list: readonly CharmInstance[], equippedHere: ReadonlySet<string>): void {
    const rank = (c: CharmInstance) => RARITIES.indexOf(c.rarity);
    this.charms = [...list].sort(
      (a, b) => rank(b) - rank(a) || a.defId.localeCompare(b.defId) || a.uid.localeCompare(b.uid),
    );
    this.title.setText(t('アクセサリー（{n}/{max}）', { n: list.length, max: CHARM.capacity }));
    fitText(this.title, W - 84 - 64 - 28 - 12);
    this.emptyText.setVisible(list.length === 0);
    this.scrollY = Math.min(this.scrollY, this.maxScroll());
    this.content.removeAll(true);
    this.charms.forEach((c, i) => {
      const def = getCharm(c.defId);
      if (!def) return;
      const y = i * ROW_H + ROW_H / 2;
      const g = this.scene.add.graphics();
      g.fillStyle(0x241c34, 1).fillRoundedRect(16, y - ROW_H / 2 + 4, W - 32, ROW_H - 8, 10);
      const s = 52;
      g.fillStyle(0x1a1426, 1).fillRoundedRect(28, y - s / 2, s, s, 8);
      g.lineStyle(3, rarityColor(c.rarity), 1).strokeRoundedRect(28, y - s / 2, s, s, 8);
      this.content.add(g);
      this.content.add(
        this.scene.add.text(28 + s / 2, y, t(def.mark), textStyle(24)).setOrigin(0.5),
      );
      const here = equippedHere.has(c.uid);
      const nameRoom = W - 100 - (here ? 120 : 32);
      this.content.add(
        fitText(
          this.scene.add
            .text(96, y - 14, t(def.name), textStyle(22, rarityCss(c.rarity)))
            .setOrigin(0, 0.5),
          nameRoom,
        ),
      );
      this.content.add(
        fitText(
          this.scene.add
            .text(96, y + 15, charmText(c), textStyle(16, COLORS.text, false))
            .setOrigin(0, 0.5),
          W - 96 - 28,
        ),
      );
      if (here)
        this.content.add(
          this.scene.add
            .text(W - 36, y - 14, t('装備中'), textStyle(18, '#8fe08f'))
            .setOrigin(1, 0.5),
        );
    });
    this.content.setY(this.viewTop - this.scrollY);
  }

  private maxScroll(): number {
    return Math.max(0, this.charms.length * ROW_H - this.viewHeight);
  }

  private rowAt(y: number): CharmInstance | undefined {
    if (y < this.viewTop || y > this.viewTop + this.viewHeight) return undefined;
    return this.charms[Math.floor((y - this.viewTop + this.scrollY) / ROW_H)];
  }

  /** Drag to scroll, tap a row, hold a row */
  private setupInput(bg: Phaser.GameObjects.NineSlice): void {
    let start: { y: number; scroll: number } | null = null;
    let moved = false;
    let held = false;
    let timer: Phaser.Time.TimerEvent | null = null;
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      start = { y: p.y, scroll: this.scrollY };
      moved = false;
      held = false;
      timer?.remove();
      const row = this.rowAt(p.y);
      if (row)
        timer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
          if (moved || !start) return;
          held = true;
          this.hooks.onLongPress(row);
        });
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!start || !p.isDown || !this.visible) return;
      if (!moved && Math.abs(p.y - start.y) < MOVE_SLOP) return;
      moved = true;
      timer?.remove();
      this.scrollY = Phaser.Math.Clamp(start.scroll - (p.y - start.y), 0, this.maxScroll());
      this.content.setY(this.viewTop - this.scrollY);
    });
    bg.on('pointerup', (p: Phaser.Input.Pointer) => {
      timer?.remove();
      const was = start;
      start = null;
      if (!was || moved || held) return;
      const row = this.rowAt(p.y);
      if (row) this.hooks.onTap(row);
    });
    bg.on('pointerout', () => {
      timer?.remove();
      start = null;
    });
  }
}
