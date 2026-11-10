// 周回ごとの敵の並び（群れの中身・数・間隔、ボス）を抽選する
import { FIELD } from '../config/balance';
import { getEnemyDef } from '../data/enemies';
import { bossPoolForLoop, type RegionDef } from '../data/regions';
import type { Rng } from './rng';

export interface EnemyGroup {
  x: number; // 周回の起点からの距離（群れの先頭）
  enemies: string[];
}

export interface LoopLayout {
  groups: EnemyGroup[];
  bossX: number;
  bossId: string;
}

/** 最初の群れの位置と、間隔の揺れ（最小間隔に足す量の上限） */
export const LAYOUT = {
  firstGroupX: 320,
  gapJitter: 160,
} as const;

/** 群れの横幅（先頭から最後尾まで） */
export function groupSpan(count: number): number {
  return (Math.ceil(count / FIELD.rowsPerColumn) - 1) * FIELD.columnSpacing;
}

function rollGroup(region: RegionDef, rng: Rng): string[] {
  const [lo, hi] = region.groupSize;
  const size = lo + rng.int(hi - lo + 1);
  const out: string[] = [];
  while (out.length < size) {
    const allowed = region.mobs.filter(
      (m) => m.maxPerGroup === undefined || out.filter((x) => x === m.id).length < m.maxPerGroup,
    );
    out.push(rng.weighted(allowed.map((m) => [m.id, m.weight] as [string, number])));
  }
  // 後列（呪術師）は後ろへ
  return out.sort((a, b) => Number(getEnemyDef(a).backRow) - Number(getEnemyDef(b).backRow));
}

/** 前のボスと同じにならないように選ぶ（候補が1つならそれ） */
export function rollLoop(region: RegionDef, loop: number, rng: Rng, prevBoss?: string): LoopLayout {
  const groups: EnemyGroup[] = [];
  let x = LAYOUT.firstGroupX;
  for (let i = 0; i < region.groupCount; i++) {
    const enemies = rollGroup(region, rng);
    groups.push({ x, enemies });
    x += groupSpan(enemies.length) + FIELD.minGroupGap + rng.int(LAYOUT.gapJitter + 1);
  }
  const pool = bossPoolForLoop(region, loop);
  const choices = pool.length > 1 ? pool.filter((b) => b !== prevBoss) : pool;
  return { groups, bossX: x, bossId: rng.pick(choices) };
}
