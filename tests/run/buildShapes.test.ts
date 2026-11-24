import { describe, expect, it } from 'vitest';
import { planChain } from '../../src/core/chain';
import {
  anchorFor,
  coverCells,
  emptyShapeBoard,
  putShaped,
  shapeOf,
  takeShaped,
} from '../../src/core/shapes';
import type { Dir, ItemInstance, Loadout } from '../../src/core/types';

const item = (uid: string, defId: string, exits: Dir[] = ['right']): ItemInstance => ({
  uid,
  defId,
  rarity: 'common',
  exits,
  rerollCount: 0,
});

/** 4 × 3 plain board: cells 0..3 / 4..7 / 8..11 */
const board = () => emptyShapeBoard(4, 3);

function place(items: ItemInstance[], at: [string, number][]): Loadout {
  const map = new Map(items.map((i) => [i.uid, i]));
  return at.reduce((l, [uid, cell]) => putShaped(l, map, uid, cell).loadout, board());
}

describe('拾って組む: 装備の大きさ', () => {
  it('ふつうの装備は1マス', () => {
    expect(shapeOf('sword')).toEqual({ w: 1, h: 1 });
  });

  it('大剣は横2マス', () => {
    expect(shapeOf('greatsword')).toEqual({ w: 2, h: 1 });
  });

  it('槍は縦2マス', () => {
    expect(shapeOf('spear')).toEqual({ w: 1, h: 2 });
  });

  it('大盾は2×2', () => {
    expect(shapeOf('tower_shield')).toEqual({ w: 2, h: 2 });
  });

  it('置いたマスを左上にして、大きさの分のマスをふさぐ', () => {
    expect(coverCells(board(), 'tower_shield', 1)).toEqual([1, 2, 5, 6]);
  });

  it('はみ出すときは、盤面の内側へ寄せる', () => {
    expect(anchorFor(board(), 'greatsword', 3)).toBe(2);
    expect(anchorFor(board(), 'spear', 9)).toBe(5);
  });
});

describe('拾って組む: 置く・外す', () => {
  const gs = item('g', 'greatsword');
  const sw = item('s', 'sword');
  const items = new Map([gs, sw].map((i) => [i.uid, i]));

  it('大剣は2マスに入る', () => {
    expect(putShaped(board(), items, 'g', 0).loadout.cells.slice(0, 3)).toEqual(['g', 'g', null]);
  });

  it('ふさがったマスに重なるときは置けない', () => {
    const l = putShaped(board(), items, 's', 1).loadout;
    expect(putShaped(l, items, 'g', 0).block).toBe('space');
  });

  it('動かすと、前にふさいでいたマスは空く', () => {
    const l = putShaped(putShaped(board(), items, 'g', 0).loadout, items, 'g', 4).loadout;
    expect(l.cells.slice(0, 6)).toEqual([null, null, null, null, 'g', 'g']);
  });

  it('外すと、ふさいでいたマスがすべて空く', () => {
    const l = takeShaped(putShaped(board(), items, 'g', 0).loadout, items, 'g');
    expect(l.cells.every((c) => c === null)).toBe(true);
  });

  it('起点石は盤面に1つだけ', () => {
    const two = [item('o1', 'origin_stone'), item('o2', 'origin_stone')];
    const map = new Map(two.map((i) => [i.uid, i]));
    const l = putShaped(board(), map, 'o1', 0).loadout;
    expect(putShaped(l, map, 'o2', 5).block).toBe('origin');
  });

  it('置いた起点石は発火順に入る', () => {
    const o = item('o', 'origin_stone');
    expect(putShaped(board(), new Map([['o', o]]), 'o', 0).loadout.originOrder).toEqual(['o']);
  });
});

describe('拾って組む: 大きい装備の連鎖', () => {
  it('2マスの装備でも、1回の連鎖で鳴るのは1回', () => {
    // o → greatsword (cells 1, 2) → sword
    const items = [item('o', 'origin_stone'), item('g', 'greatsword'), item('s', 'sword', [])];
    const l = place(items, [
      ['o', 0],
      ['g', 1],
      ['s', 3],
    ]);
    const plan = planChain(l, new Map(items.map((i) => [i.uid, i])), 'o');
    expect(plan.steps.map((x) => x.uid)).toEqual(['o', 'g', 's']);
  });

  it('矢印は装備の辺全体から出る（横2マスの下向きは、下の2マスへ伝わる）', () => {
    const items = [
      item('o', 'origin_stone', ['right']),
      item('g', 'greatsword', ['down']),
      item('a', 'sword', []),
      item('b', 'sword', []),
    ];
    const l = place(items, [
      ['o', 0],
      ['g', 1],
      ['a', 5],
      ['b', 6],
    ]);
    const plan = planChain(l, new Map(items.map((i) => [i.uid, i])), 'o');
    expect(plan.steps.map((x) => x.uid).sort()).toEqual(['a', 'b', 'g', 'o']);
  });

  it('どのマスに届いても鳴る（縦2マスの下側から入っても鳴る）', () => {
    // o at 4 → right into cell 5, the lower half of a spear on 1 and 5
    const items = [item('o', 'origin_stone'), item('p', 'spear', [])];
    const l = place(items, [
      ['o', 4],
      ['p', 1],
    ]);
    const plan = planChain(l, new Map(items.map((i) => [i.uid, i])), 'o');
    expect(plan.steps.map((x) => x.uid)).toEqual(['o', 'p']);
  });
});
