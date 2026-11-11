// 結果を SNS に投稿するときの文（純粋な関数）
import { num, t } from '../i18n';

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

/** The post text in the current language (names are Japanese keys; translating twice is harmless) */
export function shareText(s: ShareSummary): string {
  const head = s.challengeName
    ? t('挑戦「{name}」でスコア {score}！', { name: t(s.challengeName), score: num(s.totalDamage) })
    : s.endless
      ? t('エンドレスで{loop}周目に到達！', { loop: s.reachedLoop })
      : t('{region}で{loop}周目に到達！', { region: t(s.regionName), loop: s.reachedLoop });
  const stats = t('最大連鎖 {step}段・最大ダメージ {damage}', {
    step: s.maxStep,
    damage: num(s.maxDamage),
  });
  return `${head}\n${stats}\n${SHARE_TAG}`;
}
