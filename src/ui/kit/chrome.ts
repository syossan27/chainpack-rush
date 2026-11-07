// 画面の枠: 上部のリソースバーと下部のタブナビ（拠点・配置・倉庫・鍛冶屋・強化で共通）
import Phaser from 'phaser';
import { storageCapacity, storageCount } from '../../core/economy';
import type { SaveData } from '../../core/save';
import { COLORS, H, W, textStyle } from '../theme';
import type { IconName } from './icons';
import { iconTex } from './icons';
import { SKIN, SLICE } from './skin';
import { Pill, RoundButton } from './widgets';

export const TOP_BAR_H = 96;
export const TAB_BAR_H = 128;

/** 勇者の顔を丸枠に入れたアバター */
export function avatar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, SKIN.round).setDisplaySize(size, size));
  const face = scene.add.image(0, 0, 'hero').setOrigin(0, 0);
  // 64×64 の仮素材から顔のあたり（x 12〜44, y 0〜32）を切り出し、丸枠の内側に収める
  const s = (size * 0.72) / 32;
  face.setCrop(12, 0, 32, 32).setScale(s);
  face.setPosition(-(12 + 16) * s, -(0 + 16) * s + size * 0.06);
  c.add(face);
  return c;
}

export class TopBar extends Phaser.GameObjects.Container {
  private readonly gold: Pill;
  private readonly storage: Pill;

  constructor(scene: Phaser.Scene, save: SaveData, onSettings?: () => void) {
    super(scene, 0, 0);
    const bg = scene.add.rectangle(0, 0, W, TOP_BAR_H, 0x0c0a12, 0.55).setOrigin(0, 0);
    this.add(bg);
    this.add(avatar(scene, 54, 50, 84));
    this.add(scene.add.text(104, 18, '冒険者', textStyle(24)));
    this.add(scene.add.text(104, 52, `出撃 ${save.stats.runs}回`, textStyle(18, COLORS.textDim)));
    this.gold = new Pill(scene, 0, 0, 170, 'coin', `${save.gold}`, COLORS.gold);
    this.storage = new Pill(scene, 0, 0, 150, 'chest', '');
    this.gold.setPosition(W - (onSettings ? 360 : 270), 48);
    this.storage.setPosition(W - (onSettings ? 190 : 100), 48);
    this.add([this.gold, this.storage]);
    if (onSettings) this.add(new RoundButton(scene, W - 54, 48, 70, 'gear', null, onSettings));
    this.refresh(save);
    this.setDepth(900);
    scene.add.existing(this);
  }

  refresh(save: SaveData): void {
    this.gold.setValue(`${save.gold}`);
    const cnt = storageCount(save);
    const cap = storageCapacity(save);
    this.storage.setValue(`${cnt}/${cap}`, cnt > cap ? COLORS.textWarn : COLORS.text);
  }
}

export type TabId = 'storage' | 'smith' | 'home' | 'upgrade' | 'loadout';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'storage', label: '倉庫', icon: 'chest' },
  { id: 'smith', label: '鍛冶屋', icon: 'anvil' },
  { id: 'home', label: '拠点', icon: 'home' },
  { id: 'upgrade', label: '強化', icon: 'up' },
  { id: 'loadout', label: '配置', icon: 'bag' },
];

export class TabBar extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    active: TabId,
    onSelect: (id: TabId) => void,
    badges: Partial<Record<TabId, boolean>> = {},
  ) {
    super(scene, 0, H - TAB_BAR_H);
    const bg = scene.add.nineslice(
      W / 2,
      TAB_BAR_H / 2 + 8,
      SKIN.panel,
      undefined,
      W + 24,
      TAB_BAR_H + 24,
      SLICE.panel,
      SLICE.panel,
      SLICE.panel,
      SLICE.panel,
    );
    this.add(bg);
    const tw = W / TABS.length;
    TABS.forEach((t, i) => {
      const on = t.id === active;
      const center = t.id === 'home';
      const x = tw * i + tw / 2;
      const size = center ? 116 : 104;
      const y = center ? 44 : 56;
      const m = SLICE.tab;
      const tile = scene.add.nineslice(
        x,
        y,
        on ? SKIN.tabOn : SKIN.tab,
        undefined,
        size,
        size - 8,
        m,
        m,
        m,
        m,
      );
      const ic = scene.add.image(x, y - (center ? 16 : 12), iconTex(t.icon)).setScale(3);
      const label = scene.add
        .text(
          x,
          y + (center ? 32 : 30),
          t.label,
          textStyle(center ? 22 : 20, on ? '#fff6d0' : COLORS.text),
        )
        .setOrigin(0.5);
      this.add([tile, ic, label]);
      if (badges[t.id])
        this.add(
          scene.add
            .circle(x + size / 2 - 12, y - size / 2 + 12, 9, 0xe83c3c)
            .setStrokeStyle(3, 0x0c0a12),
        );
      tile.setInteractive({ useHandCursor: true });
      tile.on('pointerdown', () => tile.setScale(0.94));
      tile.on('pointerout', () => tile.setScale(1));
      tile.on('pointerup', () => {
        tile.setScale(1);
        if (!on) onSelect(t.id);
      });
    });
    this.setDepth(900);
    scene.add.existing(this);
  }
}

/** タブの移動先 */
export function goTab(scene: Phaser.Scene, id: TabId): void {
  if (id === 'loadout') scene.scene.start('Loadout');
  else scene.scene.start('Base', { page: id });
}
