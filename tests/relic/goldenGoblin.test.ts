import { describe, expect, it } from 'vitest';
import { NO_LUCK, SIM, TREASURE } from '../../src/config/balance';
import {
  BASE_HERO_STATS,
  Combat,
  type CombatEvent,
  type EnemyState,
  type RunConfig,
} from '../../src/core/combat';
import { getRegion } from '../../src/data/regions';
import { build } from '../helpers';

function line() {
  return build(4, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
    { uid: 'c', defId: 'axe', x: 3, y: 0, exits: [] },
  ]);
}

function cfg(over: Partial<RunConfig> = {}): RunConfig {
  const { loadout, items } = line();
  return {
    seed: 3,
    regionId: 'grassland',
    loadout,
    items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6 },
    luck: NO_LUCK,
    treasure: { chance: 1 },
    ...over,
  };
}

const goblinOf = (c: Combat): EnemyState | undefined => c.enemies.find((e) => e.treasure);

/** A seed where the treasure goblin is the first group of loop 1 (nothing stands before it) */
function seedWithGoblinFirst(): number {
  for (let seed = 1; seed < 200; seed++) {
    const c = new Combat(cfg({ seed }));
    const g = goblinOf(c)!;
    const others = c.enemies.filter((e) => !e.treasure && !e.def.boss);
    if (others.every((e) => e.x > g.x)) return seed;
  }
  throw new Error('no seed');
}

/** A seed where loop 1 also has an ordinary goblin to compare with */
function seedWithPlainGoblin(): number {
  for (let seed = 1; seed < 200; seed++) {
    const c = new Combat(cfg({ seed }));
    if (c.enemies.some((e) => e.defId === 'goblin' && !e.treasure)) return seed;
  }
  throw new Error('no seed');
}

function stepAll(c: Combat, ticks: number): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let i = 0; i < ticks && !c.ended; i++) {
    c.step();
    out.push(...c.drainEvents());
  }
  return out;
}

describe('黄金ゴブリン: 出てくるとき', () => {
  it('切り替えがなければ出ない', () => {
    const plain = cfg();
    delete plain.treasure;
    expect(goblinOf(new Combat(plain))).toBeUndefined();
  });

  it('群れ1つの代わりに、ゴブリン1体だけで出る', () => {
    const c = new Combat(cfg());
    const g = goblinOf(c)!;
    expect(g.defId).toBe('goblin');
    expect(c.enemies.filter((e) => e.group === g.group)).toHaveLength(1);
  });

  it('出たことを知らせる', () => {
    const c = new Combat(cfg());
    expect(c.drainEvents().some((e) => e.type === 'treasure' && e.phase === 'appear')).toBe(true);
  });

  it('硬さは、同じ周回のふつうのゴブリンの TREASURE.hpMult 倍', () => {
    const c = new Combat(cfg({ seed: seedWithPlainGoblin() }));
    const g = goblinOf(c)!;
    const plain = c.enemies.find((e) => e.defId === 'goblin' && !e.treasure)!;
    expect(g.maxHp / plain.maxHp).toBeCloseTo(TREASURE.hpMult, 6);
  });

  it('出てきたときは体力が満タン', () => {
    const g = goblinOf(new Combat(cfg()))!;
    expect(g.hp).toBe(g.maxHp);
  });

  it('1回の出撃で1度まで（次の周回には出ない）', () => {
    const strong = { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 1e4 };
    const c = new Combat(cfg({ hero: strong }));
    // Loop 1 has it (the event comes from the constructor)
    expect(c.drainEvents().filter((e) => e.type === 'treasure')).toHaveLength(1);
    const evs = stepAll(c, 60 * 60);
    expect(evs.some((e) => e.type === 'bossDefeated')).toBe(true);
    expect(evs.filter((e) => e.type === 'treasure' && e.phase === 'appear')).toHaveLength(0);
    expect(c.enemies.filter((e) => e.treasure && e.alive)).toHaveLength(0);
  });
});

describe('黄金ゴブリン: 倒すか、逃げられるか', () => {
  /** Beat the goblin at once: the events and the gold gained in the step it is caught */
  const catchIt = () => {
    const seed = seedWithGoblinFirst();
    const strong = { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 1e4 };
    const c = new Combat(cfg({ seed, hero: strong }));
    const id = goblinOf(c)!.id;
    for (let i = 0; i < 60 * 30; i++) {
      const goldBefore = c.stats.gold ?? 0;
      c.step();
      const evs = c.drainEvents();
      if (evs.some((e) => e.type === 'treasure' && e.phase === 'caught')) {
        const drops = evs.filter(
          (e): e is Extract<CombatEvent, { type: 'drop' }> => e.type === 'drop' && e.enemyId === id,
        );
        return { evs, drops, gold: (c.stats.gold ?? 0) - goldBefore };
      }
    }
    throw new Error('not caught');
  };

  it('倒すと、TREASURE.drops 個の装備を落とす', () => {
    expect(catchIt().drops).toHaveLength(TREASURE.drops);
  });

  it('倒して落ちる装備はすべてレア以上', () => {
    const rarities = catchIt().drops.map((e) => e.item.rarity);
    expect(rarities.filter((r) => r === 'common')).toEqual([]);
  });

  it('倒して落ちる装備の1個目はエピック以上', () => {
    expect(['epic', 'legendary']).toContain(catchIt().drops[0]!.item.rarity);
  });

  it('倒すと、ふつうの敵 TREASURE.goldKills 体ぶんの金貨', () => {
    expect(catchIt().gold).toBe(getRegion('grassland').goldPerKill * TREASURE.goldKills);
  });

  it('群れに1体だけだが、倒しても全滅ボーナスにはならない（倒した知らせが隠れない）', () => {
    const { evs } = catchIt();
    expect(evs.some((e) => e.type === 'timeBonus' && e.reason === 'sweep')).toBe(false);
  });

  /** Never hurt the goblin: the events until it has run off */
  const letItGo = () => {
    const seed = seedWithGoblinFirst();
    const zero = { ...BASE_HERO_STATS, maxHp: 1000, attackMult: 0 };
    const c = new Combat(cfg({ seed, hero: zero }));
    const g = goblinOf(c)!;
    const evs = stepAll(c, 60 * 30);
    return { g, evs };
  };

  it('倒せないと、前まで来てからしばらくで逃げていなくなる', () => {
    const { g, evs } = letItGo();
    expect(evs.find((e) => e.type === 'treasure' && e.phase === 'fled')).toBeDefined();
    expect(evs.some((e) => e.type === 'enemyDeath' && e.enemyId === g.id && e.fled)).toBe(true);
    expect(g.alive).toBe(false);
  });

  it('逃げたときは何も落とさない', () => {
    const { g, evs } = letItGo();
    expect(evs.some((e) => e.type === 'drop' && e.enemyId === g.id)).toBe(false);
  });

  it('黄金ゴブリンは攻撃してこない', () => {
    const { g, evs } = letItGo();
    expect(evs.some((e) => e.type === 'heroHit' && e.enemyId === g.id)).toBe(false);
  });

  it('時が止まっているあいだは、逃げるまでの時間も止まる', () => {
    const seed = seedWithGoblinFirst();
    const zero = { ...BASE_HERO_STATS, maxHp: 1000, attackMult: 0 };
    const c = new Combat(cfg({ seed, hero: zero }));
    const g = goblinOf(c)!;
    // Walk up to it
    for (let i = 0; i < 60 * 30 && g.fleeLeft === TREASURE.fleeSeconds * SIM.ticksPerSecond; i++)
      c.step();
    const left = g.fleeLeft;
    c.timeStopUntil = c.tick + 60 * 20;
    stepAll(c, TREASURE.fleeSeconds * SIM.ticksPerSecond * 2);
    expect(g.alive).toBe(true);
    expect(g.fleeLeft).toBe(left);
  });
});

describe('黄金ゴブリン: 1個目はエピック以上', () => {
  it('どの乱数でも、下限つきの戦利品はエピックかレジェンダリー', async () => {
    const { rollLoot } = await import('../../src/core/loot');
    const { Rng } = await import('../../src/core/rng');
    const rarities = Array.from(
      { length: 200 },
      (_, i) => rollLoot(new Rng(i + 1), 1, `x${i + 1}`, true, undefined, false, 'epic').rarity,
    );
    expect(rarities.filter((r) => r !== 'epic' && r !== 'legendary')).toEqual([]);
  });
});
