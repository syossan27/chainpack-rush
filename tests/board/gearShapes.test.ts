import { describe, expect, it } from 'vitest';
import { SHAPE } from '../../src/config/balance';
import { planChain } from '../../src/core/chain';
import { estimateRoute } from '../../src/core/estimate';
import { createItem } from '../../src/core/loot';
import { Rng } from '../../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { SHAPES, SHAPE_IDS, shapeOffsets, shapePower, type ShapeId } from '../../src/core/shapes';
import {
  boardUids,
  emptyStackBoard,
  restoreStackBoard,
  stackAt,
  stackMove,
  stackPut,
  stackTake,
} from '../../src/core/stack';
import type { Dir, ItemInstance, Loadout } from '../../src/core/types';

const item = (uid: string, defId: string, shape?: ShapeId, exits: Dir[] = ['right']) =>
  ({
    uid,
    defId,
    rarity: 'common',
    exits,
    rerollCount: 0,
    ...(shape ? { shape } : {}),
  }) as ItemInstance;

const mapOf = (list: ItemInstance[]) => new Map(list.map((i) => [i.uid, i]));

/** The standard board (6 × 5) with these pieces put on these cells, in order */
function place(list: ItemInstance[], at: [string, number][]): Loadout {
  const items = mapOf(list);
  return at.reduce((l, [uid, cell]) => {
    const r = stackPut(l, items, uid, cell);
    if (r.block) throw new Error(`${uid} on ${cell}: ${r.block}`);
    return r.loadout;
  }, emptyStackBoard('standard'));
}

describe('装備の形: 形の表', () => {
  it.each(SHAPE_IDS.map((id) => [id, SHAPES[id]] as const))(
    '%s: どの向きの矢印も、形の外へ出る',
    (_, sh) => {
      const cells = shapeOffsets(sh);
      const step = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
      for (const [d, k] of Object.entries(sh.ports)) {
        const [x, y] = cells[k]!;
        const [dx, dy] = step[d as Dir];
        expect(cells.some(([cx, cy]) => cx === x + dx && cy === y + dy)).toBe(false);
      }
    },
  );

  it('大きい形ほど強い（1マス増えるごとに SHAPE.powerPerCell）', () => {
    expect(shapePower(item('a', 'sword', 'tee'))).toBeCloseTo(1 + SHAPE.powerPerCell * 3);
  });
});

describe('装備の形: 拾うとき', () => {
  const rolled = (defId: string) =>
    Array.from({ length: 400 }, (_, i) => createItem(new Rng(i + 1), defId, 'rare', `x${i}`).shape);

  it('同じ剣でも、形がいろいろ出る', () => {
    expect(new Set(rolled('sword')).size).toBeGreaterThan(3);
  });

  it('1マスがいちばん多い', () => {
    const r = rolled('sword');
    expect(r.filter((s) => s === undefined).length).toBeGreaterThan(r.length / 2);
  });

  it('起点石と消耗品は、いつも1マス', () => {
    expect([...rolled('origin_stone'), ...rolled('potion')].every((s) => s === undefined)).toBe(
      true,
    );
  });

  it('形はセーブに残る', () => {
    const s = createInitialSave();
    s.inventory.push(item('z', 'sword', 'el'));
    expect(deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === 'z')!.shape).toBe(
      'el',
    );
  });
});

describe('装備の形: 置く・重ねる', () => {
  const big = item('g', 'greatsword', 'bar2');

  it('横2の装備は、置いたマスと右のマスに入る', () => {
    expect(place([big], [['g', 7]]).cells.slice(6, 10)).toEqual([null, 'g', 'g', null]);
  });

  it('右端に置くと、盤面の内側へ寄せる', () => {
    expect(place([big], [['g', 5]]).cells.slice(4, 6)).toEqual(['g', 'g']);
  });

  it('形のマスに別の装備があると置けない', () => {
    const l = place([item('s', 'sword')], [['s', 8]]);
    expect(stackPut(l, mapOf([big, item('s', 'sword')]), 'g', 7).block).toBe('space');
  });

  it('同じ装備・同じ形なら、その上に重なる（どのマスに落としても）', () => {
    const g2 = item('g2', 'greatsword', 'bar2');
    const l = place(
      [big, g2],
      [
        ['g', 7],
        ['g2', 8],
      ],
    );
    expect([stackAt(l, 7), stackAt(l, 8)]).toEqual([
      ['g', 'g2'],
      ['g', 'g2'],
    ]);
  });

  it('同じ装備でも形が違うと重ならない', () => {
    const l = place([big], [['g', 7]]);
    const one = item('g1', 'greatsword');
    expect(stackPut(l, mapOf([big, one]), 'g1', 7).block).toBe('space');
  });

  it('外すと、形のマスがすべて空く', () => {
    const l = stackTake(place([big], [['g', 7]]), mapOf([big]), 'g');
    expect(l.cells.every((c) => c === null)).toBe(true);
  });

  it('盤面の装備の一覧に、大きい装備は1回だけ入る', () => {
    expect(boardUids(place([big], [['g', 7]]))).toEqual(['g']);
  });
});

describe('装備の形: 動かす', () => {
  const big = item('g', 'greatsword', 'bar2');
  const s = item('s', 'sword');
  const items = mapOf([big, s]);

  it('空いた所へは、形ごと動く（左上を指定）', () => {
    const l = stackMove(place([big], [['g', 0]]), 0, 13, items);
    expect([l.cells[0], l.cells[13], l.cells[14]]).toEqual([null, 'g', 'g']);
  });

  it('ほかの装備に重ねると、入れ替わる', () => {
    const l = stackMove(
      place(
        [big, s],
        [
          ['g', 0],
          ['s', 13],
        ],
      ),
      0,
      13,
      items,
    );
    expect([l.cells[0], l.cells[13], l.cells[14]]).toEqual(['s', 'g', 'g']);
  });

  it('1マスどうしは、今までどおり入れ替わる', () => {
    const t = item('t', 'axe');
    const l = stackMove(
      place(
        [s, t],
        [
          ['s', 0],
          ['t', 1],
        ],
      ),
      0,
      1,
      mapOf([s, t]),
    );
    expect(l.cells.slice(0, 2)).toEqual(['t', 's']);
  });
});

describe('装備の形: 読み直す', () => {
  it('大きい装備は、形のまま同じ場所に戻る', () => {
    const big = item('g', 'greatsword', 'bar2');
    const l = restoreStackBoard(place([big], [['g', 7]]), mapOf([big]), 3, 'standard');
    expect(l.cells.slice(6, 10)).toEqual([null, 'g', 'g', null]);
  });
});

describe('装備の形: 連鎖', () => {
  it('2マスの装備でも、1回の連鎖で鳴るのは1回', () => {
    const list = [
      item('o', 'origin_stone'),
      item('g', 'greatsword', 'bar2'),
      item('s', 'sword', undefined, []),
    ];
    const l = place(list, [
      ['o', 0],
      ['g', 1],
      ['s', 3],
    ]);
    expect(planChain(l, mapOf(list), 'o').steps.map((x) => x.uid)).toEqual(['o', 'g', 's']);
  });

  it('矢印は決まったマスから出る（横2の下向きは、先端の右のマスの下へだけ伝わる）', () => {
    const list = [
      item('o', 'origin_stone'),
      item('g', 'greatsword', 'bar2', ['down']),
      item('a', 'sword', undefined, []),
      item('b', 'sword', undefined, []),
    ];
    const l = place(list, [
      ['o', 0],
      ['g', 1],
      ['a', 7],
      ['b', 8],
    ]);
    expect(planChain(l, mapOf(list), 'o').steps.map((x) => x.uid)).toEqual(['o', 'g', 'b']);
  });

  it('大きい装備の一撃は、マスの数だけ重い', () => {
    const one = [item('o', 'origin_stone'), item('g', 'greatsword', undefined, [])];
    const two = [item('o', 'origin_stone'), item('g', 'greatsword', 'bar2', [])];
    const total = (list: ItemInstance[]) => {
      const l = place(list, [
        ['o', 0],
        ['g', 1],
      ]);
      return estimateRoute(planChain(l, mapOf(list), 'o'), mapOf(list), 1, 'standard').total;
    };
    expect(total(two) / total(one)).toBeCloseTo(1 + SHAPE.powerPerCell);
  });
});
