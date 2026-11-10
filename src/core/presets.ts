// 編成の切り替え。編成は並べ方の記録だけで、装備は倉庫に置いたまま（今の編成の分だけが「装備中」）
import { getItemDef } from '../data/items';
import { consumableSlots } from './economy';
export { otherPresetUse } from './economy';
import { resizeLoadout } from './loadout';
import { emptyLoadout, type SaveData } from './save';
import type { Loadout } from './types';

/** 今の並べ方を、今の編成として覚えておく */
export function storeActivePreset(save: SaveData): void {
  const p = save.presets[save.activePreset];
  if (p) p.loadout = structuredCloneLoadout(save.loadout);
}

function structuredCloneLoadout(l: Loadout): Loadout {
  return {
    width: l.width,
    height: l.height,
    cells: l.cells.slice(),
    originOrder: l.originOrder.slice(),
    consumables: l.consumables.slice(),
  };
}

/**
 * 記録した並べ方を、今の持ち物とバックパックの大きさに合わせて組み直す。
 * もう持っていない装備（売った・合成した・使い切った消耗品）は空きにする
 */
export function restoreLoadout(save: SaveData, rec: Loadout | null): Loadout {
  const { width, height } = save.loadout;
  if (!rec) return emptyLoadout(width, height);
  const l = resizeLoadout(rec, width, height);
  const owned = new Map(save.inventory.map((i) => [i.uid, i]));
  l.cells = l.cells.map((u) => {
    if (!u) return null;
    const it = owned.get(u);
    return it && getItemDef(it.defId).kind !== 'consumable' ? u : null;
  });
  l.originOrder = l.originOrder.filter(
    (u) => l.cells.includes(u) && getItemDef(owned.get(u)!.defId).kind === 'origin',
  );
  // 置いてあるのに発火順にない起点は後ろに足す
  for (const u of l.cells) {
    if (u && getItemDef(owned.get(u)!.defId).kind === 'origin' && !l.originOrder.includes(u))
      l.originOrder.push(u);
  }
  const seen = new Set<string>();
  l.consumables = l.consumables
    .filter((u) => {
      const it = owned.get(u);
      if (!it || getItemDef(it.defId).kind !== 'consumable' || seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, consumableSlots(save));
  return l;
}

/** 編成を切り替える（今の並べ方は今の編成に保存してから） */
export function switchPreset(save: SaveData, index: number): boolean {
  if (index < 0 || index >= save.presets.length || index === save.activePreset) return false;
  storeActivePreset(save);
  save.activePreset = index;
  save.loadout = restoreLoadout(save, save.presets[index]!.loadout);
  return true;
}

/** 編成の印（一覧用）: 「編成2」など。複数なら「編成2+」 */
export function presetMark(
  save: SaveData,
  uses: Map<string, number[]>,
  uid: string,
): string | null {
  const list = uses.get(uid);
  if (!list || list.length === 0) return null;
  const first = save.presets[list[0]!]!.name;
  return list.length > 1 ? `${first.slice(0, 4)}+` : first.slice(0, 5);
}
