// デバッグ用の URL パラメータ（?seed=123、?fps=1）
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export function debugSeed(): number | null {
  const s = params.get('seed');
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n >>> 0 : null;
}

export function debugFps(): boolean {
  return params.get('fps') === '1';
}

/** ?stress=1: エフェクト200個・ダメージ数字50個を常に出し続ける（パフォーマンス計測用） */
export function debugStress(): boolean {
  return params.get('stress') === '1';
}

/** ?speed=2: ゲームスピードを一時的に上書き（設定より優先） */
export function debugSpeed(): number | null {
  const s = params.get('speed');
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
