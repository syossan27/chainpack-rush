// 画面の配置・色・文字の定数（演出用。ゲームの数値は config/balance.ts と src/data）
import Phaser from 'phaser';
import { RARITY } from '../config/balance';
import type { Rarity } from '../core/types';

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

export const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

/** 太い丸ゴシック＋濃い縁取り＋落ち影（ゲームらしい見出し文字） */
export function textStyle(
  size: number,
  color: string = COLORS.text,
  bold = true,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
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
    fontFamily: FONT,
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
  groundY: 540, // 足元の線
  heroScreenX: 160, // 勇者の足元基準点の画面内位置（要確認）
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
