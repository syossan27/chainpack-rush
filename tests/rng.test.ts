import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { createItem, rarityWeights, rollExits, rollLoot } from '../src/core/loot';

describe('rng / loot', () => {
  it('同じシードなら同じ列', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('出口は重複なし、レアリティごとの数の範囲', () => {
    const rng = new Rng(1);
    const ranges = { common: [0, 2], rare: [1, 3], epic: [1, 3], legendary: [2, 4] } as const;
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
      for (let i = 0; i < 200; i++) {
        const ex = rollExits(rng, r);
        expect(new Set(ex).size).toBe(ex.length);
        expect(ex.length).toBeGreaterThanOrEqual(ranges[r][0]);
        expect(ex.length).toBeLessThanOrEqual(ranges[r][1]);
      }
    }
  });

  it('周回ごとにコモンが10%ずつ減り、合計は1', () => {
    const w1 = Object.fromEntries(rarityWeights(1));
    const w3 = Object.fromEntries(rarityWeights(3));
    expect(w1.common).toBeCloseTo(0.6);
    expect(w3.common).toBeCloseTo(0.4);
    expect(Object.values(w3).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(w3.rare / w3.epic).toBeCloseTo(0.3 / 0.09);
  });

  it('起点石のレアリティは出口の数で決まる（コモン1・レア2・エピック3・レジェンダリー4）', () => {
    const rng = new Rng(5);
    for (const [r, n] of [
      ['common', 1],
      ['rare', 2],
      ['epic', 3],
      ['legendary', 4],
    ] as const) {
      const it = createItem(rng, 'origin_stone', r, 'o');
      expect(it.exits).toHaveLength(n);
      expect(it.rarity).toBe(r);
      expect(new Set(it.exits).size).toBe(n);
    }
  });

  it('起点石は出口0を出さない（コモンでも最低1方向）。装備の出口0（末端）は残る', () => {
    const rng = new Rng(11);
    let zeroAttack = 0;
    for (let i = 0; i < 2000; i++) {
      expect(createItem(rng, 'origin_stone', 'common', 'o').exits.length).toBeGreaterThanOrEqual(1);
      if (createItem(rng, 'sword', 'common', 's').exits.length === 0) zeroAttack++;
    }
    expect(zeroAttack).toBeGreaterThan(0);
  });

  it('ボスはレア以上確定', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 300; i++) expect(rollLoot(rng, 1, 'x', true).rarity).not.toBe('common');
  });

  it('出現率はおおむね仕様どおり', () => {
    const rng = new Rng(99);
    const n = 20000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const it = rollLoot(rng, 1, 'x');
      if (
        it.defId === 'potion' ||
        it.defId === 'rally' ||
        it.defId === 'time_stop' ||
        it.defId === 'oil_barrel' ||
        it.defId === 'rain_charm'
      )
        continue;
      counts[it.rarity] = (counts[it.rarity] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(counts.common! / total).toBeCloseTo(0.6, 1);
    expect(counts.rare! / total).toBeCloseTo(0.3, 1);
  });
});
