import { describe, expect, it } from 'vitest';
import { CHAIN, HERO, LOOT, NO_LUCK } from '../src/config/balance';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { canReorient, sellPrice } from '../src/core/economy';
import { ARTIFACT_DEFS, createItem, rollLoot } from '../src/core/loot';
import { Rng } from '../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { getItemDef } from '../src/data/items';
import { build, type Placed } from './helpers';

const dummy = (placed: Placed[], extra: Partial<ConstructorParameters<typeof Combat>[0]> = {}) => {
  const { loadout, items } = build(7, 3, placed);
  return new Combat({
    seed: 1,
    regionId: 'grassland',
    loadout,
    items,
    hero: BASE_HERO_STATS,
    mode: 'dummy',
    luck: NO_LUCK,
    ...extra,
  });
};
const fireOnce = (c: Combat): CombatEvent[] => {
  c.fireNext();
  const evs: CombatEvent[] = [];
  while (c.chain) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return evs;
};

describe('アーティファクト', () => {
  it('常にレジェンダリー、出口は固定、追加効果なし、付け直し不可、売値は高い', () => {
    const rng = new Rng(2);
    expect(ARTIFACT_DEFS.length).toBeGreaterThanOrEqual(5);
    for (const d of ARTIFACT_DEFS) {
      for (const r of ['common', 'rare', 'legendary'] as const) {
        const it = createItem(rng, d.id, r, 'a');
        expect(it.rarity).toBe('legendary');
        expect(it.exits).toEqual(d.artifact!.exits);
        expect(it.affixes).toBeUndefined();
        expect(canReorient(it)).toBe(false);
        expect(sellPrice(it)).toBe(LOOT.artifactSell);
      }
    }
  });

  it('めったに出ない（通常のドロップで約0.05%、ボスで約0.2%）', () => {
    const rng = new Rng(3);
    const n = 400000;
    let normal = 0;
    let boss = 0;
    for (let i = 0; i < n; i++) {
      if (getItemDef(rollLoot(rng, 1, 'x').defId).artifact) normal++;
      if (getItemDef(rollLoot(rng, 1, 'y', true).defId).artifact) boss++;
    }
    expect(normal / n).toBeCloseTo(LOOT.artifactChance, 3);
    expect(normal).toBeGreaterThan(0);
    expect(boss / n).toBeCloseTo(LOOT.artifactChanceRare, 3);
  });

  it('読み込み時に出口・レアリティを固定に戻し、追加効果を外す', () => {
    const s = createInitialSave();
    s.inventory.push({
      uid: 'z',
      defId: 'dragon_fang',
      rarity: 'common',
      exits: ['up', 'down'],
      rerollCount: 0,
      affixes: [{ id: 'sharp', value: 9 }],
    });
    const it = deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === 'z')!;
    expect(it.rarity).toBe('legendary');
    expect(it.exits).toEqual(['right']);
    expect(it.affixes).toBeUndefined();
  });

  it('循環の環: 通る連鎖は連鎖倍率の上限が ×4.0', () => {
    const row = (withRing: boolean): Placed[] => [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      ...[1, 2, 3, 4, 5, 6].map((x) => ({
        uid: `s${x}`,
        defId: withRing && x === 1 ? 'ouroboros' : 'sword',
        x,
        y: 0,
        exits: ['right'] as Placed['exits'],
      })),
      ...[0, 1, 2, 3, 4, 5, 6].map((x) => ({
        uid: `t${x}`,
        defId: 'sword',
        x: 6 - x,
        y: 1,
        exits: ['left'] as Placed['exits'],
      })),
    ];
    // 2段目（右下へ折り返す）の続きまで届くように、6列目は下向き
    const fix = (p: Placed[]) =>
      p.map((q) => (q.uid === 's6' ? { ...q, exits: ['down'] as Placed['exits'] } : q));
    const maxMult = (withRing: boolean) =>
      Math.max(
        ...fireOnce(dummy(fix(row(withRing))))
          .filter((e) => e.type === 'step')
          .map((e) => (e.type === 'step' ? e.mult : 0)),
      );
    expect(maxMult(false)).toBeCloseTo(CHAIN.multCap);
    expect(maxMult(true)).toBeGreaterThan(CHAIN.multCap + 1);
  });

  it('竜牙の剣はボスに×2、賢者の石は3つの状態をまとめて付ける', () => {
    const c = dummy([
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'g', defId: 'sage_stone', x: 1, y: 0, exits: [] },
    ]);
    const evs = fireOnce(c);
    const st = new Set(
      evs
        .filter((e) => e.type === 'statusApplied')
        .map((e) => (e.type === 'statusApplied' ? e.status : '')),
    );
    expect([...st].sort()).toEqual(['frozen', 'oil', 'wet']);
    expect(getItemDef('dragon_fang').bossMult).toBe(2);
  });

  it('時渡りの砂時計: 連鎖のあと待たずに次を撃てる', () => {
    const c = dummy([
      { uid: 'o', defId: 'chrono_glass', x: 0, y: 0, exits: ['right', 'down'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
    fireOnce(c);
    expect(c.atbRatio).toBe(1);
  });

  it('不落の城門: 置いてあれば連鎖中も無防備にならない', () => {
    const placed: Placed[] = [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      ...[1, 2, 3, 4, 5].map((x) => ({
        uid: `s${x}`,
        defId: 'sword',
        x,
        y: 0,
        exits: ['right'] as Placed['exits'],
      })),
    ];
    const seen = (p: Placed[]) => {
      const c = dummy(p);
      c.fireNext();
      let any = false;
      while (c.chain) {
        any ||= c.unguarded;
        c.step();
      }
      return any;
    };
    expect(seen(placed)).toBe(true);
    expect(
      seen([...placed, { uid: 'a', defId: 'aegis_gate', x: 6, y: 2, exits: ['up', 'down'] }]),
    ).toBe(false);
    expect(HERO.unguardedTakenMult).toBeGreaterThan(1);
  });
});
