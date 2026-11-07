// シンプルなボタン
import Phaser from 'phaser';
import { sfx, unlockAudio } from '../audio/sfx';
import { COLORS, textStyle } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  textColor?: string;
  disabled?: boolean;
  silent?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  private disabledState = false;
  private readonly baseColor: number;

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
    this.baseColor = opts.color ?? COLORS.button;
    this.bg = scene.add.rectangle(0, 0, w, h, this.baseColor).setStrokeStyle(3, COLORS.panelEdge);
    this.label = scene.add
      .text(0, 0, text, textStyle(opts.fontSize ?? 28, opts.textColor))
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => {
      if (this.disabledState) return;
      this.bg.setFillStyle(COLORS.buttonHot);
    });
    this.bg.on('pointerout', () => this.refresh());
    this.bg.on('pointerup', () => {
      unlockAudio();
      this.refresh();
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
    this.refresh();
    return this;
  }

  setText(t: string): this {
    this.label.setText(t);
    return this;
  }

  private refresh(): void {
    this.bg.setFillStyle(this.disabledState ? COLORS.buttonDisabled : this.baseColor);
    this.label.setAlpha(this.disabledState ? 0.45 : 1);
  }
}
