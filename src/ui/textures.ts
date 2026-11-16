// 仮素材のテクスチャをコードで生成する（ドット絵のピクセル配列から）
import Phaser from 'phaser';
import { ITEM_DEFS } from '../data/items';
import {
  ICON_RECOLOR,
  ICON_SIZE,
  PALETTE,
  UNIT_SPRITES,
  iconKey,
  iconPixels,
  type SpriteDef,
} from '../data/sprites';

function drawPixels(
  g: Phaser.GameObjects.Graphics,
  pixels: readonly string[],
  ox: number,
  oy: number,
  size: number,
): void {
  pixels.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const color = PALETTE[ch];
      if (color === undefined) continue;
      g.fillStyle(color, 1);
      g.fillRect(ox + x * size, oy + y * size, size, size);
    }
  });
}

/** 仮素材を本素材と同じコマ寸法（勇者64、雑魚48、ボス96）で描く */
export function generateUnitTexture(scene: Phaser.Scene, def: SpriteDef): void {
  if (scene.textures.exists(def.key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const ps = def.pixelSize;
  drawPixels(g, def.pixels, 0, 0, ps);
  if (def.overlay) drawPixels(g, def.overlay.pixels, def.overlay.x * ps, def.overlay.y * ps, ps);
  g.generateTexture(def.key, def.frameWidth, def.frameHeight);
  g.destroy();
}

/**
 * Copy an icon in another color: dark pixels (the outline) stay dark, mid tones take the color,
 * bright highlights stay white. Only when the source art was loaded (false otherwise)
 */
function recolorIcon(scene: Phaser.Scene, fromKey: string, toKey: string, color: number): boolean {
  if (!scene.textures.exists(fromKey)) return false;
  const src = scene.textures.get(fromKey).getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  const tex = scene.textures.createCanvas(toKey, src.width, src.height);
  if (!tex) return false;
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const rgb = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff] as const;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = (d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11) / 255;
    const body = Math.min(1, lum / 0.7);
    const shine = Math.max(0, (lum - 0.7) / 0.3);
    for (let ch = 0; ch < 3; ch++)
      d[i + ch] = Math.round(rgb[ch]! * body + (255 - rgb[ch]!) * shine);
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  return true;
}

export function generateAllTextures(scene: Phaser.Scene): void {
  for (const def of Object.values(UNIT_SPRITES)) {
    // 仮素材は常に作る（本素材の idle がないときの代わり）
    generateUnitTexture(scene, def);
  }
  for (const def of ITEM_DEFS) {
    const key = iconKey(def.id);
    if (scene.textures.exists(key)) continue;
    const re = ICON_RECOLOR[def.id];
    if (re && recolorIcon(scene, iconKey(re.from), key, re.color)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const pixels = iconPixels(def.id);
    const pad = Math.floor((ICON_SIZE - pixels.length) / 2);
    drawPixels(g, pixels, pad, pad, 1);
    g.generateTexture(key, ICON_SIZE, ICON_SIZE);
    g.destroy();
  }
  // 小さな四角（パーティクル用）
  if (!scene.textures.exists('px')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);
    g.destroy();
  }
}

/** 背景（多重スクロール3層）を地域の色から作る */
export function generateBackgroundTextures(
  scene: Phaser.Scene,
  regionId: string,
  colors: readonly [number, number, number],
  ground: number,
): string[] {
  const keys = [0, 1, 2].map((i) => `bg_${regionId}_${i}`);
  if (scene.textures.exists(keys[0]!)) return keys;
  const width = 360;
  const height = 192;
  // 奥: 空と遠景
  {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(colors[0], 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(colors[0]).lighten(15).color, 1);
    for (let i = 0; i < 6; i++) g.fillRect(i * 64 + 10, 20 + (i % 3) * 12, 26, 6);
    g.generateTexture(keys[0]!, width, height);
    g.destroy();
  }
  // 中: 山なみ
  {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(colors[1], 1);
    for (let x = 0; x < width; x += 4) {
      const hh =
        50 +
        Math.round(
          30 * Math.sin((x / width) * Math.PI * 4) + 14 * Math.sin((x / width) * Math.PI * 10),
        );
      g.fillRect(x, height - hh, 4, hh);
    }
    g.generateTexture(keys[1]!, width, height);
    g.destroy();
  }
  // 手前: 地面と草・岩
  {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(colors[2], 1);
    for (let x = 0; x < width; x += 4) {
      const hh = 20 + Math.round(8 * Math.sin((x / width) * Math.PI * 6));
      g.fillRect(x, height - 40 - hh, 4, hh);
    }
    g.fillStyle(ground, 1);
    g.fillRect(0, height - 40, width, 40);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(ground).darken(15).color, 1);
    for (let x = 0; x < width; x += 24) g.fillRect(x + ((x / 24) % 2) * 8, height - 30, 8, 4);
    g.generateTexture(keys[2]!, width, height);
    g.destroy();
  }
  return keys;
}
