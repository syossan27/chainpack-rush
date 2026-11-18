import { describe, expect, it } from 'vitest';
import { DIVE, LAW, NO_LUCK } from '../src/config/balance';
import {
  BASE_HERO_STATS,
  Combat,
  type CombatEvent,
  type Encounter,
  type RunConfig,
} from '../src/core/combat';
import { getRegion } from '../src/data/regions';
import { build } from './helpers';

/** A strong line: an origin stone and swords along the top row and down the right column */
function strongBoard() {
  return build(4, 3, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 's1', defId: 'sword', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 's2', defId: 'sword', x: 2, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 's3', defId: 'sword', x: 3, y: 0, exits: ['down'], rarity: 'legendary' },
    { uid: 's4', defId: 'sword', x: 3, y: 1, exits: ['down'], rarity: 'legendary' },
    { uid: 's5', defId: 'sword', x: 3, y: 2, exits: [], rarity: 'legendary' },
  ]);
}

function encounterCfg(enc: Partial<Encounter>, over: Partial<RunConfig> = {}): RunConfig {
  const { loadout, items } = strongBoard();
  return {
    seed: 42,
    regionId: 'grassland',
    loadout,
    items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 20, runTime: 1 },
    rules: { keepCountOnKill: true },
    luck: NO_LUCK,
    encounter: { kind: 'fight', floor: 1, hp: 1e6, laws: [], wins: 0, ...enc },
    ...over,
  };
}

function runAll(c: Combat, maxTicks = 60 * 600): CombatEvent[] {
  const evs: CombatEvent[] = [];
  for (let i = 0; i < maxTicks && !c.ended; i++) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return evs;
}

describe('試作「潜る」: 1戦だけの戦闘', () => {
  it('ふつう: 地域の群れを周回1つぶん出し、ボスは出さない。全員倒すと cleared（時間切れはない）', () => {
    const c = new Combat(encounterCfg({ kind: 'fight' }));
    const groups = new Set(c.enemies.map((e) => e.group));
    expect(groups.size).toBe(getRegion('grassland').groupCount);
    expect(c.enemies.some((e) => e.def.boss)).toBe(false);
    const evs = runAll(c);
    expect(c.ended).toBe('cleared');
    // runTime is 1 second: an ordinary run would have timed out long before
    expect(c.time).toBeGreaterThan(1);
    expect(evs.some((e) => e.type === 'timeBonus')).toBe(false);
    expect(evs.some((e) => e.type === 'loopStart' && e.loop > 1)).toBe(false);
  });

  it('精鋭: どの群れにも精鋭が1体ずつ', () => {
    const c = new Combat(encounterCfg({ kind: 'elite' }));
    const groups = new Set(c.enemies.map((e) => e.group));
    for (const g of groups)
      expect(c.enemies.filter((e) => e.group === g && e.elite !== null).length).toBe(1);
  });

  it('ボス: その階のボスだけ。倒すと cleared で、次の周回は始まらない', () => {
    const c = new Combat(encounterCfg({ kind: 'boss', floor: 2 }));
    const first = c.enemies.filter((e) => !e.escort);
    expect(first.length).toBe(1);
    expect(first[0]!.def.boss).toBe(true);
    expect(first[0]!.loop).toBe(2);
    const evs = runAll(c);
    expect(c.ended).toBe('cleared');
    expect(c.stats.bossesDefeated).toBe(1);
    expect(evs.some((e) => e.type === 'bossDefeated')).toBe(true);
    expect(c.enemies.filter((e) => e.alive).length).toBe(0);
  });

  it('HP は持ち越した値から始まる', () => {
    const c = new Combat(encounterCfg({ hp: 33 }));
    expect(c.hp).toBe(33);
  });

  it('時の砂は使えない（ほかの消耗品は使える）', () => {
    const { loadout, items } = strongBoard();
    items.set('sand', {
      uid: 'sand',
      defId: 'time_sand',
      rarity: 'common',
      exits: [],
      rerollCount: 0,
    });
    items.set('pot', { uid: 'pot', defId: 'potion', rarity: 'common', exits: [], rerollCount: 0 });
    const c = new Combat(
      encounterCfg(
        { hp: 10 },
        { loadout: { ...loadout, consumables: ['sand', 'pot'] }, items, consumableSlots: 2 },
      ),
    );
    expect(c.useConsumable(0)).toBe(false);
    expect(c.consumables[0]).toBe('sand');
    expect(c.useConsumable(1)).toBe(true);
  });

  it('決着がつかないと、交戦が60秒を超えるたびに敵の攻撃力が ×2', () => {
    // Only an origin stone: nothing ever hits
    const weak = build(4, 3, [{ uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] }]);
    const c = new Combat(encounterCfg({}, { loadout: weak.loadout, items: weak.items }));
    const atk0 = new Map(c.enemies.map((e) => [e.id, e.atk]));
    const enrages: number[] = [];
    for (let i = 0; i < 60 * 400 && enrages.length < 2; i++) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'enrage') enrages.push(c.clock);
    }
    expect(enrages.length).toBeGreaterThanOrEqual(1);
    expect(enrages[0]).toBe(DIVE.enrageSec * 60);
    for (const e of c.enemies.filter((x) => x.alive))
      expect(e.atk).toBeGreaterThanOrEqual(atk0.get(e.id)! * DIVE.enrageAtk);
  });
});

describe('試作「潜る」: 掟が戦闘に効く', () => {
  const firstHit = (cfg: RunConfig) => {
    const c = new Combat(cfg);
    for (let i = 0; i < 60 * 60; i++) {
      c.step();
      for (const e of c.drainEvents()) if (e.type === 'hit' && e.damage > 0) return e.damage;
    }
    throw new Error('no hit');
  };

  it('勝ち癖: 勝った数ぶん一撃が強くなる', () => {
    const base = firstHit(encounterCfg({}));
    const won = firstHit(encounterCfg({ laws: ['winStreak'], wins: 2 }));
    expect(won).toBeCloseTo(base * (1 + 2 * LAW.winStreakPerWin), 1);
  });

  it('生き血: 敵を1体倒すたびに最大HPの2%回復', () => {
    const hpAtEnd = (laws: Encounter['laws']) => {
      const c = new Combat(encounterCfg({ hp: 100, laws }));
      const evs = runAll(c);
      const kills = evs.filter((e) => e.type === 'enemyDeath' && !e.fled).length;
      return { hp: c.hp, kills };
    };
    const plain = hpAtEnd([]);
    const healed = hpAtEnd(['lifeOnKill']);
    expect(healed.kills).toBe(plain.kills);
    expect(healed.hp - plain.hp).toBeCloseTo(plain.kills * 1e6 * LAW.lifeOnKill, 3);
  });

  it('重ねの極意: 重ねの倍率が ×1.5 / ×2 / ×3', () => {
    const { loadout, items } = build(4, 3, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'top', defId: 'sword', x: 1, y: 0, exits: [] },
      { uid: 'a', defId: 'sword', x: 2, y: 2, exits: [] },
      { uid: 'b', defId: 'dagger', x: 3, y: 2, exits: [] },
    ]);
    const board = {
      ...loadout,
      cells: loadout.cells.map((u) => (u === 'a' || u === 'b' ? null : u)),
      under: loadout.cells.map((_, i) => (i === 1 ? ['a', 'b'] : [])),
    };
    const c = new Combat(encounterCfg({ laws: ['stack'] }, { loadout: board, items }));
    const mults = c
      .planOf('o')!
      .steps.filter((s) => s.uid !== 'o' && s.ring !== undefined)
      .map((s) => s.stackMult);
    expect(mults).toEqual(LAW.stackPosMult);
  });
});
