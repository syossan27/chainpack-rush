// 結果を SNS に投稿するときの文（純粋な関数）
export interface ShareSummary {
  regionName: string;
  reachedLoop: number;
  maxStep: number;
  maxDamage: number;
  totalDamage: number;
  /** 挑戦のときの名前 */
  challengeName?: string;
  endless?: boolean;
}

export const SHARE_TAG = '#ChainpackRush';

export function shareText(s: ShareSummary): string {
  const n = (v: number) => Math.round(v).toLocaleString('ja-JP');
  const head = s.challengeName
    ? `挑戦「${s.challengeName}」でスコア ${n(s.totalDamage)}！`
    : s.endless
      ? `エンドレスで${s.reachedLoop}周目に到達！`
      : `${s.regionName}で${s.reachedLoop}周目に到達！`;
  return `${head}\n最大連鎖 ${s.maxStep}段・最大ダメージ ${n(s.maxDamage)}\n${SHARE_TAG}`;
}
