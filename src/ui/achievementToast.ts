// 実績達成の知らせ: 画面の上から金の札が1枚ずつ降りてきて、少し置いて消える（操作は止めない）
import Phaser from 'phaser';
import type { AchievementDef } from '../data/achievements';
import { sfx } from '../audio/sfx';
import { t } from '../i18n';
import { fitText } from './kit/widgets';
import { textStyle } from './theme';

const HOLD_MS = 1700;

export function showAchievements(
  scene: Phaser.Scene,
  list: readonly AchievementDef[],
  y = 150,
  delay = 0,
): void {
  const W = scene.scale.gameSize.width;
  list.forEach((a, i) => {
    scene.time.delayedCall(delay + i * (HOLD_MS + 500), () => {
      const w = W - 80;
      const root = scene.add.container(W / 2, y - 140).setDepth(3900);
      const bg = scene.add.rectangle(0, 0, w, 96, 0x1a1208, 0.94);
      bg.setStrokeStyle(4, 0xffd25a);
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
      root.add([bg, tag, name, gold, desc]);
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
  });
}
