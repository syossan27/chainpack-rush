import { describe, expect, it } from 'vitest';
import { createInitialSave } from '../src/core/save';
import { itemMap } from '../src/core/economy';
import { checkRules } from '../src/core/challenge';
import {
  challengeLoadoutOf,
  enterChallengeEdit,
  fitToRules,
  leaveChallengeEdit,
} from '../src/core/challengeLoadout';
import { CHALLENGES } from '../src/data/challenges';
import { boardUids, emptyStackBoard, stackAt, stackPut, stackTake } from '../src/core/stack';
import type { ItemInstance, Loadout } from '../src/core/types';
import type { SaveData } from '../src/core/save';

const rare = CHALLENGES.find((c) => c.id === 'rare_rush')!.rules;
const noGuard = CHALLENGES.find((c) => c.id === 'no_guard')!.rules;

describe('挑戦用の編成', () => {
  it('編集の出入りで、ふだんの盤面は変わらず、挑戦用は別に残る', () => {
    const s = createInitialSave();
    const normal = JSON.stringify([s.loadout.cells, s.loadout.under]);
    enterChallengeEdit(s, rare);
    expect(s.loadout.board).toBe('standard');
    // Take the axe off the challenge layout
    const axe = s.inventory.find((i) => i.defId === 'axe')!.uid;
    s.loadout = stackTake(s.loadout, itemMap(s), axe);
    leaveChallengeEdit(s);
    expect(JSON.stringify([s.loadout.cells, s.loadout.under])).toBe(normal);
    expect(boardUids(challengeLoadoutOf(s, rare))).not.toContain(axe);
    expect(s.editingChallenge).toBeUndefined();
  });

  it('制限に合わせる: 一番上の代わりは、同じ装備で向きが同じもの', () => {
    const s = save([
      ['o', 'origin_stone', 'common', ['right']],
      ['e', 'sword', 'epic', ['right']],
      ['x1', 'sword', 'rare', ['right']],
      ['x2', 'sword', 'common', ['up']],
    ]);
    const board = put(s, [
      ['o', 0],
      ['e', 1],
    ]);
    expect(checkRules(board, itemMap(s), rare).length).toBeGreaterThan(0);
    const l = fitToRules(s, board, rare);
    expect(l.cells[1]).toBe('x1'); // 向きが同じものを選ぶ
    expect(checkRules(l, itemMap(s), rare)).toEqual([]);
    // もとの配置はそのまま
    expect(board.cells[1]).toBe('e');
  });

  it('防具なしなら防具を空ける', () => {
    const s = createInitialSave();
    const shield = s.inventory.find((i) => i.defId === 'wood_shield')!.uid;
    const g = fitToRules(s, s.loadout, noGuard);
    expect(boardUids(g)).not.toContain(shield);
    expect(checkRules(g, itemMap(s), noGuard)).toEqual([]);
  });

  it('起点がなければ、使える起点を1つ置く', () => {
    const s = createInitialSave();
    const empty = { ...s.loadout, cells: s.loadout.cells.map(() => null), originOrder: [] };
    const l = fitToRules(s, empty, rare);
    expect(l.originOrder.length).toBe(1);
    expect(l.cells.filter(Boolean)).toHaveLength(1);
  });

  it('重ねる盤面: 代わりは同じ装備の、制限内のレアリティ（斧には替えない）', () => {
    const s = save([
      ['o', 'origin_stone', 'common', ['right']],
      ['e1', 'sword', 'epic', ['right']],
      ['e2', 'sword', 'epic', ['right']],
      // The axe points the same way as the sword it would replace; the rare sword does not
      ['r1', 'sword', 'rare', ['up']],
      ['ax', 'axe', 'rare', ['right']],
    ]);
    const board = put(s, [
      ['o', 0],
      ['e1', 1],
      ['e2', 1],
    ]);
    const l = fitToRules(s, board, rare);
    // One rare sword stands in; the other epic has no stand-in and drops out
    expect(stackAt(l, 1)).toEqual(['r1']);
    expect(l.under![1]).toEqual([]);
    expect(checkRules(l, itemMap(s), rare)).toEqual([]);
  });

  it('重ねる盤面: 代わりがなければ外し、下のものが上がる', () => {
    const s = save([
      ['o', 'origin_stone', 'common', ['right']],
      ['c', 'sword', 'common', ['right']],
      ['e', 'sword', 'epic', ['down']],
    ]);
    const board = put(s, [
      ['o', 0],
      ['c', 1],
      ['e', 1],
    ]);
    const l = fitToRules(s, board, rare);
    expect(stackAt(l, 1)).toEqual(['c']);
    expect(l.cells[1]).toBe('c');
    expect(l.under![1]).toEqual([]);
  });

  it('重ねない連鎖では、各マスの一番上だけ残す', () => {
    const s = save([
      ['o', 'origin_stone', 'common', ['right']],
      ['a', 'sword', 'common', ['right']],
      ['b', 'sword', 'common', ['right']],
    ]);
    const board = put(s, [
      ['o', 0],
      ['a', 1],
      ['b', 1],
    ]);
    const rules = CHALLENGES.find((c) => c.id === 'no_stack')!.rules;
    const l = fitToRules(s, board, rules);
    expect(stackAt(l, 1)).toEqual(['b']);
    expect(checkRules(l, itemMap(s), rules)).toEqual([]);
  });

  it('重ねた分と盤面の種類は、合わせても落ちない', () => {
    const s = save([
      ['o', 'origin_stone', 'common', ['right']],
      ['a', 'sword', 'common', ['right']],
      ['b', 'sword', 'common', ['right']],
    ]);
    const board = put(s, [
      ['o', 0],
      ['a', 1],
      ['b', 1],
    ]);
    const l = fitToRules(s, board, rare);
    expect(l.board).toBe('standard');
    expect(l.under![1]).toEqual(['a']);
    expect(l.cells[1]).toBe('b');
  });
});

/** A save that owns exactly this gear */
function save(list: [string, string, ItemInstance['rarity'], ItemInstance['exits']][]): SaveData {
  const s = createInitialSave();
  s.inventory = list.map(([uid, defId, rarity, exits]) => ({
    uid,
    defId,
    rarity,
    exits,
    rerollCount: 0,
  }));
  return s;
}

/** A standard stacked board with the save's gear put on cells in order (later ones on top) */
function put(s: SaveData, list: [string, number][]): Loadout {
  const items = itemMap(s);
  let l = emptyStackBoard('standard');
  for (const [uid, cell] of list) l = stackPut(l, items, uid, cell).loadout;
  return l;
}
