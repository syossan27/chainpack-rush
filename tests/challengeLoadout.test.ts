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

const rare = CHALLENGES.find((c) => c.id === 'rare_rush')!.rules;
const one = CHALLENGES.find((c) => c.id === 'one_origin')!.rules;
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

  it('起点が多ければ発火順の後ろから外し、防具なしなら防具を空ける', () => {
    const s = createInitialSave();
    const l = fitToRules(s, s.loadout, one);
    expect(l.originOrder).toEqual(['i1']);
    expect(l.cells.includes('i2')).toBe(false);
    expect(checkRules(l, itemMap(s), one)).toEqual([]);
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
});
