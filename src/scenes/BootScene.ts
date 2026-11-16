// ロード、セーブ読み込み → 拠点
import Phaser from 'phaser';
import { applyHeroLook } from '../ui/cosmeticsView';
import { UNIT_SPRITES, animFrameSize, animKey, iconKey, type UnitAnimName } from '../data/sprites';
import { ITEM_DEFS } from '../data/items';
import { loadSave } from '../platform/storage';
import { setSave } from '../platform/store';
import { generateUiIcons } from '../ui/kit/icons';
import { generateSkin } from '../ui/kit/skin';
import { generateAllTextures } from '../ui/textures';
import { applyLang } from '../i18n/setup';
import { loadFonts } from '../ui/fonts';
import { COLORS, H, W, textStyle } from '../ui/theme';

// assets/sprites 以下の PNG はビルドに同梱し、その URL をここで引く（置いてあるものだけ読み込む）
const SPRITE_URLS = import.meta.glob('../../assets/sprites/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function spriteUrl(file: string): string | undefined {
  return SPRITE_URLS[`../../assets/sprites/${file}`];
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add.text(W / 2, H / 2, 'Chainpack Rush', textStyle(52, COLORS.accentText)).setOrigin(0.5);
    // 本素材（assets/sprites）が登録されていれば読み込む。なければ仮素材で動く
    for (const def of Object.values(UNIT_SPRITES)) {
      for (const [name, anim] of Object.entries(def.anims ?? {})) {
        const url = anim ? spriteUrl(anim.file) : undefined;
        if (!anim || !url) {
          if (anim) console.warn(`sprite not found: assets/sprites/${anim.file}（仮素材で続行）`);
          continue;
        }
        const { frameWidth, frameHeight } = animFrameSize(def, anim);
        this.load.spritesheet(animKey(def.key, name as UnitAnimName), url, {
          frameWidth,
          frameHeight,
        });
      }
    }
    // 装備アイコンの本素材（assets/sprites/icons/<装備のid>.png、16×16）。ないものは仮素材を描く
    for (const def of ITEM_DEFS) {
      const url = spriteUrl(`icons/${def.id}.png`);
      if (url) this.load.image(iconKey(def.id), url);
    }
  }

  create(): void {
    // 本素材の静止画（待機の1コマ目）を、拠点・地域選択・顔アイコンなどで使う基本テクスチャにする
    for (const def of Object.values(UNIT_SPRITES)) {
      const stillName = (['idle', 'move', 'run'] as const).find(
        (n) => def.anims?.[n] && this.textures.exists(animKey(def.key, n)),
      );
      if (!stillName || this.textures.exists(def.key)) continue;
      const frame = this.textures.getFrame(animKey(def.key, stillName), 0);
      if (!frame) continue;
      // 静止画は待機コマの実寸のまま。キャラ共通寸法へ縮小しない
      const tex = this.textures.createCanvas(def.key, frame.width, frame.height);
      if (!tex) continue;
      tex
        .getContext()
        .drawImage(
          frame.source.image as CanvasImageSource,
          frame.cutX,
          frame.cutY,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height,
        );
      tex.refresh();
    }
    // 本素材がないものは仮素材を描く
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
    generateSkin(this);
    generateUiIcons(this);
    // The language comes from the save, so load it first; then preload the fonts for that language
    void loadSave().then(async (save) => {
      setSave(save);
      applyLang(save.settings.lang);
      // Challenge reward look (recolors the hero textures for every scene)
      applyHeroLook(this, save.look.hero);
      await loadFonts();
      this.scene.start('Base');
    });
  }
}
