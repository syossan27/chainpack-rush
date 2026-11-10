import { describe, expect, it } from 'vitest';
import { Combat } from '../src/core/combat';
import { planChain } from '../src/core/chain';
import type { ItemInstance, Loadout } from '../src/core/types';

const item = (uid: string, defId: string, exits: ItemInstance['exits']): ItemInstance => ({
  uid,
  defId,
  rarity: 'rare',
  exits,
  rerollCount: 0,
});
const line = (ids: string[]): { loadout: Loadout; items: Map<string, ItemInstance> } => {
  const inv = [
    item('o', 'origin_stone', ['right']),
    ...ids.map((d, i) => item(`i${i}`, d, ['right'])),
  ];
  return {
    loadout: {
      width: inv.length,
      height: 1,
      cells: inv.map((i) => i.uid),
      originOrder: ['o'],
      consumables: [],
    },
    items: new Map(inv.map((i) => [i.uid, i])),
  };
};
const hero = { maxHp: 100, atbTime: 1.5, attackMult: 1, runTime: 30 };

describe('新しい効果の装備', () => {
  it('疾風の羽のあとは、段数が1つ多く数えられる', () => {
    const { loadout, items } = line(['wind_feather', 'sword', 'sword']);
    const p = planChain(loadout, items, 'o');
    expect(p.steps.filter((s) => s.step !== null).map((s) => s.step)).toEqual([1, 3, 4]);
  });

  it('毒: 当てたあとも、時間でじわじわダメージが入る', () => {
    const { loadout, items } = line(['poison_dagger']);
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: { ...hero, maxHp: 9999 },
    });
    let dot = 0;
    let direct = 0;
    for (let i = 0; i < 60 * 20 && !c.ended; i++) {
      c.step();
      for (const e of c.drainEvents())
        if (e.type === 'hit') {
          if (e.dot) dot += e.damage;
          else direct += e.damage;
        }
    }
    expect(direct).toBeGreaterThan(0);
    expect(dot).toBeGreaterThan(0);
  });
});
