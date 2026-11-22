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

  it('配置画面の案内は board。前の版で loadout を見た人にも board は出る', () => {
    const keys: readonly string[] = TUTORIAL_KEYS;
    expect(keys).toContain('board');
    expect(keys).not.toContain('loadout');
    expect(keys).not.toContain('merge');
    const s = createInitialSave();
    s.tutorialSeen = ['home', 'loadout'];
    const again = deserializeSave(serializeSave(s));
    expect(again.tutorialSeen).not.toContain('board');
  });

  it('案内を入れる前のセーブ: もう遊んだ人には出さず、まだの人には出す', () => {
    const played = JSON.parse(serializeSave(createInitialSave()));
    delete played.tutorialSeen;
    played.stats.runs = 3;
    expect(deserializeSave(JSON.stringify(played)).tutorialSeen).toContain('run');
    expect(deserializeSave(JSON.stringify(played)).tutorialSeen).toContain('demo');
    // Every guide, including the tab guides added later
    for (const key of TUTORIAL_KEYS)
      expect(deserializeSave(JSON.stringify(played)).tutorialSeen).toContain(key);
    const fresh = JSON.parse(serializeSave(createInitialSave()));
    delete fresh.tutorialSeen;
    expect(deserializeSave(JSON.stringify(fresh)).tutorialSeen).toEqual([]);
  });
});
