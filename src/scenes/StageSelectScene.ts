// 地域の一覧と敵情報（雑魚の傾向、ボスの出現順と特徴）
import { runTutorial } from '../ui/tutorial';
import Phaser from 'phaser';
import { endlessUnlocked, regionStars, sortieBlock } from '../core/economy';
import { PROGRESS } from '../config/balance';
import { sellOverflow } from './LoadoutScene';
import { BOSS_TRAITS, getEnemyDef } from '../data/enemies';
import { ENDLESS, REGIONS, regionBosses, type RegionDef } from '../data/regions';
import { UNIT_SPRITES, stillOrigin } from '../data/sprites';
import { sfx } from '../audio/sfx';
import { session } from '../platform/session';
import { getSave } from '../platform/store';
import { TopBar } from '../ui/kit/chrome';
import { Button, Pill, icon, panel, ribbon, bindTap } from '../ui/kit/widgets';
import { SKIN } from '../ui/kit/skin';
import { generateBackgroundTextures } from '../ui/textures';
import { COLORS, H, W, textStyle } from '../ui/theme';

const CARD_H = 300;
const CARD_TOP = 190;
/** 地域の一覧を見せる範囲の下端（下のボタンの上） */
const VIEW_BOTTOM = H - 190;

export class StageSelectScene extends Phaser.Scene {
  /** 地域ごとに、特徴を表示しているボス */
  private readonly traitOf = new Map<string, string>();
  private root!: Phaser.GameObjects.Container;
  /** 地域の一覧のスクロール（6地域は1画面に収まらない） */
  private scroll = 0;
  private dragged = false;

  constructor() {
    super('StageSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = getSave();
    const regionOk =
      session.regionId === ENDLESS.id
        ? endlessUnlocked(save)
        : !!session.regionId && save.progress.unlocked.includes(session.regionId);
    if (!regionOk) {
      session.regionId =
        save.progress.unlocked[save.progress.unlocked.length - 1] ?? REGIONS[0]!.id;
    }
    new TopBar(this, save);
    this.add.existing(ribbon(this, W / 2, 140, '地域を選ぶ', 320));
    this.root = this.add.container(0, 0);
    this.setupScroll();
    this.renderCards();
    // 選んでいる地域が見えるところまでスクロールしておく
    const idx = Math.max(
      0,
      REGIONS.findIndex((r) => r.id === session.regionId),
    );
    this.setScroll(idx * (CARD_H + 14) - 40);

    new Button(this, 120, H - 80, '戻る', () => this.scene.start('Base'), {
      width: 190,
      height: 88,
      skin: 'gray',
      icon: 'back',
    });
    new Button(this, 320, H - 80, '配置', () => this.scene.start('Loadout'), {
      width: 190,
      height: 88,
      skin: 'blue',
      icon: 'bag',
    });
    const block = sortieBlock(save);
    const go = new Button(this, W - 140, H - 80, '出撃！', () => this.scene.start('Run'), {
      width: 240,
      height: 100,
      fontSize: 38,
      skin: 'gold',
      icon: 'swords',
      disabled: block !== null,
    });
    if (!block)
      this.tweens.add({ targets: go, scale: 1.05, yoyo: true, repeat: -1, duration: 650 });
    if (block === 'noOrigin') {
      this.add
        .text(W / 2, H - 156, '起点がバックパックにありません', textStyle(22, COLORS.textWarn))
        .setOrigin(0.5);
    } else if (block === 'storageFull') {
      this.add
        .text(W / 2 - 90, H - 162, '倉庫があふれています', textStyle(22, COLORS.textWarn))
        .setOrigin(0.5);
      new Button(this, W / 2 + 150, H - 162, 'あふれた分を売る', () => sellOverflow(this), {
        width: 230,
        height: 56,
        fontSize: 20,
        skin: 'red',
      });
    }
    runTutorial(this, 'stage', [
      {
        rect: { x: W / 2, y: CARD_TOP + CARD_H / 2, w: W - 26, h: CARD_H + 6 },
        text: '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ',
      },
      {
        rect: { x: W - 140, y: H - 80, w: 256, h: 112 },
        text: '準備ができたら「出撃！」',
      },
    ]);
  }

  private setScroll(v: number): void {
    const content = (REGIONS.length + 1) * (CARD_H + 14);
    const view = VIEW_BOTTOM - CARD_TOP;
    this.scroll = Phaser.Math.Clamp(v, 0, Math.max(0, content - view + 10));
    this.root.y = -this.scroll;
  }

  /** 一覧をドラッグ（PCはホイール）でスクロール。動かしたあとの指離しはタップにしない */
  private setupScroll(): void {
    const mask = this.make.graphics({}, false);
    mask.fillRect(0, CARD_TOP - 14, W, VIEW_BOTTOM - CARD_TOP + 14);
    this.root.setMask(mask.createGeometryMask());
    let start: { y: number; scroll: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragged = false;
      start = p.y >= CARD_TOP - 14 && p.y <= VIEW_BOTTOM ? { y: p.y, scroll: this.scroll } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!start || !p.isDown) return;
      const dy = p.y - start.y;
      if (Math.abs(dy) > 12) this.dragged = true;
      if (this.dragged) this.setScroll(start.scroll - dy);
    });
    this.input.on('pointerup', () => {
      start = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.setScroll(this.scroll + dy);
    });
  }

  private renderCards(): void {
    this.root.removeAll(true);
    const save = getSave();
    [...REGIONS, ENDLESS].forEach((r, i) => {
      const y = CARD_TOP + i * (CARD_H + 14) + CARD_H / 2;
      const endless = r.id === ENDLESS.id;
      const unlocked = endless ? endlessUnlocked(save) : save.progress.unlocked.includes(r.id);
      const sel = session.regionId === r.id;
      const card = panel(this, W / 2, y, W - 30, CARD_H, 'panel').setInteractive({
        useHandCursor: true,
      });
      bindTap(card, () => {
        if (this.dragged) return;
        if (!unlocked) {
          sfx('error');
          return;
        }
        sfx('click');
        session.regionId = r.id;
        this.renderCards();
      });
      this.root.add(card);
      if (sel) {
        const glow = this.add.rectangle(W / 2, y, W - 34, CARD_H - 4).setStrokeStyle(6, 0xffd25a);
        this.root.add(glow);
        this.tweens.add({ targets: glow, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
      }
      this.thumbnail(r, 150, y - 40);
      // 地域の強さと戦利品（小窓の左上に重ねる）
      if (r.power.hp !== 1) {
        const label = this.add
          .text(
            48,
            y - 100,
            endless
              ? `敵HP×${r.power.hp}〜 攻撃×${r.power.atk}〜\n装備・ゴールドは出ない`
              : `敵HP×${r.power.hp} 攻撃×${r.power.atk}\nレア以上 +${Math.round(r.loot.rarityShift * 100)}%`,
            {
              ...textStyle(15, COLORS.gold, false),
              backgroundColor: '#0c0a12cc',
              padding: { x: 6, y: 3 },
            },
          )
          .setOrigin(0, 0);
        this.root.add(label);
      }
      this.root.add(
        this.add.text(
          270,
          y - 120,
          endless ? `∞ ${r.name}` : `${i + 1}. ${r.name}`,
          textStyle(endless ? 30 : 38, sel ? '#ffe27a' : COLORS.text),
        ),
      );
      const best = endless ? save.endless.bestLoop : save.progress.best[r.id];
      // ★: 3・6・10周目のボスを倒すごとに1つ（★ごとに攻撃+3%・最大HP+5）
      const stars = regionStars(save, r.id);
      const starText = '★'.repeat(stars) + '☆'.repeat(PROGRESS.starLoops.length - stars);
      const pill = new Pill(
        this,
        W - 140,
        y - 96,
        220,
        'star',
        endless
          ? best
            ? `最高${best}周`
            : '記録なし'
          : best
            ? `最高${best}周 ${starText}`
            : `未到達 ${starText}`,
        best ? COLORS.gold : COLORS.textDim,
      );
      this.root.add(pill);
      this.root.add(
        this.add.text(270, y - 66, `雑魚: ${r.mobTrend}`, textStyle(19, COLORS.textDim, false)),
      );
      // エンドレス: ボスは全地域から。自己ベストのダメージ
      if (endless)
        this.root.add(
          this.add.text(
            270,
            y - 30,
            `ボス: 全地域から毎周ランダム\n最高ダメージ ${save.endless.bestDamage.toLocaleString('ja-JP')}`,
            { ...textStyle(19, COLORS.text, false), lineSpacing: 4 },
          ),
        );
      // 周回ごとのボス候補（出撃ごとに抽選）。アイコンをタップで特徴
      (endless ? [] : r.bossPools).forEach((pool, k) => {
        const cx = 330 + k * 140;
        const by = y + 20;
        this.root.add(
          this.add
            .text(
              cx,
              by - 46,
              `${k + 1}周目${k === r.bossPools.length - 1 ? '〜' : ''}`,
              textStyle(17, '#ffe27a'),
            )
            .setOrigin(0.5),
        );
        const size = pool.length >= 3 ? 46 : 62;
        pool.forEach((b, m) => {
          const bx = cx + (m - (pool.length - 1) / 2) * (size + 4);
          const frame = this.add.image(bx, by, SKIN.round).setDisplaySize(size, size);
          frame.setInteractive({ useHandCursor: true });
          bindTap(frame, () => {
            if (!unlocked || this.dragged) return;
            sfx('click');
            this.traitOf.set(r.id, b);
            this.renderCards();
          });
          this.root.add(frame);
          const sel = this.traitOf.get(r.id) === b;
          if (sel) this.root.add(this.add.circle(bx, by, size / 2 + 3).setStrokeStyle(3, 0xffd25a));
          this.root.add(
            this.add
              .image(bx, by + 3, b)
              .setScale((0.62 * size) / 84)
              .setFlipX(!UNIT_SPRITES[b]?.facesLeft),
          );
        });
        if (k < r.bossPools.length - 1)
          this.root.add(
            this.add.text(cx + 70, by, '›', textStyle(30, COLORS.textDim)).setOrigin(0.5),
          );
      });
      const picked = this.traitOf.get(r.id);
      this.root.add(
        this.add.text(
          44,
          y + 70,
          picked
            ? `${getEnemyDef(picked).name}: ${BOSS_TRAITS[picked] ?? ''}`
            : endless
              ? '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す'
              : r.resistNote
                ? `${r.resistNote}（ボスはアイコンをタップで特徴）`
                : `ボスは出撃ごとに候補から選ばれます（${regionBosses(r).length}種）。アイコンをタップで特徴`,
          {
            ...textStyle(17, picked ? COLORS.text : COLORS.textDim, false),
            wordWrap: { width: W - 90, useAdvancedWrap: true },
            lineSpacing: 2,
          },
        ),
      );
      if (!unlocked) {
        this.root.add(this.add.rectangle(W / 2, y, W - 34, CARD_H - 8, 0x0c0a12, 0.78));
        this.root.add(icon(this, W / 2, y - 30, 'lock', 5));
        this.root.add(
          this.add
            .text(
              W / 2,
              y + 40,
              endless ? '魔王城で魔王を倒すと開放' : '前の地域の3周目のボスを倒すと開放',
              textStyle(24, COLORS.textDim),
            )
            .setOrigin(0.5),
        );
      }
    });
  }

  /** 地域の景色の小窓 */
  private thumbnail(r: RegionDef, cx: number, cy: number): void {
    const w = 220;
    const h = 130;
    this.root.add(panel(this, cx, cy, w + 16, h + 16, 'inset'));
    const keys = generateBackgroundTextures(this, r.id, r.bgColors, r.groundColor);
    const left = cx - w / 2;
    const top = cy - h / 2;
    this.root.add(this.add.rectangle(left, top, w, h, r.bgColors[0]).setOrigin(0, 0));
    for (const k of keys) {
      const src = this.textures.get(k).getSourceImage();
      const scale = w / src.width;
      const img = this.add
        .image(left, top + h, k)
        .setOrigin(0, 1)
        .setScale(scale);
      this.root.add(img);
    }
    // ボスは勇者の方（左）を向ける。本素材は左向きに描いてあり、仮素材は右向きなので反転する
    const boss = r.bossPools[0]![0]!;
    const bossDef = UNIT_SPRITES[boss]!;
    const bossOrigin = stillOrigin(bossDef);
    this.root.add(
      this.add
        .image(cx + 50, top + h - 12, boss)
        .setOrigin(bossOrigin.originX, bossOrigin.originY)
        .setScale(0.75)
        .setFlipX(!bossDef.facesLeft),
    );
    const heroOrigin = stillOrigin(UNIT_SPRITES.hero!);
    this.root.add(
      this.add
        .image(cx - 60, top + h - 12, 'hero')
        .setOrigin(heroOrigin.originX, heroOrigin.originY)
        .setScale(0.9),
    );
  }
}
