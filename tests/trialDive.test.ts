import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import {
  diveSwitchOn,
  sortieBoard,
  stackBoardOf,
  stackSwitchOn,
  trialRules,
  usesDive,
  usesStackBoard,
} from '../src/core/trial';

const regular = { challenge: false, demo: false, regionId: 'grassland' };

describe('試作「潜る」の切り替え', () => {
  it('切り替えは初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.trialDive).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.trialDive = 'on';
    expect(deserializeSave(JSON.stringify(data)).settings.trialDive).toBe(false);
    s.settings.trialDive = true;
    expect(deserializeSave(serializeSave(s)).settings.trialDive).toBe(true);
  });

  it('潜るのは、使える版でデバッグ機能と切り替えが ON の、ふつうの出撃だけ', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialDive = true;
    expect(diveSwitchOn(s, true)).toBe(true);
    expect(usesDive(s, true, regular)).toBe(true);
    expect(usesDive(s, false, regular)).toBe(false);
    expect(usesDive(s, true, { ...regular, challenge: true })).toBe(false);
    expect(usesDive(s, true, { ...regular, regionId: 'endless' })).toBe(false);
    expect(usesDive(s, true, { ...regular, demo: true })).toBe(false);
    s.settings.debug = false;
    expect(usesDive(s, true, regular)).toBe(false);
  });

  it('潜るときは重ねる盤面を使い、倒しても連鎖が続く（重ねる盤面の切り替えが OFF でも）', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialDive = true;
    expect(s.settings.trialStack).toBe(false);
    expect(stackSwitchOn(s, true)).toBe(true);
    expect(usesStackBoard(s, true, regular)).toBe(true);
    expect(trialRules(s, true, regular)).toEqual({ keepCountOnKill: true });
    expect(sortieBoard(s, true, 'grassland')).toEqual(stackBoardOf(s));
  });
});
