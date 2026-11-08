// 参考配置のバランス検証（npm run sim とテストで共用）
import { planChain } from '../src/core/chain';
import { Combat } from '../src/core/combat';
import { heroStats } from '../src/core/economy';
import { createInitialSave } from '../src/core/save';
import { REGIONS } from '../src/data/regions';
import {
  REFERENCE_LOADOUTS,
  REFERENCE_UPGRADES,
  buildReference,
} from '../src/data/referenceLoadouts';

export interface SimRow {
  typeId: string;
  type: string;
  regionId: string;
  region: string;
  avgLoop: number;
  avgProgress: number;
  avgFires: number;
  minFires: number;
  deathRate: number;
}

export interface SimReport {
  rows: SimRow[];
  chainDurations: Record<string, number[]>;
  typeAverages: Record<string, number>;
  regionTops: string[];
  checks: { mixedBest: boolean; singleMultiSwap: boolean; noDominant: boolean; fires: boolean };
}

export function referenceHeroStats() {
  const save = createInitialSave();
  save.upgrades = { ...REFERENCE_UPGRADES };
  return heroStats(save);
}

export function runBalanceSim(runs: number): SimReport {
  const hero = referenceHeroStats();
  const rows: SimRow[] = [];
  const chainDurations: Record<string, number[]> = {};
  for (const ref of REFERENCE_LOADOUTS) {
    const { loadout, items } = buildReference(ref);
    chainDurations[ref.id] = loadout.originOrder.map((o) => planChain(loadout, items, o).duration);
    for (const region of REGIONS) {
      let loops = 0;
      let progress = 0;
      let fires = 0;
      let minFires = Infinity;
      let deaths = 0;
      for (let i = 0; i < runs; i++) {
        // 奥の地域は敵が一気に強いので、その地域に見合う装備・強化の分だけ勇者を強くして比べる
        const regionHero = {
          ...hero,
          maxHp: hero.maxHp * region.power.atk,
          attackMult: hero.attackMult * region.power.hp,
        };
        const c = new Combat({
          seed: 1000 + i,
          regionId: region.id,
          loadout,
          items,
          hero: regionHero,
        });
        const r = c.runToEnd();
        loops += r.reachedLoop;
        progress += r.progress;
        fires += r.stats.fires;
        minFires = Math.min(minFires, r.stats.fires);
        if (r.reason === 'dead') deaths++;
      }
      rows.push({
        typeId: ref.id,
        type: ref.name,
        regionId: region.id,
        region: region.name,
        avgLoop: loops / runs,
        avgProgress: progress / runs,
        avgFires: fires / runs,
        minFires,
        deathRate: deaths / runs,
      });
    }
  }

  const typeAverages: Record<string, number> = {};
  for (const ref of REFERENCE_LOADOUTS) {
    const rs = rows.filter((r) => r.typeId === ref.id);
    typeAverages[ref.id] = rs.reduce((s, r) => s + r.avgLoop, 0) / rs.length;
  }
  const loopOf = (t: string, reg: string) =>
    rows.find((r) => r.typeId === t && r.regionId === reg)!.avgLoop;
  const signs = REGIONS.map((reg) => Math.sign(loopOf('single', reg.id) - loopOf('multi', reg.id)));
  const regionTops = REGIONS.map((reg) => {
    const rs = rows.filter((r) => r.regionId === reg.id);
    return rs.reduce((a, b) => (b.avgLoop > a.avgLoop ? b : a)).typeId;
  });
  return {
    rows,
    chainDurations,
    typeAverages,
    regionTops,
    checks: {
      mixedBest:
        typeAverages.mixed! > typeAverages.single! && typeAverages.mixed! > typeAverages.multi!,
      singleMultiSwap: signs.includes(1) && signs.includes(-1),
      noDominant: new Set(regionTops).size > 1,
      fires: rows.every((r) => r.minFires >= 8),
    },
  };
}
