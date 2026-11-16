// 初めて出した必殺技のお知らせ（止めない）: 左上の勇者ステータスの下に、しばらく出しておく
import Phaser from 'phaser';
import { t } from '../i18n';
import { fitText } from './kit/widgets';
import { textStyle } from './theme';

/** 左上の勇者ステータス（y=10〜106）のすぐ下 */
const TOP = 116;
const WIDTH = 330;
const HEIGHT = 74;
const HOLD_MS = 3800;

/** name: the technique's name as in the game data (Japanese key); it is translated here */
export function showDiscovery(scene: Phaser.Scene, name: string, top = TOP): void {
  const x0 = 10;
  const root = scene.add.container(x0 - WIDTH - 20, top).setDepth(2400);
  const bg = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0c0a12, 0.85).setOrigin(0, 0);
  bg.setStrokeStyle(3, 0xffd25a);
  const hint = fitText(
    scene.add.text(WIDTH - 10, 10, t('図鑑に登録'), textStyle(14, '#a8a0c0')).setOrigin(1, 0),
    120,
  );
  // The headline stops short of the hint on the same row
  const tag = fitText(
    scene.add.text(12, 8, t('NEW  必殺技を発見！'), textStyle(18, '#ff8ce8')).setOrigin(0, 0),
    WIDTH - 10 - hint.displayWidth - 8 - 12,
  );
  const text = scene.add
    .text(12, 34, t('【{name}】', { name: t(name) }), textStyle(24, '#ffe27a'))
    .setOrigin(0, 0);
  // A name that would run out of the box (long translation) wraps, and the box grows by the extra lines
  const oneLine = text.height;
  if (text.width > WIDTH - 14) {
    text.setWordWrapWidth(WIDTH - 24, true);
    bg.setSize(WIDTH, HEIGHT + Math.max(0, text.height - oneLine));
  }
  root.add([bg, tag, text, hint]);
  scene.tweens.chain({
    targets: root,
    tweens: [
      { x: x0, duration: 220, ease: 'Back.easeOut' },
      { x: x0, duration: HOLD_MS },
      { alpha: 0, duration: 400 },
    ],
    onComplete: () => root.destroy(),
  });
}
