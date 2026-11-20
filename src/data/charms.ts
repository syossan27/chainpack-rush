// Trial (charms): accessories worn on the stacked board's edge. A column slot watches its column, a
// row slot its row; when its event happens there, the chain's combo multiplier goes up (+ adds,
// × multiplies) for every later hit of that chain. Values are per rarity, provisional ({v} in a
// text is filled with the value). The rules are in core/charms.ts
import type { Rarity } from '../core/types';

export type CharmId =
  'match_ring' | 'combo_necklace' | 'tech_bangle' | 'crit_earring' | 'finish_pin' | 'stack_charm';

/**
 * What a charm watches in its line:
 * cell: an attack cell has rung (once per cell; a stack at its top) / combo: a status combo or
 * 毒爆 (once per attack; a weaker combo adds less, see comboWeight in core/charms.ts) /
 * tech: a technique fires / crit: an attack crits (once per attack) / kill: an enemy falls (each) /
 * stackTop: the top of a full stack rings
 */
export type CharmTrigger = 'cell' | 'combo' | 'tech' | 'crit' | 'kill' | 'stackTop';

export interface CharmDef {
  id: CharmId;
  name: string;
  /** One character for the slot badge (until there is art) */
  mark: string;
  op: '+' | '×';
  trigger: CharmTrigger;
  values: Record<Rarity, number>;
  text: string;
}

export const CHARMS: readonly CharmDef[] = [
  {
    id: 'match_ring',
    name: 'そろいの指輪',
    mark: '揃',
    op: '+',
    trigger: 'cell',
    values: { common: 0.08, rare: 0.12, epic: 0.15, legendary: 0.2 },
    text: '付けた行・列の攻撃装備が全部同じ属性なら、マスが撃つたびにコンボ +{v}',
  },
  {
    id: 'combo_necklace',
    name: '連鎖の首飾り',
    mark: '鎖',
    op: '×',
    trigger: 'combo',
    values: { common: 1.2, rare: 1.25, epic: 1.35, legendary: 1.45 },
    text: '付けた行・列で状態コンボが起きるたびにコンボ ×{v}（弱いコンボは小さめ）',
  },
  {
    id: 'tech_bangle',
    name: '技の腕輪',
    mark: '技',
    op: '+',
    trigger: 'tech',
    values: { common: 0.6, rare: 0.8, epic: 1, legendary: 1.3 },
    text: '付けた行・列で必殺技が出るたびにコンボ +{v}',
  },
  {
    id: 'crit_earring',
    name: '会心のピアス',
    mark: '心',
    op: '+',
    trigger: 'crit',
    values: { common: 0.2, rare: 0.3, epic: 0.4, legendary: 0.5 },
    text: '付けた行・列の攻撃が会心になるたびにコンボ +{v}',
  },
  {
    id: 'finish_pin',
    name: 'とどめの髪飾り',
    mark: '止',
    op: '×',
    trigger: 'kill',
    values: { common: 1.06, rare: 1.1, epic: 1.15, legendary: 1.2 },
    text: '付けた行・列の攻撃で敵を倒すたびにコンボ ×{v}',
  },
  {
    id: 'stack_charm',
    name: '重ねの護符',
    mark: '重',
    op: '+',
    trigger: 'stackTop',
    values: { common: 0.05, rare: 0.08, epic: 0.1, legendary: 0.12 },
    text: '付けた行・列のそろった重ねが撃つたびにコンボ +{v}',
  },
];

export function getCharm(id: string): CharmDef | undefined {
  return CHARMS.find((c) => c.id === id);
}

export function isCharmId(v: unknown): v is CharmId {
  return typeof v === 'string' && CHARMS.some((c) => c.id === v);
}
