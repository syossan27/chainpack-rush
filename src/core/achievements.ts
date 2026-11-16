// 実績の判定と報酬（ゴールドをすぐ渡す）。純粋な関数（Phaser なし）
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { getItemDef } from '../data/items';
import { TECHNIQUES } from '../data/techniques';
import type { RunResult } from './combat';
import type { SaveData } from './save';

function met(a: AchievementDef, save: SaveData, run: RunResult | null): boolean {
  const c = a.check;
  switch (c.kind) {
    case 'runs':
      return save.stats.runs >= c.n;
    case 'maxStep':
      return save.stats.maxStep >= c.n;
    case 'maxDamage':
      return save.stats.maxDamage >= c.n;
    case 'unlocked':
      // エンドレスは地域の開放ではなく、魔王城の★1（魔王の撃破）で開く
      return c.region === 'endless'
        ? (save.progress.best.demon_castle ?? 0) > 3
        : save.progress.unlocked.includes(c.region);
    case 'techs':
      return save.discoveredTechs.length >= (c.n === 0 ? TECHNIQUES.length : c.n);
    case 'own':
      return save.inventory.some((i) =>
        c.rarity === 'artifact'
          ? !!getItemDef(i.defId).artifact
          : i.rarity === c.rarity && !getItemDef(i.defId).artifact,
      );
    case 'runBosses':
      return !!run && run.stats.bossesDefeated >= c.n;
    case 'runLoop':
      return !!run && run.reachedLoop >= c.n;
    case 'runSweeps':
      return !!run && run.stats.sweeps >= c.n;
    case 'endlessLoop':
      return save.endless.bestLoop >= c.n;
  }
}

/** 新しく達成した実績を記録して、報酬のゴールドを渡す。達成したものを返す */
export function checkAchievements(save: SaveData, run: RunResult | null = null): AchievementDef[] {
  const got: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id) || !met(a, save, run)) continue;
    save.achievements.push(a.id);
    save.gold += a.reward;
    got.push(a);
  }
  return got;
}
