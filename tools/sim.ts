// npm run sim: 重ねる盤面の参考配置（6つの型）で各地域を自動実行して統計を出す（仕様書 第9章 受け入れ基準3）
//   SIM_RUNS=100   型と地域ごとの回数（標準の盤面）
//   BOARD_RUNS=20  盤面の比べ（全盤面 × 型 × 地域）の回数
import { getBoard } from '../src/data/boards';
import { ARCHETYPES } from './referenceBoards';
import { referenceHeroStats, runBalanceSim } from './simLib';

const RUNS = Number(process.env.SIM_RUNS ?? 100);
const BOARD_RUNS = Number(process.env.BOARD_RUNS ?? 20);
const hero = referenceHeroStats();
console.log(
  `勇者: HP ${hero.maxHp}, ATB ${hero.atbTime.toFixed(2)}秒, 攻撃倍率 ×${hero.attackMult.toFixed(2)} / 各地域 ${RUNS} 回（盤面の比べは ${BOARD_RUNS} 回）`,
);
const report = runBalanceSim(RUNS, { boards: true, boardRuns: BOARD_RUNS });
console.log('');
console.log('型\t地域\t平均到達周回\t(進捗)\t平均発火\t最少発火\t死亡率');
for (const r of report.rows) {
  console.log(
    `${r.type}\t${r.region}\t${r.avgLoop.toFixed(2)}\t\t${r.avgProgress.toFixed(2)}\t${r.avgFires.toFixed(1)}\t\t${r.minFires}\t\t${(r.deathRate * 100).toFixed(0)}%`,
  );
}
console.log('');
const name = (id: string) => ARCHETYPES.find((a) => a.id === id)!.name;
for (const [id, avg] of Object.entries(report.typeAverages))
  console.log(`${name(id)} 全地域平均: ${avg.toFixed(2)}`);
console.log('');
console.log('盤面\t地域\t平均到達周回（6つの型の平均）');
const regionIds = [...new Set(report.boardRows.map((r) => r.regionId))];
const boardIds = [...new Set(report.boardRows.map((r) => r.boardId))];
for (const b of boardIds) {
  const cells = regionIds.map((reg) => {
    const rs = report.boardRows.filter((r) => r.boardId === b && r.regionId === reg);
    return (rs.reduce((s, r) => s + r.avgLoop, 0) / rs.length).toFixed(2);
  });
  console.log(`${getBoard(b).name}\t${cells.join('\t')}`);
}
console.log('');
const c = report.checks;
const mark = (ok: boolean) => (ok ? 'OK' : 'NG');
console.log(
  `[${mark(c.noDominant)}] 全地域で最上位になる型がない（各地域の最上位: ${report.regionTops.map(name).join(', ')}）`,
);
console.log(`[${mark(c.fires)}] どの型でも1ランに8回以上発火`);
console.log(
  `[${mark(c.noBoardDominant === true)}] 全地域で一番になる盤面がない（各地域の一番: ${report.boardTops.map((b) => getBoard(b).name).join(', ')}）`,
);
if (!(c.noDominant && c.fires && c.noBoardDominant)) process.exitCode = 1;
