// フィールドの描画（ラン・カカシで共用）。core の状態を写すだけで、core には何も書き戻さない。
// 画面外の敵は描画だけをカリングする（core では保持し、イベント列は変わらない）。
import Phaser from 'phaser';
import { FIELD, HERO, UI } from '../config/balance';
import type { Combat, EnemyState } from '../core/combat';
import type { Status } from '../core/types';
import { getRegion } from '../data/regions';
import { UNIT_SPRITES, animKey, animOrigin, stillOrigin, type UnitAnimName } from '../data/sprites';
import { generateBackgroundTextures } from './textures';
import { COLORS, RUN_LAYOUT, W, textStyle } from './theme';

/** 被弾モーションを見せる長さ（ms） */
const HERO_HIT_MS = 250;

const STATUS_COLOR: Record<Status, number> = { wet: 0x5aa0e8, oil: 0x6a5030, frozen: 0xc8f0ff };

interface EnemySlot {
  id: number; // -1 なら空き
  sprite: Phaser.GameObjects.Sprite;
  hpBack: Phaser.GameObjects.Rectangle;
  hp: Phaser.GameObjects.Rectangle;
  status: Phaser.GameObjects.Graphics;
  aim: Phaser.GameObjects.Text;
  flashUntil: number;
}

export class FieldView {
  readonly scene: Phaser.Scene;
  private readonly bgLayers: Phaser.GameObjects.TileSprite[] = [];
  readonly hero: Phaser.GameObjects.Sprite;
  private readonly heroGlow: Phaser.GameObjects.Sprite;
  private readonly atbBar: Phaser.GameObjects.Rectangle;
  private readonly slots: EnemySlot[] = [];
  private readonly byId = new Map<number, EnemySlot>();
  private heroHurtUntil = 0;
  /** 勇者の本素材（待機）が読み込まれているか */
  private readonly heroHasSprites: boolean;
  aimId: number | null = null;
  visibleEnemies = 0;

  constructor(scene: Phaser.Scene, regionId: string) {
    this.scene = scene;
    const region = getRegion(regionId);
    const keys = generateBackgroundTextures(scene, region.id, region.bgColors, region.groundColor);
    const bgScale = 2; // 背景も整数倍（端数拡大を避ける）
    const texH = scene.textures.get(keys[0]!).getSourceImage().height;
    // 空（テクスチャより上の部分）
    scene.add
      .rectangle(0, 0, W, RUN_LAYOUT.fieldHeight, region.bgColors[0])
      .setOrigin(0, 0)
      .setDepth(0);
    // 各層の下端の地面帯（40px×2）の上端が足元の線になるように置く
    const groundBand = 40 * bgScale;
    keys.forEach((k, i) => {
      const ts = scene.add
        .tileSprite(0, RUN_LAYOUT.groundY + groundBand, W / bgScale, texH, k)
        .setOrigin(0, 1)
        .setScale(bgScale)
        .setDepth(i + 1);
      this.bgLayers.push(ts);
    });

    const heroDef = UNIT_SPRITES.hero!;
    this.heroHasSprites = !!heroDef.anims?.idle && scene.anims.exists(animKey('hero', 'idle'));
    const origin = stillOrigin(heroDef);
    this.heroGlow = scene.add
      .sprite(RUN_LAYOUT.heroScreenX, RUN_LAYOUT.groundY, heroDef.key)
      .setOrigin(origin.originX, origin.originY)
      .setScale(heroDef.displayScale * 1.08)
      .setTintFill(COLORS.unguarded)
      .setAlpha(0)
      .setDepth(19);
    this.hero = scene.add
      .sprite(RUN_LAYOUT.heroScreenX, RUN_LAYOUT.groundY, heroDef.key)
      .setOrigin(origin.originX, origin.originY)
      .setScale(heroDef.displayScale)
      .setDepth(20);
    // 勇者の足元の ATB メーター
    const atbW = 110;
    scene.add
      .rectangle(RUN_LAYOUT.heroScreenX - atbW / 2, RUN_LAYOUT.groundY + 10, atbW, 12, 0x2a2638)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x0c0a12)
      .setDepth(21);
    this.atbBar = scene.add
      .rectangle(RUN_LAYOUT.heroScreenX - atbW / 2, RUN_LAYOUT.groundY + 10, atbW, 10, COLORS.atb)
      .setOrigin(0, 0.5)
      .setDepth(22);

    for (let i = 0; i < UI.maxEnemies; i++) {
      const sprite = scene.add.sprite(-500, 0, 'slime').setVisible(false);
      const hpBack = scene.add
        .rectangle(0, 0, 60, 8, COLORS.hpBack)
        .setOrigin(0, 0.5)
        .setVisible(false);
      const hp = scene.add.rectangle(0, 0, 60, 6, COLORS.hp).setOrigin(0, 0.5).setVisible(false);
      const status = scene.add.graphics().setVisible(false);
      const aim = scene.add
        .text(0, 0, '▼', textStyle(26, '#ffef60'))
        .setOrigin(0.5, 1)
        .setVisible(false);
      this.slots.push({ id: -1, sprite, hpBack, hp, status, aim, flashUntil: 0 });
    }
  }

  /** core の世界座標（足元 x）→ 画面 x */
  screenX(c: Combat, x: number): number {
    return RUN_LAYOUT.heroScreenX + (x - c.heroX);
  }

  enemyScreenPos(c: Combat, e: EnemyState): { x: number; y: number } {
    const def = UNIT_SPRITES[e.defId];
    const h = def ? def.frameHeight * def.displayScale : 96;
    return {
      x: this.screenX(c, e.x) + RUN_LAYOUT.enemyDrawOffsetX,
      y: RUN_LAYOUT.groundY - e.row * RUN_LAYOUT.rowOffsetY - h * 0.6,
    };
  }

  flashEnemy(id: number, now: number): void {
    const s = this.byId.get(id);
    if (s) s.flashUntil = now + 90;
  }

  heroHurt(now: number): void {
    this.heroHurtUntil = now + HERO_HIT_MS;
  }

  private release(s: EnemySlot): void {
    this.byId.delete(s.id);
    s.id = -1;
    s.sprite.setVisible(false);
    s.hpBack.setVisible(false);
    s.hp.setVisible(false);
    s.status.setVisible(false);
    s.aim.setVisible(false);
  }

  update(c: Combat, now: number): void {
    // 背景の多重スクロール
    const speeds = [0.1, 0.3, 0.6];
    this.bgLayers.forEach((l, i) => (l.tilePositionX = Math.floor((c.heroX * speeds[i]!) / 2)));

    // 勇者: 走り・攻撃（連鎖中）・被弾。無防備の間は輪郭を赤く
    // 仮素材のときだけ、上下の揺れ（走り）と傾け（連鎖中）で動きを出す。本素材は地面に接地したままモーションに任せる
    const placeholder = !this.heroHasSprites;
    const bob = placeholder && c.running ? Math.abs(Math.sin(now / 70)) * 6 : 0;
    this.hero.y = RUN_LAYOUT.groundY - bob;
    this.hero.setTint(now < this.heroHurtUntil ? 0xff8080 : 0xffffff);
    this.hero.setAngle(placeholder && c.unguarded ? Math.sin(now / 40) * 4 : 0);
    this.heroGlow.y = this.hero.y + (placeholder ? 4 : 0);
    this.heroGlow.setAngle(this.hero.angle);
    this.heroGlow.setAlpha(c.unguarded ? 0.55 + Math.sin(now / 60) * 0.25 : 0);
    // 優先順に並べ、本素材のある最初の動作を使う（被弾が未登録なら、連鎖中は攻撃を続ける）
    const state: UnitAnimName = c.unguarded ? 'attack' : c.running ? 'run' : 'idle';
    this.playHeroAnim(now < this.heroHurtUntil ? ['hit', state, 'idle'] : [state, 'idle']);
    this.atbBar.width = 110 * c.atbRatio;
    this.atbBar.setFillStyle(c.atbRatio >= 1 ? 0xfff8b0 : COLORS.atb);

    // 敵: 画面内だけを描く
    const minX = c.heroX - FIELD.viewBehind - 100;
    const maxX = c.heroX + (W - RUN_LAYOUT.heroScreenX) + 100;
    const seen = new Set<number>();
    let visible = 0;
    for (const e of c.enemies) {
      if (!e.alive || e.x < minX || e.x > maxX) continue;
      seen.add(e.id);
      let s = this.byId.get(e.id);
      if (!s) {
        s = this.slots.find((x) => x.id === -1);
        if (!s) continue; // プールが尽きたら描かない（core には影響しない）
        s.id = e.id;
        this.byId.set(e.id, s);
        const def = UNIT_SPRITES[e.defId]!;
        s.sprite
          .setTexture(def.key)
          .setOrigin(def.originX, def.originY)
          .setScale(def.displayScale)
          .setFlipX(true);
        s.sprite.setVisible(true);
        s.hpBack.setVisible(true);
        s.hp.setVisible(true);
        s.status.setVisible(true);
      }
      visible++;
      const def = UNIT_SPRITES[e.defId]!;
      const sx = this.screenX(c, e.x) + RUN_LAYOUT.enemyDrawOffsetX;
      const footY = RUN_LAYOUT.groundY - e.row * RUN_LAYOUT.rowOffsetY;
      const hgt = def.frameHeight * def.displayScale;
      const wob = Math.sin(now / 160 + e.id) * 2;
      s.sprite.setPosition(sx, footY + wob).setDepth(10 - e.row + (e.def.boss ? -1 : 0));
      s.sprite.setTint(now < s.flashUntil ? 0xff6060 : c.timeStopped ? 0x8090ff : 0xffffff);
      const barW = Math.min(120, def.frameWidth * def.displayScale * 0.6);
      const topY = footY - hgt * 0.85;
      s.hpBack
        .setPosition(sx - barW / 2, topY)
        .setSize(barW, 8)
        .setDepth(30);
      const ratio = Number.isFinite(e.maxHp) ? Math.max(0, e.hp / e.maxHp) : 1;
      s.hp
        .setPosition(sx - barW / 2, topY)
        .setSize(barW * ratio, 6)
        .setDepth(31);
      s.status.clear().setDepth(31);
      let k = 0;
      for (const st of e.statuses.keys()) {
        s.status.fillStyle(STATUS_COLOR[st], 1);
        s.status.fillCircle(sx - barW / 2 + 8 + k * 18, topY - 14, 7);
        s.status.lineStyle(2, 0x0c0a12, 1);
        s.status.strokeCircle(sx - barW / 2 + 8 + k * 18, topY - 14, 7);
        k++;
      }
      s.aim
        .setVisible(this.aimId === e.id)
        .setPosition(sx, topY - 18)
        .setDepth(32);
    }
    for (const s of this.slots) if (s.id !== -1 && !seen.has(s.id)) this.release(s);
    this.visibleEnemies = visible;
  }

  private playHeroAnim(candidates: readonly UnitAnimName[]): void {
    const def = UNIT_SPRITES.hero!;
    // 未登録の動作は次の候補へ。攻撃は1回再生で、状態が変わるまでやり直さない
    const chosen =
      candidates.find((n) => def.anims?.[n] && this.scene.anims.exists(animKey('hero', n))) ?? null;
    if (!chosen) return;
    const anim = def.anims![chosen]!;
    const key = animKey('hero', chosen);
    const { originX, originY } = animOrigin(def, anim);
    // 原点だけ切り替え、displayScale（×2・最近傍）はそのまま。140px の攻撃コマを 64px に縮めない
    for (const sprite of [this.hero, this.heroGlow]) {
      sprite.setOrigin(originX, originY);
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    }
  }

  /** 交戦範囲の目安（デバッグ表示用） */
  engageEdgeX(): number {
    return RUN_LAYOUT.heroScreenX + HERO.engageRange;
  }
}
