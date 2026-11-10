import { describe, expect, it } from 'vitest';
import { LUCK } from '../src/config/balance';
import { planChain } from '../src/core/chain';
import { estimateRoute } from '../src/core/estimate';
import { build } from './helpers';

const crit = 1 + LUCK.critChance * (LUCK.critMult - 1);

describe('ルートの推定ダメージ', () => {
  it('段数の倍率と会心の期待値を含む', () => {
    const { loadout, items } = build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: [] },
    ]);
    const e = estimateRoute(planChain(loadout, items, 'o'), items, 1);
    expect(e.total).toBeCloseTo((10 + 10 * 1.2) * crit);
    expect(e.combos).toBe(0);
  });

  it('同じルートで付けた状態を後ろの装備が使うとコンボ（濡れ＋雷で×3）', () => {
    const { loadout, items } = build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'w', defId: 'canteen', x: 1, y: 0, exits: ['right'] },
      { uid: 't', defId: 'thunder_staff', x: 2, y: 0, exits: [] },
    ]);
    const e = estimateRoute(planChain(loadout, items, 'o'), items, 1);
    expect(e.combos).toBe(1);
    expect(e.total).toBeCloseTo((4 + 12 * 1.2 * 3) * crit);
    expect(e.fromCombos).toBeCloseTo(12 * 1.2 * 2 * crit);
  });

  it('強化の攻撃倍率と追加効果（鋭い）が乗る', () => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
    items.get('a')!.affixes = [{ id: 'sharp', value: 20 }];
    const e = estimateRoute(planChain(loadout, items, 'o'), items, 1.5);
    expect(e.total).toBeCloseTo(10 * 1.5 * 1.2 * crit);
  });
});
