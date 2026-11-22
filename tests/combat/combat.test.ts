import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../../src/core/combat';
import {
  CHAIN_RULES,
  CHAIN_RULES_OFF,
  BOSS,
  CONSUMABLE,
  ELITES,
  FIELD,
  HERO,
  LOOT,
  LUCK,
  NO_LUCK,
  SIM,
  STATUS,
  TIME_BONUS,
  UPGRADES,
} from '../../src/config/balance';
import { planChain } from '../../src/core/chain';
import { findCombo } from '../../src/core/damage';
import { createInitialSave } from '../../src/core/save';
import { getEnemyDef } from '../../src/data/enemies';
import { getItemDef } from '../../src/data/items';
import { buyUpgrade, consumeItems, heroStats, itemMap, upgradeCost } from '../../src/core/economy';
import { build, specExample, type Placed } from '../helpers';
import type { Dir } from '../../src/core/types';
import { getRegion } from '../../src/data/regions';

type Ev<T extends CombatEvent['type']> = Extract<CombatEvent, { type: T }>;
const ofType = <T extends CombatEvent['type']>(evs: readonly CombatEvent[], type: T) =>
  evs.filter((e): e is Ev<T> => e.type === type);

/** The base hero with attack scaled by grassland's enemy HP, so kills land as in a 1× region */
const GRASS_HERO = {
  ...BASE_HERO_STATS,
  attackMult: BASE_HERO_STATS.attackMult * getRegion('grassland').power.hp,
};

function runAll(seed: number) {
  const save = createInitialSave();
  const c = new Combat({
    seed,
    regionId: 'grassland',
    loadout: save.loadout,
    items: itemMap(save),
    hero: BASE_HERO_STATS,
  });
  const events: CombatEvent[] = [];
  while (!c.ended) {
    c.step();
    events.push(...c.drainEvents());
  }
  return { c, events };
}

/** A board with only an origin stone that never attacks */
const originOnly = () => build(1, 1, [{ uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] }]);

/** Steps until the run ends and returns the combat */
const toEnd = (c: Combat) => {
  while (!c.ended) c.step();
  return c;
};

/** A fresh-save run whose consumable slots hold the given consumables (and nothing else) */
function withConsumables(defIds: string[]) {
  const save = createInitialSave();
  const items = itemMap(save);
  const uids = defIds.map((defId, i) => {
    const uid = `${defId}_${i}`;
    items.set(uid, { uid, defId, rarity: 'common', exits: [], rerollCount: 0 });
    return uid;
  });
  const loadout = { ...save.loadout, consumables: uids, consumableAuto: [] };
  return new Combat({
    seed: 1,
    regionId: 'grassland',
    loadout,
    items,
    hero: BASE_HERO_STATS,
    luck: NO_LUCK,
  });
}

/**
 * Two origins: the first fires `first` at the dummy, the second fires `second`.
 * Returns the events of the second firing.
 */
function secondFiring(first: string, second: string) {
  const { loadout, items } = build(
    3,
    2,
    [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: first, x: 1, y: 0, exits: [] },
      { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
      { uid: 'b', defId: second, x: 1, y: 1, exits: [] },
    ],
    ['o1', 'o2'],
  );
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
  for (let i = 0; i < 60; i++) c.step();
  c.drainEvents();
  c.fireNext();
  const evs: CombatEvent[] = [];
  for (let i = 0; i < 60; i++) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return evs;
}

describe('combat', () => {
  it('同じシード・同じ配置ならイベント列が完全に一致する', () => {
    const a = runAll(123);
    const b = runAll(123);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    expect(a.events.length).toBeGreaterThan(50);
  });

  describe('ランの終わり', () => {
    it('ランが終わると runEnd を出す', () => {
      const { events } = runAll(1);
      expect(ofType(events, 'runEnd')).toHaveLength(1);
    });

    it('時間切れのときは、出撃時間の時計がちょうど上限で終わる', () => {
      const { loadout, items } = originOnly();
      const c = toEnd(
        new Combat({
          seed: 1,
          regionId: 'grassland',
          loadout,
          items,
          hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
        }),
      );
      expect(c.ended).toBe('timeout');
      expect(c.clock).toBe(c.maxTicks);
    });

    it('倒れたときは、出撃時間の時計が上限に届く前に終わる', () => {
      const { loadout, items } = originOnly();
      const c = toEnd(
        new Combat({
          seed: 1,
          regionId: 'grassland',
          loadout,
          items,
          hero: { ...BASE_HERO_STATS, maxHp: 1 },
        }),
      );
      expect(c.ended).toBe('dead');
      expect(c.clock).toBeLessThan(c.maxTicks);
    });

    it('走っていた時間のぶん、ゲーム内の経過は出撃時間の時計より長い', () => {
      const { c } = runAll(1);
      expect(c.tick).toBeGreaterThan(c.clock);
    });
  });

  describe('連鎖中の勇者（守りの段なしのルール）', () => {
    /** Runs the spec example until its first chain ends, sampling the hero while it rings */
    const firstChain = () => {
      const { loadout, items } = specExample();
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
        rules: CHAIN_RULES_OFF,
      });
      const evs: CombatEvent[] = [];
      const during: { atb: number; unguarded: boolean }[] = [];
      while (!c.ended && ofType(evs, 'chainEnd').length === 0) {
        c.step();
        evs.push(...c.drainEvents());
        if (c.chain) during.push({ atb: c.atb, unguarded: c.unguarded });
      }
      return {
        plan: planChain(loadout, items, 'o1'),
        start: ofType(evs, 'chainStart')[0]!,
        end: ofType(evs, 'chainEnd')[0]!,
        during,
      };
    };

    it('連鎖中は ATB が 0 のまま止まる', () => {
      const { during } = firstChain();
      expect(during.length).toBeGreaterThan(0);
      expect(during.every((s) => s.atb === 0)).toBe(true);
    });

    it('連鎖中は無防備になる', () => {
      const { during } = firstChain();
      expect(during.length).toBeGreaterThan(0);
      expect(during.every((s) => s.unguarded)).toBe(true);
    });

    it('連鎖は計画の長さ（duration）だけ続く', () => {
      const { plan, start, end } = firstChain();
      expect(end.tick - start.tick).toBe(Math.round(plan.duration * SIM.ticksPerSecond));
    });

    it('連鎖が終わると、通った盾の防御値が加算される', () => {
      const { end } = firstChain();
      expect(end.defenseGain).toBe(getItemDef('wood_shield').defense);
    });
  });

  describe('状態とコンボ', () => {
    it('連鎖をまたいだ状態コンボ（1番で濡らし、2番の雷で感電）', () => {
      const evs = secondFiring('canteen', 'thunder_staff');
      const combo = ofType(evs, 'combo')[0];
      expect(combo?.name).toBe('shock');
    });

    it('感電した雷は、濡れていない相手への雷よりコンボ倍率の分だけ強い', () => {
      const shocked = ofType(secondFiring('canteen', 'thunder_staff'), 'hit')[0]!;
      const dry = ofType(secondFiring('sword', 'thunder_staff'), 'hit')[0]!;
      expect(shocked.damage / dry.damage).toBeCloseTo(findCombo('thunder', new Set(['wet']))!.mult);
    });

    it('状態がついた相手へは、コンボでなくても STATUS.exposedMult 倍のダメージ', () => {
      const evs = secondFiring('oil_bottle', 'sword');
      const exposed = ofType(evs, 'hit')[0]!;
      const dry = ofType(secondFiring('sword', 'sword'), 'hit')[0]!;
      expect(exposed.damage / dry.damage).toBeCloseTo(STATUS.exposedMult);
      expect(ofType(evs, 'combo')).toEqual([]);
    });
  });

  it('鉄の騎士は一撃が閾値（BOSS.ironKnightThreshold）未満のダメージを無効化する', () => {
    // A single sword hit stays under the threshold
    expect(getItemDef('sword').atk!).toBeLessThan(BOSS.ironKnightThreshold);
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
    const c = new Combat({ seed: 1, regionId: 'rampart', loadout, items, hero: BASE_HERO_STATS });
    // 雑魚を消して騎士を目の前に置く
    for (const e of c.enemies) if (!e.def.boss) e.alive = false;
    // ボスは抽選なので、鉄の騎士に差し替える
    const knight = c.enemies.find((e) => e.def.boss)!;
    knight.def = getEnemyDef('iron_knight');
    knight.defId = 'iron_knight';
    knight.x = c.heroX + 50;
    knight.aggro = true;
    c.atb = 99;
    c.step();
    for (let i = 0; i < 30; i++) c.step();
    const hits = ofType(c.drainEvents(), 'hit');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.nullified && h.damage === 0)).toBe(true);
    expect(knight.hp).toBe(knight.maxHp);
  });

  describe('狙いが倒れたとき', () => {
    // A line of five swords; the first target falls partway through the chain
    const fiveSwords = (rules?: { keepCountOnKill: boolean }) => {
      const { loadout, items } = build(6, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
        { uid: 'c', defId: 'sword', x: 3, y: 0, exits: ['right'] },
        { uid: 'd', defId: 'sword', x: 4, y: 0, exits: ['right'] },
        { uid: 'e', defId: 'sword', x: 5, y: 0, exits: [] },
      ]);
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: GRASS_HERO,
        ...(rules ? { rules } : {}),
      });
      const evs: CombatEvent[] = [];
      while (ofType(evs, 'chainEnd').length === 0) {
        c.step();
        evs.push(...c.drainEvents());
      }
      const hits = ofType(evs, 'hit').filter((h) => !h.dot);
      return {
        evs,
        steps: ofType(evs, 'step').flatMap((e) => (e.step === null ? [] : [e.step])),
        /** The first hit on an enemy other than the first target */
        moved: hits.find((h) => h.enemyId !== hits[0]!.enemyId),
      };
    };

    it('次の段から手前の敵へ移り、段数が1に戻る', () => {
      const { evs, moved } = fiveSwords();
      expect(ofType(evs, 'enemyDeath').length).toBeGreaterThan(0);
      expect(moved?.step).toBe(1);
    });

    it('keepCountOnKill: 狙いが倒れて次の敵へ移っても、段数は続く', () => {
      const { evs, steps, moved } = fiveSwords({ keepCountOnKill: true });
      expect(ofType(evs, 'enemyDeath').length).toBeGreaterThan(0);
      expect(steps).toEqual([1, 2, 3, 4, 5]);
      expect(moved!.step).toBeGreaterThan(1);
    });
  });

  describe('被ダメージ', () => {
    /** Hero hits taken in the spec example, with the defense the hero had before that tick */
    const heroHits = () => {
      const { loadout, items } = specExample();
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
      });
      const out: { hit: Ev<'heroHit'>; atk: number; defBefore: number; hpLost: number }[] = [];
      const enough = () =>
        out.length >= 5 && out.some((h) => h.hit.unguarded) && out.some((h) => !h.hit.unguarded);
      while (!c.ended && !enough()) {
        const hpBefore = c.hp;
        const defBefore = c.defense;
        c.step();
        for (const hit of ofType(c.drainEvents(), 'heroHit')) {
          const atk = c.enemies.find((x) => x.id === hit.enemyId)!.atk;
          out.push({ hit, atk, defBefore, hpLost: hpBefore - c.hp });
        }
      }
      return out;
    };

    it('ふだんの被ダメージは敵の攻撃力そのまま', () => {
      const guarded = heroHits().filter((h) => !h.hit.unguarded);
      expect(guarded.length).toBeGreaterThan(0);
      for (const h of guarded) expect(h.hit.damage + h.hit.absorbed).toBeCloseTo(h.atk);
    });

    it('無防備中の被ダメージは HERO.unguardedTakenMult 倍', () => {
      const unguarded = heroHits().filter((h) => h.hit.unguarded);
      expect(unguarded.length).toBeGreaterThan(0);
      for (const h of unguarded)
        expect((h.hit.damage + h.hit.absorbed) / h.atk).toBeCloseTo(HERO.unguardedTakenMult);
    });

    it('被ダメージは防御値から先に減る', () => {
      const hits = heroHits();
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((h) => h.hit.absorbed <= h.defBefore + 1e-9)).toBe(true);
      expect(hits.every((h) => h.hpLost >= 0)).toBe(true);
    });
  });

  describe('ゴブリン王', () => {
    const KING = getEnemyDef('goblin_king');
    // 攻撃しない配置（起点のみ）で観察する
    const kingFight = () => {
      const { loadout, items } = originOnly();
      const c = new Combat({
        seed: 1,
        regionId: 'cave',
        loadout,
        items,
        hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
      });
      for (const e of c.enemies) if (!e.def.boss) e.alive = false;
      // ボスは抽選なので、ゴブリン王に差し替えて観察する
      const king = c.enemies.find((e) => e.def.boss)!;
      king.def = KING;
      king.defId = 'goblin_king';
      king.x = c.heroX + 200;
      for (let i = 0; i < 10; i++) c.step();
      const escorts = () => c.enemies.filter((e) => e.alive && e.escort);
      return { c, king, escorts };
    };

    it('取り巻きを決まった数（escortCount）だけ呼ぶ', () => {
      expect(kingFight().escorts()).toHaveLength(KING.escortCount!);
    });

    it('取り巻きは王より手前に立つ', () => {
      const { king, escorts } = kingFight();
      expect(escorts().every((e) => e.x < king.x)).toBe(true);
    });

    it('倒された取り巻きは summonInterval 秒ごとに補充される', () => {
      const { c, escorts } = kingFight();
      escorts()[0]!.alive = false;
      expect(escorts()).toHaveLength(KING.escortCount! - 1);
      for (let i = 0; i < Math.round(KING.summonInterval! * 60) + 2; i++) c.step();
      expect(escorts()).toHaveLength(KING.escortCount!);
    });
  });
});

/** A strong line that clears the grassland fast */
const strong = () =>
  build(4, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'axe', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 'g', defId: 'greatsword', x: 2, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 'b', defId: 'axe', x: 3, y: 0, exits: [], rarity: 'legendary' },
  ]);
const strongHero = { ...BASE_HERO_STATS, attackMult: 3, maxHp: 1e6 };

/** Runs the strong line until the first boss falls */
function toFirstBoss() {
  const { loadout, items } = strong();
  const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: strongHero });
  const startMaxTicks = c.maxTicks;
  const evs: CombatEvent[] = [];
  while (!c.ended && c.bossesDefeated < 1) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return { c, evs, startMaxTicks, bonuses: ofType(evs, 'timeBonus') };
}

describe('ボス', () => {
  it('ボスは戦利品を LOOT.bossDrops 個落とす', () => {
    const { evs } = toFirstBoss();
    const death = ofType(evs, 'enemyDeath').find((e) => e.boss);
    expect(death).toBeDefined();
    const bossDrops = ofType(evs, 'drop').filter((e) => e.enemyId === death!.enemyId);
    expect(bossDrops).toHaveLength(LOOT.bossDrops);
  });
});

describe('時間の延長', () => {
  it('一網打尽（群れを1回の連鎖で全滅）で TIME_BONUS.sweep 秒延びる', () => {
    const { bonuses } = toFirstBoss();
    expect(bonuses.some((b) => b.reason === 'sweep' && b.seconds === TIME_BONUS.sweep)).toBe(true);
  });

  it('ボス撃破で TIME_BONUS.boss 秒延びる', () => {
    const { bonuses } = toFirstBoss();
    expect(bonuses.some((b) => b.reason === 'boss' && b.seconds === TIME_BONUS.boss)).toBe(true);
  });

  it('延びた秒数は stats.timeGained に記録され、出撃時間の上限に足される', () => {
    const { c, bonuses, startMaxTicks } = toFirstBoss();
    const gained = bonuses.reduce((s, b) => s + b.seconds, 0);
    expect(gained).toBeGreaterThan(0);
    expect(c.stats.timeGained).toBeCloseTo(gained);
    expect(c.maxTicks - startMaxTicks).toBe(Math.round(gained * SIM.ticksPerSecond));
  });

  it('延長に上限はない（60秒を超えて積み上がる）', () => {
    const { loadout, items } = strong();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: { ...strongHero, runTime: 58 },
    });
    while (!c.ended && c.bossesDefeated < 1) c.step();
    expect(Number.isFinite(TIME_BONUS.maxRunTime)).toBe(false);
    expect(c.maxTicks).toBeGreaterThan(60 * SIM.ticksPerSecond);
    expect(c.maxTicks).toBe((58 + c.stats.timeGained) * SIM.ticksPerSecond);
  });

  it('時の砂で出撃時間が CONSUMABLE.timeSandSeconds 秒延びる', () => {
    const c = withConsumables(['time_sand']);
    const before = c.maxTicks;
    expect(c.useConsumable(0)).toBe(true);
    expect(c.maxTicks - before).toBe(CONSUMABLE.timeSandSeconds * SIM.ticksPerSecond);
  });

  describe('永続強化「出撃時間」', () => {
    const def = UPGRADES.runTime;

    it('強化なしの出撃時間は SIM.runDuration', () => {
      expect(heroStats(createInitialSave()).runTime).toBe(SIM.runDuration);
    });

    it('最初の費用は baseCost', () => {
      expect(upgradeCost('runTime', 0)).toBe(def.baseCost);
    });

    it('費用は1段ごとに growth 倍', () => {
      const costs = Array.from({ length: def.maxLevel }, (_, lv) => upgradeCost('runTime', lv)!);
      const ratios = costs.slice(1).map((cost, i) => cost / costs[i]!);
      expect(ratios.length).toBeGreaterThan(0);
      expect(ratios.every((r) => Math.abs(r - def.growth) < 1e-9)).toBe(true);
    });

    it('1段ごとに effect 秒延び、maxLevel 段で止まる', () => {
      const s = createInitialSave();
      s.gold = 1e9;
      const times = [heroStats(s).runTime];
      for (let i = 0; i < def.maxLevel * 2; i++) {
        buyUpgrade(s, 'runTime');
        times.push(heroStats(s).runTime);
      }
      expect(s.upgrades.runTime).toBe(def.maxLevel);
      const gains = times.slice(1).map((t, i) => t - times[i]!);
      expect(gains.slice(0, def.maxLevel).every((g) => g === def.effect)).toBe(true);
      expect(gains.slice(def.maxLevel).every((g) => g === 0)).toBe(true);
    });
  });
});

describe('消耗品', () => {
  it('回復薬で HP が CONSUMABLE.healAmount 回復する', () => {
    const c = withConsumables(['potion']);
    c.hp = 10;
    expect(c.maxHp).toBeGreaterThanOrEqual(10 + CONSUMABLE.healAmount);
    expect(c.useConsumable(0)).toBe(true);
    expect(c.hp - 10).toBe(CONSUMABLE.healAmount);
  });

  it('使った消耗品は枠から消え、もう一度は使えない', () => {
    const c = withConsumables(['potion']);
    expect(c.useConsumable(0)).toBe(true);
    expect(c.useConsumable(0)).toBe(false);
  });

  it('号令ですぐ連鎖が始まる', () => {
    const c = withConsumables(['rally']);
    expect(c.useConsumable(0)).toBe(true);
    expect(c.chain).not.toBeNull();
  });

  it('連鎖中は号令を使えない', () => {
    const c = withConsumables(['rally', 'rally']);
    c.useConsumable(0);
    expect(c.chain).not.toBeNull();
    expect(c.useConsumable(1)).toBe(false);
  });

  it('雨乞いの符で画面内の敵に状態がつく', () => {
    const c = withConsumables(['rain_charm']);
    for (let i = 0; i < 30; i++) c.step();
    c.drainEvents();
    expect(c.useConsumable(0)).toBe(true);
    expect(ofType(c.drainEvents(), 'statusApplied').length).toBeGreaterThan(0);
  });

  it('爆弾は交戦中の全敵に CONSUMABLE.bombDamage を与える', () => {
    const c = withConsumables(['bomb']);
    while (c.engagedEnemies().length === 0) c.step();
    c.drainEvents();
    const engaged = c.engagedEnemies().length;
    expect(c.useConsumable(0)).toBe(true);
    const hits = ofType(c.drainEvents(), 'hit');
    expect(hits.length).toBeGreaterThanOrEqual(engaged);
    expect(hits.every((h) => h.damage === CONSUMABLE.bombDamage)).toBe(true);
  });

  it('幸運の硬貨を使うと、しばらく会心が出るようになる', () => {
    /** Crits while the coin lasts, from the moment the hero first meets enemies */
    const crits = (useCoin: boolean) => {
      // The scarecrow mode has no consumables, so this is a real run with a sword line
      const { loadout, items } = build(6, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        ...[1, 2, 3, 4, 5].map((x) => ({
          uid: `s${x}`,
          defId: 'sword',
          x,
          y: 0,
          exits: (x === 5 ? [] : ['right']) as Dir[],
        })),
      ]);
      items.set('coin', {
        uid: 'coin',
        defId: 'lucky_coin',
        rarity: 'common',
        exits: [],
        rerollCount: 0,
      });
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout: { ...loadout, consumables: ['coin'] },
        items,
        hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
        luck: NO_LUCK,
      });
      while (c.engagedEnemies().length === 0) c.step();
      c.drainEvents();
      if (useCoin) c.useConsumable(0);
      const hits: Ev<'hit'>[] = [];
      const until = c.tick + Math.floor(CONSUMABLE.critUpDuration * SIM.ticksPerSecond);
      while (!c.ended && c.tick < until) {
        c.step();
        hits.push(...ofType(c.drainEvents(), 'hit'));
      }
      expect(hits.length).toBeGreaterThan(0);
      return hits.filter((h) => h.crit).length;
    };
    expect(crits(false)).toBe(0);
    expect(crits(true)).toBeGreaterThan(0);
  });

  describe('使った消耗品', () => {
    const usedPotion = () => {
      const save = createInitialSave();
      const potion = save.loadout.consumables[0]!;
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout: save.loadout,
        items: itemMap(save),
        hero: BASE_HERO_STATS,
      });
      c.useConsumable(0);
      return { save, potion, result: c.runToEnd() };
    };

    it('ラン結果に残る', () => {
      const { potion, result } = usedPotion();
      expect(result.usedConsumables).toEqual([potion]);
    });

    it('確定すると倉庫と枠から消える', () => {
      const { save, potion, result } = usedPotion();
      consumeItems(save, result.usedConsumables);
      expect(save.inventory.some((i) => i.uid === potion)).toBe(false);
      expect(save.loadout.consumables).not.toContain(potion);
    });
  });
});

describe('接敵と連鎖の打ち切り', () => {
  it('連鎖は先頭の敵が目の前の立ち位置まで来てから始まる', () => {
    const { loadout, items } = specExample();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    let firstFire = -1;
    while (!c.ended && firstFire < 0) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'chainStart') firstFire = e.tick;
    }
    const front = c.enemies.filter((e) => e.alive).sort((a, b) => a.x - b.x)[0]!;
    expect(front.x - c.heroX).toBeLessThanOrEqual(FIELD.frontStand + 0.5);
  });

  describe('狙える敵がいなくなったとき', () => {
    // 斧（薙ぎ払い）→ 盾 → 剣×5 → 鉄の盾。最初の斧で群れが全滅したら、剣の段で打ち切る
    const sweepThenSwords = () => {
      const { loadout, items } = build(9, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'a', defId: 'axe', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
        { uid: 'w', defId: 'wood_shield', x: 2, y: 0, exits: ['right'] },
        { uid: 's1', defId: 'sword', x: 3, y: 0, exits: ['right'] },
        { uid: 's2', defId: 'sword', x: 4, y: 0, exits: ['right'] },
        { uid: 's3', defId: 'sword', x: 5, y: 0, exits: ['right'] },
        { uid: 's4', defId: 'sword', x: 6, y: 0, exits: ['right'] },
        { uid: 's5', defId: 'sword', x: 7, y: 0, exits: ['right'] },
        { uid: 'i', defId: 'iron_shield', x: 8, y: 0, exits: [] },
      ]);
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: { ...BASE_HERO_STATS, attackMult: 5 },
      });
      const evs: CombatEvent[] = [];
      while (!c.ended && ofType(evs, 'chainEnd').length === 0) {
        c.step();
        evs.push(...c.drainEvents());
      }
      return {
        c,
        plan: planChain(loadout, items, 'o'),
        start: ofType(evs, 'chainStart')[0]!,
        end: ofType(evs, 'chainEnd')[0]!,
      };
    };

    it('残りの段は打ち切り、計画より早く連鎖が終わる', () => {
      const { c, plan, start, end } = sweepThenSwords();
      expect(end.cut).toBe(true);
      // Ends before the last piece of the full plan would have rung
      expect(end.tick - start.tick).toBeLessThan(
        Math.round(plan.steps.at(-1)!.t * SIM.ticksPerSecond),
      );
      expect(c.chain).toBeNull();
    });

    it('防御値は打ち切りまでに通った盾の分だけ（鉄の盾には届かない）', () => {
      const { end } = sweepThenSwords();
      expect(end.defenseGain).toBe(getItemDef('wood_shield').defense);
    });
  });

  it('取り巻きのいないボスは目の前まで出てくる', () => {
    const { loadout, items } = originOnly();
    const c = new Combat({
      seed: 1,
      regionId: 'rampart',
      loadout,
      items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
    });
    for (const e of c.enemies) if (!e.def.boss) e.alive = false;
    // 取り巻きを呼ばないボス（鉄の騎士）に差し替える
    const boss = c.enemies.find((e) => e.def.boss)!;
    boss.def = getEnemyDef('iron_knight');
    boss.defId = 'iron_knight';
    for (let i = 0; i < 60 * 8; i++) c.step();
    const knight = c.enemies.find((e) => e.def.boss)!;
    expect(knight.standOffset).toBe(FIELD.bossSoloStand);
    expect(knight.x - c.heroX).toBeCloseTo(FIELD.bossSoloStand, 0);
  });
});

describe('出撃時間の時計', () => {
  it('走っているあいだは止まり、交戦中・連鎖中だけ進む', () => {
    const { loadout, items } = specExample();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    let runningTicks = 0;
    let clockWhileRunning = 0;
    for (let i = 0; i < 60 * 10 && !c.ended; i++) {
      const before = c.clock;
      c.step();
      if (c.running) {
        runningTicks++;
        clockWhileRunning += c.clock - before;
      }
    }
    expect(runningTicks).toBeGreaterThan(0);
    expect(clockWhileRunning).toBe(0);
  });
});

describe('連鎖の性格づけ（A: よろめき / B: 段数に比例する待ち / 守り）', () => {
  /** origin → n swords in one row */
  const line = (n: number) =>
    build(
      n + 2,
      1,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        ...Array.from({ length: n }, (_, k) => ({
          uid: `s${k + 1}`,
          defId: 'sword',
          x: k + 1,
          y: 0,
          exits: (k + 1 === n ? [] : ['right']) as Dir[],
        })),
      ],
      ['o'],
    );
  const dummy = (n: number) => {
    const { loadout, items } = line(n);
    return new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
    });
  };

  it('B: 連鎖が終わると、次の発火までの待ちは段数に比例する', () => {
    const wait = (n: number) => {
      const c = dummy(n);
      c.fireNext();
      while (c.chain) c.step();
      // The step that ends the chain already fills one step of the gauge
      return BASE_HERO_STATS.atbTime - (c.atb - SIM.fixedStep);
    };
    expect(wait(4) / wait(2)).toBeCloseTo(2);
  });

  it('B: 参照の段数（CHAIN_RULES.atbRefSteps）の連鎖なら、待ちはちょうど攻撃間隔', () => {
    const c = dummy(CHAIN_RULES.atbRefSteps);
    c.fireNext();
    while (c.chain) c.step();
    expect(c.atb - SIM.fixedStep).toBeCloseTo(0);
  });

  describe('守り', () => {
    const seen = () => {
      const c = dummy(5);
      c.fireNext();
      const out: { next: number; unguarded: boolean }[] = [];
      while (c.chain) {
        out.push({ next: c.chain.next, unguarded: c.unguarded });
        c.step();
      }
      return out;
    };

    it('CHAIN_RULES.guardSteps 段目までは無防備にならない', () => {
      const early = seen().filter((s) => s.next <= CHAIN_RULES.guardSteps);
      expect(early.length).toBeGreaterThan(0);
      expect(early.every((s) => !s.unguarded)).toBe(true);
    });

    it('CHAIN_RULES.guardSteps 段目を過ぎると無防備になる', () => {
      const late = seen().filter((s) => s.next > CHAIN_RULES.guardSteps);
      expect(late.length).toBeGreaterThan(0);
      expect(late.every((s) => s.unguarded)).toBe(true);
    });
  });

  it('無防備中に大きく被弾しても、連鎖は途切れない（よろめきは無くした）', () => {
    const c = dummy(5);
    c.fireNext();
    while (c.chain && !c.unguarded) c.step();
    c.drainEvents();
    const hit = (
      c as unknown as {
        damageHero(e: { id: number; atk: number; statuses: Map<string, number> }): void;
      }
    ).damageHero.bind(c);
    hit({
      id: -1,
      atk: (c.maxHp * 0.5) / HERO.unguardedTakenMult,
      statuses: new Map(),
    });
    const evs: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const end = evs.find((e) => e.type === 'chainEnd');
    expect(end?.type === 'chainEnd' && end.cut).toBe(false);
    expect(evs.filter((e) => e.type === 'step').length).toBeGreaterThan(0);
  });
});

describe('撤退', () => {
  /** A run that has picked something up and is still going (some fresh-save runs drop nothing) */
  const runWithDrop = () => {
    const save = createInitialSave();
    const start = (seed: number) =>
      new Combat({
        seed,
        regionId: 'grassland',
        loadout: save.loadout,
        items: itemMap(save),
        hero: BASE_HERO_STATS,
      });
    let c = start(1);
    for (let seed = 1; seed < 50; seed++) {
      c = start(seed);
      while (!c.ended && c.drops.length === 0) c.step();
      if (!c.ended) break;
    }
    expect(c.ended).toBeNull();
    return c;
  };

  it('撤退するとその場で終わり、runEnd の理由は retreat', () => {
    const c = runWithDrop();
    c.retreat();
    expect(c.ended).toBe('retreat');
    const end = ofType(c.drainEvents(), 'runEnd')[0];
    expect(end?.reason).toBe('retreat');
  });

  it('撤退しても、拾った戦利品は結果に残る', () => {
    const c = runWithDrop();
    const got = c.drops.length;
    c.retreat();
    expect(c.result().drops).toHaveLength(got);
  });

  it('カカシでは撤退できない', () => {
    const d = new Combat({
      ...specExample(),
      seed: 1,
      regionId: 'grassland',
      hero: BASE_HERO_STATS,
      mode: 'dummy',
    });
    d.retreat();
    expect(d.ended).toBeNull();
  });
});

describe('乱数（会心・揺れ・精鋭）と新しいボス', () => {
  const swords = () =>
    build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
  const hits = (luck: Partial<typeof LUCK>) => {
    const { loadout, items } = swords();
    const c = new Combat({
      seed: 9,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
      luck,
    });
    const out: Ev<'hit'>[] = [];
    for (let k = 0; k < 200; k++) {
      c.fireNext();
      while (c.chain) c.step();
      out.push(...ofType(c.drainEvents(), 'hit'));
    }
    return out;
  };
  /** The damage of the same hit without any luck */
  const plain = () => hits(NO_LUCK)[0]!.damage;

  it('運の要素がなければ、1段目のコモンの剣は攻撃力そのままのダメージ', () => {
    expect(plain()).toBe(getItemDef('sword').atk);
  });

  it('会心はダメージが LUCK.critMult 倍', () => {
    const base = plain();
    const always = hits({ ...NO_LUCK, critChance: 1 });
    expect(always.every((h) => h.crit && h.damage === base * LUCK.critMult)).toBe(true);
  });

  it('揺れは ±damageVariance の範囲に収まる', () => {
    const base = plain();
    const varied = hits({ ...NO_LUCK, damageVariance: 0.1 });
    expect(
      varied.every((h) => h.damage >= base * 0.9 - 1e-9 && h.damage <= base * 1.1 + 1e-9),
    ).toBe(true);
  });

  it('揺れでダメージがばらつく', () => {
    const varied = hits({ ...NO_LUCK, damageVariance: 0.1 });
    expect(new Set(varied.map((h) => h.damage)).size).toBeGreaterThan(5);
  });

  it('ふだんの会心は会心率（LUCK.critChance）に見合う頻度で出る', () => {
    const normal = hits({});
    const rate = normal.filter((h) => h.crit).length / normal.length;
    expect(rate).toBeGreaterThan(LUCK.critChance / 4);
    expect(rate).toBeLessThan(LUCK.critChance * 2.5);
  });

  describe('精鋭', () => {
    /** Fresh grassland runs where every eligible enemy may turn elite */
    const eliteRuns = () =>
      Array.from({ length: 40 }, (_, i) => {
        const save = createInitialSave();
        return new Combat({
          seed: i + 1,
          regionId: 'grassland',
          loadout: save.loadout,
          items: itemMap(save),
          hero: BASE_HERO_STATS,
          luck: { eliteChance: 1, eliteChanceMax: 1 },
        });
      });
    const elites = (runs: Combat[]) => runs.flatMap((c) => c.enemies.filter((e) => e.elite));

    it('ボスは精鋭にならない', () => {
      const all = elites(eliteRuns());
      expect(all.length).toBeGreaterThan(40);
      expect(all.every((e) => !e.def.boss)).toBe(true);
    });

    it('群れに1体まで', () => {
      const perGroup = eliteRuns().flatMap((c) => {
        const byGroup = new Map<number, number>();
        for (const e of c.enemies.filter((x) => x.elite))
          byGroup.set(e.group, (byGroup.get(e.group) ?? 0) + 1);
        return [...byGroup.values()];
      });
      expect(perGroup.length).toBeGreaterThan(0);
      expect(perGroup.every((n) => n === 1)).toBe(true);
    });

    it('硬い精鋭は HP が ELITES.tough.hp 倍', () => {
      const tough = elites(eliteRuns()).filter((e) => e.elite === 'tough');
      expect(tough.length).toBeGreaterThan(0);
      for (const e of tough)
        expect(e.maxHp).toBeCloseTo(e.def.hp * ELITES.tough.hp * getRegion('grassland').power.hp);
    });

    it('速い精鋭は攻撃間隔が ELITES.swift.interval 倍', () => {
      const swift = elites(eliteRuns()).filter((e) => e.elite === 'swift');
      expect(swift.length).toBeGreaterThan(0);
      for (const e of swift) expect(e.interval).toBeCloseTo(e.def.interval * ELITES.swift.interval);
    });

    it('金ぴかは倒すと ELITES.golden.drops 個、必ずレア以上を落とす', () => {
      const drops = eliteRuns().flatMap((c) => {
        const golden = c.enemies.find((e) => e.elite === 'golden');
        if (!golden) return [];
        (c as unknown as { killEnemy(e: unknown): void }).killEnemy(golden);
        return [ofType(c.drainEvents(), 'drop')];
      });
      expect(drops.length).toBeGreaterThan(0);
      expect(drops.every((d) => d.length === ELITES.golden.drops)).toBe(true);
      expect(drops.flat().every((d) => d.item.rarity !== 'common')).toBe(true);
    });
  });

  const bossFight = (bossId: string) => {
    const { loadout, items } = originOnly();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
    });
    for (const e of c.enemies) if (!e.def.boss) e.alive = false;
    const boss = c.enemies.find((e) => e.def.boss)!;
    boss.def = getEnemyDef(bossId);
    boss.defId = bossId;
    boss.interval = boss.def.interval;
    boss.x = c.heroX + 150;
    boss.aggro = true;
    return { c, boss };
  };

  it('呪術王は毎秒HPが回復する', () => {
    const { c, boss } = bossFight('lich');
    boss.hp = boss.maxHp * 0.5;
    for (let i = 0; i < 60; i++) c.step();
    expect(boss.hp).toBeCloseTo(boss.maxHp * (0.5 + BOSS.regenPerSec), 1);
  });

  it('ゴーレムはHPが BOSS.enrageAt を切ると激昂し、攻撃が速く強くなる', () => {
    const { c, boss } = bossFight('golem');
    const atk = boss.atk;
    boss.hp = boss.maxHp * (BOSS.enrageAt - 0.01);
    c.step();
    expect(boss.enraged).toBe(true);
    expect(boss.interval).toBeCloseTo(boss.def.interval * BOSS.enrageInterval);
    expect(boss.atk).toBeCloseTo(atk * BOSS.enrageAtk);
    expect(ofType(c.drainEvents(), 'enrage').length).toBeGreaterThan(0);
  });

  it.each(['slime_mother', 'bat_queen'])('%s は自分の取り巻きを escortCount 体呼ぶ', (id) => {
    const { c } = bossFight(id);
    for (let i = 0; i < 10; i++) c.step();
    const esc = c.enemies.filter((e) => e.alive && e.escort);
    expect(esc).toHaveLength(getEnemyDef(id).escortCount!);
    expect(esc.every((e) => e.defId === getEnemyDef(id).escortId)).toBe(true);
  });
});

describe('新しい装備', () => {
  const one = (defId: string, luck: Partial<typeof LUCK> = NO_LUCK) => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'w', defId, x: 1, y: 0, exits: [] },
    ]);
    const c = new Combat({
      seed: 3,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
      luck,
    });
    c.fireNext();
    while (c.chain) c.step();
    return c.drainEvents().filter((e) => e.type === 'hit');
  };

  it('双剣は1段で2回当たる', () => {
    expect(one('twin_blades')).toHaveLength(2);
  });

  it('聖剣は会心率が上がる（会心率0でも critBonus 程度の会心が出る）', () => {
    const critRate = (defId: string) => {
      let crits = 0;
      let total = 0;
      for (let k = 0; k < 300; k++) {
        const placed: Placed[] = [
          { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
          { uid: 'w', defId, x: 1, y: 0, exits: [] },
        ];
        const { loadout, items } = build(2, 1, placed);
        const c = new Combat({
          seed: k,
          regionId: 'grassland',
          loadout,
          items,
          hero: BASE_HERO_STATS,
          mode: 'dummy',
          luck: { ...NO_LUCK, critChance: 0 },
        });
        c.fireNext();
        while (c.chain) c.step();
        for (const h of ofType(c.drainEvents(), 'hit')) {
          total++;
          if (h.crit) crits++;
        }
      }
      return crits / total;
    };
    const bonus = getItemDef('holy_sword').critBonus!;
    const rate = critRate('holy_sword');
    expect(rate).toBeGreaterThan(critRate('sword'));
    expect(rate).toBeGreaterThan(bonus * 0.6);
    expect(rate).toBeLessThan(bonus * 1.5);
  });
});
