import { describe, expect, it } from 'vitest';
import {
  emptyStackBoard,
  restoreStackBoard,
  stackAt,
  stackMove,
  stackPut,
  stackShift,
  stackTake,
} from '../src/core/stack';
import type { ItemInstance, Loadout } from '../src/core/types';

const item = (uid: string, defId: string): ItemInstance => ({
  uid,
  defId,
  rarity: 'common',
  exits: ['right'],
  rerollCount: 0,
});
const items = new Map(
  [
    item('o1', 'origin_stone'),
    item('o2', 'origin_fire'),
    item('s1', 'sword'),
    item('s2', 'sword'),
    item('s3', 'dagger'),
    item('s4', 'greatsword'),
    item('f1', 'torch'),
    item('d1', 'wood_shield'),
    item('d2', 'iron_shield'),
  ].map((i) => [i.uid, i]),
);

function put(l: Loadout, uid: string, cell: number): Loadout {
  const r = stackPut(l, items, uid, cell);
  expect(r.block).toBeNull();
  return r.loadout;
}

describe('重ねる盤面（試作）: 置き方', () => {
  it('空きマスに置き、同じ属性なら上に重なる（3つまで）', () => {
    let l = emptyStackBoard();
    expect([l.width, l.height]).toEqual([4, 3]);
    l = put(l, 's1', 1);
    l = put(l, 's2', 1);
    l = put(l, 's3', 1);
    expect(stackAt(l, 1)).toEqual(['s1', 's2', 's3']);
    expect(l.cells[1]).toBe('s3');
    expect(stackPut(l, items, 's4', 1).block).toBe('full');
  });

  it('属性が違う・防具と攻撃・起点石は重ならない', () => {
    let l = put(emptyStackBoard(), 's1', 1);
    expect(stackPut(l, items, 'f1', 1).block).toBe('group');
    expect(stackPut(l, items, 'd1', 1).block).toBe('group');
    l = put(l, 'o1', 0);
    expect(stackPut(l, items, 's2', 0).block).toBe('group');
    l = put(l, 'd1', 2);
    l = put(l, 'd2', 2);
    expect(stackAt(l, 2)).toEqual(['d1', 'd2']);
  });

  it('起点石は盤面に1つだけ', () => {
    let l = put(emptyStackBoard(), 'o1', 0);
    expect(l.originOrder).toEqual(['o1']);
    expect(stackPut(l, items, 'o2', 3).block).toBe('origin');
    l = stackTake(l, items, 'o1');
    expect(l.originOrder).toEqual([]);
    l = put(l, 'o2', 3);
    expect(l.originOrder).toEqual(['o2']);
  });

  it('外すと下の装備が一番上になる。重ねの中で上下を入れ替えられる', () => {
    let l = emptyStackBoard();
    for (const u of ['s1', 's2', 's3']) l = put(l, u, 5);
    l = stackShift(l, 's1', 1);
    expect(stackAt(l, 5)).toEqual(['s2', 's1', 's3']);
    l = stackShift(l, 's1', 1);
    expect(stackAt(l, 5)).toEqual(['s2', 's3', 's1']);
    expect(l.cells[5]).toBe('s1');
    // Already at the top: nothing moves
    expect(stackAt(stackShift(l, 's1', 1), 5)).toEqual(['s2', 's3', 's1']);
    l = stackTake(l, items, 's1');
    expect(stackAt(l, 5)).toEqual(['s2', 's3']);
    l = stackTake(l, items, 's2');
    expect(stackAt(l, 5)).toEqual(['s3']);
    l = stackTake(l, items, 's3');
    expect(stackAt(l, 5)).toEqual([]);
  });

  it('マスごと動かすと、行き先の重ねと入れ替わる', () => {
    let l = emptyStackBoard();
    l = put(l, 's1', 0);
    l = put(l, 's2', 0);
    l = put(l, 'd1', 3);
    l = stackMove(l, 0, 3);
    expect(stackAt(l, 3)).toEqual(['s1', 's2']);
    expect(stackAt(l, 0)).toEqual(['d1']);
    l = stackMove(l, 3, 7);
    expect(stackAt(l, 7)).toEqual(['s1', 's2']);
    expect(stackAt(l, 3)).toEqual([]);
  });

  it('置いてある装備を別のマスへ置くと、元の重ねから抜けて移る', () => {
    let l = put(put(emptyStackBoard(), 's1', 0), 's2', 0);
    l = put(l, 's1', 4);
    expect(stackAt(l, 0)).toEqual(['s2']);
    expect(stackAt(l, 4)).toEqual(['s1']);
  });

  it('読み直すと、決まりに合わない重ねは直る（起点石はひとりで1マス、重ねは同じ属性だけ）', () => {
    const rec: Loadout = {
      ...emptyStackBoard(),
      cells: ['s1', 'o2', 's2', ...new Array<string | null>(9).fill(null)],
      under: [['o1'], ['s3'], ['f1', 's4'], ...Array.from({ length: 9 }, () => [])],
      originOrder: ['o2'],
    };
    const back = restoreStackBoard(rec, items, 3);
    expect(stackAt(back, 0)).toEqual(['s1']);
    expect(stackAt(back, 1)).toEqual(['o2']);
    expect(stackAt(back, 2)).toEqual(['s4', 's2']);
    expect(back.originOrder).toEqual(['o2']);
  });

  it('読み直すと、もう持っていない装備は抜けて、下の装備が上がる', () => {
    let l = emptyStackBoard();
    for (const u of ['s1', 's2', 's3']) l = put(l, u, 2);
    l = put(l, 'o1', 0);
    const owned = new Map(items);
    owned.delete('s3');
    owned.delete('s1');
    const back = restoreStackBoard(JSON.parse(JSON.stringify(l)) as Loadout, owned, 3);
    expect(stackAt(back, 2)).toEqual(['s2']);
    expect(back.originOrder).toEqual(['o1']);
    // Nothing stored yet, or a board of another size: an empty 4x3 board
    expect(restoreStackBoard(null, owned, 3)).toEqual(emptyStackBoard());
  });
});
