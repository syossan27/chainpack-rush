// Prototype (roguelite): the pause every few kills / after a boss where the player picks one of three pieces
// of gear and puts it in the backpack. Throwaway UI kept out of RunScene's main code.
import Phaser from 'phaser';
import { RARITY } from '../config/balance';
import type { ItemInstance } from '../core/types';
import { getItemDef, RARITY_NAMES } from '../data/items';
import { t } from '../i18n';
import { ItemIcon } from './itemIcon';
import { Button, fitText, panel } from './kit/widgets';
import { RUN_LAYOUT, W, textStyle } from './theme';

const DEPTH = 300;
const CARD_W = 206;
const CARD_H = 250;

export interface ProtoPickHandlers {
  /** A card was chosen: the scene now waits for a cell tap */
  onChoose: (it: ItemInstance) => void;
  /** Nothing is taken (or there is no room) */
  onSkip: () => void;
  /** Done placing / turning: back to the fight */
  onResume: () => void;
}

/** The overlay over the field. `setStage` switches its text and buttons as the pick goes on */
export class ProtoPick {
  private readonly root: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly cards: Phaser.GameObjects.Container;
  private readonly resume: Button;
  private readonly skip: Button;

  constructor(
    private readonly scene: Phaser.Scene,
    choices: readonly ItemInstance[],
    roomLeft: boolean,
    private readonly on: ProtoPickHandlers,
  ) {
    const h = RUN_LAYOUT.middleTop;
    this.root = scene.add.container(0, 0).setDepth(DEPTH);
    const dim = scene.add.rectangle(0, 0, W, h, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
    // Below the HUD (time and HP) so the two do not overlap
    this.title = scene.add.text(W / 2, 150, '', textStyle(30)).setOrigin(0.5);
    this.cards = scene.add.container(0, 0);
    choices.forEach((it, i) => this.cards.add(this.card(it, W / 2 + (i - 1) * (CARD_W + 16), 300)));
    this.skip = new Button(scene, W / 2, h - 50, t('スキップ'), () => this.on.onSkip(), {
      width: 200,
      height: 64,
      fontSize: 22,
      skin: 'gray',
    });
    this.resume = new Button(scene, W / 2, h - 50, t('再開'), () => this.on.onResume(), {
      width: 240,
      height: 70,
      fontSize: 26,
      skin: 'gold',
    }).setVisible(false);
    this.root.add([dim, this.title, this.cards, this.skip, this.resume]);
    this.setStage(roomLeft ? 'choose' : 'full');
  }

  /** choose: the three cards / place: tap an empty cell / turn: tap the new gear to turn it */
  setStage(stage: 'choose' | 'place' | 'turn' | 'full'): void {
    this.cards.setVisible(stage === 'choose');
    this.skip.setVisible(stage !== 'turn');
    this.resume.setVisible(stage === 'turn');
    const text =
      stage === 'choose'
        ? t('ひとつ選ぼう')
        : stage === 'place'
          ? t('空いたマスをタップして置こう')
          : stage === 'turn'
            ? t('置いた装備をタップすると向きが回る')
            : t('バックパックがいっぱい');
    this.title.setText(text);
    fitText(this.title, W - 40);
  }

  destroy(): void {
    this.root.destroy();
  }

  private card(it: ItemInstance, x: number, y: number): Phaser.GameObjects.Container {
    const def = getItemDef(it.defId);
    const c = this.scene.add.container(x, y);
    const bg = panel(this.scene, 0, 0, CARD_W, CARD_H, 'paper');
    const icon = new ItemIcon(this.scene, 0, -40, it, 110);
    const name = fitText(
      this.scene.add.text(0, 44, t(def.name), textStyle(22, '#3a2a18')).setOrigin(0.5),
      CARD_W - 20,
    );
    const color = `#${RARITY[it.rarity].color.toString(16).padStart(6, '0')}`;
    const rarity = this.scene.add
      .text(0, 80, t(RARITY_NAMES[it.rarity]!), textStyle(20, color))
      .setOrigin(0.5);
    const hit = this.scene.add
      .zone(0, 0, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.on.onChoose(it));
    c.add([bg, icon, name, rarity, hit]);
    return c;
  }
}
