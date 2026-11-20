import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { itemMap } from '../src/core/economy';
import { checkRules } from '../src/core/challenge';
import {
  challengeLoadoutOf,
  enterChallengeEdit,
  fitToRules,
  leaveChallengeEdit,
} from '../src/core/challengeLoadout';
import { CHALLENGES } from '../src/data/challenges';
import { setSave, getSave } from '../src/platform/store';
import { emptyStackBoard, stackAt, stackPut } from '../src/core/stack';
import type { ItemInstance, Loadout } from '../src/core/types';
import type { SaveData } from '../src/core/save';

const rare = CHALLENGES.find((c) => c.id === 'rare_rush')!.rules;
const noGuard = CHALLENGES.find((c) => c.id === 'no_guard')!.rules;

describe('挑戦用の編成', () => {
  it('編集の出入りで、ふだんの編成は変わらず、挑戦用は別に残る', () => {
    const s = createInitialSave();
    const normal = JSON.stringify(s.loadout.cells);
    enterChallengeEdit(s);
    expect(s.loadout.cells.every((c) => !c)).toBe(true);
    s.loadout.cells[0] = 'i1';
    s.loadout.originOrder = ['i1'];
    leaveChallengeEdit(s);
    expect(JSON.stringify(s.loadout.cells)).toBe(normal);
    expect(challengeLoadoutOf(s).cells[0]).toBe('i1');
    expect(s.editingChallenge).toBeUndefined();
  });

  it('編集中に閉じても、読み込み時にふだんの編成へ戻す', () => {
    const s = createInitialSave();
    const normal = JSON.stringify(s.loadout.cells);
    enterChallengeEdit(s);
    s.loadout.cells[3] = 'i3';
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.editingChallenge).toBe(true);
    setSave(loaded);
    const now = getSave();
    expect(now.editingChallenge).toBeUndefined();
    expect(JSON.stringify(now.loadout.cells)).toBe(normal);
    expect(challengeLoadoutOf(now).cells[3]).toBe('i3');
  });

  it('制限に合わせる: 合わない装備を同じ種類の使える装備に入れ替える', () => {
    const s = createInitialSave();
    // 置いている剣をエピックにして、倉庫に同じ向きのレアの剣を足す
    s.inventory.find((i) => i.uid === 'i3')!.rarity = 'epic';
    s.inventory.push({
      uid: 'x1',
      defId: 'sword',
      rarity: 'rare',
      exits: ['right'],
      rerollCount: 0,
    });
    s.inventory.push({
      uid: 'x2',
      defId: 'sword',
      rarity: 'common',
      exits: ['up'],
      rerollCount: 0,
    });
    expect(checkRules(s.loadout, itemMap(s), rare).length).toBeGreaterThan(0);
    const l = fitToRules(s, s.loadout, rare);
    expect(l.cells[1]).toBe('x1'); // 向きが同じものを選ぶ
    expect(checkRules(l, itemMap(s), rare)).toEqual([]);
    // ふだんの編成はそのまま
    expect(s.loadout.cells[1]).toBe('i3');
  });

  it('防具なしなら防具を空ける', () => {
    const s = createInitialSave();
    const g = fitToRules(s, s.loadout, noGuard);
    expect(g.cells.includes('i6')).toBe(false);
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
