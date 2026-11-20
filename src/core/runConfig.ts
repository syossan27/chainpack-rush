// A sortie's settings from the save, with what its kind of run uses (core/runRules.ts). The run
// screen and the bots both start runs from here, so they always play by the same rules. Pure: no
// Phaser.
import { TREASURE } from '../config/balance';
import type { ChallengeRules } from '../data/challenges';
import { activeBoardId } from './boardSave';
import { challengeLoadoutOf } from './challengeLoadout';
import { boardCharmSlots } from './charmSave';
import { BASE_HERO_STATS, type RunConfig } from './combat';
import { consumableSlots, heroStats, itemMap, ownedArtifactIds } from './economy';
import { runMastery } from './mastery';
import { featureRules, runFeatures } from './runRules';
import type { SaveData } from './save';

export function runConfig(
  save: SaveData,
  kind: 'normal' | 'endless' | 'challenge',
  regionId: string,
  seed: number,
  challengeRules?: ChallengeRules,
): RunConfig {
  const f = runFeatures(kind);
  const challenge = kind === 'challenge';
  const rules = featureRules(f);
  const cfg: RunConfig = {
    seed,
    regionId,
    loadout: challenge
      ? challengeLoadoutOf(save, challengeRules ?? { maxRarity: 'legendary' })
      : save.loadout,
    items: itemMap(save),
    hero: challenge ? BASE_HERO_STATS : heroStats(save),
    consumableSlots: consumableSlots(save),
    ownedArtifacts: ownedArtifactIds(save),
    ...(rules ? { rules } : {}),
  };
  if (challenge) cfg.noLoot = true;
  if (kind === 'normal' && save.stats.runs === 0) cfg.firstRun = true;
  if (f.mastery !== 'off') cfg.mastery = runMastery(save);
  if (f.relics) cfg.relics = {};
  if (f.treasure) cfg.treasure = { chance: TREASURE.chance };
  if (f.charms !== 'off') {
    cfg.charms = boardCharmSlots(save, activeBoardId(save));
    // A player with no charms yet surely gets one from the first boss (only where charms drop)
    if (f.charms === 'equipDrop' && save.charms.length === 0) cfg.charmSure = true;
  }
  return cfg;
}
