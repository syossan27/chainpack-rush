// シーン間で受け渡す一時的な状態（保存しない）
import type { RunResult } from '../core/combat';
import type { ScoreSubmission } from '../core/ranking';

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
    /** ランキングに送れる記録（挑戦・エンドレス） */
    submission?: ScoreSubmission;
  } | null;
  /** 次の出撃を挑戦にする（出撃したら空に戻す） */
  challenge: ChallengeSortie | null;
} = {
  regionId: null,
  lastResult: null,
  challenge: null,
};
