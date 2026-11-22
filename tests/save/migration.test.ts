import { describe, expect, it } from 'vitest';
import { deserializeSave, serializeSave, SAVE_VERSION } from '../../src/core/save';
import { sortieBlock } from '../../src/core/economy';
import { boardUids, emptyStackBoard, stackPut } from '../../src/core/stack';
import { BACKPACK_REFUND } from '../../src/core/migrate';
import type { ItemInstance, Loadout } from '../../src/core/types';

const inv = (): ItemInstance[] => [
  { uid: 'i1', defId: 'origin_stone', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i2', defId: 'origin_stone', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i3', defId: 'sword', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i4', defId: 'sword', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i5', defId: 'axe', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i6', defId: 'wood_shield', rarity: 'common', exits: ['right'], rerollCount: 0 },
  { uid: 'i7', defId: 'potion', rarity: 'common', exits: [], rerollCount: 0 },
];

/** The bag of a version 1 save: two origin stones on a 5×4 bag, a potion in the slots */
const bag = (): Loadout => ({
  width: 5,
  height: 4,
  cells: ['i1', 'i3', 'i5', null, null, 'i2', 'i4', 'i6', null, null, ...new Array(10).fill(null)],
  originOrder: ['i1', 'i2'],
  consumables: ['i7'],
  consumableAuto: ['potion'],
});

/** A stacked board of the given kind with these items put on cells in order */
function board(id: 'standard' | 'small', list: [string, number][]): Loadout {
  const items = new Map(inv().map((i) => [i.uid, i]));
  let l = emptyStackBoard(id);
  for (const [uid, cell] of list) l = stackPut(l, items, uid, cell).loadout;
  return { ...l, consumables: ['i7'] };
}

/** A version 1 save as stored (JSON), with fields replaced by `over` */
function v1(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    gold: 100,
    nextUid: 8,
    inventory: inv(),
    loadout: bag(),
    upgrades: {
      maxHp: 2,
      atb: 1,
      attack: 3,
      runTime: 0,
      backpack: 0,
      consumableSlots: 0,
      storage: 1,
    },
    progress: { unlocked: ['grassland', 'cave'], best: { grassland: 4 } },
    stats: { runs: 12, maxStep: 9, maxDamage: 800 },
    presets: [{ name: '', loadout: bag() }, ...new Array(4).fill({ name: '', loadout: null })],
    activePreset: 0,
    discoveredTechs: ['triple'],
    premium: false,
    tutorialSeen: ['home', 'loadout', 'merge'],
    achievements: ['runs_1'],
    endless: { bestLoop: 3, bestDamage: 900 },
    challenge: { period: -1, best: 0, bestLoop: 0 },
    challengeLoadout: bag(),
    rankSent: {},
    titles: ['t1'],
    rankName: null,
    cosmetics: [],
    newCosmetics: [],
    adLog: { date: '', counts: {} },
    settings: {
      volume: 0.5,
      haptics: true,
      shake: true,
      gameSpeed: 1,
      showRoutes: true,
      autoSell: 'off',
      autoSellKeepAffix: true,
      lang: 'auto',
      debug: true,
      trialKeepCount: true,
      trialStack: true,
      trialMastery: false,
      trialRelic: false,
      trialTreasure: false,
      trialCharm: false,
      itemSort: 'rarity',
    },
    ...over,
  });
}

describe('セーブの移行（版1 → 版2）', () => {
  it('バッグだけの人: 標準の重ねる盤面が自動で作られ、装備は全部倉庫に残る', () => {
    const s = deserializeSave(v1());
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(4);
    expect(s.boards.active).toBe('standard');
    expect(s.loadout.board).toBe('standard');
    expect(s.inventory.map((i) => i.uid).sort()).toEqual(
      inv()
        .map((i) => i.uid)
        .sort(),
    );
    expect(s.loadout.originOrder).toHaveLength(1);
    expect(boardUids(s.loadout)).toEqual(expect.arrayContaining(['i3', 'i4', 'i5', 'i6']));
  });

  it('なくした起点石は、移行のあとで新しい石に置きかわる（吸血 → 一番槍）', () => {
    const s = deserializeSave(
      v1({ inventory: inv().map((i) => (i.uid === 'i2' ? { ...i, defId: 'origin_vamp' } : i)) }),
    );
    expect(s.inventory.find((i) => i.uid === 'i2')?.defId).toBe('origin_lead');
  });

  it('バックパック拡張の返金: Lv0 → 0、Lv1 → 300、Lv3 → 2100', () => {
    expect(BACKPACK_REFUND).toEqual([0, 300, 900, 2100]);
    const at = (backpack: number) =>
      deserializeSave(
        v1({
          upgrades: {
            maxHp: 0,
            atb: 0,
            attack: 0,
            runTime: 0,
            backpack,
            consumableSlots: 0,
            storage: 0,
          },
        }),
      );
    expect(at(0).gold).toBe(100);
    expect(at(1).gold).toBe(400);
    expect(at(3).gold).toBe(2200);
  });

  it('バックパック拡張の項目は消える', () => {
    const s = deserializeSave(
      v1({
        upgrades: {
          maxHp: 0,
          atb: 0,
          attack: 0,
          runTime: 0,
          backpack: 3,
          consumableSlots: 0,
          storage: 0,
        },
      }),
    );
    expect('backpack' in s.upgrades).toBe(false);
  });

  it('試作の盤面を使っていた人は、その盤面と配置とアクセサリーが残る', () => {
    const small = board('small', [
      ['i1', 0],
      ['i3', 1],
      ['i4', 1],
    ]);
    const standard = board('standard', [
      ['i1', 4],
      ['i5', 5],
    ]);
    const s = deserializeSave(
      v1({
        progress: { unlocked: ['grassland', 'cave', 'rampart'], best: {} },
        trialBoards: {
          active: 'small',
          layouts: { small, standard },
          charms: { small: ['c1', null, null, null, null] },
        },
        charms: [{ uid: 'c1', defId: 'combo_necklace', rarity: 'rare' }],
      }),
    );
    expect(s.boards.active).toBe('small');
    expect(s.loadout.board).toBe('small');
    expect(s.loadout.cells).toEqual(small.cells);
    expect(s.loadout.under).toEqual(small.under);
    expect(s.boards.layouts.small).toBeUndefined();
    expect(s.boards.layouts.standard!.cells).toEqual(standard.cells);
    expect(s.boards.charms.small![0]).toBe('c1');
    expect(s.charms).toHaveLength(1);
  });

  it('試作の盤面を試してバッグに戻っていた人は、バッグの薬の枠と自動補充を引き継ぐ（盤面の配置は残る）', () => {
    // The board was tried once (its slots never set up), then the switch went off: sorties used the bag
    const tried = {
      ...board('standard', [
        ['i1', 4],
        ['i3', 5],
      ]),
      consumables: [],
    };
    const settings = (JSON.parse(v1()) as { settings: Record<string, unknown> }).settings;
    const s = deserializeSave(
      v1({
        trialBoards: { active: 'standard', layouts: { standard: tried } },
        settings: { ...settings, trialStack: false },
      }),
    );
    expect(s.loadout.cells).toEqual(tried.cells);
    expect(s.loadout.consumables).toEqual(['i7']);
    expect(s.loadout.consumableAuto).toEqual(['potion']);
  });

  it('選んでいた盤面の配置がなければ、その盤面を自動で作る', () => {
    const s = deserializeSave(v1({ trialBoards: { active: 'standard', layouts: {} } }));
    expect(s.loadout.board).toBe('standard');
    expect(boardUids(s.loadout).length).toBeGreaterThan(1);
  });

  it('重ねる盤面の編集中に閉じた人: 編集中だった配置が、その盤面の配置になる', () => {
    const edited = board('standard', [
      ['i2', 0],
      ['i4', 1],
      ['i3', 1],
    ]);
    const older = board('standard', [['i1', 8]]);
    const s = deserializeSave(
      v1({
        editingTrial: true,
        loadout: edited,
        trialBoards: { active: 'standard', layouts: { standard: older } },
      }),
    );
    expect(s.loadout.cells).toEqual(edited.cells);
    expect(s.loadout.under).toEqual(edited.under);
    expect('editingTrial' in s).toBe(false);
  });

  it('技: 図鑑の技と覚えた技を合わせる（重複なし、知らない技は捨てる）', () => {
    const s = deserializeSave(
      v1({
        discoveredTechs: ['triple', 'nope', 'crimson'],
        mastery: { points: {}, learned: ['triple', 'frost'] },
      }),
    );
    expect([...s.mastery.learned].sort()).toEqual(['crimson', 'frost', 'triple']);
    expect('discoveredTechs' in s).toBe(false);
  });

  it('記録・実績・★・開放・見た目・称号・設定（試作スイッチ以外）が残る', () => {
    const s = deserializeSave(v1());
    expect(s.stats).toEqual({ runs: 12, maxStep: 9, maxDamage: 800 });
    expect(s.achievements).toEqual(['runs_1']);
    expect(s.progress).toEqual({ unlocked: ['grassland', 'cave'], best: { grassland: 4 } });
    expect(s.endless).toEqual({ bestLoop: 3, bestDamage: 900 });
    expect(s.titles).toEqual(['t1']);
    expect(s.settings.volume).toBe(0.5);
    expect(s.settings.debug).toBe(true);
    expect(Object.keys(s.settings).some((k) => k.startsWith('trial'))).toBe(false);
    expect('presets' in s).toBe(false);
    expect('activePreset' in s).toBe(false);
  });

  it('永続強化: 最大HP・攻撃間隔・攻撃倍率の段は2倍（版4で1段を半分に分けた）、ほかの強化はそのまま', () => {
    const s = deserializeSave(v1());
    expect(s.upgrades).toMatchObject({ maxHp: 4, atb: 2, attack: 6, storage: 1 });
  });

  it('挑戦用の配置は捨て、案内の merge と loadout は外す', () => {
    const s = deserializeSave(
      v1({ editingChallenge: true, presets: [{ name: '', loadout: bag() }] }),
    );
    expect(s.challengeLoadout).toBeNull();
    expect(s.editingChallenge).toBeUndefined();
    expect(s.tutorialSeen).toEqual(['home']);
    expect(s.loadout.board).toBe('standard');
  });

  it('board と under は、版2で書いて読み直しても落ちない', () => {
    const small = board('small', [
      ['i1', 0],
      ['i3', 1],
      ['i4', 1],
    ]);
    const s = deserializeSave(
      v1({
        progress: { unlocked: ['grassland', 'cave', 'rampart'], best: {} },
        trialBoards: { active: 'small', layouts: { small } },
      }),
    );
    const again = deserializeSave(serializeSave(s));
    expect(again.loadout.board).toBe('small');
    expect(again.loadout.under).toEqual(small.under);
    expect(again.boards.active).toBe('small');
  });

  it('消耗品の枠と自動補充は、移行しても残る', () => {
    const s = deserializeSave(v1());
    expect(s.loadout.consumables).toEqual(['i7']);
    expect(s.loadout.consumableAuto).toEqual(['potion']);
  });

  it('起点を持っていない人は、空の盤面で読み込まれ、出撃は noOrigin で止まる', () => {
    const noOrigin = inv().filter((i) => i.defId !== 'origin_stone');
    const s = deserializeSave(
      v1({
        inventory: noOrigin,
        loadout: {
          ...bag(),
          cells: bag().cells.map((c) => (c === 'i1' || c === 'i2' ? null : c)),
          originOrder: [],
        },
      }),
    );
    expect(s.loadout.board).toBe('standard');
    expect(boardUids(s.loadout)).toEqual([]);
    expect(sortieBlock(s)).toBe('noOrigin');
  });

  it('持っていない盤面が選ばれていたら標準にする', () => {
    const s = deserializeSave(v1({ trialBoards: { active: 'flame', layouts: {} } }));
    expect(s.boards.active).toBe('standard');
    expect(s.loadout.board).toBe('standard');
  });
});
