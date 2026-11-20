// 挑戦用の配置（ふだんの盤面とは別に持つ、重ねる標準の盤面）。配置画面で編集するときは、一時的に
// loadout と入れ替える（ふだんの盤面は boards.layouts で待つ）
import { getItemDef } from '../data/items';
import type { ChallengeRules } from '../data/challenges';
import { itemViolation } from './challenge';
import { consumableSlots, itemMap } from './economy';
import { autoBoard } from './autoBoard';
import { activeBoardId } from './boardSave';
import { holeIn } from './boards';
import { boardUids, restoreStackBoard, stackAt, stackGroup } from './stack';
import type { SaveData } from './save';
import type { Dir, ItemInstance, Loadout } from './types';

function clone(l: Loadout): Loadout {
  return {
    width: l.width,
    height: l.height,
    cells: l.cells.slice(),
    originOrder: l.originOrder.slice(),
    consumables: l.consumables.slice(),
    ...(l.consumableAuto ? { consumableAuto: l.consumableAuto.slice() } : {}),
    // The stacked board: the items under the tops, and which board it is
    ...(l.under ? { under: l.under.map((u) => u.slice()) } : {}),
    ...(l.board ? { board: l.board } : {}),
  };
}

/**
 * 挑戦用の配置（今の持ち物に合わせたもの）。まだないときは、ふだんの標準の盤面を写して、制限に合わせて作る
 */
export function challengeLoadoutOf(save: SaveData, rules: ChallengeRules): Loadout {
  if (save.editingChallenge) return save.loadout;
  const owned = itemMap(save);
  const slots = consumableSlots(save);
  if (save.challengeLoadout)
    return restoreStackBoard(save.challengeLoadout, owned, slots, 'standard');
  const rec = save.boards.layouts.standard;
  const standard =
    save.loadout.board === 'standard'
      ? save.loadout
      : rec
        ? restoreStackBoard(rec, owned, slots, 'standard')
        : autoBoard(save.inventory, 'standard');
  return fitToRules(
    save,
    { ...clone(standard), consumables: save.loadout.consumables.slice() },
    rules,
  );
}

/** 配置画面で挑戦用の配置を編集し始める（ふだんの盤面は、その盤面の配置としてしまっておく） */
export function enterChallengeEdit(save: SaveData, rules: ChallengeRules): void {
  if (save.editingChallenge) return;
  const board = challengeLoadoutOf(save, rules);
  save.boards.layouts[save.loadout.board ?? 'standard'] = clone(save.loadout);
  save.loadout = board;
  save.editingChallenge = true;
}

/** 編集を終える（挑戦用を保存して、ふだんの盤面に戻す）。読み込み時の後始末にも使う */
export function leaveChallengeEdit(save: SaveData): void {
  if (!save.editingChallenge) return;
  save.challengeLoadout = clone(save.loadout);
  delete save.editingChallenge;
  const id = activeBoardId(save);
  const rec = save.boards.layouts[id];
  delete save.boards.layouts[id];
  save.loadout = rec
    ? restoreStackBoard(rec, itemMap(save), consumableSlots(save), id)
    : autoBoard(save.inventory, id);
}

const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

/**
 * 制限に合わせて、出撃できる形まで組む（最適にはしない。詰めるのはプレイヤー）。
 * もとの並べ方はそのままに、制限に合わない装備を入れ替える。重ねられるのは同じ装備だけなので、代わりは
 * 同じ装備で制限内のもの（一番上は出口の向きが近いもの）。重ねない装備（起点など）は同じ種類から選ぶ。
 * 代わりがなければ外し、下のものが繰り上がる。重ねない制限では各マスの一番上だけ残す。起点がなければ1つ置く
 */
export function fitToRules(save: SaveData, base: Loadout, r: ChallengeRules): Loadout {
  const items = itemMap(save);
  const l = clone(base);
  const used = new Set<string>(boardUids(l));
  for (const u of l.consumables) used.add(u);
  const ok = (it: ItemInstance) => !itemViolation(it, r);
  const kindOf = (it: ItemInstance) => getItemDef(it.defId).kind;
  const score = (a: Dir[], b: Dir[]) => {
    const same = a.filter((d) => b.includes(d)).length;
    return (same === a.length && a.length === b.length ? 100 : 0) + same * 10;
  };
  /** A stand-in for `it`: the same gear (or, for gear that never stacks, the same kind) */
  const standIn = (it: ItemInstance, top: boolean): ItemInstance | null => {
    const sameGear = stackGroup(it) !== null;
    let best: ItemInstance | null = null;
    let bestScore = -1;
    for (const c of save.inventory) {
      if (used.has(c.uid) || !ok(c)) continue;
      if (sameGear ? c.defId !== it.defId : kindOf(c) !== kindOf(it)) continue;
      const sc = (top ? score(it.exits, c.exits) : 0) + RANK[c.rarity];
      if (sc > bestScore) {
        best = c;
        bestScore = sc;
      }
    }
    return best;
  };
  for (let i = 0; i < l.cells.length; i++) {
    let stack = stackAt(l, i);
    if (stack.length === 0) continue;
    if (r.noStack && stack.length > 1) {
      for (const u of stack.slice(0, -1)) used.delete(u);
      stack = stack.slice(-1);
    }
    const kept: string[] = [];
    stack.forEach((uid, k) => {
      const it = items.get(uid);
      if (!it) return;
      if (ok(it)) {
        kept.push(uid);
        return;
      }
      used.delete(uid);
      const sub = standIn(it, k === stack.length - 1);
      if (!sub) return;
      used.add(sub.uid);
      kept.push(sub.uid);
    });
    l.cells[i] = kept[kept.length - 1] ?? null;
    if (l.under) l.under[i] = kept.slice(0, -1);
  }
  // 発火順: もとの順を保って、入れ替えた起点は同じ位置に
  const order: string[] = [];
  base.originOrder.forEach((u) => {
    const i = base.cells.indexOf(u);
    const now = i >= 0 ? l.cells[i] : null;
    if (now && kindOf(items.get(now)!) === 'origin' && !order.includes(now)) order.push(now);
  });
  for (const u of l.cells)
    if (u && kindOf(items.get(u)!) === 'origin' && !order.includes(u)) order.push(u);
  // 起点がなければ1つ置く（もとの起点の場所か、最初の空き）
  if (order.length === 0) {
    const origin = save.inventory.find((c) => !used.has(c.uid) && kindOf(c) === 'origin' && ok(c));
    if (origin) {
      const was = base.originOrder.map((u) => base.cells.indexOf(u)).find((i) => i >= 0);
      const open = (i: number) => !l.cells[i] && !holeIn(l, i);
      const at = was !== undefined && open(was) ? was : l.cells.findIndex((_, i) => open(i));
      if (at >= 0) {
        l.cells[at] = origin.uid;
        order.push(origin.uid);
      }
    }
  }
  l.originOrder = order;
  return l;
}
