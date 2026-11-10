import { describe, expect, it } from 'vitest';
import { auraTier } from '../src/core/aura';
import { build, type Placed } from './helpers';

const row = (rarities: ('common' | 'rare' | 'epic' | 'legendary')[], extra: Placed[] = []) =>
  build(6, 2, [
    ...rarities.map((r, i) => ({ uid: `s${i}`, defId: 'sword', x: i, y: 0, exits: [], rarity: r })),
    ...extra,
  ]);

describe('勇者のオーラ', () => {
  it('置いている装備のレアリティで段階が上がる（3つ以上で）', () => {
    const t = (r: Parameters<typeof row>[0]) => {
      const { loadout, items } = row(r);
      return auraTier(loadout, items);
    };
    expect(t(['common', 'common', 'rare', 'rare'])).toBe('none');
    expect(t(['rare', 'rare', 'epic'])).toBe('rare');
    expect(t(['epic', 'epic', 'legendary'])).toBe('epic');
    expect(t(['legendary', 'legendary', 'legendary'])).toBe('legendary');
  });

  it('アーティファクトを1つでも置けば虹色', () => {
    const { loadout, items } = row(
      ['common'],
      [{ uid: 'a', defId: 'dragon_fang', x: 0, y: 1, exits: ['right'], rarity: 'legendary' }],
    );
    expect(auraTier(loadout, items)).toBe('artifact');
  });
});
