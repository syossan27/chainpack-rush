// スプライトの定義。仮素材（コードで描くドット絵）と本素材（assets/sprites の PNG）をここで切り替える。
// 本素材がないものは仮素材で動き続ける。本素材は横一列の PNG（1コマは同じサイズ）。

/** assets/palette.hex と同じ色（31色＋透明） */
export const PALETTE: Record<string, number> = {
  K: 0x1a1424, // 輪郭
  W: 0xf4f0e8,
  g: 0xb8b8c8,
  G: 0x7a7a8c,
  D: 0x4a4a58,
  b: 0x8a5a32,
  B: 0x5a3a20,
  y: 0xf8d040,
  o: 0xf08830,
  r: 0xd83c3c,
  R: 0x8a2030,
  p: 0xf0a0b0,
  s: 0xf0c090,
  l: 0x80c8f8,
  u: 0x3c70d8,
  U: 0x283c80,
  c: 0x40e0e0,
  e: 0x88e068,
  E: 0x48a848,
  F: 0x2c6c34,
  v: 0xb070e0,
  V: 0x6c3c9c,
  n: 0xd8b880,
  t: 0x2c8c8c,
  k: 0x000000,
  m: 0xd040a0,
  w: 0x5aa0e8,
  i: 0xc8f0ff,
  h: 0xa8b4c8,
  H: 0x687890,
  O: 0x302820,
};

export interface SpriteAnim {
  /** 本素材の PNG（assets/sprites からの相対パス）。横一列、1コマ = frameWidth×frameHeight */
  file: string;
  frames: number;
  fps: number;
  loop: boolean;
}

export type UnitAnimName = 'idle' | 'run' | 'attack' | 'hit' | 'move' | 'death';

export interface SpriteDef {
  key: string;
  /** 本素材のコマ寸法（勇者64×64、雑魚48×48、ボス96×96） */
  frameWidth: number;
  frameHeight: number;
  /** 表示倍率（キャラクター×2、補間なし） */
  displayScale: number;
  /** 足元の原点（0〜1、コマに対する割合）。判定は足元基準点で行い、剣・マントの描画域は判定に使わない */
  originX: number;
  originY: number;
  /** 本素材のアニメーション。未指定の動作は仮素材（または idle）で代用する */
  anims?: Partial<Record<UnitAnimName, SpriteAnim>>;
  /** 仮素材: 1文字=1ドット（PALETTE のキー、'.' は透明）。pixelSize 倍でコマ寸法になるように描く */
  pixels: readonly string[];
  pixelSize: number;
  /** 仮素材の上に重ねる絵（ボスの冠など） */
  overlay?: { pixels: readonly string[]; x: number; y: number };
  /** 顔アイコンに使う範囲（コマ内の px。正方形） */
  avatarCrop?: { x: number; y: number; size: number };
}

/** キャラクターの表示倍率（勇者128×128、雑魚96×96、ボス192×192） */
export const CHARACTER_SCALE = 2;
/** アイコンの原画寸法と表示倍率（16×16 → 64×64） */
export const ICON_SIZE = 16;
export const ICON_SCALE = 4;

/**
 * 絵柄の参照: 採用済み assets/raw/hero_idle_v2_64.png（64×64、同名 .json に指示とパラメータ）。
 * 本素材は人が出来を確認してから assets/sprites/ へ置き、下の anims に登録する。
 */
export const HERO_REFERENCE = 'assets/raw/hero_idle_v2_64.png';

// 仮素材の勇者: 長い金髪、金縁の銀の全身鎧、赤いマント、大剣（右向き）。バックパックは描かない
const HERO = [
  '...........KK...',
  '.....KKKK.KWhK..',
  '....KyyyyKKWhK..',
  '...KyyysssKWhK..',
  '..KyyyssKsKWhK..',
  '..KyyysssKKWhK..',
  '.KyyKKKKKKyKhK..',
  '.KrKhhhhhhyyKK..',
  'KrrKhyhhhhyKbK..',
  'KrrKhhhyhhhKbK..',
  'KrrKyhhhhhyKK...',
  'KrrKhhhhhhhK....',
  '.KrKhHKKKhHK....',
  '.KrKhHK.KhHK....',
  '..KKyyK.KyyK....',
  '...KKKK.KKKK....',
];

const SLIME = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '......KKKK......',
  '....KKeeeeKK....',
  '...KeeWeeeeEK...',
  '..KeeWWeeeeeEK..',
  '..KeeeeeeeeeEK..',
  '.KeeeKeeeKeeeEK.',
  '.KeeeKeeeKeeeEK.',
  '.KEeeeeeeeeeEEK.',
  '.KEEEEEEEEEEEEK.',
  '..KKKKKKKKKKKK..',
  '................',
];

const BAT = [
  '................',
  '................',
  '................',
  '.K............K.',
  '.KK..........KK.',
  '.KVK...KK...KVK.',
  '.KVVK.KVVK.KVVK.',
  '.KVVVKVVVVKVVVK.',
  '..KVVVVrVrVVVK..',
  '...KVVVVVVVVK...',
  '....KKVVVVKK....',
  '......KWWK......',
  '.......KK.......',
  '................',
  '................',
  '................',
];

const GOBLIN = [
  '................',
  '................',
  '.....KKKKK......',
  '....KEEEEEK.....',
  '...KEEEEEEEK....',
  '.KKEErEEErEEKK..',
  '.KEEEEEEEEEEEK..',
  '..KEEKWWWKEEK...',
  '...KEEEEEEEK....',
  '....KKbbbKK.....',
  '...KbbbbbbbK....',
  '..KEKbbbbbKEK...',
  '...KKBBBBBKK....',
  '....KEK.KEK.....',
  '....KBK.KBK.....',
  '....KKK.KKK.....',
];

const ARMOR = [
  '.....KKKKKK.....',
  '....KhhhhhhK....',
  '...KhhHHHHhhK...',
  '...KhKKKKKKhK...',
  '...KhhhhhhhhK...',
  '....KKhhhhKK....',
  '..KKhhhhhhhhKK..',
  '.KhhKhhhhhhKhhK.',
  '.KhhKhHHHHhKhhK.',
  '.KhhKhhhhhhKhhK.',
  '..KKKhHHHHhKKK..',
  '....KhhhhhhK....',
  '....KHHKKHHK....',
  '....KhhK.KhhK...',
  '...KHHHK.KHHHK..',
  '...KKKKK.KKKKK..',
];

const SORCERER = [
  '.......KK.......',
  '......KVVK......',
  '.....KVVVVK.....',
  '....KVVVVVVK....',
  '...KKKKKKKKKK...',
  '....KsKsssKK....',
  '....KssssssK....',
  '...KVVVVVVVVK...',
  '..KVVVmVVmVVVK..',
  '..KVVVVVVVVVVK.y',
  '..KVVVVVVVVVVKyy',
  '..KVVVVVVVVVVK.b',
  '...KVVVVVVVVK..b',
  '...KVVVVVVVVK..b',
  '...KKKKKKKKKK..b',
  '................',
];

const SCARECROW = [
  '......KKKK......',
  '.....KnnnnK.....',
  '.....KnKnKnK....',
  '.....KnnnnnK....',
  '..KKKKKbbKKKKK..',
  '.KnnnnnbbnnnnnK.',
  '..KKKKKbbKKKKK..',
  '......KbbK......',
  '.....KrrrrK.....',
  '.....KrrrrK.....',
  '......KbbK......',
  '......KbbK......',
  '......KbbK......',
  '......KbbK......',
  '.....KBBBBK.....',
  '....KKKKKKKK....',
];

const CROWN = ['K.KK.KK.K', 'KyKyyKyyK', 'KyyyyyyyK', 'KKKKKKKKK'];
const HELM_PLUME = ['..KKK..', '.KrrrK.', 'KrrrrrK', '.KrrK..'];

const unit = (
  key: string,
  pixels: readonly string[],
  frame: number,
  overlay?: SpriteDef['overlay'],
): SpriteDef => ({
  key,
  frameWidth: frame,
  frameHeight: frame,
  displayScale: CHARACTER_SCALE,
  originX: 0.5,
  originY: 1,
  pixels,
  pixelSize: frame / 16,
  overlay,
});

export const UNIT_SPRITES: Record<string, SpriteDef> = {
  // 本素材を足すときは anims に書く（ファイルは assets/sprites/ からの相対パス）。例:
  //   anims: {
  //     idle:   { file: 'hero/hero_idle.png',   frames: 4, fps: 6,  loop: true },
  //     run:    { file: 'hero/hero_run.png',    frames: 6, fps: 12, loop: true },
  //     attack: { file: 'hero/hero_attack.png', frames: 4, fps: 12, loop: true },
  //     hit:    { file: 'hero/hero_hit.png',    frames: 2, fps: 10, loop: false },
  //   },
  hero: { ...unit('hero', HERO, 64), avatarCrop: { x: 12, y: 0, size: 32 } },
  slime: unit('slime', SLIME, 48),
  bat: unit('bat', BAT, 48),
  goblin: unit('goblin', GOBLIN, 48),
  armor: unit('armor', ARMOR, 48),
  sorcerer: unit('sorcerer', SORCERER, 48),
  scarecrow: unit('scarecrow', SCARECROW, 48),
  big_slime: unit('big_slime', SLIME, 96),
  goblin_king: unit('goblin_king', GOBLIN, 96, { pixels: CROWN, x: 4, y: 0 }),
  iron_knight: unit('iron_knight', ARMOR, 96, { pixels: HELM_PLUME, x: 5, y: 0 }),
};

/** 本素材のアニメーションキー（Phaser の anims に登録する名前） */
export function animKey(unitKey: string, anim: UnitAnimName): string {
  return `${unitKey}_${anim}`;
}

// ---- アイテムアイコン（16×16 の中央に 12×12 で描く）。A=主色、S=副色、L=明るい色 を アイテムごとに塗り替える ----

const SHAPES: Record<string, readonly string[]> = {
  stone: [
    '....KKKK....',
    '...KLLAAK...',
    '..KLAAAAAK..',
    '.KLAAAAAAAK.',
    '.KAAAWAAAAK.',
    'KAAAWWWAAAAK',
    'KAAAAWAAASSK',
    '.KAAAAAASSK.',
    '.KSAAAAASSK.',
    '..KSSSSSSK..',
    '...KKKKKK...',
    '............',
  ],
  sword: [
    '..........KK',
    '.........KLK',
    '........KLAK',
    '.......KLAK.',
    '......KLAK..',
    '.....KLAK...',
    '..K.KLAK....',
    '..KKySK.....',
    '...KyyK.....',
    '..KbKKyK....',
    '.KbK..KK....',
    '.KK.........',
  ],
  greatsword: [
    '.........KKK',
    '........KLLK',
    '.......KLAAK',
    '......KLAAK.',
    '.....KLAAK..',
    '....KLAAK...',
    '.K.KLAAK....',
    '.KKKLAK.....',
    '..KyyKK.....',
    '.KbKKyyK....',
    'KbK...KK....',
    'KK..........',
  ],
  spear: [
    '.........KK.',
    '........KLAK',
    '.......KLAK.',
    '......KLAK..',
    '.....KbK....',
    '....KbK.....',
    '...KbK......',
    '..KbK.......',
    '.KbK........',
    'KbK.........',
    'KK..........',
    '............',
  ],
  axe: [
    '....KKKK....',
    '...KLAAAK...',
    '..KLAAAAAK..',
    '..KAAKKAAK..',
    '...KKbKKK...',
    '.....bK.....',
    '....KbK.....',
    '....KbK.....',
    '...KbK......',
    '...KbK......',
    '..KbK.......',
    '..KK........',
  ],
  hammer: [
    '..KKKKKKK...',
    '.KLAAAAAAK..',
    '.KAAAAAAAK..',
    '.KSSSSSSSK..',
    '..KKKbKKK...',
    '.....bK.....',
    '....KbK.....',
    '....KbK.....',
    '...KbK......',
    '...KbK......',
    '..KbK.......',
    '..KK........',
  ],
  ball: [
    '....K.K.....',
    '...KAKAK....',
    '..KLAAAAK...',
    '.KLAAAAAAK..',
    '.KAAAAAAAK..',
    '.KAAAAASAK..',
    '..KAAASSK...',
    '...KKKKK....',
    '....KhK.....',
    '...KhK......',
    '..KhK.......',
    '..KK........',
  ],
  torch: [
    '.....KK.....',
    '....KLyK....',
    '...KyLAyK...',
    '...KAAAAK...',
    '....KAAK....',
    '....KbbK....',
    '....KbbK....',
    '....KbbK....',
    '....KbbK....',
    '....KBBK....',
    '....KBBK....',
    '.....KK.....',
  ],
  staff: [
    '.....KKK....',
    '....KLAAK...',
    '...KLAAAAK..',
    '...KAAAASK..',
    '....KASSK...',
    '.....KbK....',
    '.....KbK....',
    '....KbK.....',
    '....KbK.....',
    '...KbK......',
    '...KbK......',
    '...KK.......',
  ],
  bell: [
    '.....KK.....',
    '....KbbK....',
    '...KLAAAK...',
    '..KLAAAAAK..',
    '..KAAAAAAK..',
    '..KAAAAAAK..',
    '.KAAAAAAAAK.',
    '.KSSSSSSSSK.',
    '..KKKKKKKK..',
    '.....KSK....',
    '......K.....',
    '............',
  ],
  canteen: [
    '....KKKK....',
    '....KbbK....',
    '...KKKKKK...',
    '..KLAAAAAK..',
    '.KLAAAAAAAK.',
    '.KAAWWWWAAK.',
    '.KAAWAAAAAK.',
    '.KAAAAAAASK.',
    '.KSAAAAASSK.',
    '..KSSSSSSK..',
    '...KKKKKK...',
    '............',
  ],
  cloud: [
    '...KKK.KK...',
    '..KLLLKLLK..',
    '.KLAAAAAAAK.',
    '.KAAAAAAASK.',
    '..KKKKbKKK..',
    '..w..KbK.w..',
    '.w..KbK..w..',
    '....KbK.....',
    '...KbK......',
    '...KbK......',
    '..KbK.......',
    '..KK........',
  ],
  bottle: [
    '....KKKK....',
    '....KnnK....',
    '....KKKK....',
    '....KLAK....',
    '...KLAAAK...',
    '..KLAAAAAK..',
    '..KAAAAAAK..',
    '..KAAAAAAK..',
    '..KSAAAASK..',
    '..KSSSSSSK..',
    '...KKKKKK...',
    '............',
  ],
  roundShield: [
    '...KKKKKK...',
    '..KLAAAAAK..',
    '.KLAASSAAAK.',
    'KLAASyySAAAK',
    'KAASyyyySAAK',
    'KAASyyyySAAK',
    'KAAASyySAAAK',
    'KAAAASSAAAAK',
    '.KAAAAAAAAK.',
    '..KAAAAAAK..',
    '...KKKKKK...',
    '............',
  ],
  mail: [
    '..KK....KK..',
    '.KAAK..KAAK.',
    'KLAAAKKAAAAK',
    'KAAAAAAAAAAK',
    '.KKAAAAAAKK.',
    '..KASASASK..',
    '..KSASASAK..',
    '..KASASASK..',
    '..KSASASAK..',
    '..KAAAAAAK..',
    '..KKKKKKKK..',
    '............',
  ],
  kiteShield: [
    'KKKKKKKKKKKK',
    'KLLAAAAAAASK',
    'KLAAAuuAAASK',
    'KAAAAuuAAASK',
    'KAuuuuuuuASK',
    '.KAAAuuAAASK',
    '.KAAAuuAAAK.',
    '..KAAuuAASK.',
    '...KAAAASK..',
    '....KAASK...',
    '.....KKK....',
    '............',
  ],
  flag: [
    '.KK.........',
    '.KyKKKKKK...',
    '.KyKAAAAAK..',
    '.KyKLAAAAAK.',
    '.KyKAAWAAAK.',
    '.KyKAWWWAK..',
    '.KyKAAAAAK..',
    '.KyKKKKKK...',
    '.KyK........',
    '.KyK........',
    '.KbK........',
    '.KKK........',
  ],
  hourglass: [
    '.KKKKKKKKKK.',
    '.KbbbbbbbbK.',
    '..KLAAAAAK..',
    '...KAAAAK...',
    '....KAAK....',
    '.....KK.....',
    '....KyyK....',
    '...KyyyyK...',
    '..KyyyyyyK..',
    '.KbbbbbbbbK.',
    '.KKKKKKKKKK.',
    '............',
  ],
  barrel: [
    '...KKKKKK...',
    '..KOOOOOOK..',
    '.KbbbbbbbbK.',
    '.KHHHHHHHHK.',
    '.KbbLbbbbbK.',
    '.KbbLbbbbbK.',
    '.KbbbbbbbbK.',
    '.KHHHHHHHHK.',
    '.KbbbbbbBBK.',
    '..KBBBBBBK..',
    '...KKKKKK...',
    '............',
  ],
  charm: [
    '..KKKKKKKK..',
    '..KWWWWWWK..',
    '..KWrrrrWK..',
    '..KWWAAWWK..',
    '..KWAAAAWK..',
    '..KWAWWAWK..',
    '..KWWAAWWK..',
    '..KWrrrrWK..',
    '..KWWWWWWK..',
    '..KKKKKKKK..',
    '...K....K...',
    '............',
  ],
  flask: [
    '....KKKK....',
    '....KnnK....',
    '....KWWK....',
    '...KWWWWK...',
    '..KWLAAAWK..',
    '.KWLAAAAAWK.',
    '.KWAAAAAAWK.',
    '.KWAAAAASWK.',
    '.KWSAAASSWK.',
    '..KWWWWWWK..',
    '...KKKKKK...',
    '............',
  ],
};

interface IconSpec {
  shape: keyof typeof SHAPES;
  A: string; // 主色
  S: string; // 影
  L: string; // ハイライト
}

export const ITEM_ICONS: Record<string, IconSpec> = {
  origin_stone: { shape: 'stone', A: 'c', S: 't', L: 'W' },
  sword: { shape: 'sword', A: 'h', S: 'H', L: 'W' },
  greatsword: { shape: 'greatsword', A: 'h', S: 'H', L: 'W' },
  spear: { shape: 'spear', A: 'h', S: 'H', L: 'W' },
  axe: { shape: 'axe', A: 'h', S: 'H', L: 'W' },
  hammer: { shape: 'hammer', A: 'G', S: 'D', L: 'g' },
  iron_ball: { shape: 'ball', A: 'D', S: 'k', L: 'G' },
  torch: { shape: 'torch', A: 'o', S: 'r', L: 'y' },
  flame_staff: { shape: 'staff', A: 'r', S: 'R', L: 'o' },
  thunder_staff: { shape: 'staff', A: 'y', S: 'o', L: 'W' },
  thunder_bell: { shape: 'bell', A: 'y', S: 'o', L: 'W' },
  ice_sword: { shape: 'sword', A: 'i', S: 'l', L: 'W' },
  canteen: { shape: 'canteen', A: 'w', S: 'u', L: 'l' },
  raincloud_staff: { shape: 'cloud', A: 'g', S: 'G', L: 'W' },
  oil_bottle: { shape: 'bottle', A: 'O', S: 'k', L: 'D' },
  wood_shield: { shape: 'roundShield', A: 'b', S: 'B', L: 'n' },
  chainmail: { shape: 'mail', A: 'h', S: 'H', L: 'W' },
  iron_shield: { shape: 'kiteShield', A: 'h', S: 'H', L: 'W' },
  rally: { shape: 'flag', A: 'r', S: 'R', L: 'p' },
  time_stop: { shape: 'hourglass', A: 'l', S: 'u', L: 'W' },
  oil_barrel: { shape: 'barrel', A: 'b', S: 'B', L: 'n' },
  rain_charm: { shape: 'charm', A: 'w', S: 'u', L: 'l' },
  potion: { shape: 'flask', A: 'r', S: 'R', L: 'p' },
};

export function iconPixels(defId: string): string[] {
  const spec = ITEM_ICONS[defId];
  if (!spec) return SHAPES.stone!.slice();
  return SHAPES[spec.shape]!.map((row) =>
    row.replace(/A/g, spec.A).replace(/S/g, spec.S).replace(/L/g, spec.L),
  );
}

export function iconKey(defId: string): string {
  return `icon_${defId}`;
}
