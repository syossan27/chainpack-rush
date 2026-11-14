import { describe, expect, it } from 'vitest';
import { autoLayout } from '../src/core/autoLayout';
import { simulateChain } from '../src/core/chain';
import type { Dir, ItemInstance, Loadout, Rarity } from '../src/core/types';

type Spec = [uid: string, defId: string, exits: Dir[], rarity?: Rarity];

function owned(specs: Spec[]): Map<string, ItemInstance> {
  return new Map(
    specs.map(([uid, defId, exits, rarity]) => [
      uid,
      { uid, defId, rarity: rarity ?? 'common', exits, rerollCount: 0 },
    ]),
  );
}

function empty(width: number, height: number, consumables: string[] = []): Loadout {
  return {
    width,
    height,
    cells: new Array<string | null>(width * height).fill(null),
    originOrder: [],
    consumables,
  };
}

const rows = (l: Loadout) =>
  Array.from({ length: l.height }, (_, y) => l.cells.slice(y * l.width, (y + 1) * l.width));

describe('おまかせ配置', () => {
  it('起点から出口の先へ、弱い装備から順につなぎ、いちばん強い装備を最後に置く', () => {
    const items = owned([
      ['p', 'spear', ['right']],
      ['e', 'sword', ['right'], 'epic'],
      ['s', 'sword', ['right']],
      ['o', 'origin_stone', ['right']],
      ['d', 'dagger', ['right']],
    ]);
    const l = autoLayout(empty(5, 1), items);
    expect(l.cells).toEqual(['o', 'd', 's', 'p', 'e']);
    expect(l.originOrder).toEqual(['o']);
  });

  it('1本目の線が行き止まりになって装備と空きマスが残れば、次の起点石から並べる', () => {
    // Every exit points right, so a row holds one line of 2 items
    const items = owned([
      ['o1', 'origin_stone', ['right']],
      ['o2', 'origin_stone', ['right']],
      ['a', 'dagger', ['right']],
      ['b', 'axe', ['right']],
      ['c', 'sword', ['right']],
      ['d', 'spear', ['right']],
    ]);
    const l = autoLayout(empty(3, 2), items);
    // Line 1: the weakest that goes on (dagger), then the strongest to end it (spear)
    expect(rows(l)).toEqual([
      ['o1', 'a', 'd'],
      ['o2', 'b', 'c'],
    ]);
    expect(l.originOrder).toEqual(['o1', 'o2']);
  });

  it('防具は連鎖数に数えないので、弱い装備として線の前のほうに置く', () => {
    const items = owned([
      ['o', 'origin_stone', ['right']],
      ['s', 'sword', ['right']],
      ['w', 'wood_shield', ['right']],
      ['p', 'spear', ['right']],
    ]);
    expect(autoLayout(empty(4, 1), items).cells).toEqual(['o', 'w', 's', 'p']);
  });

  it('持ち物がマスより多いときは、強い装備から使う（防具はいいものを2つまで）', () => {
    const items = owned([
      ['o', 'origin_stone', ['right']],
      ['d1', 'dagger', ['right']],
      ['d2', 'dagger', ['right']],
      ['s', 'sword', ['right']],
      ['p', 'spear', ['right']],
      ['w1', 'wood_shield', ['right']],
      ['w2', 'wood_shield', ['right'], 'rare'],
      ['w3', 'wood_shield', ['right'], 'epic'],
    ]);
    // 6 cells: the origin, the 2 best shields, then the 3 strongest attacks (one dagger stays out)
    const l = autoLayout(empty(6, 1), items);
    expect(l.cells).toEqual(['o', 'w2', 'w3', 'd1', 's', 'p']);
  });

  it('消耗品は置かず、消耗品枠はそのまま。使わない起点石は倉庫に残す', () => {
    const items = owned([
      ['o1', 'origin_stone', ['right']],
      ['o2', 'origin_stone', ['right']],
      ['s', 'sword', ['right']],
      ['k', 'potion', []],
    ]);
    const l = autoLayout(empty(3, 1, ['k']), items);
    expect(l.cells).toEqual(['o1', 's', null]);
    expect(l.consumables).toEqual(['k']);
    expect(l.originOrder).toEqual(['o1']);
  });

  it('起点石がなければ何もしない', () => {
    const base = empty(3, 1);
    base.cells[0] = 's';
    const items = owned([['s', 'sword', ['right']]]);
    expect(autoLayout(base, items)).toEqual(base);
  });

  it('起点石しか持っていなければ、今の並べ方のまま', () => {
    const base = empty(3, 1);
    base.cells[1] = 'o';
    base.originOrder = ['o'];
    const items = owned([['o', 'origin_stone', ['right']]]);
    expect(autoLayout(base, items)).toEqual(base);
  });

  it('マスの外に置かず、置いた装備はどれも起点から届く。同じ持ち物ならいつも同じ並べ方', () => {
    const dirs: Dir[][] = [['right'], ['down'], ['left'], ['up'], ['right', 'down'], []];
    const kinds = ['sword', 'dagger', 'spear', 'axe', 'wood_shield'];
    const specs: Spec[] = [
      ['o1', 'origin_stone', ['right', 'down'], 'rare'],
      ['o2', 'origin_stone', ['up']],
    ];
    for (let i = 0; i < 30; i++)
      specs.push([`i${i}`, kinds[i % kinds.length]!, dirs[(i * 7) % dirs.length]!]);
    const items = owned(specs);
    const l = autoLayout(empty(5, 4), items);
    const placed = l.cells.filter((c): c is string => c !== null);
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.every((u) => items.has(u))).toBe(true);
    expect(placed.length).toBeGreaterThan(4);
    expect(simulateChain(l, items).unreachable.size).toBe(0);
    // Same items in another order give the same layout
    const shuffled = new Map([...items.entries()].reverse());
    expect(autoLayout(empty(5, 4), shuffled)).toEqual(l);
  });
});
