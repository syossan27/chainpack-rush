// Trial 「拾って組む」 (debug only): choose what to bring — one origin stone and a few pieces of
// gear from the collection — then set out. The collection is only looked at, never changed
import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { BUILD_RUN } from '../config/balance';
import { canSetOut, togglePick } from '../core/buildRun';
import type { ItemInstance } from '../core/types';
import { getItemDef } from '../data/items';
import { t } from '../i18n';
import { getSave } from '../platform/store';
import { session } from '../platform/session';
import { ItemIcon } from '../ui/itemIcon';
import { ItemList } from '../ui/itemList';
import { Button, fitText, panel, ribbon } from '../ui/kit/widgets';
import { COLORS, H, W, textStyle } from '../ui/theme';

const SLOT = 104;

export class BuildPickScene extends Phaser.Scene {
  private picked: ItemInstance[] = [];
  private list!: ItemList;
  private row!: Phaser.GameObjects.Container;
  private go!: Button;

  constructor() {
    super('BuildPick');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    // The last pick, if the items are still in the collection
    const inv = getSave().inventory;
    this.picked = (session.build ?? []).filter((p) => inv.some((i) => i.uid === p.uid));
    // Only setting out makes the next run a build run
    session.build = null;
    this.add.existing(ribbon(this, W / 2, 60, t('試作: 拾って組む')));
    fitText(
      this.add
        .text(
          W / 2,
          124,
          t('起点石1つと、装備{n}つまでを持ち込む。\n残りはランの中で拾って、盤面に置いていく', {
            n: BUILD_RUN.bringGear,
          }),
          textStyle(20, COLORS.textDim),
        )
        .setOrigin(0.5, 0)
        .setAlign('center'),
      W - 40,
    );
    panel(this, W / 2, 258, W - 40, 136, 'inset');
    this.row = this.add.container(0, 0);
    this.list = new ItemList(this, 340, H - 150, { onTap: (it) => this.toggle(it) }, (it) =>
      this.picked.some((p) => p.uid === it.uid) ? t('持込') : null,
    );
    this.list.setItems(this.gear());
    new Button(this, W / 2 - 170, H - 76, t('戻る'), () => this.scene.start('Base'), {
      width: 260,
      height: 88,
      skin: 'gray',
      icon: 'back',
    });
    this.go = new Button(this, W / 2 + 150, H - 76, t('出発'), () => this.setOut(), {
      width: 300,
      height: 96,
      fontSize: 36,
      skin: 'gold',
      icon: 'swords',
    });
    this.renderRow();
  }

  private toggle(it: ItemInstance): void {
    const next = togglePick(this.picked, it);
    if (next.length === this.picked.length && !next.some((p) => p.uid === it.uid)) {
      // Nothing changed: a consumable, or the gear is full
      sfx('error');
      return;
    }
    sfx('click');
    this.picked = next;
    this.list.setItems(this.gear());
    this.renderRow();
  }

  private gear(): ItemInstance[] {
    return getSave().inventory.filter((i) => getItemDef(i.defId).kind !== 'consumable');
  }

  /** The brought items in a row (origin first), with empty frames for the rest */
  private renderRow(): void {
    this.row.removeAll(true);
    const slots = 1 + BUILD_RUN.bringGear;
    const ordered = [
      ...this.picked.filter((p) => getItemDef(p.defId).kind === 'origin'),
      ...this.picked.filter((p) => getItemDef(p.defId).kind !== 'origin'),
    ];
    const left = W / 2 - ((slots - 1) * (SLOT + 12)) / 2;
    for (let i = 0; i < slots; i++) {
      const x = left + i * (SLOT + 12);
      const it = ordered[i];
      if (it) {
        const icon = new ItemIcon(this, x, 258, it, SLOT);
        this.row.add(icon);
        icon.setSize(SLOT, SLOT).setInteractive();
        icon.on('pointerup', () => this.toggle(it));
      } else {
        this.row.add(
          this.add
            .rectangle(x, 258, SLOT - 8, SLOT - 8, 0x000000, 0.25)
            .setStrokeStyle(2, 0x4a4460),
        );
        this.row.add(
          this.add
            .text(x, 258, i === 0 ? t('起点') : '+', textStyle(i === 0 ? 20 : 30, COLORS.textDim))
            .setOrigin(0.5),
        );
      }
    }
    this.go.setDisabled(!canSetOut(this.picked));
  }

  private setOut(): void {
    if (!canSetOut(this.picked)) return;
    sfx('click');
    session.build = this.picked.slice();
    this.scene.start('Run');
  }
}
