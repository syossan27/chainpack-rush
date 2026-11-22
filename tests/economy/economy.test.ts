import { describe, expect, it } from 'vitest';
import {
  acceptLoot,
  autoSellDrops,
  buyUpgrade,
  heroStats,
  recordRun,
  rerollCost,
  rerollItem,
  sellItems,
  overflowSellPlan,
  sortieBlock,
  specifyExits,
  storageCapacity,
  storageCount,
  synthPlan,
  synthesize,
  toggleLock,
  upgradeCost,
} from '../../src/core/economy';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { clearLoadout, placeItem, cycleOriginOrder, removeItem } from '../../src/core/loadout';
import { itemMap } from '../../src/core/economy';
import { Rng } from '../../src/core/rng';
import {
  ECONOMY,
  HERO,
  LOOT,
  PROGRESS,
  RARITY,
  STORAGE,
  SYNTH,
  UPGRADES,
} from '../../src/config/balance';
import type { ItemInstance } from '../../src/core/types';
import { getItemDef } from '../../src/data/items';
import type { RunResult } from '../../src/core/combat';
import { build } from '../helpers';

/** An Rng whose first next() is `first` (later draws come from the seed) */
class FirstDraw extends Rng {
  private pending: number | null;
  constructor(first: number, seed = 1) {
    super(seed);
    this.pending = first;
  }
  override next(): number {
    if (this.pending === null) return super.next();
    const v = this.pending;
    this.pending = null;
    return v;
  }
}

/** `count` common swords with no exits, uids d0, d1, ... */
const swordDrops = (count: number): ItemInstance[] =>
  Array.from({ length: count }, (_, i) => ({
    uid: `d${i}`,
    defId: 'sword',
    rarity: 'common' as const,
    exits: [],
    rerollCount: 0,
  }));

describe('save', () => {
  it('初期所持品はすべてコモン', () => {
    const s = createInitialSave();
    expect(s.inventory.map((i) => i.rarity)).toEqual(s.inventory.map(() => 'common'));
  });

  it('初期の装備はすべて右向き1方向', () => {
    const gear = createInitialSave().inventory.filter((i) => i.defId !== 'potion');
    expect(gear.map((i) => i.exits)).toEqual(gear.map(() => ['right']));
  });

  it('書き出して読み直すと同じセーブになる', () => {
    const s = createInitialSave();
    s.gold = 123;
    expect(deserializeSave(serializeSave(s))).toEqual(s);
  });

  it('壊れたデータは初期値で読み込む', () => {
    expect(deserializeSave('{oops').gold).toBe(0);
  });

  it('知らないバージョンのデータは初期値で読み込む', () => {
    const s = createInitialSave();
    s.gold = 123;
    expect(deserializeSave(JSON.stringify({ ...s, version: 5 })).gold).toBe(0);
  });

  it('データがなければ今の版の初期値', () => {
    expect(deserializeSave(null).version).toBe(4);
  });

  it('版3のセーブ: 最大HP・攻撃間隔・攻撃倍率の段は2倍になる（1段の効き目が半分になったので、強さは同じ）', () => {
    const s = createInitialSave();
    s.upgrades = { ...s.upgrades, maxHp: 3, atb: 4, attack: 7, storage: 2 };
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const v3 = deserializeSave(JSON.stringify({ ...old, version: 3 }));
    expect(v3.upgrades).toMatchObject({ maxHp: 6, atb: 8, attack: 14, storage: 2 });
  });

  it('版3から移したセーブを読み直しても、段は2倍にならない', () => {
    const s = createInitialSave();
    s.upgrades = { ...s.upgrades, attack: 7 };
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const v3 = deserializeSave(JSON.stringify({ ...old, version: 3 }));
    expect(deserializeSave(serializeSave(v3)).upgrades.attack).toBe(14);
  });
});

describe('save migration', () => {
  it('出口0の起点石は読み込み時に右向き1方向のコモンにする', () => {
    const s = createInitialSave();
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    origin.exits = [];
    const loaded = deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === origin.uid)!;
    expect(loaded.exits).toEqual(['right']);
    expect(loaded.rarity).toBe('common');
  });

  it('出口0の装備（末端）は読み込み後も出口0のまま', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    sword.exits = [];
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.inventory.find((i) => i.uid === sword.uid)!.exits).toEqual([]);
  });
});

describe('save migration: 起点石のレアリティ', () => {
  it('読み込み時に、起点石のレアリティを出口の数に合わせる', () => {
    const s = createInitialSave();
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    origin.exits = ['up', 'right', 'down'];
    origin.rarity = 'common';
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.inventory.find((i) => i.uid === origin.uid)!.rarity).toBe('epic');
  });
});

describe('settings', () => {
  const withSpeed = (gameSpeed: number) => {
    const s = createInitialSave();
    return deserializeSave(JSON.stringify({ ...s, settings: { ...s.settings, gameSpeed } }))
      .settings.gameSpeed;
  };

  it('ゲームスピードは既定で×1', () => {
    expect(createInitialSave().settings.gameSpeed).toBe(1);
  });

  it('ゲームスピードが欠けたセーブは×1で読み込む', () => {
    const old = JSON.parse(serializeSave(createInitialSave()));
    delete old.settings.gameSpeed;
    expect(deserializeSave(JSON.stringify(old)).settings.gameSpeed).toBe(1);
  });

  it('範囲外のゲームスピードは×1に戻す', () => {
    expect(withSpeed(99)).toBe(1);
  });

  it('範囲内のゲームスピードは保存した値のまま', () => {
    expect(withSpeed(2)).toBe(2);
  });
});

describe('economy', () => {
  it('まとめて売ると、それぞれの売値の合計を受け取る（装備はレアリティの売値、消耗品は一律）', () => {
    const s = createInitialSave();
    const swords = s.inventory.filter((i) => i.defId === 'sword').map((i) => i.uid);
    const potion = s.inventory.find((i) => i.defId === 'potion')!.uid;
    const expected = 2 * RARITY.common.sell + LOOT.consumableSell;
    const before = s.gold;
    expect(sellItems(s, [...swords, potion])).toBe(expected);
    expect(s.gold).toBe(before + expected);
  });

  it('売ったアイテムは盤面と消耗品枠から外れる', () => {
    const s = createInitialSave();
    const swords = s.inventory.filter((i) => i.defId === 'sword').map((i) => i.uid);
    const potion = s.inventory.find((i) => i.defId === 'potion')!.uid;
    sellItems(s, [...swords, potion]);
    expect(s.loadout.cells.filter((c) => c && swords.includes(c))).toHaveLength(0);
    expect(s.loadout.consumables).not.toContain(potion);
  });

  it('付け直しの料金は、付け直すたびに伸びる（×ECONOMY.rerollCostGrowth）', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    const first = rerollCost(it, 'reroll');
    expect(rerollItem(s, it.uid, new Rng(3))).toBe(true);
    const second = rerollCost(it, 'reroll');
    expect(rerollItem(s, it.uid, new Rng(4))).toBe(true);
    const third = rerollCost(it, 'reroll');
    expect(second / first).toBeCloseTo(ECONOMY.rerollCostGrowth, 1);
    expect(third / second).toBeCloseTo(ECONOMY.rerollCostGrowth, 1);
  });

  it('最初の付け直しの料金は、レアリティの料金', () => {
    const it = createInitialSave().inventory.find((i) => i.defId === 'sword')!;
    expect(rerollCost(it, 'reroll')).toBe(RARITY[it.rarity].reroll);
  });

  it('向きの指定も付け直しに数え、次の料金が伸びる', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    const first = rerollCost(it, 'reroll');
    expect(specifyExits(s, it.uid, ['down'])).toBe(true);
    expect(rerollCost(it, 'reroll') / first).toBeCloseTo(ECONOMY.rerollCostGrowth, 1);
  });

  it('向きの指定の料金は、ふつうの付け直しの ECONOMY.specifyCostMult 倍', () => {
    const it = createInitialSave().inventory.find((i) => i.defId === 'sword')!;
    expect(rerollCost(it, 'specify') / rerollCost(it, 'reroll')).toBe(ECONOMY.specifyCostMult);
  });

  it('付け直しても出口の数は変わらない', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    const n = it.exits.length;
    rerollItem(s, it.uid, new Rng(3));
    expect(it.exits).toHaveLength(n);
  });

  it('向きの指定: 指定した向きになる', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    expect(specifyExits(s, it.uid, ['down'])).toBe(true);
    expect(it.exits).toEqual(['down']);
  });

  it('向きの指定: 出口の数が違う指定はできない', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    expect(specifyExits(s, it.uid, ['down', 'up'])).toBe(false);
  });

  it('付け直し: 今と同じ向きの指定はできず、お金も減らない', () => {
    const s = createInitialSave();
    s.gold = 10000;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    it.exits = ['right', 'down'];
    expect(specifyExits(s, it.uid, ['down', 'right'])).toBe(false);
    expect(s.gold).toBe(10000);
    expect(it.rerollCount).toBe(0);
    expect(specifyExits(s, it.uid, ['up', 'right'])).toBe(true);
  });

  it('永続強化: 最初の段の値段は基本の値段', () => {
    expect(upgradeCost('maxHp', 0)).toBe(UPGRADES.maxHp.baseCost);
  });

  it('永続強化: 値段は1段ごとに growth 倍になる', () => {
    const lv = UPGRADES.maxHp.maxLevel - 1;
    expect(upgradeCost('maxHp', lv)! / upgradeCost('maxHp', lv - 1)!).toBeCloseTo(
      UPGRADES.maxHp.growth,
      2,
    );
  });

  it('永続強化: 上限の段は買えない', () => {
    expect(upgradeCost('maxHp', UPGRADES.maxHp.maxLevel)).toBeNull();
  });

  it('後半の地域で上がった上限より先の段は、値段の伸びが緩い（lateGrowth）', () => {
    const top = UPGRADES.attack.maxLevel;
    const cap = top + 10;
    const before = upgradeCost('attack', top, cap)! / upgradeCost('attack', top - 1, cap)!;
    const after = upgradeCost('attack', top + 1, cap)! / upgradeCost('attack', top, cap)!;
    expect(before).toBeCloseTo(UPGRADES.attack.growth, 2);
    expect(after).toBeCloseTo(UPGRADES.attack.lateGrowth!, 2);
    expect(after).toBeLessThan(before);
  });

  it('攻撃間隔を上限まで買うと、最短の攻撃間隔になる', () => {
    const s = createInitialSave();
    s.gold = 1e9;
    while (buyUpgrade(s, 'atb'));
    expect(heroStats(s).atbTime).toBeCloseTo(HERO.minAtbTime);
  });

  it('倉庫の強化は1段ごとに容量が増え、上限の段で止まる', () => {
    const s = createInitialSave();
    s.gold = 1e9;
    const base = storageCapacity(s);
    expect(base).toBe(STORAGE.baseCapacity);
    buyUpgrade(s, 'storage');
    expect(storageCapacity(s) - base).toBe(UPGRADES.storage.effect);
    while (buyUpgrade(s, 'storage'));
    expect(s.upgrades.storage).toBe(UPGRADES.storage.maxLevel);
  });

  it('攻撃倍率は上限の段まで買える', () => {
    const s = createInitialSave();
    s.gold = 1e9;
    while (buyUpgrade(s, 'attack'));
    expect(s.upgrades.attack).toBe(UPGRADES.attack.maxLevel);
  });

  it('後半の地域を開放するたびに、攻撃倍率の上限が上がる', () => {
    const s = createInitialSave();
    s.gold = 1e9;
    s.progress.unlocked.push('volcano', 'glacier');
    while (buyUpgrade(s, 'attack'));
    expect(s.upgrades.attack).toBe(
      UPGRADES.attack.maxLevel + 2 * UPGRADES.attack.perRegionLevels!,
    );
  });

  it('倉庫があふれても全部受け取る', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    const count = storageCapacity(s) + 20;
    acceptLoot(s, swordDrops(count));
    expect(s.inventory.length).toBe(n + count);
  });

  it('倉庫があふれていると出撃できない', () => {
    const s = createInitialSave();
    acceptLoot(s, swordDrops(storageCapacity(s) + 20));
    expect(sortieBlock(s)).toBe('storageFull');
  });

  it('あふれた分の売却: 装備中以外を安い順に、ちょうど収まる数だけ', () => {
    const s = createInitialSave();
    const drops = swordDrops(storageCapacity(s) + 5).map((d, i) =>
      i === 0 ? { ...d, defId: 'greatsword', rarity: 'epic' as const } : d,
    );
    acceptLoot(s, drops);
    const over = storageCount(s) - storageCapacity(s);
    const plan = overflowSellPlan(s);
    expect(plan.uids).toHaveLength(over);
    expect(plan.uids).not.toContain('d0');
    sellItems(s, plan.uids);
    expect(sortieBlock(s)).toBeNull();
    expect(overflowSellPlan(s).uids).toEqual([]);
  });

  it('起点がなければ出撃できない', () => {
    const s = createInitialSave();
    const items = itemMap(s);
    for (const u of s.loadout.originOrder.slice()) s.loadout = removeItem(s.loadout, items, u);
    expect(sortieBlock(s)).toBe('noOrigin');
  });
});

describe('ランの記録', () => {
  const run = (over: Partial<RunResult['stats']> = {}, reachedLoop = 1): RunResult => ({
    reason: 'timeout',
    usedConsumables: [],
    progress: reachedLoop,
    reachedLoop,
    drops: [],
    ticks: 0,
    stats: {
      fires: 10,
      maxStep: 5,
      maxDamage: 99,
      totalDamage: 1000,
      bossesDefeated: 0,
      timeGained: 0,
      sweeps: 0,
      ...over,
    },
  });
  const cleared = () => run({ bossesDefeated: PROGRESS.unlockLoop }, PROGRESS.unlockLoop + 1);

  it('開放に必要な周回のボスを倒すと次の地域が開放される', () => {
    const s = createInitialSave();
    expect(recordRun(s, 'grassland', cleared()).unlocked).toBe('cave');
    expect(s.progress.unlocked).toContain('cave');
  });

  it('地域ごとに、到達した周回の自己ベスト（★）を記録する', () => {
    const s = createInitialSave();
    recordRun(s, 'grassland', cleared());
    expect(s.progress.best.grassland).toBe(PROGRESS.unlockLoop + 1);
  });

  it('最大連鎖・最大ダメージの自己ベストを更新する', () => {
    const s = createInitialSave();
    s.stats.maxStep = 4;
    s.stats.maxDamage = 50;
    recordRun(s, 'grassland', run({ maxStep: 11, maxDamage: 99 }));
    expect(s.stats.maxStep).toBe(11);
    expect(s.stats.maxDamage).toBe(99);
  });

  it('ランの回数を数える', () => {
    const s = createInitialSave();
    recordRun(s, 'grassland', run());
    expect(s.stats.runs).toBe(1);
  });

  it('ランで拾ったゴールドを受け取る', () => {
    const s = createInitialSave();
    const before = s.gold;
    recordRun(s, 'grassland', run({ gold: 7 }));
    expect(s.gold).toBe(before + 7);
  });

  it('エンドレスでは地域を開放せず、∞の自己ベスト（到達周回・合計ダメージ）を記録する', () => {
    const s = createInitialSave();
    const far = cleared();
    expect(recordRun(s, 'endless', far).unlocked).toBeNull();
    expect(s.endless).toEqual({ bestLoop: far.reachedLoop, bestDamage: far.stats.totalDamage });
  });
});

describe('loadout', () => {
  const setup = () =>
    build(5, 4, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'sw', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
    ]);

  it('起点を選ぶと、発火順の先頭になる', () => {
    const { loadout } = setup();
    const [o1, o2] = loadout.originOrder;
    expect(cycleOriginOrder(loadout, o2!).originOrder).toEqual([o2, o1]);
  });

  it('空いたマスに置くと、元のマスは空になる', () => {
    const { loadout, items } = setup();
    const sword = loadout.cells[1]!;
    const l = placeItem(loadout, items, sword, 3);
    expect(l.cells[1]).toBeNull();
    expect(l.cells[3]).toBe(sword);
  });

  it('ふさがったマスに置くと、入れ替わる', () => {
    const { loadout, items } = setup();
    const sword = loadout.cells[1]!;
    const o1 = loadout.cells[0]!;
    let l = placeItem(loadout, items, sword, 3);
    l = placeItem(l, items, o1, 3);
    expect(l.cells[3]).toBe(o1);
    expect(l.cells[0]).toBe(sword);
  });

  it('全部外す: マス・重ねた分・発火順・消耗品枠が空になり、盤面とアイテムは残る', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    const size = s.loadout.cells.length;
    const board = s.loadout.board;
    s.loadout = clearLoadout(s.loadout);
    expect(s.loadout.cells.every((c) => c === null)).toBe(true);
    expect(s.loadout.under!.every((u) => u.length === 0)).toBe(true);
    expect(s.loadout.cells).toHaveLength(size);
    expect(s.loadout.board).toBe(board);
    expect(s.loadout.originOrder).toEqual([]);
    expect(s.loadout.consumables).toEqual([]);
    expect(s.inventory).toHaveLength(n);
  });
});

describe('ロック', () => {
  const setup = () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    const axe = s.inventory.find((i) => i.defId === 'axe')!;
    const potion = s.inventory.find((i) => i.defId === 'potion')!;
    return { s, sword, axe, potion };
  };

  it('装備はロックできる', () => {
    const { s, sword } = setup();
    expect(toggleLock(s, sword.uid)).toBe(true);
    expect(sword.locked).toBe(true);
  });

  it('消耗品はロックできない', () => {
    const { s, potion } = setup();
    expect(toggleLock(s, potion.uid)).toBe(false);
  });

  it('ロック中は売れない（まとめて渡しても、ロック中だけ飛ばす）', () => {
    const { s, sword, axe } = setup();
    toggleLock(s, sword.uid);
    expect(sellItems(s, [sword.uid, axe.uid])).toBe(RARITY.common.sell);
    expect(s.inventory.some((i) => i.uid === sword.uid)).toBe(true);
    expect(s.inventory.some((i) => i.uid === axe.uid)).toBe(false);
  });

  it('ロックは読み込み後も残る', () => {
    const { s, sword } = setup();
    toggleLock(s, sword.uid);
    expect(
      deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === sword.uid)!.locked,
    ).toBe(true);
  });

  it('ロックを解除すると売れる', () => {
    const { s, sword } = setup();
    toggleLock(s, sword.uid);
    toggleLock(s, sword.uid);
    expect(sword.locked).toBeUndefined();
    expect(sellItems(s, [sword.uid])).toBe(RARITY.common.sell);
  });

  it('あふれた分の売却はロック中を避ける', () => {
    const s = createInitialSave();
    const drops = swordDrops(storageCapacity(s) + 5).map((d, i) =>
      i < 10 ? { ...d, locked: true } : d,
    );
    acceptLoot(s, drops);
    const plan = overflowSellPlan(s);
    expect(plan.uids.some((u) => ['d0', 'd1', 'd9'].includes(u))).toBe(false);
  });
});

describe('合成', () => {
  const add = (
    s: ReturnType<typeof createInitialSave>,
    uid: string,
    extra: Partial<ItemInstance> = {},
  ) =>
    s.inventory.push({
      uid,
      defId: 'spear',
      rarity: 'common',
      exits: ['right'],
      rerollCount: 0,
      ...extra,
    });

  /** Three common spears (a, c, d) and one with an affix (b) */
  const fourSpears = () => {
    const s = createInitialSave();
    s.gold = 100;
    add(s, 'a');
    add(s, 'b', { affixes: [{ id: 'sharp', value: 10 }] });
    add(s, 'c');
    add(s, 'd');
    return s;
  };

  it('同じ装備・同じレアリティ3つで、1つ上のレアリティにできる', () => {
    const plan = synthPlan(fourSpears(), 'a');
    expect(plan.reason).toBeNull();
    expect(plan.to).toBe('rare');
  });

  it('一緒に使うのは追加効果のないものから', () => {
    expect(synthPlan(fourSpears(), 'a').uids.sort()).toEqual(['a', 'c', 'd']);
  });

  it('合成すると費用を払い、使った3つは消えて、できた装備が倉庫に入る', () => {
    const s = fourSpears();
    const res = synthesize(s, 'a', new Rng(1))!;
    expect(s.gold).toBe(100 - SYNTH.cost.common);
    expect(s.inventory.some((i) => ['a', 'c', 'd'].includes(i.uid))).toBe(false);
    expect(s.inventory.some((i) => i.uid === 'b')).toBe(true);
    expect(s.inventory.some((i) => i.uid === res.item.uid)).toBe(true);
  });

  it('成功すると、同じ装備の1つ上のレアリティになる', () => {
    const res = synthesize(fourSpears(), 'a', new FirstDraw(0))!;
    expect(res.success).toBe(true);
    expect(res.item.defId).toBe('spear');
    expect(res.item.rarity).toBe('rare');
  });

  it('失敗すると、材料と同じレアリティの装備になる', () => {
    const res = synthesize(fourSpears(), 'a', new FirstDraw(0.999999))!;
    expect(res.success).toBe(false);
    expect(res.item.rarity).toBe('common');
  });

  describe.each(['common', 'rare', 'epic'] as const)('材料が %s のとき', (r) => {
    const n = 2000;
    // Rolled inside each test (a throw fails that test, not the whole file)
    const results = () => {
      const rng = new Rng(7);
      return Array.from({ length: n }, () => {
        const s = createInitialSave();
        s.gold = 1e6;
        for (const u of ['x', 'y', 'z']) add(s, u, { rarity: r });
        return synthesize(s, 'x', rng)!;
      });
    };
    const won = () => results().filter((res) => res.success);
    const lost = () => results().filter((res) => !res.success);

    it('成功率は設定どおり', () => {
      expect(won().length / n).toBeCloseTo(SYNTH.successRate[r], 1);
    });

    it('成功したら同じ装備', () => {
      expect(new Set(won().map((res) => res.item.defId))).toEqual(new Set(['spear']));
    });

    it('失敗したら同じレアリティの、消耗品・アーティファクト以外のランダムな装備', () => {
      const failed = lost();
      expect(new Set(failed.map((res) => res.item.rarity))).toEqual(new Set([r]));
      const defs = failed.map((res) => getItemDef(res.item.defId));
      expect(defs.filter((d) => d.kind === 'consumable')).toEqual([]);
      expect(defs.filter((d) => d.artifact)).toEqual([]);
    });
  });

  it('上のレアリティほど成功しにくい', () => {
    expect(SYNTH.successRate.common).toBeGreaterThan(SYNTH.successRate.rare);
    expect(SYNTH.successRate.rare).toBeGreaterThan(SYNTH.successRate.epic);
  });

  it('2つしかなければできない（あと1つ）', () => {
    const s = createInitialSave();
    add(s, 'a');
    add(s, 'b');
    expect(synthPlan(s, 'a').reason).toContain('あと1つ');
  });

  it('ロック中のものは数に入らない', () => {
    const s = createInitialSave();
    add(s, 'a');
    add(s, 'b');
    add(s, 'c', { locked: true });
    expect(synthPlan(s, 'a').have).toBe(2);
  });

  it('お金が足りなければできない', () => {
    const s = createInitialSave();
    s.gold = 0;
    for (const u of ['a', 'b', 'c']) add(s, u);
    expect(synthPlan(s, 'a').reason).toContain('G 必要');
    s.gold = 1e6;
    expect(synthPlan(s, 'a').reason).toBeNull();
  });

  it('消耗品は合成できない', () => {
    const s = createInitialSave();
    const potion = s.inventory.find((i) => i.defId === 'potion')!;
    expect(synthPlan(s, potion.uid).to).toBeNull();
  });

  it('レジェンダリーは合成できない', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    for (const u of ['L', 'M', 'N']) add(s, u, { rarity: 'legendary' });
    expect(synthPlan(s, 'L').to).toBeNull();
    expect(synthesize(s, 'L', new Rng(1))).toBeNull();
  });

  it('アーティファクトは合成できない', () => {
    const s = createInitialSave();
    s.inventory.push({
      uid: 'art',
      defId: 'dragon_fang',
      rarity: 'legendary',
      exits: ['right'],
      rerollCount: 0,
    });
    expect(synthPlan(s, 'art').to).toBeNull();
  });

  it('装備中のものは合成できない', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const equipped = s.loadout.cells.find((c) => c)!;
    expect(synthPlan(s, equipped).reason).not.toBeNull();
  });
});

describe('自動売却', () => {
  const drop = (
    uid: string,
    rarity: 'common' | 'rare' | 'epic' | 'legendary',
    extra: Partial<ItemInstance> = {},
  ): ItemInstance => ({
    uid,
    defId: 'sword',
    rarity,
    exits: ['right'],
    rerollCount: 0,
    ...extra,
  });
  const mixed = () => [
    drop('a', 'common'),
    drop('b', 'rare'),
    drop('c', 'epic'),
    drop('d', 'common', { affixes: [{ id: 'sharp', value: 5 }] }),
    drop('e', 'common', { defId: 'potion', exits: [] }),
    drop('f', 'legendary', { defId: 'dragon_fang' }),
  ];

  it('既定はオフで、何も売らない', () => {
    const s = createInitialSave();
    expect(s.settings.autoSell).toBe('off');
    expect(autoSellDrops(s, acceptLoot(s, mixed())).uids).toEqual([]);
  });

  it('設定したレアリティ以下の装備だけを売る。消耗品・アーティファクト・✦つきは残す', () => {
    const s = createInitialSave();
    s.settings.autoSell = 'rare';
    const added = acceptLoot(s, mixed());
    const r = autoSellDrops(s, added);
    const names = (u: string) =>
      added.find((i) => i.uid === u)!.rarity + ':' + added.find((i) => i.uid === u)!.defId;
    expect(r.uids.map(names).sort()).toEqual(['common:sword', 'rare:sword']);
  });

  it('売った分の売値を受け取る', () => {
    const s = createInitialSave();
    s.settings.autoSell = 'rare';
    const r = autoSellDrops(s, acceptLoot(s, mixed()));
    expect(r.gold).toBe(RARITY.common.sell + RARITY.rare.sell);
  });

  it('✦つきも売る設定なら、✦つきも売る', () => {
    const s = createInitialSave();
    s.settings.autoSell = 'common';
    s.settings.autoSellKeepAffix = false;
    const added = acceptLoot(s, [drop('x', 'common', { affixes: [{ id: 'sharp', value: 5 }] })]);
    expect(autoSellDrops(s, added).uids).toHaveLength(1);
  });

  it('設定は保存される', () => {
    const s = createInitialSave();
    s.settings.autoSell = 'epic';
    expect(deserializeSave(serializeSave(s)).settings.autoSell).toBe('epic');
  });

  it('壊れた設定はオフに戻す', () => {
    const bad = JSON.parse(serializeSave(createInitialSave()));
    bad.settings.autoSell = 'everything';
    expect(deserializeSave(JSON.stringify(bad)).settings.autoSell).toBe('off');
  });
});
