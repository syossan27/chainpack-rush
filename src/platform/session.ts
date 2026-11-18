// シーン間で受け渡す一時的な状態（保存しない）
import type { RunResult } from '../core/combat';
import type { DiveState } from '../core/dive';
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
    /** Played under a trial rule: the records are not updated */
    trial?: boolean;
    /** Trial (dive): how deep it went, and the gear lost by falling */
    dive?: { floor: number; lost: number };
  } | null;
  /** 次の出撃を挑戦にする（出撃したら空に戻す） */
  challenge: ChallengeSortie | null;
  /** Prototype (roguelite): the next sortie grows its line during the run (cleared when it starts) */
  proto: boolean;
  /** Trial (dive): the dive under way between its fights (a new sortie clears it) */
  dive: DiveState | null;
  /** Trial (dive): the loadout screen was opened from a camp (it leads back to the dive) */
  diveCamp: boolean;
} = {
  regionId: null,
  lastResult: null,
  challenge: null,
  proto: false,
  dive: null,
  diveCamp: false,
};
