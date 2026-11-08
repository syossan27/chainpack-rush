import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { BOSS, CONSUMABLE, FIELD, HERO, SIM, TIME_BONUS } from '../src/config/balance';
import { createInitialSave } from '../src/core/save';
import { buyUpgrade, heroStats, itemMap, upgradeCost } from '../src/core/economy';
import { build, specExample } from './helpers';

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

  it('連鎖中は ATB が止まり、無防備になる。終了時に防御値が加算される', () => {
    const { loadout, items } = specExample();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
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

  it('鉄の騎士は一撃200未満を無効化する', () => {
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
    const king = c.enemies.find((e) => e.def.boss)!;
    king.x = c.heroX + 200;
    for (let i = 0; i < 10; i++) c.step();
    const escorts = () => c.enemies.filter((e) => e.alive && e.escort);
    expect(escorts()).toHaveLength(4);
    // 取り巻きは王より手前に立つ
    expect(escorts().every((e) => e.x < king.x)).toBe(true);
    // 倒されても一定間隔で補充される
    escorts()[0]!.alive = false;
    expect(escorts()).toHaveLength(3);
    for (let i = 0; i < Math.round(BOSS.goblinKingSummonInterval * 60) + 2; i++) c.step();
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

  it('永続強化「出撃時間」: +2秒×5、費用は 600G から2倍ずつ', () => {
    const s = createInitialSave();
    expect(heroStats(s).runTime).toBe(SIM.runDuration);
    expect(upgradeCost('runTime', 0)).toBe(600);
    expect(upgradeCost('runTime', 4)).toBe(9600);
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
