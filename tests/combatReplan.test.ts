import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../src/config/balance';
import { BASE_HERO_STATS, Combat } from '../src/core/combat';
import { build } from './helpers';

// Prototype (roguelite): gear is added to the backpack during a run, between chains
describe('ランの途中でバックパックを読み直す', () => {
  const start = () => {
    const { loadout, items } = build(5, 4, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
      { uid: 's1', defId: 'sword', x: 1, y: 1, exits: ['right'] },
    ]);
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
      luck: NO_LUCK,
    });
    return { c, loadout, items };
  };

  it('置いた装備が次の発火から連鎖に入る', () => {
    const { c, loadout, items } = start();
    expect(c.planOf('o1')!.steps.map((s) => s.uid)).toEqual(['o1', 's1']);
    items.set('a1', { uid: 'a1', defId: 'axe', rarity: 'common', exits: [], rerollCount: 0 });
    loadout.cells[1 * 5 + 2] = 'a1';
    expect(c.replan()).toBe(true);
    expect(c.planOf('o1')!.steps.map((s) => s.uid)).toEqual(['o1', 's1', 'a1']);
    c.fireNext();
    const hits: string[] = [];
    while (c.chain) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'step') hits.push(e.uid);
    }
    expect(hits).toContain('a1');
  });

  it('新しい起点石も発火順に入る。連鎖の途中は読み直さない', () => {
    const { c, loadout, items } = start();
    items.set('o2', {
      uid: 'o2',
      defId: 'origin_stone',
      rarity: 'common',
      exits: ['right'],
      rerollCount: 0,
    });
    loadout.cells[3 * 5 + 0] = 'o2';
    loadout.originOrder.push('o2');
    c.fireNext();
    expect(c.chain).not.toBeNull();
    expect(c.replan()).toBe(false);
    while (c.chain) c.step();
    expect(c.replan()).toBe(true);
    expect(c.originOrder).toEqual(['o1', 'o2']);
  });
});
