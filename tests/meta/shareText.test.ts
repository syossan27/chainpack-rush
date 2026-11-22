import { describe, expect, it } from 'vitest';
import { SHARE_TAG, shareText } from '../../src/core/shareText';

describe('共有の文', () => {
  const base = {
    regionName: '洞窟',
    reachedLoop: 5,
    maxStep: 12,
    maxDamage: 12345.6,
    totalDamage: 99999,
  };

  it('地域では「地域で N周目に到達」', () => {
    expect(shareText(base)).toContain('洞窟で5周目に到達');
  });

  it('最大ダメージは整数に丸めて桁区切りで出す', () => {
    expect(shareText(base)).toContain('最大ダメージ 12,346');
  });

  it('挑戦ではスコア（合計ダメージ）を出す', () => {
    expect(shareText({ ...base, challengeName: 'レアの意地' })).toContain('スコア 99,999');
  });

  it('エンドレスでは「エンドレスで N周目」', () => {
    expect(shareText({ ...base, endless: true })).toContain('エンドレスで5周目');
  });

  it('最後にタグが付く', () => {
    expect(shareText(base).endsWith(SHARE_TAG)).toBe(true);
  });
});
