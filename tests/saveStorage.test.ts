import { describe, expect, it } from 'vitest';
import {
  FRESH_SAVE_KEY,
  LEGACY_FRESH_SAVE_KEY,
  LEGACY_SAVE_KEY,
  SAVE_KEY,
  legacyKeyFor,
  pickSaveRaw,
  saveKeyFor,
} from '../src/core/save';

describe('セーブの置き場所（版2は新しいキー）', () => {
  it('版2のキーと、読むだけの版1のキー', () => {
    expect(SAVE_KEY).toBe('bp30.save.v2');
    expect(FRESH_SAVE_KEY).toBe('bp30.save.v2.fresh');
    expect(LEGACY_SAVE_KEY).toBe('bp30.save.v1');
    expect(LEGACY_FRESH_SAVE_KEY).toBe('bp30.save.v1.fresh');
    expect(saveKeyFor('main')).toBe(SAVE_KEY);
    expect(saveKeyFor('fresh')).toBe(FRESH_SAVE_KEY);
    expect(legacyKeyFor('main')).toBe(LEGACY_SAVE_KEY);
    expect(legacyKeyFor('fresh')).toBe(LEGACY_FRESH_SAVE_KEY);
  });

  it('読むデータ: 版2があればそれ、なければ版1（読み込みで移される）', () => {
    expect(pickSaveRaw('v2', 'v1')).toBe('v2');
    expect(pickSaveRaw(null, 'v1')).toBe('v1');
    expect(pickSaveRaw(null, null)).toBeNull();
  });
});
