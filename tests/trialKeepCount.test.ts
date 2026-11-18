import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { trialRules } from '../src/core/trial';

const regular = { challenge: false, demo: false, regionId: 'grassland' };

describe('試作「倒しても連鎖が続く」の切り替え', () => {
  it('初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.trialKeepCount).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.trialKeepCount = 'yes';
    expect(deserializeSave(JSON.stringify(data)).settings.trialKeepCount).toBe(false);
    delete data.settings.trialKeepCount;
    expect(deserializeSave(JSON.stringify(data)).settings.trialKeepCount).toBe(false);
    s.settings.trialKeepCount = true;
    expect(deserializeSave(serializeSave(s)).settings.trialKeepCount).toBe(true);
  });

  it('効くのは、その版で使えて、デバッグ機能と切り替えが両方 ON の、ふつうの出撃だけ', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialKeepCount = true;
    expect(trialRules(s, true, regular)).toEqual({ keepCountOnKill: true });
    // The release build ignores a save that still has it on
    expect(trialRules(s, false, regular)).toBeUndefined();
    // Runs that are ranked or scripted keep the real rule
    expect(trialRules(s, true, { ...regular, challenge: true })).toBeUndefined();
    expect(trialRules(s, true, { ...regular, regionId: 'endless' })).toBeUndefined();
    expect(trialRules(s, true, { ...regular, demo: true })).toBeUndefined();
    // Either switch off: the real rule
    s.settings.debug = false;
    expect(trialRules(s, true, regular)).toBeUndefined();
    s.settings.debug = true;
    s.settings.trialKeepCount = false;
    expect(trialRules(s, true, regular)).toBeUndefined();
  });
});
