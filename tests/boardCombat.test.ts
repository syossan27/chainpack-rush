import { describe, expect, it } from 'vitest';
import { NO_LUCK } from '../src/config/balance';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../src/core/combat';
import type { Loadout } from '../src/core/types';
import { getBoard, type BoardId } from '../src/data/boards';
import { build } from './helpers';

/** origin → sword → torch on a 3x2 board (fits every board's first row but the crystal's) */
function board(id: BoardId | undefined): RunConfig {
  const b = build(3, 2, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 's', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'f', defId: 'torch', x: 2, y: 0, exits: [] },
  ]);
  const loadout: Loadout = {
    ...b.loadout,
    under: b.loadout.cells.map(() => []),
    ...(id ? { board: id } : {}),
  };
  return {
    seed: 5,
    regionId: 'grassland',
    loadout,
    items: b.items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6 },
    luck: NO_LUCK,
  };
}

function firstHits(cfg: RunConfig): Map<string, number> {
  const c = new Combat({ ...cfg, mode: 'dummy' });
  c.fireNext();
  const out = new Map<string, number>();
  for (let i = 0; i < 60 * 5; i++) {
    c.step();
    for (const e of c.drainEvents())
      if (e.type === 'hit' && !out.has(e.itemUid)) out.set(e.itemUid, e.damage);
  }
  return out;
}

/** Ticks from the first chain's end to the next chain's start (the enemies stay alive) */
function wait(cfg: RunConfig): number {
  const c = new Combat(cfg);
  let end = -1;
  for (let i = 0; i < 60 * 60; i++) {
    c.step();
    const evs: CombatEvent[] = c.drainEvents();
    for (const e of evs) {
      if (e.type === 'chainEnd' && end < 0) end = e.tick;
      else if (e.type === 'chainStart' && end >= 0) return e.tick - end;
    }
  }
  throw new Error('no second chain');
}

describe('試作「盤面の種類」: 戦闘での特徴', () => {
  it('盤面の指定がない・標準の盤面は、今までどおり', () => {
    expect(firstHits(board('standard'))).toEqual(firstHits(board(undefined)));
  });

  it('小さな盤面: すべてのダメージに盤面の倍率がかかる', () => {
    const plain = firstHits(board(undefined));
    const small = firstHits(board('small'));
    expect(small.get('s')).toBeCloseTo(plain.get('s')! * getBoard('small').damage!, 1);
    expect(small.get('f')).toBeCloseTo(plain.get('f')! * getBoard('small').damage!, 1);
  });

  it('炎の盤面: 炎の攻撃だけ倍率がかかる', () => {
    const plain = firstHits(board(undefined));
    const flame = firstHits(board('flame'));
    expect(flame.get('f')).toBeCloseTo(plain.get('f')! * getBoard('flame').elements!.fire!, 1);
    expect(getBoard('flame').elements!.fire).toBeGreaterThan(1);
    expect(flame.get('s')).toBeCloseTo(plain.get('s')!, 1);
  });

  it('疾風の盤面: 次の連鎖までの待ち ×0.7', () => {
    const plain = wait(board(undefined));
    expect(wait(board('gale'))).toBeCloseTo(plain * getBoard('gale').wait!, -1);
    expect(wait(board('gale'))).toBeLessThan(plain);
  });
});
