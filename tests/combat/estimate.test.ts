import { describe, expect, it } from 'vitest';
import { LUCK } from '../../src/config/balance';
import { chainMultiplier, planChain } from '../../src/core/chain';
import { findCombo } from '../../src/core/damage';
import { estimateRoute } from '../../src/core/estimate';
import { getItemDef } from '../../src/data/items';
import { build } from '../helpers';

/** Expected-value factor of critical hits */
const crit = 1 + LUCK.critChance * (LUCK.critMult - 1);

/** origin → n swords in one row */
const swords = (n: number) =>
  build(n + 1, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    ...Array.from({ length: n }, (_, k) => ({
      uid: `s${k + 1}`,
      defId: 'sword',
      x: k + 1,
      y: 0,
      exits: (k + 1 === n ? [] : ['right']) as 'right'[],
    })),
  ]);

const estimate = (b: ReturnType<typeof build>, attackMult = 1) =>
  estimateRoute(planChain(b.loadout, b.items, 'o'), b.items, attackMult);

describe('ルートの推定ダメージ', () => {
  it('会心の期待値を含む', () => {
    expect(estimate(swords(1)).total).toBeCloseTo(getItemDef('sword').atk! * crit);
  });

  it('段数の連鎖倍率が乗る', () => {
    const one = estimate(swords(1)).total;
    const two = estimate(swords(2)).total;
    expect((two - one) / one).toBeCloseTo(chainMultiplier(2));
  });

  it('コンボがなければ combos は 0', () => {
    expect(estimate(swords(2)).combos).toBe(0);
  });

  describe('同じルートで付けた状態を後ろの装備が使うとコンボ（濡れ＋雷で感電）', () => {
    const wetThenThunder = () =>
      estimate(
        build(3, 1, [
          { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
          { uid: 'w', defId: 'canteen', x: 1, y: 0, exits: ['right'] },
          { uid: 't', defId: 'thunder_staff', x: 2, y: 0, exits: [] },
        ]),
      );
    const shock = findCombo('thunder', new Set(['wet']))!.mult;
    // The thunder staff's share of the estimate at step 2 without the combo
    const thunderPart = getItemDef('thunder_staff').atk! * chainMultiplier(2) * crit;

    it('コンボの回数を数える', () => {
      expect(wetThenThunder().combos).toBe(1);
    });

    it('コンボの装備はコンボ倍率の分だけ推定ダメージが上がる', () => {
      expect(wetThenThunder().total).toBeCloseTo(
        getItemDef('canteen').atk! * crit + thunderPart * shock,
      );
    });

    it('コンボで増えた分を fromCombos に分けて出す', () => {
      expect(wetThenThunder().fromCombos).toBeCloseTo(thunderPart * (shock - 1));
    });
  });

  it('強化の攻撃倍率が乗る', () => {
    expect(estimate(swords(1), 1.5).total / estimate(swords(1)).total).toBeCloseTo(1.5);
  });

  it('追加効果（鋭い）の割合だけ上がる', () => {
    const sharp = swords(1);
    sharp.items.get('s1')!.affixes = [{ id: 'sharp', value: 20 }];
    expect(estimate(sharp).total / estimate(swords(1)).total).toBeCloseTo(1.2);
  });
});
