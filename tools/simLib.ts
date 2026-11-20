// 参考配置のバランス検証（npm run sim とテストで共用）。重ねる盤面の6つの型（tools/referenceBoards.ts）を、
// 本編のルール（倒しても連鎖が続く）で走らせる。熟練・アクセサリー・遺物は使わない（型と盤面だけを比べる）
import { Combat } from '../src/core/combat';
import { heroStats } from '../src/core/economy';
import { featureRules, runFeatures } from '../src/core/runRules';
import { createInitialSave } from '../src/core/save';
import { BOARDS, type BoardId } from '../src/data/boards';
import { REGIONS as ALL_REGIONS } from '../src/data/regions';
import { ARCHETYPES, REFERENCE_UPGRADES, buildReference } from './referenceBoards';

// 参考配置は中盤の装備一式なので、比べるのは草原・洞窟・城壁まで（火山からは長期のボットで見る）
const REGIONS = ALL_REGIONS.slice(0, 3);

export interface SimRow {
  typeId: string;
  type: string;
  boardId: BoardId;
  regionId: string;
  region: string;
  avgLoop: number;
  avgProgress: number;
  avgFires: number;
  minFires: number;
  deathRate: number;
}

export interface SimReport {
  /** Each archetype on the standard board */
  rows: SimRow[];
  /** Each archetype on each board (only with `boards`) */
  boardRows: SimRow[];
  typeAverages: Record<string, number>;
  /** The best archetype in each region */
  regionTops: string[];
  /** The best board in each region, over all archetypes (only with `boards`) */
  boardTops: BoardId[];
  checks: { noDominant: boolean; fires: boolean; noBoardDominant: boolean | null };
}

export function referenceHeroStats() {
  const save = createInitialSave();
  save.upgrades = { ...save.upgrades, ...REFERENCE_UPGRADES };
  return heroStats(save);
}

const RULES = featureRules(runFeatures('normal'));

function runRow(
  arch: (typeof ARCHETYPES)[number],
  boardId: BoardId,
  region: (typeof REGIONS)[number],
  runs: number,
): SimRow {
  const hero = referenceHeroStats();
  const { loadout, items } = buildReference(arch, boardId);
  let loops = 0;
  let progress = 0;
  let fires = 0;
  let minFires = Infinity;
  let deaths = 0;
  // 奥の地域は敵が一気に強いので、その地域に見合う装備・強化の分だけ勇者を強くして比べる
  const regionHero = {
    ...hero,
    maxHp: hero.maxHp * region.power.atk,
    attackMult: hero.attackMult * region.power.hp,
  };
  for (let i = 0; i < runs; i++) {
    const r = new Combat({
      seed: 1000 + i,
      regionId: region.id,
      loadout,
      items,
      hero: regionHero,
      ...(RULES ? { rules: RULES } : {}),
    }).runToEnd();
    loops += r.reachedLoop;
    progress += r.progress;
    fires += r.stats.fires;
    minFires = Math.min(minFires, r.stats.fires);
    if (r.reason === 'dead') deaths++;
  }
  return {
    typeId: arch.id,
    type: arch.name,
    boardId,
    regionId: region.id,
    region: region.name,
    avgLoop: loops / runs,
    avgProgress: progress / runs,
    avgFires: fires / runs,
    minFires,
    deathRate: deaths / runs,
  };
}

/**
 * runs: seeds per archetype and region on the standard board. boards: also every board, with
 * boardRuns seeds (the board check is the slow part)
 */
export function runBalanceSim(
  runs: number,
  opts: { boards?: boolean; boardRuns?: number } = {},
): SimReport {
  const rows: SimRow[] = [];
  for (const arch of ARCHETYPES)
    for (const region of REGIONS) rows.push(runRow(arch, 'standard', region, runs));

  const typeAverages: Record<string, number> = {};
  for (const arch of ARCHETYPES) {
    const rs = rows.filter((r) => r.typeId === arch.id);
    typeAverages[arch.id] = rs.reduce((s, r) => s + r.avgLoop, 0) / rs.length;
  }
  const regionTops = REGIONS.map((reg) => {
    const rs = rows.filter((r) => r.regionId === reg.id);
    return rs.reduce((a, b) => (b.avgLoop > a.avgLoop ? b : a)).typeId;
  });

  const boardRows: SimRow[] = [];
  let boardTops: BoardId[] = [];
  if (opts.boards) {
    const n = opts.boardRuns ?? Math.max(5, Math.round(runs / 5));
    for (const b of BOARDS)
      for (const arch of ARCHETYPES)
        for (const region of REGIONS) boardRows.push(runRow(arch, b.id, region, n));
    boardTops = REGIONS.map((reg) => {
      const mean = (id: BoardId) => {
        const rs = boardRows.filter((r) => r.boardId === id && r.regionId === reg.id);
        return rs.reduce((s, r) => s + r.avgLoop, 0) / rs.length;
      };
      return BOARDS.map((b) => b.id).reduce((a, b) => (mean(b) > mean(a) ? b : a));
    });
  }

  return {
    rows,
    boardRows,
    typeAverages,
    regionTops,
    boardTops,
    checks: {
      noDominant: new Set(regionTops).size > 1,
      fires: rows.every((r) => r.minFires >= 8),
      noBoardDominant: opts.boards ? new Set(boardTops).size > 1 : null,
    },
  };
}
