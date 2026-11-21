// Effects on the board as the chain rings each cell: the element's art plays on the cell (the
// special techniques' art, scaled to a cell), the gear's icon pops, a coloured outline spreads, with
// small particles and light as accents, and the board knocks a little. They grow with the chain's
// heat (chainHeat). Drawing only: nothing is written back to core.
import Phaser from 'phaser';
import type { GimmickKind, ItemDef } from '../core/types';
import { CELL_FX, cellFxKind, type CellFxKind } from '../core/cellFxRules';
import { fxSheetKey } from '../data/techFx';
import { GIMMICK_COLOR, type BackpackView } from './backpackView';
import { SKIN } from './kit/skin';
import type { Effects } from './pools';
import { textStyle } from './theme';

const COLOR: Record<CellFxKind, number> = {
  fire: 0xff8a30,
  ice: 0xa8e8ff,
  thunder: 0xffe040,
  wind: 0xb8f0c8,
  slash: 0xffffff,
  blunt: 0xffd090,
  water: 0x5ab8ff,
  oil: 0x6a4a7a,
  light: 0xfff4b0,
  dark: 0xb080ff,
  poison: 0x8ae04a,
  guard: 0x7ad8ff,
};

/** The technique art each kind plays on the cell (others are drawn with light and particles) */
const ART: Partial<
  Record<CellFxKind, { sheet: string; scale: number; originY: number; ms: number; once: boolean }>
> = {
  // The crystal grows and bursts into shards (5 frames)
  ice: { sheet: 'frost', scale: 2.4, originY: 0.85, ms: 420, once: true },
  // A bolt drops onto the cell (48×160)
  thunder: { sheet: 'thunder', scale: 0.95, originY: 0.92, ms: 360, once: true },
  // A small whirlwind on the cell
  wind: { sheet: 'whirl', scale: 1.5, originY: 0.75, ms: 480, once: false },
  // A crescent of flame
  fire: { sheet: 'crimson', scale: 1.8, originY: 0.5, ms: 400, once: false },
  // A white crescent cut
  slash: { sheet: 'triple', scale: 1.6, originY: 0.5, ms: 300, once: false },
};

export class CellFx {
  private windowStart = 0;
  private used = 0;

  /** The board's resting position, while it knocks */
  private readonly restX: number;
  private readonly restY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: BackpackView,
    private readonly effects: Effects,
    /** The player's screen-shake setting (off: the board never knocks) */
    private readonly shakeOn: () => boolean,
  ) {
    this.restX = view.x;
    this.restY = view.y;
  }

  /** A cell rang. heat: chainHeat of the chain so far */
  ring(cell: number, def: ItemDef, heat: number, now: number): void {
    const kind = cellFxKind(def);
    if (!kind) return;
    if (now - this.windowStart > 100) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used >= CELL_FX.budget) return;
    this.used++;
    const size = CELL_FX.heatScale[Math.min(heat, CELL_FX.heatScale.length - 1)]!;
    const local = this.view.cellCenter(cell);
    const world = { x: this.view.x + local.x, y: this.view.y + local.y };
    const color = COLOR[kind];
    const art = ART[kind];
    this.pop(cell, heat);
    this.knock(heat, kind === 'blunt' || kind === 'thunder' || (def.relayDelay ?? 0) >= 0.3);
    // Every ring lights the cell up in its colour
    this.effects.flash(world.x, world.y, color, 1.5 * size, 0.2);
    if (art && this.playArt(art, local, size)) {
      this.accent(kind, world, color, size);
      return;
    }
    this.drawn(kind, local, world, color, size);
  }

  /** The gear's icon pops up and settles back, tilted a little (as if struck) */
  private pop(cell: number, heat: number): void {
    const icon = this.view.iconAt(cell);
    if (!icon) return;
    this.scene.tweens.killTweensOf(icon);
    icon.setScale(1).setAngle(0);
    this.scene.tweens.add({
      targets: icon,
      scale: 1.22 + heat * 0.04,
      angle: (Math.random() < 0.5 ? -1 : 1) * (6 + heat * 2),
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => icon.setScale(1).setAngle(0),
    });
  }

  /** The board knocks: a small jolt, harder for heavy gear and as the chain heats up */
  private knock(heat: number, heavy: boolean): void {
    if (!this.shakeOn()) return;
    const amp = (heavy ? 5 : 2) + heat * 1.2;
    this.scene.tweens.killTweensOf(this.view);
    this.view.setPosition(this.restX, this.restY);
    this.scene.tweens.add({
      targets: this.view,
      x: this.restX + (Math.random() - 0.5) * amp,
      y: this.restY + amp,
      duration: 40,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.view.setPosition(this.restX, this.restY),
    });
  }

  /** The colour a piece of gear's effects use (the chain line leaving it, its cell's light) */
  colorOf(def: ItemDef | undefined): number {
    const kind = def ? cellFxKind(def) : null;
    return kind ? COLOR[kind] : 0xfff080;
  }

  /** A ball of light runs from cell to cell along the chain line, in the colour it left with */
  orb(fromCell: number, toCell: number, color: number, ms = 150): void {
    const a = this.view.cellCenter(fromCell);
    const b = this.view.cellCenter(toCell);
    const halo = this.scene.add
      .image(a.x, a.y, SKIN.glow)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.55);
    const core = this.scene.add.circle(a.x, a.y, 7, 0xffffff);
    this.view.fxLayer.add([halo, core]);
    this.scene.tweens.add({
      targets: [halo, core],
      x: b.x,
      y: b.y,
      duration: ms,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [halo, core],
          alpha: 0,
          scale: 1.6,
          duration: 160,
          onComplete: () => {
            halo.destroy();
            core.destroy();
          },
        });
      },
    });
  }

  /** A gimmick cell did its work as the chain passed: a spin, a switch, a portal */
  gimmick(cell: number, kind: GimmickKind): void {
    const at = this.view.cellCenter(cell);
    const color = GIMMICK_COLOR[kind];
    const r = this.view.cell * 0.42;
    const g = this.scene.add.graphics({ x: at.x, y: at.y });
    if (kind === 'rotate') {
      // An arrow of light that sweeps a quarter turn round the cell
      g.lineStyle(7, color, 1);
      g.beginPath();
      g.arc(0, 0, r, -Math.PI / 2, 0);
      g.strokePath();
      g.fillStyle(color, 1).fillTriangle(r - 10, -4, r + 10, -4, r, 12);
    } else if (kind === 'switch') {
      g.lineStyle(6, color, 1).strokeRect(-r, -r, r * 2, r * 2);
    } else {
      g.lineStyle(6, color, 1).strokeCircle(0, 0, r * 0.6);
      g.lineStyle(3, 0xffffff, 0.9).strokeCircle(0, 0, r * 0.35);
    }
    this.view.fxLayer.add(g);
    this.scene.tweens.add({
      targets: g,
      angle: kind === 'rotate' ? 90 : kind === 'warp' ? 270 : 0,
      scale: kind === 'warp' ? { from: 1.4, to: 0.3 } : { from: 0.9, to: 1.15 },
      alpha: { from: 1, to: 0 },
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * The chain came back round a loop to this cell (pass 2, 3, 4): the cells of the loop light up gold,
   * and the cell shows "×n"
   */
  revisit(cell: number, pass: number, loop: readonly number[]): void {
    const gold = pass >= 3 ? 0xffe680 : 0xffd25a;
    for (const c of loop) {
      const at = this.view.cellCenter(c);
      const w = this.view.cell - 8;
      const r = this.scene.add.rectangle(at.x, at.y, w, w).setStrokeStyle(5, gold, 1);
      this.view.fxLayer.add(r);
      this.scene.tweens.add({
        targets: r,
        alpha: 0,
        scale: 1.12,
        duration: 420,
        onComplete: () => r.destroy(),
      });
    }
    const at = this.view.cellCenter(cell);
    const txt = this.scene.add
      .text(
        at.x + this.view.cell * 0.28,
        at.y - this.view.cell * 0.3,
        `×${pass}`,
        textStyle(26 + pass * 4, '#ffe680'),
      )
      .setOrigin(0.5);
    this.view.fxLayer.add(txt);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 18,
      scale: { from: 1.6, to: 1 },
      alpha: { from: 1, to: 0 },
      duration: 650,
      ease: 'Back.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  /** The technique's art on the cell, scaled up a little and faded out */
  private playArt(
    art: NonNullable<(typeof ART)[CellFxKind]>,
    at: { x: number; y: number },
    size: number,
  ): boolean {
    const key = fxSheetKey(art.sheet);
    if (!this.scene.textures.exists(key)) return false;
    const cell = this.view.cell;
    const y = at.y + cell * (art.originY - 0.5);
    const s = this.scene.add
      .sprite(at.x, y, key, 0)
      .setOrigin(0.5, art.originY)
      .setScale(art.scale * size);
    this.view.fxLayer.add(s);
    if (this.scene.anims.exists(key)) s.play({ key, repeat: art.once ? 0 : -1 });
    this.scene.tweens.add({
      targets: s,
      scale: art.scale * size * 1.15,
      alpha: { from: 1, to: 0 },
      ease: 'Quad.easeIn',
      duration: art.ms,
      onComplete: () => s.destroy(),
    });
    return true;
  }

  /** Small particles that go with the art */
  private accent(kind: CellFxKind, w: { x: number; y: number }, color: number, size: number): void {
    const n = Math.round(5 * size);
    if (kind === 'fire') this.effects.burst(w.x, w.y, color, n, 260);
    else if (kind === 'ice') this.effects.burst(w.x, w.y, color, n, 200);
    else if (kind === 'thunder') this.effects.flash(w.x, w.y, color, 1.2 * size, 0.12);
    else if (kind === 'wind') this.effects.burst(w.x, w.y, color, n, 180);
    else this.effects.slash(w.x, w.y, color, 0.5 * size);
  }

  /** Kinds without art: light, outlines and particles */
  private drawn(
    kind: CellFxKind,
    local: { x: number; y: number },
    w: { x: number; y: number },
    color: number,
    size: number,
  ): void {
    const n = Math.round(6 * size);
    switch (kind) {
      case 'blunt':
        this.spread(local, color, size, 0.35);
        this.effects.flash(w.x, w.y, color, 1.4 * size, 0.14);
        break;
      case 'water':
        this.spread(local, color, size, 0.3);
        this.effects.burst(w.x, w.y, color, n, 240);
        break;
      case 'oil':
        this.effects.burst(w.x, w.y, color, n, 160);
        break;
      case 'light':
        this.beam(local, color, size);
        this.effects.flash(w.x, w.y, color, 1.3 * size, 0.16);
        break;
      case 'dark':
        this.effects.absorb(w.x, w.y, w.x, w.y, color, n, 'px', 3);
        this.effects.flash(w.x, w.y, color, 1.1 * size, 0.2);
        break;
      case 'poison':
        this.effects.burst(w.x, w.y, color, n, 90);
        break;
      case 'guard':
        this.spread(local, color, size, 0.28);
        this.effects.flash(w.x, w.y, color, 1.2 * size, 0.18);
        break;
      default:
        this.effects.slash(w.x, w.y, color, 0.6 * size);
    }
  }

  /** A ring that spreads from the cell's centre and fades */
  private spread(at: { x: number; y: number }, color: number, size: number, sec: number): void {
    const r = this.view.cell * 0.3;
    const c = this.scene.add.circle(at.x, at.y, r).setStrokeStyle(5, color, 1);
    this.view.fxLayer.add(c);
    this.scene.tweens.add({
      targets: c,
      scale: 1.9 * size,
      alpha: 0,
      duration: sec * 1000,
      ease: 'Quad.easeOut',
      onComplete: () => c.destroy(),
    });
  }

  /** A shaft of light down onto the cell */
  private beam(at: { x: number; y: number }, color: number, size: number): void {
    const cell = this.view.cell;
    const b = this.scene.add
      .image(at.x, at.y + cell * 0.4, SKIN.glow)
      .setOrigin(0.5, 1)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.35 * size, 0.05);
    this.view.fxLayer.add(b);
    this.scene.tweens.add({
      targets: b,
      scaleY: 1.6 * size,
      alpha: { from: 1, to: 0 },
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => b.destroy(),
    });
  }
}
