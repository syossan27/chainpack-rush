import { describe, expect, it } from 'vitest';
import { Combat } from '../src/core/combat';
import { DEMO_HERO, DEMO_REGION, demoLoadout } from '../src/data/demoLoadout';
import { TECHNIQUES } from '../src/data/techniques';
import { planChain } from '../src/core/chain';
import { BACKPACK } from '../src/config/balance';

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
      // Enemies can run out mid-chain, so the last technique of a chain may be skipped
      expect(techs.size).toBeGreaterThanOrEqual(5);
    }
  });

  it('バックパックは最大、起点は2つ。2本の連鎖は重ならず、全部のマスを通り、必殺技がすべて入る', () => {
    const { loadout, items } = demoLoadout();
    expect(loadout.width).toBe(BACKPACK.maxWidth);
    expect(loadout.height).toBe(BACKPACK.maxHeight);
    expect(loadout.originOrder).toHaveLength(2);
    const plans = loadout.originOrder.map((o) => planChain(loadout, items, o));
    const cells = plans.map((p) => new Set(p.steps.map((s) => s.cell)));
    // 2本は重ならず、合わせて全部のマスを通る
    for (const c of cells[0]!) expect(cells[1]!.has(c)).toBe(false);
    expect(cells[0]!.size + cells[1]!.size).toBe(loadout.width * loadout.height);
    // どちらも循環の環を通り、長くつながる
    for (const p of plans) {
      expect(p.multCap).toBe(4);
      expect(p.maxStep).toBeGreaterThanOrEqual(14);
    }
    const techs = new Set(plans.flatMap((p) => p.steps.map((s) => s.tech).filter(Boolean)));
    expect([...techs].sort()).toEqual(TECHNIQUES.map((t) => t.id).sort());
  });
});
