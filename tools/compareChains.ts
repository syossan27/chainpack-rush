// 連鎖の性格づけ（A: よろめき、B: 段数に比例する待ち）の比較
// 同じ13個の装備を「長い1本」「短い4本」「混ぜた4本」に並べ、ルールごとに地域を走らせる。
// 使い方: SEEDS=100 npx tsx tools/compareChains.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { CHAIN_RULES, CHAIN_RULES_OFF, type ChainRules } from '../src/config/balance';
import { Combat, type HeroStats } from '../src/core/combat';
import type { Dir } from '../src/core/types';
import { build, type Placed } from '../tests/helpers';

const SEEDS = Number(process.env.SEEDS ?? 100);
const W = 7;
const H = 5;

const POOL = [
  'greatsword',
  'hammer',
  'spear',
  'sword',
  'axe',
  'flame_staff',
  'iron_ball',
  'greatsword',
  'hammer',
  'spear',
  'sword',
  'axe',
  'iron_shield',
];

type Route = { x: number; y: number; exits: Dir[] }[];

/** 起点ごとのルート（起点のマスを先頭に）を受け取り、POOL を順に詰めて配置を作る */
function layout(routes: Route[]) {
  const placed: Placed[] = [];
  let k = 0;
  routes.forEach((r, i) => {
    const [o, ...rest] = r;
    placed.push({
      uid: `o${i}`,
      defId: 'origin_stone',
      x: o!.x,
      y: o!.y,
      exits: o!.exits,
      rarity: 'rare',
    });
    for (const c of rest) {
      placed.push({
        uid: `i${k}`,
        defId: POOL[k]!,
        x: c.x,
        y: c.y,
        exits: c.exits,
        rarity: 'rare',
      });
      k++;
    }
  });
  if (k !== POOL.length) throw new Error(`装備の数が合わない: ${k}`);
  return build(W, H, placed);
}

/** (x0..x1, y) を一直線に右へ。最後のマスは last の向き */
function row(y: number, x0: number, x1: number, last: Dir[] = []): Route {
  const r: Route = [];
  for (let x = x0; x <= x1; x++) r.push({ x, y, exits: x === x1 ? last : ['right'] });
  return r;
}

const LOADOUTS = {
  長い1本: () =>
    layout([
      [
        ...row(0, 0, 6, ['down']),
        ...[6, 5, 4, 3, 2, 1, 0].map((x) => ({
          x,
          y: 1,
          exits: (x === 0 ? [] : ['left']) as Dir[],
        })),
      ],
    ]),
  短い4本: () => layout([row(0, 0, 4), row(1, 0, 3), row(2, 0, 3), row(3, 0, 3)]),
  混ぜた4本: () =>
    layout([
      [...row(0, 0, 6, ['down']), { x: 6, y: 1, exits: [] }],
      row(2, 0, 2),
      row(3, 0, 2),
      row(4, 0, 2),
    ]),
};

const RULES: Record<string, Partial<ChainRules>> = {
  今まで: CHAIN_RULES_OFF,
  B: { ...CHAIN_RULES_OFF, atbPerStep: true },
  A: { ...CHAIN_RULES_OFF, stagger: true },
  'A+B': { ...CHAIN_RULES, guardSteps: 0 },
  'A+B+守り': CHAIN_RULES,
};

// 中盤くらいの強さ（強化を少し買った状態）
const HERO: HeroStats = {
  maxHp: Number(process.env.HP ?? 220),
  atbTime: 1.25,
  attackMult: 1.3,
  runTime: 34,
};
const REGIONS = ['grassland', 'cave', 'rampart'] as const;
const REGION_NAME = { grassland: '草原', cave: '洞窟', rampart: '城壁' };

interface Agg {
  loop: number;
  dead: number;
  bosses: number;
  fires: number;
  steps: number;
  staggers: number;
  kills: number;
  bossDps: number[];
}

function run(rules: Partial<ChainRules>, mk: () => ReturnType<typeof layout>, region: string): Agg {
  const a: Agg = {
    loop: 0,
    dead: 0,
    bosses: 0,
    fires: 0,
    steps: 0,
    staggers: 0,
    kills: 0,
    bossDps: [],
  };
  for (let s = 0; s < SEEDS; s++) {
    const { loadout, items } = mk();
    const c = new Combat({ seed: 5000 + s, regionId: region, loadout, items, hero: HERO, rules });
    let bossTicks = 0;
    let bossDmg = 0;
    while (!c.ended) {
      c.step();
      const boss = c.enemies.find((e) => e.alive && e.def.boss && e.x - c.heroX <= 216);
      if (boss) bossTicks++;
      for (const e of c.drainEvents()) {
        if (e.type === 'step' && !e.whiff) a.steps++;
        if (e.type === 'chainEnd' && e.staggered) a.staggers++;
        if (e.type === 'enemyDeath' && !e.boss && !e.fled) a.kills++;
        if (e.type === 'hit' && c.enemies.find((x) => x.id === e.enemyId)?.def.boss)
          bossDmg += e.damage;
      }
    }
    const r = c.result();
    a.loop += r.reachedLoop;
    a.dead += r.reason === 'dead' ? 1 : 0;
    a.bosses += r.stats.bossesDefeated;
    a.fires += r.stats.fires;
    if (bossTicks > 60) a.bossDps.push(bossDmg / (bossTicks / 60));
  }
  return a;
}

const lines: string[] = [];
const out = (s = '') => lines.push(s);
const f1 = (n: number) => n.toFixed(1);
const t0 = Date.now();

out('# 連鎖の性格づけの比較（A: よろめき / B: 段数に比例する待ち）');
out();
out(
  `同じ13個（レア）の装備を3通りに並べ、各 ${SEEDS} シード。勇者は中盤相当（HP${HERO.maxHp}・ATB1.25秒・攻撃×1.3・34秒）。消耗品なし。`,
);
out(
  `B: 待ち = ATB × 段数/${CHAIN_RULES.atbRefSteps}（×${CHAIN_RULES.atbMinFactor}〜×${CHAIN_RULES.atbMaxFactor}）。A: 無防備中に1回の連鎖で最大HPの${CHAIN_RULES.staggerRatio * 100}%を受けると途切れる。守り: ${CHAIN_RULES.guardSteps}段目までは無防備にならない。`,
);
out();
for (const region of REGIONS) {
  out(`## ${REGION_NAME[region]}`);
  out();
  out(
    '| ルール | 並べ方 | 到達周回 | 力尽きた率 | ボス撃破 | 発火 | 撃てた段 | よろめき | 倒した雑魚 | ボスへの秒間ダメージ |',
  );
  out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [rn, rules] of Object.entries(RULES)) {
    for (const [ln, mk] of Object.entries(LOADOUTS)) {
      const a = run(rules, mk, region);
      const n = SEEDS;
      const dps = a.bossDps.length ? a.bossDps.reduce((s, v) => s + v, 0) / a.bossDps.length : 0;
      out(
        `| ${rn} | ${ln} | ${f1(a.loop / n)} | ${Math.round((a.dead / n) * 100)}% | ${f1(a.bosses / n)} | ${f1(a.fires / n)} | ${f1(a.steps / n)} | ${f1(a.staggers / n)} | ${f1(a.kills / n)} | ${Math.round(dps)} |`,
      );
    }
  }
  out();
}
out(`（計算 ${((Date.now() - t0) / 1000).toFixed(1)}秒）`);
mkdirSync('reports', { recursive: true });
writeFileSync('reports/chain-rules.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
