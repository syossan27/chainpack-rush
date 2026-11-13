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
 * - Origins fire one at a time. At a sync point (where routes from other origins meet) the count
 *   goes on from the longer route, and the sync bonus applies from there on
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
  return spread(loadout, items, originUid, syncPoints(loadout, items)).plan;
}

/** その段がどの起点の線か（発火した起点） */
export function lineOrigin(plan: ChainPlan, index: number): string {
  let i = index;
  while (plan.steps[i]!.parentIndex >= 0) i = plan.steps[i]!.parentIndex;
  return plan.steps[i]!.uid;
}

/**
 * Which step a merge cell is on each route, as shown on the cell (e.g. 3+4; equal = exact sync).
 * `feeders` are the steps of the cells that lead into it. A cell without a step of its own
 * (a shield) keeps the routes' steps as they are. A route with nothing before the cell
 * (its origin stone right next to it) shows 0, so it gives no bonus.
 */
export function mergeArrivals(feeders: readonly number[], isStep: boolean): number[] {
  return feeders.map((n) => (isStep && n > 0 ? n + 1 : n));
}

/** 合流ボーナス（%）: 段数の合計 ×（短い線 ÷ 長い線）から MERGE.offset を引いた分。線の一本が段数0なら出ない */
export function mergeBonusOf(arrived: readonly number[]): number {
  if (arrived.length < 2) return 0;
  const longest = Math.max(...arrived);
  if (longest <= 0) return 0;
  const sum = arrived.reduce((a, b) => a + b, 0);
  const points = sum * (Math.min(...arrived) / longest);
  return Math.min(MERGE.cap, Math.max(0, points - MERGE.offset) * MERGE.perPoint);
}

/** The largest merge bonus (%) anywhere in this firing (0 when no lines merge) */
export function maxMergeBonus(plan: ChainPlan): number {
  return plan.steps.reduce((m, s) => Math.max(m, s.mergeBonus ?? 0), 0);
}

/** A sync point: a cell where routes from different origins meet (never an origin stone) */
export interface SyncPoint {
  /** Which step the cell is on each route, in firing order (e.g. [3, 4]; equal = exact sync) */
  arrived: number[];
  /** Every route goes on from the larger count here (the step, for an attack) */
  count: number;
  /** The cells the routes come in from */
  from: number[];
  /** Sync bonus (%) from here on */
  bonus: number;
}

/** How one route reaches a cell, before a sync point lifts its count */
interface Reach {
  own: number;
  feeder: number;
  parentCell: number;
  isStep: boolean;
}

interface Pending {
  tMs: number;
  seq: number;
  cell: number;
  parentIndex: number;
  branch: number;
}

/** One origin's chain, with the sync points of the whole layout */
function spread(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
  sync: ReadonlyMap<number, SyncPoint>,
): { plan: ChainPlan; reach: Map<number, Reach> } {
  const steps: ChainStep[] = [];
  const lines: string[][] = []; // origin stones on the line up to each step
  const counts: number[] = []; // 各ステップ時点の段数（子へ渡す数）
  const visited = new Set<number>();
  const reach = new Map<number, Reach>();
  const queue: Pending[] = [];
  let seq = 0;
  let nextBranch = 0;
  let defenseGain = 0;
  let lastMs = 0;
  let maxStep = 0;
  // Origin stone effects for each set of stones on the line (same set → same effects)
  const fxCache = new Map<string, LineEffect[]>();
  const effectsOf = (ls: readonly string[]): LineEffect[] => {
    const key = ls.join(',');
    let fx = fxCache.get(key);
    if (!fx) {
      fx = lineEffects(items, ls);
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

  const originCell = loadout.cells.indexOf(originUid);
  visited.add(originCell);
  steps.push({
    t: 0,
    uid: originUid,
    step: null,
    branch: nextBranch++,
    mult: 1,
    from: null,
    parentIndex: -1,
    cell: originCell,
    origins: [originUid],
  });
  lines.push([originUid]);
  counts.push(0);
  expand(0, 0);

  const fire = (cell: number, tMs: number, parent: number, branch: number): void => {
    visited.add(cell);
    const uid = loadout.cells[cell]!;
    const inst = items.get(uid)!;
    const def = getItemDef(inst.defId);
    const feeder = counts[parent]!;
    const isStep = def.kind === 'attack';
    const own = feeder + (isStep ? 1 : 0);
    reach.set(cell, { own, feeder, parentCell: steps[parent]!.cell, isStep });
    // Sync point: every route goes on from the longer one
    const sp = sync.get(cell);
    const count = sp ? Math.max(own, sp.count) : own;
    // A line that passes through another origin stone also takes that stone's effect
    const myLines =
      def.kind === 'origin' && !lines[parent]!.includes(uid)
        ? [...lines[parent]!, uid]
        : lines[parent]!;
    const boost = lineBoost(def, effectsOf(myLines));
    let step: number | null = null;
    if (isStep) {
      step = count;
      if (count > maxStep) maxStep = count;
    } else if (def.kind === 'defense') {
      defenseGain += defenseValue(inst, boost);
    }
    // 合流ボーナスはここで決まり、この先へ引き継ぐ（いちばん大きいもの）
    const mergeBonus = Math.max(steps[parent]!.mergeBonus ?? 0, sp?.bonus ?? 0);
    steps.push({
      t: tMs / MS,
      uid,
      step,
      branch,
      mult: step === null ? 1 : chainMultiplier(step),
      from: steps[parent]!.uid,
      parentIndex: parent,
      cell,
      ...(sp ? { mergeArrived: sp.arrived, mergeCount: sp.count, mergeFrom: sp.from } : {}),
      ...(mergeBonus > 0 ? { mergeBonus } : {}),
      origins: myLines.slice(),
      ...(boost ? { line: boost } : {}),
    });
    lines.push(myLines);
    counts.push(count + (isStep ? (def.stepBoost ?? 0) : 0));
    // 必殺技: 3つの並びで判定する
    if (isStep) {
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

  while (queue.length > 0) {
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i]!;
      const b = queue[best]!;
      if (a.tMs < b.tMs || (a.tMs === b.tMs && a.seq < b.seq)) best = i;
    }
    const p = queue.splice(best, 1)[0]!;
    if (visited.has(p.cell)) continue;
    fire(p.cell, p.tMs, p.parentIndex, p.branch);
  }

  const multCap = Math.max(
    CHAIN.multCap,
    ...steps.map((s) => getItemDef(items.get(s.uid)!.defId).multCap ?? 0),
  );
  if (multCap !== CHAIN.multCap)
    for (const s of steps) if (s.step !== null) s.mult = chainMultiplier(s.step, multCap);
  return {
    plan: {
      originUid,
      originUids: [originUid],
      steps,
      duration: (lastMs + Math.round(CHAIN.tailDelay * MS)) / MS,
      defenseGain,
      maxStep,
      multCap,
    },
    reach,
  };
}

/**
 * Sync points of a layout: cells (not origin stones) that routes from 2+ origins reach from
 * different cells. A route's count can depend on a sync point upstream, so repeat until stable
 * (counts only grow and are bounded, so this settles within a pass per sync point)
 */
export function syncPoints(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): Map<number, SyncPoint> {
  const origins = loadout.originOrder.filter((u) => loadout.cells.includes(u));
  let sync = new Map<number, SyncPoint>();
  if (origins.length < 2) return sync;
  const originCells = new Set(origins.map((o) => loadout.cells.indexOf(o)));
  const key = (m: ReadonlyMap<number, SyncPoint>) =>
    JSON.stringify([...m.entries()].sort((a, b) => a[0] - b[0]));
  for (let round = 0; round <= loadout.cells.length; round++) {
    const reaches = origins.map((o) => spread(loadout, items, o, sync).reach);
    const cells = new Set(reaches.flatMap((r) => [...r.keys()]));
    const next = new Map<number, SyncPoint>();
    for (const cell of cells) {
      if (originCells.has(cell)) continue;
      const here = reaches.map((r) => r.get(cell)).filter((x): x is Reach => x !== undefined);
      // One way in per cell it comes from: routes that already share it (the trunk after a
      // sync point) count once, with the longest of them, in firing order
      const ways = new Map<number, Reach>();
      for (const x of here) {
        const w = ways.get(x.parentCell);
        if (!w || x.feeder > w.feeder) ways.set(x.parentCell, x);
      }
      if (ways.size < 2) continue;
      const from = [...ways.keys()];
      const arrived = mergeArrivals(
        [...ways.values()].map((x) => x.feeder),
        here[0]!.isStep,
      );
      next.set(cell, {
        arrived,
        count: Math.max(...here.map((x) => x.own)),
        from,
        bonus: mergeBonusOf(arrived),
      });
    }
    if (key(next) === key(sync)) return next;
    sync = next;
  }
  return sync;
}

/** 配置画面用: 起点ごとに連鎖を計算し、どの起点からも届かないマスを返す */
export interface ChainPreview {
  /** 起点ごと（発火順）。plan.originUids でどの起点か分かる */
  plans: ChainPlan[];
  reachable: Set<number>;
  unreachable: Set<number>;
}

export function simulateChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): ChainPreview {
  const origins = loadout.originOrder.filter((uid) => loadout.cells.includes(uid));
  const sync = syncPoints(loadout, items);
  const plans = origins.map((o) => spread(loadout, items, o, sync).plan);
  const reachable = new Set<number>();
  for (const p of plans) for (const s of p.steps) reachable.add(s.cell);
  const unreachable = new Set<number>();
  loadout.cells.forEach((uid, i) => {
    if (uid && !reachable.has(i)) unreachable.add(i);
  });
  return { plans, reachable, unreachable };
}
