import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { usesRelics, usesTreasure } from '../src/core/trial';

const regular = { challenge: false, demo: false, regionId: 'grassland' };

describe('試作「レリック」「黄金ゴブリン」: 切り替え', () => {
  it('どちらも初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.trialRelic).toBe(false);
    expect(s.settings.trialTreasure).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.trialRelic = 'yes';
    data.settings.trialTreasure = 1;
    const bad = deserializeSave(JSON.stringify(data));
    expect(bad.settings.trialRelic).toBe(false);
    expect(bad.settings.trialTreasure).toBe(false);
    s.settings.trialRelic = true;
    s.settings.trialTreasure = true;
    const back = deserializeSave(serializeSave(s));
    expect(back.settings.trialRelic).toBe(true);
    expect(back.settings.trialTreasure).toBe(true);
  });

  it('使うのは、使える版でデバッグ機能と切り替えが ON の、ふつうの出撃だけ', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialRelic = true;
    s.settings.trialTreasure = true;
    for (const uses of [usesRelics, usesTreasure]) {
      expect(uses(s, true, regular)).toBe(true);
      expect(uses(s, false, regular)).toBe(false);
      expect(uses(s, true, { ...regular, challenge: true })).toBe(false);
      expect(uses(s, true, { ...regular, regionId: 'endless' })).toBe(false);
      expect(uses(s, true, { ...regular, demo: true })).toBe(false);
    }
    s.settings.trialRelic = false;
    expect(usesRelics(s, true, regular)).toBe(false);
    expect(usesTreasure(s, true, regular)).toBe(true);
    s.settings.debug = false;
    expect(usesTreasure(s, true, regular)).toBe(false);
  });
});
