import type { Dir, ItemInstance, Loadout, Rarity } from '../src/core/types';

export interface Placed {
  uid: string;
  defId: string;
  x: number;
  y: number;
  exits: Dir[];
  rarity?: Rarity;
}

export function build(width: number, height: number, placed: Placed[], originOrder?: string[]) {
  const items = new Map<string, ItemInstance>();
  const cells = new Array<string | null>(width * height).fill(null);
  for (const p of placed) {
    items.set(p.uid, {
      uid: p.uid,
      defId: p.defId,
      rarity: p.rarity ?? 'common',
      exits: p.exits,
      rerollCount: 0,
    });
    cells[p.y * width + p.x] = p.uid;
  }
  const loadout: Loadout = {
    width,
    height,
    cells,
    originOrder: originOrder ?? placed.filter((p) => p.defId === 'origin_stone').map((p) => p.uid),
    consumables: [],
  };
  return { loadout, items };
}

/** 仕様書 第5章の例 */
export function specExample() {
  return build(5, 4, [
    { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'sword', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'canteen', defId: 'canteen', x: 2, y: 0, exits: ['down'] },
    { uid: 'thunder', defId: 'thunder_staff', x: 2, y: 1, exits: ['right'] },
    { uid: 'shield', defId: 'wood_shield', x: 3, y: 1, exits: ['right'] },
    { uid: 'axe', defId: 'axe', x: 4, y: 1, exits: [] },
  ]);
}
