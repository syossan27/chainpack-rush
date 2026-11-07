// ロード、セーブ読み込み → 拠点
import Phaser from 'phaser';
import { UNIT_SPRITES, animKey, type UnitAnimName } from '../data/sprites';
import { loadSave } from '../platform/storage';
import { setSave } from '../platform/store';
import { generateAllTextures } from '../ui/textures';
import { COLORS, H, W, textStyle } from '../ui/theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add.text(W / 2, H / 2, 'Chainpack Rush', textStyle(52, COLORS.accentText)).setOrigin(0.5);
    // 本素材（assets/sprites）が登録されていれば読み込む。なければ仮素材で動く
    for (const def of Object.values(UNIT_SPRITES)) {
      for (const [name, anim] of Object.entries(def.anims ?? {})) {
        if (!anim) continue;
        this.load.spritesheet(
          animKey(def.key, name as UnitAnimName),
          `assets/sprites/${anim.file}`,
          {
            frameWidth: def.frameWidth,
            frameHeight: def.frameHeight,
          },
        );
      }
    }
  }

  create(): void {
    generateAllTextures(this);
    for (const def of Object.values(UNIT_SPRITES)) {
      for (const [name, anim] of Object.entries(def.anims ?? {})) {
        const key = animKey(def.key, name as UnitAnimName);
        if (!anim || !this.textures.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: anim.frames - 1 }),
          frameRate: anim.fps,
          repeat: anim.loop ? -1 : 0,
        });
      }
    }
    void loadSave().then((save) => {
      setSave(save);
      this.scene.start('Base');
    });
  }
}
