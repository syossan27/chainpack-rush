// 初めて出した必殺技のお知らせ（止めない）: 左上の勇者ステータスの下に、しばらく出しておく
import Phaser from 'phaser';
import { textStyle } from './theme';

/** 左上の勇者ステータス（y=10〜106）のすぐ下 */
const TOP = 116;
const WIDTH = 330;
const HOLD_MS = 3800;

export function showDiscovery(scene: Phaser.Scene, name: string, top = TOP): void {
  const x0 = 10;
  const root = scene.add.container(x0 - WIDTH - 20, top).setDepth(2400);
  const bg = scene.add.rectangle(0, 0, WIDTH, 74, 0x0c0a12, 0.85).setOrigin(0, 0);
  bg.setStrokeStyle(3, 0xffd25a);
  const tag = scene.add
    .text(12, 8, 'NEW  必殺技を発見！', textStyle(18, '#ff8ce8'))
    .setOrigin(0, 0);
  const text = scene.add.text(12, 34, `【${name}】`, textStyle(24, '#ffe27a')).setOrigin(0, 0);
  const hint = scene.add
    .text(WIDTH - 10, 10, '図鑑に登録', textStyle(14, '#a8a0c0'))
    .setOrigin(1, 0);
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
