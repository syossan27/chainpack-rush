import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COSMETICS, getCosmetic } from '../src/core/cosmetics';
import { ACCESSORY_ART, accessoryKey } from '../src/data/accessories';

describe('小物の絵', () => {
  it('小物の絵の表にあるのは、一覧の頭と背中の物だけ', () => {
    for (const id of Object.keys(ACCESSORY_ART))
      expect(['head', 'back'], id).toContain(getCosmetic(id)?.kind);
  });

  it('冒険の小物7つすべてに絵がある', () => {
    const accessories = COSMETICS.filter((c) => c.kind === 'head' || c.kind === 'back');
    expect(accessories).toHaveLength(7);
    for (const c of accessories) {
      expect(ACCESSORY_ART[c.id], c.id).toBeDefined();
      expect(existsSync(spritePath(ACCESSORY_ART[c.id]!.file)), c.id).toBe(true);
    }
  });

  it('小物の絵は大きさの決まりに合い、付け根ときらめきは絵のそば', () => {
    for (const [id, art] of Object.entries(ACCESSORY_ART)) {
      const [w, h] = pngSize(spritePath(art.file));
      // Small enough for the chibi helmet: the user found a 26 px crown too big, and the ice
      // crystal is a 7x9 jewel on the forehead. On the back, the star ring is a halo that frames
      // the whole helmet (46 px)
      const [lo, hi] = getCosmetic(id)!.kind === 'head' ? [6, 32] : [24, 48];
      expect(Math.max(w, h), id).toBeGreaterThanOrEqual(lo);
      expect(Math.max(w, h), id).toBeLessThanOrEqual(hi);
      // The pivot may lie outside the image (an offset from the anchor), but not far
      for (const [v, size] of [
        [art.pivot[0], w],
        [art.pivot[1], h],
      ] as const) {
        expect(v, id).toBeGreaterThanOrEqual(-24);
        expect(v, id).toBeLessThanOrEqual(size + 24);
      }
      if (art.twinkle) {
        expect(art.twinkle.at[0], id).toBeLessThan(w);
        expect(art.twinkle.at[1], id).toBeLessThan(h);
      }
      if (art.pulse) {
        expect(art.pulse.min, id).toBeGreaterThan(0);
        expect(art.pulse.min, id).toBeLessThan(1);
      }
    }
  });

  it('テクスチャの名前は勇者の絵の名前と重ならない（勇者の色の塗り替えがかからない）', () => {
    expect(accessoryKey('head_leaf_crown')).toBe('acc_head_leaf_crown');
    expect(accessoryKey('head_leaf_crown').startsWith('hero')).toBe(false);
  });
});

function spritePath(file: string): URL {
  return new URL(`../assets/sprites/${file}`, import.meta.url);
}

/** Width and height from a PNG's IHDR chunk */
function pngSize(path: URL): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
