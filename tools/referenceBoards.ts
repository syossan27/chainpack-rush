// Reference boards for the balance sim (npm run sim and the tests): six archetypes laid out on a
// stacked board along its longest path — the origin, an iron shield, then the archetype's gear
// repeated, every cell a full stack. Development only (never shown in the game, so not translated).
import { boardDepth, boardSize, isHole } from '../src/core/boards';
import {
  RARITIES,
  type Dir,
  type ItemInstance,
  type Loadout,
  type Rarity,
} from '../src/core/types';
import { getBoard, type BoardId } from '../src/data/boards';
import { getItemDef } from '../src/data/items';

export interface Archetype {
  id: string;
  name: string;
  pattern: readonly string[];
}

/** The six builds of the 2026-11-20 balance check (scratchpad balanceMatrix.ts) */
export const ARCHETYPES: readonly Archetype[] = [
  { id: 'monoPhys', name: '物理だけ', pattern: ['greatsword', 'war_axe', 'spear'] },
  { id: 'monoFire', name: '炎だけ', pattern: ['flame_staff', 'torch'] },
  { id: 'shock', name: '感電', pattern: ['canteen', 'thunder_staff', 'thunder_staff'] },
  { id: 'triple', name: 'トリプル', pattern: ['sword', 'sword', 'greatsword'] },
  { id: 'lightDark', name: '光と闇', pattern: ['light_sword', 'dark_sword'] },
  { id: 'venom', name: '毒', pattern: ['poison_dagger', 'wind_sword', 'wind_sword'] },
];

/** A mid-game hero's upgrades: HP, attack interval and attack at their caps */
export const REFERENCE_UPGRADES = {
  maxHp: 10,
  atb: 10,
  attack: 20,
  runTime: 0, // no longer runs: only bosses and sweeps add time
  consumableSlots: 0,
  storage: 0,
} as const;

/** The longest path of side-by-side cells over the board's shape */
function longestPath(id: BoardId): number[] {
  const b = getBoard(id);
  const { width, height } = boardSize(b);
  let best: number[] = [];
  const next = (c: number) => {
    const x = c % width;
    const y = Math.floor(c / width);
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]
      .filter(([a, d]) => a! >= 0 && a! < width && d! >= 0 && d! < height)
      .map(([a, d]) => d! * width + a!)
      .filter((k) => !isHole(b, k));
  };
  const walk = (path: number[], seen: Set<number>) => {
    if (path.length > best.length) best = [...path];
    for (const k of next(path[path.length - 1]!)) {
      if (seen.has(k)) continue;
      seen.add(k);
      path.push(k);
      walk(path, seen);
      path.pop();
      seen.delete(k);
    }
  };
  for (let c = 0; c < width * height; c++) if (!isHole(b, c)) walk([c], new Set([c]));
  return best;
}

const dirTo = (a: number, b: number): Dir =>
  b === a + 1 ? 'right' : b === a - 1 ? 'left' : b > a ? 'down' : 'up';

/** The wanted rarity, kept to what the item can be */
function rarityFor(defId: string, want: Rarity): Rarity {
  const r = getItemDef(defId).rarities;
  if (!r) return want;
  const lo = RARITIES.indexOf(r[0]);
  const hi = RARITIES.indexOf(r[1]);
  return RARITIES[Math.min(hi, Math.max(lo, RARITIES.indexOf(want)))]!;
}

/** An archetype on a board: origin, iron shield, then the pattern, every cell a full stack */
export function buildReference(
  arch: Archetype,
  board: BoardId = 'standard',
  rarity: Rarity = 'epic',
): { loadout: Loadout; items: Map<string, ItemInstance> } {
  const b = getBoard(board);
  const { width, height } = boardSize(b);
  const depth = boardDepth(b);
  const path = longestPath(board);
  const cells: (string | null)[] = new Array<string | null>(width * height).fill(null);
  const under: string[][] = Array.from({ length: width * height }, () => []);
  const items = new Map<string, ItemInstance>();
  const exit = (i: number): Dir[] => (i + 1 < path.length ? [dirTo(path[i]!, path[i + 1]!)] : []);
  items.set('o', {
    uid: 'o',
    defId: 'origin_stone',
    rarity: 'rare',
    exits: exit(0),
    rerollCount: 0,
  });
  cells[path[0]!] = 'o';
  for (let i = 1; i < path.length; i++) {
    const defId = i === 1 ? 'iron_shield' : arch.pattern[(i - 2) % arch.pattern.length]!;
    const uids: string[] = [];
    for (let k = 0; k < depth; k++) {
      const uid = `${defId}_${i}_${k}`;
      items.set(uid, {
        uid,
        defId,
        rarity: rarityFor(defId, rarity),
        exits: k === depth - 1 ? exit(i) : [],
        rerollCount: 0,
      });
      uids.push(uid);
    }
    cells[path[i]!] = uids[uids.length - 1]!;
    under[path[i]!] = uids.slice(0, -1);
  }
  return {
    loadout: { width, height, cells, under, originOrder: ['o'], consumables: [], board },
    items,
  };
}
