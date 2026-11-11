// 結果の共有用の画像（配置と記録を1枚に）を作って、端末の共有か保存に渡す
import type Phaser from 'phaser';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { getItemDef } from '../data/items';
import { iconKey } from '../data/sprites';
import { FONT, rarityCss } from './theme';
import { SHARE_TAG, type ShareSummary } from '../core/shareText';

const CW = 720;
const CH = 960;
const CONSUMABLE_BG = '#2f8f8a';

/** 共有用の画像を作る（PNG の Blob） */
export async function buildShareImage(
  scene: Phaser.Scene,
  s: ShareSummary,
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): Promise<Blob | null> {
  const cv = document.createElement('canvas');
  cv.width = CW;
  cv.height = CH;
  const g = cv.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = false;
  // 背景
  const grad = g.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, '#2a1f3d');
  grad.addColorStop(1, '#120e1a');
  g.fillStyle = grad;
  g.fillRect(0, 0, CW, CH);
  const text = (
    t: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'center',
  ) => {
    g.font = `800 ${size}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(4, size / 6);
    g.strokeStyle = '#1a1020';
    g.strokeText(t, x, y);
    g.fillStyle = color;
    g.fillText(t, x, y);
  };
  text('Chainpack Rush', CW / 2, 70, 56, '#ffe27a');
  const n = (v: number) => Math.round(v).toLocaleString('ja-JP');
  const sub = s.challengeName
    ? `挑戦「${s.challengeName}」`
    : s.endless
      ? 'エンドレス'
      : s.regionName;
  text(sub, CW / 2, 140, 30, '#d8d0e8');
  text(
    s.challengeName ? `スコア ${n(s.totalDamage)}` : `${s.reachedLoop}周目に到達`,
    CW / 2,
    200,
    52,
    '#ffffff',
  );
  text(`最大連鎖 ${s.maxStep}段`, CW / 2 - 170, 270, 28, '#ffd27a');
  text(`最大ダメージ ${n(s.maxDamage)}`, CW / 2 + 150, 270, 28, '#ff9a7a');

  // 配置（バックパック）
  const cell = Math.min(88, Math.floor(620 / loadout.width), Math.floor(520 / loadout.height));
  const gw = cell * loadout.width;
  const gh = cell * loadout.height;
  const ox = (CW - gw) / 2;
  const oy = 320 + (540 - gh) / 2;
  g.fillStyle = '#3a2c1c';
  g.fillRect(ox - 10, oy - 10, gw + 20, gh + 20);
  for (let y = 0; y < loadout.height; y++) {
    for (let x = 0; x < loadout.width; x++) {
      const px = ox + x * cell;
      const py = oy + y * cell;
      g.fillStyle = '#241a12';
      g.fillRect(px + 2, py + 2, cell - 4, cell - 4);
      const uid = loadout.cells[y * loadout.width + x];
      const it = uid ? items.get(uid) : undefined;
      if (!it) continue;
      const def = getItemDef(it.defId);
      g.fillStyle = def.kind === 'consumable' ? CONSUMABLE_BG : rarityCss(it.rarity);
      g.fillRect(px + 4, py + 4, cell - 8, cell - 8);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(px + 8, py + 8, cell - 16, cell - 16);
      const key = iconKey(it.defId);
      if (scene.textures.exists(key)) {
        const src = scene.textures.get(key).getSourceImage() as CanvasImageSource;
        const size = cell - 24;
        g.drawImage(src, px + 12, py + 12, size, size);
      }
      for (const d of it.exits) arrow(g, px, py, cell, d);
    }
  }
  text(SHARE_TAG, CW / 2, CH - 50, 30, '#ffe27a');
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}

function arrow(g: CanvasRenderingContext2D, px: number, py: number, cell: number, d: Dir): void {
  const c = cell / 2;
  const s = cell * 0.12;
  const pts: Record<Dir, [number, number][]> = {
    up: [
      [c, 2],
      [c - s, 2 + s],
      [c + s, 2 + s],
    ],
    down: [
      [c, cell - 2],
      [c - s, cell - 2 - s],
      [c + s, cell - 2 - s],
    ],
    left: [
      [2, c],
      [2 + s, c - s],
      [2 + s, c + s],
    ],
    right: [
      [cell - 2, c],
      [cell - 2 - s, c - s],
      [cell - 2 - s, c + s],
    ],
  };
  g.beginPath();
  pts[d].forEach(([x, y], i) => (i === 0 ? g.moveTo(px + x, py + y) : g.lineTo(px + x, py + y)));
  g.closePath();
  g.fillStyle = '#ffe27a';
  g.fill();
  g.strokeStyle = '#1a1020';
  g.lineWidth = 2;
  g.stroke();
}

/** 端末の共有（対応していれば画像つき）か、画像の保存に回す。結果を返す */
export async function shareImage(blob: Blob, text: string): Promise<'shared' | 'saved' | 'failed'> {
  const file = new File([blob], 'chainpack-rush.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    // やめたときも AbortError になる
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chainpack-rush.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* 文のコピーはできなくてもよい */
    }
    return 'saved';
  } catch {
    return 'failed';
  }
}
