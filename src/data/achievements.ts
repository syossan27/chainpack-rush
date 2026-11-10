// 実績: 途中の目標。達成するとすぐゴールドがもらえる（受け取り操作なし）。
// 判定は core/achievements.ts（セーブと、そのランの結果だけを見る）
export type AchievementCheck =
  | { kind: 'runs'; n: number }
  | { kind: 'maxStep'; n: number }
  | { kind: 'maxDamage'; n: number }
  | { kind: 'unlocked'; region: string }
  | { kind: 'techs'; n: number } // n = 0 ならすべて
  | { kind: 'own'; rarity: 'epic' | 'legendary' | 'artifact' }
  | { kind: 'runBosses'; n: number }
  | { kind: 'runLoop'; n: number }
  | { kind: 'runSweeps'; n: number }
  | { kind: 'endlessLoop'; n: number };

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  check: AchievementCheck;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'runs_1',
    name: 'はじめの一歩',
    desc: '自分の装備でランを1回終える',
    reward: 50,
    check: { kind: 'runs', n: 1 },
  },
  {
    id: 'runs_10',
    name: '駆け出し冒険者',
    desc: 'ランを10回終える',
    reward: 150,
    check: { kind: 'runs', n: 10 },
  },
  {
    id: 'runs_50',
    name: '歴戦の勇者',
    desc: 'ランを50回終える',
    reward: 600,
    check: { kind: 'runs', n: 50 },
  },
  {
    id: 'step_6',
    name: 'つながる力',
    desc: '6段の連鎖を決める',
    reward: 80,
    check: { kind: 'maxStep', n: 6 },
  },
  {
    id: 'step_10',
    name: '連鎖使い',
    desc: '10段の連鎖を決める',
    reward: 200,
    check: { kind: 'maxStep', n: 10 },
  },
  {
    id: 'step_14',
    name: '連鎖の達人',
    desc: '14段の連鎖を決める',
    reward: 600,
    check: { kind: 'maxStep', n: 14 },
  },
  {
    id: 'step_18',
    name: '終わらない連鎖',
    desc: '18段の連鎖を決める',
    reward: 1500,
    check: { kind: 'maxStep', n: 18 },
  },
  {
    id: 'dmg_200',
    name: '重い一撃',
    desc: '1回の攻撃で200ダメージ',
    reward: 80,
    check: { kind: 'maxDamage', n: 200 },
  },
  {
    id: 'dmg_1000',
    name: '会心の一撃',
    desc: '1回の攻撃で1,000ダメージ',
    reward: 300,
    check: { kind: 'maxDamage', n: 1000 },
  },
  {
    id: 'dmg_5000',
    name: '山をも砕く',
    desc: '1回の攻撃で5,000ダメージ',
    reward: 1000,
    check: { kind: 'maxDamage', n: 5000 },
  },
  {
    id: 'dmg_20000',
    name: '伝説の一撃',
    desc: '1回の攻撃で20,000ダメージ',
    reward: 2500,
    check: { kind: 'maxDamage', n: 20000 },
  },
  {
    id: 'boss_1',
    name: 'ボス討伐',
    desc: '1回のランでボスを倒す',
    reward: 80,
    check: { kind: 'runBosses', n: 1 },
  },
  {
    id: 'loop_5',
    name: '奥へ奥へ',
    desc: '1回のランで5周目に着く',
    reward: 400,
    check: { kind: 'runLoop', n: 5 },
  },
  {
    id: 'loop_8',
    name: '果てを目指して',
    desc: '1回のランで8周目に着く',
    reward: 1200,
    check: { kind: 'runLoop', n: 8 },
  },
  {
    id: 'sweep_5',
    name: '一網打尽の名人',
    desc: '1回のランで一網打尽を5回',
    reward: 300,
    check: { kind: 'runSweeps', n: 5 },
  },
  {
    id: 'region_cave',
    name: '洞窟へ',
    desc: '洞窟を開放する',
    reward: 300,
    check: { kind: 'unlocked', region: 'cave' },
  },
  {
    id: 'region_rampart',
    name: '城壁へ',
    desc: '城壁を開放する',
    reward: 800,
    check: { kind: 'unlocked', region: 'rampart' },
  },
  {
    id: 'tech_1',
    name: '秘技の目覚め',
    desc: '必殺技を1つ見つける',
    reward: 200,
    check: { kind: 'techs', n: 1 },
  },
  {
    id: 'tech_all',
    name: '奥義皆伝',
    desc: '必殺技をすべて見つける',
    reward: 1500,
    check: { kind: 'techs', n: 0 },
  },
  {
    id: 'own_epic',
    name: '紫の輝き',
    desc: 'エピックの装備を手に入れる',
    reward: 100,
    check: { kind: 'own', rarity: 'epic' },
  },
  {
    id: 'own_legendary',
    name: '金色の伝説',
    desc: 'レジェンダリーの装備を手に入れる',
    reward: 400,
    check: { kind: 'own', rarity: 'legendary' },
  },
  {
    id: 'own_artifact',
    name: '神話の遺物',
    desc: 'アーティファクトを手に入れる',
    reward: 1200,
    check: { kind: 'own', rarity: 'artifact' },
  },
  {
    id: 'demon_lord',
    name: '魔王討伐',
    desc: '魔王城で魔王を倒す（エンドレスが開放）',
    reward: 5000,
    check: { kind: 'unlocked', region: 'endless' },
  },
  {
    id: 'endless_5',
    name: '果てなき道',
    desc: 'エンドレスで5周目に着く',
    reward: 3000,
    check: { kind: 'endlessLoop', n: 5 },
  },
  {
    id: 'endless_10',
    name: '深淵へ',
    desc: 'エンドレスで10周目に着く',
    reward: 8000,
    check: { kind: 'endlessLoop', n: 10 },
  },
  {
    id: 'endless_15',
    name: '伝説の勇者',
    desc: 'エンドレスで15周目に着く',
    reward: 20000,
    check: { kind: 'endlessLoop', n: 15 },
  },
  {
    id: 'endless_20',
    name: '終わりなき者',
    desc: 'エンドレスで20周目に着く',
    reward: 50000,
    check: { kind: 'endlessLoop', n: 20 },
  },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
