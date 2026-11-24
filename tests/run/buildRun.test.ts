import { describe, expect, it } from 'vitest';
import { BUILD_RUN, NO_LUCK, RELIC, SIM } from '../../src/config/balance';
import {
  addToHand,
  buildRunConfig,
  canSetOut,
  startHand,
  togglePick,
} from '../../src/core/buildRun';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { stackPut } from '../../src/core/stack';
import type { ItemInstance } from '../../src/core/types';
import { getItemDef } from '../../src/data/items';
import { getRegion } from '../../src/data/regions';

const item = (uid: string, defId: string): ItemInstance => ({
  uid,
  defId,
  rarity: 'common',
  exits: ['right'],
  rerollCount: 0,
});

const origin = item('o', 'origin_stone');
const swords = [1, 2, 3, 4].map((n) => item(`s${n}`, 'sword'));

describe('拾って組む: 持ち込み', () => {
  it('起点石1つと装備を選べる', () => {
    const picked = [origin, swords[0]!].reduce<ItemInstance[]>(togglePick, []);
    expect(picked.map((p) => p.uid)).toEqual(['o', 's1']);
  });

  it('選んだ物をもう一度タップすると外れる', () => {
    expect(togglePick([origin, swords[0]!], origin).map((p) => p.uid)).toEqual(['s1']);
  });

  it('起点石は1つだけ: 別の起点石を選ぶと入れかわる', () => {
    const other = item('o2', 'origin_stone');
    expect(togglePick([origin], other).map((p) => p.uid)).toEqual(['o2']);
  });

  it(`装備は ${BUILD_RUN.bringGear} つまで`, () => {
    const full = swords.slice(0, BUILD_RUN.bringGear);
    expect(togglePick(full, swords[3]!)).toEqual(full);
  });

  it('消耗品は持ち込めない', () => {
    expect(togglePick([], item('p', 'potion'))).toEqual([]);
  });

  it('起点石がなければ出発できない', () => {
    expect(canSetOut(swords.slice(0, 2))).toBe(false);
    expect(canSetOut([origin])).toBe(true);
  });

  it('持ち込んだ物はセーブの物の写しで、セーブには触らない', () => {
    const save = createInitialSave();
    const o = save.inventory.find((i) => i.defId === 'origin_stone')!;
    const cfg = buildRunConfig(save, 1, [o]);
    (cfg.items.get(o.uid) as ItemInstance).exits = ['up'];
    expect(o.exits).toEqual(['right']);
    expect(cfg.loadout).not.toBe(save.loadout);
  });
});

describe('拾って組む: 手札', () => {
  it('持ち込んだ物は手札の最初の枠に入る', () => {
    expect(startHand([origin, swords[0]!], 3)).toEqual([origin, swords[0]!, null]);
  });

  it('拾った物は最初の空き枠に入る', () => {
    const r = addToHand([origin, null, swords[0]!], swords[1]!);
    expect([r.kept, r.hand]).toEqual([true, [origin, swords[1]!, swords[0]!]]);
  });

  it('空き枠がなければ拾えない（手札はそのまま）', () => {
    const full = [origin, swords[0]!];
    expect(addToHand(full, swords[1]!)).toEqual({ hand: full, kept: false });
  });
});

/** The build trial's run with origin → sword placed, and a hero that beats everything at once */
function setup(over: Partial<RunConfig> = {}) {
  const base = buildRunConfig(createInitialSave(), 7, [origin, swords[0]!]);
  let l = stackPut(base.loadout, base.items, 'o', 4).loadout;
  l = stackPut(l, base.items, 's1', 5).loadout;
  const cfg: RunConfig = {
    ...base,
    loadout: l,
    hero: { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 1e4 },
    luck: NO_LUCK,
    ...over,
  };
  return { c: new Combat(cfg), cfg };
}
const run = (over: Partial<RunConfig> = {}) => setup(over).c;

function until(c: Combat, type: CombatEvent['type'], limit = 60 * 300): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let i = 0; i < limit && !c.ended; i++) {
    c.step();
    const evs = c.drainEvents();
    out.push(...evs);
    if (evs.some((e) => e.type === type)) return out;
  }
  throw new Error(`no ${type}`);
}

describe('拾って組む: 戦闘', () => {
  it(`1周の群れは、地域の ${BUILD_RUN.groupMult} 倍`, () => {
    expect(run().layout!.groups).toHaveLength(
      getRegion(BUILD_RUN.regionId).groupCount * BUILD_RUN.groupMult,
    );
  });

  it('時間切れはない', () => {
    expect(run().maxTicks).toBe(Number.POSITIVE_INFINITY);
  });

  it('落ちるのは装備だけ（消耗品は出ない）', () => {
    const drops = until(run(), 'bossDefeated').filter(
      (e): e is Extract<CombatEvent, { type: 'drop' }> => e.type === 'drop',
    );
    expect(drops.length).toBeGreaterThan(0);
    expect(drops.every((d) => getItemDef(d.item.defId).kind !== 'consumable')).toBe(true);
  });

  describe('ボスのあと', () => {
    const beaten = () => {
      const c = run();
      until(c, 'relicOffer');
      return c;
    };

    it('レリックの選択に時間切れはない', () => {
      const c = beaten();
      for (let i = 0; i < RELIC.pickSeconds * SIM.ticksPerSecond * 2; i++) c.step();
      expect(c.relicOffer).not.toBeNull();
    });

    it('レリックを選んだあとも、再開するまで止まっている', () => {
      const c = beaten();
      c.skipRelic();
      const clock = c.clock;
      for (let i = 0; i < 120; i++) c.step();
      expect([c.arranging, c.clock]).toEqual([true, clock]);
    });

    it('レリックを選ぶ前は再開できない', () => {
      expect(beaten().resume()).toBe(false);
    });

    it('レリックを選んだら再開できる', () => {
      const c = beaten();
      c.skipRelic();
      expect([c.resume(), c.arranging]).toEqual([true, false]);
    });
  });

  describe('盤面の置きかえ', () => {
    it('連鎖の合間なら、次の発火から新しい盤面で撃つ', () => {
      const { c, cfg } = setup();
      c.adopt(swords[1]!);
      expect(c.applyLoadout(stackPut(cfg.loadout, cfg.items, 's2', 6).loadout)).toBe(true);
      const start = until(c, 'chainStart').find(
        (e): e is Extract<CombatEvent, { type: 'chainStart' }> => e.type === 'chainStart',
      )!;
      expect(start.plan.steps.map((s) => s.uid)).toEqual(['o', 's1', 's2']);
    });

    it('連鎖中は置きかえない', () => {
      const { c, cfg } = setup();
      until(c, 'chainStart');
      expect(c.applyLoadout(cfg.loadout)).toBe(false);
    });

    it('ふつうのランでは置きかえない', () => {
      const { c, cfg } = setup({ build: undefined });
      expect(c.applyLoadout(cfg.loadout)).toBe(false);
    });
  });
});
