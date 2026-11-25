import { describe, expect, it } from 'vitest';
import { planChain } from '../../src/core/chain';
import {
  allShapes,
  anchorFor,
  coverCells,
  emptyShapeBoard,
  placeOver,
  putShaped,
  shapeOffsets,
  shapeSize,
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

describe('拾って組む: 装備の形', () => {
  it('ふつうの装備は1マス', () => {
    expect(shapeOffsets('sword')).toEqual([[0, 0]]);
  });

  it('大剣は横2マス', () => {
    expect(shapeSize('greatsword')).toEqual({ w: 2, h: 1 });
  });

  it('槍は縦3マス', () => {
    expect(shapeSize('spear')).toEqual({ w: 1, h: 3 });
  });

  it('戦斧はL字（右下が欠ける）', () => {
    expect(shapeOffsets('war_axe')).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
  });

  it('大槌はT字', () => {
    expect(shapeOffsets('hammer')).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ]);
  });

  it.each(allShapes().map((sh) => [sh.mask.join('/'), sh] as const))(
    '%s: どの向きの矢印も、形の外へ出る',
    (_, sh) => {
      const cells: [number, number][] = [];
      sh.mask.forEach((row, y) => [...row].forEach((c, x) => c === 'X' && cells.push([x, y])));
      const step = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
      for (const [d, k] of Object.entries(sh.ports)) {
        const [x, y] = cells[k]!;
        const [dx, dy] = step[d as Dir];
        expect(cells.some(([cx, cy]) => cx === x + dx && cy === y + dy)).toBe(false);
      }
    },
  );

  it('L字は欠けたマスをふさがない', () => {
    expect(coverCells(board(), 'war_axe', 1)).toEqual([1, 2, 5]);
  });

  it('置いたマスを形の左上にして、形のマスをふさぐ', () => {
    expect(coverCells(board(), 'tower_shield', 1)).toEqual([1, 2, 5, 6]);
  });

  it('はみ出すときは、盤面の内側へ寄せる', () => {
    expect(anchorFor(board(), 'greatsword', 3)).toBe(2);
    expect(anchorFor(board(), 'spear', 9)).toBe(1);
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

describe('拾って組む: 重ねて置く', () => {
  const gs = item('g', 'greatsword');
  const a = item('a', 'sword');
  const b = item('b', 'sword');
  const items = new Map([gs, a, b].map((i) => [i.uid, i]));
  const at = (pairs: [string, number][]) =>
    pairs.reduce((l, [uid, cell]) => putShaped(l, items, uid, cell).loadout, board());

  it('盤面の装備を別の装備に重ねると、2つの場所が入れ替わる', () => {
    const r = placeOver(
      at([
        ['a', 0],
        ['b', 5],
      ]),
      items,
      'a',
      5,
    );
    expect([r.loadout.cells[0], r.loadout.cells[5], r.displaced]).toEqual(['b', 'a', []]);
  });

  it('手札の装備を重ねると、元の装備は盤面から外れる', () => {
    const r = placeOver(at([['a', 0]]), items, 'b', 0);
    expect([r.loadout.cells[0], r.displaced]).toEqual(['b', ['a']]);
  });

  it('2つの装備にまたがって重ねると、両方とも外れる', () => {
    const r = placeOver(
      at([
        ['g', 0],
        ['a', 3],
      ]),
      items,
      'g',
      0,
    );
    const r2 = placeOver(
      at([
        ['a', 0],
        ['b', 1],
      ]),
      items,
      'g',
      0,
    );
    expect([r.displaced, r2.loadout.cells.slice(0, 2), r2.displaced]).toEqual([
      [],
      ['g', 'g'],
      ['a', 'b'],
    ]);
  });

  it('入れ替え先に入らない装備は、盤面から外れる', () => {
    // a spear (0, 4, 8); a sword at 3 moves onto it: the spear would need 3, 7, 11, but 7 is taken
    const sp = item('p', 'spear');
    const m = new Map([sp, a, b].map((i) => [i.uid, i]));
    const l = (
      [
        ['p', 0],
        ['a', 3],
        ['b', 7],
      ] as [string, number][]
    ).reduce((acc, [uid, cell]) => putShaped(acc, m, uid, cell).loadout, board());
    const r = placeOver(l, m, 'a', 4);
    expect([r.loadout.cells[3], r.loadout.cells[4], r.displaced]).toEqual([null, 'a', ['p']]);
  });

  it('起点石は起点石に重ねて取り替えられる', () => {
    const two = [item('o1', 'origin_stone'), item('o2', 'origin_stone')];
    const map = new Map(two.map((i) => [i.uid, i]));
    const l = putShaped(board(), map, 'o1', 0).loadout;
    expect(placeOver(l, map, 'o2', 0).displaced).toEqual(['o1']);
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

  it('矢印は決まったマスから出る（大剣の下向きは、先端の右のマスの下へだけ伝わる）', () => {
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
    expect(plan.steps.map((x) => x.uid)).toEqual(['o', 'g', 'b']);
  });

  it('大槌の下向きは、柄のマスから出る', () => {
    // o (3) → left into the head's right end (2); the hammer covers 0, 1, 2 and its handle 5
    const items = [
      item('o', 'origin_stone', ['left']),
      item('h', 'hammer', ['down']),
      item('s', 'sword', []),
    ];
    const l = place(items, [
      ['o', 3],
      ['h', 0],
      ['s', 9],
    ]);
    const plan = planChain(l, new Map(items.map((i) => [i.uid, i])), 'o');
    expect(plan.steps.map((x) => x.uid)).toEqual(['o', 'h', 's']);
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
