// スプライトの定義。仮素材（コードで描くドット絵）と本素材（assets/sprites の PNG）をここで切り替える。
// 本素材がないものは仮素材で動き続ける。本素材は横一列の PNG（1枚の中のコマは同じサイズ）。
// コマ寸法と原点はキャラ共通が基本で、アニメごとに上書きできる。

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
  /** 省略した軸は SpriteDef のコマ寸法。攻撃などシートサイズが違うときだけ書く */
  frameWidth?: number;
  frameHeight?: number;
  /** 省略した軸は SpriteDef の原点（0〜1）。足元を世界座標へ合わせ、コマごとに寄せない */
  originX?: number;
  originY?: number;
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
 * 絵柄の参照: assets/raw/hero/ の採用 v4（兜・待機・踏み込み攻撃・走り）。
 * 待機・走り・攻撃は anims に登録済み。被弾は未登録なので、そのときの動作（なければ待機）で代用する。
 */
export const HERO_REFERENCE = 'assets/raw/hero/hero_idle_v4_helm.png';

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

const WOLF = [
  '................',
  '................',
  '................',
  '................',
  '..KK............',
  '.KGGK.......KK..',
  '.KGGGK.....KGGK.',
  'KGWGGGKKKKKGGGK.',
  'KGGGGGGGGGGGGK..',
  '.KKGGGGGGGGGGK..',
  '..KGGgGGGGGGGGK.',
  '...KGGGGGGGGGGK.',
  '...KGGKKKKKGGK..',
  '...KGK.....KGK..',
  '...KDK.....KDK..',
  '...KKK.....KKK..',
];

const SKELETON = [
  '................',
  '.....KKKKK......',
  '....KWWWWWK.....',
  '...KWWWWWWWK....',
  '...KWkWWWkWK....',
  '...KWWWWWWWK....',
  '....KWKWKWK.....',
  '.....KKKKK......',
  '...KKWKWKWKK....',
  '..KW.KWWWK.WK...',
  '..KW.KWKWK.WK...',
  '.....KWWWK......',
  '.....KWKWK......',
  '.....KW.WK......',
  '....KWK.KWK.....',
  '....KKK.KKK.....',
];

const GOLEM = [
  '.....KKKKKK.....',
  '....KnnnnnnK....',
  '...KnbnnnnbnK...',
  '...KnnyKKynnK...',
  '...KnnnnnnnnK...',
  '.KKKbnnnnnnbKKK.',
  'KnnnKnnbbnnKnnnK',
  'KnbnKnnnnnnKnbnK',
  'KnnnKnbnnbnKnnnK',
  '.KKKKnnnnnnKKKK.',
  '....KnnbbnnK....',
  '...KnnnKKnnnK...',
  '...KnnK..KnnK...',
  '..KbnnK..KnnbK..',
  '..KnnnK..KnnnK..',
  '..KKKKK..KKKKK..',
];

/** 仮素材の色を置き換える（1文字=1ドットの色キーを差し替える） */
function recolor(pixels: readonly string[], map: Record<string, string>): string[] {
  return pixels.map((row) => row.replace(/./g, (ch) => map[ch] ?? ch));
}

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
  // 本素材は anims に書く（file は assets/sprites/ からの相対パス）。
  // コマ寸法・原点がキャラ共通と違うアニメだけ frameWidth/frameHeight/originX/originY を書く。
  hero: {
    ...unit('hero', HERO, 64),
    // v4 の兜（両角と面）。仮素材向けの (12, 0, 32) は面の右半分を切っていた
    avatarCrop: { x: 16, y: 4, size: 32 },
    anims: {
      idle: {
        file: 'hero/hero_idle.png',
        frames: 9,
        fps: 6.67,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        originX: 32 / 64,
        originY: 56 / 64,
      },
      // 地面は y=71、体の位置は x=41 で全コマ固定。足元のコマごとのずれには寄せない
      run: {
        file: 'hero/hero_run.png',
        frames: 8,
        fps: 12,
        loop: true,
        frameWidth: 96,
        frameHeight: 80,
        originX: 41 / 96,
        originY: 71 / 80,
      },
      attack: {
        file: 'hero/hero_attack.png',
        frames: 9,
        fps: 12,
        loop: false,
        frameWidth: 140,
        frameHeight: 96,
        originX: 53 / 140,
        originY: 80 / 96,
      },
    },
  },
  slime: unit('slime', SLIME, 48),
  bat: unit('bat', BAT, 48),
  goblin: unit('goblin', GOBLIN, 48),
  armor: unit('armor', ARMOR, 48),
  sorcerer: unit('sorcerer', SORCERER, 48),
  scarecrow: unit('scarecrow', SCARECROW, 48),
  big_slime: unit('big_slime', SLIME, 96),
  goblin_king: unit('goblin_king', GOBLIN, 96, { pixels: CROWN, x: 4, y: 0 }),
  iron_knight: unit('iron_knight', ARMOR, 96, { pixels: HELM_PLUME, x: 5, y: 0 }),
  wolf: unit('wolf', WOLF, 48),
  skeleton: unit('skeleton', SKELETON, 48),
  slime_mother: unit('slime_mother', recolor(SLIME, { e: 'p', E: 'm' }), 96, {
    pixels: CROWN,
    x: 4,
    y: 2,
  }),
  bat_queen: unit('bat_queen', recolor(BAT, { V: 'R', r: 'y' }), 96, { pixels: CROWN, x: 4, y: 1 }),
  lich: unit('lich', recolor(SORCERER, { V: 'U', m: 'c', s: 'g' }), 96, {
    pixels: CROWN,
    x: 4,
    y: 0,
  }),
  golem: unit('golem', GOLEM, 96),
};

/** 本素材のアニメーションキー（Phaser の anims に登録する名前） */
export function animKey(unitKey: string, anim: UnitAnimName): string {
  return `${unitKey}_${anim}`;
}

/** アニメのコマ寸法。省略した軸はキャラ共通の寸法 */
export function animFrameSize(
  def: SpriteDef,
  anim: SpriteAnim,
): { frameWidth: number; frameHeight: number } {
  return {
    frameWidth: anim.frameWidth ?? def.frameWidth,
    frameHeight: anim.frameHeight ?? def.frameHeight,
  };
}

/** アニメの足元原点。省略した軸はキャラ共通の原点。表示倍率は変えない */
export function animOrigin(def: SpriteDef, anim: SpriteAnim): { originX: number; originY: number } {
  return {
    originX: anim.originX ?? def.originX,
    originY: anim.originY ?? def.originY,
  };
}

/** 静止画（待機、なければ移動・走りの1コマ目）に合わせる原点 */
export function stillOrigin(def: SpriteDef): { originX: number; originY: number } {
  const anim = def.anims?.idle ?? def.anims?.move ?? def.anims?.run;
  return anim ? animOrigin(def, anim) : { originX: def.originX, originY: def.originY };
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
  dagger: [
    '............',
    '..........KK',
    '.........KLK',
    '........KLAK',
    '.......KLAK.',
    '......KLAK..',
    '...K.KLAK...',
    '...KKySK....',
    '....KyyK....',
    '...KbKKyK...',
    '..KbK..KK...',
    '..KK........',
  ],
  twin: [
    'KK........KK',
    'KLK......KLK',
    'KALK....KLAK',
    '.KALK..KLAK.',
    '..KALKKLAK..',
    '...KALLAK...',
    '...KyKKyK...',
    '..KyK..KyK..',
    '.KbK....KbK.',
    'KbK......KbK',
    'KK........KK',
    '............',
  ],
  bow: [
    '..KKK.......',
    '.KbbbK....K.',
    '.KbKKbK..KW.',
    '..K..KbKKWK.',
    '......KbWK..',
    '.....KKWbK..',
    '....KAWKKbK.',
    '...KAWK..KbK',
    '..KAWK...KbK',
    '.KLAK....KbK',
    '.KKK....KbK.',
    '.......KKK..',
  ],
  bomb: [
    '........KyK.',
    '.......KoK..',
    '......KbK...',
    '....KKKbKK..',
    '...KLAAAAAK.',
    '..KLAAAAAAAK',
    '..KAAAAAAAAK',
    '..KAAAAAAASK',
    '..KAAAAAASSK',
    '...KSAAASSK.',
    '....KKKKKK..',
    '............',
  ],
  ring: [
    '....KKKK....',
    '..KKLLAAKK..',
    '.KLAKKKKAAK.',
    '.KAK....KAK.',
    'KLK......KSK',
    'KAK..yy..KSK',
    'KAK..yy..KSK',
    'KAK......KSK',
    '.KAK....KSK.',
    '.KSAKKKKSSK.',
    '..KKSSSSKK..',
    '....KKKK....',
  ],
  coin: [
    '....KKKK....',
    '..KKLLAAKK..',
    '.KLLAAAAAAK.',
    '.KLAASSSAAK.',
    'KLAASAAAAASK',
    'KAAASSSAAASK',
    'KAAAAAASAASK',
    'KAAASSSAAASK',
    '.KAAAAAAASK.',
    '.KSAAAAASSK.',
    '..KKSSSSKK..',
    '....KKKK....',
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
  time_sand: { shape: 'hourglass', A: 'y', S: 'o', L: 'W' },
  rain_charm: { shape: 'charm', A: 'w', S: 'u', L: 'l' },
  potion: { shape: 'flask', A: 'r', S: 'R', L: 'p' },
  dagger: { shape: 'dagger', A: 'h', S: 'H', L: 'W' },
  twin_blades: { shape: 'twin', A: 'h', S: 'H', L: 'W' },
  bow: { shape: 'bow', A: 'h', S: 'H', L: 'W' },
  war_axe: { shape: 'axe', A: 'G', S: 'D', L: 'g' },
  holy_sword: { shape: 'greatsword', A: 'y', S: 'o', L: 'W' },
  thunder_spear: { shape: 'spear', A: 'y', S: 'o', L: 'W' },
  frost_staff: { shape: 'staff', A: 'i', S: 'l', L: 'W' },
  leather_armor: { shape: 'mail', A: 'b', S: 'B', L: 'n' },
  tower_shield: { shape: 'kiteShield', A: 'G', S: 'D', L: 'g' },
  bomb: { shape: 'bomb', A: 'D', S: 'k', L: 'G' },
  lucky_coin: { shape: 'coin', A: 'y', S: 'o', L: 'W' },
  chrono_glass: { shape: 'hourglass', A: 'm', S: 'V', L: 'W' },
  ouroboros: { shape: 'ring', A: 'c', S: 't', L: 'W' },
  dragon_fang: { shape: 'greatsword', A: 'r', S: 'R', L: 'y' },
  sky_hammer: { shape: 'hammer', A: 'y', S: 'u', L: 'W' },
  sage_stone: { shape: 'stone', A: 'r', S: 'm', L: 'y' },
  aegis_gate: { shape: 'kiteShield', A: 'y', S: 'o', L: 'W' },
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
