import { describe, expect, it } from 'vitest';
import { FIELD } from '../src/config/balance';
import { Combat } from '../src/core/combat';
import { REGIONS, bossPoolForLoop } from '../src/data/regions';
import { groupSpan, rollLoop } from '../src/core/layout';
import { Rng } from '../src/core/rng';
import { REFERENCE_LOADOUTS, buildReference } from '../src/data/referenceLoadouts';
import { referenceHeroStats } from '../tools/simLib';

describe('regions（周回ごとの抽選）', () => {
  it('群れは地域の大きさの範囲、前の群れの最後尾から次の先頭まで240px以上、上限つきの雑魚は守る', () => {
    for (const r of REGIONS) {
      const rng = new Rng(7);
      let prevBoss: string | undefined;
      for (let loop = 1; loop <= 40; loop++) {
        const l = rollLoop(r, loop, rng, prevBoss);
        expect(l.groups).toHaveLength(r.groupCount);
        let prevEnd = -Infinity;
        for (const g of l.groups) {
          expect(g.enemies.length).toBeGreaterThanOrEqual(r.groupSize[0]);
          expect(g.enemies.length).toBeLessThanOrEqual(r.groupSize[1]);
          expect(g.x - prevEnd).toBeGreaterThanOrEqual(FIELD.minGroupGap);
          prevEnd = g.x + groupSpan(g.enemies.length);
          for (const m of r.mobs) {
            if (m.maxPerGroup !== undefined)
              expect(g.enemies.filter((x) => x === m.id).length).toBeLessThanOrEqual(m.maxPerGroup);
          }
          expect(g.enemies.every((x) => r.mobs.some((m) => m.id === x))).toBe(true);
        }
        expect(l.bossX - prevEnd).toBeGreaterThanOrEqual(FIELD.minGroupGap);
        const pool = bossPoolForLoop(r, loop);
        expect(pool).toContain(l.bossId);
        if (pool.length > 1 && prevBoss) expect(l.bossId).not.toBe(prevBoss);
        prevBoss = l.bossId;
      }
    }
  });

  it('シードが違えば並びも変わる', () => {
    const r = REGIONS[0]!;
    const a = JSON.stringify(rollLoop(r, 1, new Rng(1)));
    const differs = [2, 3, 4, 5, 6].some((k) => JSON.stringify(rollLoop(r, 1, new Rng(k))) !== a);
    expect(differs).toBe(true);
  });

  it('参考配置のランで、画面内の敵は同時に8体以内（ボスと取り巻きを含む）', () => {
    const hero = referenceHeroStats();
    for (const ref of REFERENCE_LOADOUTS) {
      const { loadout, items } = buildReference(ref);
      for (const r of REGIONS) {
        for (const seed of [1, 2, 3, 4, 5]) {
          const c = new Combat({ seed, regionId: r.id, loadout, items, hero });
          let max = 0;
          while (!c.ended) {
            c.step();
            const n = c.enemies.filter(
              (e) =>
                e.alive && e.x - c.heroX <= FIELD.viewRange && c.heroX - e.x <= FIELD.viewBehind,
            ).length;
            max = Math.max(max, n);
          }
          expect(max, `${ref.id}/${r.id}/${seed}`).toBeLessThanOrEqual(FIELD.maxOnScreen);
        }
      }
    }
  });
});
