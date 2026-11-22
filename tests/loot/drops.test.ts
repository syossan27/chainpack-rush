import { describe, expect, it } from 'vitest';
import { LOOT, RARITY } from '../../src/config/balance';
import { Rng } from '../../src/core/rng';
import { createItem, rarityWeights, rollExits, rollLoot } from '../../src/core/loot';
import { getItemDef } from '../../src/data/items';
import { RARITIES } from '../../src/core/types';

/** The fewest and most exits a rarity can roll (from its exitCounts table) */
const exitRange = (r: (typeof RARITIES)[number]) => {
  const ns = RARITY[r].exitCounts.filter(([, w]) => w > 0).map(([n]) => n);
  return [Math.min(...ns), Math.max(...ns)] as const;
};

describe('rng / loot', () => {
  it('同じシードなら同じ列', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  describe.each(RARITIES)('%s の出口', (r) => {
    // Rolled inside each test (a throw fails that test, not the whole file)
    const rolls = () => {
      const rng = new Rng(1);
      return Array.from({ length: 200 }, () => rollExits(rng, r));
    };

    it('同じ向きは重ならない', () => {
      expect(rolls().filter((ex) => new Set(ex).size !== ex.length)).toEqual([]);
    });

    it('数はレアリティの範囲内', () => {
      const [lo, hi] = exitRange(r);
      const counts = rolls().map((ex) => ex.length);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(lo);
      expect(Math.max(...counts)).toBeLessThanOrEqual(hi);
    });
  });

  it('1周目のレアリティの重みは基本の重みどおり', () => {
    const total = LOOT.baseRarity.reduce((a, b) => a + b, 0);
    const w1 = Object.fromEntries(rarityWeights(1));
    expect(w1.common).toBeCloseTo(LOOT.baseRarity[0] / total);
  });

  it('周回ごとにコモンが LOOT.commonShiftPerLoop ずつ減る', () => {
    const w1 = Object.fromEntries(rarityWeights(1));
    const w3 = Object.fromEntries(rarityWeights(3));
    expect(w1.common! - w3.common!).toBeCloseTo(2 * LOOT.commonShiftPerLoop);
  });

  it('周回が進んでもレアリティの重みの合計は1', () => {
    const w3 = Object.fromEntries(rarityWeights(3));
    expect(Object.values(w3).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('コモンから回った分は、上のレアリティに元の比のまま配られる', () => {
    const w1 = Object.fromEntries(rarityWeights(1));
    const w3 = Object.fromEntries(rarityWeights(3));
    expect(w3.rare! / w3.epic!).toBeCloseTo(w1.rare! / w1.epic!);
  });

  it.each([
    ['common', 1],
    ['rare', 2],
    ['epic', 3],
    ['legendary', 4],
  ] as const)('起点石のレアリティは出口の数で決まる（%s は %i 方向）', (r, n) => {
    const it = createItem(new Rng(5), 'origin_stone', r, 'o');
    expect(it.exits).toHaveLength(n);
    expect(it.rarity).toBe(r);
    expect(new Set(it.exits).size).toBe(n);
  });

  it('起点石は出口0を出さない（コモンでも最低1方向）', () => {
    const rng = new Rng(11);
    const counts = Array.from(
      { length: 2000 },
      () => createItem(rng, 'origin_stone', 'common', 'o').exits.length,
    );
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
  });

  it('装備の出口0（末端）は出る', () => {
    const rng = new Rng(11);
    const counts = Array.from(
      { length: 2000 },
      () => createItem(rng, 'sword', 'common', 's').exits.length,
    );
    expect(counts).toContain(0);
  });

  it('ボスはレア以上確定', () => {
    const rng = new Rng(7);
    const rarities = Array.from({ length: 300 }, (_, i) => rollLoot(rng, 1, `x${i}`, true).rarity);
    expect(rarities).not.toContain('common');
  });

  it('装備のレアリティの出現率は、おおむね重みどおり', () => {
    const rng = new Rng(99);
    const n = 20000;
    const gear = Array.from({ length: n }, (_, i) => rollLoot(rng, 1, `x${i}`)).filter(
      (it) => getItemDef(it.defId).kind !== 'consumable',
    );
    const rate = (r: string) => gear.filter((it) => it.rarity === r).length / gear.length;
    const w1 = Object.fromEntries(rarityWeights(1));
    expect(rate('common')).toBeCloseTo(w1.common!, 1);
    expect(rate('rare')).toBeCloseTo(w1.rare!, 1);
  });
});
