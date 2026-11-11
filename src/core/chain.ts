// planChain / simulateChain: 配置から連鎖の順番・段数・倍率・時間・防御値を決める（仕様書 第5章）
import { ipow } from './rng';
import { affixValue } from './affixes';
import { TECHNIQUES } from '../data/techniques';
import { CHAIN, RARITY } from '../config/balance';
import { getItemDef } from '../data/items';
import type { ChainPlan, ChainStep, Dir, ItemInstance, Loadout } from './types';
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

export function neighborCell(loadout: Loadout, cell: number, dir: Dir): number | null {
  const x = cell % loadout.width;
  const y = Math.floor(cell / loadout.width);
  const [dx, dy] = DIR_DELTA[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= loadout.width || ny >= loadout.height) return null;
  return ny * loadout.width + nx;
}

interface Pending {
  tMs: number;
  seq: number;
  cell: number;
  parentIndex: number;
  branch: number;
}

/**
 * 起点から連鎖を展開する。
 * - 出口の先のマスへ relayDelay 後に伝わる（入り口の制約なし）
 * - 1回の連鎖で各アイテムは1回だけ発動。先に届いた枝が優先、同時なら上→右→下→左
 * - 攻撃装備で段数+1、防御装備は通すが数えない
 */
export function planChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  originUid: string,
): ChainPlan {
  const originCell = loadout.cells.indexOf(originUid);
  const steps: ChainStep[] = [];
  if (originCell < 0) {
    return { originUid, steps, duration: 0, defenseGain: 0, maxStep: 0, multCap: CHAIN.multCap };
  }

  const visited = new Set<number>([originCell]);
  steps.push({
    t: 0,
    uid: originUid,
    step: null,
    branch: 0,
    mult: 1,
    from: null,
    parentIndex: -1,
    cell: originCell,
  });
  const stepCounts: number[] = [0]; // 各ステップ時点の段数（防御は親の値を引き継ぐ）

  const queue: Pending[] = [];
  let seq = 0;
  let nextBranch = 1;
  let defenseGain = 0;
  let lastMs = 0;
  let maxStep = 0;

  const expand = (index: number, tMs: number): void => {
    const s = steps[index]!;
    const inst = items.get(s.uid);
    if (!inst) return;
    const def = getItemDef(inst.defId);
    const delayMs = Math.round((def.relayDelay ?? CHAIN.relayDelay) * MS);
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

  expand(0, 0);

  while (queue.length > 0) {
    // 時刻が早い順、同時なら発生順（親の発動順×上右下左）
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i]!;
      const b = queue[best]!;
      if (a.tMs < b.tMs || (a.tMs === b.tMs && a.seq < b.seq)) best = i;
    }
    const p = queue.splice(best, 1)[0]!;
    if (visited.has(p.cell)) continue;
    visited.add(p.cell);

    const uid = loadout.cells[p.cell]!;
    const inst = items.get(uid)!;
    const def = getItemDef(inst.defId);
    const parentCount = stepCounts[p.parentIndex]!;
    let step: number | null = null;
    let count = parentCount;
    if (def.kind === 'attack') {
      count = parentCount + 1;
      step = count;
      if (count > maxStep) maxStep = count;
    } else if (def.kind === 'defense') {
      defenseGain +=
        (def.defense ?? 0) * RARITY[inst.rarity].mult * (1 + affixValue(inst, 'sturdy') / 100);
    }
    // 起点同士がつながっている場合、後ろの起点は「通すだけ」のマスとして扱う
    steps.push({
      t: p.tMs / MS,
      uid,
      step,
      branch: p.branch,
      mult: step === null ? 1 : chainMultiplier(step),
      from: steps[p.parentIndex]!.uid,
      parentIndex: p.parentIndex,
      cell: p.cell,
    });
    // 必殺技: 親をたどった直前の2つと自分が、決まった並びになっていれば
    if (def.kind === 'attack') {
      const me = steps[steps.length - 1]!;
      const p1 = steps[me.parentIndex];
      const p2 = p1 ? steps[p1.parentIndex] : undefined;
      if (p1 && p2 && p1.parentIndex >= 0 && p2.parentIndex >= 0) {
        const ids = [p2, p1, me].map((x) => items.get(x.uid)!.defId);
        const t = TECHNIQUES.find((tq) => tq.seq.every((opts, k) => opts.includes(ids[k]!)));
        if (t) me.tech = t.id;
      }
    }
    // 疾風の羽: このあとに続く装備の段数を多く数える
    stepCounts.push(count + (def.kind === 'attack' ? (def.stepBoost ?? 0) : 0));
    if (p.tMs > lastMs) lastMs = p.tMs;
    expand(steps.length - 1, p.tMs);
  }

  // 循環の環を通る連鎖は、連鎖倍率の上限が上がる
  const multCap = Math.max(
    CHAIN.multCap,
    ...steps.map((s) => getItemDef(items.get(s.uid)!.defId).multCap ?? 0),
  );
  if (multCap !== CHAIN.multCap)
    for (const s of steps) if (s.step !== null) s.mult = chainMultiplier(s.step, multCap);
  return {
    originUid,
    steps,
    duration: (lastMs + Math.round(CHAIN.tailDelay * MS)) / MS,
    defenseGain,
    maxStep,
    multCap,
  };
}

/** 配置画面用: すべての起点の連鎖をまとめて計算し、どの起点からも届かないマスを返す */
export interface ChainPreview {
  plans: ChainPlan[];
  reachable: Set<number>;
  unreachable: Set<number>;
}

export function simulateChain(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): ChainPreview {
  const plans = loadout.originOrder
    .filter((uid) => loadout.cells.includes(uid))
    .map((uid) => planChain(loadout, items, uid));
  const reachable = new Set<number>();
  for (const p of plans) for (const s of p.steps) reachable.add(s.cell);
  const unreachable = new Set<number>();
  loadout.cells.forEach((uid, i) => {
    if (uid && !reachable.has(i)) unreachable.add(i);
  });
  return { plans, reachable, unreachable };
}
