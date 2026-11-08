import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
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
} from '../src/config/balance';
import { createInitialSave } from '../src/core/save';
import { getEnemyDef } from '../src/data/enemies';
import { buyUpgrade, consumeItems, heroStats, itemMap, upgradeCost } from '../src/core/economy';
import { build, specExample } from './helpers';
import type { Dir } from '../src/core/types';

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

describe('combat', () => {
  it('同じシード・同じ配置ならイベント列が完全に一致する', () => {
    const a = runAll(123);
    const b = runAll(123);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    expect(a.events.length).toBeGreaterThan(50);
  });

  it('30秒で終わり、runEnd を出す', () => {
    const { c, events } = runAll(1);
    const end = events.find((e) => e.type === 'runEnd');
    expect(end).toBeDefined();
    const limit = c.maxTicks;
    if (c.ended === 'timeout') expect(c.clock).toBe(limit);
    else expect(c.clock).toBeLessThan(limit);
    // 走っていた時間のぶん、ゲーム内の経過は出撃時間の時計より長い
    expect(c.tick).toBeGreaterThan(c.clock);
  });

  it('連鎖中は ATB が止まり、無防備になる。終了時に防御値が加算される（仕様どおりのルール）', () => {
    const { loadout, items } = specExample();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      rules: CHAIN_RULES_OFF,
    });
    // 交戦するまで進める
    let started: CombatEvent | undefined;
    let ended: CombatEvent | undefined;
    for (let i = 0; i < 60 * 20 && !ended; i++) {
      c.step();
      for (const e of c.drainEvents()) {
        if (e.type === 'chainStart' && !started) {
          started = e;
          expect(c.unguarded).toBe(true);
          expect(c.atb).toBe(0);
        }
        if (e.type === 'chainEnd' && !ended) ended = e;
      }
      if (started && !ended) expect(c.atb).toBe(0);
    }
    expect(started).toBeDefined();
    expect(ended).toBeDefined();
    if (ended?.type === 'chainEnd' && started?.type === 'chainStart') {
      expect(ended.tick - started.tick).toBe(Math.round(1.2 * 60));
      expect(ended.defenseGain).toBe(8);
    }
  });

  it('連鎖をまたいだ状態コンボ（1番で濡らし、2番の雷で感電）', () => {
    const { loadout, items } = build(
      3,
      2,
      [
        { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'w', defId: 'canteen', x: 1, y: 0, exits: [] },
        { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
        { uid: 't', defId: 'thunder_staff', x: 1, y: 1, exits: [] },
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
    const combo = evs.find((e) => e.type === 'combo');
    expect(combo?.type === 'combo' && combo.name).toBe('shock');
    const hit = evs.find((e) => e.type === 'hit');
    expect(hit?.type === 'hit' && hit.damage).toBeCloseTo(12 * 3);
  });

  it('鉄の騎士は一撃120未満を無効化する', () => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
    const c = new Combat({ seed: 1, regionId: 'rampart', loadout, items, hero: BASE_HERO_STATS });
    // 雑魚を消して騎士を目の前に置く
    for (const e of c.enemies) if (!e.def.boss) e.alive = false;
    const knight = c.enemies.find((e) => e.def.boss)!;
    knight.x = c.heroX + 50;
    knight.aggro = true;
    c.atb = 99;
    c.step();
    for (let i = 0; i < 30; i++) c.step();
    const hits = c.drainEvents().filter((e) => e.type === 'hit');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.type === 'hit' && h.nullified && h.damage === 0)).toBe(true);
    expect(knight.hp).toBe(knight.maxHp);
  });

  it('狙いが倒れたら次の段から手前の敵へ移り、段数が1に戻る', () => {
    // 剣×3の一本道。スライム(30HP)は 10+12=22, 3段目14.4 で倒れる → 4段目は次の敵へ、段数1
    const { loadout, items } = build(6, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 3, y: 0, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 4, y: 0, exits: ['right'] },
      { uid: 'e', defId: 'sword', x: 5, y: 0, exits: [] },
    ]);
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    const evs: CombatEvent[] = [];
    while (!evs.some((e) => e.type === 'chainEnd')) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const steps = evs
      .filter((e) => e.type === 'step' && e.step !== null)
      .map((e) => (e.type === 'step' ? e.step : 0));
    expect(steps).toEqual([1, 2, 3, 1, 2]);
  });

  it('無防備中の被ダメージは×1.5、防御値から先に減る', () => {
    const { loadout, items } = specExample();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    let checked = 0;
    while (!c.ended && checked < 5) {
      const hpBefore = c.hp;
      const defBefore = c.defense;
      c.step();
      for (const e of c.drainEvents()) {
        if (e.type !== 'heroHit') continue;
        const enemy = c.enemies.find((x) => x.id === e.enemyId)!;
        const expected = enemy.atk * (e.unguarded ? HERO.unguardedTakenMult : 1);
        expect(e.damage + e.absorbed).toBeCloseTo(expected);
        expect(e.absorbed).toBeLessThanOrEqual(defBefore + 1e-9);
        expect(hpBefore - c.hp).toBeGreaterThanOrEqual(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('消耗品: 回復薬、号令（連鎖中は不可）、雨乞いの符', () => {
    const save = createInitialSave();
    const items = itemMap(save);
    items.set('rally1', {
      uid: 'rally1',
      defId: 'rally',
      rarity: 'common',
      exits: [],
      rerollCount: 0,
    });
    items.set('rain1', {
      uid: 'rain1',
      defId: 'rain_charm',
      rarity: 'common',
      exits: [],
      rerollCount: 0,
    });
    const loadout = {
      ...save.loadout,
      consumables: [...save.loadout.consumables, 'rally1', 'rain1'],
    };
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    c.hp = 10;
    expect(c.useConsumable(0)).toBe(true);
    expect(c.hp).toBe(50);
    expect(c.useConsumable(0)).toBe(false); // 使うと消える
    expect(c.useConsumable(1)).toBe(true); // 号令
    expect(c.chain).not.toBeNull();
    for (let i = 0; i < 30; i++) c.step();
    c.drainEvents();
    expect(c.useConsumable(2)).toBe(true);
    const wet = c.drainEvents().filter((e) => e.type === 'statusApplied');
    expect(wet.length).toBeGreaterThan(0);
  });

  it('ゴブリン王は取り巻きを4体保つ', () => {
    // 攻撃しない配置（起点のみ）で観察する
    const { loadout, items } = build(1, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
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
    king.def = getEnemyDef('goblin_king');
    king.defId = 'goblin_king';
    king.x = c.heroX + 200;
    for (let i = 0; i < 10; i++) c.step();
    const escorts = () => c.enemies.filter((e) => e.alive && e.escort);
    expect(escorts()).toHaveLength(4);
    // 取り巻きは王より手前に立つ
    expect(escorts().every((e) => e.x < king.x)).toBe(true);
    // 倒されても一定間隔で補充される
    escorts()[0]!.alive = false;
    expect(escorts()).toHaveLength(3);
    for (let i = 0; i < Math.round(getEnemyDef('goblin_king').summonInterval! * 60) + 2; i++)
      c.step();
    expect(escorts()).toHaveLength(4);
  });
});

describe('時間の延長', () => {
  const strong = () =>
    build(4, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'axe', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
      { uid: 'g', defId: 'greatsword', x: 2, y: 0, exits: ['right'], rarity: 'legendary' },
      { uid: 'b', defId: 'axe', x: 3, y: 0, exits: [], rarity: 'legendary' },
    ]);
  const hero = { ...BASE_HERO_STATS, attackMult: 3, maxHp: 1e6 };

  it('ボスは戦利品を LOOT.bossDrops 個落とす', () => {
    const { loadout, items } = strong();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero });
    const evs: CombatEvent[] = [];
    while (!c.ended && c.bossesDefeated < 1) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const death = evs.find((e) => e.type === 'enemyDeath' && e.boss);
    expect(death).toBeDefined();
    const id = death!.type === 'enemyDeath' ? death!.enemyId : -1;
    const bossDrops = evs.filter((e) => e.type === 'drop' && e.enemyId === id);
    expect(bossDrops).toHaveLength(LOOT.bossDrops);
  });

  it('状態がついた相手へのコンボ以外の攻撃は ×1.2', () => {
    const { loadout, items } = build(
      3,
      2,
      [
        { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'w', defId: 'oil_bottle', x: 1, y: 0, exits: [] },
        { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
        { uid: 's', defId: 'sword', x: 1, y: 1, exits: [] },
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
    const hit = evs.find((e) => e.type === 'hit');
    expect(hit?.type === 'hit' && hit.damage).toBeCloseTo(10 * STATUS.exposedMult);
    expect(evs.some((e) => e.type === 'combo')).toBe(false);
  });

  it('一網打尽（群れを1回の連鎖で全滅）で +1.5秒、ボス撃破で +8秒', () => {
    const { loadout, items } = strong();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero });
    const bonuses: { reason: string; seconds: number }[] = [];
    while (!c.ended && c.bossesDefeated < 1) {
      c.step();
      for (const e of c.drainEvents())
        if (e.type === 'timeBonus') bonuses.push({ reason: e.reason, seconds: e.seconds });
    }
    expect(bonuses.some((b) => b.reason === 'sweep' && b.seconds === TIME_BONUS.sweep)).toBe(true);
    expect(bonuses.some((b) => b.reason === 'boss' && b.seconds === TIME_BONUS.boss)).toBe(true);
    const gained = bonuses.reduce((s, b) => s + b.seconds, 0);
    expect(c.stats.timeGained).toBeCloseTo(gained);
    expect(c.maxTicks).toBe(Math.round((SIM.runDuration + gained) * SIM.ticksPerSecond));
  });

  it('延長は上限60秒で止まる', () => {
    const { loadout, items } = strong();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: { ...hero, runTime: 58 },
    });
    while (!c.ended && c.bossesDefeated < 1) c.step();
    expect(c.maxTicks).toBe(TIME_BONUS.maxRunTime * SIM.ticksPerSecond);
  });

  it('使った消耗品はラン結果に残り、確定時に倉庫と枠から消える', () => {
    const save = createInitialSave();
    const potion = save.loadout.consumables[0]!;
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout: save.loadout,
      items: itemMap(save),
      hero: BASE_HERO_STATS,
    });
    expect(c.useConsumable(0)).toBe(true);
    const r = c.runToEnd();
    expect(r.usedConsumables).toEqual([potion]);
    consumeItems(save, r.usedConsumables);
    expect(save.inventory.some((i) => i.uid === potion)).toBe(false);
    expect(save.loadout.consumables).not.toContain(potion);
  });

  it('時の砂で +5秒', () => {
    const save = createInitialSave();
    const items = itemMap(save);
    items.set('sand', {
      uid: 'sand',
      defId: 'time_sand',
      rarity: 'common',
      exits: [],
      rerollCount: 0,
    });
    const loadout = { ...save.loadout, consumables: ['sand'] };
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    const before = c.maxTicks;
    expect(c.useConsumable(0)).toBe(true);
    expect(c.maxTicks - before).toBe(CONSUMABLE.timeSandSeconds * SIM.ticksPerSecond);
  });

  it('永続強化「出撃時間」: +2秒×5、費用は 300G から2倍ずつ', () => {
    const s = createInitialSave();
    expect(heroStats(s).runTime).toBe(SIM.runDuration);
    expect(upgradeCost('runTime', 0)).toBe(300);
    expect(upgradeCost('runTime', 4)).toBe(4800);
    s.gold = 1e9;
    for (let i = 0; i < 10; i++) buyUpgrade(s, 'runTime');
    expect(s.upgrades.runTime).toBe(5);
    expect(heroStats(s).runTime).toBe(SIM.runDuration + 10);
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

  it('狙える敵がいなくなったら残りの段は打ち切り、防御値は通った盾の分だけ', () => {
    // 斧（薙ぎ払い）→ 盾 → 剣×5 → 鉄の盾。最初の斧で群れが全滅したら、剣の段で打ち切る
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
    let end: CombatEvent | undefined;
    let start = -1;
    while (!c.ended && !end) {
      c.step();
      for (const e of c.drainEvents()) {
        if (e.type === 'chainStart' && start < 0) start = e.tick;
        if (e.type === 'chainEnd') end = e;
      }
    }
    expect(end?.type === 'chainEnd' && end.cut).toBe(true);
    if (end?.type === 'chainEnd') {
      expect(end.defenseGain).toBe(8); // 木の盾だけ（鉄の盾には届いていない）
      expect(end.tick - start).toBeLessThan(Math.round(1.6 * SIM.ticksPerSecond));
    }
    expect(c.chain).toBeNull();
  });

  it('取り巻きのいないボスは目の前まで出てくる', () => {
    const { loadout, items } = build(1, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
    const c = new Combat({
      seed: 1,
      regionId: 'rampart',
      loadout,
      items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
    });
    for (const e of c.enemies) if (!e.def.boss) e.alive = false;
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
  const long = () =>
    build(
      7,
      1,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        ...[1, 2, 3, 4, 5].map((x) => ({
          uid: `s${x}`,
          defId: 'sword',
          x,
          y: 0,
          exits: (x === 5 ? [] : ['right']) as Dir[],
        })),
      ],
      ['o'],
    );

  it('B: 連鎖が終わると、次の発火までの待ちは段数に比例する', () => {
    const { loadout, items } = long();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
    });
    c.fireNext();
    while (c.chain) c.step();
    const factor = 5 / CHAIN_RULES.atbRefSteps;
    // 連鎖が終わったステップでそのまま1ステップ分たまる
    expect(c.atb).toBeCloseTo(BASE_HERO_STATS.atbTime * (1 - factor) + SIM.fixedStep);
  });

  it('守り: guardSteps 段目までは無防備にならない', () => {
    const { loadout, items } = long();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
    });
    c.fireNext();
    const seen: [number, boolean][] = [];
    while (c.chain) {
      seen.push([c.chain.next, c.unguarded]);
      c.step();
    }
    for (const [next, ug] of seen) expect(ug).toBe(next > CHAIN_RULES.guardSteps);
  });

  it('A: 無防備中に最大HPの一定割合を受けると、よろめいて残りの段が途切れる', () => {
    const { loadout, items } = long();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
    });
    c.fireNext();
    while (c.chain && !c.unguarded) c.step();
    c.drainEvents();
    const hit = (
      c as unknown as { damageHero(e: { id: number; atk: number }): void }
    ).damageHero.bind(c);
    hit({ id: -1, atk: (c.maxHp * CHAIN_RULES.staggerRatio) / HERO.unguardedTakenMult + 1 });
    const evs: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const end = evs.find((e) => e.type === 'chainEnd');
    expect(end?.type === 'chainEnd' && end.staggered).toBe(true);
    expect(evs.filter((e) => e.type === 'step')).toHaveLength(0);
  });
});

describe('撤退', () => {
  it('撤退するとその場で終わり、拾った戦利品は結果に残る。カカシでは撤退できない', () => {
    const save = createInitialSave();
    const c = new Combat({
      seed: 3,
      regionId: 'grassland',
      loadout: save.loadout,
      items: itemMap(save),
      hero: BASE_HERO_STATS,
    });
    while (!c.ended && c.drops.length === 0) c.step();
    expect(c.ended).toBeNull();
    const got = c.drops.length;
    c.retreat();
    expect(c.ended).toBe('retreat');
    const end = c.drainEvents().find((e) => e.type === 'runEnd');
    expect(end?.type === 'runEnd' && end.reason).toBe('retreat');
    expect(c.result().drops).toHaveLength(got);

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
    const out: CombatEvent[] = [];
    for (let k = 0; k < 200; k++) {
      c.fireNext();
      while (c.chain) c.step();
      out.push(...c.drainEvents().filter((e) => e.type === 'hit'));
    }
    return out.filter((e): e is Extract<CombatEvent, { type: 'hit' }> => e.type === 'hit');
  };

  it('会心は ×critMult、揺れは ±damageVariance の範囲', () => {
    const always = hits({ ...NO_LUCK, critChance: 1 });
    expect(always.every((h) => h.crit && h.damage === 10 * LUCK.critMult)).toBe(true);
    const varied = hits({ ...NO_LUCK, damageVariance: 0.1 });
    expect(varied.every((h) => h.damage >= 9 - 1e-9 && h.damage <= 11 + 1e-9)).toBe(true);
    expect(new Set(varied.map((h) => h.damage)).size).toBeGreaterThan(5);
    const normal = hits({});
    const rate = normal.filter((h) => h.crit).length / normal.length;
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.2);
  });

  it('精鋭: 群れに1体まで。硬いはHP×3、金ぴかは必ずレア以上を落とす', () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const save = createInitialSave();
      const c = new Combat({
        seed,
        regionId: 'grassland',
        loadout: save.loadout,
        items: itemMap(save),
        hero: BASE_HERO_STATS,
        luck: { eliteChance: 1, eliteChanceMax: 1 },
      });
      const byGroup = new Map<number, number>();
      for (const e of c.enemies) {
        if (!e.elite) continue;
        seen++;
        expect(e.def.boss).toBe(false);
        byGroup.set(e.group, (byGroup.get(e.group) ?? 0) + 1);
        if (e.elite === 'tough') expect(e.maxHp).toBeCloseTo(e.def.hp * ELITES.tough.hp);
        if (e.elite === 'swift')
          expect(e.interval).toBeCloseTo(e.def.interval * ELITES.swift.interval);
      }
      expect([...byGroup.values()].every((n) => n === 1)).toBe(true);
      const golden = c.enemies.find((e) => e.elite === 'golden');
      if (golden) {
        (c as unknown as { killEnemy(e: unknown): void }).killEnemy(golden);
        const drops = c.drainEvents().filter((e) => e.type === 'drop');
        expect(drops).toHaveLength(ELITES.golden.drops);
        for (const d of drops) if (d.type === 'drop') expect(d.item.rarity).not.toBe('common');
      }
    }
    expect(seen).toBeGreaterThan(40);
  });

  const bossFight = (bossId: string) => {
    const { loadout, items } = build(1, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
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

  it('ゴーレムはHPが半分を切ると激昂し、攻撃が速く強くなる', () => {
    const { c, boss } = bossFight('golem');
    const atk = boss.atk;
    boss.hp = boss.maxHp * 0.49;
    c.step();
    expect(boss.enraged).toBe(true);
    expect(boss.interval).toBeCloseTo(boss.def.interval * BOSS.enrageInterval);
    expect(boss.atk).toBeCloseTo(atk * BOSS.enrageAtk);
    expect(c.drainEvents().some((e) => e.type === 'enrage')).toBe(true);
  });

  it('スライムの母・吸血女王は自分の取り巻きを呼ぶ', () => {
    for (const id of ['slime_mother', 'bat_queen']) {
      const { c } = bossFight(id);
      for (let i = 0; i < 10; i++) c.step();
      const esc = c.enemies.filter((e) => e.alive && e.escort);
      expect(esc).toHaveLength(getEnemyDef(id).escortCount!);
      expect(esc.every((e) => e.defId === getEnemyDef(id).escortId)).toBe(true);
    }
  });
});

describe('新しい装備と消耗品', () => {
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

  it('聖剣は会心率が上がる', () => {
    let crits = 0;
    let total = 0;
    for (let k = 0; k < 300; k++) {
      const { loadout, items } = build(2, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'w', defId: 'holy_sword', x: 1, y: 0, exits: [] },
      ]);
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
      for (const e of c.drainEvents())
        if (e.type === 'hit') {
          total++;
          if (e.crit) crits++;
        }
    }
    expect(crits / total).toBeGreaterThan(0.12);
    expect(crits / total).toBeLessThan(0.3);
  });

  it('爆弾は画面内の全敵にダメージ、幸運の硬貨は会心率を上げる', () => {
    const save = createInitialSave();
    const bomb = { uid: 'b', defId: 'bomb', rarity: 'common' as const, exits: [], rerollCount: 0 };
    const coin = {
      uid: 'c',
      defId: 'lucky_coin',
      rarity: 'common' as const,
      exits: [],
      rerollCount: 0,
    };
    save.inventory.push(bomb, coin);
    save.loadout.consumables = ['b', 'c'];
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout: save.loadout,
      items: itemMap(save),
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
    });
    while (c.engagedEnemies().length === 0) c.step();
    c.drainEvents();
    const before = c.engagedEnemies().map((e) => e.hp);
    expect(c.useConsumable(0)).toBe(true);
    const hits = c.drainEvents().filter((e) => e.type === 'hit');
    expect(hits.length).toBeGreaterThanOrEqual(before.length);
    expect(hits.every((h) => h.type === 'hit' && h.damage === CONSUMABLE.bombDamage)).toBe(true);
    expect(c.useConsumable(1)).toBe(true);
  });
});
