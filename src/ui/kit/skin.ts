// UI スキン（画像素材なし。キャンバスに描いてテクスチャ化し、NineSlice で伸縮して使う）
import Phaser from 'phaser';
import type { Rarity } from '../../core/types';

type Ctx = CanvasRenderingContext2D;

export const SKIN = {
  panel: 'sk_panel', // 石の額縁（暗い面、金の内枠、四隅の鋲）
  panelPaper: 'sk_paper', // 羊皮紙
  inset: 'sk_inset', // くぼんだ暗い面（一覧・グリッドの下地）
  plate: 'sk_plate', // 半透明の小さな札（HUD）
  pill: 'sk_pill', // 通貨などのカプセル
  ribbon: 'sk_ribbon', // 見出しのリボン
  tab: 'sk_tab',
  tabOn: 'sk_tab_on',
  round: 'sk_round', // 丸ボタンの枠
  roundOn: 'sk_round_on',
  barBack: 'sk_bar_back',
  glow: 'sk_glow',
  cellEmpty: 'sk_cell_empty',
} as const;

export type ButtonSkin = 'green' | 'blue' | 'gold' | 'red' | 'purple' | 'gray';
export type BarSkin = 'red' | 'gold' | 'blue' | 'green' | 'purple';

export const buttonKey = (s: ButtonSkin): string => `sk_btn_${s}`;
export const barKey = (s: BarSkin): string => `sk_bar_${s}`;
export const tileKey = (r: Rarity): string => `sk_tile_${r}`;

/** 9スライスの余白（テクスチャごと） */
export const SLICE = {
  panel: 30,
  paper: 26,
  inset: 16,
  plate: 14,
  pill: 22,
  ribbon: 44,
  tab: 20,
  button: 26,
  bar: 10,
  tile: 14,
} as const;

const BUTTON_COLORS: Record<ButtonSkin, [string, string, string]> = {
  // 上, 下, 縁の暗い色
  green: ['#8be06a', '#2e9a3c', '#14401c'],
  blue: ['#7cc4ff', '#2f6fd8', '#142a5c'],
  gold: ['#ffe27a', '#e09a1e', '#5c3608'],
  red: ['#ff8a7a', '#c8323c', '#4c0c14'],
  purple: ['#c99cff', '#7a3cd0', '#2c0c50'],
  gray: ['#9a96aa', '#5a566a', '#24222e'],
};

const BAR_COLORS: Record<BarSkin, [string, string]> = {
  red: ['#ff6a5a', '#b81e2c'],
  gold: ['#ffe680', '#e8a020'],
  blue: ['#8ad0ff', '#2c78e0'],
  green: ['#9cf07a', '#38a83c'],
  purple: ['#d4a0ff', '#7a3cd0'],
};

const TILE_COLORS: Record<Rarity, [string, string, string]> = {
  // 中心, 外側, 枠
  common: ['#8a8698', '#4a4658', '#c8c4d4'],
  rare: ['#5aa6ff', '#1c3c8c', '#8ad0ff'],
  epic: ['#b97cff', '#4a1c8c', '#e0b8ff'],
  legendary: ['#ffd25a', '#a8540c', '#fff0a0'],
};
/** 消耗品の枠（レアリティとは別。青緑） */
const CONSUMABLE_TILE: [string, string, string] = ['#3fc8a8', '#0f5a52', '#9cf0d8'];
export const CONSUMABLE_TILE_KEY = 'sk_tile_consumable';
/** 消耗品の色（名前・タグ） */
export const CONSUMABLE_CSS = '#5ee0c0';

function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function canvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const g = tex.getContext();
  draw(g);
  tex.refresh();
}

function vgrad(g: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

export function generateSkin(scene: Phaser.Scene): void {
  // 石の額縁
  canvas(scene, SKIN.panel, 96, 96, (g) => {
    rr(g, 1, 1, 94, 94, 16);
    g.fillStyle = '#120e1a';
    g.fill();
    rr(g, 4, 4, 88, 88, 13);
    g.fillStyle = vgrad(g, 4, 92, [
      [0, '#5c5470'],
      [0.5, '#3e3850'],
      [1, '#2a2538'],
    ]);
    g.fill();
    rr(g, 12, 12, 72, 72, 8);
    g.fillStyle = vgrad(g, 12, 84, [
      [0, '#2e2840'],
      [1, '#211c2e'],
    ]);
    g.fill();
    g.strokeStyle = '#c8963c';
    g.lineWidth = 2;
    rr(g, 10, 10, 76, 76, 9);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 2;
    rr(g, 5, 5, 86, 86, 12);
    g.stroke();
    for (const [x, y] of [
      [10, 10],
      [86, 10],
      [10, 86],
      [86, 86],
    ] as const) {
      g.fillStyle = '#5c3608';
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffd25a';
      g.beginPath();
      g.arc(x - 1, y - 1, 4, 0, Math.PI * 2);
      g.fill();
    }
  });
  // 羊皮紙
  canvas(scene, SKIN.panelPaper, 80, 80, (g) => {
    rr(g, 1, 1, 78, 78, 12);
    g.fillStyle = '#3a2410';
    g.fill();
    rr(g, 4, 4, 72, 72, 10);
    g.fillStyle = vgrad(g, 4, 76, [
      [0, '#f6e8c8'],
      [1, '#dcc49a'],
    ]);
    g.fill();
    g.strokeStyle = 'rgba(120,80,30,0.45)';
    g.lineWidth = 2;
    rr(g, 9, 9, 62, 62, 6);
    g.stroke();
  });
  // くぼみ
  canvas(scene, SKIN.inset, 48, 48, (g) => {
    rr(g, 0, 0, 48, 48, 10);
    g.fillStyle = '#0c0a12';
    g.fill();
    rr(g, 2, 3, 44, 43, 9);
    g.fillStyle = vgrad(g, 3, 46, [
      [0, '#16121e'],
      [1, '#221c2e'],
    ]);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 2;
    rr(g, 2, 2, 44, 44, 9);
    g.stroke();
  });
  // HUD の札
  canvas(scene, SKIN.plate, 40, 40, (g) => {
    rr(g, 1, 1, 38, 38, 10);
    g.fillStyle = 'rgba(12,10,20,0.72)';
    g.fill();
    g.strokeStyle = 'rgba(200,150,60,0.9)';
    g.lineWidth = 2;
    rr(g, 2, 2, 36, 36, 9);
    g.stroke();
  });
  // カプセル
  canvas(scene, SKIN.pill, 64, 48, (g) => {
    rr(g, 1, 1, 62, 46, 23);
    g.fillStyle = 'rgba(8,6,14,0.78)';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2;
    rr(g, 2, 2, 60, 44, 22);
    g.stroke();
  });
  // リボン（両端が折り返した帯）
  canvas(scene, SKIN.ribbon, 160, 64, (g) => {
    g.fillStyle = '#5a1018';
    g.beginPath();
    g.moveTo(0, 14);
    g.lineTo(34, 14);
    g.lineTo(34, 58);
    g.lineTo(0, 58);
    g.lineTo(12, 36);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(160, 14);
    g.lineTo(126, 14);
    g.lineTo(126, 58);
    g.lineTo(160, 58);
    g.lineTo(148, 36);
    g.closePath();
    g.fill();
    rr(g, 18, 4, 124, 48, 6);
    g.fillStyle = vgrad(g, 4, 52, [
      [0, '#f05a5a'],
      [1, '#a8202c'],
    ]);
    g.fill();
    g.strokeStyle = '#ffd25a';
    g.lineWidth = 3;
    rr(g, 22, 8, 116, 40, 4);
    g.stroke();
  });
  // タブ
  const tab = (key: string, on: boolean) =>
    canvas(scene, key, 64, 64, (g) => {
      rr(g, 1, 1, 62, 62, 14);
      g.fillStyle = on ? '#5c3608' : '#0c0a12';
      g.fill();
      rr(g, 4, 4, 56, 56, 12);
      g.fillStyle = on
        ? vgrad(g, 4, 60, [
            [0, '#ffe27a'],
            [1, '#d08a1a'],
          ])
        : vgrad(g, 4, 60, [
            [0, '#4a4460'],
            [1, '#2a2538'],
          ]);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.3)';
      g.lineWidth = 2;
      rr(g, 6, 6, 52, 26, 10);
      g.stroke();
    });
  tab(SKIN.tab, false);
  tab(SKIN.tabOn, true);
  // 丸ボタン枠
  const round = (key: string, on: boolean) =>
    canvas(scene, key, 112, 112, (g) => {
      g.fillStyle = '#0c0a12';
      g.beginPath();
      g.arc(56, 56, 55, 0, Math.PI * 2);
      g.fill();
      const ring = g.createLinearGradient(0, 0, 0, 112);
      ring.addColorStop(0, on ? '#fff0a0' : '#ffd25a');
      ring.addColorStop(1, on ? '#e09a1e' : '#8a5410');
      g.fillStyle = ring;
      g.beginPath();
      g.arc(56, 56, 52, 0, Math.PI * 2);
      g.fill();
      const inner = g.createRadialGradient(56, 44, 6, 56, 56, 46);
      inner.addColorStop(0, on ? '#4a6aa0' : '#3e3858');
      inner.addColorStop(1, on ? '#1c2c5c' : '#16121e');
      g.fillStyle = inner;
      g.beginPath();
      g.arc(56, 56, 45, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(56, 56, 40, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    });
  round(SKIN.round, false);
  round(SKIN.roundOn, true);
  // ボタン（つやのあるカプセル）
  for (const [skin, [top, bottom, edge]] of Object.entries(BUTTON_COLORS) as [
    ButtonSkin,
    [string, string, string],
  ][]) {
    canvas(scene, buttonKey(skin), 96, 64, (g) => {
      rr(g, 1, 1, 94, 62, 18);
      g.fillStyle = '#0c0a12';
      g.fill();
      rr(g, 3, 3, 90, 58, 16);
      g.fillStyle = edge;
      g.fill();
      rr(g, 4, 3, 88, 52, 15);
      g.fillStyle = vgrad(g, 3, 55, [
        [0, top],
        [1, bottom],
      ]);
      g.fill();
      rr(g, 10, 7, 76, 18, 9);
      g.fillStyle = 'rgba(255,255,255,0.32)';
      g.fill();
    });
  }
  // ゲージ
  canvas(scene, SKIN.barBack, 32, 24, (g) => {
    rr(g, 0, 0, 32, 24, 10);
    g.fillStyle = '#0c0a12';
    g.fill();
    rr(g, 2, 2, 28, 20, 8);
    g.fillStyle = '#2a2234';
    g.fill();
  });
  for (const [skin, [top, bottom]] of Object.entries(BAR_COLORS) as [BarSkin, [string, string]][]) {
    canvas(scene, barKey(skin), 32, 20, (g) => {
      rr(g, 0, 0, 32, 20, 8);
      g.fillStyle = vgrad(g, 0, 20, [
        [0, top],
        [1, bottom],
      ]);
      g.fill();
      rr(g, 4, 2, 24, 6, 3);
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.fill();
    });
  }
  // アイテム枠（レアリティ色）
  for (const [key, [mid, outer, edge]] of [
    ...(Object.entries(TILE_COLORS) as [Rarity, [string, string, string]][]).map(
      ([r, c]) => [tileKey(r), c] as const,
    ),
    [CONSUMABLE_TILE_KEY, CONSUMABLE_TILE] as const,
  ]) {
    canvas(scene, key, 64, 64, (g) => {
      rr(g, 1, 1, 62, 62, 10);
      g.fillStyle = '#0c0a12';
      g.fill();
      rr(g, 3, 3, 58, 58, 8);
      g.fillStyle = edge;
      g.fill();
      rr(g, 6, 6, 52, 52, 6);
      const gr = g.createRadialGradient(32, 26, 4, 32, 32, 36);
      gr.addColorStop(0, mid);
      gr.addColorStop(1, outer);
      g.fillStyle = gr;
      g.fill();
      rr(g, 9, 8, 46, 12, 5);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fill();
    });
  }
  canvas(scene, SKIN.cellEmpty, 64, 64, (g) => {
    rr(g, 2, 2, 60, 60, 9);
    g.fillStyle = '#0c0a12';
    g.fill();
    rr(g, 4, 5, 56, 55, 7);
    g.fillStyle = vgrad(g, 5, 60, [
      [0, '#1a1624'],
      [1, '#2a2436'],
    ]);
    g.fill();
  });
  // 光（加算合成用）
  canvas(scene, SKIN.glow, 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
}
