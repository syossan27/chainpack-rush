// 実績達成の知らせ: 画面の上から金の札が1枚ずつ降りてきて、少し置いて消える（操作は止めない）
import Phaser from 'phaser';
import type { AchievementDef } from '../data/achievements';
import type { BoardDef } from '../data/boards';
import { getCosmetic } from '../core/cosmetics';
import { sfx } from '../audio/sfx';
import { t } from '../i18n';
import { boardTraitText } from './boardText';
import { cosmeticTexture } from './cosmeticsView';
import { fitText } from './kit/widgets';
import { textStyle } from './theme';

const HOLD_MS = 1700;
/** Time from one card to the next (a later list of cards can start after this many steps) */
export const TOAST_STEP_MS = HOLD_MS + 500;

/** The gold-framed card that drops in, stays, and fades. `fill` adds the contents (w: card width) */
function dropCards(
  scene: Phaser.Scene,
  count: number,
  y: number,
  delay: number,
  fill: (i: number, root: Phaser.GameObjects.Container, w: number) => void,
): void {
  const W = scene.scale.gameSize.width;
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(delay + i * TOAST_STEP_MS, () => {
      const w = W - 80;
      const root = scene.add.container(W / 2, y - 140).setDepth(3900);
      const bg = scene.add.rectangle(0, 0, w, 96, 0x1a1208, 0.94);
      bg.setStrokeStyle(4, 0xffd25a);
      root.add(bg);
      fill(i, root, w);
      sfx('openRare');
      scene.tweens.chain({
        targets: root,
        tweens: [
          { y, duration: 260, ease: 'Back.easeOut' },
          { y, duration: HOLD_MS },
          { alpha: 0, y: y - 30, duration: 300 },
        ],
        onComplete: () => root.destroy(),
      });
    });
  }
}

export function showAchievements(
  scene: Phaser.Scene,
  list: readonly AchievementDef[],
  y = 150,
  delay = 0,
): void {
  dropCards(scene, list.length, y, delay, (i, root, w) => {
    const a = list[i]!;
    const tag = scene.add
      .text(-w / 2 + 18, -30, t('実績達成！'), textStyle(20, '#ff8ce8'))
      .setOrigin(0, 0.5);
    const gold = scene.add
      .text(w / 2 - 18, 0, `+${a.reward}G`, textStyle(34, '#ffd25a'))
      .setOrigin(1, 0.5);
    // The name stops before the reward, and the description before the tag on its row
    const name = fitText(
      scene.add.text(-w / 2 + 18, 12, t(a.name), textStyle(30, '#ffe27a')).setOrigin(0, 0.5),
      w - 36 - gold.width - 16,
    );
    const desc = fitText(
      scene.add.text(w / 2 - 18, -30, t(a.desc), textStyle(15, '#c8c0d8')).setOrigin(1, 0.5),
      w - 36 - tag.width - 16,
    );
    root.add([tag, name, gold, desc]);
  });
}

/** New looks, in the same card as achievements: the look's art on the right instead of the gold */
export function showNewLooks(
  scene: Phaser.Scene,
  ids: readonly string[],
  y = 150,
  delay = 0,
): void {
  dropCards(scene, ids.length, y, delay, (i, root, w) => {
    const def = getCosmetic(ids[i]!);
    if (!def) return;
    const tag = scene.add
      .text(-w / 2 + 18, -30, t('新しい見た目！'), textStyle(20, '#ff8ce8'))
      .setOrigin(0, 0.5);
    // The look's art, its longer side up to 64 px, under the description's row. Small pixel art
    // grows by a whole number so every pixel stays the same size
    const key = cosmeticTexture(scene, def.id);
    let artW = 0;
    if (key) {
      const src = scene.textures.get(key).getSourceImage();
      const fit = 64 / Math.max(src.width, src.height);
      const art = scene.add
        .image(w / 2 - 18, 12, key)
        .setOrigin(1, 0.5)
        .setScale(fit >= 1 ? Math.floor(fit) : fit);
      artW = art.displayWidth;
      root.add(art);
    }
    const name = fitText(
      scene.add.text(-w / 2 + 18, 12, t(def.name), textStyle(30, '#ffe27a')).setOrigin(0, 0.5),
      w - 36 - artW - 16,
    );
    const desc = fitText(
      scene.add
        .text(w / 2 - 18, -30, t('拠点で勇者をタップして着せ替え'), textStyle(15, '#c8c0d8'))
        .setOrigin(1, 0.5),
      w - 36 - tag.width - 16,
    );
    root.add([tag, name, desc]);
  });
}

/** Trial (board shapes): a board earned by clearing a region, in the same card */
export function showNewBoards(
  scene: Phaser.Scene,
  list: readonly BoardDef[],
  y = 150,
  delay = 0,
): void {
  dropCards(scene, list.length, y, delay, (i, root, w) => {
    const def = list[i]!;
    const tag = scene.add
      .text(-w / 2 + 18, -30, t('新しい盤面！'), textStyle(20, '#7fe0ff'))
      .setOrigin(0, 0.5);
    const trait = scene.add
      .text(w / 2 - 18, 12, boardTraitText(def) ?? '', textStyle(20, '#ffd25a'))
      .setOrigin(1, 0.5);
    fitText(trait, w / 2 - 18);
    const name = fitText(
      scene.add.text(-w / 2 + 18, 12, t(def.name), textStyle(30, '#ffe27a')).setOrigin(0, 0.5),
      w - 36 - trait.displayWidth - 16,
    );
    const desc = fitText(
      scene.add
        .text(w / 2 - 18, -30, t('配置画面で切り替えられます'), textStyle(15, '#c8c0d8'))
        .setOrigin(1, 0.5),
      w - 36 - tag.width - 16,
    );
    root.add([tag, name, trait, desc]);
  });
}
