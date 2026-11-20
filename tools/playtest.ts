// npm run playtest: ボットが初期状態から遊び続け、成長の流れ・詰まる場所・使われない要素を集計する
// 使い方: PLAYERS=30 RUNS=80 npm run playtest  → reports/playtest.md
//   ENDLESS_RUNS=3: 最後に∞を何回走るか（∞が開いたボットだけ。記録には残さない）
import { mkdirSync, writeFileSync } from 'node:fs';
import { MONETIZE, SIM, UPGRADES, type UpgradeId } from '../src/config/balance';
import { Combat, type EndReason } from '../src/core/combat';
import {
  acceptLoot,
  doubleLoot,
  consumeItems,
  endlessUnlocked,
  recordRun,
  sortieBlock,
} from '../src/core/economy';
import { acceptCharms } from '../src/core/charmSave';
import { masteryLevel, recordMastery } from '../src/core/mastery';
import { runConfig } from '../src/core/runConfig';
import { Rng } from '../src/core/rng';
import { createInitialSave, serializeSave } from '../src/core/save';
import { boardUids } from '../src/core/stack';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { getBoard, type BoardId } from '../src/data/boards';
import { ITEM_DEFS, getItemDef } from '../src/data/items';
import { ENDLESS, REGIONS, getRegion, bossPoolForLoop } from '../src/data/regions';
import { getEnemyDef } from '../src/data/enemies';
import {
  buyUpgrades,
  chainSummary,
  equipBestCharms,
  optimizeBoard,
  pickRelic,
  sellJunk,
  synthAll,
  useConsumables,
} from './bot';

const PLAYERS = Number(process.env.PLAYERS ?? 30);
const RUNS = Number(process.env.RUNS ?? 80);
const ENDLESS_RUNS = Number(process.env.ENDLESS_RUNS ?? 3);

interface RunLog {
  player: number;
  run: number;
  region: string;
  loop: number;
  reason: EndReason;
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
  board: BoardId;
  charmDrops: number;
  relics: number;
  goblin: 'none' | 'caught' | 'fled';
  longest: number;
  placed: number;
  bosses: number;
  bought: UpgradeId[];
}

const logs: RunLog[] = [];
const unlockRun: Record<string, number[]> = Object.fromEntries(REGIONS.map((r) => [r.id, []]));
const placedCount = new Map<string, number>(); // defId → 配置に入った回数
const ownedCount = new Map<string, number>(); // defId → 持っていた回数
const dropCount = new Map<string, number>();
const blocked: string[] = [];
// Achievement thresholds: the run each bot first got there. Taken from the achievements; ACH_STEP /
// ACH_DMG (comma-separated) try other thresholds without changing them
const achList = (env: string | undefined, kind: 'maxStep' | 'maxDamage'): number[] =>
  env
    ? env.split(',').map(Number)
    : ACHIEVEMENTS.flatMap((a) => (a.check.kind === kind ? [a.check.n] : []));
const ACH_STEP = achList(process.env.ACH_STEP, 'maxStep');
const ACH_DMG = achList(process.env.ACH_DMG, 'maxDamage');
const achRun: Record<string, number[]> = {};
// The max chain / damage each bot has at the runs where the baseline bots first reached each
// threshold (to see what threshold the new rules reach at the same run)
const SNAP_RUNS = [6, 12, 13, 75, 121, 239, 465];
const snaps: Record<number, { step: number[]; dmg: number[] }> = Object.fromEntries(
  SNAP_RUNS.map((r) => [r, { step: [], dmg: [] }]),
);
// Each bot's best chain / damage after its last run (how far the top thresholds can go)
const stepEnd: number[] = [];
const dmgEnd: number[] = [];
// At the end of each bot: mastery levels and techniques learned, then ∞ loops
const masteryEnd: { top: number; sum: number; learned: number }[] = [];
const endlessLoops: number[] = [];
let endlessBots = 0;
/** ADS=1: 広告のご褒美を使う（戦利品2倍は1日3回、再開は毎ラン1回） */
const ADS = process.env.ADS === '1';
const RUNS_PER_DAY = Number(process.env.RUNS_PER_DAY ?? 10);
let synthTries = 0;
let synthOk = 0;
let techTotal = 0;
let revives = 0;
let doubles = 0;
let doublesToday = 0; // 出撃できなくなって止まったボット
const t0 = Date.now();

for (let p = 0; p < PLAYERS; p++) {
  const save = createInitialSave();
  const rng = new Rng(9000 + p);
  const got = new Set<string>();
  for (let run = 1; run <= RUNS; run++) {
    // 準備: 売る → 合成 → 強化 → 盤面を組み直す → アクセサリーを付ける
    let goldEarned = sellJunk(save);
    const synth = synthAll(save, rng);
    synthTries += synth.tries;
    synthOk += synth.success;
    const bought = buyUpgrades(save);
    optimizeBoard(save, rng);
    equipBestCharms(save);
    goldEarned += sellJunk(save); // 組み直しで外れた装備が倉庫に戻るので、あふれたらもう一度売る
    const block = sortieBlock(save);
    if (block) {
      blocked.push(
        `ボット${p + 1}: ${run}回目で出撃不可（${block === 'noOrigin' ? '起点を置けない' : '倉庫があふれた'}）`,
      );
      break;
    }
    const eqIds = new Set(boardUids(save.loadout));
    for (const it of save.inventory) {
      if (getItemDef(it.defId).kind === 'consumable') continue;
      ownedCount.set(it.defId, (ownedCount.get(it.defId) ?? 0) + 1);
      if (eqIds.has(it.uid)) placedCount.set(it.defId, (placedCount.get(it.defId) ?? 0) + 1);
    }
    const chain = chainSummary(save);
    // 出撃: 開放済みの一番奥の地域。ただしそこで直近5回の平均が1.5周未満なら、ひとつ手前で稼ぐ
    // （10回に1回は奥へ挑み直す）
    const opened = save.progress.unlocked;
    let region = opened[opened.length - 1]!;
    if (opened.length > 1 && run % 10 !== 0) {
      const recent = logs.filter((l) => l.player === p && l.region === region).slice(-5);
      const mean = recent.reduce((a, l) => a + l.loop, 0) / Math.max(1, recent.length);
      if (recent.length >= 5 && mean < 1.5) region = opened[opened.length - 2]!;
    }
    const cfg = runConfig(save, 'normal', region, p * 10000 + run);
    const items = cfg.items;
    const c = new Combat(cfg);
    let techs = 0;
    let relics = 0;
    let goblin: RunLog['goblin'] = 'none';
    for (;;) {
      while (!c.ended) {
        c.step();
        if (c.tick % 6 === 0) useConsumables(c, items);
        for (const e of c.drainEvents()) {
          if (e.type === 'technique') techs++;
          else if (e.type === 'relicOffer' && pickRelic(c, cfg.loadout, items)) relics++;
          else if (e.type === 'treasure' && e.phase !== 'appear') goblin = e.phase;
        }
      }
      // 広告のご褒美: 力尽きたら1回だけ再開
      if (ADS && c.ended === 'dead' && !c.revived && c.revive(MONETIZE.reviveSeconds)) {
        revives++;
        continue;
      }
      break;
    }
    techTotal += techs;
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
    if (r.charms?.length) acceptCharms(save, r.charms);
    // 広告のご褒美: 戦利品2倍（1日 RUNS_PER_DAY 回出撃する想定で、1日の回数まで）
    if (ADS && r.drops.length > 0) {
      if ((run - 1) % RUNS_PER_DAY === 0) doublesToday = 0;
      if (doublesToday < MONETIZE.dailyCaps.extraLoot) {
        doublesToday++;
        doubles++;
        doubleLoot(save, r.drops.length, region, r.reachedLoop, rng);
      }
    }
    const { unlocked } = recordRun(save, region, r);
    if (unlocked) unlockRun[unlocked]!.push(run);
    if (r.stats.rings) recordMastery(save, r.stats.rings, r.stats.sparks ?? []);
    const mark = (key: string) => {
      if (got.has(key)) return;
      got.add(key);
      (achRun[key] ??= []).push(run);
    };
    for (const n of ACH_STEP) if (save.stats.maxStep >= n) mark(`step${n}`);
    for (const n of ACH_DMG) if (save.stats.maxDamage >= n) mark(`dmg${n}`);
    if (snaps[run]) {
      snaps[run]!.step.push(save.stats.maxStep);
      snaps[run]!.dmg.push(save.stats.maxDamage);
    }
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
      board: chain.board,
      charmDrops: r.charms?.length ?? 0,
      relics,
      goblin,
      longest: chain.longest,
      placed: chain.placed,
      bosses: r.stats.bossesDefeated,
      bought,
    });
  }
  stepEnd.push(save.stats.maxStep);
  dmgEnd.push(save.stats.maxDamage);
  // 熟練: 一番高い属性の Lv と、全属性の Lv の合計、覚えた技の数
  const levels = Object.values(save.mastery.points).map((pt) => masteryLevel(pt ?? 0));
  masteryEnd.push({
    top: Math.max(0, ...levels),
    sum: levels.reduce((a, b) => a + b, 0),
    learned: save.mastery.learned.length,
  });
  // ∞: 開いていれば、最後の盤面で何回か走る（記録には残さない）
  if (endlessUnlocked(save)) {
    endlessBots++;
    optimizeBoard(save, rng);
    equipBestCharms(save);
    for (let k = 0; k < ENDLESS_RUNS; k++) {
      const cfg = runConfig(save, 'endless', ENDLESS.id, 777000 + p * 100 + k);
      const c = new Combat(cfg);
      while (!c.ended) {
        c.step();
        for (const e of c.drainEvents())
          if (e.type === 'relicOffer') pickRelic(c, cfg.loadout, cfg.items);
      }
      endlessLoops.push(c.result().reachedLoop);
    }
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
const spread = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    median: median(s),
    p90: s[Math.floor(s.length * 0.9)] ?? NaN,
    max: s[s.length - 1] ?? NaN,
  };
};
const lines: string[] = [];
const out = (s = '') => lines.push(s);

out('# 自動プレイ レポート');
out();
out(
  `ボット ${PLAYERS}人 × 最大 ${RUNS}出撃（${((Date.now() - t0) / 1000).toFixed(1)}秒で計算）。初期セーブから「売却 → 合成 → 強化 → 盤面の組み直し → アクセサリー → 出撃」をくり返す。ランは本編のルール（倒しても連鎖が続く・熟練と閃き・遺物・黄金ゴブリン・アクセサリー）。出撃先は開放済みの一番奥の地域だが、そこで直近5回の平均が1.5周未満ならひとつ手前で稼ぐ（10回に1回は奥へ）。`,
);
out(
  'ボットの盤面は、持っている盤面ごとに自動で組む（決まった形1回＋ゆらして24回）を試して、推定ダメージが最大のものを選ぶ。アクセサリーは強い順に付け、遺物は強さの順に一番高く重なったマスへ貼る。人間の遊び方とは違うので、数字は目安。',
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
  '| 出撃 | 地域 | 到達周回 | 力尽きた率 | 連鎖の発火 | 最長連鎖（配置） | 盤面 | 置いた装備 | 延長(秒) | 一網打尽 | 戦利品 | アクセサリー | 売却G | 所持G | 実時間(秒) |',
);
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const topBoard = (rs: RunLog[]) => {
  const n = new Map<BoardId, number>();
  for (const l of rs) n.set(l.board, (n.get(l.board) ?? 0) + 1);
  const [id] = [...n.entries()].sort((a, b) => b[1] - a[1])[0]!;
  return getBoard(id).name;
};
const buckets = [1, 2, 3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80].filter((b) => b <= RUNS);
for (const b of buckets) {
  const rs = logs.filter((l) => l.run === b);
  if (!rs.length) continue;
  const regions = [...new Set(rs.map((l) => getRegion(l.region).name))].join('/');
  out(
    `| ${b} | ${regions} | ${f1(avg(rs.map((l) => l.loop)))} | ${pct(avg(rs.map((l) => (l.reason === 'dead' ? 1 : 0))))} | ${f1(avg(rs.map((l) => l.fires)))} | ${f1(avg(rs.map((l) => l.longest)))} | ${topBoard(rs)} | ${f1(avg(rs.map((l) => l.placed)))} | ${f1(avg(rs.map((l) => l.timeGained)))} | ${f1(avg(rs.map((l) => l.sweeps)))} | ${f1(avg(rs.map((l) => l.drops)))} | ${avg(rs.map((l) => l.charmDrops)).toFixed(2)} | ${Math.round(avg(rs.map((l) => l.goldEarned)))} | ${Math.round(avg(rs.map((l) => l.gold)))} | ${f1(avg(rs.map((l) => l.realSeconds)))} |`,
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
out('## 実績の基準（初めて届いた出撃回数）');
out();
out('| 基準 | 届いた人 | 出撃回数（中央値） |');
out('| --- | --- | --- |');
for (const key of [...ACH_STEP.map((n) => `step${n}`), ...ACH_DMG.map((n) => `dmg${n}`)]) {
  const xs = achRun[key] ?? [];
  const label = key.startsWith('step') ? `${key.slice(4)}連鎖` : `${key.slice(3)}ダメージ`;
  out(`| ${label} | ${xs.length}/${PLAYERS} | ${xs.length ? median(xs) : '-'} |`);
}
out();
out('## 本編の仕組み');
out();
{
  const early = [1, 2, 3, 4, 5]
    .filter((k) => k <= RUNS)
    .map((k) => f1(avg(logs.filter((l) => l.run === k).map((l) => l.loop))));
  const goblins = logs.filter((l) => l.goblin !== 'none');
  out(`- 1〜5出撃目の到達周回（平均）: ${early.join(' / ')}`);
  out(
    `- ランの長さ（実時間）: 中央値 ${f1(median(logs.map((l) => l.realSeconds)))}秒・平均 ${f1(avg(logs.map((l) => l.realSeconds)))}秒`,
  );
  out(
    `- アクセサリーのドロップ: 1出撃あたり ${avg(logs.map((l) => l.charmDrops)).toFixed(2)}個（0個 ${pct(avg(logs.map((l) => (l.charmDrops === 0 ? 1 : 0))))}）`,
  );
  out(`- 遺物: 1出撃あたり ${avg(logs.map((l) => l.relics)).toFixed(2)}個貼った`);
  out(
    `- 黄金ゴブリン: ${pct(goblins.length / Math.max(1, logs.length))}の出撃で現れ、そのうち ${pct(goblins.filter((l) => l.goblin === 'caught').length / Math.max(1, goblins.length))}を倒した`,
  );
  out(
    `- 熟練（最後）: 一番高い属性 Lv ${f1(avg(masteryEnd.map((m) => m.top)))}・全属性の Lv 合計 ${f1(avg(masteryEnd.map((m) => m.sum)))}・覚えた技 ${f1(avg(masteryEnd.map((m) => m.learned)))}つ`,
  );
  out(
    `- ∞（${ENDLESS_RUNS}回ずつ、記録なし）: 開いたボット ${endlessBots}/${PLAYERS}、到達周回 中央値 ${endlessLoops.length ? median(endlessLoops) : '-'}・平均 ${endlessLoops.length ? f1(avg(endlessLoops)) : '-'}・最高 ${endlessLoops.length ? Math.max(...endlessLoops) : '-'}`,
  );
}
out();
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
    `| ${UPGRADES[id].name} | ${first.length ? median(first) : '買わず'} | ${f1(avg(levels))} | ${UPGRADES[id].maxLevel}（地域で+${(UPGRADES[id].perRegionLevels ?? 0) * 3}） |`,
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
{
  const arts = ITEM_DEFS.filter((d) => d.artifact);
  const total = arts.reduce((sum, d) => sum + (dropCount.get(d.id) ?? 0), 0);
  out(
    `広告のご褒美: ${ADS ? `使う（1日${RUNS_PER_DAY}出撃の想定）。戦利品2倍 ${doubles}回、再開 ${revives}回` : '使わない'}。合成: ${synthTries}回（成功 ${synthOk}回）。必殺技: 1出撃あたり ${(techTotal / Math.max(1, logs.length)).toFixed(2)}回`,
  );
  out();
  out(
    `アーティファクト: ${PLAYERS}人×${RUNS}出撃で計 ${total}個（1人あたり ${(total / PLAYERS).toFixed(1)}個）。${arts.map((d) => `${d.name} ${dropCount.get(d.id) ?? 0}`).join('、')}`,
  );
  out();
}
const bossRows = REGIONS.map(
  (r) =>
    `${r.name}: ${[1, 2, 3]
      .map((k) =>
        bossPoolForLoop(r, k)
          .map((b) => getEnemyDef(b).name)
          .join('/'),
      )
      .join(' → ')}`,
);
out(`（参考）ボスの出現順 ${bossRows.join(' ／ ')}`);

mkdirSync('reports', { recursive: true });
writeFileSync('reports/playtest.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));

// The same numbers as the 2026-11-20 baseline (one line, for comparing)
{
  const summary = {
    unlock: Object.fromEntries(
      REGIONS.map((r) => [
        r.id,
        {
          n: unlockRun[r.id]!.length,
          median: unlockRun[r.id]!.length ? median(unlockRun[r.id]!) : null,
        },
      ]),
    ),
    ach: Object.fromEntries(
      Object.entries(achRun).map(([k, v]) => [k, { n: v.length, median: median(v) }]),
    ),
    earlyLoops: [1, 2, 3, 4, 5].map((k) => avg(logs.filter((l) => l.run === k).map((l) => l.loop))),
    runSecondsMedian: median(logs.map((l) => l.realSeconds)),
    charmDropsPerRun: avg(logs.map((l) => l.charmDrops)),
    masteryTop: avg(masteryEnd.map((m) => m.top)),
    endless: { bots: endlessBots, median: endlessLoops.length ? median(endlessLoops) : null },
    snaps: Object.fromEntries(
      Object.entries(snaps).map(([r, v]) => [
        r,
        { step: v.step.length ? median(v.step) : null, dmg: v.dmg.length ? median(v.dmg) : null },
      ]),
    ),
    // Spread of the best chain / damage after the last run (median, 90th percentile, max)
    stepEnd: spread(stepEnd),
    dmgEnd: spread(dmgEnd),
    // How runs 1-5 ended (share of each reason)
    earlyReasons: Object.fromEntries(
      (['timeout', 'dead', 'retreat'] as const).map((k) => [
        k,
        avg(logs.filter((l) => l.run <= 5).map((l) => (l.reason === k ? 1 : 0))),
      ]),
    ),
    // The run each bot first beat a boss (median over the bots that did)
    firstBossRun: median(
      Array.from(
        { length: PLAYERS },
        (_, p) => logs.find((l) => l.player === p && l.bosses > 0)?.run,
      ).filter((x): x is number => x !== undefined),
    ),
  };
  console.log('PLAYTEST_JSON ' + JSON.stringify(summary));
}
