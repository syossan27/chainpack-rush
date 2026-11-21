// 地域ごとの雑魚の出方・ボスの候補（仕様書 第4章を、周回ごとに抽選する形へ広げた）
// 群れの中身・数・間隔と、各周回のボスは出撃ごとに抽選する（src/core/layout.ts）。
// 地域選択には「出てくる雑魚」と「周回ごとのボス候補」を見せる。
import type { RegionLoot } from '../core/loot';
import type { Element } from '../core/types';

export interface MobEntry {
  id: string;
  weight: number;
  /** 1つの群れに入れる上限（重い雑魚・後列） */
  maxPerGroup?: number;
}

export interface RegionDef {
  id: string;
  name: string;
  mobTrend: string;
  mobs: MobEntry[];
  /** 1周あたりの群れの数 */
  groupCount: number;
  /** 群れの大きさ（両端を含む。4〜6） */
  groupSize: [number, number];
  /** 周回ごとのボス候補（1周目, 2周目, 3周目…。最後の候補は4周目以降も使う） */
  bossPools: string[][];
  /** 敵の強さの倍率（周回の伸びに掛ける。奥の地域ほど一気に強い） */
  power: { hp: number; atk: number };
  /**
   * 戦利品: レアリティの重み（コモン・レア・エピック・レジェンダリー。0 はこの地域では出ない。ボス・金ぴかの
   * 精鋭・黄金ゴブリンは bossRarity）と、アーティファクトの出やすさの倍率。2026-11-22: 地域ごとに上限を設けた
   * （草原・洞窟はエピックまで、城壁からレジェンダリー。アーティファクトは城壁から、レジェンダリーよりまれ）。値は仮
   */
  loot: RegionLoot;
  /** Background colors (far to near). Without art, the backgrounds are drawn from these; [0] is also the sky above the art */
  bgColors: [number, number, number];
  groundColor: number;
  /** 敵を1体倒すごとのゴールド（ボスは ×PROGRESS.bossGold）。奥の地域ほど多い */
  goldPerKill: number;
  /** 敵の得意・苦手のひとこと（地域選択に出す） */
  resistNote?: string;
  /**
   * Every enemy of this region takes these elements × the value (on top of its own resistances).
   * Kept on the region, since the same enemies also appear in other regions
   */
  resist?: Partial<Record<Element, number>>;
}

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'grassland',
    name: '草原',
    mobTrend: 'スライム、ゴブリン、狼',
    mobs: [
      { id: 'slime', weight: 5 },
      { id: 'goblin', weight: 2 },
      { id: 'wolf', weight: 2 },
    ],
    groupCount: 2,
    groupSize: [4, 5],
    bossPools: [
      ['big_slime', 'slime_mother'],
      ['goblin_king', 'slime_mother'],
      ['iron_knight', 'golem'],
    ],
    power: { hp: 1.6, atk: 1 },
    goldPerKill: 1,
    // No legendary (a few epics), and no artifact
    loot: { rarity: [0.6, 0.34, 0.06, 0], bossRarity: [0, 0.85, 0.15, 0], artifactMult: 0 },
    bgColors: [0xbadbee, 0x6ab070, 0x4a9050],
    groundColor: 0x6b4a2a,
  },
  {
    id: 'cave',
    name: '洞窟',
    mobTrend: 'コウモリ、骸骨、呪術師（群れが多い）',
    resistNote: '闇が効きにくい',
    resist: { dark: 0.7 },
    mobs: [
      { id: 'bat', weight: 6 },
      { id: 'skeleton', weight: 2 },
      { id: 'sorcerer', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 4,
    groupSize: [4, 5],
    bossPools: [
      ['bat_queen', 'big_slime'],
      ['goblin_king', 'lich'],
      ['lich', 'bat_queen', 'golem'],
    ],
    power: { hp: 11, atk: 1.8 },
    goldPerKill: 2,
    // Epic at most (a boss very rarely gives a legendary), and no artifact
    loot: { rarity: [0.5, 0.38, 0.12, 0], bossRarity: [0, 0.7, 0.29, 0.01], artifactMult: 0 },
    bgColors: [0x2d2639, 0x2c2638, 0x3c3448],
    groundColor: 0x3a3040,
  },
  {
    id: 'rampart',
    name: '城壁',
    mobTrend: '甲冑兵、ゴブリン、骸骨（硬い）',
    resistNote: '雷が効きにくい',
    resist: { thunder: 0.7 },
    mobs: [
      { id: 'goblin', weight: 4 },
      { id: 'armor', weight: 1, maxPerGroup: 1 },
      { id: 'wolf', weight: 2 },
      { id: 'skeleton', weight: 2 },
    ],
    groupCount: 2,
    groupSize: [4, 6],
    bossPools: [
      // 1周目は中くらいのボス、強いボス（鉄の騎士・ゴーレム）は2周目から
      ['goblin_king', 'bat_queen'],
      ['iron_knight', 'golem'],
      ['iron_knight', 'golem', 'lich'],
    ],
    power: { hp: 21, atk: 2.7 },
    goldPerKill: 3,
    // Legendaries start here, and artifacts (rarer than legendaries, 2026-11-22)
    loot: { rarity: [0.4, 0.4, 0.18, 0.02], bossRarity: [0, 0.6, 0.34, 0.06], artifactMult: 1.5 },
    bgColors: [0xb2c5d5, 0x7a8090, 0x5a6070],
    groundColor: 0x6a6a70,
  },
  {
    id: 'volcano',
    name: '火山',
    mobTrend: '火トカゲ、溶岩スライム、火の精',
    resistNote: '炎と風が効きにくい・氷と水が弱点',
    resist: { wind: 0.7 },
    mobs: [
      { id: 'fire_lizard', weight: 5 },
      { id: 'magma_slime', weight: 2 },
      { id: 'fire_spirit', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [4, 5],
    bossPools: [
      ['lava_giant', 'bat_queen'],
      ['fire_dragon', 'lava_giant'],
      ['fire_dragon', 'lava_giant', 'golem'],
    ],
    power: { hp: 41, atk: 4.2 },
    goldPerKill: 6,
    loot: {
      rarity: [0.35, 0.45, 0.17, 0.03],
      bossRarity: [0, 0.55, 0.37, 0.08],
      artifactMult: 2.5,
    },
    bgColors: [0x4f2722, 0x6a2a1a, 0x8a3a1a],
    groundColor: 0x2a1a14,
  },
  {
    id: 'glacier',
    name: '氷河',
    mobTrend: '氷の狼、雪だるま、雪男（速い）',
    resistNote: '氷と光が効きにくい・炎が弱点',
    resist: { light: 0.7 },
    mobs: [
      { id: 'ice_wolf', weight: 5 },
      { id: 'snowman', weight: 3 },
      { id: 'yeti', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [4, 6],
    bossPools: [
      ['ice_queen', 'lich'],
      ['mammoth', 'ice_queen'],
      ['mammoth', 'ice_queen', 'fire_dragon'],
    ],
    power: { hp: 50, atk: 5.5 },
    goldPerKill: 10,
    loot: { rarity: [0.28, 0.45, 0.22, 0.05], bossRarity: [0, 0.5, 0.4, 0.1], artifactMult: 3.5 },
    bgColors: [0xcde5f3, 0xa0c8e0, 0x80a8c8],
    groundColor: 0xd8e4f0,
  },
  {
    id: 'demon_castle',
    name: '魔王城',
    mobTrend: '小悪魔、ガーゴイル、闇の魔導士',
    resistNote: '物理と炎が効きにくい・雷が弱点（ガーゴイルは打撃が弱点）',
    mobs: [
      { id: 'imp', weight: 5 },
      { id: 'gargoyle', weight: 2, maxPerGroup: 2 },
      { id: 'dark_mage', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [5, 6],
    bossPools: [['dark_knight', 'ice_queen'], ['dark_knight', 'mammoth'], ['demon_lord']],
    power: { hp: 60, atk: 7.5 },
    goldPerKill: 15,
    loot: { rarity: [0.2, 0.45, 0.27, 0.08], bossRarity: [0, 0.45, 0.42, 0.13], artifactMult: 4.5 },
    bgColors: [0x25162f, 0x2a1830, 0x3a2040],
    groundColor: 0x2a2030,
  },
];

/**
 * エンドレス: 魔王城の強さから始まり、周回の上限なし（周回の伸びは他の地域と同じ指数）。
 * 雑魚もボスも全地域から出る。装備とゴールドは落とさない（スコアを競う場）
 */
export const ENDLESS: RegionDef = {
  id: 'endless',
  name: 'エンドレス',
  mobTrend: '全地域の雑魚',
  resistNote: '周回ごとにいろいろな敵。装備とゴールドは出ない',
  mobs: [
    { id: 'imp', weight: 3 },
    { id: 'ice_wolf', weight: 3 },
    { id: 'fire_lizard', weight: 3 },
    { id: 'skeleton', weight: 2 },
    { id: 'gargoyle', weight: 1, maxPerGroup: 1 },
    { id: 'yeti', weight: 1, maxPerGroup: 1 },
    { id: 'magma_slime', weight: 1, maxPerGroup: 1 },
    { id: 'dark_mage', weight: 1, maxPerGroup: 1 },
  ],
  groupCount: 3,
  groupSize: [5, 6],
  bossPools: [
    [
      'fire_dragon',
      'lava_giant',
      'ice_queen',
      'mammoth',
      'dark_knight',
      'demon_lord',
      'golem',
      'iron_knight',
      'lich',
    ],
  ],
  power: { hp: 60, atk: 7.5 },
  goldPerKill: 0,
  loot: { rarity: [0.2, 0.45, 0.27, 0.08], bossRarity: [0, 0.45, 0.42, 0.13], artifactMult: 0 },
  bgColors: [0x140e24, 0x1a1030, 0x2a1848],
  groundColor: 0x1a1428,
};

export function getRegion(id: string): RegionDef {
  if (id === ENDLESS.id) return ENDLESS;
  const r = REGIONS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown region: ${id}`);
  return r;
}

/** その周回のボス候補 */
export function bossPoolForLoop(region: RegionDef, loop: number): string[] {
  const pools = region.bossPools;
  return pools[Math.min(loop, pools.length) - 1]!;
}

/** 地域に出てくるボス（重複なし、出てくる順） */
export function regionBosses(region: RegionDef): string[] {
  return [...new Set(region.bossPools.flat())];
}
