import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../../src/config/balance';
import { planChain } from '../../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../../src/core/combat';
import { TECHNIQUE_MULT, TECHNIQUES } from '../../src/data/techniques';
import { getItemDef } from '../../src/data/items';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { build, type Placed } from '../helpers';

const line = (ids: string[]): Placed[] => [
  { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
  ...ids.map((d, i) => ({
    uid: `i${i}`,
    defId: d,
    x: i + 1,
    y: 0,
    exits: (i === ids.length - 1 ? [] : ['right']) as Placed['exits'],
  })),
];

/** Techniques found on one straight line of these items */
const techsOn = (ids: string[]) => {
  const { loadout, items } = build(ids.length + 1, 1, line(ids));
  return planChain(loadout, items, 'o')
    .steps.filter((s) => s.tech)
    .map((s) => s.tech);
};

/** The scarecrow's first chain on a straight line of these items */
const fireAtDummy = (ids: string[]) => {
  const { loadout, items } = build(ids.length + 1, 1, line(ids));
  const c = new Combat({
    seed: 1,
    regionId: 'grassland',
    loadout,
    items,
    hero: BASE_HERO_STATS,
    mode: 'dummy',
    luck: NO_LUCK,
  });
  c.fireNext();
  const evs: CombatEvent[] = [];
  while (c.chain) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return evs;
};

const lastHitDamage = (evs: CombatEvent[]) => {
  const hit = evs.filter((e) => e.type === 'hit').at(-1);
  return hit?.type === 'hit' ? hit.damage : NaN;
};

describe('必殺技', () => {
  it.each(TECHNIQUES.map((t) => [t.id, t] as const))('%s の並びは、すべて攻撃の装備', (_, t) => {
    expect(t.seq.flat().map((d) => getItemDef(d).kind)).toEqual(t.seq.flat().map(() => 'attack'));
  });

  it.each([
    ['決まった並び', ['oil_bottle', 'torch', 'flame_staff'], ['crimson']],
    [
      '前後に別の装備があっても並びの部分',
      ['sword', 'oil_bottle', 'flame_staff', 'flame_staff'],
      ['crimson'],
    ],
    ['別の候補の並び', ['sword', 'dagger', 'greatsword'], ['triple']],
  ])('%sの3つ目が必殺技になる', (_, ids, expected) => {
    expect(techsOn(ids)).toEqual(expected);
  });

  it.each([
    ['順番が違う', ['flame_staff', 'torch', 'oil_bottle']],
    ['間に別の装備が入る', ['oil_bottle', 'wood_shield', 'torch', 'flame_staff']],
  ])('%sと必殺技は成立しない', (_, ids) => {
    expect(techsOn(ids)).toEqual([]);
  });

  it('必殺技の一撃は、ふつうの一撃の TECHNIQUE_MULT 倍', () => {
    const withTech = lastHitDamage(fireAtDummy(['sword', 'sword', 'greatsword']));
    const without = lastHitDamage(fireAtDummy(['sword', 'axe', 'greatsword']));
    expect(withTech / without).toBeCloseTo(TECHNIQUE_MULT);
  });

  it('必殺技が出ると、演出用のイベントが出る（出なければ出ない）', () => {
    const withTech = fireAtDummy(['sword', 'sword', 'greatsword']);
    const without = fireAtDummy(['sword', 'axe', 'greatsword']);
    expect(withTech.some((e) => e.type === 'technique' && e.id === 'triple')).toBe(true);
    expect(without.some((e) => e.type === 'technique')).toBe(false);
  });
});

describe('必殺技図鑑', () => {
  it('はじめの図鑑（覚えた技）は空', () => {
    expect(createInitialSave().mastery.learned).toEqual([]);
  });

  it('覚えた技はセーブに残る', () => {
    const s = createInitialSave();
    s.mastery.learned.push('crimson');
    expect(deserializeSave(serializeSave(s)).mastery.learned).toEqual(['crimson']);
  });

  it('壊れた技の値は、読み直すときに捨てる', () => {
    const old = JSON.parse(serializeSave(createInitialSave()));
    old.mastery.learned = ['frost', 3, null];
    expect(deserializeSave(JSON.stringify(old)).mastery.learned).toEqual(['frost']);
  });

  it.each(TECHNIQUES.map((t) => [t.id, t] as const))(
    '%s には、見つける前のヒントがある',
    (_, t) => {
      expect(t.teaser.length).toBeGreaterThan(0);
    },
  );
});
