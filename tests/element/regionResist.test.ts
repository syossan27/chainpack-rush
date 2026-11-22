import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../../src/config/balance';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../../src/core/combat';
import { ENDLESS, REGIONS, getRegion } from '../../src/data/regions';
import { build } from '../helpers';

/** origin → thunder staff → sword (rare: the staff's lowest rarity) */
function cfg(regionId: string): RunConfig {
  const b = build(3, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 't', defId: 'thunder_staff', x: 1, y: 0, exits: ['right'], rarity: 'rare' },
    { uid: 's', defId: 'sword', x: 2, y: 0, exits: [], rarity: 'rare' },
  ]);
  return {
    seed: 11,
    regionId,
    loadout: b.loadout,
    items: b.items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
    luck: NO_LUCK,
  };
}

/** Each item's first hit on an enemy of the region (or the scarecrow) */
function firstHits(c: Combat): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < 60 * 60 && out.size < 2; i++) {
    c.step();
    for (const e of c.drainEvents())
      if (e.type === 'hit' && !out.has(e.itemUid)) out.set(e.itemUid, e.damage);
  }
  return out;
}

describe('地域ごとの効きにくい属性', () => {
  it.each([
    ['cave', 'dark'],
    ['rampart', 'thunder'],
    ['volcano', 'wind'],
    ['glacier', 'light'],
  ] as const)('%s では %s だけが効きにくい（1倍未満）', (regionId, element) => {
    const resist = getRegion(regionId).resist!;
    expect(Object.keys(resist)).toEqual([element]);
    expect(resist[element]).toBeGreaterThan(0);
    expect(resist[element]).toBeLessThan(1);
  });

  it.each(['grassland', 'demon_castle'])('%s には効きにくい属性がない', (regionId) => {
    expect(getRegion(regionId).resist).toBeUndefined();
  });

  it('エンドレスには効きにくい属性がない', () => {
    expect(ENDLESS.resist).toBeUndefined();
  });

  it.each(REGIONS.filter((r) => r.resist).map((r) => r.id))(
    '効きにくい属性がある地域 (%s) には、その説明がある',
    (regionId) => {
      expect(getRegion(regionId).resistNote).toBeTruthy();
    },
  );

  it('城壁の敵には、雷が地域の倍率だけ弱くなる', () => {
    const grass = firstHits(new Combat(cfg('grassland')));
    const wall = firstHits(new Combat(cfg('rampart')));
    expect(wall.get('t')! / grass.get('t')!).toBeCloseTo(getRegion('rampart').resist!.thunder!, 2);
  });

  it('城壁の敵にも、物理はそのまま', () => {
    const grass = firstHits(new Combat(cfg('grassland')));
    const wall = firstHits(new Combat(cfg('rampart')));
    expect(wall.get('s')).toBeCloseTo(grass.get('s')!, 1);
  });

  it('カカシには地域の効きにくさがかからない', () => {
    const fire = (regionId: string) => {
      const c = new Combat({ ...cfg(regionId), mode: 'dummy' });
      c.fireNext();
      return firstHits(c);
    };
    expect(fire('rampart').get('t')).toBeCloseTo(fire('grassland').get('t')!, 1);
  });
});
