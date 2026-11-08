// npm run playtest: ボットが初期状態から遊び続け、成長の流れ・詰まる場所・使われない要素を集計する
// 使い方: PLAYERS=30 RUNS=80 npm run playtest  → reports/playtest.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { SIM, UPGRADES, type UpgradeId } from '../src/config/balance';
import { Combat } from '../src/core/combat';
import {
  acceptLoot,
  consumeItems,
  consumableSlots,
  heroStats,
  itemMap,
  recordRun,
  sortieBlock,
} from '../src/core/economy';
import { Rng } from '../src/core/rng';
import { createInitialSave, serializeSave } from '../src/core/save';
import { ITEM_DEFS, getItemDef } from '../src/data/items';
import { REGIONS, getRegion, bossForLoop } from '../src/data/regions';
import { getEnemyDef } from '../src/data/enemies';
import { buyUpgrades, chainSummary, optimizeLoadout, sellJunk, useConsumables } from './bot';

const PLAYERS = Number(process.env.PLAYERS ?? 30);
const RUNS = Number(process.env.RUNS ?? 80);

interface RunLog {
  player: number;
  run: number;
  region: string;
  loop: number;
  reason: 'timeout' | 'dead';
  deathBy: string | null; // 力尽きたときに戦っていた相手
  gold: number;
  goldEarned: number;
  realSeconds: number; // 走った時間も含む実時間
  fires: number;
  maxStep: number;
  timeGained: number;
  sweeps: number;
  drops: number;
  usedConsumables: string[];
  origins: number;
  longest: number;
  placed: number;
  bought: UpgradeId[];
}

const logs: RunLog[] = [];
const unlockRun: Record<string, number[]> = Object.fromEntries(REGIONS.map((r) => [r.id, []]));
const placedCount = new Map<string, number>(); // defId → 配置に入った回数
const ownedCount = new Map<string, number>(); // defId → 持っていた回数
const dropCount = new Map<string, number>();
const blocked: string[] = []; // 出撃できなくなって止まったボット
const t0 = Date.now();

for (let p = 0; p < PLAYERS; p++) {
  const save = createInitialSave();
  const rng = new Rng(9000 + p);
  for (let run = 1; run <= RUNS; run++) {
    // 準備: 売る → 強化 → 配置を組み直す
    let goldEarned = sellJunk(save);
    const bought = buyUpgrades(save);
    optimizeLoadout(save, rng);
    goldEarned += sellJunk(save); // 組み直しで外れた装備が倉庫に戻るので、あふれたらもう一度売る
    const block = sortieBlock(save);
    if (block) {
      blocked.push(
        `ボット${p + 1}: ${run}回目で出撃不可（${block === 'noOrigin' ? '起点を置けない' : '倉庫があふれた'}）`,
      );
      break;
    }
    const eqIds = new Set(save.loadout.cells.filter((c): c is string => !!c));
    for (const it of save.inventory) {
      if (getItemDef(it.defId).kind === 'consumable') continue;
      ownedCount.set(it.defId, (ownedCount.get(it.defId) ?? 0) + 1);
      if (eqIds.has(it.uid)) placedCount.set(it.defId, (placedCount.get(it.defId) ?? 0) + 1);
    }
    const chain = chainSummary(save);
    // 出撃: 開放済みの一番奥の地域
    const region = save.progress.unlocked[save.progress.unlocked.length - 1]!;
    const items = itemMap(save);
    const c = new Combat({
      seed: p * 10000 + run,
      regionId: region,
      loadout: save.loadout,
      items,
      hero: heroStats(save),
      consumableSlots: consumableSlots(save),
    });
    while (!c.ended) {
      c.step();
      if (c.tick % 6 === 0) useConsumables(c, items);
      c.drainEvents();
    }
    const r = c.result();
    let deathBy: string | null = null;
    if (r.reason === 'dead') {
      const boss = c.enemies.find((e) => e.alive && e.def.boss && e.x - c.heroX <= 216);
      deathBy = boss
        ? `${getEnemyDef(boss.defId).name}（${r.reachedLoop}周目）`
        : `${r.reachedLoop}周目の雑魚`;
    }
    // 確定: 使った消耗品を消し、戦利品を受け取る
    consumeItems(save, r.usedConsumables);
    for (const d of r.drops) dropCount.set(d.defId, (dropCount.get(d.defId) ?? 0) + 1);
    acceptLoot(save, r.drops);
    const { unlocked } = recordRun(save, region, r);
    if (unlocked) unlockRun[unlocked]!.push(run);
    logs.push({
      player: p,
      run,
      region,
      loop: r.reachedLoop,
      reason: r.reason,
      deathBy,
      gold: save.gold,
      goldEarned,
      realSeconds: r.ticks / SIM.ticksPerSecond,
      fires: r.stats.fires,
      maxStep: r.stats.maxStep,
      timeGained: r.stats.timeGained,
      sweeps: r.stats.sweeps,
      drops: r.drops.length,
      usedConsumables: r.usedConsumables.map((u) => items.get(u)!.defId),
      origins: chain.origins,
      longest: chain.longest,
      placed: chain.placed,
      bought,
    });
  }
  // SAVE_OUT=path: 1体目のボットのセーブを書き出す（画面の点検用）
  if (p === 0 && process.env.SAVE_OUT) writeFileSync(process.env.SAVE_OUT, serializeSave(save));
}

// ---- 集計 ----
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const f1 = (x: number) => x.toFixed(1);
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const lines: string[] = [];
const out = (s = '') => lines.push(s);

out('# 自動プレイ レポート');
out();
out(
  `ボット ${PLAYERS}人 × 最大 ${RUNS}出撃（${((Date.now() - t0) / 1000).toFixed(1)}秒で計算）。初期セーブから「売却 → 強化 → 配置の組み直し → 出撃」をくり返す。出撃先は開放済みの一番奥の地域。`,
);
out(
  'ボットの配置は「出口をたどってルートを組む」を24回試して、1秒あたりのダメージ見積もりが最大のものを選ぶ。人間の遊び方とは違うので、数字は目安。',
);
out();
out('## 地域の開放');
out();
out('| 地域 | 開放した人 | 開放までの出撃回数（中央値） | 最短 | 最長 |');
out('| --- | --- | --- | --- | --- |');
for (const r of REGIONS.slice(1)) {
  const xs = unlockRun[r.id]!;
  out(
    `| ${r.name} | ${xs.length}/${PLAYERS} | ${xs.length ? median(xs) : '-'} | ${xs.length ? Math.min(...xs) : '-'} | ${xs.length ? Math.max(...xs) : '-'} |`,
  );
}
out();
out('## 出撃回数ごとの推移（全ボットの平均）');
out();
out(
  '| 出撃 | 地域 | 到達周回 | 力尽きた率 | 連鎖の発火 | 最長連鎖（配置） | 起点の数 | 置いた装備 | 延長(秒) | 一網打尽 | 戦利品 | 売却G | 所持G | 実時間(秒) |',
);
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const buckets = [1, 2, 3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80].filter((b) => b <= RUNS);
for (const b of buckets) {
  const rs = logs.filter((l) => l.run === b);
  if (!rs.length) continue;
  const regions = [...new Set(rs.map((l) => getRegion(l.region).name))].join('/');
  out(
    `| ${b} | ${regions} | ${f1(avg(rs.map((l) => l.loop)))} | ${pct(avg(rs.map((l) => (l.reason === 'dead' ? 1 : 0))))} | ${f1(avg(rs.map((l) => l.fires)))} | ${f1(avg(rs.map((l) => l.longest)))} | ${f1(avg(rs.map((l) => l.origins)))} | ${f1(avg(rs.map((l) => l.placed)))} | ${f1(avg(rs.map((l) => l.timeGained)))} | ${f1(avg(rs.map((l) => l.sweeps)))} | ${f1(avg(rs.map((l) => l.drops)))} | ${Math.round(avg(rs.map((l) => l.goldEarned)))} | ${Math.round(avg(rs.map((l) => l.gold)))} | ${f1(avg(rs.map((l) => l.realSeconds)))} |`,
  );
}
out();
if (blocked.length) {
  out('## 出撃できなくなったボット');
  out();
  for (const b of blocked) out(`- ${b}`);
  out();
}
out('## 地域ごと');
out();
out('| 地域 | 出撃数 | 到達周回（平均） | 力尽きた率 | 主な死因 |');
out('| --- | --- | --- | --- | --- |');
for (const r of REGIONS) {
  const rs = logs.filter((l) => l.region === r.id);
  if (!rs.length) continue;
  const deaths = new Map<string, number>();
  for (const l of rs) if (l.deathBy) deaths.set(l.deathBy, (deaths.get(l.deathBy) ?? 0) + 1);
  const top = [...deaths.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} ${pct(v / rs.length)}`)
    .join('、');
  out(
    `| ${r.name} | ${rs.length} | ${f1(avg(rs.map((l) => l.loop)))} | ${pct(avg(rs.map((l) => (l.reason === 'dead' ? 1 : 0))))} | ${top || '-'} |`,
  );
}
out();
{
  // 序盤（1〜5回目）の死因
  const early = logs.filter((l) => l.run <= 5);
  const deaths = new Map<string, number>();
  for (const l of early) if (l.deathBy) deaths.set(l.deathBy, (deaths.get(l.deathBy) ?? 0) + 1);
  const top = [...deaths.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${k} ${pct(v / early.length)}`)
    .join('、');
  out(`序盤（1〜5回目）の死因: ${top || '-'}`);
  out();
}
out('## 強化の購入（最初に買った出撃回数の中央値・最後まで何段階まで上げたか）');
out();
out('| 強化 | 1段目（出撃） | 最終の段階（平均） | 上限 |');
out('| --- | --- | --- | --- |');
for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
  const first: number[] = [];
  const levels: number[] = [];
  for (let p = 0; p < PLAYERS; p++) {
    const pl = logs.filter((l) => l.player === p);
    const f = pl.find((l) => l.bought.includes(id));
    if (f) first.push(f.run);
    levels.push(pl.reduce((s, l) => s + l.bought.filter((x) => x === id).length, 0));
  }
  out(
    `| ${UPGRADES[id].name} | ${first.length ? median(first) : '買わず'} | ${f1(avg(levels))} | ${UPGRADES[id].maxLevel} |`,
  );
}
out();
out('## 装備: 持っていたときに配置へ使われた率（低いものは出番が少ない）');
out();
out('| 装備 | 拾った数 | 配置に使われた率 |');
out('| --- | --- | --- |');
const equipDefs = ITEM_DEFS.filter((d) => d.kind !== 'consumable');
for (const d of [...equipDefs].sort(
  (a, b) =>
    (placedCount.get(a.id) ?? 0) / (ownedCount.get(a.id) || 1) -
    (placedCount.get(b.id) ?? 0) / (ownedCount.get(b.id) || 1),
)) {
  const owned = ownedCount.get(d.id) ?? 0;
  out(
    `| ${d.name} | ${dropCount.get(d.id) ?? 0} | ${owned ? pct((placedCount.get(d.id) ?? 0) / owned) : '-'} |`,
  );
}
out();
out('## 消耗品: 拾った数と使った数');
out();
out('| 消耗品 | 拾った | 使った |');
out('| --- | --- | --- |');
for (const d of ITEM_DEFS.filter((x) => x.kind === 'consumable')) {
  const used = logs.reduce((s, l) => s + l.usedConsumables.filter((u) => u === d.id).length, 0);
  out(`| ${d.name} | ${dropCount.get(d.id) ?? 0} | ${used} |`);
}
out();
const bossRows = REGIONS.map(
  (r) => `${r.name}: ${[1, 2, 3].map((k) => getEnemyDef(bossForLoop(r, k)).name).join(' → ')}`,
);
out(`（参考）ボスの出現順 ${bossRows.join(' ／ ')}`);

mkdirSync('reports', { recursive: true });
writeFileSync('reports/playtest.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
