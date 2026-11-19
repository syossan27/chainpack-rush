import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../src/config/balance';
import type { CharmInstance, CharmSlots } from '../src/core/charms';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../src/core/combat';
import { getCharm, type CharmId } from '../src/data/charms';
import { build } from './helpers';

const charm = (defId: CharmId, rarity: CharmInstance['rarity'] = 'rare'): CharmInstance => ({
  uid: `c-${defId}`,
  defId,
  rarity,
});

/** An origin then these items to the right on a (n+1)x1 row; `onRow` sits in the row's slot */
function rowCfg(
  defIds: string[],
  onRow: CharmId | null,
  extra: Partial<RunConfig> = {},
): RunConfig {
  const width = defIds.length + 1;
  const b = build(width, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    ...defIds.map((defId, i) => ({
      uid: `i${i + 1}`,
      defId,
      x: i + 1,
      y: 0,
      exits: i + 1 < defIds.length ? (['right'] as const).slice() : [],
    })),
  ]);
  const charms: CharmSlots = Array.from({ length: width + 1 }, (_, s) =>
    s === width && onRow ? charm(onRow) : null,
  );
  return {
    seed: 7,
    regionId: 'grassland',
    loadout: b.loadout,
    items: b.items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e9 },
    luck: NO_LUCK,
    charms,
    ...extra,
  };
}

/** The scarecrow: fire `chains` times, collecting every event */
function dummyEvents(cfg: RunConfig, chains = 1): CombatEvent[] {
  const c = new Combat({ ...cfg, mode: 'dummy' });
  const out: CombatEvent[] = [];
  for (let k = 0; k < chains; k++) {
    c.fireNext();
    for (let i = 0; i < 60 * 5; i++) {
      c.step();
      out.push(...c.drainEvents());
      if (!c.chain) break;
    }
  }
  return out;
}

/** A run with the events of its first `ticks` ticks */
function runEvents(cfg: RunConfig, ticks: number): CombatEvent[] {
  const c = new Combat(cfg);
  const out: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    c.step();
    out.push(...c.drainEvents());
  }
  return out;
}

const hits = (evs: CombatEvent[]) =>
  evs.filter((e): e is Extract<CombatEvent, { type: 'hit' }> => e.type === 'hit');
const charmEvs = (evs: CombatEvent[]) =>
  evs.filter((e): e is Extract<CombatEvent, { type: 'charm' }> => e.type === 'charm');

describe('試作アクセサリー: 戦闘のコンボ倍率', () => {
  it('アクセサリーがなければ今と同じ', () => {
    const base = rowCfg(['torch', 'flame_staff', 'torch'], null, { seed: 3 });
    const without: RunConfig = { ...base };
    delete without.charms;
    const a = new Combat(base).runToEnd();
    const b = new Combat(without).runToEnd();
    expect(a.stats.totalDamage).toBe(b.stats.totalDamage);
    expect(a.drops).toEqual(b.drops);
  });

  it('そろいの指輪: 反応した攻撃は前の倍率、次の攻撃から上がる', () => {
    const v = getCharm('match_ring')!.values.rare;
    const on = dummyEvents(rowCfg(['torch', 'flame_staff', 'torch'], 'match_ring'));
    const off = dummyEvents(rowCfg(['torch', 'flame_staff', 'torch'], null));
    const ratios = hits(on).map((h, i) => h.damage / hits(off)[i]!.damage);
    expect(ratios).toHaveLength(3);
    expect(ratios[0]).toBeCloseTo(1, 2);
    expect(ratios[1]).toBeCloseTo(1 + v, 2);
    expect(ratios[2]).toBeCloseTo(1 + 2 * v, 2);
    const ms = charmEvs(on).map((e) => e.m);
    expect(ms[0]).toBeCloseTo(1 + v, 10);
    expect(ms[1]).toBeCloseTo(1 + 2 * v, 10);
    expect(ms[2]).toBeCloseTo(1 + 3 * v, 10);
    expect(charmEvs(on).every((e) => e.slot === 4 && e.op === '+' && e.value === v)).toBe(true);
  });

  it('次のチェーンは ×1 から', () => {
    const evs = dummyEvents(rowCfg(['torch', 'flame_staff', 'torch'], 'match_ring'), 2);
    const h = hits(evs);
    expect(h).toHaveLength(6);
    expect(h[3]!.damage).toBe(h[0]!.damage);
    expect(h[5]!.damage).toBe(h[2]!.damage);
  });

  it('打ち切られたチェーンのあとも ×1 から', () => {
    const v = getCharm('match_ring')!.values.rare;
    const cfg = rowCfg(['torch', 'flame_staff', 'torch', 'flame_staff'], 'match_ring', {
      hero: { ...BASE_HERO_STATS, maxHp: 1e9, attackMult: 30 },
    });
    const evs = runEvents(cfg, 60 * 60);
    expect(evs.some((e) => e.type === 'chainEnd' && e.cut)).toBe(true);
    // The first charm event of every chain is the first step up from ×1
    let first = true;
    let checked = 0;
    for (const e of evs) {
      if (e.type === 'chainStart') first = true;
      else if (e.type === 'charm' && first) {
        expect(e.m).toBeCloseTo(1 + v, 10);
        first = false;
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2);
  });

  it('双剣は2回とも会心のピアスが反応する', () => {
    const evs = dummyEvents(
      rowCfg(['twin_blades'], 'crit_earring', { luck: { ...NO_LUCK, critChance: 1 } }),
    );
    expect(hits(evs)).toHaveLength(2);
    expect(charmEvs(evs)).toHaveLength(2);
  });

  it('全体攻撃が何体に当たっても、連鎖の首飾りは1回', () => {
    const evs = runEvents(rowCfg(['raincloud_staff', 'thunder_bell'], 'combo_necklace'), 60 * 30);
    const byTick = new Map<number, { combos: number; charms: number }>();
    for (const e of evs) {
      if (e.type !== 'combo' && e.type !== 'charm') continue;
      const n = byTick.get(e.tick) ?? { combos: 0, charms: 0 };
      if (e.type === 'combo') n.combos++;
      else n.charms++;
      byTick.set(e.tick, n);
    }
    const multi = [...byTick.values()].filter((n) => n.combos >= 2);
    expect(multi.length).toBeGreaterThan(0);
    for (const n of multi) expect(n.charms).toBe(1);
  });

  it('とどめの髪飾りは倒した数だけ', () => {
    const cfg = rowCfg(['thunder_bell'], 'finish_pin', {
      hero: { ...BASE_HERO_STATS, maxHp: 1e9, attackMult: 30 },
    });
    const evs = runEvents(cfg, 60 * 30);
    const byTick = new Map<number, { kills: number; charms: number }>();
    for (const e of evs) {
      if (!(e.type === 'enemyDeath' && !e.fled) && e.type !== 'charm') continue;
      const n = byTick.get(e.tick) ?? { kills: 0, charms: 0 };
      if (e.type === 'charm') n.charms++;
      else n.kills++;
      byTick.set(e.tick, n);
    }
    const multi = [...byTick.values()].filter((n) => n.kills >= 2);
    expect(multi.length).toBeGreaterThan(0);
    for (const n of byTick.values()) expect(n.charms).toBe(n.kills);
  });
});
