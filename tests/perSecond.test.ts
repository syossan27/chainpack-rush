import { describe, expect, it } from 'vitest';
import { CHAIN_RULES, NO_LUCK } from '../src/config/balance';
import { firedPieces, originQuick, waitFactor } from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../src/core/combat';
import type { BoardId } from '../src/data/boards';
import { getItemDef } from '../src/data/items';
import { build, type Placed } from './helpers';

/** origin → n swords in one row, on a stacked board of the given kind */
function row(n: number, board: BoardId, width = 5, height = 2) {
  const placed: Placed[] = [{ uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] }];
  for (let k = 1; k <= n; k++) {
    const x = k % width;
    const y = Math.floor(k / width);
    const exits: Placed['exits'] =
      k === n ? [] : x === width - 1 ? ['down'] : y === 0 ? ['right'] : ['left'];
    placed.push({ uid: `s${k}`, defId: 'sword', x: y === 0 ? x : width - 1 - x, y, exits });
  }
  const b = build(width, height, placed);
  b.loadout = { ...b.loadout, board, under: b.loadout.cells.map(() => []) };
  return b;
}

describe('次の連鎖までの待ち', () => {
  it('waitFactor: 鳴った数 ÷ 6 を 0.25〜2 倍に収め、速攻の分だけ縮む', () => {
    expect(waitFactor(6, 0)).toBeCloseTo(1);
    expect(waitFactor(1, 0)).toBeCloseTo(CHAIN_RULES.atbMinFactor);
    expect(waitFactor(30, 0)).toBeCloseTo(CHAIN_RULES.atbMaxFactor);
    expect(waitFactor(3, 20)).toBeCloseTo(0.5 * 0.8);
  });

  it('戦闘の待ちは waitFactor と同じ（疾風の盤面・速攻の起点・待ちの強化）', () => {
    const b = row(4, 'gale');
    b.items.get('o')!.affixes = [{ id: 'quick', value: 10 }];
    const atbTime = 1.2;
    const cfg: RunConfig = {
      seed: 1,
      regionId: 'grassland',
      loadout: b.loadout,
      items: b.items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e6, atbTime },
      luck: NO_LUCK,
    };
    const c = new Combat({ ...cfg, mode: 'dummy' });
    c.fireNext();
    const plan = c.chain!.plan;
    while (c.chain) c.step();
    const isOrigin = (u: string) => getItemDef(b.items.get(u)!.defId).kind === 'origin';
    expect(originQuick(plan.originUids, b.items)).toBe(10);
    const full = atbTime * 0.7;
    const want = full * (1 - waitFactor(firedPieces(plan.steps, isOrigin), 10));
    // The tick that ends the chain may already refill one tick of the gauge
    expect(Math.abs(c.atb - want)).toBeLessThan(0.02);
  });
});
