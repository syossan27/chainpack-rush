import { describe, expect, it } from 'vitest';
import { CHAIN_RULES, NO_LUCK } from '../../src/config/balance';
import { firedPieces, planChain } from '../../src/core/chain';
import { charmContext, type CharmSlots } from '../../src/core/charms';
import { BASE_HERO_STATS, Combat, type CombatEvent, type RunConfig } from '../../src/core/combat';
import { estimateRoute } from '../../src/core/estimate';
import { replayRun, sameResult } from '../../src/core/replay';
import type { ChainPlan, Loadout } from '../../src/core/types';
import { getItemDef, itemDescVars } from '../../src/data/items';
import { DICT_PARTS, type TargetLang } from '../../src/i18n/dicts';
import { build, type Placed } from '../helpers';

/** A stacked board: `extra` puts more of the same gear under a placed item (bottom first) */
function stacked(
  width: number,
  height: number,
  placed: Placed[],
  extra: Record<string, number> = {},
) {
  const b = build(width, height, placed);
  const under: string[][] = b.loadout.cells.map(() => []);
  for (const p of placed) {
    const cell = p.y * width + p.x;
    for (let k = 0; k < (extra[p.uid] ?? 0); k++) {
      const uid = `${p.uid}${k}`;
      b.items.set(uid, { uid, defId: p.defId, rarity: 'common', exits: [], rerollCount: 0 });
      under[cell]!.push(uid);
    }
  }
  const loadout: Loadout = { ...b.loadout, under };
  return { loadout, items: b.items };
}

const stepOf = (plan: ChainPlan, uid: string) => plan.steps.find((s) => s.uid === uid)!;

describe('一番槍の起点石', () => {
  const LEAD = getItemDef('origin_lead').line!.lead!;
  const up = 1 + LEAD.damage / 100;

  /** o → a (sword, a stack of 3) → d (wood shield) → b (sword) → c (sword); cells ring a, d, b, c */
  const line = (origin: string) =>
    stacked(
      5,
      1,
      [
        { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right'] },
        { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'd', defId: 'wood_shield', x: 2, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 3, y: 0, exits: ['right'] },
        { uid: 'c', defId: 'sword', x: 4, y: 0, exits: [] },
      ],
      { a: 2 },
    );

  it('最初に鳴る3マス（防具のマスも数え、起点は数えない）の攻撃だけ強い。重ねの全段に効く', () => {
    const { loadout, items } = line('origin_lead');
    const plan = planChain(loadout, items, 'o');
    const aRings = plan.steps.filter((s) => s.cell === 1);
    expect(aRings).toHaveLength(3);
    for (const s of aRings) expect(s.line?.damage).toBeCloseTo(up);
    expect(stepOf(plan, 'b').line?.damage).toBeCloseTo(up);
    // The fourth cell is past the first three
    expect(stepOf(plan, 'c').line).toBeUndefined();
  });
});

describe('彼方の起点石', () => {
  const X = getItemDef('origin_far').line!.far! / 100;

  /**
   * o (exits right, down) → right: a (wood shield, d=1) → b (sword, d=2)
   *                       → down:  c (sword ×2, d=1) → e (sword, d=2)
   */
  const fork = (origin: string) =>
    stacked(
      3,
      2,
      [
        { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right', 'down'] },
        { uid: 'a', defId: 'wood_shield', x: 1, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 2, y: 0, exits: [] },
        { uid: 'c', defId: 'sword', x: 0, y: 1, exits: ['right'] },
        { uid: 'e', defId: 'sword', x: 1, y: 1, exits: [] },
      ],
      { c: 1 },
    );

  it('攻撃は起点からのマス数 d で ×(1+X·d)。防具のマスも数え、枝の先はその枝の道のりで数える', () => {
    const { loadout, items } = fork('origin_far');
    const plan = planChain(loadout, items, 'o');
    expect(stepOf(plan, 'b').line?.damage).toBeCloseTo(1 + X * 2);
    for (const s of plan.steps.filter((x) => x.cell === 3))
      expect(s.line?.damage).toBeCloseTo(1 + X * 1);
    expect(stepOf(plan, 'e').line?.damage).toBeCloseTo(1 + X * 2);
    // The estimate (and so the bot's layout score) reads it
    const plain = fork('origin_stone');
    expect(estimateRoute(plan, items, 1).total).toBeGreaterThan(
      estimateRoute(planChain(plain.loadout, plain.items, 'o'), plain.items, 1).total,
    );
  });
});

describe('起点石の説明文', () => {
  it('数値はデータから差し込む', () => {
    const lead = getItemDef('origin_lead').line!.lead!;
    expect(itemDescVars(getItemDef('origin_lead'))).toEqual({ cells: lead.cells, v: lead.damage });
    expect(itemDescVars(getItemDef('origin_far'))).toEqual({
      v: getItemDef('origin_far').line!.far,
    });
    for (const id of ['origin_swift', 'origin_heavy']) {
      const line = getItemDef(id).line!;
      expect(itemDescVars(getItemDef(id)), id).toEqual({
        relay: Math.abs(line.relay!),
        v: line.damage ?? 0,
      });
    }
    expect(itemDescVars(getItemDef('sword'))).toEqual({});
  });
});

/** Every event of the scarecrow's first chain */
function dummyChain(cfg: RunConfig): { c: Combat; evs: CombatEvent[] } {
  const c = new Combat({ ...cfg, mode: 'dummy' });
  c.drainEvents();
  c.fireNext();
  const evs: CombatEvent[] = [...c.drainEvents()];
  for (let i = 0; i < 60 * 10 && c.chain; i++) {
    c.step();
    evs.push(...c.drainEvents());
  }
  return { c, evs };
}

describe('残響の起点石', () => {
  /** o → a (sword) → b (sword ×2: b0 under b), on a stacked 3×1 row */
  const row = (origin: string) =>
    stacked(
      3,
      1,
      [
        { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right'] },
        { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 2, y: 0, exits: [] },
      ],
      { b: 1 },
    );

  it('最後に鳴った攻撃のマスが、重ね全体で同じ段・同じ倍率でもう一度鳴る。最大連鎖は増えない', () => {
    const e = row('origin_echo');
    const p = row('origin_stone');
    const plan = planChain(e.loadout, e.items, 'o');
    const plain = planChain(p.loadout, p.items, 'o');
    const echo = plan.steps.filter((s) => s.echo);
    expect(echo.map((s) => s.uid)).toEqual(['b0', 'b']);
    for (const s of echo) {
      const orig = plan.steps[s.parentIndex]!;
      expect(orig.uid).toBe(s.uid);
      expect([s.step, s.mult, s.ring, s.stackMult, s.cell]).toEqual([
        orig.step,
        orig.mult,
        orig.ring,
        orig.stackMult,
        orig.cell,
      ]);
      expect(s.tech).toBeUndefined();
    }
    expect(plan.maxStep).toBe(plain.maxStep);
    expect(plan.steps.filter((s) => !s.echo)).toHaveLength(plain.steps.length);
    // One relay (0.2 s) after the last ring, then 0.1 s apart inside the stack
    const lastT = Math.max(...plain.steps.map((s) => s.t));
    expect(echo[0]!.t).toBeCloseTo(lastT + 0.2);
    expect(echo[1]!.t).toBeCloseTo(lastT + 0.3);
    expect(plan.duration).toBeGreaterThan(plain.duration);
  });

  it('最後に鳴るのが防具のマスなら、その前の攻撃のマスが鳴る。攻撃のマスがなければ何もしない', () => {
    const shieldLast = stacked(3, 1, [
      { uid: 'o', defId: 'origin_echo', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'd', defId: 'wood_shield', x: 2, y: 0, exits: [] },
    ]);
    const echoOf = (b: ReturnType<typeof stacked>) =>
      planChain(b.loadout, b.items, 'o')
        .steps.filter((s) => s.echo)
        .map((s) => s.uid);
    expect(echoOf(shieldLast)).toEqual(['a']);
    const shields = stacked(3, 1, [
      { uid: 'o', defId: 'origin_echo', x: 0, y: 0, exits: ['right'] },
      { uid: 'd1', defId: 'wood_shield', x: 1, y: 0, exits: ['right'] },
      { uid: 'd2', defId: 'wood_shield', x: 2, y: 0, exits: [] },
    ]);
    expect(echoOf(shields)).toEqual([]);
  });

  /** o → s1 (sword) → s2 (dagger) → s3 (greatsword: トリプル・スラッシュ) on a stacked 4×1 row */
  const techRow = (origin: string, extra: Partial<RunConfig> = {}): RunConfig => {
    const b = stacked(4, 1, [
      { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right'] },
      { uid: 's1', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 's2', defId: 'dagger', x: 2, y: 0, exits: ['right'] },
      { uid: 's3', defId: 'greatsword', x: 3, y: 0, exits: [] },
    ]);
    return {
      seed: 3,
      regionId: 'grassland',
      loadout: b.loadout,
      items: b.items,
      hero: { ...BASE_HERO_STATS, maxHp: 1e6 },
      luck: NO_LUCK,
      ...extra,
    };
  };
  // そろいの指輪 on the row (slot 4 = row 0 on a 4×1 board), トリプル・スラッシュ learned
  const counted: Partial<RunConfig> = {
    charms: [
      null,
      null,
      null,
      null,
      { uid: 'c', defId: 'match_ring', rarity: 'rare' },
    ] as CharmSlots,
    mastery: { levels: {}, learned: ['triple'] },
  };

  it('もう一度鳴る分は、段数・必殺技・アクセサリーのマスの数え・熟練に入らず、待ちも増えない', () => {
    const echo = dummyChain(techRow('origin_echo', counted));
    const plain = dummyChain(techRow('origin_stone', counted));
    const count = (evs: CombatEvent[], type: CombatEvent['type']) =>
      evs.filter((e) => e.type === type).length;
    const hitsOf = (evs: CombatEvent[], uid: string) =>
      evs.filter((e) => e.type === 'hit' && e.itemUid === uid).length;
    expect(hitsOf(echo.evs, 's3')).toBe(hitsOf(plain.evs, 's3') * 2);
    expect(hitsOf(echo.evs, 's2')).toBe(hitsOf(plain.evs, 's2'));
    expect(count(plain.evs, 'technique')).toBe(1);
    expect(count(echo.evs, 'technique')).toBe(1);
    expect(count(plain.evs, 'charm')).toBeGreaterThan(0);
    expect(count(echo.evs, 'charm')).toBe(count(plain.evs, 'charm'));
    expect(echo.c.stats.maxStep).toBe(plain.c.stats.maxStep);
    expect(echo.c.stats.rings).toEqual(plain.c.stats.rings);
    expect(echo.c.atb).toBeCloseTo(plain.c.atb);
  });

  it('見積もりのアクセサリーの数えにも、もう一度鳴る分は入らない', () => {
    const peak = (cfg: RunConfig) =>
      estimateRoute(
        planChain(cfg.loadout, cfg.items, 'o'),
        cfg.items,
        1,
        undefined,
        charmContext(cfg.charms!, cfg.loadout, cfg.items),
      ).charmPeak;
    const plain = peak(techRow('origin_stone', counted));
    expect(plain).toBeGreaterThan(1);
    expect(peak(techRow('origin_echo', counted))).toBeCloseTo(plain);
  });

  it('残響の石で遊んだランは最後まで進み、記録を再生しても同じ結果', () => {
    const run = techRow('origin_echo', {
      hero: { ...BASE_HERO_STATS, maxHp: 1e6, attackMult: 30 },
    });
    const r = new Combat(run).runToEnd();
    expect(r.reachedLoop).toBeGreaterThan(1);
    const again = replayRun(run, r.inputs ?? []);
    expect(again && sameResult(again, r)).toBe(true);
  });
});

describe('盾の起点石', () => {
  const extra = getItemDef('origin_shield').line!.guardCells!;
  /** o → swords two cells past the shield's guard, on a stacked row (the scarecrow unless `run`) */
  const swords = CHAIN_RULES.guardSteps + extra + 2;
  const longRow = (origin: string, run = false): RunConfig => {
    const b = stacked(swords + 1, 1, [
      { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right'] },
      ...Array.from({ length: swords }, (_, i) => ({
        uid: `s${i}`,
        defId: 'sword',
        x: i + 1,
        y: 0,
        exits: (i < swords - 1 ? ['right'] : []) as Placed['exits'],
      })),
    ]);
    return {
      seed: 2,
      regionId: 'grassland',
      loadout: b.loadout,
      items: b.items,
      hero: run ? { ...BASE_HERO_STATS, attackMult: 20 } : BASE_HERO_STATS,
      luck: NO_LUCK,
      ...(run ? {} : { mode: 'dummy' as const }),
    };
  };

  it('守りが盾の石の分だけ長く残り、その次のマスで無防備になる（重ねる盤面、マスで数える）', () => {
    for (const [origin, guard] of [
      ['origin_shield', CHAIN_RULES.guardSteps + extra],
      ['origin_stone', CHAIN_RULES.guardSteps],
    ] as const) {
      const cfg = longRow(origin);
      const isOrigin = (u: string) => getItemDef(cfg.items.get(u)!.defId).kind === 'origin';
      const c = new Combat(cfg);
      c.fireNext();
      const seen: [number, boolean][] = [];
      while (c.chain) {
        seen.push([firedPieces(c.chain.plan.steps.slice(0, c.chain.next), isOrigin), c.unguarded]);
        c.step();
      }
      for (const [cells, ug] of seen) expect(ug, `${origin} ${cells}`).toBe(cells >= guard);
      expect(seen.some(([, ug]) => ug)).toBe(true);
    }
  });

  it('盾の石で遊んだランは、記録を再生しても同じ結果', () => {
    const run = longRow('origin_shield', true);
    const r = new Combat(run).runToEnd();
    const again = replayRun(run, r.inputs ?? []);
    expect(again && sameResult(again, r)).toBe(true);
  });

  it('説明文の数値', () => {
    expect(itemDescVars(getItemDef('origin_shield'))).toEqual({
      from: CHAIN_RULES.guardSteps,
      to: CHAIN_RULES.guardSteps + extra,
    });
  });
});

describe('一番槍の起点石の訳', () => {
  // 先駆け (an affix, strong up to the 3rd step) is a different thing with a similar meaning
  it.each(Object.keys(DICT_PARTS) as TargetLang[])('%s: 先駆けの訳を名前に含まない', (l) => {
    const data = DICT_PARTS[l].data;
    const name = data['一番槍の起点石'];
    const vanguard = data['先駆け'];
    expect(name).toBeTruthy();
    expect(vanguard).toBeTruthy();
    expect(name!).not.toContain(vanguard!);
  });
});
