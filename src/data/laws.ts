// Trial (dive): laws are run-only rules picked after an elite or a boss. They bend the chain for
// the rest of the dive and are not carried home (numbers in config/balance.ts LAW)

export type LawId =
  | 'stack'
  | 'longChain'
  | 'technique'
  | 'mono'
  | 'corners'
  | 'quickFire'
  | 'lifeOnKill'
  | 'winStreak';

export interface LawDef {
  id: LawId;
  name: string;
  description: string;
}

export const LAWS: readonly LawDef[] = [
  { id: 'stack', name: '重ねの極意', description: '重ねの倍率が ×1.5 / ×2 / ×3 になる。' },
  { id: 'longChain', name: '大連鎖', description: '10連鎖目から先の一撃は ダメージ ×2。' },
  { id: 'technique', name: '必殺の冴え', description: '必殺技の一撃が ダメージ ×2.5。' },
  {
    id: 'mono',
    name: '一色',
    description: '攻撃の重ねがすべて同じ属性なら、ダメージ ×1.6。',
  },
  { id: 'corners', name: '四隅', description: '四隅のマスで鳴る装備は ダメージ ×2。' },
  { id: 'quickFire', name: '早撃ち', description: '連鎖のあとの待ちが 40% 短くなる。' },
  { id: 'lifeOnKill', name: '生き血', description: '敵を1体倒すたびに、最大HPの2% 回復。' },
  {
    id: 'winStreak',
    name: '勝ち癖',
    description: 'この潜りで勝った戦闘1つごとに、ダメージ +10%。',
  },
];

export function getLaw(id: LawId): LawDef {
  return LAWS.find((l) => l.id === id)!;
}
