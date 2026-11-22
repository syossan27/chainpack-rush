import { describe, expect, it } from 'vitest';
import { FRESH_SAVE_KEY, SAVE_KEY, olderKeysFor, pickSaveRaw, saveKeyFor } from '../../src/core/save';

describe('セーブの置き場所（版3は新しいキー）', () => {
  it('書き込むのは版3のキー（ふつうのセーブと、0から遊ぶセーブ）', () => {
    expect(SAVE_KEY).toBe('bp30.save.v3');
    expect(FRESH_SAVE_KEY).toBe('bp30.save.v3.fresh');
    expect(saveKeyFor('main')).toBe(SAVE_KEY);
    expect(saveKeyFor('fresh')).toBe(FRESH_SAVE_KEY);
  });

  it('版2・版1のキーは読むだけ（新しい順）', () => {
    expect(olderKeysFor('main')).toEqual(['bp30.save.v2', 'bp30.save.v1']);
    expect(olderKeysFor('fresh')).toEqual(['bp30.save.v2.fresh', 'bp30.save.v1.fresh']);
  });

  it('読むデータ: 新しいキーから順に、最初にあったもの（古い版は読み込みで移される）', () => {
    expect(pickSaveRaw(['v3', 'v2', 'v1'])).toBe('v3');
    expect(pickSaveRaw([null, 'v2', 'v1'])).toBe('v2');
    expect(pickSaveRaw([null, null, 'v1'])).toBe('v1');
    expect(pickSaveRaw([null, null, null])).toBeNull();
  });
});
