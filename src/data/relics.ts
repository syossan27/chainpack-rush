// Trial (relics): what a relic stuck on a cell does to the gear in that cell, for one run only.
// The values are in RELIC (config/balance.ts); {v} in a text is filled with the relic's value.

export type RelicId =
  'bell' | 'sweep' | 'pierce' | 'fist' | 'eye' | 'feather' | 'fang' | 'claw' | 'whistle' | 'ward';

export interface RelicDef {
  id: RelicId;
  name: string;
  /** One character for the badge on the cell and the card (until there is art) */
  mark: string;
  /** Which cells take it: attack gear only, or any gear */
  target: 'attack' | 'any';
  text: string;
}

export const RELICS: readonly RelicDef[] = [
  { id: 'bell', name: '二度鳴りの鈴', mark: '鈴', target: 'attack', text: '2回攻撃する' },
  {
    id: 'sweep',
    name: '薙ぎ払いの紋',
    mark: '薙',
    target: 'attack',
    text: '交戦中の敵全員に当たる',
  },
  {
    id: 'pierce',
    name: '貫きの矢じり',
    mark: '貫',
    target: 'attack',
    text: '後ろの敵{v}体まで貫く',
  },
  { id: 'fist', name: '巨人の拳', mark: '拳', target: 'attack', text: 'ダメージ ×{v}' },
  { id: 'eye', name: '会心の眼', mark: '眼', target: 'attack', text: '会心率 +{v}%' },
  {
    id: 'feather',
    name: '加速の羽',
    mark: '羽',
    target: 'attack',
    text: 'このあとに続く装備の段数 +{v}',
  },
  {
    id: 'fang',
    name: '吸血の牙',
    mark: '牙',
    target: 'attack',
    text: '与えたダメージの{v}%を回復',
  },
  {
    id: 'claw',
    name: '金の爪',
    mark: '爪',
    target: 'attack',
    text: 'この装備で倒した敵は必ず装備を落とす',
  },
  {
    id: 'whistle',
    name: '呼び戻しの笛',
    mark: '笛',
    target: 'any',
    text: 'ここまで届いた連鎖のあと、次の連鎖までの待ちが半分',
  },
  { id: 'ward', name: '守りの札', mark: '札', target: 'any', text: 'ここが鳴るたびに防御 +{v}' },
];

export function getRelic(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}
