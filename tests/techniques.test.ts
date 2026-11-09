import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../src/config/balance';
import { planChain } from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { TECHNIQUE_MULT, TECHNIQUES } from '../src/data/techniques';
import { getItemDef } from '../src/data/items';
import { build, type Placed } from './helpers';

const line = (ids: string[]): Placed[] => [
  { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
  ...ids.map((d, i) => ({
    uid: `i${i}`,
    defId: d,
    x: i + 1,
    y: 0,
    exits: (i === ids.length - 1 ? [] : ['right']) as Placed['exits'],
  })),
];

describe('必殺技', () => {
  it('定義の装備はすべて存在する', () => {
    for (const t of TECHNIQUES)
      for (const opts of t.seq) for (const d of opts) expect(getItemDef(d).kind).toBe('attack');
  });

  it('決まった並びの3つ目が必殺技になる。順番が違う・間に別の装備が入ると成立しない', () => {
    const tech = (ids: string[]) => {
      const { loadout, items } = build(ids.length + 1, 1, line(ids));
      return planChain(loadout, items, 'o')
        .steps.filter((s) => s.tech)
        .map((s) => s.tech);
    };
    expect(tech(['oil_bottle', 'torch', 'flame_staff'])).toEqual(['crimson']);
    expect(tech(['sword', 'oil_bottle', 'flame_staff', 'flame_staff'])).toEqual(['crimson']);
    expect(tech(['flame_staff', 'torch', 'oil_bottle'])).toEqual([]);
    expect(tech(['oil_bottle', 'wood_shield', 'torch', 'flame_staff'])).toEqual([]);
    expect(tech(['sword', 'dagger', 'greatsword'])).toEqual(['triple']);
  });

  it('必殺技の一撃はダメージ×TECHNIQUE_MULT、演出用のイベントも出る', () => {
    const run = (ids: string[]) => {
      const { loadout, items } = build(ids.length + 1, 1, line(ids));
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
      const evs: CombatEvent[] = [];
      while (c.chain) {
        c.step();
        evs.push(...c.drainEvents());
      }
      return evs;
    };
    const withTech = run(['sword', 'sword', 'greatsword']);
    const without = run(['sword', 'axe', 'greatsword']);
    const last = (evs: CombatEvent[]) => evs.filter((e) => e.type === 'hit').at(-1);
    const a = last(withTech);
    const b = last(without);
    expect(a?.type === 'hit' && b?.type === 'hit' && a.damage / b.damage).toBeCloseTo(
      TECHNIQUE_MULT,
    );
    expect(withTech.some((e) => e.type === 'technique' && e.id === 'triple')).toBe(true);
    expect(without.some((e) => e.type === 'technique')).toBe(false);
  });
});

describe('必殺技図鑑', () => {
  it('見つけた技はセーブに残る。古いセーブ・壊れた値は空から', async () => {
    const { createInitialSave, serializeSave, deserializeSave } = await import('../src/core/save');
    const s = createInitialSave();
    expect(s.discoveredTechs).toEqual([]);
    s.discoveredTechs.push('crimson');
    expect(deserializeSave(serializeSave(s)).discoveredTechs).toEqual(['crimson']);
    const old = JSON.parse(serializeSave(s));
    delete old.discoveredTechs;
    expect(deserializeSave(JSON.stringify(old)).discoveredTechs).toEqual([]);
    old.discoveredTechs = ['frost', 3, null];
    expect(deserializeSave(JSON.stringify(old)).discoveredTechs).toEqual(['frost']);
  });

  it('すべての技に、見つける前のヒントがある', () => {
    for (const t of TECHNIQUES) expect(t.teaser.length).toBeGreaterThan(0);
  });
});
