import { describe, expect, it } from 'vitest';
import { CALL } from '../../src/config/balance';
import { rollCalls, validCalls, type Call } from '../../src/core/calls';
import { defenseValue, planChain } from '../../src/core/chain';
import { Rng } from '../../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { emptyStackBoard, stackPut } from '../../src/core/stack';
import type { Dir, ItemInstance, Rarity } from '../../src/core/types';

const item = (uid: string, defId: string, calls?: Call[], exits: Dir[] = ['right']) =>
  ({
    uid,
    defId,
    rarity: 'common',
    exits,
    rerollCount: 0,
    ...(calls ? { calls } : {}),
  }) as ItemInstance;

/** A row on the standard board, left to right from cell 0, each piece put in order */
function row(list: ItemInstance[], cells: number[] = list.map((_, i) => i)) {
  const items = new Map(list.map((i) => [i.uid, i]));
  let l = emptyStackBoard('standard');
  list.forEach((it, k) => {
    const r = stackPut(l, items, it.uid, cells[k]!);
    if (r.block) throw new Error(r.block);
    l = r.loadout;
  });
  return planChain(l, items, 'o');
}

const callOf = (plan: ReturnType<typeof planChain>, uid: string) =>
  plan.steps.filter((s) => s.uid === uid).map((s) => s.call ?? 1);

describe('呼応: 連鎖の前後', () => {
  const fire50: Call = { side: 'prev', want: 'fire', v: 50 };

  it('前に鳴るのが炎なら、その分だけ強い', () => {
    const plan = row([item('o', 'origin_stone'), item('f', 'torch'), item('s', 'sword', [fire50])]);
    expect(callOf(plan, 's')).toEqual([1.5]);
  });

  it('前が炎でなければ、何も起きない', () => {
    const plan = row([item('o', 'origin_stone'), item('a', 'axe'), item('s', 'sword', [fire50])]);
    expect(callOf(plan, 's')).toEqual([1]);
  });

  it('次に鳴るのが防具なら強い（どれか1つでよい）', () => {
    const plan = row([
      item('o', 'origin_stone'),
      item('s', 'sword', [{ side: 'next', want: 'defense', v: 40 }]),
      item('w', 'wood_shield'),
    ]);
    expect(callOf(plan, 's')).toEqual([1.4]);
  });

  it('連鎖の終わりのマスでは「次」は成り立たない', () => {
    const plan = row([
      item('o', 'origin_stone'),
      item('s', 'sword', [{ side: 'next', want: 'defense', v: 40 }]),
    ]);
    expect(callOf(plan, 's')).toEqual([1]);
  });

  it('同じマスに重ねた装備どうしは、前後に数えない', () => {
    const same: Call = { side: 'prev', want: 'same', v: 60 };
    // Two swords stacked on cell 1, the origin before them: "the same gear before" never holds
    const plan = row(
      [item('o', 'origin_stone'), item('s1', 'sword', [same]), item('s2', 'sword', [same])],
      [0, 1, 1],
    );
    expect([...callOf(plan, 's1'), ...callOf(plan, 's2')]).toEqual([1, 1]);
  });

  it('防具の呼応は、防御値を上げる', () => {
    const guard: Call = { side: 'prev', want: 'origin', v: 50 };
    const plain = row([item('o', 'origin_stone'), item('w', 'wood_shield')]);
    const called = row([item('o', 'origin_stone'), item('w', 'wood_shield', [guard])]);
    const w = item('w', 'wood_shield');
    expect(called.defenseGain - plain.defenseGain).toBeCloseTo(defenseValue(w) * 0.5);
  });
});

describe('呼応: 拾うとき', () => {
  const roll = (defId: string, r: Rarity) =>
    Array.from({ length: 200 }, (_, i) => rollCalls(new Rng(i + 1), defId, r));

  it('数はレアリティごとに決まる', () => {
    const max = (r: Rarity) => Math.max(...roll('sword', r).map((c) => c.length));
    const min = (r: Rarity) => Math.min(...roll('sword', r).map((c) => c.length));
    expect([min('rare'), max('rare'), min('legendary'), max('legendary')]).toEqual([1, 1, 2, 2]);
  });

  it('値は範囲内', () => {
    const vs = roll('sword', 'legendary').flatMap((c) => c.map((x) => x.v));
    expect([Math.min(...vs) >= CALL.min, Math.max(...vs) <= CALL.max]).toEqual([true, true]);
  });

  it('起点石・消耗品・アーティファクトには付かない', () => {
    expect(
      [
        ...roll('origin_stone', 'epic'),
        ...roll('potion', 'common'),
        ...roll('dragon_fang', 'legendary'),
      ].flat().length,
    ).toBe(0);
  });

  it('範囲外の値は、ランキングの確認ではじく', () => {
    expect(validCalls(item('s', 'sword', [{ side: 'prev', want: 'fire', v: 999 }]))).toBe(false);
  });

  it('呼応はセーブに残る', () => {
    const s = createInitialSave();
    const calls: Call[] = [{ side: 'next', want: 'ice', v: 55 }];
    s.inventory.push(item('z', 'sword', calls));
    expect(deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === 'z')!.calls).toEqual(
      calls,
    );
  });
});
