import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { TUTORIAL_KEYS } from '../../src/core/tutorialKeys';

describe('初心者向けの案内', () => {
  it('新しいセーブでは、まだどの案内も見ていない', () => {
    expect(createInitialSave().tutorialSeen).toEqual([]);
  });

  it('見た案内は保存される', () => {
    const s = createInitialSave();
    s.tutorialSeen = ['home', 'run'];
    expect(deserializeSave(serializeSave(s)).tutorialSeen).toEqual(['home', 'run']);
  });

  it('配置画面の案内は board（前の版の loadout・merge はもうない）', () => {
    const keys: readonly string[] = TUTORIAL_KEYS;
    expect(keys).toContain('board');
    expect(keys).not.toContain('loadout');
    expect(keys).not.toContain('merge');
  });

  it('前の版で loadout を見た人にも board は出る', () => {
    const s = createInitialSave();
    s.tutorialSeen = ['home', 'loadout'];
    const again = deserializeSave(serializeSave(s));
    expect(again.tutorialSeen).not.toContain('board');
  });

  describe('案内を入れる前のセーブ', () => {
    const oldSave = (runs: number) => {
      const data = JSON.parse(serializeSave(createInitialSave()));
      delete data.tutorialSeen;
      data.stats.runs = runs;
      return deserializeSave(JSON.stringify(data));
    };

    it('もう遊んだ人には、体験ランもあとで足したタブの案内も含めて、どの案内も出さない', () => {
      const seen = oldSave(3).tutorialSeen;
      expect(seen).toContain('demo');
      expect(seen).toEqual(expect.arrayContaining([...TUTORIAL_KEYS]));
    });

    it('まだ遊んでいない人には、案内を出す', () => {
      expect(oldSave(0).tutorialSeen).toEqual([]);
    });
  });
});
