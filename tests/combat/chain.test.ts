import { describe, expect, it } from 'vitest';
import { CHAIN, RARITY } from '../../src/config/balance';
import { chainMultiplier, planChain, simulateChain } from '../../src/core/chain';
import type { Rarity } from '../../src/core/types';
import { getItemDef } from '../../src/data/items';
import { build, specExample } from '../helpers';

describe('planChain', () => {
  describe('第5章の例', () => {
    const plan = () => {
      const { loadout, items } = specExample();
      return planChain(loadout, items, 'o1');
    };

    it('起点から1マスずつ伝わり、攻撃の装備だけが段数を数える（盾は数えない）', () => {
      const p = plan();
      expect(p.steps.map((s) => [s.uid, s.step])).toEqual([
        ['o1', null],
        ['sword', 1],
        ['canteen', 2],
        ['thunder', 3],
        ['shield', null],
        ['axe', 4],
      ]);
      expect(p.maxStep).toBe(4);
    });

    it('次のマスへは CHAIN.relayDelay ずつ遅れて伝わる', () => {
      const ts = plan().steps.map((s) => s.t);
      expect(ts[0]).toBe(0);
      const gaps = ts.slice(1).map((t, i) => t - ts[i]!);
      expect(gaps.every((g) => Math.abs(g - CHAIN.relayDelay) < 1e-9)).toBe(true);
    });

    it('各段の倍率はその段数の連鎖倍率で、段を数えない装備は ×1', () => {
      const steps = plan().steps;
      expect(steps.map((s) => s.mult)).toEqual(
        steps.map((s) => (s.step === null ? 1 : chainMultiplier(s.step))),
      );
    });

    it('連鎖の長さは最後の発動から CHAIN.tailDelay 後まで', () => {
      const p = plan();
      expect(p.duration).toBeCloseTo(p.steps.at(-1)!.t + CHAIN.tailDelay, 10);
    });

    it('通った盾の防御値が入る', () => {
      expect(plan().defenseGain).toBe(getItemDef('wood_shield').defense);
    });
  });

  it('入り口の制約はなく、どの辺からでも受け取る', () => {
    // 剣が左向きに出口を持ち、その左の斧へ伝わる
    const { loadout, items } = build(3, 1, [
      { uid: 'a', defId: 'axe', x: 0, y: 0, exits: [] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: ['left'] },
      { uid: 'o', defId: 'origin_stone', x: 2, y: 0, exits: ['left'] },
    ]);
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.map((s) => s.uid)).toEqual(['o', 's', 'a']);
  });

  describe('分岐', () => {
    // o → s1(右,下) → s2 / s3
    const forked = () => {
      const { loadout, items } = build(3, 2, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 's1', defId: 'sword', x: 1, y: 0, exits: ['right', 'down'] },
        { uid: 's2', defId: 'sword', x: 2, y: 0, exits: [] },
        { uid: 's3', defId: 'sword', x: 1, y: 1, exits: [] },
      ]);
      const plan = planChain(loadout, items, 'o');
      const byUid = new Map(plan.steps.map((s) => [s.uid, s]));
      return { plan, s2: byUid.get('s2')!, s3: byUid.get('s3')! };
    };

    it('分岐した枝は分かれた時点の段数から数え続ける', () => {
      const { s2, s3 } = forked();
      expect(s2.step).toBe(2);
      expect(s3.step).toBe(2);
    });

    it('分岐した枝は別の枝として並行して進み、同時に届く', () => {
      const { plan, s2, s3 } = forked();
      expect(s2.branch).not.toBe(s3.branch);
      expect(s2.t).toBeCloseTo(s3.t);
      expect(plan.duration).toBeCloseTo(s2.t + CHAIN.tailDelay);
    });

    it('同時に届いたら上→右→下→左の順に処理される', () => {
      const { plan } = forked();
      expect(plan.steps.map((s) => s.uid)).toEqual(['o', 's1', 's2', 's3']);
    });
  });

  it('各アイテムは1回だけ発動し、ループしない', () => {
    const { loadout, items } = build(2, 2, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['down'] },
      { uid: 'b', defId: 'sword', x: 1, y: 1, exits: ['left'] },
      { uid: 'c', defId: 'sword', x: 0, y: 1, exits: ['up', 'right'] },
    ]);
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.map((s) => s.uid)).toEqual(['o', 'a', 'b', 'c']);
    expect(plan.maxStep).toBe(3);
  });

  it('先に届いた枝が優先される', () => {
    // o(右,下) → 右: 大剣(伝達が遅い) → x ; 下: 剣 → 剣 → 剣 → x。大剣の枝のほうが先に届く
    const { loadout, items } = build(3, 2, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right', 'down'] },
      { uid: 'gs', defId: 'greatsword', x: 1, y: 0, exits: ['right'] },
      { uid: 'x', defId: 'axe', x: 2, y: 0, exits: [] },
      { uid: 's1', defId: 'sword', x: 0, y: 1, exits: ['right'] },
      { uid: 's2', defId: 'sword', x: 1, y: 1, exits: ['right'] },
      { uid: 's3', defId: 'sword', x: 2, y: 1, exits: ['up'] },
    ]);
    const plan = planChain(loadout, items, 'o');
    const at = (uid: string) => plan.steps.find((s) => s.uid === uid)!;
    const viaGreatsword = at('gs').t + getItemDef('greatsword').relayDelay!;
    const viaSwords = at('s3').t + CHAIN.relayDelay;
    expect(viaGreatsword).toBeLessThan(viaSwords);
    const x = at('x');
    expect(x.t).toBeCloseTo(viaGreatsword);
    expect(x.from).toBe('gs');
    expect(x.step).toBe(2);
  });

  describe('防具', () => {
    const armored = (rarity: Rarity) =>
      build(3, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'm', defId: 'chainmail', x: 1, y: 0, exits: ['right'], rarity },
        { uid: 'i', defId: 'iron_shield', x: 2, y: 0, exits: [] },
      ]);
    const gain = (rarity: Rarity) => {
      const { loadout, items } = armored(rarity);
      return planChain(loadout, items, 'o').defenseGain;
    };

    it('通った防具の防御値は足し合わされる', () => {
      expect(gain('common')).toBe(
        getItemDef('chainmail').defense! + getItemDef('iron_shield').defense!,
      );
    });

    it('レアリティ倍率は防御値にも掛かる', () => {
      // Only the chainmail's rarity changes; the common iron shield's share stays the same
      const shield = getItemDef('iron_shield').defense!;
      expect((gain('epic') - shield) / (gain('common') - shield)).toBeCloseTo(
        RARITY.epic.mult / RARITY.common.mult,
      );
    });

    it('防具は段数を数えない', () => {
      const { loadout, items } = armored('epic');
      expect(planChain(loadout, items, 'o').maxStep).toBe(0);
    });
  });

  it('出口のない起点は CHAIN.tailDelay だけで終わる', () => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps).toHaveLength(1);
    expect(plan.duration).toBeCloseTo(CHAIN.tailDelay);
  });
});

describe('simulateChain', () => {
  it('どの起点からも届かないマスを返す', () => {
    const { loadout, items } = build(4, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: [] },
      { uid: 'b', defId: 'sword', x: 3, y: 0, exits: [] },
    ]);
    const p = simulateChain(loadout, items);
    expect([...p.unreachable]).toEqual([3]);
    expect(p.plans).toHaveLength(1);
  });

  it('プレビューは100ms以内に更新できる（最大グリッド）', () => {
    const placed = [];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 7; x++)
        placed.push({
          uid: `u${x}_${y}`,
          defId: x === 0 ? 'origin_stone' : 'sword',
          x,
          y,
          exits: ['up', 'right', 'down', 'left'] as const,
        });
    const { loadout, items } = build(
      7,
      5,
      placed.map((p) => ({ ...p, exits: [...p.exits] })),
    );
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) simulateChain(loadout, items);
    expect((performance.now() - t0) / 10).toBeLessThan(100);
  });
});

describe('シンクロはない（起点が1つの本編では起きないため、なくした）', () => {
  /**
   * Two routes meet at J: J is the first route's 3rd step and the second route's 4th.
   *   o1 a b J e
   *   o2 c d g
   */
  function tJoin() {
    return build(5, 2, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'J', defId: 'sword', x: 3, y: 0, exits: ['right'] },
      { uid: 'e', defId: 'sword', x: 4, y: 0, exits: [] },
      { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 1, y: 1, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 2, y: 1, exits: ['right'] },
      { uid: 'g', defId: 'sword', x: 3, y: 1, exits: ['up'] },
    ]);
  }
  const firstPlan = () => {
    const { loadout, items } = tJoin();
    return simulateChain(loadout, items).plans[0]!;
  };

  it('2本の線が同じマスで出会っても、ボーナスは付かない', () => {
    const steps = firstPlan().steps as unknown as Record<string, unknown>[];
    expect(steps.filter((s) => s.mergeBonus !== undefined)).toEqual([]);
    expect(steps.filter((s) => s.mergeArrived !== undefined)).toEqual([]);
  });

  it('2本の線が同じマスで出会っても、段数は自分の線のまま', () => {
    // Route ① reaches J as its 3rd step and goes on from there (no lift to the longer route)
    const p1 = firstPlan();
    expect(p1.steps.find((s) => s.uid === 'J')!.step).toBe(3);
    expect(p1.steps.find((s) => s.uid === 'e')!.step).toBe(4);
  });
});
