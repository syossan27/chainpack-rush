import { describe, expect, it } from 'vitest';
import { COUNTER, LIGHT_DARK, NO_LUCK, RARITY, STATUS } from '../src/config/balance';
import { chainMultiplier } from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { build } from './helpers';

type Hit = (e: { id: number; atk: number; statuses: Map<string, number> }) => void;
const hitHero = (c: Combat): Hit => (c as unknown as { damageHero: Hit }).damageHero.bind(c);

describe('カウンターシールド', () => {
  const row = () =>
    build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'k', defId: 'counter_shield', x: 1, y: 0, exits: ['right'], rarity: 'rare' },
      { uid: 's', defId: 'sword', x: 2, y: 0, exits: [] },
    ]);

  it('受けたダメージをためて、連鎖が鳴らしたときに前の敵へまとめて返す（返すと空になる）', () => {
    const { loadout, items } = row();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
      mode: 'dummy',
    });
    hitHero(c)({ id: -1, atk: 10, statuses: new Map() });
    expect(c.counterStore).toBe(10);
    c.fireNext();
    const evs: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const back = evs.find((e) => e.type === 'hit' && e.combo === COUNTER.name);
    expect(back?.type === 'hit' && back.damage).toBeCloseTo(10 * RARITY.rare.mult);
    expect(c.counterStore).toBe(0);
  });

  it('連鎖の後ろで鳴るほど、その段の連鎖倍率の分だけ強く返す', () => {
    const { loadout, items } = build(5, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 3, y: 0, exits: ['right'] },
      { uid: 'k', defId: 'counter_shield', x: 4, y: 0, exits: [], rarity: 'rare' },
    ]);
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
      mode: 'dummy',
    });
    hitHero(c)({ id: -1, atk: 10, statuses: new Map() });
    c.fireNext();
    const evs: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const back = evs.find((e) => e.type === 'hit' && e.combo === COUNTER.name);
    expect(back?.type === 'hit' && back.step).toBe(3);
    expect(back?.type === 'hit' && back.damage).toBeCloseTo(
      10 * RARITY.rare.mult * chainMultiplier(3),
    );
  });

  it('ためられるのは最大HPの COUNTER.storeCap 倍まで', () => {
    const { loadout, items } = row();
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    for (let i = 0; i < 10; i++) hitHero(c)({ id: -1, atk: c.maxHp, statuses: new Map() });
    expect(c.counterStore).toBeLessThanOrEqual(c.maxHp * COUNTER.storeCap);
  });
});

describe('止める状態（凍結・封印）', () => {
  /** A run that has reached its first enemy, with that enemy's attack gauge reset */
  const engaged = () => {
    const { loadout, items } = build(1, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: [] },
    ]);
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
      luck: NO_LUCK,
    });
    while (!c.enemies.some((e) => e.alive && e.aggro && e.attackTimer > 0)) c.step();
    const e = c.enemies.find((x) => x.alive && x.aggro && x.attackTimer > 0)!;
    e.attackTimer = 0;
    return { c, e };
  };

  it('凍った直後の frozenSlowSeconds 秒は攻撃がたまらず、そのあとは元どおり', () => {
    const { c, e } = engaged();
    (c as unknown as { applyStatus(e: unknown, s: string): void }).applyStatus(e, 'frozen');
    const stopTicks = Math.floor(STATUS.frozenSlowSeconds * 60) - 1;
    for (let i = 0; i < stopTicks; i++) c.step();
    expect(e.attackTimer).toBe(0);
    for (let i = 0; i < 30; i++) c.step();
    expect(e.attackTimer).toBeGreaterThan(0);
  });

  it('封印のあいだは攻撃がたまらない', () => {
    const { c, e } = engaged();
    e.slowUntil = c.tick + Math.round(LIGHT_DARK.sealSeconds * 60);
    for (let i = 0; i < 60; i++) c.step();
    expect(LIGHT_DARK.sealSlow).toBe(0);
    expect(e.attackTimer).toBe(0);
  });
});
