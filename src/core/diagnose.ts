// 配置の診断: いまの並べ方から、実際に「入れ替え・置きかえ・空きマスに置く」を試して、
// 推定ダメージ（estimateRoute）が一番伸びる手を、理由つきで返す。答えをそのまま組むのではなく、次の一手を示す。
// 防具には手を付けない（守りを削ってダメージを伸ばす提案はしない）。
import { getItemDef } from '../data/items';
import { simulateChain } from './chain';
import { estimateRoute } from './estimate';
import type { ItemInstance, Loadout } from './types';

export type AdviceKind = 'swap' | 'replace' | 'place' | 'unreached' | 'short';

export interface Advice {
  kind: AdviceKind;
  /** 何をするか（例: 「剣」と「大剣」を入れ替える） */
  title: string;
  /** なぜ伸びるか */
  reason: string;
  /** 推定ダメージの増え方（合計） */
  gain: number;
  /** やってみたときの並べ方（ヒントだけのものは null） */
  apply: Loadout | null;
  /** 光らせるマス */
  cells: number[];
}

export interface Diagnosis {
  total: number;
  advices: Advice[];
}

interface Score {
  total: number;
  combos: number;
  techs: number;
  maxStep: number;
}

function score(loadout: Loadout, items: ReadonlyMap<string, ItemInstance>, mult: number): Score {
  const plans = simulateChain(loadout, items).plans;
  let total = 0;
  let combos = 0;
  let techs = 0;
  let maxStep = 0;
  for (const p of plans) {
    const e = estimateRoute(p, items, mult);
    total += e.total;
    combos += e.combos;
    techs += e.techs.length;
    maxStep = Math.max(maxStep, p.maxStep);
  }
  return { total, combos, techs, maxStep };
}

const isAttack = (it: ItemInstance | undefined): boolean =>
  !!it && getItemDef(it.defId).kind === 'attack';

/** 調べる倉庫の装備（攻撃だけ、強い順に上から） */
function candidates(stored: readonly ItemInstance[], limit: number): ItemInstance[] {
  const seen = new Set<string>();
  return stored
    .filter((i) => getItemDef(i.defId).kind === 'attack')
    .sort((a, b) => (getItemDef(b.defId).atk ?? 0) - (getItemDef(a.defId).atk ?? 0))
    .filter((i) => {
      // 同じ装備・同じレアリティ・同じ出口は1つだけ試す
      const k = `${i.defId}|${i.rarity}|${i.exits.slice().sort().join('')}|${(i.affixes ?? []).map((a) => a.id).join('')}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

/** なぜ伸びるかを、前後の違いから言葉にする */
function explain(before: Score, after: Score, knownTech: boolean, kind: AdviceKind): string {
  if (after.techs > before.techs)
    return knownTech ? '必殺技の並びがそろう！' : '何か特別なことが起きそうな並び…';
  if (after.combos > before.combos) return '状態異常のコンボが増える';
  if (after.maxStep > before.maxStep) return `連鎖が${after.maxStep}段まで長くなる`;
  if (kind === 'replace') return 'もっと強い装備（レアリティ・攻撃力）に替える';
  if (kind === 'place') return '空いているマスも連鎖に使う';
  return '強い装備が後ろの段（倍率が高い）に来る';
}

export function diagnose(
  loadout: Loadout,
  inventory: readonly ItemInstance[],
  attackMult: number,
  discoveredTechs: readonly string[],
): Diagnosis {
  const items = new Map(inventory.map((i) => [i.uid, i]));
  const base = score(loadout, items, attackMult);
  const placed = new Set(loadout.cells.filter((c): c is string => !!c));
  const consumableUids = new Set(loadout.consumables);
  const stored = inventory.filter((i) => !placed.has(i.uid) && !consumableUids.has(i.uid));
  const pool = candidates(stored, 30);
  const name = (it: ItemInstance) => getItemDef(it.defId).name;
  const knownTech = discoveredTechs.length > 0;
  const minGain = Math.max(5, base.total * 0.03);

  type Try = { kind: AdviceKind; title: string; l: Loadout; cells: number[]; s?: Score };
  const best: Partial<Record<AdviceKind, Try & { s: Score }>> = {};
  const consider = (t: Try) => {
    const s = score(t.l, items, attackMult);
    const cur = best[t.kind];
    if (!cur || s.total > cur.s.total) best[t.kind] = { ...t, s };
  };
  const withCells = (cells: (string | null)[]): Loadout => ({ ...loadout, cells });

  // 1. 置いてある攻撃装備どうしを入れ替える
  const atkCells = loadout.cells
    .map((u, c) => ({ u, c }))
    .filter((x) => x.u && isAttack(items.get(x.u)));
  for (let a = 0; a < atkCells.length; a++)
    for (let b = a + 1; b < atkCells.length; b++) {
      const A = atkCells[a]!;
      const B = atkCells[b]!;
      if (items.get(A.u!)!.defId === items.get(B.u!)!.defId) continue;
      const cells = loadout.cells.slice();
      cells[A.c] = B.u;
      cells[B.c] = A.u;
      consider({
        kind: 'swap',
        title: `「${name(items.get(A.u!)!)}」と「${name(items.get(B.u!)!)}」を入れ替える`,
        l: withCells(cells),
        cells: [A.c, B.c],
      });
    }
  // 2. 置いてある攻撃装備を、倉庫の装備に置きかえる
  for (const x of atkCells)
    for (const it of pool) {
      const cells = loadout.cells.slice();
      cells[x.c] = it.uid;
      consider({
        kind: 'replace',
        title: `「${name(items.get(x.u!)!)}」を倉庫の「${name(it)}」に置きかえる`,
        l: withCells(cells),
        cells: [x.c],
      });
    }
  // 3. 空いているマスに、倉庫の装備を置く
  loadout.cells.forEach((u, c) => {
    if (u) return;
    for (const it of pool) {
      const cells = loadout.cells.slice();
      cells[c] = it.uid;
      consider({
        kind: 'place',
        title: `空いているマスに「${name(it)}」を置く`,
        l: withCells(cells),
        cells: [c],
      });
    }
  });

  const advices: Advice[] = [];
  for (const t of Object.values(best)) {
    if (!t) continue;
    const gain = t.s.total - base.total;
    if (gain < minGain) continue;
    advices.push({
      kind: t.kind,
      title: t.title,
      reason: explain(base, t.s, knownTech, t.kind),
      gain,
      apply: t.l,
      cells: t.cells,
    });
  }
  advices.sort((a, b) => b.gain - a.gain);

  // ヒント: どの起点からも届いていない装備、短すぎる連鎖
  const preview = simulateChain(loadout, items);
  const unreached = [...preview.unreachable];
  if (unreached.length > 0)
    advices.push({
      kind: 'unreached',
      title: `どの起点からも届いていない装備が${unreached.length}個`,
      reason: '起点から矢印をたどって、つながる向きに置き直そう（光っているマス）',
      gain: 0,
      apply: null,
      cells: unreached,
    });
  const short = preview.plans.findIndex((p) => p.maxStep <= 2 && p.steps.length > 0);
  if (short >= 0 && preview.plans.length > 1)
    advices.push({
      kind: 'short',
      title: `起点${short + 1}の連鎖が${preview.plans[short]!.maxStep}段で止まっている`,
      reason: '長くつなぐほど後ろの段の倍率が上がる。出口の向きを鍛冶屋で変えるのも手',
      gain: 0,
      apply: null,
      cells: [],
    });
  return { total: base.total, advices: advices.slice(0, 4) };
}
