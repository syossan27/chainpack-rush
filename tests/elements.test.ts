import { describe, expect, it } from 'vitest';
import { BOSS, LIGHT_DARK, POISON, SIM } from '../src/config/balance';
import { planChain } from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { estimateRoute } from '../src/core/estimate';
import type { Dir } from '../src/core/types';
import { build, type Placed } from './helpers';

const NO_LUCK = { critChance: 0, damageVariance: 0 };

/** One straight line on a 1-row grid: origin, then the items in order */
function line(defIds: string[]) {
  const placed: Placed[] = [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    ...defIds.map((defId, i) => ({
      uid: `i${i}`,
      defId,
      x: i + 1,
      y: 0,
      exits: (i < defIds.length - 1 ? ['right'] : []) as Dir[],
    })),
  ];
  return build(defIds.length + 1, 1, placed);
}

function fireAtDummy(defIds: string[], setup?: (c: Combat) => void) {
  const { loadout, items } = line(defIds);
  const c = new Combat({
    seed: 1,
    regionId: 'grassland',
    loadout,
    items,
    hero: BASE_HERO_STATS,
    mode: 'dummy',
    luck: NO_LUCK,
  });
  setup?.(c);
  c.fireNext();
  const evs: CombatEvent[] = [];
  while (c.chain) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return { c, evs, dummy: c.enemies[0]! };
}

describe('風: 毒を重ねて毒爆', () => {
  it('毒の敵に風を当てるたびに毒が1重ふえ、毎秒のダメージも重ねた数だけ増える', () => {
    const { c, dummy } = fireAtDummy(['poison_dagger', 'wind_sword', 'wind_sword']);
    expect(dummy.poisonLayers).toBe(3);
    // The scarecrow never dies: add up the poison damage shown over 2 seconds
    let dot = 0;
    for (let i = 0; i < 2 * SIM.ticksPerSecond; i++) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'hit' && e.dot) dot += e.damage;
    }
    expect(dot).toBeCloseTo(dummy.poisonDps * 3 * 2, 0);
  });

  it('配置の見積もりにも、風で重ねた毒が入る（同じ攻撃力の剣より大きい）', () => {
    const est = (defIds: string[]) => {
      const { loadout, items } = line(defIds);
      return estimateRoute(planChain(loadout, items, 'o'), items, 1).total;
    };
    expect(est(['poison_dagger', 'wind_sword', 'wind_sword'])).toBeGreaterThan(
      est(['poison_dagger', 'sword', 'sword']),
    );
  });

  it('毒のない敵には、風はふつうの攻撃', () => {
    const { dummy, evs } = fireAtDummy(['wind_sword', 'wind_sword']);
    expect(dummy.poisonLayers).toBe(0);
    expect(evs.some((e) => e.type === 'combo')).toBe(false);
  });

  it('重ね切った敵に風を当てると、残りの毒をまとめて与えて毒が消える', () => {
    const winds = Array.from({ length: POISON.maxLayers }, () => 'wind_sword');
    const { dummy, evs } = fireAtDummy(['poison_dagger', ...winds]);
    const combo = evs.find((e) => e.type === 'combo');
    expect(combo?.type === 'combo' && combo.name).toBe(POISON.burstName);
    const burst = evs.find((e) => e.type === 'hit' && e.combo === POISON.burstName);
    expect(burst?.type === 'hit' && burst.damage).toBeGreaterThan(0);
    expect(dummy.statuses.has('poison')).toBe(false);
    expect(dummy.poisonLayers).toBe(0);
  });
});

describe('光と闇', () => {
  it('交互につなぐとコンボが続く（封印 → 浄化 → 封印）', () => {
    const { evs } = fireAtDummy(['light_sword', 'dark_sword', 'light_sword', 'dark_sword']);
    const combos = evs.filter((e) => e.type === 'combo').map((e) => e.type === 'combo' && e.name);
    expect(combos).toEqual(['seal', 'purify', 'seal']);
  });

  it('浄化は勇者のHPを回復し、封印は敵の攻撃を遅くする', () => {
    const { c, dummy } = fireAtDummy(['dark_sword', 'light_sword', 'dark_sword'], (c) => {
      c.hp = 10;
    });
    expect(c.hp).toBeCloseTo(10 + c.maxHp * LIGHT_DARK.purifyHeal);
    expect(dummy.slowUntil).toBeGreaterThan(c.tick);
  });

  it('封印された敵は、攻撃のたまり方が遅い', () => {
    const { loadout, items } = line(['sword']);
    const c = new Combat({
      seed: 3,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
    });
    // Walk until an enemy hits the hero (it is in range from then on)
    let attacker: number | null = null;
    for (let i = 0; i < 60 * 60 && attacker === null; i++) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'heroHit') attacker = e.enemyId;
    }
    const e = c.enemies.find((x) => x.id === attacker)!;
    const gain = (sealed: boolean) => {
      e.slowUntil = sealed ? c.tick + 1000 : -1;
      const t0 = e.attackTimer;
      for (let i = 0; i < 6; i++) c.step();
      return e.attackTimer - t0;
    };
    const normal = gain(false);
    const slow = gain(true);
    expect(normal).toBeCloseTo(6 * SIM.fixedStep);
    expect(slow).toBeCloseTo(6 * SIM.fixedStep * LIGHT_DARK.sealSlow);
  });

  it('呪縛の敵の攻撃は弱くなる', () => {
    const { c } = fireAtDummy(['sword']);
    const hit = (
      c as unknown as {
        damageHero(e: { id: number; atk: number; statuses: Map<string, number> }): void;
      }
    ).damageHero.bind(c);
    c.defense = 0;
    const hp0 = c.hp;
    hit({ id: -1, atk: 10, statuses: new Map([['bound', 999]]) });
    expect(hp0 - c.hp).toBeCloseTo(10 * (1 - LIGHT_DARK.boundAtkDown));
  });
});

describe('打撃の粉砕は、ボスの守り（一撃○○未満を無効）を崩す', () => {
  it('粉砕のあと、しばらくは弱い一撃も通る', () => {
    const { c } = fireAtDummy(['sword']);
    const priv = c as unknown as {
      guardStops(e: unknown, dmg: number): boolean;
      comboEffect(e: unknown, name: string): void;
    };
    const knight = {
      def: { ability: 'damageThreshold', threshold: BOSS.ironKnightThreshold },
      guardBrokenUntil: -1,
    };
    expect(priv.guardStops(knight, 10)).toBe(true);
    priv.comboEffect(knight, 'shatter');
    expect(priv.guardStops(knight, 10)).toBe(false);
    expect(knight.guardBrokenUntil).toBe(c.tick + BOSS.guardBreakSeconds * SIM.ticksPerSecond);
  });
});
