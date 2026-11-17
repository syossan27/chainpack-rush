// Drawing the cosmetics: hero color looks (and the plume taken off for the flame plume), the pet,
// and name decorations. Head and back accessories are in heroAccessories.ts.
import Phaser from 'phaser';
import { UNIT_SPRITES, PALETTE, animFrameSize, animKey, type UnitAnimName } from '../data/sprites';
import { HERO_ANCHORS } from '../data/heroAnchors';
import { erasePlume } from '../core/heroPlume';
import { getCosmetic, type Look } from '../core/cosmetics';
import { ACCESSORY_ART, accessoryKey } from '../data/accessories';

// ---- Hero color looks ----
// The hero sprites are recolored at runtime: armor greys, the red cape/plume and the gold trim are told
// apart by hue/saturation, and only those parts change (outlines and effect colors stay).

type Part = 'armor' | 'cape' | 'trim';
/** 'hue': keep saturation (×sat) and change the hue; 'tint': set hue and saturation. Lightness + add */
type Rule = { mode: 'hue' | 'tint'; hue: number; sat: number; add: number };

const HERO_LOOK_RULES: Record<string, Partial<Record<Part, Rule>>> = {
  hero_azure: { cape: { mode: 'hue', hue: 218, sat: 1, add: 0.02 } },
  hero_silver_royal: {
    armor: { mode: 'tint', hue: 215, sat: 0.16, add: 0.07 },
    cape: { mode: 'hue', hue: 272, sat: 0.9, add: 0.02 },
  },
  hero_gold: {
    armor: { mode: 'tint', hue: 44, sat: 0.78, add: 0.02 },
    trim: { mode: 'tint', hue: 230, sat: 0.1, add: 0.12 },
  },
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
}

function partOf(h: number, s: number, l: number): Part | null {
  if (l < 0.17 || l > 0.97) return null; // outlines and pure highlights
  if (s >= 0.95 && l >= 0.45) return null; // vivid effect colors (the fire slash, sparks)
  if (s < 0.22) return 'armor';
  if (h >= 300 && s > 0.35) return 'cape';
  if (h >= 15 && h <= 52 && s > 0.4) return 'trim';
  return null;
}

function recolorPixels(data: Uint8ClampedArray, rules: Partial<Record<Part, Rule>>): void {
  const cache = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const rgb = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    let out = cache.get(rgb);
    if (out === undefined) {
      out = rgb;
      const [h, s, l] = rgbToHsl(data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255);
      const part = partOf(h, s, l);
      const rule = part ? rules[part] : undefined;
      if (rule) {
        const ns = rule.mode === 'hue' ? Math.min(1, s * rule.sat) : rule.sat;
        const [r, g, b] = hslToRgb(rule.hue, ns, Math.min(1, l + rule.add));
        out = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
      }
      cache.set(rgb, out);
    }
    data[i] = (out >> 16) & 255;
    data[i + 1] = (out >> 8) & 255;
    data[i + 2] = out & 255;
  }
}

/** The original pixels of each hero texture, kept so a look can be changed back */
const heroOriginals = new Map<string, HTMLCanvasElement>();
let heroLookNow = 'none|false';

function heroTextureKeys(scene: Phaser.Scene): string[] {
  const def = UNIT_SPRITES.hero;
  if (!def) return [];
  const names = Object.keys(def.anims ?? {}) as UnitAnimName[];
  return [def.key, ...names.map((n) => animKey(def.key, n))].filter((k) =>
    scene.textures.exists(k),
  );
}

/**
 * Put the hero in its worn look: the color look (look.hero; null = the normal colors), and without
 * the red helmet plume while a head accessory that replaces it is worn (the flame plume). Changes
 * every scene's hero at once. The still ('hero', also the face icon) keeps its plume
 */
export function applyHeroLook(scene: Phaser.Scene, look: Pick<Look, 'hero' | 'head'>): void {
  const id = look.hero && HERO_LOOK_RULES[look.hero] ? look.hero : null;
  // Only when its art is really there: a flame plume that failed to load must not leave the
  // helmet bald
  const noPlume = !!(
    look.head &&
    ACCESSORY_ART[look.head]?.hidesPlume &&
    scene.textures.exists(accessoryKey(look.head))
  );
  const state = `${id ?? 'none'}|${noPlume}`;
  if (state === heroLookNow) return;
  const def = UNIT_SPRITES.hero!;
  for (const key of heroTextureKeys(scene)) {
    const src = scene.textures.get(key).source[0];
    if (!src) continue;
    let orig = heroOriginals.get(key);
    if (!orig) {
      orig = document.createElement('canvas');
      orig.width = src.width;
      orig.height = src.height;
      orig.getContext('2d')!.drawImage(src.image as CanvasImageSource, 0, 0);
      heroOriginals.set(key, orig);
    }
    const canvas = document.createElement('canvas');
    canvas.width = orig.width;
    canvas.height = orig.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(orig, 0, 0);
    // The plume comes off the animation sheets only (frame by frame, above each head anchor)
    const anim = key === def.key ? null : (key.slice(def.key.length + 1) as UnitAnimName);
    const sheet = anim ? def.anims?.[anim] : undefined;
    const heads = anim ? HERO_ANCHORS.knight?.[anim]?.head : undefined;
    const erase = noPlume && sheet && heads;
    if (id || erase) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // The plume is found by its red, so it comes off before a color look repaints the reds
      if (erase) {
        const size = animFrameSize(def, sheet);
        erasePlume(
          img.data,
          canvas.width,
          size.frameWidth,
          size.frameHeight,
          heads.map((p) => p?.[1] ?? 0),
        );
      }
      if (id) recolorPixels(img.data, HERO_LOOK_RULES[id]!);
      ctx.putImageData(img, 0, 0);
    }
    // Swap the pixels under the existing frames (animations keep working)
    src.image = canvas;
    src.isCanvas = true;
    src.update();
  }
  heroLookNow = state;
}

/** A still of the hero in a look (null = normal colors), for the wardrobe cards */
export function heroLookPreview(scene: Phaser.Scene, look: string | null): string | null {
  const id = look && HERO_LOOK_RULES[look] ? look : null;
  const key = `hero_look_${id ?? 'none'}`;
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists('hero')) return null;
  const src = scene.textures.get('hero').source[0];
  if (!src) return null;
  // While a look is worn the still's original pixels are in heroOriginals
  const base = heroOriginals.get('hero') ?? (src.image as CanvasImageSource);
  const tex = scene.textures.createCanvas(key, src.width, src.height);
  if (!tex) return null;
  const ctx = tex.getContext();
  ctx.drawImage(base, 0, 0);
  if (id) {
    const img = ctx.getImageData(0, 0, src.width, src.height);
    recolorPixels(img.data, HERO_LOOK_RULES[id]!);
    ctx.putImageData(img, 0, 0);
  }
  tex.refresh();
  return key;
}

// ---- Pet ----

/** Real pet art: a horizontal strip of square frames in assets/sprites, played as a loop */
export interface PetSheet {
  file: string;
  frames: number;
  fps: number;
  size: number;
}

export const PET_SHEETS: Record<string, PetSheet> = {
  // PixelLab: a 9-color baby dragon facing right, flapping its wings (assets/raw/pets/)
  pet_dragon: { file: 'pets/pet_dragon_fly.png', frames: 8, fps: 10, size: 40 },
};

/** Texture and animation key of a pet's strip */
export const petSheetKey = (id: string) => `${id}_fly`;
/** Still of the first frame, for the wardrobe cards */
const petStillKey = (id: string) => `${id}_still`;

/** After the strips are loaded: make each loop animation and a still of its first frame */
export function createPetAnims(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(PET_SHEETS)) {
    const key = petSheetKey(id);
    if (!scene.textures.exists(key)) continue;
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: sheet.frames - 1 }),
        frameRate: sheet.fps,
        repeat: -1,
      });
    if (scene.textures.exists(petStillKey(id))) continue;
    const frame = scene.textures.getFrame(key, 0);
    const tex = scene.textures.createCanvas(petStillKey(id), sheet.size, sheet.size);
    if (!frame || !tex) continue;
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
}

/** Baby dragon, 18×16, two wing frames (placeholder art drawn in code, used when the strip is missing) */
const PET_DRAGON: readonly (readonly string[])[] = [
  [
    '..........K...K...',
    '.....KK..KnK.KnK..',
    '....KFFK..KnKKnK..',
    '...KFeFFK..KKKK...',
    '...KFeeFK.KeeeEK..',
    '....KFeFKKeeeWkEK.',
    '.....KFFKKeeeWkeEK',
    '.K...KEEEEEeeeeeeK',
    'KeK.KeeeeeEEEEpEK.',
    'KEKKEeeeeeEEEEEK..',
    'KEEKEEeeeyyEKKK...',
    '.KEEEEEEyyyK......',
    '..KKKKFEEFK.......',
    '......KKKK........',
    '..................',
    '..................',
  ],
  [
    '..................',
    '..........K...K...',
    '.........KnK.KnK..',
    '..........KnKKnK..',
    '...........KKKK...',
    '..........KeeeEK..',
    '.........KeeeWkEK.',
    '...KKKKKKKeeeWkeEK',
    '.KKFFeFEEEEeeeeeeK',
    'KeFeeFeeeeEEEEpEK.',
    'KEKFFeeeeeEEEEEK..',
    'KEEKEEeeeyyEKKK...',
    '.KEEEEEEyyyK......',
    '..KKKKFEEFK.......',
    '......KKKK........',
    '..................',
  ],
];

const PET_ART: Record<string, readonly (readonly string[])[]> = { pet_dragon: PET_DRAGON };

function drawRows(scene: Phaser.Scene, key: string, rows: readonly string[]): void {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map((r) => r.length));
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = PALETTE[row[x]!];
      if (c === undefined) continue;
      g.fillStyle(c, 1);
      g.fillRect(x, y, 1, 1);
    }
  });
  g.generateTexture(key, w, rows.length);
  g.destroy();
}

const petFrameKey = (id: string, i: number) => `${id}_${i}`;

/**
 * Show the pet beside the hero: above and behind (left of) the given foot position, bobbing and
 * flapping. `scale` is the hero's scale on that screen, so the pet has the same pixel size (the
 * smaller placeholder art is drawn a third larger). Returns null when the id is not a pet.
 */
export function addPet(
  scene: Phaser.Scene,
  id: string | null,
  x: number,
  y: number,
  scale = 3,
): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null {
  if (!id || getCosmetic(id)?.kind !== 'pet') return null;
  const sheetKey = petSheetKey(id);
  let img: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  let flap: Phaser.Time.TimerEvent | null = null;
  if (scene.textures.exists(sheetKey) && scene.anims.exists(sheetKey)) {
    img = scene.add.sprite(x, y, sheetKey, 0).setScale(scale).setOrigin(0.5, 1).play(sheetKey);
  } else {
    const art = PET_ART[id];
    if (!art) return null;
    art.forEach((rows, i) => drawRows(scene, petFrameKey(id, i), rows));
    const still = scene.add
      .image(x, y, petFrameKey(id, 0))
      .setScale((scale * 4) / 3)
      .setOrigin(0.5, 1);
    img = still;
    let frame = 0;
    flap = scene.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        frame = (frame + 1) % art.length;
        still.setTexture(petFrameKey(id, frame));
      },
    });
  }
  const bob = scene.tweens.add({
    targets: img,
    y: y - 10,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  img.once('destroy', () => {
    flap?.remove();
    bob.remove();
  });
  return img;
}

// ---- Name decorations ----

const CROWN = [
  '................',
  '................',
  '.K....KK....K...',
  'KyK..KyyK..KyK..',
  'KyyK.KyyK.KyyK..',
  'KyyyKyyyyKyyyK..',
  'KyyyyyyyyyyyyK..',
  'KyyrryyuuyyrrK..',
  'KyyrryyuuyyrrK..',
  'KyyyyyyyyyyyyK..',
  'KooooooooooooK..',
  'KKKKKKKKKKKKKK..',
  '................',
  '................',
  '................',
  '................',
];

const MEDAL = [
  '..KKK....KKK....',
  '..KrrK..KuuK....',
  '...KrrKKuuK.....',
  '....KrruuK......',
  '.....KKKK.......',
  '....KoooooK.....',
  '...KonnnnooK....',
  '..KonnooonoK....',
  '..KonoooonoK....',
  '..KonoooonoK....',
  '..KoonnnnobK....',
  '...KooooobK.....',
  '....KbbbbK......',
  '.....KKKK.......',
  '................',
  '................',
];

const recolor = (rows: readonly string[], map: Record<string, string>): string[] =>
  rows.map((r) => r.replace(/./g, (ch) => map[ch] ?? ch));

const DECO_ART: Record<string, readonly string[]> = {
  deco_crown_gold: CROWN,
  deco_crown_silver: recolor(CROWN, { y: 'g', o: 'G' }),
  deco_medal: MEDAL,
};

/** Texture key of a name decoration's 16×16 icon (null when unknown) */
export function decoTexture(scene: Phaser.Scene, id: string | null | undefined): string | null {
  const rows = id ? DECO_ART[id] : undefined;
  if (!id || !rows) return null;
  const key = `deco_${id}`;
  drawRows(scene, key, rows);
  return key;
}

/** Icon for any cosmetic (for the wardrobe list): pets use their first frame */
export function cosmeticTexture(scene: Phaser.Scene, id: string): string | null {
  const def = getCosmetic(id);
  if (!def) return null;
  if (def.kind === 'deco') return decoTexture(scene, id);
  if (def.kind === 'head' || def.kind === 'back')
    return scene.textures.exists(accessoryKey(id)) ? accessoryKey(id) : null;
  if (def.kind === 'pet') {
    if (scene.textures.exists(petStillKey(id))) return petStillKey(id);
    const art = PET_ART[id];
    if (!art) return null;
    drawRows(scene, petFrameKey(id, 0), art[0]!);
    return petFrameKey(id, 0);
  }
  return null;
}
