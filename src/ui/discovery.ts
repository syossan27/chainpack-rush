// 初めて出した必殺技のテロップ（止めない）: 上の方を帯が横切って「発見：【技名】！」
import Phaser from 'phaser';
import { textStyle } from './theme';

export function showDiscovery(scene: Phaser.Scene, name: string, y: number): void {
  const W = scene.scale.gameSize.width;
  const root = scene.add.container(W + 20, y).setDepth(2400);
  const band = scene.add.rectangle(0, 0, W, 62, 0x0c0a12, 0.82).setOrigin(0, 0.5);
  const edge = scene.add.rectangle(0, -31, W, 3, 0xffd25a).setOrigin(0, 0.5);
  const edge2 = scene.add.rectangle(0, 31, W, 3, 0xffd25a).setOrigin(0, 0.5);
  const tag = scene.add.text(24, 0, 'NEW', textStyle(20, '#ff8ce8')).setOrigin(0, 0.5);
  const text = scene.add
    .text(W / 2, 0, `発見：【${name}】！`, textStyle(32, '#ffe27a'))
    .setOrigin(0.5);
  root.add([band, edge, edge2, tag, text]);
  scene.tweens.chain({
    targets: root,
    tweens: [
      { x: 0, duration: 220, ease: 'Cubic.easeOut' },
      { x: 0, duration: 1500 },
      { x: -W - 20, duration: 240, ease: 'Cubic.easeIn' },
    ],
    onComplete: () => root.destroy(),
  });
}
