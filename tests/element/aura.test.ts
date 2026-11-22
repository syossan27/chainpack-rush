import { describe, expect, it } from 'vitest';
import { auraTier } from '../../src/core/aura';
import { build, type Placed } from '../helpers';

const row = (rarities: ('common' | 'rare' | 'epic' | 'legendary')[], extra: Placed[] = []) =>
  build(6, 2, [
    ...rarities.map((r, i) => ({ uid: `s${i}`, defId: 'sword', x: i, y: 0, exits: [], rarity: r })),
    ...extra,
  ]);

describe('勇者のオーラ', () => {
  it.each([
    [['common', 'common', 'rare', 'rare'], 'none'],
    [['rare', 'rare', 'epic'], 'rare'],
    [['epic', 'epic', 'legendary'], 'epic'],
    [['legendary', 'legendary', 'legendary'], 'legendary'],
  ] as const)(
    '置いている装備のレアリティで段階が上がる（3つ以上で）: %j → %s',
    (rarities, tier) => {
      const { loadout, items } = row([...rarities]);
      expect(auraTier(loadout, items)).toBe(tier);
    },
  );

  it('アーティファクトを1つでも置けば虹色', () => {
    const { loadout, items } = row(
      ['common'],
      [{ uid: 'a', defId: 'dragon_fang', x: 0, y: 1, exits: ['right'], rarity: 'legendary' }],
    );
    expect(auraTier(loadout, items)).toBe('artifact');
  });
});
