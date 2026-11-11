import { describe, expect, it } from 'vitest';
import { SHARE_TAG, shareText } from '../src/core/shareText';

describe('共有の文', () => {
  const base = {
    regionName: '洞窟',
    reachedLoop: 5,
    maxStep: 12,
    maxDamage: 12345.6,
    totalDamage: 99999,
  };
  it('地域・挑戦・エンドレスで見出しが変わり、タグが付く', () => {
    expect(shareText(base)).toContain('洞窟で5周目に到達');
    expect(shareText(base)).toContain('最大ダメージ 12,346');
    expect(shareText({ ...base, challengeName: 'レアの意地' })).toContain('スコア 99,999');
    expect(shareText({ ...base, endless: true })).toContain('エンドレスで5周目');
    expect(shareText(base).endsWith(SHARE_TAG)).toBe(true);
  });
});
