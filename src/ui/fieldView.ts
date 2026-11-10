// フィールドの描画（ラン・カカシで共用）。core の状態を写すだけで、core には何も書き戻さない。
// 画面外の敵は描画だけをカリングする（core では保持し、イベント列は変わらない）。
import Phaser from 'phaser';
import { ELITES, FIELD, HERO, UI, type EliteId } from '../config/balance';
import type { Combat, EnemyState } from '../core/combat';
import type { Status } from '../core/types';
import { getRegion } from '../data/regions';
import { UNIT_SPRITES, animKey, animOrigin, stillOrigin, type UnitAnimName } from '../data/sprites';
import { generateBackgroundTextures } from './textures';
import { HeroAura, type AuraTier } from './aura';
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
  shadow: Phaser.GameObjects.Ellipse;
  tag: Phaser.GameObjects.Text; // 精鋭の名札
  aim: Phaser.GameObjects.Text;
  flashUntil: number;
  knock: number; // のけぞりの量（px、時間で戻る）
  knockAt: number;
  /** 本素材のアニメで動かしている（揺らさない） */
  art: boolean;
  defId: string;
}

/** 精鋭の色（体の色味と名札） */
const ELITE_TINT: Record<EliteId, number> = { tough: 0xa8b8ff, swift: 0xffa0a0, golden: 0xffe070 };
const ELITE_TEXT: Record<EliteId, string> = {
  tough: '#a8c0ff',
  swift: '#ff9a9a',
  golden: '#ffe27a',
};

export class FieldView {
  readonly scene: Phaser.Scene;
  private readonly bgLayers: Phaser.GameObjects.TileSprite[] = [];
  readonly hero: Phaser.GameObjects.Sprite;
  private readonly heroGlow: Phaser.GameObjects.Sprite;
  private readonly atbBar: Phaser.GameObjects.Rectangle;
  private readonly slots: EnemySlot[] = [];
  private readonly byId = new Map<number, EnemySlot>();
  private heroHurtUntil = 0;
  private aura: HeroAura | null = null;
  /** 必殺モーションを続ける時刻 */
  private specialUntil = 0;
  private specialName: UnitAnimName = 'special';
  private lastNow = 0;
  /** 直前のフレームの連鎖（新しい連鎖の始まりを見分ける） */
  private lastChain: Combat['chain'] = null;
  /** 勇者の本素材（待機）が読み込まれているか */
  private readonly heroHasSprites: boolean;
  aimId: number | null = null;
  /** 最後に描いた敵の位置（倒れた直後の演出用） */
  /** 直近の update の速さ（止めているときは 0） */
  private lastRate = 1;
  readonly lastSeen = new Map<number, { x: number; y: number }>();
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
      .sprite(RUN_LAYOUT.heroScreenX, RUN_LAYOUT.footY, heroDef.key)
      .setOrigin(origin.originX, origin.originY)
      .setScale(heroDef.displayScale * 1.08)
      .setTintFill(COLORS.unguarded)
      .setAlpha(0)
      .setDepth(19);
    this.hero = scene.add
      .sprite(RUN_LAYOUT.heroScreenX, RUN_LAYOUT.footY, heroDef.key)
      .setOrigin(origin.originX, origin.originY)
      .setScale(heroDef.displayScale)
      .setDepth(20);
    // 足元の影
    scene.add
      .ellipse(RUN_LAYOUT.heroScreenX + 4, RUN_LAYOUT.footY - 2, 100, 16, 0x000000, 0.28)
      .setDepth(18);
    // 勇者の足元の ATB メーター
    const atbW = 110;
    scene.add
      .rectangle(RUN_LAYOUT.heroScreenX - atbW / 2, RUN_LAYOUT.footY + 12, atbW, 12, 0x2a2638)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x0c0a12)
      .setDepth(21);
    this.atbBar = scene.add
      .rectangle(RUN_LAYOUT.heroScreenX - atbW / 2, RUN_LAYOUT.footY + 12, atbW, 10, COLORS.atb)
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
      const shadow = scene.add.ellipse(0, 0, 60, 14, 0x000000, 0.25).setVisible(false);
      const tag = scene.add
        .text(0, 0, '', textStyle(16, '#ffe27a'))
        .setOrigin(0.5, 1)
        .setVisible(false);
      const aim = scene.add
        .text(0, 0, '▼', textStyle(26, '#ffef60'))
        .setOrigin(0.5, 1)
        .setVisible(false);
      this.slots.push({
        id: -1,
        sprite,
        hpBack,
        hp,
        status,
        shadow,
        tag,
        aim,
        flashUntil: 0,
        knock: 0,
        knockAt: 0,
        art: false,
        defId: '',
      });
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
      y: RUN_LAYOUT.footY - e.row * RUN_LAYOUT.rowOffsetY - h * 0.6,
    };
  }

  /** 被弾: 白く光ってのけぞる（strength はダメージの大きさに応じて 0〜1） */
  flashEnemy(id: number, now: number, strength = 0.3): void {
    const s = this.byId.get(id);
    if (!s) return;
    s.flashUntil = now + 70 + strength * 60;
    s.knock = Math.max(s.knock, 6 + strength * 18);
    s.knockAt = now;
  }

  /** 敵の本素材のアニメを再生する（原点もそのアニメに合わせる）。なければ false */
  private playEnemyAnim(s: EnemySlot, name: UnitAnimName, randomStart = false): boolean {
    const def = UNIT_SPRITES[s.defId];
    const anim = def?.anims?.[name];
    const key = def ? animKey(def.key, name) : '';
    if (!def || !anim || !this.scene.anims.exists(key)) return false;
    const { originX, originY } = animOrigin(def, anim);
    s.sprite.setOrigin(originX, originY);
    s.sprite.play(
      randomStart ? { key, startFrame: Math.floor(Math.random() * anim.frames) } : { key },
    );
    return true;
  }

  /** 敵の攻撃: 本素材の攻撃モーションを1回、終わったら移動に戻す */
  enemyAttack(id: number): void {
    const s = this.byId.get(id);
    if (!s?.art) return;
    if (!this.playEnemyAnim(s, 'attack')) return;
    s.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (s.id === id) this.playEnemyAnim(s, 'move');
    });
  }

  /** 敵の撃破: 本素材の撃破モーションをその場に残して再生し、終わったら消す。出したら true */
  enemyDeath(id: number): boolean {
    const s = this.byId.get(id);
    if (!s?.art) return false;
    const def = UNIT_SPRITES[s.defId]!;
    const anim = def.anims?.death;
    const key = animKey(def.key, 'death');
    if (!anim || !this.scene.anims.exists(key)) return false;
    const { originX, originY } = animOrigin(def, anim);
    const ghost = this.scene.add
      .sprite(s.sprite.x, s.sprite.y, key)
      .setOrigin(originX, originY)
      .setScale(def.displayScale)
      .setFlipX(s.sprite.flipX)
      .setDepth(s.sprite.depth);
    ghost.anims.timeScale = Math.max(1, this.lastRate);
    ghost.play(key);
    ghost.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 150,
        onComplete: () => ghost.destroy(),
      });
    });
    s.sprite.setVisible(false);
    return true;
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
    s.shadow.setVisible(false);
    s.tag.setVisible(false);
    s.aim.setVisible(false);
  }

  /** 必殺技: 勇者が前へ踏み込み、残像を引いて大きく構える（止めない。0.3秒ほど） */
  /** 戻り値: 必殺モーションの斬りつけまでのミリ秒（モーションがなければ 0） */
  heroSpecial(color: number, techId?: string): number {
    const h = this.hero;
    // 専用の必殺モーションがあれば、振り切るまでそれを使う（update で上書きしない）。技ごと → 共通の順
    const def = UNIT_SPRITES.hero!;
    const names: UnitAnimName[] = techId ? [`special_${techId}`, 'special'] : ['special'];
    const name = names.find((n) => def.anims?.[n] && this.scene.anims.exists(animKey('hero', n)));
    const sp = name ? def.anims![name]! : undefined;
    if (sp && name) {
      this.specialName = name;
      this.specialUntil = this.scene.time.now + (sp.frames / sp.fps) * 1000;
      this.playHeroAnim([name], true);
    }
    const baseX = RUN_LAYOUT.heroScreenX;
    this.scene.tweens.killTweensOf(h);
    h.x = baseX;
    // 続けて発動しても大きさがずれないよう、元の大きさに戻してから
    h.setScale(def.displayScale);
    // 残像
    for (let i = 0; i < 4; i++) {
      const g = this.scene.add
        .sprite(baseX + i * 12, h.y, h.texture.key, h.frame.name)
        .setOrigin(h.originX, h.originY)
        .setScale(h.scaleX * 1.05)
        .setTintFill(color)
        .setAlpha(0.55 - i * 0.1)
        .setDepth(19.5);
      this.scene.tweens.add({
        targets: g,
        x: g.x - 30,
        alpha: 0,
        delay: i * 40,
        duration: 260,
        onComplete: () => g.destroy(),
      });
    }
    // 専用モーションがあるときは、踏み込みと拡大はモーションに任せる（残像だけ重ねる）
    if (sp) return ((sp.impactFrame ?? 0) / sp.fps) * 1000;
    // 踏み込み → 戻る、一瞬大きく
    this.scene.tweens.add({
      targets: h,
      x: baseX + 44,
      duration: 90,
      yoyo: true,
      hold: 120,
      ease: 'Quad.easeOut',
    });
    const sx = h.scaleX;
    this.scene.tweens.add({
      targets: h,
      scaleX: sx * 1.18,
      scaleY: sx * 1.18,
      duration: 90,
      yoyo: true,
      hold: 120,
    });
    return 0;
  }

  /** 勇者のオーラ（置いている装備の強さで決まる） */
  setAura(tier: AuraTier): void {
    this.aura?.destroy();
    this.aura = new HeroAura(this.scene, this.hero.x, this.hero.y, tier, 110).setDepth(18.6);
  }

  /** speed: モーションの再生速度（ゲームスピード。止めているときは 0） */
  update(c: Combat, now: number, speed = 1): void {
    this.lastRate = speed;
    if (this.aura) {
      this.aura.setPosition(this.hero.x, RUN_LAYOUT.footY);
      this.aura.tick(Math.max(0, now - this.lastNow) / 1000);
    }
    this.lastNow = now;
    // 背景の多重スクロール
    const speeds = [0.1, 0.3, 0.6];
    this.bgLayers.forEach((l, i) => (l.tilePositionX = Math.floor((c.heroX * speeds[i]!) / 2)));

    // 勇者: 走り・攻撃（連鎖中）・被弾。無防備の間は輪郭を赤く
    // 仮素材のときだけ、上下の揺れ（走り）と傾け（連鎖中）で動きを出す。本素材は地面に接地したままモーションに任せる
    const placeholder = !this.heroHasSprites;
    this.hero.setTint(now < this.heroHurtUntil ? 0xff8080 : 0xffffff);
    this.hero.setAngle(placeholder && c.chain !== null ? Math.sin(now / 40) * 4 : 0);
    this.heroGlow.setAngle(this.hero.angle);
    this.heroGlow.setAlpha(c.unguarded ? 0.55 + Math.sin(now / 60) * 0.25 : 0);
    this.hero.anims.timeScale = speed;
    this.heroGlow.anims.timeScale = speed;
    // 優先順に並べ、本素材のある最初の動作を使う（被弾が未登録なら、走り中は走りを、連鎖中は攻撃を続ける）
    // 攻撃: 連鎖中はずっと（3段目までの守られている間も）。短い連鎖で先に終わっても、振り切るまで続ける。
    // 新しい連鎖が始まったら頭から再生し直す
    const newChain = c.chain !== null && c.chain !== this.lastChain;
    this.lastChain = c.chain;
    const attackKey = animKey('hero', 'attack');
    const swinging = this.hero.anims.currentAnim?.key === attackKey && this.hero.anims.isPlaying;
    // 必殺モーションは最後のコマまで再生しきるまで続ける
    const specialPlaying =
      (this.hero.anims.currentAnim?.key ?? '').startsWith('hero_special') &&
      this.hero.anims.isPlaying;
    const state: UnitAnimName =
      now < this.specialUntil || specialPlaying
        ? this.specialName
        : c.chain !== null || swinging
          ? 'attack'
          : c.running
            ? 'run'
            : 'idle';
    // 連鎖が続いている間は、振り終わるたびに次の一振りを始める（長い連鎖でも止まらない）
    const swingEnded =
      c.chain !== null &&
      this.hero.anims.currentAnim?.key === attackKey &&
      !this.hero.anims.isPlaying;
    this.playHeroAnim(
      now < this.heroHurtUntil ? ['hit', state, 'idle'] : [state, 'idle'],
      newChain || swingEnded,
    );
    // 足元（原点）は地面の線に固定。仮素材で走っているときだけ上下に揺らす
    const bob = placeholder && c.running ? Math.abs(Math.sin(now / 70)) * 6 : 0;
    this.hero.y = RUN_LAYOUT.footY - bob;
    this.heroGlow.y = this.hero.y + (placeholder ? 4 : 0);
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
        s.defId = e.defId;
        // 本素材は静止画の足元（待機・移動の原点）。仮素材は今までどおりコマの下端
        const origin = stillOrigin(def);
        s.sprite.anims.stop();
        s.sprite
          .setTexture(def.key)
          .setOrigin(origin.originX, origin.originY)
          .setScale(def.displayScale)
          .setFlipX(!def.facesLeft);
        s.art = this.playEnemyAnim(s, 'move', true);
        s.sprite.setVisible(true);
        s.hpBack.setVisible(true);
        s.hp.setVisible(true);
        s.status.setVisible(true);
        s.shadow.setVisible(true);
      }
      visible++;
      const def = UNIT_SPRITES[e.defId]!;
      const sx = this.screenX(c, e.x) + RUN_LAYOUT.enemyDrawOffsetX;
      const footY = RUN_LAYOUT.footY - e.row * RUN_LAYOUT.rowOffsetY;
      const hgt = (def.bodyHeight ?? def.frameHeight) * def.displayScale;
      // 本素材はアニメが跳ねるので揺らさない。アニメの速さはゲームの速さに合わせる
      const wob = s.art ? 0 : Math.sin(now / 160 + e.id) * 2;
      if (s.art) s.sprite.anims.timeScale = this.lastRate;
      this.lastSeen.set(e.id, { x: sx, y: footY - hgt * 0.6 });
      // のけぞり: 0.15秒かけて元の位置へ戻る（描画だけ。core の x は変えない）
      const kt = Math.min(1, (now - s.knockAt) / 150);
      const knock = s.knock * (1 - kt);
      if (kt >= 1) s.knock = 0;
      const depth = 10 - e.row + (e.def.boss ? -1 : 0);
      s.sprite.setPosition(sx + knock, footY + wob).setDepth(depth);
      s.shadow
        .setPosition(sx + knock, footY - 2)
        .setSize(def.frameWidth * def.displayScale * 0.5, e.def.boss ? 20 : 14)
        .setDepth(depth - 0.5);
      if (now < s.flashUntil) s.sprite.setTintFill(0xffffff);
      else
        s.sprite.setTint(
          c.timeStopped
            ? 0x8090ff
            : e.enraged
              ? 0xff8070
              : e.elite
                ? ELITE_TINT[e.elite]
                : 0xffffff,
        );
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
      s.tag
        .setVisible(!!e.elite)
        .setText(e.elite ? ELITES[e.elite].name : '')
        .setColor(e.elite ? ELITE_TEXT[e.elite] : '#ffffff')
        .setPosition(sx + barW / 2 - 4, topY - 6)
        .setDepth(32);
      s.aim
        .setVisible(this.aimId === e.id)
        .setPosition(sx, topY - 18)
        .setDepth(32);
    }
    for (const s of this.slots) if (s.id !== -1 && !seen.has(s.id)) this.release(s);
    this.visibleEnemies = visible;
  }

  private playHeroAnim(candidates: readonly UnitAnimName[], restart = false): UnitAnimName | null {
    const def = UNIT_SPRITES.hero!;
    // 未登録の動作は次の候補へ。攻撃は1回再生で、状態が変わるまでやり直さない
    const chosen =
      candidates.find((n) => def.anims?.[n] && this.scene.anims.exists(animKey('hero', n))) ?? null;
    if (!chosen) return null;
    const anim = def.anims![chosen]!;
    const key = animKey('hero', chosen);
    const { originX, originY } = animOrigin(def, anim);
    // 原点だけ切り替え、displayScale（×2・最近傍）はそのまま。140px の攻撃コマを 64px に縮めない
    for (const sprite of [this.hero, this.heroGlow]) {
      sprite.setOrigin(originX, originY);
      if (
        sprite.anims.currentAnim?.key !== key ||
        (restart && (chosen === 'attack' || chosen.startsWith('special')))
      )
        sprite.play(key);
    }
    return chosen;
  }

  /** 交戦範囲の目安（デバッグ表示用） */
  engageEdgeX(): number {
    return RUN_LAYOUT.heroScreenX + HERO.engageRange;
  }
}
