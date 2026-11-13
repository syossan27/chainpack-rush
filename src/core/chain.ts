// planChain / simulateChain: 配置から連鎖の順番・段数・倍率・時間・防御値を決める（仕様書 第5章）
import { ipow } from './rng';
import { affixValue } from './affixes';
import { TECHNIQUES } from '../data/techniques';
import { CHAIN, MERGE, RARITY } from '../config/balance';
import { getItemDef } from '../data/items';
import type {
  ChainPlan,
  ChainStep,
  Dir,
  ItemDef,
  ItemInstance,
  LineBoost,
  LineEffect,
  Loadout,
} from './types';
import { DIRS } from './types';

const DIR_DELTA: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

/** 時間は整数ミリ秒で扱い、浮動小数の誤差で同時判定がぶれないようにする */
const MS = 1000;

export function chainMultiplier(step: number, cap: number = CHAIN.multCap): number {
  return Math.min(cap, ipow(CHAIN.multBase, Math.max(0, step - 1)));
}

/** 起点石の種類: 線に乗った起点の効果（同じ種類の起点石は1回だけ） */
export function lineEffects(
  items: ReadonlyMap<string, ItemInstance>,
  originUids: readonly string[],
): LineEffect[] {
  const seen = new Set<string>();
  const out: LineEffect[] = [];
  for (const u of originUids) {
    const it = items.get(u);
    if (!it || seen.has(it.defId)) continue;
    seen.add(it.defId);
    const line = getItemDef(it.defId).line;
    if (line) out.push(line);
  }
  return out;
}

/** 次の装備へ伝わるまでの時間（ミリ秒）。速の起点石・重い起点石で変わる */
function relayMs(def: ItemDef, fx: readonly LineEffect[]): number {
  const sec = fx.reduce((t, e) => t + (e.relay ?? 0), def.relayDelay ?? CHAIN.relayDelay);
  return Math.round(Math.max(CHAIN.minRelay, sec) * MS);
}

/** 線の効果を、この装備についての掛け算にまとめる。効果がなければ undefined */
export function lineBoost(def: ItemDef, fx: readonly LineEffect[]): LineBoost | undefined {
  const b: LineBoost = { damage: 1, defense: 1, poison: 1, lifesteal: 1 };
  for (const e of fx) {
    if (def.kind === 'attack') {
      b.damage *= 1 + (e.damage ?? 0) / 100;
      if (e.element && e.element === (def.element ?? 'physical'))
        b.damage *= 1 + (e.elementDamage ?? 0) / 100;
      if (def.applies === 'poison') b.poison *= 1 + (e.poison ?? 0) / 100;
      if (def.lifesteal) b.lifesteal *= 1 + (e.lifesteal ?? 0) / 100;
    } else if (def.kind === 'defense') b.defense *= 1 + (e.defense ?? 0) / 100;
  }
  return b.damage === 1 && b.defense === 1 && b.poison === 1 && b.lifesteal === 1 ? undefined : b;
}

/** 防御装備が連鎖で通ったときの防御値（盾の起点石の効果込み） */
export function defenseValue(inst: ItemInstance, line?: LineBoost): number {
  return (
    (getItemDef(inst.defId).defense ?? 0) *
    RARITY[inst.rarity].mult *
    (1 + affixValue(inst, 'sturdy') / 100) *
    (line?.defense ?? 1)
  );
}

export function neighborCell(loadout: Loadout, cell: number, dir: Dir): number | null {
  const x = cell % loadout.width;
  const y = Math.floor(cell / loadout.width);
  const [dx, dy] = DIR_DELTA[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= loadout.width || ny >= loadout.height) return null;
  return ny * loadout.width + nx;
}

/**
 * 起点から連鎖を展開する。
 * - 出口の先のマスへ relayDelay 後に伝わる（入り口の制約なし）
 * - 1回の連鎖で各アイテムは1回だけ発動。先に届いた枝が優先、同時なら上→右→下→左
 * - 攻撃装備で段数+1、防御装備は通すが数えない
 * - 起点同士がつながっている場合、後ろの起点は「通すだけ」のマスとして扱う
 */
export function planChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
): ChainPlan {
  if (loadout.cells.indexOf(originUid) < 0)
    return {
      originUid,
      originUids: [originUid],
      steps: [],
      duration: 0,
      defenseGain: 0,
      maxStep: 0,
      multCap: CHAIN.multCap,
    };
  // One origin is the merged planner with a single line and no merge cells
  return spreadLinked(loadout, items, [originUid], null).plan;
}

// ---- 合流: 線がつながった起点を一緒に撃つ ----
/** その段がどの起点の線か（いちばん段数の高い親をたどった先の起点） */
export function lineOrigin(plan: ChainPlan, index: number): string {
  let i = index;
  while (plan.steps[i]!.parentIndex >= 0) i = plan.steps[i]!.parentIndex;
  return plan.steps[i]!.uid;
}

/**
 * 線がつながった起点をまとめる（発火順）。ある起点の線が通るマスを、別の起点の線も通れば同じまとまり。
 * まとまりは1回の発火で一緒に撃つ（待ちは1回分、線は並んで走る）
 */
export function linkedGroups(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  origins: readonly string[],
): string[][] {
  const cellsOf = origins.map(
    (o) =>
      new Set(
        planChain(loadout, items, o)
          .steps.slice(1)
          .map((s) => s.cell),
      ),
  );
  const root = origins.map((_, i) => i);
  const find = (i: number): number => {
    while (root[i] !== i) i = root[i]!;
    return i;
  };
  for (let a = 0; a < origins.length; a++)
    for (let b = a + 1; b < origins.length; b++) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) continue;
      for (const c of cellsOf[a]!)
        if (cellsOf[b]!.has(c)) {
          root[Math.max(ra, rb)] = Math.min(ra, rb);
          break;
        }
    }
  const groups = new Map<number, string[]>();
  origins.forEach((o, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), o]);
  });
  return [...groups.values()];
}

/**
 * 一緒に撃つ起点のうち、t=0 に線を出す起点（発火順）。ほかの起点の線が届く起点は「通すだけ」のマスで、
 * 届いた線の段数をそのまま先へ渡す。届き合っているだけの起点（輪）は、発火順で先の起点から出す
 */
export function unitHeads(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUids: readonly string[],
): string[] {
  if (originUids.length <= 1) return originUids.slice();
  const reach = new Map(
    originUids.map((o) => [
      o,
      new Set(
        planChain(loadout, items, o)
          .steps.slice(1)
          .map((s) => s.cell),
      ),
    ]),
  );
  const cellOf = (o: string) => loadout.cells.indexOf(o);
  const fed = (o: string) => originUids.some((x) => x !== o && reach.get(x)!.has(cellOf(o)));
  const heads = originUids.filter((o) => !fed(o));
  const covered = new Set<number>();
  for (const h of heads) for (const c of [cellOf(h), ...reach.get(h)!]) covered.add(c);
  for (const o of originUids) {
    if (heads.includes(o) || covered.has(cellOf(o))) continue;
    heads.push(o);
    for (const c of [cellOf(o), ...reach.get(o)!]) covered.add(c);
  }
  return originUids.filter((o) => heads.includes(o));
}

/** 1回の発火で撃つ連鎖（起点が1つなら planChain、つながった起点が複数なら合流つき） */
export function planUnit(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUids: readonly string[],
): ChainPlan {
  return originUids.length <= 1
    ? planChain(loadout, items, originUids[0] ?? '')
    : planMerged(loadout, items, originUids);
}

/**
 * Steps each line brings to a merge cell, as shown on the cell (e.g. 3+3).
 * `feeders` are the steps of the cells that lead into it. When the cell is a step of its own
 * (an attack), it is the next step of the shortest line, so that line counts one more:
 * joining a line's 3rd step from another line's 3rd step reads 3+3.
 * A line with no step yet (its origin stone right next to the cell) is not counted up.
 */
export function mergeArrivals(feeders: readonly number[], isStep: boolean): number[] {
  const out = [...feeders];
  if (!isStep || feeders.length < 2) return out;
  let shortest = -1;
  feeders.forEach((n, i) => {
    if (n > 0 && (shortest < 0 || n < feeders[shortest]!)) shortest = i;
  });
  if (shortest >= 0) out[shortest] = feeders[shortest]! + 1;
  return out;
}

/** 合流ボーナス（%）: 段数の合計 ×（短い線 ÷ 長い線）。線の一本が段数0なら出ない */
export function mergeBonusOf(arrived: readonly number[]): number {
  if (arrived.length < 2) return 0;
  const longest = Math.max(...arrived);
  if (longest <= 0) return 0;
  const sum = arrived.reduce((a, b) => a + b, 0);
  return Math.min(MERGE.cap, sum * (Math.min(...arrived) / longest) * MERGE.perPoint);
}

/** The largest merge bonus (%) anywhere in this firing (0 when no lines merge) */
export function maxMergeBonus(plan: ChainPlan): number {
  return plan.steps.reduce((m, s) => Math.max(m, s.mergeBonus ?? 0), 0);
}

interface MergePending {
  tMs: number;
  seq: number;
  cell: number;
  parentIndex: number;
  branch: number;
}

/**
 * Spread the chain from several origins at once. With `merge`, a listed cell waits until all its
 * lines arrive, then fires as the next step of the longest line
 * (the first pass finds where each line reaches, the second waits)
 */
function spreadLinked(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUids: readonly string[],
  merge: Map<number, number[][]> | null,
): { plan: ChainPlan; arrivals: Map<number, number[][]> } {
  const steps: ChainStep[] = [];
  const lines: number[][] = []; // 各ステップに届いた線（originUids の添字）
  const counts: number[] = []; // 各ステップ時点の段数（子へ渡す数）
  const visited = new Set<number>();
  const arrivals = new Map<number, number[][]>();
  const held = new Map<number, MergePending[]>();
  const queue: MergePending[] = [];
  let seq = 0;
  let nextBranch = 0;
  let defenseGain = 0;
  let lastMs = 0;
  let nowMs = 0;
  let maxStep = 0;
  // Origin stone effects for each set of lines (same set → same effects)
  const fxCache = new Map<string, LineEffect[]>();
  const effectsOf = (ls: readonly number[]): LineEffect[] => {
    const key = ls.join(',');
    let fx = fxCache.get(key);
    if (!fx) {
      fx = lineEffects(
        items,
        ls.map((k) => originUids[k]!),
      );
      fxCache.set(key, fx);
    }
    return fx;
  };

  const expand = (index: number, tMs: number): void => {
    const s = steps[index]!;
    const inst = items.get(s.uid);
    if (!inst) return;
    const def = getItemDef(inst.defId);
    const delayMs = relayMs(def, effectsOf(lines[index]!));
    let first = true;
    for (const dir of DIRS) {
      if (!inst.exits.includes(dir)) continue;
      const n = neighborCell(loadout, s.cell, dir);
      if (n === null) continue;
      const uid = loadout.cells[n];
      if (!uid || !items.has(uid)) continue;
      const branch = first ? s.branch : nextBranch++;
      first = false;
      queue.push({ tMs: tMs + delayMs, seq: seq++, cell: n, parentIndex: index, branch });
    }
  };

  const originCells = new Set<number>();
  const heads = new Set(unitHeads(loadout, items, originUids));
  originUids.forEach((uid, k) => {
    const cell = loadout.cells.indexOf(uid);
    if (cell < 0 || !heads.has(uid)) return;
    visited.add(cell);
    originCells.add(cell);
    steps.push({
      t: 0,
      uid,
      step: null,
      branch: nextBranch++,
      mult: 1,
      from: null,
      parentIndex: -1,
      cell,
      origins: [uid],
    });
    lines.push([k]);
    counts.push(0);
  });
  const originSteps = steps.length;
  for (let i = 0; i < originSteps; i++) expand(i, 0);

  const fire = (cell: number, tMs: number, parents: number[], branch: number): void => {
    visited.add(cell);
    const uid = loadout.cells[cell]!;
    const inst = items.get(uid)!;
    const def = getItemDef(inst.defId);
    const feeders = parents.map((p) => counts[p]!);
    // The chain goes on from the longest line (merging does not add the lines' steps)
    const base = Math.max(...feeders);
    // A line that passes through another origin stone of this firing also takes that stone's effect
    const self = def.kind === 'origin' ? originUids.indexOf(uid) : -1;
    const myLines = [
      ...new Set([...parents.flatMap((p) => lines[p]!), ...(self >= 0 ? [self] : [])]),
    ].sort((a, b) => a - b);
    // Origin stone types: every line that reaches this cell brings its stone's effect
    const boost = lineBoost(def, effectsOf(myLines));
    let step: number | null = null;
    let count = base;
    if (def.kind === 'attack') {
      count = base + 1;
      step = count;
      if (count > maxStep) maxStep = count;
    } else if (def.kind === 'defense') {
      defenseGain += defenseValue(inst, boost);
    }
    // 合流ボーナスはここで決まり、この先の本流へ引き継ぐ（いちばん大きいもの）
    const arrived = mergeArrivals(feeders, def.kind === 'attack');
    const inherited = Math.max(0, ...parents.map((p) => steps[p]!.mergeBonus ?? 0));
    const mergeBonus = Math.max(inherited, parents.length > 1 ? mergeBonusOf(arrived) : 0);
    const main = parents[0]!;
    steps.push({
      t: tMs / MS,
      uid,
      step,
      branch,
      mult: step === null ? 1 : chainMultiplier(step),
      from: steps[main]!.uid,
      parentIndex: main,
      cell,
      ...(parents.length > 1 ? { mergeParents: parents, mergeArrived: arrived } : {}),
      ...(mergeBonus > 0 ? { mergeBonus } : {}),
      origins: myLines.map((k) => originUids[k]!),
      ...(boost ? { line: boost } : {}),
    });
    lines.push(myLines);
    counts.push(count + (def.kind === 'attack' ? (def.stepBoost ?? 0) : 0));
    // 必殺技: いちばん段数の高い線をたどった並びで判定する
    if (def.kind === 'attack') {
      const me = steps[steps.length - 1]!;
      const p1 = steps[me.parentIndex];
      const p2 = p1 ? steps[p1.parentIndex] : undefined;
      if (p1 && p2 && p1.parentIndex >= 0 && p2.parentIndex >= 0) {
        const ids = [p2, p1, me].map((x) => items.get(x.uid)!.defId);
        const tq = TECHNIQUES.find((q) => q.seq.every((opts, k) => opts.includes(ids[k]!)));
        if (tq) me.tech = tq.id;
      }
    }
    if (tMs > lastMs) lastMs = tMs;
    expand(steps.length - 1, tMs);
  };

  // 届いた線から、起点の重ならないものを1本ずつ（段数の高い順に）選ぶ
  const pick = (list: MergePending[]): MergePending[] => {
    const sorted = [...list].sort((a, b) => counts[b.parentIndex]! - counts[a.parentIndex]!);
    const used = new Set<number>();
    const out: MergePending[] = [];
    for (const a of sorted) {
      const ls = lines[a.parentIndex]!;
      if (ls.some((x) => used.has(x))) continue;
      for (const x of ls) used.add(x);
      out.push(a);
    }
    return out;
  };

  while (queue.length > 0 || held.size > 0) {
    if (queue.length === 0) {
      // 待っていた線が来なかった（途中を別の線に取られた）: 届いた線だけで、いま発動する
      const [cell, list] = [...held.entries()].sort(
        (a, b) => Math.max(...a[1].map((x) => x.tMs)) - Math.max(...b[1].map((x) => x.tMs)),
      )[0]!;
      held.delete(cell);
      const got = pick(list);
      fire(
        cell,
        Math.max(nowMs, ...got.map((x) => x.tMs)),
        got.map((x) => x.parentIndex),
        got[0]!.branch,
      );
      continue;
    }
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i]!;
      const b = queue[best]!;
      if (a.tMs < b.tMs || (a.tMs === b.tMs && a.seq < b.seq)) best = i;
    }
    const p = queue.splice(best, 1)[0]!;
    nowMs = p.tMs;
    if (!originCells.has(p.cell))
      arrivals.set(p.cell, [...(arrivals.get(p.cell) ?? []), lines[p.parentIndex]!]);
    if (visited.has(p.cell)) continue;
    const need = merge?.get(p.cell);
    if (!need) {
      fire(p.cell, p.tMs, [p.parentIndex], p.branch);
      continue;
    }
    const list = [...(held.get(p.cell) ?? []), p];
    held.set(p.cell, list);
    const got = new Set(list.flatMap((x) => lines[x.parentIndex]!));
    if (need.every((g) => g.every((x) => got.has(x)))) {
      held.delete(p.cell);
      const ps = pick(list);
      fire(
        p.cell,
        p.tMs,
        ps.map((x) => x.parentIndex),
        ps[0]!.branch,
      );
    }
  }

  const multCap = Math.max(
    CHAIN.multCap,
    ...steps.map((s) => getItemDef(items.get(s.uid)!.defId).multCap ?? 0),
  );
  if (multCap !== CHAIN.multCap)
    for (const s of steps) if (s.step !== null) s.mult = chainMultiplier(s.step, multCap);
  return {
    plan: {
      originUid: originUids[0]!,
      originUids: originUids.slice(),
      steps,
      duration: (lastMs + Math.round(CHAIN.tailDelay * MS)) / MS,
      defenseGain,
      maxStep,
      multCap,
    },
    arrivals,
  };
}

/** Linked origins' chain with merges: a cell reached by 2+ lines waits for all, then fires as the next step of the longest */
export function planMerged(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUids: readonly string[],
): ChainPlan {
  const first = spreadLinked(loadout, items, originUids, null);
  // 起点の重ならない線が2本以上届くマスが合流点
  const merge = new Map<number, number[][]>();
  for (const [cell, list] of first.arrivals) {
    const separate: number[][] = [];
    for (const ls of list)
      if (separate.every((g) => !g.some((x) => ls.includes(x)))) separate.push(ls);
    if (separate.length >= 2) merge.set(cell, separate);
  }
  return spreadLinked(loadout, items, originUids, merge).plan;
}

/** 配置画面用: 1回の発火で撃つ単位ごとに連鎖を計算し、どの起点からも届かないマスを返す */
export interface ChainPreview {
  /** 発火する単位ごと（線がつながった起点はまとめて1つ）。plan.originUids でどの起点か分かる */
  plans: ChainPlan[];
  reachable: Set<number>;
  unreachable: Set<number>;
}

export function simulateChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): ChainPreview {
  const origins = loadout.originOrder.filter((uid) => loadout.cells.includes(uid));
  const plans = linkedGroups(loadout, items, origins).map((g) => planUnit(loadout, items, g));
  const reachable = new Set<number>();
  for (const p of plans) for (const s of p.steps) reachable.add(s.cell);
  const unreachable = new Set<number>();
  loadout.cells.forEach((uid, i) => {
    if (uid && !reachable.has(i)) unreachable.add(i);
  });
  return { plans, reachable, unreachable };
}
