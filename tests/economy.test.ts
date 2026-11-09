import { describe, expect, it } from 'vitest';
import {
  acceptLoot,
  backpackSize,
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
} from '../src/core/economy';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { clearLoadout, placeItem, cycleOriginOrder, removeItem } from '../src/core/loadout';
import { itemMap } from '../src/core/economy';
import { Rng } from '../src/core/rng';
import { SYNTH } from '../src/config/balance';
import type { ItemInstance } from '../src/core/types';
import { getItemDef } from '../src/data/items';
import type { RunResult } from '../src/core/combat';

describe('save', () => {
  it('初期所持品: 起点石×2、剣×2、斧、木の盾、回復薬。すべてコモン・右向き', () => {
    const s = createInitialSave();
    expect(s.inventory.map((i) => i.defId).sort()).toEqual(
      ['axe', 'origin_stone', 'origin_stone', 'potion', 'sword', 'sword', 'wood_shield'].sort(),
    );
    for (const it of s.inventory) {
      expect(it.rarity).toBe('common');
      if (it.defId !== 'potion') expect(it.exits).toEqual(['right']);
    }
  });

  it('往復できる。壊れたデータやバージョン違いは初期値', () => {
    const s = createInitialSave();
    s.gold = 123;
    expect(deserializeSave(serializeSave(s))).toEqual(s);
    expect(deserializeSave('{oops').gold).toBe(0);
    expect(deserializeSave(JSON.stringify({ ...s, version: 2 })).gold).toBe(0);
    expect(deserializeSave(null).version).toBe(1);
  });
});

describe('save migration', () => {
  it('出口0の起点石は読み込み時に右向き1方向にする', () => {
    const s = createInitialSave();
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    origin.exits = [];
    sword.exits = [];
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.inventory.find((i) => i.uid === origin.uid)!.exits).toEqual(['right']);
    expect(loaded.inventory.find((i) => i.uid === origin.uid)!.rarity).toBe('common');
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
  it('ゲームスピードは既定で×1。範囲外や欠けた値は×1に戻す', () => {
    const s = createInitialSave();
    expect(s.settings.gameSpeed).toBe(1);
    const old = JSON.parse(serializeSave(s));
    delete old.settings.gameSpeed;
    expect(deserializeSave(JSON.stringify(old)).settings.gameSpeed).toBe(1);
    expect(
      deserializeSave(JSON.stringify({ ...s, settings: { ...s.settings, gameSpeed: 99 } })).settings
        .gameSpeed,
    ).toBe(1);
    expect(
      deserializeSave(JSON.stringify({ ...s, settings: { ...s.settings, gameSpeed: 2 } })).settings
        .gameSpeed,
    ).toBe(2);
  });
});

describe('economy', () => {
  it('売却価格とまとめ売り', () => {
    const s = createInitialSave();
    const swords = s.inventory.filter((i) => i.defId === 'sword').map((i) => i.uid);
    const potion = s.inventory.find((i) => i.defId === 'potion')!.uid;
    expect(sellItems(s, [...swords, potion])).toBe(5 + 5 + 3);
    expect(s.gold).toBe(13);
    expect(s.loadout.cells.filter((c) => c && swords.includes(c))).toHaveLength(0);
    expect(s.loadout.consumables).not.toContain(potion);
  });

  it('付け直し: 料金は付け直すたびに1.5倍、指定は5倍、出口の数は変わらない', () => {
    const s = createInitialSave();
    s.gold = 10000;
    const it = s.inventory.find((i) => i.defId === 'sword')!;
    expect(rerollCost(it, 'reroll')).toBe(10);
    expect(rerollCost(it, 'specify')).toBe(50);
    expect(rerollItem(s, it.uid, new Rng(3))).toBe(true);
    expect(it.exits).toHaveLength(1);
    expect(rerollCost(it, 'reroll')).toBe(15);
    expect(specifyExits(s, it.uid, ['down'])).toBe(true);
    expect(it.exits).toEqual(['down']);
    expect(rerollCost(it, 'reroll')).toBe(Math.round(10 * 1.5 * 1.5));
    expect(specifyExits(s, it.uid, ['down', 'up'])).toBe(false);
  });

  it('永続強化: 費用の伸びと上限、効果', () => {
    expect(upgradeCost('maxHp', 0)).toBe(50);
    expect(upgradeCost('maxHp', 1)).toBe(80);
    expect(upgradeCost('maxHp', 10)).toBeNull();
    const s = createInitialSave();
    s.gold = 1e9;
    for (let i = 0; i < 20; i++) buyUpgrade(s, 'atb');
    expect(heroStats(s).atbTime).toBeCloseTo(1.0);
    for (let i = 0; i < 10; i++) buyUpgrade(s, 'backpack');
    expect(s.loadout.width).toBe(7);
    expect(s.loadout.height).toBe(5);
    for (let i = 0; i < 10; i++) buyUpgrade(s, 'storage');
    expect(storageCapacity(s)).toBe(100);
  });

  it('バックパック拡張は列と行を交互に', () => {
    expect(backpackSize(0)).toEqual({ width: 5, height: 4 });
    expect(backpackSize(1)).toEqual({ width: 6, height: 4 });
    expect(backpackSize(2)).toEqual({ width: 6, height: 5 });
    expect(backpackSize(3)).toEqual({ width: 7, height: 5 });
  });

  it('拡張しても配置は同じ座標に残る', () => {
    const s = createInitialSave();
    s.gold = 1e6;
    const before = s.loadout.cells[5];
    buyUpgrade(s, 'backpack');
    expect(s.loadout.cells[6]).toBe(before); // (0,1)
  });

  it('倉庫があふれても全部受け取るが、出撃はできない', () => {
    const s = createInitialSave();
    const drops = Array.from({ length: 60 }, (_, i) => ({
      uid: `d${i}`,
      defId: 'sword',
      rarity: 'common' as const,
      exits: [],
      rerollCount: 0,
    }));
    acceptLoot(s, drops);
    expect(s.inventory.length).toBe(67);
    expect(sortieBlock(s)).toBe('storageFull');
  });

  it('あふれた分の売却: 装備中以外を安い順に、ちょうど収まる数だけ', () => {
    const s = createInitialSave();
    const drops = Array.from({ length: 45 }, (_, i) => ({
      uid: `d${i}`,
      defId: i === 0 ? 'greatsword' : 'sword',
      rarity: (i === 0 ? 'epic' : 'common') as 'epic' | 'common',
      exits: [],
      rerollCount: 0,
    }));
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

  it('3周目のボスを倒すと次の地域が開放される', () => {
    const s = createInitialSave();
    const r: RunResult = {
      reason: 'timeout',
      usedConsumables: [],
      progress: 4,
      reachedLoop: 4,
      drops: [],
      ticks: 0,
      stats: {
        fires: 10,
        maxStep: 5,
        maxDamage: 99,
        totalDamage: 1000,
        bossesDefeated: 3,
        timeGained: 0,
        sweeps: 0,
      },
    };
    expect(recordRun(s, 'grassland', r).unlocked).toBe('cave');
    expect(s.progress.best.grassland).toBe(4);
  });
});

describe('loadout', () => {
  it('置く・入れ替える・起点の発火順', () => {
    const s = createInitialSave();
    const items = itemMap(s);
    const [o1, o2] = s.loadout.originOrder;
    let l = cycleOriginOrder(s.loadout, o2!);
    expect(l.originOrder).toEqual([o2, o1]);
    const sword = l.cells[1]!;
    l = placeItem(l, items, sword, 3);
    expect(l.cells[1]).toBeNull();
    expect(l.cells[3]).toBe(sword);
    // 起点を剣の場所へ → 入れ替え
    l = placeItem(l, items, o1!, 3);
    expect(l.cells[3]).toBe(o1);
    expect(l.cells[0]).toBe(sword);
  });

  it('全部外す: マス・発火順・消耗品枠が空になり、大きさとアイテムは残る', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    s.loadout = clearLoadout(s.loadout);
    expect(s.loadout.cells.every((c) => c === null)).toBe(true);
    expect(s.loadout.cells).toHaveLength(5 * 4);
    expect(s.loadout.originOrder).toEqual([]);
    expect(s.loadout.consumables).toEqual([]);
    expect(s.inventory).toHaveLength(n);
  });
});

describe('ロック', () => {
  it('ロック中は売れない（まとめて渡しても飛ばす）。あふれた分の売却候補にも入らない。消耗品はロックできない', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    const axe = s.inventory.find((i) => i.defId === 'axe')!;
    const potion = s.inventory.find((i) => i.defId === 'potion')!;
    expect(toggleLock(s, sword.uid)).toBe(true);
    expect(sword.locked).toBe(true);
    expect(toggleLock(s, potion.uid)).toBe(false);
    const gold = sellItems(s, [sword.uid, axe.uid]);
    expect(gold).toBe(5);
    expect(s.inventory.some((i) => i.uid === sword.uid)).toBe(true);
    expect(s.inventory.some((i) => i.uid === axe.uid)).toBe(false);
    // 読み込み後も残る
    expect(
      deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === sword.uid)!.locked,
    ).toBe(true);
    // 解除すると売れる
    toggleLock(s, sword.uid);
    expect(sword.locked).toBeUndefined();
    expect(sellItems(s, [sword.uid])).toBe(5);
  });

  it('あふれた分の売却はロック中を避ける', () => {
    const s = createInitialSave();
    const drops = Array.from({ length: 45 }, (_, i) => ({
      uid: `d${i}`,
      defId: 'sword',
      rarity: 'common' as const,
      exits: [],
      rerollCount: 0,
      ...(i < 10 ? { locked: true } : {}),
    }));
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

  it('同じ装備・同じレアリティ3つで1つ上のレアリティになる。費用を払い、3つは消える', () => {
    const s = createInitialSave();
    s.gold = 100;
    add(s, 'a');
    add(s, 'b', { affixes: [{ id: 'sharp', value: 10 }] });
    add(s, 'c');
    add(s, 'd');
    const plan = synthPlan(s, 'a');
    expect(plan.reason).toBeNull();
    expect(plan.to).toBe('rare');
    // 一緒に使うのは追加効果のないものから
    expect(plan.uids.sort()).toEqual(['a', 'c', 'd']);
    const res = synthesize(s, 'a', new Rng(1))!;
    // 成功なら同じ装備の1つ上、失敗なら同じレアリティのランダムな装備（消耗品・アーティファクト以外）
    if (res.success) {
      expect(res.item.rarity).toBe('rare');
      expect(res.item.defId).toBe('spear');
    } else {
      expect(res.item.rarity).toBe('common');
    }
    expect(s.gold).toBe(100 - SYNTH.cost.common);
    expect(s.inventory.some((i) => ['a', 'c', 'd'].includes(i.uid))).toBe(false);
    expect(s.inventory.some((i) => i.uid === 'b')).toBe(true);
    expect(s.inventory.some((i) => i.uid === res.item.uid)).toBe(true);
  });

  it('上のレアリティほど成功しにくい。失敗したら材料と同じレアリティのランダムな装備', () => {
    for (const r of ['common', 'rare', 'epic'] as const) {
      let ok = 0;
      const n = 2000;
      const rng = new Rng(7);
      for (let k = 0; k < n; k++) {
        const s = createInitialSave();
        s.gold = 1e6;
        for (const u of ['x', 'y', 'z']) add(s, u, { rarity: r });
        const res = synthesize(s, 'x', rng)!;
        if (res.success) {
          ok++;
          expect(res.item.defId).toBe('spear');
        } else {
          expect(res.item.rarity).toBe(r);
          const d = getItemDef(res.item.defId);
          expect(d.kind).not.toBe('consumable');
          expect(d.artifact).toBeUndefined();
        }
      }
      expect(ok / n).toBeCloseTo(SYNTH.successRate[r], 1);
    }
    expect(SYNTH.successRate.common).toBeGreaterThan(SYNTH.successRate.rare);
    expect(SYNTH.successRate.rare).toBeGreaterThan(SYNTH.successRate.epic);
  });

  it('足りない・ロック中・装備中・お金不足・消耗品・レジェンダリー・アーティファクトはできない', () => {
    const s = createInitialSave();
    s.gold = 0;
    add(s, 'a');
    add(s, 'b');
    expect(synthPlan(s, 'a').reason).toContain('あと1つ');
    add(s, 'c', { locked: true });
    expect(synthPlan(s, 'a').have).toBe(2);
    add(s, 'd');
    expect(synthPlan(s, 'a').reason).toContain('G 必要');
    s.gold = 1e6;
    expect(synthPlan(s, 'a').reason).toBeNull();
    const potion = s.inventory.find((i) => i.defId === 'potion')!;
    expect(synthPlan(s, potion.uid).to).toBeNull();
    add(s, 'L', { rarity: 'legendary' });
    expect(synthPlan(s, 'L').to).toBeNull();
    s.inventory.push({
      uid: 'art',
      defId: 'dragon_fang',
      rarity: 'legendary',
      exits: ['right'],
      rerollCount: 0,
    });
    expect(synthPlan(s, 'art').to).toBeNull();
    const equipped = s.loadout.cells.find((c) => c)!;
    expect(synthPlan(s, equipped).reason).not.toBeNull();
    expect(synthesize(s, 'L', new Rng(1))).toBeNull();
  });
});
