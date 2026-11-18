// Trial rules switched on from the home screen while the debug setting is on, to compare how a
// run feels before a rule change is decided. Pure: no Phaser.
import type { ChainRules } from '../config/balance';
import { backpackSize, consumableSlots } from './economy';
import { restoreLoadout, storeActivePreset } from './presets';
import type { SaveData } from './save';
import { emptyLoadout } from './save';
import { restoreStackBoard } from './stack';
import type { Loadout } from './types';

interface RunKind {
  challenge: boolean;
  demo: boolean;
  regionId: string;
}

/** Only ordinary runs: a challenge or endless run is ranked, and the demo is scripted */
const ordinary = (run: RunKind) => !run.challenge && !run.demo && run.regionId !== 'endless';

/** The stacked board switch is on (and works in this build) */
export function stackSwitchOn(save: SaveData, allowed: boolean): boolean {
  return allowed && save.settings.debug && save.settings.trialStack;
}

/** The mastery switch is on (and works in this build) */
export function masterySwitchOn(save: SaveData, allowed: boolean): boolean {
  return allowed && save.settings.debug && save.settings.trialMastery;
}

/** This run grows mastery and needs techniques to spark (trial) */
export function usesMastery(save: SaveData, allowed: boolean, run: RunKind): boolean {
  return masterySwitchOn(save, allowed) && ordinary(run);
}

/** This run uses the stacked board (trial) */
export function usesStackBoard(save: SaveData, allowed: boolean, run: RunKind): boolean {
  return stackSwitchOn(save, allowed) && ordinary(run);
}

/** The chain rules to try in this run, or undefined for the real ones */
export function trialRules(
  save: SaveData,
  allowed: boolean,
  run: RunKind,
): Partial<ChainRules> | undefined {
  if (!allowed || !save.settings.debug || !ordinary(run)) return undefined;
  // The stacked board comes with the count going on across kills
  if (!save.settings.trialKeepCount && !save.settings.trialStack) return undefined;
  return { keepCountOnKill: true };
}

/** The stacked board as it stands (the one being edited, or the stored one checked against storage) */
export function stackBoardOf(save: SaveData): Loadout {
  if (save.editingTrial) return save.loadout;
  return restoreStackBoard(
    save.trialLoadout ?? null,
    new Map(save.inventory.map((i) => [i.uid, i])),
    consumableSlots(save),
  );
}

/** The board an ordinary run to this region will use (for the check before a sortie) */
export function sortieBoard(save: SaveData, allowed: boolean, regionId: string): Loadout {
  return usesStackBoard(save, allowed, { challenge: false, demo: false, regionId })
    ? stackBoardOf(save)
    : save.loadout;
}

/** The loadout screen edits the stacked board: it sits in loadout until editing ends */
export function enterTrialEdit(save: SaveData): void {
  if (save.editingTrial) return;
  storeActivePreset(save);
  save.loadout = stackBoardOf(save);
  save.editingTrial = true;
}

/** Editing ends: keep the stacked board and put the ordinary loadout back (also on boot) */
export function leaveTrialEdit(save: SaveData): void {
  if (!save.editingTrial) return;
  save.trialLoadout = JSON.parse(JSON.stringify(save.loadout)) as Loadout;
  delete save.editingTrial;
  // The ordinary loadout comes back at the size of the bag (not the stacked board's)
  const { width, height } = backpackSize(save.upgrades.backpack);
  save.loadout = emptyLoadout(width, height);
  save.loadout = restoreLoadout(save, save.presets[save.activePreset]?.loadout ?? null);
}
