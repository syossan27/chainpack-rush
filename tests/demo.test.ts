import { describe, expect, it } from 'vitest';
import { Combat } from '../src/core/combat';
import { DEMO_HERO, DEMO_REGION, demoLoadout } from '../src/data/demoLoadout';
import { TECHNIQUES } from '../src/data/techniques';

describe('体験ラン（最初の出撃で伝説の装備を借りる）', () => {
  it('力尽きずに時間いっぱい戦い、必殺技がいくつも出る。戦利品と時間の延長はない', () => {
    const { loadout, items } = demoLoadout();
    for (const seed of [1, 2, 3]) {
      const c = new Combat({
        seed,
        regionId: DEMO_REGION,
        loadout,
        items,
        hero: DEMO_HERO,
        demo: true,
      });
      const techs = new Set<string>();
      while (!c.ended) {
        c.step();
        for (const e of c.drainEvents()) if (e.type === 'technique') techs.add(e.id);
      }
      const r = c.result();
      expect(r.reason).toBe('timeout');
      expect(r.drops).toHaveLength(0);
      expect(r.stats.timeGained).toBe(0);
      expect(r.stats.maxStep).toBeGreaterThanOrEqual(12);
      // 体験の配置は最初の5つの必殺技の並びを含む（ヴェノム・クロスは入っていない）
      expect(techs.size).toBeGreaterThanOrEqual(4);
      expect(TECHNIQUES.length).toBeGreaterThanOrEqual(5);
    }
  });
});
