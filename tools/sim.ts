// npm run sim: 参考配置で各地域を自動実行して統計を出す（仕様書 第9章 受け入れ基準3）
import { REFERENCE_LOADOUTS } from '../src/data/referenceLoadouts';
import { referenceHeroStats, runBalanceSim } from './simLib';

const RUNS = Number(process.env.SIM_RUNS ?? 100);
const hero = referenceHeroStats();
console.log(
  `勇者: HP ${hero.maxHp}, ATB ${hero.atbTime.toFixed(2)}秒, 攻撃倍率 ×${hero.attackMult.toFixed(2)} / 各地域 ${RUNS} 回`,
);
const report = runBalanceSim(RUNS);
for (const ref of REFERENCE_LOADOUTS) {
  const d = report.chainDurations[ref.id]!;
  console.log(
    `${ref.name}: 起点${d.length}個, 連鎖の長さ ${d.map((x) => x.toFixed(1)).join(' / ')} 秒`,
  );
}
console.log('');
console.log('型\t地域\t平均到達周回\t(進捗)\t平均発火\t最少発火\t死亡率');
for (const r of report.rows) {
  console.log(
    `${r.type}\t${r.region}\t${r.avgLoop.toFixed(2)}\t\t${r.avgProgress.toFixed(2)}\t${r.avgFires.toFixed(1)}\t\t${r.minFires}\t\t${(r.deathRate * 100).toFixed(0)}%`,
  );
}
console.log('');
const name = (id: string) => REFERENCE_LOADOUTS.find((r) => r.id === id)!.name;
for (const [id, avg] of Object.entries(report.typeAverages))
  console.log(`${name(id)} 全地域平均: ${avg.toFixed(2)}`);
const c = report.checks;
const mark = (ok: boolean) => (ok ? 'OK' : 'NG');
console.log(`[${mark(c.mixedBest)}] 混合型の平均到達周回が最も高い`);
console.log(`[${mark(c.singleMultiSwap)}] 一本型と複数型の順位が地域で入れ替わる`);
console.log(
  `[${mark(c.noDominant)}] 全地域で最上位になる型がない（各地域の最上位: ${report.regionTops.map(name).join(', ')}）`,
);
console.log(`[${mark(c.fires)}] どの型でも1ランに8回以上発火`);
if (!Object.values(c).every(Boolean)) process.exitCode = 1;
