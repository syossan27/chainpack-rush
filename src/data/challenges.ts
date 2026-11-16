// 2週替わりの挑戦: 全員が同じ地域・同じ乱数の種・同じ制限で、自分の装備を並べて合計ダメージを競う。
// 強化と★は使わない（勇者は初期の強さ）。装備とゴールドは出ない。
import type { Element, ItemKind, Rarity } from '../core/types';

export interface ChallengeRules {
  /** 置ける装備のレアリティの上限（アーティファクトは置けない） */
  maxRarity: Rarity;
  /** 起点の数の上限 */
  maxOrigins?: number;
  /** 置ける攻撃装備の属性（省略時はすべて） */
  elements?: Element[];
  /** 置けない種類 */
  bannedKinds?: ItemKind[];
}

export interface ChallengeDef {
  id: string;
  name: string;
  /** ひとこと説明 */
  text: string;
  regionId: string;
  rules: ChallengeRules;
}

/** 2週間ごとに、この順に入れ替わる */
export const CHALLENGES: readonly ChallengeDef[] = [
  {
    id: 'rare_rush',
    name: 'レアの意地',
    text: 'レア以下の装備だけで、洞窟でどこまで削れるか',
    regionId: 'cave',
    rules: { maxRarity: 'rare' },
  },
  {
    id: 'one_origin',
    name: 'ひとすじの連鎖',
    text: '起点はひとつだけ。長い一本の連鎖で城壁に挑む',
    regionId: 'rampart',
    rules: { maxRarity: 'epic', maxOrigins: 1 },
  },
  {
    id: 'elements',
    name: '属性の試練',
    text: '炎・雷・氷・水・油の装備だけ。コンボで火山を焼き尽くせ',
    regionId: 'volcano',
    rules: { maxRarity: 'epic', elements: ['fire', 'thunder', 'ice', 'water', 'oil'] },
  },
  {
    id: 'no_guard',
    name: '守りなし',
    text: '防具は置けない。やられる前に倒しきれ',
    regionId: 'glacier',
    rules: { maxRarity: 'epic', bannedKinds: ['defense'] },
  },
];

/** 挑戦の期間（日） */
export const CHALLENGE_DAYS = 14;
