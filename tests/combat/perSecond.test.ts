import { describe, expect, it } from 'vitest';
import { CHAIN_RULES, HERO, NO_LUCK } from '../../src/config/balance';
import { boardScore } from '../../src/core/autoBoard';
import { firedPieces, originQuick, simulateChain, waitFactor } from '../../src/core/chain';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../../src/core/combat';
import { chainCycle, estimateRoute, routeRate } from '../../src/core/estimate';
import { getBoard, type BoardId } from '../../src/data/boards';
import { getItemDef } from '../../src/data/items';
import { build, type Placed } from '../helpers';

/** The wait multiplier of the gale board (疾風の盤面) */
const GALE_WAIT = getBoard('gale').wait!;

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
  it('waitFactor: 参照の数（CHAIN_RULES.atbRefSteps）だけ鳴ったら、ちょうど ×1', () => {
    expect(waitFactor(CHAIN_RULES.atbRefSteps, 0)).toBeCloseTo(1);
  });

  it('waitFactor: 鳴った数に比例する', () => {
    expect(waitFactor(4, 0) / waitFactor(2, 0)).toBeCloseTo(2);
  });

  it('waitFactor: 少なくても CHAIN_RULES.atbMinFactor より短くならない', () => {
    expect(waitFactor(1, 0)).toBeCloseTo(CHAIN_RULES.atbMinFactor);
  });

  it('waitFactor: 多くても CHAIN_RULES.atbMaxFactor より長くならない', () => {
    expect(waitFactor(30, 0)).toBeCloseTo(CHAIN_RULES.atbMaxFactor);
  });

  it('waitFactor: 速攻の割合だけ縮む', () => {
    expect(waitFactor(3, 20) / waitFactor(3, 0)).toBeCloseTo(0.8);
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
    const full = atbTime * GALE_WAIT;
    const want = full * (1 - waitFactor(firedPieces(plan.steps, isOrigin), 10));
    // The tick that ends the chain may already refill one tick of the gauge
    expect(Math.abs(c.atb - want)).toBeLessThan(0.02);
  });
});

describe('1秒あたりの見積もり', () => {
  const plan0 = (b: ReturnType<typeof row>) => simulateChain(b.loadout, b.items).plans[0]!;
  const isOrigin = (b: ReturnType<typeof row>) => (u: string) =>
    getItemDef(b.items.get(u)!.defId).kind === 'origin';

  it('chainCycle は連鎖の長さ＋待ち（盤面の待ちを掛ける）', () => {
    const b = row(4, 'gale');
    const p = plan0(b);
    const full = HERO.atbTime * GALE_WAIT;
    expect(chainCycle(p, b.items, full)).toBeCloseTo(
      p.duration + full * waitFactor(firedPieces(p.steps, isOrigin(b)), 0),
    );
  });

  describe('boardScore は1秒あたり', () => {
    const std = () => row(4, 'standard', 4, 3);
    const total = (b: ReturnType<typeof row>) =>
      estimateRoute(plan0(b), b.items, 1, b.loadout.board).total;
    const score = (b: ReturnType<typeof row>) => boardScore(b.loadout, b.items);

    it('疾風の盤面でも同じ連鎖なら1回のダメージは変わらない', () => {
      expect(total(row(4, 'gale'))).toBeCloseTo(total(std()));
    });

    it('同じ連鎖なら、待ちの短い盤面のほうが高い', () => {
      expect(score(row(4, 'gale'))).toBeGreaterThan(score(std()));
    });

    it('同じ連鎖なら、速攻の起点のほうが高い', () => {
      const quick = std();
      quick.items.get('o')!.affixes = [{ id: 'quick', value: 30 }];
      expect(score(quick)).toBeGreaterThan(score(std()));
    });

    it('待ち時間（強化なし）が長いほど低い', () => {
      const b = std();
      expect(boardScore(b.loadout, b.items, 1, 1.0)).toBeGreaterThan(
        boardScore(b.loadout, b.items, 1, 1.5),
      );
    });
  });

  it('起点だけの盤面でも有限で 0 以上', () => {
    const b = row(0, 'standard', 4, 3);
    const sc = boardScore(b.loadout, b.items);
    expect(Number.isFinite(sc)).toBe(true);
    expect(sc).toBeGreaterThanOrEqual(0);
  });
});

describe('合計の毎秒', () => {
  it('起点を順に撃つとき: ダメージの合計 ÷ 時間の合計', () => {
    expect(
      routeRate([
        { total: 300, cycle: 2 },
        { total: 100, cycle: 3 },
      ]),
    ).toBeCloseTo(80);
  });

  it('ルートがなければ 0', () => {
    expect(routeRate([])).toBe(0);
  });
});
