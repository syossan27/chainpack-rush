import { describe, expect, it } from 'vitest';
import { FIELD, NO_LUCK } from '../src/config/balance';
import { rarityWeights } from '../src/core/loot';
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

describe('地域の強さと戦利品', () => {
  it('草原→洞窟→城壁の順に、敵の強さ・レア以上の出やすさ・アーティファクトの出やすさが上がる', () => {
    for (let i = 1; i < REGIONS.length; i++) {
      const a = REGIONS[i - 1]!;
      const b = REGIONS[i]!;
      expect(b.power.hp).toBeGreaterThan(a.power.hp);
      expect(b.power.atk).toBeGreaterThan(a.power.atk);
      expect(b.loot.rarityShift).toBeGreaterThan(a.loot.rarityShift);
      expect(b.loot.artifactMult).toBeGreaterThan(a.loot.artifactMult);
    }
  });

  it('同じ雑魚でも地域の倍率がかかる', () => {
    const { loadout, items } = buildReference(REFERENCE_LOADOUTS[0]!);
    const hpOf = (regionId: string) => {
      const c = new Combat({
        seed: 1,
        regionId,
        loadout,
        items,
        hero: referenceHeroStats(),
        luck: NO_LUCK,
      });
      const e = c.enemies.find((x) => !x.def.boss)!;
      return { ratio: e.maxHp / e.def.hp, atk: e.atk / e.def.atk };
    };
    for (const r of REGIONS) {
      const v = hpOf(r.id);
      expect(v.ratio).toBeCloseTo(r.power.hp);
      expect(v.atk).toBeCloseTo(r.power.atk);
    }
  });

  it('奥の地域ほどコモンが減り、レア以上が増える', () => {
    const common = (shift: number) =>
      rarityWeights(1, false, shift).find(([r]) => r === 'common')![1];
    const shifts = REGIONS.map((r) => r.loot.rarityShift);
    for (let i = 1; i < shifts.length; i++)
      // コモンが0になるまでは減り続ける（奥の地域ではコモンが出なくなる）
      if (common(shifts[i - 1]!) > 0)
        expect(common(shifts[i]!)).toBeLessThan(common(shifts[i - 1]!));
      else expect(common(shifts[i]!)).toBe(0);
    const total = rarityWeights(1, false, 0.4).reduce((s, [, w]) => s + w, 0);
    expect(total).toBeCloseTo(1);
  });
});
