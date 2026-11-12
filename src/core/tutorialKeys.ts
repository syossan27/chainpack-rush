// Keys of the beginner guides (ui/tutorial.ts). Kept free of Phaser so the save code can use them.

/** 案内の種類（各画面で1回） */
export const TUTORIAL_KEYS = [
  'home',
  'stage',
  'run',
  'demoEnd',
  'result',
  'loadoutGo',
  'loadout',
  'smith',
  // "Try it" guides for the base tabs, shown once each when the player can use them
  'storageGo',
  'storage',
  'smithGo',
  'smithTry',
  'smithHow',
  'upgradeGo',
  'upgrade',
] as const;

export type TutorialKey = (typeof TUTORIAL_KEYS)[number];

/** 最初の出撃の体験ラン（伝説の装備を借りて遊ぶ）。済んだら tutorialSeen に入る。スキップでは飛ばさない */
export const DEMO_KEY = 'demo';

/** Stored by "スキップ": also hides guides added in later versions */
export const SKIP_ALL = 'skipAll';
