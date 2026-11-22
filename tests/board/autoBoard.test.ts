import { describe, expect, it } from 'vitest';
import { getBoard } from '../../src/data/boards';
import { autoBoard, boardScore } from '../../src/core/autoBoard';
import { boardDepth, isHole } from '../../src/core/boards';
import { simulateChain } from '../../src/core/chain';
import { Rng } from '../../src/core/rng';
import { boardUids, restoreStackBoard, stackAt } from '../../src/core/stack';
import type { ItemInstance } from '../../src/core/types';

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

/** The first save's gear: origin stone, two swords, an axe and a wooden shield */
const starter = (): ItemInstance[] => [
  item('o', 'origin_stone'),
  item('s1', 'sword'),
  item('s2', 'sword'),
  item('ax', 'axe'),
  item('sh', 'wood_shield'),
];
const map = (inv: readonly ItemInstance[]) => new Map(inv.map((i) => [i.uid, i]));

describe('重ねる盤面の自動配置', () => {
  it('最初の持ち物: 起点は1つ、剣は2つ重なり、全部が線に乗る', () => {
    const inv = starter();
    const l = autoBoard(inv, 'standard');
    expect(l.board).toBe('standard');
    expect(l.originOrder).toEqual(['o']);
    expect(l.cells.some((_, c) => ['s1', 's2'].every((u) => stackAt(l, c).includes(u)))).toBe(true);
    const reached = new Set(simulateChain(l, map(inv)).plans[0]!.steps.map((s) => s.uid));
    for (const u of boardUids(l)) expect(reached.has(u)).toBe(true);
    expect(boardUids(l).sort()).toEqual(['ax', 'o', 's1', 's2', 'sh']);
  });

  describe('同じ装備が盤面の深さより多いとき', () => {
    const depth = boardDepth(getBoard('standard'));
    const inv = [
      item('o', 'origin_stone'),
      ...Array.from({ length: depth + 1 }, (_, i) => item(`s${i}`, 'sword')),
      item('x', 'axe'),
    ];
    const byUid = map(inv);
    const l = autoBoard(inv, 'standard');
    const stacks = l.cells.map((_, c) => stackAt(l, c)).filter((s) => s.length > 0);

    it('盤面の深さまで重ね、それより多くは重ならない', () => {
      expect(Math.max(...stacks.map((s) => s.length))).toBe(depth);
    });

    it('違う装備は重ならない', () => {
      const kinds = stacks.map((s) => new Set(s.map((u) => byUid.get(u)!.defId)).size);
      expect(kinds.every((n) => n === 1)).toBe(true);
    });

    it('置ききれない装備はない', () => {
      expect(boardUids(l)).toHaveLength(inv.length);
    });
  });

  it.each(['crystal', 'flame', 'lightning'] as const)(
    '%s: 穴のマスには何も置かず、起点は1つ',
    (id) => {
      const inv = [item('o', 'origin_stone'), ...'abcdefgh'.split('').map((u) => item(u, 'axe'))];
      const l = autoBoard(inv, id);
      const def = getBoard(id);
      const onHoles = l.cells.map((_, c) => c).filter((c) => isHole(def, c) && stackAt(l, c).length);
      expect(onHoles).toEqual([]);
      expect(l.originOrder).toEqual(['o']);
    },
  );

  it('同じ持ち物なら、何度呼んでも同じ配置', () => {
    expect(autoBoard(starter(), 'standard')).toEqual(autoBoard(starter(), 'standard'));
  });

  it('rng ありでも、起点1つ・同じ装備だけ・深さまで・穴なしは守る（種を20通り）', () => {
    const inv = [
      item('o', 'origin_stone'),
      ...'abcde'.split('').map((u) => item(u, 'sword')),
      ...'fgh'.split('').map((u) => item(u, 'axe')),
      item('i', 'greatsword', 'rare'),
      item('j', 'wood_shield'),
    ];
    const byUid = map(inv);
    for (let seed = 1; seed <= 20; seed++) {
      for (const id of ['standard', 'crystal'] as const) {
        const l = autoBoard(inv, id, new Rng(seed));
        const fixed = restoreStackBoard(l, byUid, 0, id);
        expect(fixed.cells).toEqual(l.cells);
        expect(fixed.under).toEqual(l.under);
        expect(l.originOrder).toEqual(['o']);
      }
    }
  });

  it('起点がなければ空の盤面', () => {
    const l = autoBoard([item('s', 'sword')], 'standard');
    expect(boardUids(l)).toEqual([]);
    expect(l.board).toBe('standard');
  });

  it('強さ: 線がない配置は 0', () => {
    const empty = autoBoard([item('s', 'sword')], 'standard');
    expect(boardScore(empty, map([item('s', 'sword')]))).toBe(0);
  });

  it('強さ: 強い装備が増えると上がる', () => {
    const inv = starter();
    const base = boardScore(autoBoard(inv, 'standard'), map(inv));
    expect(base).toBeGreaterThan(0);
    const more = [...inv, item('g', 'greatsword', 'epic')];
    expect(boardScore(autoBoard(more, 'standard'), map(more))).toBeGreaterThan(base);
  });
});
