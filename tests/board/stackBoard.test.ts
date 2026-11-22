import { describe, expect, it } from 'vitest';
import {
  emptyStackBoard,
  restoreStackBoard,
  stackAt,
  stackMove,
  stackPut,
  stackShift,
  stackTake,
} from '../../src/core/stack';
import { clearLoadout, cycleOriginOrder, removeItem, setConsumable } from '../../src/core/loadout';
import type { ItemInstance, Loadout } from '../../src/core/types';

const item = (
  uid: string,
  defId: string,
  rarity: ItemInstance['rarity'] = 'common',
): ItemInstance => ({
  uid,
  defId,
  rarity,
  exits: ['right'],
  rerollCount: 0,
});
const items = new Map(
  [
    item('o1', 'origin_stone'),
    item('o2', 'origin_far'),
    item('s1', 'sword'),
    item('s2', 'sword'),
    item('s3', 'dagger'),
    item('s4', 'greatsword'),
    item('f1', 'torch'),
    item('d1', 'wood_shield'),
    item('d2', 'iron_shield'),
    item('d3', 'wood_shield'),
    item('s5', 'sword', 'rare'),
    item('s6', 'sword', 'epic'),
    item('a1', 'dragon_fang', 'legendary'),
    item('a2', 'dragon_fang', 'legendary'),
  ].map((i) => [i.uid, i]),
);

function put(l: Loadout, uid: string, cell: number): Loadout {
  const r = stackPut(l, items, uid, cell);
  expect(r.block).toBeNull();
  return r.loadout;
}

describe('重ねる盤面: 置き方', () => {
  it('空きマスに置き、同じ装備なら上に重なる（レアリティは問わない、3つまで）', () => {
    let l = emptyStackBoard();
    expect([l.width, l.height]).toEqual([4, 3]);
    l = put(l, 's1', 1);
    l = put(l, 's5', 1);
    l = put(l, 's2', 1);
    expect(stackAt(l, 1)).toEqual(['s1', 's5', 's2']);
    expect(l.cells[1]).toBe('s2');
    expect(stackPut(l, items, 's6', 1).block).toBe('full');
  });

  it('違う装備は同じ属性でも重ならない。防具も同じ物だけ。起点石は重ならない', () => {
    let l = put(emptyStackBoard(), 's1', 1);
    expect(stackPut(l, items, 's3', 1).block).toBe('group');
    expect(stackPut(l, items, 's4', 1).block).toBe('group');
    expect(stackPut(l, items, 'f1', 1).block).toBe('group');
    expect(stackPut(l, items, 'd1', 1).block).toBe('group');
    l = put(l, 'o1', 0);
    expect(stackPut(l, items, 's2', 0).block).toBe('group');
    l = put(l, 'd1', 2);
    expect(stackPut(l, items, 'd2', 2).block).toBe('group');
    l = put(l, 'd3', 2);
    expect(stackAt(l, 2)).toEqual(['d1', 'd3']);
  });

  it('アーティファクトは重ねられない（同じものどうしでも、上にも下にも）。理由は別に知らせる', () => {
    let l = put(emptyStackBoard(), 'a1', 6);
    expect(stackPut(l, items, 'a2', 6).block).toBe('artifact');
    expect(stackPut(l, items, 's1', 6).block).toBe('artifact');
    l = put(l, 's1', 7);
    expect(stackPut(l, items, 'a1', 7).block).toBe('artifact');
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
    for (const u of ['s1', 's2', 's5']) l = put(l, u, 5);
    l = stackShift(l, 's1', 1);
    expect(stackAt(l, 5)).toEqual(['s2', 's1', 's5']);
    l = stackShift(l, 's1', 1);
    expect(stackAt(l, 5)).toEqual(['s2', 's5', 's1']);
    expect(l.cells[5]).toBe('s1');
    // Already at the top: nothing moves
    expect(stackAt(stackShift(l, 's1', 1), 5)).toEqual(['s2', 's5', 's1']);
    l = stackTake(l, items, 's1');
    expect(stackAt(l, 5)).toEqual(['s2', 's5']);
    l = stackTake(l, items, 's2');
    expect(stackAt(l, 5)).toEqual(['s5']);
    l = stackTake(l, items, 's5');
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

  it('読み直すと、決まりに合わない重ねは直る（起点石とアーティファクトはひとりで1マス、重ねは同じ装備だけ）', () => {
    const rec: Loadout = {
      ...emptyStackBoard(),
      cells: ['s1', 'o2', 's2', 'a1', ...new Array<string | null>(8).fill(null)],
      under: [['o1'], ['s3'], ['f1', 's4', 's5'], ['s6'], ...Array.from({ length: 8 }, () => [])],
      originOrder: ['o2'],
    };
    const back = restoreStackBoard(rec, items, 3);
    expect(stackAt(back, 0)).toEqual(['s1']);
    expect(stackAt(back, 1)).toEqual(['o2']);
    // The old rule (one element) let a dagger, a torch and a greatsword in: only the swords stay
    expect(stackAt(back, 2)).toEqual(['s5', 's2']);
    expect(stackAt(back, 3)).toEqual(['a1']);
    expect(back.originOrder).toEqual(['o2']);
  });

  it('読み直すと、もう持っていない装備は抜けて、下の装備が上がる', () => {
    let l = emptyStackBoard();
    for (const u of ['s1', 's2', 's5']) l = put(l, u, 2);
    l = put(l, 'o1', 0);
    const owned = new Map(items);
    owned.delete('s5');
    owned.delete('s1');
    const back = restoreStackBoard(JSON.parse(JSON.stringify(l)) as Loadout, owned, 3);
    expect(stackAt(back, 2)).toEqual(['s2']);
    expect(back.originOrder).toEqual(['o1']);
    // Nothing stored yet, or a board of another size: an empty 4x3 board
    expect(restoreStackBoard(null, owned, 3)).toEqual(emptyStackBoard());
  });
});

describe('盤面の種類: 形と深さ', () => {
  it('空の盤面は、その盤面の大きさと種類で作る', () => {
    const l = emptyStackBoard('lightning');
    expect([l.width, l.height]).toEqual([4, 5]);
    expect(l.board).toBe('lightning');
    expect(emptyStackBoard().board).toBe('standard');
  });

  it('穴には置けない', () => {
    const l = emptyStackBoard('crystal');
    expect(stackPut(l, items, 's1', 0).block).toBe('hole');
    expect(stackPut(l, items, 's1', 2).block).toBeNull();
  });

  it('全部外す・消耗品枠・発火順の操作をしても、盤面の種類は変わらない', () => {
    const l = stackPut(emptyStackBoard('crystal'), items, 's1', 2).loadout;
    expect(clearLoadout(l).board).toBe('crystal');
    expect(setConsumable(l, 0, null, 3).board).toBe('crystal');
    expect(removeItem(l, items, 's1').board).toBe('crystal');
    expect(cycleOriginOrder(l, 's1').board).toBe('crystal');
  });

  it('重なりごと動かす先が穴なら、動かさない', () => {
    const l = stackPut(emptyStackBoard('crystal'), items, 's1', 2).loadout;
    expect(stackMove(l, 2, 0)).toBe(l);
    expect(stackAt(stackMove(l, 2, 7), 7)).toEqual(['s1']);
  });

  it('深い盤面は1マスに4つまで重ねられる', () => {
    const more = new Map(items);
    more.set('s7', item('s7', 'sword'));
    let l = emptyStackBoard('deep');
    for (const u of ['s1', 's2', 's5', 's6']) {
      const r = stackPut(l, more, u, 4);
      expect(r.block).toBeNull();
      l = r.loadout;
    }
    expect(stackAt(l, 4)).toHaveLength(4);
    expect(stackPut(l, more, 's7', 4).block).toBe('full');
  });

  it('読み直すと、その盤面の形に合わせる（穴のマスの装備は外れる）。大きさが違えば空にする', () => {
    const rec: Loadout = {
      ...emptyStackBoard('crystal'),
      cells: ['s1', null, 's2', ...new Array<string | null>(17).fill(null)],
    };
    const back = restoreStackBoard(rec, items, 3, 'crystal');
    expect(back.cells[0]).toBeNull();
    expect(back.cells[2]).toBe('s2');
    expect(back.board).toBe('crystal');
    expect(restoreStackBoard(rec, items, 3, 'standard')).toEqual(emptyStackBoard('standard'));
  });
});
