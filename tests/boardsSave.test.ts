import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS } from '../src/core/combat';
import { createInitialSave, deserializeSave, serializeSave, type SaveData } from '../src/core/save';
import { itemMap, overflowSellPlan, sellItems } from '../src/core/economy';
import { activeBoardId, otherBoardUse, switchBoard } from '../src/core/boardSave';
import { challengeLoadoutOf, enterChallengeEdit } from '../src/core/challengeLoadout';
import { runConfig } from '../src/core/runConfig';
import { boardUids, stackAt, stackTake } from '../src/core/stack';
import { CHALLENGES } from '../src/data/challenges';
import { getSave, setSave } from '../src/platform/store';
import type { ItemInstance } from '../src/core/types';

const rare = CHALLENGES.find((c) => c.id === 'rare_rush')!.rules;

/** A save that has cleared the cave (so the small board is owned) */
function grown(): SaveData {
  const s = createInitialSave();
  s.progress.unlocked.push('cave', 'rampart');
  return s;
}

describe('盤面ごとの配置', () => {
  it('盤面ごとに配置を覚える。切り替えて戻っても残り、出撃はいま選んでいる盤面', () => {
    const s = grown();
    const standard = JSON.stringify([s.loadout.cells, s.loadout.under]);
    expect(switchBoard(s, 'small')).toBe(true);
    expect(s.loadout.board).toBe('small');
    expect(activeBoardId(s)).toBe('small');
    // Change the small board, go back and forth
    const top = s.loadout.cells.find((u) => u && u !== s.loadout.originOrder[0])!;
    s.loadout = stackTake(s.loadout, itemMap(s), top);
    const small = JSON.stringify([s.loadout.cells, s.loadout.under]);
    switchBoard(s, 'standard');
    expect(JSON.stringify([s.loadout.cells, s.loadout.under])).toBe(standard);
    switchBoard(s, 'small');
    expect(JSON.stringify([s.loadout.cells, s.loadout.under])).toBe(small);
    expect(runConfig(s, 'normal', 'grassland', 1).loadout).toBe(s.loadout);
  });

  it('初めて切り替えた盤面は自動で組まれる。持っていない盤面には切り替えられない', () => {
    const s = grown();
    switchBoard(s, 'small');
    expect(boardUids(s.loadout).length).toBeGreaterThan(1);
    expect(s.loadout.originOrder).toHaveLength(1);
    expect(switchBoard(s, 'flame')).toBe(false);
    expect(s.loadout.board).toBe('small');
  });

  it('移行でも盤面の切り替えでも、消耗品の枠はそのまま', () => {
    const s = grown();
    const before = { c: s.loadout.consumables.slice(), a: s.loadout.consumableAuto?.slice() };
    expect(before.c).toHaveLength(1);
    switchBoard(s, 'small');
    expect(s.loadout.consumables).toEqual(before.c);
    expect(s.loadout.consumableAuto).toEqual(before.a);
  });

  it('ほかの盤面で使っている装備は、あふれた分の売却の候補に入らない。売ると、その盤面から外れる', () => {
    const s = grown();
    const onStandard = boardUids(s.loadout).filter((u) => u !== s.loadout.originOrder[0]);
    switchBoard(s, 'small');
    // Take the standard board's gear off the small board, so it is only used there
    for (const u of onStandard) s.loadout = stackTake(s.loadout, itemMap(s), u);
    const uses = otherBoardUse(s);
    for (const u of onStandard) expect(uses.get(u)).toEqual(['standard']);
    // Storage overflows with plenty of junk
    for (let i = 0; i < 60; i++)
      s.inventory.push({
        uid: `j${i}`,
        defId: 'dagger',
        rarity: 'common',
        exits: ['right'],
        rerollCount: 0,
      } as ItemInstance);
    const plan = overflowSellPlan(s);
    expect(plan.uids.length).toBeGreaterThan(0);
    for (const u of onStandard) expect(plan.uids).not.toContain(u);
    // Sold from its details anyway: it leaves the standard board
    sellItems(s, [onStandard[0]!]);
    switchBoard(s, 'standard');
    expect(boardUids(s.loadout)).not.toContain(onStandard[0]);
  });

  it('持っていない盤面が選ばれていたら標準にする', () => {
    const s = createInitialSave();
    s.boards.active = 'flame';
    expect(activeBoardId(s)).toBe('standard');
    const again = deserializeSave(serializeSave(s));
    expect(again.boards.active).toBe('standard');
    expect(again.loadout.board).toBe('standard');
  });
});

describe('挑戦用の配置', () => {
  it('初めて開いたときは、標準の盤面を写して、制限に合わせて作る', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    sword.rarity = 'epic';
    const l = challengeLoadoutOf(s, rare);
    expect(l.board).toBe('standard');
    expect(boardUids(l)).not.toContain(sword.uid);
    expect(l.originOrder).toEqual(s.loadout.originOrder);
    // The usual board is left as it was
    expect(boardUids(s.loadout)).toContain(sword.uid);
  });

  it('挑戦の編集中に閉じても、読み込み時にふだんの盤面へ戻す', () => {
    const s = grown();
    switchBoard(s, 'small');
    const usual = JSON.stringify([s.loadout.cells, s.loadout.under, s.loadout.board]);
    enterChallengeEdit(s, rare);
    expect(s.loadout.board).toBe('standard');
    const cell = s.loadout.cells.findIndex(
      (u, i) => u && i !== s.loadout.cells.indexOf(s.loadout.originOrder[0]!),
    );
    const taken = s.loadout.cells[cell]!;
    s.loadout = stackTake(s.loadout, itemMap(s), taken);
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.editingChallenge).toBe(true);
    setSave(loaded);
    const now = getSave();
    expect(now.editingChallenge).toBeUndefined();
    expect(JSON.stringify([now.loadout.cells, now.loadout.under, now.loadout.board])).toBe(usual);
    expect(boardUids(challengeLoadoutOf(now, rare))).not.toContain(taken);
    expect(now.boards.layouts.small).toBeUndefined();
  });
});

describe('ランの設定（runConfig）', () => {
  it('普通のラン: 選んだ盤面・倒しても続く・熟練・遺物・ゴブリン・アクセサリー', () => {
    const s = createInitialSave();
    const cfg = runConfig(s, 'normal', 'grassland', 5);
    expect(cfg.loadout).toBe(s.loadout);
    expect(cfg.rules).toEqual({ keepCountOnKill: true });
    expect(cfg.mastery).toEqual({ levels: {}, learned: [] });
    expect(cfg.relics).toEqual({});
    expect(cfg.treasure).toBeDefined();
    expect(cfg.charms).toHaveLength(7);
    expect(cfg.charmSure).toBe(true);
    expect(cfg.firstRun).toBe(true);
    expect(cfg.noLoot).toBeFalsy();
  });

  it('∞: ゴブリンなし、アクセサリーは付けるだけ', () => {
    const s = createInitialSave();
    const cfg = runConfig(s, 'endless', 'endless', 5);
    expect(cfg.treasure).toBeUndefined();
    expect(cfg.charmSure).toBeFalsy();
    expect(cfg.charms).toHaveLength(7);
    expect(cfg.relics).toEqual({});
    expect(cfg.mastery).toBeDefined();
  });

  it('挑戦: 挑戦用の配置・最初の強さ・戦利品なし。熟練・アクセサリー・遺物・ゴブリンなし', () => {
    const s = createInitialSave();
    const cfg = runConfig(s, 'challenge', 'cave', 5, rare);
    expect(cfg.loadout.board).toBe('standard');
    expect(cfg.hero).toEqual(BASE_HERO_STATS);
    expect(cfg.noLoot).toBe(true);
    expect(cfg.rules).toEqual({ keepCountOnKill: true });
    for (const k of ['mastery', 'charms', 'relics', 'treasure'] as const)
      expect(cfg[k]).toBeUndefined();
  });
});

describe('新しいセーブ', () => {
  it('起点石1・剣2・斧・木の盾・薬。標準盤面の真ん中の行に 起点 → 剣2つ重ね → 斧 → 木の盾、薬は消耗品の枠', () => {
    const s = createInitialSave();
    expect(s.inventory.map((i) => i.defId)).toEqual([
      'origin_stone',
      'sword',
      'sword',
      'axe',
      'wood_shield',
      'potion',
    ]);
    const def = (u: string | undefined) => s.inventory.find((i) => i.uid === u)?.defId;
    expect(s.loadout.board).toBe('standard');
    expect(stackAt(s.loadout, 4).map(def)).toEqual(['origin_stone']);
    expect(stackAt(s.loadout, 5).map(def)).toEqual(['sword', 'sword']);
    expect(stackAt(s.loadout, 6).map(def)).toEqual(['axe']);
    expect(stackAt(s.loadout, 7).map(def)).toEqual(['wood_shield']);
    expect(s.loadout.consumables.map(def)).toEqual(['potion']);
    expect(s.loadout.consumableAuto).toEqual(['potion']);
    expect(s.boards).toEqual({ active: 'standard', layouts: {}, charms: {} });
    expect(s.charms).toEqual([]);
    expect(s.mastery).toEqual({ points: {}, learned: [] });
  });
});
