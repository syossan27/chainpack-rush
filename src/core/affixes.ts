// 装備の追加効果（ランダムに付く）。同じ装備でも当たり外れが出るようにする
import type { ItemDef, ItemInstance, ItemKind, Rarity } from './types';
import type { Rng } from './rng';

export type AffixId =
  | 'sharp'
  | 'keen'
  | 'vanguard'
  | 'finisher'
  | 'exploit'
  | 'slayer'
  | 'sturdy'
  | 'mend'
  | 'quick'
  | 'spark';

export interface Affix {
  id: AffixId;
  value: number;
}

export interface AffixDef {
  id: AffixId;
  name: string;
  /** 付く装備の種類 */
  kind: ItemKind;
  /** 値の範囲（両端を含む。整数） */
  min: number;
  max: number;
  /** 説明（{v} に値が入る） */
  text: string;
  /** 防御装備でも、この追加効果は攻撃しない装備（ATK 0）には付かない */
  needsAtk?: boolean;
}

export const AFFIXES: Record<AffixId, AffixDef> = {
  sharp: {
    id: 'sharp',
    name: '鋭い',
    kind: 'attack',
    min: 5,
    max: 20,
    text: '攻撃力 +{v}%',
    needsAtk: true,
  },
  keen: {
    id: 'keen',
    name: '会心',
    kind: 'attack',
    min: 3,
    max: 10,
    text: '会心率 +{v}%',
    needsAtk: true,
  },
  vanguard: {
    id: 'vanguard',
    name: '先駆け',
    kind: 'attack',
    min: 10,
    max: 30,
    text: '3段目までなら ダメージ +{v}%',
    needsAtk: true,
  },
  finisher: {
    id: 'finisher',
    name: '締め',
    kind: 'attack',
    min: 10,
    max: 25,
    text: '6段目以降なら ダメージ +{v}%',
    needsAtk: true,
  },
  exploit: {
    id: 'exploit',
    name: '弱点突き',
    kind: 'attack',
    min: 10,
    max: 30,
    text: '状態がついた敵に ダメージ +{v}%',
    needsAtk: true,
  },
  slayer: {
    id: 'slayer',
    name: 'ボス特効',
    kind: 'attack',
    min: 10,
    max: 30,
    text: 'ボスに ダメージ +{v}%',
    needsAtk: true,
  },
  sturdy: { id: 'sturdy', name: '頑丈', kind: 'defense', min: 10, max: 30, text: '防御値 +{v}%' },
  mend: { id: 'mend', name: '癒し', kind: 'defense', min: 1, max: 4, text: '連鎖が通るとHP +{v}' },
  quick: {
    id: 'quick',
    name: '速攻',
    kind: 'origin',
    min: 5,
    max: 15,
    text: 'この連鎖のあとの待ち -{v}%',
  },
  spark: {
    id: 'spark',
    name: '初撃',
    kind: 'origin',
    min: 20,
    max: 50,
    text: '連鎖の1段目 ダメージ +{v}%',
  },
};

/** レアリティごとの追加効果の数（コモンは低い確率で1つ） */
export const AFFIX_COUNT: Record<Rarity, { base: number; extraChance: number }> = {
  common: { base: 0, extraChance: 0.1 },
  rare: { base: 0, extraChance: 0.6 },
  epic: { base: 1, extraChance: 0.3 },
  legendary: { base: 1, extraChance: 0.7 },
};

export function affixCandidates(def: ItemDef): AffixDef[] {
  return Object.values(AFFIXES).filter(
    (a) => a.kind === def.kind && (!a.needsAtk || (def.atk ?? 0) > 0),
  );
}

export function rollAffixes(rng: Rng, def: ItemDef, rarity: Rarity): Affix[] {
  const pool = affixCandidates(def);
  if (pool.length === 0) return [];
  const c = AFFIX_COUNT[rarity];
  const n = Math.min(pool.length, c.base + (rng.next() < c.extraChance ? 1 : 0));
  return rng.sample(pool, n).map((a) => ({ id: a.id, value: a.min + rng.int(a.max - a.min + 1) }));
}

/** その追加効果の値（付いていなければ 0） */
export function affixValue(it: ItemInstance, id: AffixId): number {
  return it.affixes?.find((a) => a.id === id)?.value ?? 0;
}

export function affixText(a: Affix): string {
  const d = AFFIXES[a.id];
  return `${d.name}: ${d.text.replace('{v}', `${a.value}`)}`;
}

export function isAffix(v: unknown): v is Affix {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && o.id in AFFIXES && typeof o.value === 'number';
}
