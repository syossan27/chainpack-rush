// planChain / simulateChain: 配置から連鎖の順番・段数・倍率・時間・防御値を決める（仕様書 第5章）
import { ipow } from './rng';
import { affixValue } from './affixes';
import { TECHNIQUES } from '../data/techniques';
import { CHAIN, CHAIN_RULES, GIMMICK, RARITY, STACK, type ChainRules } from '../config/balance';
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
import { cellRings } from './stack';
import { boardPosMult } from './boards';
import { getBoard } from '../data/boards';

const DIR_DELTA: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

/** 時間は整数ミリ秒で扱い、浮動小数の誤差で同時判定がぶれないようにする */
const MS = 1000;

/**
 * The chain multiplier at a step. ×1.2 per step up to step 6, then no cap: it keeps growing as
 * (step / 6)^0.5. `riseTo` (循環の環): ×1.2 per step until that value, then the same kind of
 * growth from the step that reached it
 */
export function chainMultiplier(step: number, riseTo?: number): number {
  const n = Math.max(1, step);
  const base = CHAIN.multBase;
  let knee: number = CHAIN.riseSteps;
  let top = ipow(base, knee - 1);
  if (riseTo !== undefined) {
    knee = 1;
    while (ipow(base, knee - 1) < riseTo) knee++;
    top = riseTo;
  }
  if (n < knee) return ipow(base, n - 1);
  // sqrt, not Math.pow: pow's last digit can differ between engines, and records are replayed
  return top * Math.sqrt(n / knee);
}

/**
 * Pieces that count toward the wait after a chain (and the guard): every item except origin
 * stones. On a stacked board a cell counts once, however many items it holds
 */
export function firedPieces(
  steps: readonly ChainStep[],
  isOrigin: (uid: string) => boolean,
): number {
  let pieces = 0;
  // Stacked board: the cells where something other than an origin stone rang, each once
  const cells = new Set<number>();
  for (const s of steps) {
    // A ring repeated by 残響の起点石 is its cell again, not a new piece
    if (isOrigin(s.uid) || s.echo) continue;
    if (s.ring === undefined) pieces++;
    else cells.add(s.cell);
  }
  return pieces + cells.size;
}

/**
 * The wait before the next chain as a share of a full gauge: the pieces that rang ÷ atbRefSteps,
 * kept within the rules' bounds, shortened by the origin's 速攻 (%). Battle and estimates share it
 */
export function waitFactor(
  pieces: number,
  quickPct: number,
  rules: ChainRules = CHAIN_RULES,
): number {
  const f = Math.min(rules.atbMaxFactor, Math.max(rules.atbMinFactor, pieces / rules.atbRefSteps));
  return f * (1 - quickPct / 100);
}

/** 速攻 of a firing: the largest value among its origins (%) */
export function originQuick(
  originUids: readonly string[],
  items: ReadonlyMap<string, ItemInstance>,
): number {
  return Math.max(
    0,
    ...originUids.map((u) => {
      const o = items.get(u);
      return o ? affixValue(o, 'quick') : 0;
    }),
  );
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

/** A chain's guard under its origin stones (盾の起点石): the guard lasts `guardCells` cells longer */
export function flowRules(fx: readonly LineEffect[], rules: ChainRules): { guardSteps: number } {
  return { guardSteps: fx.reduce((n, e) => n + (e.guardCells ?? 0), rules.guardSteps) };
}

/** 次の装備へ伝わるまでの時間（ミリ秒）。速の起点石・重い起点石で変わる */
function relayMs(def: ItemDef, fx: readonly LineEffect[]): number {
  const sec = fx.reduce((t, e) => t + (e.relay ?? 0), def.relayDelay ?? CHAIN.relayDelay);
  return Math.round(Math.max(CHAIN.minRelay, sec) * MS);
}

/** Where a ring sits in the chain, for the origin stones that depend on it */
export interface FlowPos {
  /** The cell's place among the cells that started ringing (1 = first; origin cells not counted) */
  cellOrder: number;
  /** Cells from the origin to this cell along the chain (the origin's neighbour is 1) */
  dist: number;
}

/** 線の効果を、この装備についての掛け算にまとめる。効果がなければ undefined */
export function lineBoost(
  def: ItemDef,
  fx: readonly LineEffect[],
  pos: FlowPos,
): LineBoost | undefined {
  if (def.kind !== 'attack') return undefined;
  let damage = 1;
  for (const e of fx) {
    damage *= 1 + (e.damage ?? 0) / 100;
    if (e.lead && pos.cellOrder <= e.lead.cells) damage *= 1 + e.lead.damage / 100;
    if (e.far) damage *= 1 + (e.far / 100) * pos.dist;
  }
  return damage === 1 ? undefined : { damage };
}

/** 防御装備が連鎖で通ったときの防御値 */
export function defenseValue(inst: ItemInstance): number {
  return (
    (getItemDef(inst.defId).defense ?? 0) *
    RARITY[inst.rarity].mult *
    (1 + affixValue(inst, 'sturdy') / 100)
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
 *   (gimmick cells: a loop whose arrows a gimmick changed rings its cells again; see mayReturn)
 * - 攻撃装備で段数+1、防御装備は通すが数えない
 * - 起点同士がつながっている場合、後ろの起点は「通すだけ」のマスとして扱う
 * - Origins fire one at a time; each route counts its own steps
 */
export function planChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
  gimmickState?: readonly number[],
): ChainPlan {
  if (loadout.cells.indexOf(originUid) < 0)
    return {
      originUid,
      originUids: [originUid],
      steps: [],
      duration: 0,
      defenseGain: 0,
      maxStep: 0,
    };
  return spread(loadout, items, originUid, gimmickState);
}

/** Arrows turned `k` quarter turns clockwise, in DIRS order */
function rotateDirs(dirs: readonly Dir[], k: number): Dir[] {
  const out = new Set(dirs.map((d) => DIRS[(DIRS.indexOf(d) + k) % 4]!));
  return DIRS.filter((d) => out.has(d));
}

function sameDirs(a: readonly Dir[], b: readonly Dir[]): boolean {
  return a.length === b.length && a.every((d) => b.includes(d));
}

/** その段がどの起点の線か（発火した起点） */
export function lineOrigin(plan: ChainPlan, index: number): string {
  let i = index;
  while (plan.steps[i]!.parentIndex >= 0) i = plan.steps[i]!.parentIndex;
  return plan.steps[i]!.uid;
}

interface Pending {
  tMs: number;
  seq: number;
  cell: number;
  parentIndex: number;
  branch: number;
}

/** One origin's chain */
function spread(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
  gimmickState?: readonly number[],
): ChainPlan {
  const steps: ChainStep[] = [];
  const lines: string[][] = []; // origin stones on the line up to each step
  const counts: number[] = []; // 各ステップ時点の段数（子へ渡す数）
  const dists: number[] = []; // cells from the origin to each step's cell
  let cellOrder = 0; // cells that started ringing so far (origin cells not counted)
  const visited = new Set<number>();
  // Gimmick cells: turn counts (kept across firings), passes per cell, and for each step whether
  // its cell's arrows changed on that pass (only a cell's last ring of a pass can be true)
  const gim = loadout.gimmicks;
  const turns = loadout.cells.map((_, i) => gimmickState?.[i] ?? 0);
  const visits = new Map<number, number>();
  const turned: boolean[] = [];
  const visitOf: number[] = []; // which pass of a cell each step belongs to
  let visitSeq = 0;
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

  /** The arrows the chain leaves a cell by on this pass; a gimmick turns them afterwards */
  const passExits = (cell: number, inst: ItemInstance): Dir[] => {
    const base = DIRS.filter((d) => inst.exits.includes(d));
    const kind = gim?.[cell] ?? null;
    if (kind === 'rotate') {
      const now = rotateDirs(base, turns[cell]!);
      turns[cell] = (turns[cell]! + 1) % 4;
      passTurned = !sameDirs(now, rotateDirs(base, turns[cell]!));
      return now;
    }
    if (kind === 'switch' && base.length > 1) {
      const now = [base[turns[cell]! % base.length]!];
      // 12: a multiple of every arrow count, so the count never needs resetting
      turns[cell] = (turns[cell]! + 1) % 12;
      passTurned = true;
      return now;
    }
    passTurned = false;
    return base;
  };
  let passTurned = false;
  /** Relays from a cell come faster on each pass back round a loop (the cell's current pass) */
  const passPace = (cell: number): number =>
    GIMMICK.passPace[Math.min((visits.get(cell) ?? 1) - 1, GIMMICK.passPace.length - 1)]!;

  const expand = (index: number, tMs: number): void => {
    const s = steps[index]!;
    const inst = items.get(s.uid);
    if (!inst) return;
    const def = getItemDef(inst.defId);
    const delayMs = Math.round(relayMs(def, effectsOf(lines[index]!)) * passPace(s.cell));
    const targets: number[] = [];
    for (const dir of passExits(s.cell, inst)) {
      const n = neighborCell(loadout, s.cell, dir);
      if (n !== null) targets.push(n);
    }
    turned[index] = passTurned;
    // ワープ: the chain also goes on to the other warp cell
    if (gim?.[s.cell] === 'warp') {
      const other = gim.findIndex((g, i) => g === 'warp' && i !== s.cell);
      if (other >= 0) targets.push(other);
    }
    let first = true;
    for (const n of targets) {
      const uid = loadout.cells[n];
      if (!uid || !items.has(uid)) continue;
      const branch = first ? s.branch : nextBranch++;
      first = false;
      queue.push({ tMs: tMs + delayMs, seq: seq++, cell: n, parentIndex: index, branch });
    }
  };

  /**
   * A cell that already rang rings again only when the chain comes back round a loop (the cell is
   * on this branch's way back to the origin) and a gimmick on that loop changed its arrows since:
   * a plain loop stops after one lap, as does a branch meeting another. At most maxVisits a firing
   */
  const mayReturn = (cell: number, parent: number): boolean => {
    if ((visits.get(cell) ?? 0) >= GIMMICK.maxVisits) return false;
    let changed = false;
    for (let j = parent; j >= 0; j = steps[j]!.parentIndex) {
      changed ||= turned[j] === true;
      if (steps[j]!.cell === cell) return changed;
    }
    return false;
  };

  const originCell = loadout.cells.indexOf(originUid);
  visited.add(originCell);
  visits.set(originCell, 1);
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
  dists.push(0);
  turned.push(false);
  visitOf.push(visitSeq++);
  expand(0, 0);

  // Stacked board (trial): a cell rings its stack bottom → top, then the top item leads on
  const stackedBoard = loadout.under !== undefined;
  const posMult = boardPosMult(getBoard(loadout.board));
  const fire = (cell: number, tMs: number, parent: number, branch: number): void => {
    visited.add(cell);
    visits.set(cell, (visits.get(cell) ?? 0) + 1);
    visitSeq++;
    const stack = stackedBoard ? cellRings(loadout, items, cell) : [loadout.cells[cell]!];
    // Counted like the guard: a cell once, origin stones not at all
    if (getItemDef(items.get(loadout.cells[cell]!)!.defId).kind !== 'origin') cellOrder++;
    const flow: FlowPos = { cellOrder, dist: dists[parent]! + 1 };
    let p = parent;
    let t = tMs;
    stack.forEach((uid, k) => {
      if (k > 0) t += Math.round(STACK.ringRelay * MS * passPace(cell));
      p = ring(cell, uid, t, p, branch, stackedBoard ? k : undefined, k === stack.length - 1, flow);
    });
    if (t > lastMs) lastMs = t;
    expand(p, t);
  };

  /** The step before this cell's first ring: the top ring of the cell before (-1 at the origin) */
  const prevTopIndex = (i: number): number => {
    let j = i;
    while (steps[j]!.parentIndex >= 0 && steps[steps[j]!.parentIndex]!.cell === steps[i]!.cell)
      j = steps[j]!.parentIndex;
    return steps[j]!.parentIndex;
  };

  /** One item fires. Returns its step index */
  const ring = (
    cell: number,
    uid: string,
    tMs: number,
    parent: number,
    branch: number,
    pos: number | undefined,
    isTop: boolean,
    flow: FlowPos,
  ): number => {
    const inst = items.get(uid)!;
    const def = getItemDef(inst.defId);
    const feeder = counts[parent]!;
    const isStep = def.kind === 'attack';
    const own = feeder + (isStep ? 1 : 0);
    const count = own;
    const stackMult = pos === undefined ? undefined : posMult[pos]!;
    // A line that passes through another origin stone also takes that stone's effect
    const myLines =
      def.kind === 'origin' && !lines[parent]!.includes(uid)
        ? [...lines[parent]!, uid]
        : lines[parent]!;
    const boost = lineBoost(def, effectsOf(myLines), flow);
    let step: number | null = null;
    if (isStep) {
      step = count;
      if (count > maxStep) maxStep = count;
    } else if (def.kind === 'defense') {
      defenseGain += defenseValue(inst) * (stackMult ?? 1);
    }
    steps.push({
      t: tMs / MS,
      uid,
      step,
      branch,
      mult: step === null ? 1 : chainMultiplier(step),
      from: steps[parent]!.uid,
      parentIndex: parent,
      cell,
      origins: myLines.slice(),
      ...(boost ? { line: boost } : {}),
      ...(pos !== undefined ? { ring: pos, stackMult } : {}),
    });
    lines.push(myLines);
    counts.push(count + (isStep ? (def.stepBoost ?? 0) : 0));
    dists.push(flow.dist);
    turned.push(false);
    visitOf.push(visitSeq);
    const meIndex = steps.length - 1;
    // 必殺技: 3つの並びで判定する（重ねる盤面では、道で続く3マスの一番上どうし）
    if (isStep && isTop) {
      const me = steps[meIndex]!;
      const i1 = stackedBoard ? prevTopIndex(meIndex) : me.parentIndex;
      const i2 = i1 < 0 ? -1 : stackedBoard ? prevTopIndex(i1) : steps[i1]!.parentIndex;
      const p1 = steps[i1];
      const p2 = steps[i2];
      if (p1 && p2 && p1.parentIndex >= 0 && p2.parentIndex >= 0) {
        const ids = [p2, p1, me].map((x) => items.get(x.uid)!.defId);
        const tq = TECHNIQUES.find((q) => q.seq.every((opts, k) => opts.includes(ids[k]!)));
        if (tq) me.tech = tq.id;
      }
    }
    if (tMs > lastMs) lastMs = tMs;
    return meIndex;
  };

  while (queue.length > 0) {
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i]!;
      const b = queue[best]!;
      if (a.tMs < b.tMs || (a.tMs === b.tMs && a.seq < b.seq)) best = i;
    }
    const p = queue.splice(best, 1)[0]!;
    if (visited.has(p.cell) && !mayReturn(p.cell, p.parentIndex)) continue;
    fire(p.cell, p.tMs, p.parentIndex, p.branch);
  }

  // 残響の起点石: the attack cell whose top rang last rings its stack once more, at the same counts
  if (effectsOf([originUid]).some((e) => e.echo)) {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.step !== null && (last < 0 || s.t >= steps[last]!.t)) last = i;
    });
    if (last >= 0) {
      // The rings of that cell's last pass (a gimmick can bring the chain back to a cell)
      const rings = steps.flatMap((_, i) => (visitOf[i] === visitOf[last] ? [i] : []));
      const top = rings[rings.length - 1]!;
      const start =
        lastMs + relayMs(getItemDef(items.get(steps[top]!.uid)!.defId), effectsOf(lines[top]!));
      rings.forEach((i, k) => {
        const tMs = start + k * Math.round(STACK.ringRelay * MS);
        const again: ChainStep = { ...steps[i]!, t: tMs / MS, parentIndex: i, echo: true };
        delete again.tech;
        steps.push(again);
        lines.push(lines[i]!);
        counts.push(counts[i]!);
        dists.push(dists[i]!);
        turned.push(false);
        visitOf.push(visitOf[i]!);
        if (tMs > lastMs) lastMs = tMs;
      });
    }
  }

  // 循環の環: a ring anywhere in the firing changes the whole plan's growth
  const rises = steps.flatMap((s) => getItemDef(items.get(s.uid)!.defId).riseTo ?? []);
  const riseTo = rises.length > 0 ? Math.max(...rises) : undefined;
  if (riseTo !== undefined)
    for (const s of steps) if (s.step !== null) s.mult = chainMultiplier(s.step, riseTo);
  return {
    originUid,
    originUids: [originUid],
    steps,
    duration: (lastMs + Math.round(CHAIN.tailDelay * MS)) / MS,
    defenseGain,
    maxStep,
    ...(riseTo !== undefined ? { riseTo } : {}),
    ...(gim ? { gimmickEnd: turns } : {}),
  };
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
  gimmickState?: readonly number[],
): ChainPreview {
  const origins = loadout.originOrder.filter((uid) => loadout.cells.includes(uid));
  const plans = origins.map((o) => spread(loadout, items, o, gimmickState));
  const reachable = new Set<number>();
  for (const p of plans) for (const s of p.steps) reachable.add(s.cell);
  const unreachable = new Set<number>();
  loadout.cells.forEach((uid, i) => {
    if (uid && !reachable.has(i)) unreachable.add(i);
  });
  return { plans, reachable, unreachable };
}

/**
 * Gimmick cells: the firings in order from the battle's start until the gimmicks' turns repeat
 * (at most `limit`). Without gimmicks, the one plan
 */
export function gimmickCycle(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
  limit = 16,
): ChainPlan[] {
  const out: ChainPlan[] = [];
  const seen = new Set<string>();
  let state: number[] | undefined = loadout.gimmicks ? loadout.cells.map(() => 0) : undefined;
  // The same arrows on every gimmick cell: the same firing (a switch counts past its arrows)
  const keyOf = (st: readonly number[] | undefined): string =>
    (st ?? [])
      .map((n, i) => {
        const g = loadout.gimmicks?.[i];
        const top = loadout.cells[i] ? items.get(loadout.cells[i]!) : undefined;
        if (!g || !top) return '';
        if (g === 'switch') return n % Math.max(1, top.exits.length);
        // A rotator whose arrows look the same after the turn is the same firing
        return g === 'rotate'
          ? rotateDirs(
              DIRS.filter((d) => top.exits.includes(d)),
              n,
            ).join('')
          : '';
      })
      .join(',');
  while (out.length < limit) {
    const key = keyOf(state);
    if (seen.has(key)) break;
    seen.add(key);
    const p = planChain(loadout, items, originUid, state);
    out.push(p);
    if (!p.gimmickEnd) break;
    state = p.gimmickEnd;
  }
  return out;
}

/** Whether a layout has any gimmick cell in use */
export function hasGimmicks(loadout: Loadout): boolean {
  return loadout.gimmicks?.some((g) => g !== null) ?? false;
}

/**
 * The board screen on a gimmick board: the routes of one firing (`firing` counts from the battle's
 * start, wrapping round the cycle) and every firing's plans. A cell any firing reaches is reachable
 */
export function simulateFiring(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  firing: number,
): { preview: ChainPreview; cycle: ChainPlan[] } {
  const origin = loadout.originOrder.find((uid) => loadout.cells.includes(uid));
  if (!origin || !hasGimmicks(loadout)) {
    const preview = simulateChain(loadout, items);
    return { preview, cycle: preview.plans };
  }
  const cycle = gimmickCycle(loadout, items, origin);
  const plan = cycle[((firing % cycle.length) + cycle.length) % cycle.length]!;
  const reachable = new Set<number>();
  for (const p of cycle) for (const s of p.steps) reachable.add(s.cell);
  const unreachable = new Set<number>();
  loadout.cells.forEach((uid, i) => {
    if (uid && !reachable.has(i)) unreachable.add(i);
  });
  return { preview: { plans: [plan], reachable, unreachable }, cycle };
}
