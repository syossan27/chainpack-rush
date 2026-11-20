import { describe, expect, it } from 'vitest';
import { NO_LUCK, SIM, TREASURE } from '../src/config/balance';
import {
  BASE_HERO_STATS,
  Combat,
  type CombatEvent,
  type EnemyState,
  type RunConfig,
} from '../src/core/combat';
import { getEnemyDef } from '../src/data/enemies';
import { getRegion } from '../src/data/regions';
import { build } from './helpers';

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

  it('群れ1つの代わりに1体だけで出る。出たことを知らせる', () => {
    const c = new Combat(cfg());
    const g = goblinOf(c)!;
    expect(g.defId).toBe('goblin');
    expect(c.enemies.filter((e) => e.group === g.group)).toHaveLength(1);
    expect(c.drainEvents().some((e) => e.type === 'treasure' && e.phase === 'appear')).toBe(true);
  });

  it('硬さは、同じ周回のゴブリンの TREASURE.hpMult 倍', () => {
    const g = goblinOf(new Combat(cfg()))!;
    const plain = getEnemyDef('goblin').hp * getRegion('grassland').power.hp;
    expect(g.maxHp).toBeCloseTo(plain * TREASURE.hpMult, 6);
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
  it('倒すと、レア以上の装備4個（1個目はエピック以上）と、ふつうの敵10体ぶんの金貨', () => {
    const seed = seedWithGoblinFirst();
    const strong = { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 1e4 };
    const c = new Combat(cfg({ seed, hero: strong }));
    const id = goblinOf(c)!.id;
    let goldBefore = 0;
    let drops: CombatEvent[] = [];
    for (let i = 0; i < 60 * 30; i++) {
      goldBefore = c.stats.gold ?? 0;
      c.step();
      const evs = c.drainEvents();
      if (evs.some((e) => e.type === 'treasure' && e.phase === 'caught')) {
        drops = evs.filter((e) => e.type === 'drop' && e.enemyId === id);
        // Alone in its group, but not a sweep (its banner would hide the catch)
        expect(evs.some((e) => e.type === 'timeBonus' && e.reason === 'sweep')).toBe(false);
        break;
      }
    }
    expect(drops).toHaveLength(TREASURE.drops);
    const rarities = drops.map((e) => (e as { item: { rarity: string } }).item.rarity);
    expect(rarities.every((r) => r !== 'common')).toBe(true);
    expect(['epic', 'legendary']).toContain(rarities[0]);
    expect((c.stats.gold ?? 0) - goldBefore).toBe(
      getRegion('grassland').goldPerKill * TREASURE.goldKills,
    );
  });

  it('前まで来てから6秒で逃げる。何も落とさず、攻撃もしてこない', () => {
    const seed = seedWithGoblinFirst();
    const zero = { ...BASE_HERO_STATS, maxHp: 1000, attackMult: 0 };
    const c = new Combat(cfg({ seed, hero: zero }));
    const g = goblinOf(c)!;
    const evs = stepAll(c, 60 * 30);
    const fled = evs.find((e) => e.type === 'treasure' && e.phase === 'fled');
    expect(fled).toBeDefined();
    expect(evs.some((e) => e.type === 'enemyDeath' && e.enemyId === g.id && e.fled)).toBe(true);
    expect(evs.some((e) => e.type === 'drop' && e.enemyId === g.id)).toBe(false);
    expect(evs.some((e) => e.type === 'heroHit' && e.enemyId === g.id)).toBe(false);
    expect(g.alive).toBe(false);
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
    const { rollLoot } = await import('../src/core/loot');
    const { Rng } = await import('../src/core/rng');
    for (let seed = 1; seed <= 200; seed++) {
      const it = rollLoot(new Rng(seed), 1, `x${seed}`, true, undefined, false, 'epic');
      expect(['epic', 'legendary']).toContain(it.rarity);
    }
  });
});
