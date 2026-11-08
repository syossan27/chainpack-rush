// UI 部品: パネル、ボタン、丸ボタン、カプセル、リボン、ゲージ
import Phaser from 'phaser';
import { sfx, unlockAudio } from '../../audio/sfx';
import { COLORS, inkStyle, textStyle } from '../theme';
import { iconTex, type IconName } from './icons';
import { SKIN, SLICE, barKey, buttonKey, type BarSkin, type ButtonSkin } from './skin';

export type PanelKind = 'panel' | 'paper' | 'inset' | 'plate';

const PANEL_KEY: Record<PanelKind, [string, number]> = {
  panel: [SKIN.panel, SLICE.panel],
  paper: [SKIN.panelPaper, SLICE.paper],
  inset: [SKIN.inset, SLICE.inset],
  plate: [SKIN.plate, SLICE.plate],
};

/** 9スライスのパネル（中心座標） */
export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: PanelKind = 'panel',
): Phaser.GameObjects.NineSlice {
  const [key, m] = PANEL_KEY[kind];
  return scene.add.nineslice(x, y, key, undefined, w, h, m, m, m, m);
}

export function icon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: IconName,
  scale = 3,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, iconTex(name)).setScale(scale);
}

/** 押すと沈む、つやのあるボタン */
export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  skin?: ButtonSkin;
  icon?: IconName;
  disabled?: boolean;
  silent?: boolean;
  /** 互換: 以前の color 指定（緑系なら green とみなす） */
  color?: number;
  textColor?: string;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  readonly label: Phaser.GameObjects.Text;
  private readonly ic: Phaser.GameObjects.Image | null;
  private disabledState = false;
  private readonly skin: ButtonSkin;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onTap: () => void,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    const w = opts.width ?? 220;
    const h = opts.height ?? 72;
    this.skin =
      opts.skin ??
      (opts.color === COLORS.ok ? 'green' : opts.color === COLORS.danger ? 'red' : 'blue');
    const m = SLICE.button;
    this.bg = scene.add.nineslice(0, 0, buttonKey(this.skin), undefined, w, h, m, m, m, m);
    const fs = opts.fontSize ?? Math.min(30, Math.round(h * 0.4));
    this.label = scene.add.text(0, -3, text, textStyle(fs, opts.textColor)).setOrigin(0.5);
    this.ic = opts.icon
      ? scene.add.image(0, -3, iconTex(opts.icon)).setScale(Math.max(2, Math.floor(h / 30)))
      : null;
    if (this.ic) {
      const gap = 8;
      const total = this.ic.displayWidth + gap + this.label.width;
      this.ic.x = -total / 2 + this.ic.displayWidth / 2;
      this.label.x = this.ic.x + this.ic.displayWidth / 2 + gap + this.label.width / 2;
    }
    this.add(this.ic ? [this.bg, this.ic, this.label] : [this.bg, this.label]);
    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => {
      if (!this.disabledState) this.setScale(0.95);
    });
    this.bg.on('pointerout', () => this.setScale(1));
    this.bg.on('pointerup', () => {
      unlockAudio();
      this.setScale(1);
      if (this.disabledState) {
        if (!opts.silent) sfx('error');
        return;
      }
      if (!opts.silent) sfx('click');
      onTap();
    });
    this.setDisabled(opts.disabled ?? false);
    scene.add.existing(this);
  }

  setDisabled(d: boolean): this {
    this.disabledState = d;
    this.bg.setTexture(buttonKey(d ? 'gray' : this.skin));
    this.label.setAlpha(d ? 0.6 : 1);
    this.ic?.setAlpha(d ? 0.5 : 1);
    return this;
  }

  setText(t: string): this {
    this.label.setText(t);
    return this;
  }
}

/** 丸い枠のボタン（アイコン＋下にラベル） */
export class RoundButton extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Image;
  readonly caption: Phaser.GameObjects.Text | null;
  private badge: Phaser.GameObjects.Arc | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    content: IconName | Phaser.GameObjects.GameObject | null,
    label: string | null,
    onTap: () => void,
  ) {
    super(scene, x, y);
    this.frame = scene.add.image(0, 0, SKIN.round).setDisplaySize(size, size);
    this.add(this.frame);
    if (typeof content === 'string') {
      this.add(
        scene.add.image(0, 0, iconTex(content)).setScale(Math.max(2, Math.floor(size / 32))),
      );
    } else if (content) {
      this.add(content);
    }
    this.caption = label
      ? scene.add
          .text(0, size / 2 + 4, label, textStyle(Math.max(16, Math.round(size / 5))))
          .setOrigin(0.5, 0)
      : null;
    if (this.caption) this.add(this.caption);
    this.setSize(size, size);
    this.frame.setInteractive({ useHandCursor: true });
    this.frame.on('pointerdown', () => this.setScale(0.93));
    this.frame.on('pointerout', () => this.setScale(1));
    this.frame.on('pointerup', () => {
      unlockAudio();
      this.setScale(1);
      onTap();
    });
    scene.add.existing(this);
  }

  setLit(on: boolean): this {
    this.frame.setTexture(on ? SKIN.roundOn : SKIN.round);
    return this;
  }

  /** 右上の赤い点（お知らせ） */
  setBadge(on: boolean): this {
    if (on && !this.badge) {
      this.badge = this.scene.add
        .circle(this.width * 0.36, -this.height * 0.36, 9, 0xe83c3c)
        .setStrokeStyle(3, 0x0c0a12);
      this.add(this.badge);
    } else if (!on && this.badge) {
      this.badge.destroy();
      this.badge = null;
    }
    return this;
  }
}

/** アイコン＋数値のカプセル（通貨など） */
export class Pill extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    iconName: IconName | null,
    value: string,
    color: string = COLORS.text,
  ) {
    super(scene, x, y);
    const m = SLICE.pill;
    this.bg = scene.add.nineslice(0, 0, SKIN.pill, undefined, w, 44, m, m, m, m);
    this.add(this.bg);
    if (iconName) this.add(scene.add.image(-w / 2 + 22, 0, iconTex(iconName)).setScale(2.5));
    this.text = scene.add
      .text(iconName ? -w / 2 + 44 : 0, 0, value, textStyle(24, color))
      .setOrigin(iconName ? 0 : 0.5, 0.5);
    this.add(this.text);
    scene.add.existing(this);
  }

  setValue(v: string, color?: string): this {
    this.text.setText(v);
    if (color) this.text.setColor(color);
    return this;
  }
}

/** 見出しのリボン */
export function ribbon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  title: string,
  w?: number,
): Phaser.GameObjects.Container {
  const t = scene.add.text(0, -4, title, textStyle(30, '#fff6d0')).setOrigin(0.5);
  const width = w ?? Math.max(260, t.width + 120);
  const m = SLICE.ribbon;
  const bg = scene.add.nineslice(0, 0, SKIN.ribbon, undefined, width, 64, m, m, 20, 12);
  const c = scene.add.container(x, y, [bg, t]);
  return c;
}

/** 羊皮紙に書く文字 */
export function ink(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 24,
  color?: string,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, inkStyle(size, color));
}

/** 角の丸いゲージ */
export class Bar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.NineSlice;
  private readonly barW: number;
  private readonly barH: number;
  private ratio = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, skin: BarSkin) {
    super(scene, x, y);
    this.barW = w;
    this.barH = h;
    const m = SLICE.bar;
    const back = scene.add
      .nineslice(0, 0, SKIN.barBack, undefined, w, h, m, m, 8, 8)
      .setOrigin(0, 0.5);
    this.fill = scene.add
      .nineslice(3, 0, barKey(skin), undefined, w - 6, h - 6, 8, 8, 6, 6)
      .setOrigin(0, 0.5);
    this.add([back, this.fill]);
    scene.add.existing(this);
  }

  setRatio(r: number): this {
    const v = Math.max(0, Math.min(1, r));
    if (v === this.ratio) return this;
    this.ratio = v;
    const minW = 16;
    this.fill.setVisible(v > 0.001);
    this.fill.width = Math.max(minW, (this.barW - 6) * v);
    return this;
  }

  setSkin(skin: BarSkin): this {
    this.fill.setTexture(barKey(skin));
    return this;
  }

  get barHeight(): number {
    return this.barH;
  }
}

/** ゲーム内の確認ダイアログ（ブラウザの confirm() はスマホ版のページで出ないため） */
export function confirmDialog(
  scene: Phaser.Scene,
  title: string,
  message: string,
  okLabel: string,
  onOk: () => void,
  okSkin: ButtonSkin = 'red',
): Phaser.GameObjects.Container {
  const W = scene.scale.gameSize.width;
  const H = scene.scale.gameSize.height;
  const root = scene.add.container(0, 0).setDepth(2600);
  const close = () => root.destroy();
  const shade = scene.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
  shade.on('pointerup', close);
  const cw = W - 80;
  const msg = scene.add
    .text(W / 2, 0, message, {
      ...textStyle(24, COLORS.text, false),
      align: 'center',
      wordWrap: { width: cw - 80, useAdvancedWrap: true },
    })
    .setOrigin(0.5, 0);
  const ch = 120 + msg.height + 150;
  const top = H / 2 - ch / 2;
  const bg = panel(scene, W / 2, H / 2, cw, ch, 'panel').setInteractive();
  const t = scene.add.text(W / 2, top + 50, title, textStyle(34, '#ffe27a')).setOrigin(0.5);
  msg.setY(top + 96);
  const by = top + ch - 70;
  const ok = new Button(
    scene,
    W / 2 - 130,
    by,
    okLabel,
    () => {
      close();
      onOk();
    },
    { width: 230, height: 80, skin: okSkin },
  );
  const cancel = new Button(scene, W / 2 + 130, by, 'やめる', close, {
    width: 230,
    height: 80,
    skin: 'gray',
  });
  root.add([shade, bg, t, msg, ok, cancel]);
  return root;
}
