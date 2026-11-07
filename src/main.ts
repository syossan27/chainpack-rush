import Phaser from 'phaser';

class EmptyScene extends Phaser.Scene {
  constructor() {
    super('Empty');
  }
  create(): void {
    this.add
      .text(360, 640, 'Chainpack Rush', { fontSize: '48px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 720,
  height: 1280,
  backgroundColor: '#14121c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [EmptyScene],
});
