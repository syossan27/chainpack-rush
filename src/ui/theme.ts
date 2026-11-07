// 画面の配置・色・文字の定数（演出用。ゲームの数値は config/balance.ts と src/data）
import Phaser from 'phaser';
import { RARITY } from '../config/balance';
import type { Rarity } from '../core/types';

export const W = 720;
export const H = 1280;

export const COLORS = {
  bg: 0x14121c,
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

export const FONT =
  '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';

export function textStyle(
  size: number,
  color: string = COLORS.text,
  bold = true,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
    stroke: '#0c0a12',
    strokeThickness: Math.max(2, Math.round(size / 8)),
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
  backpackTop: 110,
  slotsTop: 588,
  listTop: 700,
  listBottom: 1160,
} as const;
