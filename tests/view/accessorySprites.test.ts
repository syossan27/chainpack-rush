import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COSMETICS, getCosmetic } from '../../src/core/cosmetics';
import { ACCESSORY_ART, accessoryKey } from '../../src/data/accessories';

/** The adventure accessories (worn on the head or the back) */
const ACCESSORY_IDS = COSMETICS.filter((c) => c.kind === 'head' || c.kind === 'back').map(
  (c) => c.id,
);
const ART = Object.entries(ACCESSORY_ART);

describe('小物の絵', () => {
  it('小物の絵の表にあるのは、一覧の頭と背中の物だけ', () => {
    const strangers = Object.keys(ACCESSORY_ART).filter((id) => !ACCESSORY_IDS.includes(id));
    expect(strangers).toEqual([]);
  });

  it.each(ACCESSORY_IDS)('冒険の小物 %s には絵があり、その絵のファイルもある', (id) => {
    expect(ACCESSORY_ART[id]).toBeDefined();
    expect(existsSync(spritePath(ACCESSORY_ART[id]!.file))).toBe(true);
  });

  it.each(ART)('%s の絵は大きさの決まりに合う（頭は 6〜32px、背中は 24〜48px）', (id, art) => {
    // Small enough for the chibi helmet: the user found a 26 px crown too big, and the ice
    // crystal is a 7x9 jewel on the forehead. On the back, the star ring is a halo that frames
    // the whole helmet (46 px)
    const [lo, hi] = getCosmetic(id)!.kind === 'head' ? [6, 32] : [24, 48];
    const longest = Math.max(...pngSize(spritePath(art.file)));
    expect(longest).toBeGreaterThanOrEqual(lo);
    expect(longest).toBeLessThanOrEqual(hi);
  });

  it.each(ART)('%s の付け根は絵の外でもよいが、24px より離れない', (_, art) => {
    const [w, h] = pngSize(spritePath(art.file));
    expect(art.pivot[0]).toBeGreaterThanOrEqual(-24);
    expect(art.pivot[0]).toBeLessThanOrEqual(w + 24);
    expect(art.pivot[1]).toBeGreaterThanOrEqual(-24);
    expect(art.pivot[1]).toBeLessThanOrEqual(h + 24);
  });

  it.each(ART.filter(([, art]) => art.twinkle))('%s のきらめきは絵の中', (_, art) => {
    const [w, h] = pngSize(spritePath(art.file));
    expect(art.twinkle!.at[0]).toBeLessThan(w);
    expect(art.twinkle!.at[1]).toBeLessThan(h);
  });

  it.each(ART.filter(([, art]) => art.pulse))(
    '%s の明るさの波のいちばん暗いところは 0 と 1 のあいだ',
    (_, art) => {
      expect(art.pulse!.min).toBeGreaterThan(0);
      expect(art.pulse!.min).toBeLessThan(1);
    },
  );

  it('テクスチャの名前は勇者の絵の名前と重ならない（勇者の色の塗り替えがかからない）', () => {
    expect(accessoryKey('head_leaf_crown')).toBe('acc_head_leaf_crown');
    expect(accessoryKey('head_leaf_crown').startsWith('hero')).toBe(false);
  });
});

function spritePath(file: string): URL {
  return new URL(`../../assets/sprites/${file}`, import.meta.url);
}

/** Width and height from a PNG's IHDR chunk */
function pngSize(path: URL): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
