import { describe, expect, it } from 'vitest';
import { NO_LUCK, RELIC, SIM } from '../src/config/balance';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../src/core/combat';
import { replayRun, sameResult } from '../src/core/replay';
import type { RelicId } from '../src/data/relics';
import { build } from './helpers';

/** origin → sword → sword → axe on a line (cells 0..3) */
function line() {
  return build(4, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
    { uid: 'c', defId: 'axe', x: 3, y: 0, exits: [] },
  ]);
}

function cfg(over: Partial<RunConfig> = {}): RunConfig {
  const { loadout, items } = line();
  return {
    seed: 11,
    regionId: 'grassland',
    loadout,
    items,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6 },
    luck: NO_LUCK,
    ...over,
  };
}

/** A hero that beats everything in grassland at once */
const strong = { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 1e4 };

/** Steps until an event of this type comes (every event of that step included) */
function until(c: Combat, type: CombatEvent['type'], limit = 60 * 120): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let i = 0; i < limit && !c.ended; i++) {
    c.step();
    const evs = c.drainEvents();
    out.push(...evs);
    if (evs.some((e) => e.type === type)) return out;
  }
  throw new Error(`no ${type}`);
}

/** The scarecrow's first chain (fired by hand) */
function dummyChain(stuck: [number, RelicId][], over: Partial<RunConfig> = {}): CombatEvent[] {
  const c = new Combat(cfg({ mode: 'dummy', relics: { stuck }, ...over }));
  c.drainEvents();
  c.fireNext();
  const out = c.drainEvents();
  for (let i = 0; i < 60 * 30; i++) {
    c.step();
    for (const e of c.drainEvents()) {
      out.push(e);
      if (e.type === 'chainEnd') return out;
    }
  }
  throw new Error('no chainEnd');
}

const hits = (evs: CombatEvent[], uid: string) =>
  evs.filter(
    (e): e is Extract<CombatEvent, { type: 'hit' }> => e.type === 'hit' && e.itemUid === uid,
  );

describe('試作「レリック」: ボスを倒すと3つから選ぶ', () => {
  it('切り替えがなければ出ない。ボスのあともそのまま進む', () => {
    const c = new Combat(cfg({ hero: strong }));
    until(c, 'bossDefeated');
    expect(c.relicOffer).toBeNull();
    const x = c.heroX;
    for (let i = 0; i < 30; i++) c.step();
    expect(c.heroX).toBeGreaterThan(x);
    expect(c.drainEvents().some((e) => e.type === 'relicOffer')).toBe(false);
  });

  it('ボスを倒すと必ず3つ出る。選ぶあいだは勇者も時計も止まり、8秒で取らずに進む', () => {
    const c = new Combat(cfg({ hero: strong, relics: {} }));
    const evs = until(c, 'relicOffer');
    const offer = evs.find((e) => e.type === 'relicOffer') as { ids: RelicId[] };
    expect(offer.ids).toHaveLength(RELIC.offer);
    expect(c.relicOffer?.ids).toEqual(offer.ids);
    const x = c.heroX;
    const clock = c.clock;
    for (let i = 0; i < RELIC.pickSeconds * SIM.ticksPerSecond - 1; i++) c.step();
    expect(c.heroX).toBe(x);
    expect(c.clock).toBe(clock);
    expect(c.relicOffer).not.toBeNull();
    c.step();
    expect(c.relicOffer).toBeNull();
    expect(c.drainEvents().some((e) => e.type === 'relicSkipped')).toBe(true);
    for (let i = 0; i < 30; i++) c.step();
    expect(c.heroX).toBeGreaterThan(x);
  });

  it('「いらない」ですぐ進む。貼れないマスや出ていないレリックは貼れない', () => {
    const skip = new Combat(cfg({ hero: strong, relics: {} }));
    until(skip, 'relicOffer');
    expect(skip.skipRelic()).toBe(true);
    expect(skip.relicOffer).toBeNull();
    expect(skip.skipRelic()).toBe(false);

    const c = new Combat(cfg({ hero: strong, relics: {} }));
    until(c, 'relicOffer');
    const ids = c.relicOffer!.ids;
    const missing = (['bell', 'fist', 'whistle', 'ward'] as RelicId[]).find(
      (id) => !ids.includes(id),
    )!;
    expect(c.placeRelic(missing, 1)).toBe(false);
    expect(c.placeRelic(ids[0]!, 9)).toBe(false);
    expect(c.placeRelic(ids[0]!, 1)).toBe(true);
    expect(c.relics.get(1)).toBe(ids[0]);
    expect(c.relicOffer).toBeNull();
    expect(c.placeRelic(ids[1]!, 2)).toBe(false);
  });

  it('選んでいるあいだは消耗品を使えない（選び終わったら使える）', () => {
    const base = cfg({ hero: strong, relics: {} });
    const items = new Map(base.items);
    items.set('ts', { uid: 'ts', defId: 'time_stop', rarity: 'common', exits: [], rerollCount: 0 });
    const c = new Combat({ ...base, items, loadout: { ...base.loadout, consumables: ['ts'] } });
    until(c, 'relicOffer');
    expect(c.useConsumable(0)).toBe(false);
    c.skipRelic();
    expect(c.useConsumable(0)).toBe(true);
  });

  it('貼った操作は記録に残り、再生しても同じ結果になる', () => {
    const run = cfg({ hero: { ...strong, attackMult: 30 }, relics: {} });
    const c = new Combat(run);
    until(c, 'relicOffer');
    expect(c.placeRelic(c.relicOffer!.ids[0]!, 3)).toBe(true);
    const r = c.runToEnd();
    expect(r.inputs?.some((i) => i.k === 'relic')).toBe(true);
    const again = replayRun(run, r.inputs ?? []);
    expect(again && sameResult(again, r)).toBe(true);
  });
});

describe('試作「レリック」: 貼ったマスの装備に効く', () => {
  it('二度鳴りの鈴: 2回攻撃する', () => {
    const plain = dummyChain([]);
    const evs = dummyChain([[2, 'bell']]);
    expect(hits(evs, 'b')).toHaveLength(hits(plain, 'b').length * 2);
    expect(hits(evs, 'a')).toHaveLength(hits(plain, 'a').length);
  });

  it('巨人の拳: ダメージが ×2.5', () => {
    const plain = hits(dummyChain([]), 'b')[0]!.damage;
    expect(hits(dummyChain([[2, 'fist']]), 'b')[0]!.damage).toBeCloseTo(plain * RELIC.fistMult, 1);
  });

  it('会心の眼: その装備だけ会心が出る', () => {
    let crits = 0;
    let others = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = dummyChain([[2, 'eye']], { seed });
      crits += hits(evs, 'b').filter((h) => h.crit).length;
      others += hits(evs, 'a').filter((h) => h.crit).length;
    }
    expect(crits).toBeGreaterThan(0);
    expect(others).toBe(0);
  });

  it('加速の羽: このあとに続く装備の段数が +2', () => {
    const plain = hits(dummyChain([]), 'c')[0]!.step;
    expect(hits(dummyChain([[1, 'feather']]), 'c')[0]!.step).toBe(plain + RELIC.featherSteps);
  });

  it('吸血の牙: 与えたダメージの10%を回復', () => {
    const c = new Combat(cfg({ mode: 'dummy', relics: { stuck: [[2, 'fang']] } }));
    c.hp = 10;
    c.fireNext();
    const evs = c.drainEvents();
    for (let i = 0; i < 60 * 10; i++) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const dealt = hits(evs, 'b').reduce((s, h) => s + h.damage, 0);
    expect(dealt).toBeGreaterThan(0);
    expect(c.hp).toBeCloseTo(10 + dealt * RELIC.fangHeal, 1);
  });

  it('守りの札: そのマスが鳴るたびに防御がつく', () => {
    const evs = dummyChain([[2, 'ward']]);
    const rings = evs.filter((e) => e.type === 'step' && e.cell === 2).length;
    expect(rings).toBeGreaterThan(0);
    const c = new Combat(cfg({ mode: 'dummy', relics: { stuck: [[2, 'ward']] } }));
    c.fireNext();
    for (let i = 0; i < 60 * 10; i++) c.step();
    expect(c.defense).toBe(rings * RELIC.wardDefense);
    expect(new Combat(cfg({ mode: 'dummy' })).defense).toBe(0);
  });

  it('呼び戻しの笛: ここまで届いた連鎖のあとは、次までの待ちが半分', () => {
    // Ticks from the first chain's end to the next chain's start (the enemies stay alive)
    const gap = (stuck: [number, RelicId][]) => {
      const weak = { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 0.01 };
      const c = new Combat(cfg({ hero: weak, relics: { stuck } }));
      const first = until(c, 'chainEnd');
      const end = first.findIndex((e) => e.type === 'chainEnd');
      const next =
        first.slice(end).find((e) => e.type === 'chainStart') ??
        until(c, 'chainStart').find((e) => e.type === 'chainStart')!;
      return next.tick - first[end]!.tick;
    };
    const plain = gap([]);
    expect(plain).toBeGreaterThan(0);
    expect(gap([[3, 'whistle']])).toBeCloseTo(plain * RELIC.whistleWait, -1);
  });

  it('薙ぎ払いの紋・貫きの矢じり: 1回の攻撃が群れの何体にも当たる', () => {
    const targets = (stuck: [number, RelicId][]) => {
      const c = new Combat(
        cfg({ hero: { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 0.01 }, relics: { stuck } }),
      );
      const evs = until(c, 'chainEnd');
      return new Set(hits(evs, 'a').map((h) => h.enemyId)).size;
    };
    expect(targets([])).toBe(1);
    expect(targets([[1, 'sweep']])).toBeGreaterThan(1);
    expect(targets([[1, 'pierce']])).toBeGreaterThan(1);
  });

  it('金の爪: その装備で倒した敵は必ず装備を落とす', () => {
    const c = new Combat(cfg({ relics: { stuck: [[3, 'claw']] } }));
    const last = new Map<number, string>();
    let kills = 0;
    for (let i = 0; i < 60 * 25 && !c.ended; i++) {
      c.step();
      const evs = c.drainEvents();
      for (const e of evs) {
        if (e.type === 'hit') last.set(e.enemyId, e.itemUid);
        if (e.type === 'enemyDeath' && !e.fled && !e.boss && last.get(e.enemyId) === 'c') {
          kills++;
          expect(evs.some((d) => d.type === 'drop' && d.enemyId === e.enemyId)).toBe(true);
        }
      }
    }
    expect(kills).toBeGreaterThan(0);
  });
});

describe('試作「レリック」: 重ねる盤面', () => {
  it('加速の羽は、アーティファクト（ひとりで3回鳴る）のマスでも1回だけ、最後に効く', () => {
    const b = build(3, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'art', defId: 'dragon_fang', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
      { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
    ]);
    const loadout = { ...b.loadout, under: b.loadout.cells.map(() => []) };
    const step = (stuck: [number, RelicId][]) => {
      const c = new Combat(cfg({ loadout, items: b.items, mode: 'dummy', relics: { stuck } }));
      c.fireNext();
      const evs = c.drainEvents();
      for (let i = 0; i < 60 * 5; i++) {
        c.step();
        evs.push(...c.drainEvents());
      }
      return {
        art: hits(evs, 'art').map((h) => h.step),
        next: hits(evs, 'next')[0]!.step,
      };
    };
    const plain = step([]);
    expect(plain.art).toEqual([1, 2, 3]);
    const fed = step([[1, 'feather']]);
    expect(fed.art).toEqual([1, 2, 3]);
    expect(fed.next).toBe(plain.next + RELIC.featherSteps);
  });
});
