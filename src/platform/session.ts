// シーン間で受け渡す一時的な状態（保存しない）
import type { RunResult } from '../core/combat';

/** 挑戦で出撃するとき（地域・乱数の種は全員同じ） */
export interface ChallengeSortie {
  period: number;
  seed: number;
  regionId: string;
  name: string;
}

export const session: {
  regionId: string | null;
  lastResult: {
    regionId: string;
    result: RunResult;
    seed: number;
    demo?: boolean;
    challenge?: ChallengeSortie;
  } | null;
  /** 次の出撃を挑戦にする（出撃したら空に戻す） */
  challenge: ChallengeSortie | null;
} = {
  regionId: null,
  lastResult: null,
  challenge: null,
};
