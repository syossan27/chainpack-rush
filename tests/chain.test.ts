import { describe, expect, it } from 'vitest';
import { planChain, simulateChain } from '../src/core/chain';
import { build, specExample } from './helpers';

describe('planChain', () => {
  it('第5章の例: 時刻・段数・倍率・持続時間1.2秒・防御値+8', () => {
    const { loadout, items } = specExample();
    const plan = planChain(loadout, items, 'o1');
    const rows = plan.steps.map((s) => ({
      t: s.t,
      uid: s.uid,
      step: s.step,
      mult: Number(s.mult.toFixed(2)),
    }));
    expect(rows).toEqual([
      { t: 0, uid: 'o1', step: null, mult: 1 },
      { t: 0.2, uid: 'sword', step: 1, mult: 1 },
      { t: 0.4, uid: 'canteen', step: 2, mult: 1.2 },
      { t: 0.6, uid: 'thunder', step: 3, mult: 1.44 },
      { t: 0.8, uid: 'shield', step: null, mult: 1 },
      { t: 1.0, uid: 'axe', step: 4, mult: 1.73 },
    ]);
    expect(plan.duration).toBeCloseTo(1.2, 10);
    expect(plan.defenseGain).toBe(8);
    expect(plan.maxStep).toBe(4);
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

  it('分岐した枝は分かれた時点の段数から数え続け、並行して進む', () => {
    // o → s1(右,下) → s2 / s3
    const { loadout, items } = build(3, 2, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's1', defId: 'sword', x: 1, y: 0, exits: ['right', 'down'] },
      { uid: 's2', defId: 'sword', x: 2, y: 0, exits: [] },
      { uid: 's3', defId: 'sword', x: 1, y: 1, exits: [] },
    ]);
    const plan = planChain(loadout, items, 'o');
    const byUid = new Map(plan.steps.map((s) => [s.uid, s]));
    expect(byUid.get('s2')!.step).toBe(2);
    expect(byUid.get('s3')!.step).toBe(2);
    expect(byUid.get('s2')!.t).toBeCloseTo(0.4);
    expect(byUid.get('s3')!.t).toBeCloseTo(0.4);
    expect(byUid.get('s2')!.branch).not.toBe(byUid.get('s3')!.branch);
    // 同時なら上→右→下→左の順に処理される
    expect(plan.steps.map((s) => s.uid)).toEqual(['o', 's1', 's2', 's3']);
    expect(plan.duration).toBeCloseTo(0.6);
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
    // o(右,下) → 右: 大剣(0.4秒伝達) → x ; 下: 剣 → 剣 → x と同時刻なら上右下左の順で、早い方が勝つ
    const { loadout, items } = build(3, 2, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right', 'down'] },
      { uid: 'gs', defId: 'greatsword', x: 1, y: 0, exits: ['right'] },
      { uid: 'x', defId: 'axe', x: 2, y: 0, exits: [] },
      { uid: 's1', defId: 'sword', x: 0, y: 1, exits: ['right'] },
      { uid: 's2', defId: 'sword', x: 1, y: 1, exits: ['right'] },
      { uid: 's3', defId: 'sword', x: 2, y: 1, exits: ['up'] },
    ]);
    const plan = planChain(loadout, items, 'o');
    const x = plan.steps.find((s) => s.uid === 'x')!;
    // 大剣経由: 0.2 + 0.4 = 0.6、剣経由: 0.2 + 0.2 + 0.2 + 0.2 = 0.8 → 大剣の枝が先
    expect(x.t).toBeCloseTo(0.6);
    expect(x.from).toBe('gs');
    expect(x.step).toBe(2);
  });

  it('レアリティ倍率は防御値にも掛かる', () => {
    const { loadout, items } = build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'm', defId: 'chainmail', x: 1, y: 0, exits: ['right'], rarity: 'epic' },
      { uid: 'i', defId: 'iron_shield', x: 2, y: 0, exits: [] },
    ]);
    const plan = planChain(loadout, items, 'o');
    expect(plan.defenseGain).toBe(12 * 2.5 + 18);
    expect(plan.maxStep).toBe(0);
  });

  it('出口のない起点は即座に終わる', () => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps).toHaveLength(1);
    expect(plan.duration).toBeCloseTo(0.2);
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
