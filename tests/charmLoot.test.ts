import { describe, expect, it } from 'vitest';
import { CHARM } from '../src/config/balance';
import { acceptCharms } from '../src/core/charmSave';
import { rollCharmDrop, type CharmInstance } from '../src/core/charms';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../src/core/combat';
import { Rng } from '../src/core/rng';
import { createInitialSave } from '../src/core/save';
import { build } from './helpers';

/** A random stream whose every draw is v */
function fixed(v: number): Rng {
  const r = new Rng(1);
  r.next = () => v;
  return r;
}

const region = { rarityShift: 0, artifactMult: 1 };

/** A strong hero clearing grassland: origin → thunder bell (hits all) → sword; no charms worn */
function runCfg(extra: Partial<RunConfig> = {}): RunConfig {
  const b = build(3, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'thunder_bell', x: 1, y: 0, exits: ['right'] },
    { uid: 's', defId: 'sword', x: 2, y: 0, exits: [] },
  ]);
  return {
    seed: 5,
    regionId: 'grassland',
    loadout: b.loadout,
    items: b.items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e9, attackMult: 30 },
    charms: [null, null, null, null],
    ...extra,
  };
}

describe('試作アクセサリー: ドロップ', () => {
  it('確率で出る。ボスなどは出やすい', () => {
    expect(rollCharmDrop(fixed(CHARM.dropChance - 0.001), 1, false, region, false)).not.toBeNull();
    expect(rollCharmDrop(fixed(CHARM.dropChance + 0.001), 1, false, region, false)).toBeNull();
    expect(
      rollCharmDrop(fixed(CHARM.dropChanceRare - 0.001), 1, true, region, false),
    ).not.toBeNull();
    expect(rollCharmDrop(fixed(0.99), 1, false, region, true)).not.toBeNull();
  });

  it('奥の地域でも確率は同じ（アーティファクトの倍率はかからない）', () => {
    const deep = { rarityShift: 0.75, artifactMult: 10 };
    expect(rollCharmDrop(fixed(CHARM.dropChance + 0.001), 1, false, deep, false)).toBeNull();
    expect(rollCharmDrop(fixed(CHARM.dropChanceRare + 0.001), 1, true, deep, false)).toBeNull();
  });

  it('アクセサリーの抽選は別の乱数: ふつうのドロップは変わらない', () => {
    const on = new Combat(runCfg()).runToEnd();
    const cfg = runCfg();
    delete cfg.charms;
    const off = new Combat(cfg).runToEnd();
    expect(on.drops.length).toBeGreaterThan(0);
    expect(on.drops).toEqual(off.drops);
    expect(on.stats.totalDamage).toBe(off.stats.totalDamage);
    expect(off.charms).toBeUndefined();
    expect(on.charms).toBeDefined();
  });

  it('アクセサリーを持っていなければ、最初のボスが必ず1個落とす', () => {
    const c = new Combat(runCfg({ charmSure: true }));
    const evs: CombatEvent[] = [];
    while (!c.ended) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const r = c.result();
    expect(r.stats.bossesDefeated).toBeGreaterThan(0);
    expect(r.charms!.length).toBeGreaterThan(0);
    const drops = evs.filter((e) => e.type === 'charmDrop');
    expect(drops).toHaveLength(r.charms!.length);
    // The first one comes from a boss
    const first = drops[0]!;
    const boss = evs.find(
      (e) =>
        e.type === 'enemyDeath' && e.boss && e.enemyId === (first as { enemyId: number }).enemyId,
    );
    expect(boss).toBeDefined();
  });

  it('noLoot・体験ラン・カカシでは出ない', () => {
    for (const extra of [{ noLoot: true }, { demo: true }] as const) {
      const r = new Combat(runCfg({ ...extra, charmSure: true })).runToEnd();
      expect(r.charms ?? []).toEqual([]);
    }
    const d = new Combat({ ...runCfg({ charmSure: true }), mode: 'dummy' });
    d.fireNext();
    for (let i = 0; i < 600; i++) d.step();
    expect(d.result().charms ?? []).toEqual([]);
  });

  it('アクセサリー入れがいっぱいなら、あふれた分を売ってゴールドに', () => {
    const save = createInitialSave();
    save.charms = Array.from({ length: CHARM.capacity - 1 }, (_, i): CharmInstance => ({
      uid: `x${i}`,
      defId: 'match_ring',
      rarity: 'common',
    }));
    const gold = save.gold;
    const drops: CharmInstance[] = [
      { uid: 'charm-1', defId: 'tech_bangle', rarity: 'epic' },
      { uid: 'charm-2', defId: 'stack_charm', rarity: 'rare' },
      { uid: 'charm-3', defId: 'finish_pin', rarity: 'legendary' },
    ];
    const r = acceptCharms(save, drops);
    expect(r.added.map((c) => c.defId)).toEqual(['tech_bangle']);
    expect(r.added[0]!.uid).not.toBe('charm-1');
    expect(save.charms.some((c) => c.uid === r.added[0]!.uid)).toBe(true);
    expect(r.sold.map((c) => c.defId)).toEqual(['stack_charm', 'finish_pin']);
    expect(r.gold).toBe(CHARM.sell.rare + CHARM.sell.legendary);
    expect(save.gold).toBe(gold + r.gold);
    expect(save.charms).toHaveLength(CHARM.capacity);
  });
});
