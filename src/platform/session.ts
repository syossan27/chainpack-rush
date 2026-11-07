// シーン間で受け渡す一時的な状態（保存しない）
import type { RunResult } from '../core/combat';

export const session: {
  regionId: string | null;
  lastResult: { regionId: string; result: RunResult; seed: number } | null;
} = {
  regionId: null,
  lastResult: null,
};
