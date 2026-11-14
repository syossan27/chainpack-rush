// 挑戦用の編成（ふだんの編成とは別に持つ）。配置画面で編集するときは、一時的に loadout と入れ替える
import { getItemDef } from '../data/items';
import type { ChallengeRules } from '../data/challenges';
import { itemViolation } from './challenge';
import { itemMap } from './economy';
import { restoreLoadout, storeActivePreset } from './presets';
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
  };
}

/** 挑戦用の編成（今の持ち物とバックパックの大きさに合わせたもの） */
export function challengeLoadoutOf(save: SaveData): Loadout {
  if (save.editingChallenge) return save.loadout;
  return restoreLoadout(save, save.challengeLoadout);
}

/** 配置画面で挑戦用の編成を編集し始める（ふだんの並べ方は今の編成に保存しておく） */
export function enterChallengeEdit(save: SaveData): void {
  if (save.editingChallenge) return;
  storeActivePreset(save);
  save.loadout = restoreLoadout(save, save.challengeLoadout);
  save.editingChallenge = true;
}

/** 編集を終える（挑戦用を保存して、ふだんの編成に戻す）。読み込み時の後始末にも使う */
export function leaveChallengeEdit(save: SaveData): void {
  if (!save.editingChallenge) return;
  save.challengeLoadout = clone(save.loadout);
  delete save.editingChallenge;
  save.loadout = restoreLoadout(save, save.presets[save.activePreset]?.loadout ?? null);
}

const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

/**
 * 制限に合わせて、出撃できる形まで組む（最適にはしない。詰めるのはプレイヤー）。
 * もとの並べ方はそのままに、制限に合わない装備を、同じ種類で出口の向きが近いものに入れ替える。
 * 代わりがなければ空ける。起点が多すぎれば発火順の後ろから外し、なければ1つ置く
 */
export function fitToRules(save: SaveData, base: Loadout, r: ChallengeRules): Loadout {
  const items = itemMap(save);
  const l = clone(base);
  const used = new Set<string>(l.cells.filter((u): u is string => !!u));
  for (const u of l.consumables) used.add(u);
  const ok = (it: ItemInstance) => !itemViolation(it, r);
  const kindOf = (it: ItemInstance) => getItemDef(it.defId).kind;
  const score = (a: Dir[], b: Dir[]) => {
    const same = a.filter((d) => b.includes(d)).length;
    return (same === a.length && a.length === b.length ? 100 : 0) + same * 10;
  };
  l.cells = l.cells.map((uid) => {
    if (!uid) return null;
    const it = items.get(uid);
    if (!it) return null;
    if (ok(it)) return uid;
    used.delete(uid);
    let best: ItemInstance | null = null;
    let bestScore = -1;
    for (const c of save.inventory) {
      if (used.has(c.uid) || kindOf(c) !== kindOf(it) || !ok(c)) continue;
      const sc = score(it.exits, c.exits) + RANK[c.rarity];
      if (sc > bestScore) {
        best = c;
        bestScore = sc;
      }
    }
    if (!best) return null;
    used.add(best.uid);
    return best.uid;
  });
  // 発火順: もとの順を保って、入れ替えた起点は同じ位置に
  const order: string[] = [];
  base.originOrder.forEach((u) => {
    const i = base.cells.indexOf(u);
    const now = i >= 0 ? l.cells[i] : null;
    if (now && kindOf(items.get(now)!) === 'origin' && !order.includes(now)) order.push(now);
  });
  for (const u of l.cells)
    if (u && kindOf(items.get(u)!) === 'origin' && !order.includes(u)) order.push(u);
  // 起点が多すぎれば、発火順の後ろから外す
  while (r.maxOrigins && order.length > r.maxOrigins) {
    const u = order.pop()!;
    l.cells[l.cells.indexOf(u)] = null;
  }
  // 起点がなければ1つ置く（もとの起点の場所か、最初の空き）
  if (order.length === 0) {
    const origin = save.inventory.find((c) => !used.has(c.uid) && kindOf(c) === 'origin' && ok(c));
    if (origin) {
      const was = base.originOrder.map((u) => base.cells.indexOf(u)).find((i) => i >= 0);
      const at = was !== undefined && !l.cells[was] ? was : l.cells.indexOf(null);
      if (at >= 0) {
        l.cells[at] = origin.uid;
        order.push(origin.uid);
      }
    }
  }
  l.originOrder = order;
  return l;
}
