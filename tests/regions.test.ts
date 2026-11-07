import { describe, expect, it } from 'vitest';
import { FIELD } from '../src/config/balance';
import { Combat } from '../src/core/combat';
import { REGIONS, groupSpan } from '../src/data/regions';
import { REFERENCE_LOADOUTS, buildReference } from '../src/data/referenceLoadouts';
import { referenceHeroStats } from '../tools/simLib';

describe('regions（改訂版の配置ルール）', () => {
  it('群れは4〜6体、前の群れの最後尾から次の先頭まで240px以上', () => {
    for (const r of REGIONS) {
      let prevEnd = -Infinity;
      for (const g of r.groups) {
        expect(g.enemies.length).toBeGreaterThanOrEqual(4);
        expect(g.enemies.length).toBeLessThanOrEqual(6);
        expect(g.x - prevEnd).toBeGreaterThanOrEqual(FIELD.minGroupGap);
        prevEnd = g.x + groupSpan(g, FIELD.rowsPerColumn, FIELD.columnSpacing);
      }
      expect(r.bossX - prevEnd).toBeGreaterThanOrEqual(FIELD.minGroupGap);
    }
  });

  it('参考配置のランで、画面内の敵は同時に8体以内（ボスと取り巻きを含む）', () => {
    const hero = referenceHeroStats();
    for (const ref of REFERENCE_LOADOUTS) {
      const { loadout, items } = buildReference(ref);
      for (const r of REGIONS) {
        const c = new Combat({ seed: 1, regionId: r.id, loadout, items, hero });
        let max = 0;
        while (!c.ended) {
          c.step();
          const n = c.enemies.filter(
            (e) => e.alive && e.x - c.heroX <= FIELD.viewRange && c.heroX - e.x <= FIELD.viewBehind,
          ).length;
          max = Math.max(max, n);
        }
        expect(max, `${ref.id}/${r.id}`).toBeLessThanOrEqual(FIELD.maxOnScreen);
      }
    }
  });
});
