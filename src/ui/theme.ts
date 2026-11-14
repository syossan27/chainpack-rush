// 画面の配置・色・文字の定数（演出用。ゲームの数値は config/balance.ts と src/data）
import Phaser from 'phaser';
import { FIELD, RARITY } from '../config/balance';
import type { Rarity } from '../core/types';
import { lang, type Lang } from '../i18n';

export const W = 720;
export const H = 1280;

export const COLORS = {
  bg: 0x1a1428,
  panel: 0x221e30,
  panelLight: 0x2e2840,
  panelEdge: 0x4a4266,
  cell: 0x2a2538,
  cellEdge: 0x3c3552,
  text: '#f4f0e8',
  textDim: '#a8a0c0',
  textWarn: '#ff8a7a',
  gold: '#f8d040',
  accent: 0x40e0e0,
  accentText: '#40e0e0',
  hp: 0xd83c3c,
  hpBack: 0x4a1a24,
  defense: 0x5aa0e8,
  atb: 0xf8d040,
  unguarded: 0xff3030,
  chainLine: 0xfff080,
  button: 0x3a3258,
  buttonHot: 0x5a4c88,
  buttonDisabled: 0x2a2638,
  danger: 0x8a2030,
  ok: 0x2c6c34,
} as const;

/** Font stack per language (M PLUS Rounded has no Hangul and no Traditional-only Han glyphs) */
const ROUNDED = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
// The rounded font's Latin subsets cover the accented letters of pt/es/de/fr/id
const FONTS: Record<Lang, string> = {
  ja: ROUNDED,
  en: ROUNDED,
  'zh-Hant': '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  ko: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  'pt-BR': ROUNDED,
  es: ROUNDED,
  de: ROUNDED,
  fr: ROUNDED,
  id: ROUNDED,
};

/** Font stack for the current language (read at draw time) */
export function font(l: Lang = lang()): string {
  return FONTS[l];
}

/** 太い丸ゴシック＋濃い縁取り＋落ち影（ゲームらしい見出し文字） */
export function textStyle(
  size: number,
  color: string = COLORS.text,
  bold = true,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: font(),
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? '800' : '500',
    stroke: '#0c0a12',
    strokeThickness: bold ? Math.max(3, Math.round(size / 6)) : Math.max(2, Math.round(size / 10)),
    shadow: bold
      ? {
          offsetX: 0,
          offsetY: Math.max(2, Math.round(size / 14)),
          color: '#0c0a12',
          blur: 0,
          fill: true,
          stroke: true,
        }
      : undefined,
    padding: { x: 2, y: 2 },
  };
}

/** 羊皮紙などの明るい面の上に置く文字（縁取りなし） */
export function inkStyle(
  size: number,
  color = '#3a2410',
  bold = true,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: font(),
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? '800' : '500',
    padding: { x: 2, y: 2 },
  };
}

export function rarityColor(r: Rarity): number {
  return RARITY[r].color;
}

export function rarityCss(r: Rarity): string {
  return `#${RARITY[r].color.toString(16).padStart(6, '0')}`;
}

/** バックパックのセル（最大7列: 7×88 + 左右余白52×2 = 720。5行で440px） */
export const CELL_SIZE = 88;

/** ラン画面のレイアウト（縦 720×1280） */
export const RUN_LAYOUT = {
  fieldHeight: 576, // 上部 約45%
  groundY: 540, // 地面の帯の上端
  footY: 548, // キャラクターの足元（地面の帯へ4ドット沈める。線ちょうどだと浮いて見える）
  heroScreenX: FIELD.viewBehind, // 勇者の足元基準点の画面内位置（中央寄り。前方の見える範囲は FIELD.viewRange）
  rowOffsetY: 48, // 群れの後列の見た目の縦ずらし
  enemyDrawOffsetX: 40, // 敵の描画だけを右へずらす（勇者の剣・マントと顔が重ならないように。core の距離は変えない）
  middleTop: 576,
  middleHeight: 194,
  backpackTop: 780, // 下部: 5行×88 = 440px
} as const;

/** 配置画面のレイアウト */
export const LOADOUT_LAYOUT = {
  backpackTop: 172, // 5行で 172 + 440 = 612
  slotsTop: 690,
  listTop: 806,
  listBottom: 1140,
} as const;

/** 戦闘演出（ヒットストップ・連鎖カウンター・ダメージ数字の段階） */
export const JUICE = {
  /** ダメージ数字の色の段階（この値以上で次の色） */
  damageTiers: [
    { min: 0, color: '#ffffff' },
    { min: 60, color: '#fff6a0' },
    { min: 150, color: '#ffd25a' },
    { min: 400, color: '#ff7a3a' },
  ],
  bigHit: 150, // これ以上で閃光・画面揺れ・短いヒットストップ
  hugeHit: 400, // これ以上で強めの演出
  hitStopMs: { big: 45, huge: 80, combo: 70, kill: 30, boss: 160 },
  bossSlowMs: 900, // ボス撃破のスローモーション
  bossSlowRate: 0.25,
  chainColors: ['#ffffff', '#fff6a0', '#ffd25a', '#ff9a3a', '#ff5a5a', '#ff6ad5'], // 2段〜、2段ごとに次の色
  maxFlashes: 32,
} as const;
