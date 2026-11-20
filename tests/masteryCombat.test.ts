import { describe, expect, it } from 'vitest';
import { MASTERY, NO_LUCK } from '../src/config/balance';
import {
  BASE_HERO_STATS,
  Combat,
  type CombatEvent,
  type RunConfig,
  type RunMastery,
} from '../src/core/combat';
import { TECHNIQUE_MULT } from '../src/data/techniques';
import { build } from './helpers';

/** トリプル・スラッシュ (sword → sword → greatsword) on a line, then one more sword */
function tripleBoard() {
  return build(5, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
    { uid: 'g', defId: 'greatsword', x: 3, y: 0, exits: ['right'] },
    { uid: 'c', defId: 'sword', x: 4, y: 0, exits: [] },
  ]);
}

function cfg(mastery: RunMastery | undefined): RunConfig {
  const { loadout, items } = tripleBoard();
  return {
    seed: 7,
    regionId: 'grassland',
    loadout,
    items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6 },
    luck: NO_LUCK,
    ...(mastery ? { mastery } : {}),
  };
}

/** Events of the first chain (until it ends) */
function firstChain(c: Combat): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let i = 0; i < 60 * 60; i++) {
    c.step();
    for (const e of c.drainEvents()) {
      out.push(e);
      if (e.type === 'chainEnd') return out;
    }
  }
  throw new Error('no chain');
}

const hitsOf = (evs: CombatEvent[], uid: string) =>
  evs
    .filter((e) => e.type === 'hit' && e.itemUid === uid)
    .map((e) => (e as { damage: number }).damage);

/** A level whose spark chance is 100% */
const sure = Math.ceil(1 / MASTERY.sparkPerLevel);

describe('熟練と閃き: 必殺技は閃くまで出ない', () => {
  it('切り替えがないふだんの出撃では、並べればそのまま出る（今まで通り）', () => {
    const evs = firstChain(new Combat(cfg(undefined)));
    expect(evs.filter((e) => e.type === 'technique').map((e) => (e as { id: string }).id)).toEqual([
      'triple',
    ]);
    expect(evs.some((e) => e.type === 'spark')).toBe(false);
  });

  it('覚えていない必殺技は、その属性の熟練が0だと出ず、一撃も強くならない', () => {
    const plain = firstChain(new Combat(cfg(undefined)));
    const evs = firstChain(new Combat(cfg({ levels: {}, learned: [] })));
    expect(evs.some((e) => e.type === 'technique' || e.type === 'spark')).toBe(false);
    expect(hitsOf(evs, 'g')[0]).toBeCloseTo(hitsOf(plain, 'g')[0]! / TECHNIQUE_MULT, 1);
  });

  it('閃いたら、その一撃が必殺技になって覚える。次の連鎖からは閃きなしで出る', () => {
    const c = new Combat(cfg({ levels: { physical: sure }, learned: [] }));
    const first = firstChain(c);
    const spark = first.find((e) => e.type === 'spark') as { id: string; uid: string } | undefined;
    expect(spark?.id).toBe('triple');
    expect(spark?.uid).toBe('g');
    expect(first.some((e) => e.type === 'technique')).toBe(true);
    expect(c.stats.sparks).toEqual(['triple']);
    const second = firstChain(c);
    expect(second.some((e) => e.type === 'technique')).toBe(true);
    expect(second.some((e) => e.type === 'spark')).toBe(false);
  });

  it('かかしでは、覚えていない技は出ず、閃かない', () => {
    const c = new Combat({ ...cfg({ levels: { physical: sure }, learned: [] }), mode: 'dummy' });
    const evs: CombatEvent[] = [];
    c.fireNext();
    for (let i = 0; i < 600; i++) {
      c.step();
      evs.push(...c.drainEvents());
    }
    expect(evs.some((e) => e.type === 'hit')).toBe(true);
    expect(evs.some((e) => e.type === 'spark' || e.type === 'technique')).toBe(false);
  });

  it('覚えている必殺技は、熟練が0でも並べれば出る', () => {
    const evs = firstChain(new Combat(cfg({ levels: {}, learned: ['triple'] })));
    expect(evs.some((e) => e.type === 'technique')).toBe(true);
    expect(evs.some((e) => e.type === 'spark')).toBe(false);
  });
});

describe('熟練と閃き: 熟練がたまり、強くなる', () => {
  it('攻撃の装備が鳴るたびに、その属性の熟練が1たまる', () => {
    const c = new Combat(cfg({ levels: {}, learned: [] }));
    const evs = firstChain(c);
    const rings = evs.filter((e) => e.type === 'step' && e.step !== null).length;
    expect(rings).toBe(4);
    expect(c.stats.rings).toEqual({ physical: 4 });
  });

  it('熟練レベル1ごとに、その属性のダメージが +3%', () => {
    const plain = firstChain(new Combat(cfg({ levels: {}, learned: ['triple'] })));
    const lv2 = firstChain(new Combat(cfg({ levels: { physical: 2 }, learned: ['triple'] })));
    expect(hitsOf(lv2, 'a')[0]).toBeCloseTo(
      hitsOf(plain, 'a')[0]! * (1 + 2 * MASTERY.dmgPerLevel),
      1,
    );
  });
});
