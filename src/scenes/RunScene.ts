// 出撃（最大30秒）。core の Combat を固定ステップで進め、出てきたイベントを描画するだけ
import { demoPending, runTutorial } from '../ui/tutorial';
import Phaser from 'phaser';
import { BUILD_RUN, MONETIZE, RARITY, RELIC, SIM } from '../config/balance';
import { addPet } from '../ui/cosmeticsView';
import { Combat, type CombatEvent, type RunConfig } from '../core/combat';
import { buildSubmission, endlessSeason } from '../core/ranking';
import { ownedArtifactIds, refillConsumables, totalStars } from '../core/economy';
import { randomSeed } from '../core/rng';
import { featureRules, runFeatures, runKindOf } from '../core/runRules';
import { runConfig } from '../core/runConfig';
import { buildRunConfig } from '../core/buildRun';
import { BuildRunUi } from '../ui/buildRunUi';
import { challengeOfPeriod } from '../core/challenge';
import { canStickRelic } from '../core/relics';
import { getRelic, type RelicId } from '../data/relics';
import { RelicPicker } from '../ui/relicPicker';
import type { ItemInstance, Loadout } from '../core/types';
import { getItemDef, RARITY_NAMES } from '../data/items';
import { getEnemyDef } from '../data/enemies';
import { setAudioSuspended, sfx, sfxChainStep, sfxCombo } from '../audio/sfx';
import { enterChallengeEdit, leaveChallengeEdit } from '../core/challengeLoadout';
import { debugFps, debugSeed, debugStress } from '../platform/debug';
import { hapticMedium, hapticSuccess } from '../platform/haptics';
import { onAppStateChange } from '../platform/lifecycle';
import { session, type ChallengeSortie } from '../platform/session';
import { gameSpeed, getSave, persist } from '../platform/store';
import { chainContext, showItemDetail } from '../ui/itemInfo';
import { BackpackView, originLabel } from '../ui/backpackView';
import { CharmStrip, charmStepLabel } from '../ui/charmStrip';
import { getBoard } from '../data/boards';
import { FieldView } from '../ui/fieldView';
import { avatar } from '../ui/kit/chrome';
import {
  Bar,
  Button,
  Pill,
  RoundButton,
  choiceDialog,
  fitText,
  icon,
  panel,
} from '../ui/kit/widgets';
import { iconKey } from '../data/sprites';
import { getRegion } from '../data/regions';
import { DamageNumbers, Effects, damageColor, stepTier } from '../ui/pools';
import { ElementFx } from '../ui/elementFx';
import { getTechnique, type TechniqueDef } from '../data/techniques';
import { scaleMs, techFxFor } from '../data/techFx';
import { earnReward, isPremium } from '../platform/monetization';
import { auraTier } from '../ui/aura';
import { DEMO_HERO, DEMO_REGION, demoLoadout } from '../data/demoLoadout';
import { chainHeat } from '../core/cellFxRules';
import { CellFx } from '../ui/cellFx';
import { COLORS, H, JUICE, RUN_LAYOUT, W, textStyle } from '../ui/theme';
import { num, t } from '../i18n';

const MAX_STEPS_PER_FRAME = 5;
const COMBO_COLOR: Record<string, string> = {
  shock: '#fff060',
  explode: '#ff8030',
  shatter: '#c8f0ff',
  purify: '#fff4b0',
  seal: '#c0a0ff',
  venom: '#a8f060',
  counter: '#ff7a5a',
};
const COMBO_TINT: Record<string, number> = {
  shock: 0xfff060,
  explode: 0xff8030,
  shatter: 0xc8f0ff,
  purify: 0xfff4b0,
  seal: 0xb080ff,
  venom: 0x8ae04a,
  counter: 0xff6a4a,
};

/** 時間延長の表示位置（周回ゲージ y=140 の下、帯 y=250 の上） */
const TIME_BONUS_Y = 188;

/** 段数の段階ごとの火花の色（5段・7段・10段） */
const STEP_SPARK: Record<number, number> = { 2: 0xffc84a, 3: 0xff6a3a, 4: 0xffffff };

export class RunScene extends Phaser.Scene {
  private combat!: Combat;
  private items!: ReadonlyMap<string, ItemInstance>;
  private elementFx!: ElementFx;
  private field!: FieldView;
  private view!: BackpackView;
  private numbers!: DamageNumbers;
  private effects!: Effects;
  private acc = 0;
  private paused = false;
  /** 装備の詳細を見ているあいだ止める（一時停止の幕は出さない） */
  private inspecting = false;
  /** 最初の出撃の体験ラン（伝説の装備を借りる） */
  private demo = false;
  /** 挑戦の出撃（なければ null） */
  private challenge: ChallengeSortie | null = null;
  /** Trial 「拾って組む」: what was brought (null: an ordinary run) and its hand and arrange UI */
  private brought: ItemInstance[] | null = null;
  private build: BuildRunUi | null = null;
  private cfg!: RunConfig;
  private season = 0;
  /** 警報を出したボス（敵の id） */
  private warned = new Set<number>();
  /** このランで記録の更新を知らせたもの */
  private recordShown = new Set<'step' | 'damage'>();
  /** 出撃前の記録（初めてなら null: 比べるものがない） */
  private bestBefore: { step: number; damage: number } | null = null;
  /** Mastery grows in this run (ordinary and endless runs) */
  private mastery = false;
  /** The cards a beaten boss offers (null when none is offered) */
  private picker: RelicPicker | null = null;
  /** The edge slots and the combo meter (null: not in this run) */
  private charmStrip: CharmStrip | null = null;
  /** The marks of the relics stuck on the board */
  private relicBadges!: Phaser.GameObjects.Container;
  private loadout!: Loadout;
  private speed = 1;
  /** ヒットストップ・スローモーション（実時間 ms） */
  private hitStopUntil = 0;
  private slowUntil = 0;
  private chainText!: Phaser.GameObjects.Text;
  /** 合流の知らせ（連鎖カウンターの下。コンボの帯に消されない） */
  private totalText!: Phaser.GameObjects.Text;
  private ending = false;
  private seed = 0;
  private regionId = '';
  private shake = true;
  /** Board effects as the chain rings each cell, and how hot this chain is (chainHeat) */
  private cellFx!: CellFx;
  private heat = 0;
  /** How many times each cell has been passed in this chain (gimmick loops come back) */
  private readonly passes = new Map<number, number>();
  private readonly stress = debugStress();
  private hud!: {
    timer: Phaser.GameObjects.Text;
    loop: Phaser.GameObjects.Text;
    hp: Bar;
    def: Bar;
    hpText: Phaser.GameObjects.Text;
    defText: Phaser.GameObjects.Text;
    next: Phaser.GameObjects.Text;
    nextBadge: Phaser.GameObjects.Text;
    loot: Pill;
    track: Phaser.GameObjects.Graphics;
    banner: Phaser.GameObjects.Text;
    fps: Phaser.GameObjects.Text | null;
    pause: Phaser.GameObjects.Container;
  };
  private trackKey = '';
  private consumableButtons: { icon: Phaser.GameObjects.Image | null; btn: RoundButton }[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('Run');
  }

  create(): void {
    const save = getSave();
    // 挑戦: 地域と乱数の種は全員同じ。強化と★は使わず、装備とゴールドは出ない
    this.challenge = session.challenge;
    session.challenge = null;
    this.brought = this.challenge ? null : session.build;
    session.build = null;
    this.build = null;
    this.demo = !this.challenge && !this.brought && demoPending();
    // 出撃前に、使い切った消耗品の枠を倉庫から入れ直す
    // 挑戦は挑戦用の配置で（消耗品の入れ直しも挑戦用の配置に）
    const challengeRules = this.challenge
      ? challengeOfPeriod(this.challenge.period).rules
      : undefined;
    if (this.challenge) {
      enterChallengeEdit(save, challengeRules!);
      refillConsumables(save);
      leaveChallengeEdit(save);
      persist();
    } else if (!this.demo && !this.brought && refillConsumables(save).length > 0) persist();
    this.warned = new Set();
    this.recordShown = new Set();
    this.bestBefore =
      this.demo || save.stats.runs === 0
        ? null
        : { step: save.stats.maxStep, damage: save.stats.maxDamage };
    this.regionId = this.challenge
      ? this.challenge.regionId
      : this.brought
        ? BUILD_RUN.regionId
        : this.demo
          ? DEMO_REGION
          : (session.regionId ?? save.progress.unlocked[0]!);
    this.seed = this.challenge ? this.challenge.seed : (debugSeed() ?? randomSeed());
    // 体験ランは、伝説の装備と、強化しきった勇者で（倉庫・記録には残らない）
    const kind = runKindOf({
      challenge: !!this.challenge,
      demo: this.demo,
      regionId: this.regionId,
    });
    if (kind === 'demo') {
      const demo = demoLoadout();
      const rules = featureRules(runFeatures('demo'));
      this.cfg = {
        seed: this.seed,
        regionId: this.regionId,
        loadout: demo.loadout,
        items: demo.items,
        hero: DEMO_HERO,
        consumableSlots: 0,
        demo: true,
        ownedArtifacts: ownedArtifactIds(save),
        ...(rules ? { rules } : {}),
      };
    } else if (this.brought) this.cfg = buildRunConfig(save, this.seed, this.brought);
    else this.cfg = runConfig(save, kind, this.regionId, this.seed, challengeRules);
    const loadout = this.cfg.loadout;
    this.loadout = loadout;
    this.items = this.cfg.items;
    this.shake = save.settings.shake;
    // Mastery grows from this run's rings and sparks (ordinary and endless runs)
    this.mastery = !this.brought && runFeatures(kind).mastery === 'grow';
    this.picker = null;
    this.combat = new Combat(this.cfg);
    // ランキングのシーズン（出撃した時点で決める）
    this.season = this.challenge ? this.challenge.period : endlessSeason(Date.now());
    this.acc = 0;
    this.paused = false;
    this.inspecting = false;
    this.speed = gameSpeed();
    this.hitStopUntil = 0;
    this.slowUntil = 0;
    this.ending = false;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.field = new FieldView(this, this.regionId, getSave().look);
    // Pet (challenge reward) hovers at the hero's upper left; not in the demo run
    if (!this.demo)
      addPet(this, save.look.pet, RUN_LAYOUT.heroScreenX - 84, RUN_LAYOUT.footY - 112, 2)?.setDepth(
        19,
      );

    this.field.setAura(auraTier(loadout, this.items));
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);
    this.elementFx = new ElementFx(this, 56, 40, RUN_LAYOUT.footY - 4);

    // 中段・下部の背景（石の額縁）
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, 0x120e1a)
      .setOrigin(0, 0)
      .setDepth(40);
    panel(this, W / 2, RUN_LAYOUT.middleTop + 86, W + 20, 176, 'panel').setDepth(40);
    this.consumableButtons = [];
    this.trackKey = '';
    this.view = new BackpackView(this, RUN_LAYOUT.backpackTop, loadout, this.items).setDepth(41);
    this.cellFx = new CellFx(this, this.view, this.effects, () => this.shake);
    this.charmStrip = this.cfg.charms
      ? new CharmStrip(this, this.view, getBoard(loadout.board), this.cfg.charms, {
          compact: true,
          meterAt: { x: RUN_LAYOUT.heroScreenX, y: RUN_LAYOUT.groundY - 262 },
        }).setDepth(42)
      : null;
    this.relicBadges = this.add.container(0, 0).setDepth(46);
    this.buildHud();
    this.buildConsumables();
    this.setupBackpackTap();
    // 連鎖カウンター（勇者の上）と連鎖の合計ダメージ
    this.chainText = this.add
      .text(RUN_LAYOUT.heroScreenX, RUN_LAYOUT.groundY - 210, '', textStyle(44))
      .setOrigin(0.5)
      .setDepth(65)
      .setAlpha(0);
    this.totalText = this.add
      .text(W / 2 + 80, 360, '', textStyle(52))
      .setOrigin(0.5)
      .setDepth(66)
      .setAlpha(0);

    this.unsubscribe = onAppStateChange((active) => {
      if (!active) this.setPaused(true);
    });
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      setAudioSuspended(false);
    });
    this.handleEvents(this.combat.drainEvents());
    if (this.brought) {
      // The run starts in the arrange time: the brought pieces wait in the hand
      this.combat.arranging = true;
      const items = this.cfg.items;
      this.build = new BuildRunUi(
        {
          scene: this,
          view: this.view,
          combat: this.combat,
          loadout,
          items,
          halted: () => this.paused || this.inspecting || this.ending,
          say: (text, color) => this.showBanner(text, color ?? COLORS.text),
        },
        this.brought.map((b) => items.get(b.uid)!),
      );
      return;
    }
    // 初めての出撃（体験ラン）: 止めて、しくみを案内する
    runTutorial(
      this,
      'run',
      [
        {
          rect: {
            x: W / 2,
            y: RUN_LAYOUT.backpackTop + this.view.gridHeight / 2,
            w: W - 40,
            h: this.view.gridHeight + 20,
          },
          text: t(
            this.demo
              ? '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！'
              : '盤面の装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！',
          ),
        },
        ...(this.demo
          ? [
              {
                rect: {
                  x: W / 2,
                  y: RUN_LAYOUT.backpackTop + this.view.gridHeight / 2,
                  w: W - 40,
                  h: this.view.gridHeight + 20,
                },
                text: t(
                  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる',
                ),
              },
            ]
          : []),
        // Hero's attack gauge (under the hero) and the "next chain" panel
        {
          rect: { x: RUN_LAYOUT.heroScreenX, y: RUN_LAYOUT.footY - 20, w: 200, h: 110 },
          text: t('勇者の足元のゲージがたまるたびに、\n起点が発火して、連鎖が始まるよ'),
        },
        {
          rect: {
            x: W / 2,
            y: RUN_LAYOUT.fieldHeight / 2 + 40,
            w: W,
            h: RUN_LAYOUT.fieldHeight - 90,
          },
          text: t(
            '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！',
          ),
        },
        {
          rect: { x: W / 2 + 74, y: 70, w: 210, h: 130 },
          text: t(
            this.demo
              ? '残り時間。ふだんは0になるか、\nHPがなくなると終わり'
              : '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ',
          ),
        },
        {
          rect: { x: W - 50, y: RUN_LAYOUT.middleTop + 86, w: 92, h: 92 },
          text: t(
            this.demo
              ? '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！'
              : '止めたいときはここ。撤退もできるよ',
          ),
        },
      ],
      {
        onStart: () => {
          this.inspecting = true;
        },
        onDone: () => {
          this.inspecting = false;
        },
      },
    );
  }

  private buildHud(): void {
    const d = 70;
    // 左上: 顔と HP（その上に防御値のゲージを重ねる）
    panel(this, 168, 58, 316, 96, 'plate').setDepth(d);
    avatar(this, 52, 58, 76).setDepth(d + 1);
    const hp = new Bar(this, 98, 46, 220, 30, 'red').setDepth(d + 1);
    const def = new Bar(this, 98, 34, 220, 14, 'blue').setDepth(d + 2);
    def.setRatio(0);
    const hpText = this.add
      .text(108, 46, '', textStyle(18))
      .setOrigin(0, 0.5)
      .setDepth(d + 3);
    icon(this, 112, 84, 'shield', 1.5).setDepth(d + 1);
    const defText = this.add
      .text(126, 84, '', textStyle(16, '#8ad0ff'))
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    // 中央上: 残り時間と周回の進み具合
    panel(this, W / 2 + 74, 44, 190, 70, 'plate').setDepth(d);
    const timer = this.add
      .text(W / 2 + 74, 42, "30'00", textStyle(44))
      .setOrigin(0.5)
      .setDepth(d + 1);
    const loop = this.add
      .text(W / 2 + 74, 86, t('{n}周目', { n: 1 }), textStyle(20, COLORS.gold))
      .setOrigin(0.5, 0)
      .setDepth(d + 1);
    const track = this.add.graphics().setDepth(d + 1);
    // 右上: 戦利品
    const loot = new Pill(this, W - 76, 44, 124, 'chest', '0', COLORS.gold).setDepth(d);
    const banner = this.add
      .text(W / 2, 250, '', textStyle(64, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(d + 5)
      .setAlpha(0);
    const fps = debugFps()
      ? this.add.text(10, 150, '', textStyle(16, COLORS.accentText, false)).setDepth(d + 10)
      : null;
    // 中段右: 次に発火する起点
    panel(this, W - 210, RUN_LAYOUT.middleTop + 86, 240, 116, 'inset').setDepth(d);
    // Inside the inset panel (right edge at W - 90)
    fitText(
      this.add
        .text(W - 316, RUN_LAYOUT.middleTop + 44, t('次の連鎖'), textStyle(18, COLORS.textDim))
        .setDepth(d + 1),
      220,
    );
    const nextBadge = this.add
      .text(W - 300, RUN_LAYOUT.middleTop + 100, '', textStyle(40, '#ffe27a'))
      .setOrigin(0.5)
      .setDepth(d + 1);
    const next = this.add
      .text(W - 262, RUN_LAYOUT.middleTop + 100, '', textStyle(24))
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    new RoundButton(this, W - 50, RUN_LAYOUT.middleTop + 86, 72, 'pause', null, () =>
      this.setPaused(true),
    ).setDepth(d);
    // 一時停止
    const pause = this.add.container(0, 0).setDepth(3000).setVisible(false);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', () => this.setPaused(false));
    pause.add([
      shade,
      panel(this, W / 2, H / 2, 480, 400, 'panel'),
      fitText(
        this.add.text(W / 2, H / 2 - 120, t('一時停止中'), textStyle(48, '#ffe27a')).setOrigin(0.5),
        440,
      ),
      new Button(this, W / 2, H / 2 - 10, t('再開'), () => this.setPaused(false), {
        width: 300,
        height: 88,
        skin: 'gold',
      }),
      new Button(this, W / 2, H / 2 + 100, t('撤退する'), () => this.retreat(), {
        width: 300,
        height: 80,
        fontSize: 26,
        skin: 'red',
        icon: 'back',
      }),
      fitText(
        this.add
          .text(
            W / 2,
            H / 2 + 162,
            this.brought
              ? t('試作のランは何も持ち帰りません')
              : t('ここまでの戦利品を持ち帰ります'),
            textStyle(18, COLORS.textDim),
          )
          .setOrigin(0.5),
        440,
      ),
    ]);
    this.hud = {
      timer,
      loop,
      hp,
      def,
      hpText,
      defText,
      next,
      nextBadge,
      loot,
      track,
      banner,
      fps,
      pause,
    };
  }

  private buildConsumables(): void {
    const slots = this.combat.consumables;
    // One column beside the board, on the side the player chose (easier to reach than the
    // middle band). x clears the frame and charm slots of the widest (5-column) board
    const x = getSave().settings.consumableSide === 'left' ? 56 : W - 56;
    slots.forEach((uid, i) => {
      const y = RUN_LAYOUT.backpackTop + 40 + i * 90;
      const it = uid ? this.items.get(uid) : undefined;
      const img = it ? this.add.image(0, 0, iconKey(it.defId)).setScale(4) : null;
      const btn = new RoundButton(this, x, y, 80, img, null, () => {
        if (this.paused || this.ending) return;
        if (this.combat.useConsumable(i)) {
          this.consumableButtons[i]!.icon?.destroy();
          this.consumableButtons[i]!.icon = null;
          this.handleEvents(this.combat.drainEvents());
        } else if (this.combat.consumables[i]) {
          sfx('error');
        }
      }).setDepth(70);
      this.consumableButtons.push({ icon: img, btn });
    });
  }

  /** 周回の進み具合: 群れの点 → ボスのドクロ */
  private drawTrack(): void {
    const c = this.combat;
    const groupIds = new Set<number>();
    const alive = new Set<number>();
    for (const e of c.enemies) {
      if (e.loop !== c.loop || e.escort || e.def.boss) continue;
      groupIds.add(e.group);
      if (e.alive) alive.add(e.group);
    }
    // The loop's own count (the build trial has more groups than the region)
    const n = c.layout?.groups.length ?? getRegion(this.regionId).groupCount;
    const cleared = groupIds.size - alive.size;
    const key = `${c.loop}:${cleared}`;
    if (key === this.trackKey) return;
    this.trackKey = key;
    const g = this.hud.track;
    g.clear();
    const x0 = 360;
    const x1 = 560;
    const y = 140;
    g.fillStyle(0x0c0a12, 0.8);
    g.fillRoundedRect(x0 - 14, y - 12, x1 - x0 + 28, 24, 12);
    const step = (x1 - x0) / n;
    g.fillStyle(0xffd25a, 1);
    g.fillRoundedRect(x0 - 8, y - 5, Math.min(x1 - x0 + 16, cleared * step + 16), 10, 5);
    for (let i = 0; i < n; i++) {
      const done = i < cleared;
      g.fillStyle(done ? 0xffd25a : 0x4a4460, 1);
      g.fillCircle(x0 + i * step, y, 7);
      g.lineStyle(2, 0x0c0a12, 1);
      g.strokeCircle(x0 + i * step, y, 7);
    }
    g.fillStyle(cleared >= n ? 0xe83c3c : 0x6a2030, 1);
    g.fillCircle(x1 + 6, y, 13);
    g.lineStyle(3, 0x0c0a12, 1);
    g.strokeCircle(x1 + 6, y, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x1 + 2, y - 2, 3);
    g.fillCircle(x1 + 10, y - 2, 3);
  }

  /** バックパックの装備をタップ: 止めて能力の詳細を出し、閉じたら再開 */
  private setupBackpackTap(): void {
    const loadout = this.loadout;
    const zone = this.add
      .zone(0, RUN_LAYOUT.backpackTop, W, this.view.gridHeight)
      .setOrigin(0, 0)
      .setDepth(45)
      .setInteractive();
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.paused || this.ending || this.inspecting) return;
      if (Math.hypot(p.x - p.downX, p.y - p.downY) > 16) return;
      // Build trial: no item card mid-fight (nothing may stop the fight but the arrange time)
      if (this.build && !this.combat.arranging && !this.picker) return;
      // While relics are offered, a tap on a cell sticks the chosen one
      if (this.picker) {
        this.picker.tapCell(this.view.cellAt(p.x, p.y));
        return;
      }
      const uid = loadout.cells[this.view.cellAt(p.x, p.y)];
      const it = uid ? this.items.get(uid) : undefined;
      if (!it) return;
      this.inspecting = true;
      setAudioSuspended(true);
      showItemDetail(this, it, {
        context: chainContext(loadout, this.items, it.uid),
        onClose: () => {
          this.inspecting = false;
          this.acc = 0;
          setAudioSuspended(false);
        },
      });
    });
  }

  /** 撤退: 一時停止を解いてランを終える（戦利品は持ち帰り） */
  private retreat(): void {
    if (this.ending || this.combat.ended) return;
    sfx('click');
    this.setPaused(false);
    this.combat.retreat();
    this.handleEvents(this.combat.drainEvents());
  }

  private setPaused(p: boolean): void {
    if (this.ending) return;
    this.paused = p;
    this.hud.pause.setVisible(p);
    setAudioSuspended(p);
    this.acc = 0;
  }

  override update(_time: number, delta: number): void {
    const now = this.time.now;
    const halted = this.paused || this.inspecting;
    // ヒットストップ中は止め、ボス撃破のあとはしばらくスロー
    const juice = now < this.hitStopUntil ? 0 : now < this.slowUntil ? JUICE.bossSlowRate : 1;
    // The choosing time runs in real time, whatever the game speed
    const offer = this.combat.relicOffer;
    const rate = offer ? 1 : this.speed * juice;
    if (!halted && !this.ending) {
      // ゲームスピード: 1フレームで進める固定ステップの数を倍にする（ルールの秒数は変えない）
      const maxSteps = Math.ceil(MAX_STEPS_PER_FRAME * this.speed);
      this.acc += Math.min((delta / 1000) * rate, SIM.fixedStep * maxSteps);
      let n = 0;
      while (this.acc >= SIM.fixedStep && n < maxSteps && !this.combat.ended) {
        this.combat.step();
        this.acc -= SIM.fixedStep;
        n++;
        this.handleEvents(this.combat.drainEvents());
      }
    }
    const dt = halted ? 0 : (delta / 1000) * this.speed * Math.max(juice, JUICE.bossSlowRate);
    // 止めているあいだも UI（詳細カードなど）の動きは通常の速さで動かす
    this.tweens.timeScale = halted ? 1 : this.speed;
    if (this.stress) {
      this.effects.burst(400 + Math.random() * 200, 300 + Math.random() * 150, 0xffffff, 12, 260);
      this.numbers.show(300 + Math.random() * 350, 280 + Math.random() * 180, Math.random() * 3000);
    }
    this.field.update(this.combat, now, halted ? 0 : rate);
    if (offer && this.picker)
      this.picker.setTimeLeft(
        (offer.until - this.combat.tick) / (RELIC.pickSeconds * SIM.ticksPerSecond),
      );
    // A special on screen holds while paused or while an item card is open
    this.field.techFx.setHalted(halted);
    this.checkBossApproach();
    this.build?.update();
    this.view.tick(now);
    this.numbers.update(dt);
    this.effects.update(dt);
    this.updateHud();
  }

  private updateHud(): void {
    const c = this.combat;
    const r = c.remaining;
    const sec = Math.floor(r);
    const cs = Math.floor((r - sec) * 100);
    this.hud.timer.setText(
      Number.isFinite(r) ? `${String(sec).padStart(2, '0')}'${String(cs).padStart(2, '0')}` : '∞',
    );
    this.hud.timer.setColor(r < 5 ? COLORS.textWarn : COLORS.text);
    // 走っているあいだは出撃時間が止まっている: タイマーを薄く
    this.hud.timer.setAlpha(c.running ? 0.45 : 1);
    const region = t(getRegion(this.regionId).name);
    // Between the HP plate (right edge x=326) and the loot pill (left edge x=582)
    fitText(
      this.hud.loop
        .setScale(1)
        .setText(
          this.speed !== 1
            ? t('{region}　{loop}周目　×{speed}', { region, loop: c.loop, speed: this.speed })
            : t('{region}　{loop}周目', { region, loop: c.loop }),
        ),
      230,
    );
    this.hud.hp.setRatio(c.hp / c.maxHp);
    this.hud.def.setRatio(Math.min(1, c.defense / c.maxHp));
    this.hud.hpText.setText(`${Math.ceil(c.hp)}/${c.maxHp}`);
    // Inside the HP plate (right edge x=326)
    fitText(this.hud.defText.setScale(1).setText(t('防御 {n}', { n: Math.round(c.defense) })), 190);
    const nextUid = c.nextOriginUid;
    const unit = c.nextUnit;
    const plan = nextUid ? c.planOf(nextUid) : undefined;
    if (unit && plan) {
      this.hud.nextBadge.setText(unit.map((u) => originLabel(c.originOrder.indexOf(u))).join(''));
      // Inside the "next chain" panel (right edge x=630)
      const params = { step: plan.maxStep, sec: plan.duration.toFixed(1) };
      fitText(
        this.hud.next
          .setScale(1)
          .setText(c.chain ? t('連鎖中！') : t('{step}連鎖・{sec}秒', params)),
        164,
      );
    }
    // The origin that fires next blinks
    this.view.setBlinkOrigin(c.chain ? null : (unit ?? null));
    this.hud.loot.setValue(`${c.drops.length}`);
    this.drawTrack();
    if (this.hud.fps) {
      // Developer overlay (debug flag only)
      this.hud.fps.setText(
        t('FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}', {
          fps: this.game.loop.actualFps.toFixed(0),
          enemies: this.field.visibleEnemies,
          particles: this.effects.activeCount(),
          numbers: this.numbers.activeCount(),
          seed: this.seed,
        }),
      );
    }
  }

  /** ヒットストップ（実時間 ms。重なったら長い方） */
  private hitStop(ms: number): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + ms);
  }

  /** 連鎖カウンター: 段数が進むほど大きく、色も白→金→赤→桃 */
  /**
   * A cell rang on the board: the line runs in to it as a ball of light in the colour of the gear it
   * left, the gear's element plays on the cell, a gimmick shows its work, and a loop coming back
   * lights up gold
   */
  private boardStep(
    index: number,
    cell: number,
    fromCell: number | null,
    uid: string,
    now: number,
  ): void {
    const plan = this.combat.chain?.plan;
    const ps = plan?.steps[index];
    const it = this.items.get(uid);
    const def = it ? getItemDef(it.defId) : undefined;
    if (fromCell !== null && fromCell !== cell) {
      const fromUid = this.cfg.loadout.cells[fromCell];
      const fromIt = fromUid ? this.items.get(fromUid) : undefined;
      const color = this.cellFx.colorOf(fromIt ? getItemDef(fromIt.defId) : undefined);
      this.view.flashLine(fromCell, cell, color);
      this.cellFx.orb(fromCell, cell, color);
    }
    if (def) this.cellFx.ring(cell, def, this.heat, now);
    // A new pass of this cell: its first ring (a stack rings bottom → top in one pass)
    if (!ps || ps.echo || (ps.ring ?? 0) !== 0) return;
    const pass = (this.passes.get(cell) ?? 0) + 1;
    this.passes.set(cell, pass);
    const gimmick = this.cfg.loadout.gimmicks?.[cell];
    if (gimmick) this.cellFx.gimmick(cell, gimmick);
    if (pass >= 2 && plan) {
      // The loop: back up the line to this cell's last pass
      const loop: number[] = [];
      for (let j = ps.parentIndex; j >= 0; j = plan.steps[j]!.parentIndex) {
        const c = plan.steps[j]!.cell;
        if (c === cell) break;
        if (!loop.includes(c)) loop.push(c);
      }
      this.cellFx.revisit(cell, pass, [cell, ...loop]);
    }
  }

  /**
   * The chain got hotter (5 / 10 / 20 / 40 steps): the board's frame glows hotter, the screen
   * jolts (harder each level) and a sound plays. No flash (it strobed). It never cools within a chain
   */
  private heatUp(level: number): void {
    if (level <= this.heat) return;
    this.heat = level;
    this.view.setHeat(level);
    sfx(level >= 3 ? 'openEpic' : 'openRare');
    if (this.shake) this.cameras.main.shake(120 + level * 30, 0.003 + 0.0015 * level);
  }

  private showChainCount(step: number): void {
    const txt = this.chainText;
    const colors = JUICE.chainColors;
    const color = colors[Math.min(colors.length - 1, Math.floor((step - 2) / 2))]!;
    this.tweens.killTweensOf(txt);
    txt
      .setText(`${step} CHAIN`)
      .setColor(color)
      .setFontSize(Math.min(72, 40 + step * 3))
      .setAlpha(1)
      .setScale(1.5)
      .setAngle(-4 + Math.random() * 8);
    this.tweens.add({ targets: txt, scale: 1, angle: 0, duration: 160, ease: 'Back.easeOut' });
  }

  /** 連鎖の終わり: カウンターを消し、合計ダメージを大きく出す */
  private endChainCount(total: number): void {
    this.tweens.killTweensOf(this.chainText);
    this.tweens.add({
      targets: this.chainText,
      alpha: 0,
      y: { from: RUN_LAYOUT.groundY - 210, to: RUN_LAYOUT.groundY - 240 },
      duration: 300,
      onComplete: () => this.chainText.setY(RUN_LAYOUT.groundY - 210),
    });
    if (total < JUICE.bigHit) return;
    const txt = this.totalText;
    this.tweens.killTweensOf(txt);
    txt
      .setText(`TOTAL ${num(total)}`)
      .setColor(damageColor(total))
      .setAlpha(1)
      .setScale(0.4)
      .setY(360);
    this.tweens.add({ targets: txt, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: txt, alpha: 0, y: 330, delay: 700, duration: 350 });
  }

  /** 時間が延びた: タイマーの横に「+8.0」が浮かび、タイマーが金色に光る */
  private showTimeBonus(seconds: number, capped: boolean): void {
    // 周回ゲージの下（地域名や一網打尽の帯と重ならない所）に出して、少し浮かせて消す。
    // ゲームスピードに関係なく同じ長さで見せる
    const txt = this.add
      .text(
        W / 2 + 74,
        TIME_BONUS_Y,
        seconds > 0 ? t('時間 +{sec}', { sec: seconds.toFixed(1) }) : t('時間 上限'),
        textStyle(34, capped && seconds <= 0 ? COLORS.textDim : '#ffe27a'),
      )
      .setOrigin(0.5)
      .setDepth(80);
    // Centered at W/2 + 74; stay left of the right screen edge
    fitText(txt, 2 * (W - (W / 2 + 74)) - 20);
    const k = this.speed;
    this.tweens.add({
      targets: txt,
      y: TIME_BONUS_Y - 18,
      alpha: 0,
      delay: 600 * k,
      duration: 600 * k,
      onComplete: () => txt.destroy(),
    });
    if (seconds > 0) {
      this.hud.timer.setTint(0xffe27a);
      this.time.delayedCall(400, () => this.hud.timer.clearTint());
      sfx('defense');
    }
  }

  /** ボスが画面に入ってくる少し前に「WARNING」（止めない。1.4秒ほど） */
  private checkBossApproach(): void {
    const c = this.combat;
    for (const e of c.enemies) {
      if (!e.alive || (!e.def.boss && !e.treasure) || this.warned.has(e.id)) continue;
      const p = this.field.enemyScreenPos(c, e);
      if (p.x > W + 160) continue;
      this.warned.add(e.id);
      if (e.treasure) {
        // It has come into view
        this.showBanner(t('黄金ゴブリンだ！ 逃げる前に倒せ！'), COLORS.gold);
        sfx('openEpic');
        hapticMedium();
      } else this.showWarning(t(e.def.name), c.loop);
    }
  }

  private showWarning(name: string, loop: number): void {
    const cy = 250;
    const root = this.add.container(0, 0).setDepth(70);
    const band = this.add.rectangle(W / 2, cy, W, 150, 0x8a0a10, 0.55);
    const lineT = this.add.rectangle(W / 2, cy - 75, W, 6, 0xff3030, 1);
    const lineB = this.add.rectangle(W / 2, cy + 75, W, 6, 0xff3030, 1);
    // 帯の上下を流れる小さな文字
    const tickerT = this.add
      .text(0, cy - 62, ' WARNING  '.repeat(10), textStyle(18, '#ffb0a0'))
      .setOrigin(0, 0);
    const tickerB = this.add
      .text(-W, cy + 44, ' WARNING  '.repeat(10), textStyle(18, '#ffb0a0'))
      .setOrigin(0, 0);
    const big = this.add.text(W / 2, cy - 10, 'WARNING', textStyle(72, '#ff4a3a')).setOrigin(0.5);
    const sub = fitText(
      this.add
        .text(
          W / 2,
          cy + 34,
          t('{loop}周目のボス　{name}', { loop, name }),
          textStyle(24, '#ffffff'),
        )
        .setOrigin(0.5),
      W - 40,
    );
    root.add([band, lineT, lineB, tickerT, tickerB, big, sub]);
    root.setAlpha(0);
    sfx('warning');
    this.tweens.add({ targets: root, alpha: 1, duration: 120 });
    this.tweens.add({ targets: tickerT, x: -W, duration: 1600 });
    this.tweens.add({ targets: tickerB, x: 0, duration: 1600 });
    this.tweens.add({ targets: big, alpha: 0.25, yoyo: true, repeat: 3, duration: 160 });
    this.tweens.add({
      targets: root,
      alpha: 0,
      delay: 1300,
      duration: 250,
      onComplete: () => root.destroy(),
    });
  }

  /** 記録の更新（1ランで種類ごとに1回）。勇者の上に小さく、テンポは止めない */
  private showRecord(kind: 'step' | 'damage'): void {
    if (this.recordShown.has(kind)) return;
    this.recordShown.add(kind);
    const x = RUN_LAYOUT.heroScreenX + 40;
    const txt = this.add
      .text(
        x,
        RUN_LAYOUT.groundY - 290 - this.recordShown.size * 4,
        t(kind === 'step' ? 'NEW RECORD! 最大連鎖' : 'NEW RECORD! 最大ダメージ'),
        { ...textStyle(26, '#ffffff'), backgroundColor: '#d8402a', padding: { x: 8, y: 3 } },
      )
      .setOrigin(0, 0.5)
      .setAngle(-6)
      .setDepth(67)
      .setAlpha(0);
    // Settle at a scale that keeps a long translation on screen (the pop-in tween scales from 2x)
    const fit = Math.min(1, (W - x - 10) / txt.width);
    txt.setScale(2 * fit);
    if (kind === 'damage' && this.recordShown.has('step')) txt.y += 40;
    sfx('openEpic');
    this.tweens.add({ targets: txt, alpha: 1, scale: fit, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: txt.y - 30,
      delay: 1600,
      duration: 400,
      onComplete: () => txt.destroy(),
    });
  }

  private showBanner(text: string, color = '#ffffff'): void {
    const b = this.hud.banner;
    this.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setAlpha(1).setAngle(-6);
    // Settle at a scale that keeps a long translation (e.g. an artifact name) on screen
    const fit = Math.min(1, (W - 40) / b.width);
    b.setScale(0.3 * fit);
    this.tweens.add({ targets: b, scale: fit, angle: 0, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: b, alpha: 0, y: { from: 250, to: 220 }, delay: 700, duration: 320 });
  }

  /**
   * A special technique: the shared special motion and the technique's effect. The target's
   * position is taken once, now; the big impact comes when the effect's body lands there
   * (the damage number is already shown)
   */
  private showTechnique(tech: TechniqueDef | undefined, enemyId: number): void {
    const p = this.enemyPos(enemyId);
    const fx = techFxFor(tech?.id);
    const timing = this.field.heroSpecial(tech?.id, p, this.speed);
    const burst = () => {
      if (p) {
        if (fx) this.elementFx.technique(fx.impact, p.x, p.y);
        this.effects.flash(p.x, p.y, fx?.color ?? 0xffffff, 4);
      }
      if (fx) this.field.techFx.screen(fx, this.shake);
      else if (this.shake) this.cameras.main.shake(140, 0.009);
    };
    // Through the effect's own timer, so it waits while the game is paused
    if (timing.landMs > 0) this.field.techFx.after(scaleMs(timing.landMs, this.speed), burst);
    else burst();
    this.hitStop(JUICE.hitStopMs.big);
    sfx('explode');
  }

  private enemyPos(id: number): { x: number; y: number } | null {
    const e = this.combat.enemies.find((x) => x.id === id);
    return e ? this.field.enemyScreenPos(this.combat, e) : (this.field.lastSeen.get(id) ?? null);
  }

  private handleEvents(events: CombatEvent[]): void {
    const now = this.time.now;
    const c = this.combat;
    for (const ev of events) {
      switch (ev.type) {
        case 'loopStart':
          // ボスの名前は、近づいてきたときの警報で出す
          break;
        case 'chainStart':
          this.field.aimId = ev.aimId;
          sfx('fire');
          this.heat = 0;
          this.view.setHeat(0);
          this.passes.clear();
          break;
        case 'step':
          this.field.aimId = c.chain
            ? (c.chain.exec[ev.index]?.aim ?? this.field.aimId)
            : this.field.aimId;
          this.view.glow(ev.cell, ev.step === null ? COLORS.accent : COLORS.chainLine, now, 450);
          if (ev.step !== null && !ev.whiff) this.heatUp(chainHeat(ev.step));
          this.boardStep(ev.index, ev.cell, ev.fromCell, ev.uid, now);
          if (ev.step !== null) {
            if (ev.whiff) sfx('whiff');
            else {
              sfxChainStep(ev.step);
              if (ev.step >= 2) this.showChainCount(ev.step);
              if (this.bestBefore && ev.step > this.bestBefore.step) this.showRecord('step');
            }
          }
          break;
        case 'hit': {
          if (this.bestBefore && !ev.nullified && Math.round(ev.damage) > this.bestBefore.damage)
            this.showRecord('damage');
          const p = this.enemyPos(ev.enemyId);
          if (!p) break;
          // 毒のじわじわダメージ: 緑の小さな数字だけ（演出は出さない）
          if (ev.dot) {
            this.numbers.show(p.x, p.y, ev.damage, '#8ae04a', false, 0);
            break;
          }
          const strength = Math.min(1, ev.damage / JUICE.hugeHit);
          this.field.flashEnemy(ev.enemyId, now, strength);
          if (ev.nullified) {
            this.numbers.showText(p.x, p.y, t('無効'), 26, '#a0a0b0');
            this.effects.flash(p.x, p.y, 0x8a8a9a, 1.2);
            sfx('hit');
            break;
          }
          this.numbers.show(
            p.x,
            p.y,
            ev.damage,
            ev.combo ? COMBO_COLOR[ev.combo] : undefined,
            ev.crit,
            ev.step,
          );
          if (ev.crit) this.effects.flash(p.x, p.y, 0xff7ad0, 2.2);
          // 深い段ほど、数字のまわりに火花と光
          const tier = stepTier(ev.step);
          if (tier >= 2)
            this.effects.burst(p.x, p.y - 30, STEP_SPARK[tier]!, 6 + tier * 5, 180 + tier * 60);
          if (tier >= 3) this.effects.flash(p.x, p.y, STEP_SPARK[tier]!, 1.6 + tier * 0.4);
          if (tier >= 4 && this.shake) this.cameras.main.shake(60, 0.004);
          const tint = ev.combo
            ? (COMBO_TINT[ev.combo] ?? 0xffffff)
            : ev.damage >= JUICE.bigHit
              ? 0xffd25a
              : 0xffffff;
          this.effects.slash(p.x, p.y, tint, 0.8 + strength * 0.8);
          // 属性ごとの演出（爆弾は炎の爆発）
          {
            const src = this.items.get(ev.itemUid);
            const element = src ? getItemDef(src.defId).element : 'fire';
            this.elementFx.hit(p.x, p.y, element, strength, src ? ev.combo : 'explode');
          }
          this.effects.burst(p.x, p.y, tint, 3 + Math.round(strength * 8), 160 + strength * 200);
          if (ev.damage >= JUICE.bigHit) {
            this.effects.flash(p.x, p.y, tint, 1.5 + strength * 2);
            this.hitStop(ev.damage >= JUICE.hugeHit ? JUICE.hitStopMs.huge : JUICE.hitStopMs.big);
            if (this.shake) this.cameras.main.shake(90 + strength * 90, 0.003 + strength * 0.007);
          }
          sfx('hit');
          break;
        }
        case 'spark': {
          // The technique is learned right now (its technique event follows)
          const name = t(getTechnique(ev.id)?.name ?? '');
          this.showBanner(t('閃いた！ {name}', { name }), '#ffe27a');
          this.slowUntil = now + JUICE.bossSlowMs;
          if (this.shake) this.cameras.main.flash(260, 255, 248, 200);
          sfx('openRare');
          hapticSuccess();
          break;
        }
        case 'technique': {
          this.showTechnique(getTechnique(ev.id), ev.enemyId);
          break;
        }
        case 'enrage':
          this.showBanner(t('激昂！'), COLORS.textWarn);
          if (this.shake) this.cameras.main.shake(260, 0.01);
          sfx('bossDown');
          break;
        case 'combo': {
          const p = this.enemyPos(ev.enemyId);
          this.showBanner(t(ev.label), COMBO_COLOR[ev.name] ?? '#ffffff');
          if (p) this.effects.burst(p.x, p.y, COMBO_TINT[ev.name] ?? 0xffffff, 24, 320);
          sfxCombo(ev.name);
          hapticMedium();
          this.hitStop(JUICE.hitStopMs.combo);
          if (p) this.effects.flash(p.x, p.y, COMBO_TINT[ev.name] ?? 0xffffff, 4, 0.3);
          // A jolt, not a white flash (flashes strobed during long chains)
          if (this.shake) this.cameras.main.shake(140, 0.007);
          break;
        }
        case 'enemyDeath': {
          const p = this.enemyPos(ev.enemyId);
          // 本素材があれば撃破モーション（逃げたときは出さない）
          if (!ev.fled) this.field.enemyDeath(ev.enemyId);
          if (p && !ev.fled)
            this.effects.burst(
              p.x,
              p.y,
              getEnemyDef(ev.defId).color,
              ev.boss ? 40 : 10,
              ev.boss ? 400 : 220,
            );
          if (p && !ev.fled) {
            this.effects.flash(p.x, p.y, 0xffffff, ev.boss ? 6 : 2, ev.boss ? 0.45 : 0.2);
            // コインが戦利品の表示へ飛んでいく
            this.effects.coins(p.x, p.y, W - 96, 44, ev.boss ? 12 : 3);
            this.hitStop(ev.boss ? JUICE.hitStopMs.boss : JUICE.hitStopMs.kill);
          }
          if (!ev.fled) sfx('enemyDown');
          break;
        }
        case 'drop': {
          this.build?.addDrop(ev.item);
          const p = this.enemyPos(ev.enemyId);
          if (p)
            this.numbers.showText(
              p.x,
              p.y - 40,
              `+${t(RARITY_NAMES[ev.item.rarity])}`,
              22,
              `#${RARITY[ev.item.rarity].color.toString(16).padStart(6, '0')}`,
            );
          sfx('drop');
          if (ev.item.rarity !== 'common') hapticMedium(); // レア以上の取得
          if (getItemDef(ev.item.defId).artifact) {
            this.showBanner(
              t('アーティファクト！ {name}', { name: t(getItemDef(ev.item.defId).name) }),
              '#ff8ce8',
            );
            if (p) this.effects.burst(p.x, p.y, 0xff8ce8, 40, 420);
            if (this.shake) this.cameras.main.flash(300, 255, 200, 255);
            sfx('openRare');
            hapticSuccess();
          }
          break;
        }
        case 'heroHit':
          this.field.heroHurt(now);
          this.field.enemyAttack(ev.enemyId);
          if (ev.damage > 0) {
            this.numbers.show(
              RUN_LAYOUT.heroScreenX,
              RUN_LAYOUT.groundY - 140,
              ev.damage,
              '#ff6060',
            );
            sfx('heroHurt');
            if (this.shake) this.cameras.main.shake(80, 0.004);
          }
          break;
        case 'charm':
          this.charmStrip?.pulse(ev.slot, charmStepLabel(ev.op, ev.value));
          this.charmStrip?.showMeter(ev.m);
          break;
        case 'charmDrop': {
          // Over the enemy, like an item drop (a boss's drop comes with the boss banner)
          const p = this.enemyPos(ev.enemyId);
          if (p) {
            this.numbers.showText(p.x, p.y - 80, t('アクセサリー！'), 28, '#ffd25a');
            this.effects.burst(p.x, p.y, 0xffd25a, 30, 380);
          }
          sfx('openEpic');
          hapticSuccess();
          break;
        }
        case 'chainEnd':
          this.field.aimId = null;
          this.heat = 0;
          this.view.setHeat(0);
          this.endChainCount(ev.totalDamage);
          this.charmStrip?.hideMeter();
          break;
        case 'guardUp': {
          // 鳴った防御装備から光の粒が飛んで防御値バーへ
          const cc = this.view.cellCenter(ev.cell);
          this.effects.absorb(
            cc.x,
            cc.y + RUN_LAYOUT.backpackTop,
            20 + 220 * Math.min(1, c.defense / c.maxHp),
            30,
            COLORS.defense,
            12,
          );
          sfx('defense');
          break;
        }
        case 'timeBonus':
          this.showTimeBonus(ev.seconds, ev.capped);
          if (ev.reason === 'sweep') this.showBanner(t('一網打尽！'), '#8be06a');
          break;
        case 'bossDefeated':
          this.showBanner(t('ボス撃破！'), COLORS.gold);
          this.slowUntil = now + JUICE.bossSlowMs;
          if (this.shake) this.cameras.main.flash(220, 255, 240, 200);
          sfx('bossDown');
          hapticSuccess();
          break;
        case 'consumable':
          this.showBanner(t(getItemDef(ev.defId).name), COLORS.accentText);
          sfx('openRare');
          break;
        case 'runEnd':
          if (this.build) {
            this.endBuild();
            break;
          }
          // 力尽きたら、1ランに1回だけ「広告を見て再開」を選べる
          // 挑戦は全員同じ条件で競うので、再開はなし
          if (
            ev.reason === 'dead' &&
            !this.demo &&
            !this.challenge &&
            !this.combat.revived &&
            !this.ending
          )
            this.askRevive();
          else this.finish();
          break;
        case 'revive':
          this.showBanner(t('復活！'), '#8be06a');
          if (this.shake) this.cameras.main.flash(260, 200, 255, 200);
          sfx('defense');
          break;
        case 'relicOffer':
          this.openRelicPicker(ev.ids);
          break;
        case 'relicStuck': {
          this.closeRelicPicker();
          this.drawRelicBadges();
          const def = getRelic(ev.id);
          if (def) this.showBanner(t('{name}を貼った！', { name: t(def.name) }), COLORS.gold);
          const c = this.view.cellCenter(ev.cell);
          this.effects.flash(this.view.x + c.x, this.view.y + c.y, 0xf8d040, 3, 0.4);
          sfx('openRare');
          hapticMedium();
          break;
        }
        case 'relicSkipped':
          this.closeRelicPicker();
          break;
        case 'treasure': {
          const p = this.enemyPos(ev.enemyId);
          if (ev.phase === 'caught') {
            this.showBanner(t('黄金ゴブリンを倒した！'), COLORS.gold);
            this.slowUntil = now + JUICE.bossSlowMs;
            if (this.shake) this.cameras.main.flash(240, 255, 230, 140);
            if (p) this.effects.coins(p.x, p.y, W - 96, 44, 16);
            sfx('openLegend');
            hapticSuccess();
          } else if (ev.phase === 'fled') {
            this.showBanner(t('黄金ゴブリンに逃げられた…'), COLORS.textDim);
            if (p) this.effects.burst(p.x, p.y, 0xc8c0b0, 18, 260);
            sfx('whiff');
          }
          break;
        }
        default:
          break;
      }
    }
  }

  /** The cards over the field, while the run waits */
  private openRelicPicker(ids: RelicId[]): void {
    this.picker?.close();
    const view = this.view;
    this.picker = new RelicPicker(this, ids, {
      cellAt: (x, y) => view.cellAt(x, y),
      cellRect: (cell) => {
        const c = view.cellCenter(cell);
        return {
          x: view.x + c.x - view.cell / 2,
          y: view.y + c.y - view.cell / 2,
          size: view.cell,
        };
      },
      cellCount: this.loadout.cells.length,
      canStick: (id, cell) => canStickRelic(this.loadout, this.items, this.combat.relics, id, cell),
      onPick: (id, cell) => {
        if (this.combat.placeRelic(id, cell)) this.handleEvents(this.combat.drainEvents());
      },
      onSkip: () => {
        sfx('click');
        if (this.combat.skipRelic()) this.handleEvents(this.combat.drainEvents());
      },
    });
  }

  private closeRelicPicker(): void {
    this.picker?.close();
    this.picker = null;
  }

  /** A round mark at the top right of each cell with a relic */
  private drawRelicBadges(): void {
    this.relicBadges.removeAll(true);
    const view = this.view;
    for (const [cell, id] of this.combat.relics) {
      const def = getRelic(id);
      if (!def) continue;
      const c = view.cellCenter(cell);
      const x = view.x + c.x + view.cell / 2 - 15;
      const y = view.y + c.y - view.cell / 2 + 15;
      this.relicBadges.add([
        this.add.circle(x, y, 14, 0x3a2a10).setStrokeStyle(3, 0xf8d040),
        fitText(this.add.text(x, y, t(def.mark), textStyle(16, '#fff2c0')).setOrigin(0.5), 24),
      ]);
    }
  }

  /** 力尽きたとき: 止めて、再開するか聞く */
  private askRevive(): void {
    this.inspecting = true;
    const sec = MONETIZE.reviveSeconds;
    const label = isPremium()
      ? t('再開する（HP全回復・+{sec}秒）', { sec })
      : t('▶ 広告を見て再開（HP全回復・+{sec}秒）', { sec });
    choiceDialog(
      this,
      t('力尽きた…'),
      [
        {
          label,
          skin: 'gold',
          onPick: () => {
            void earnReward(this).then((ok) => {
              this.inspecting = false;
              if (ok && this.combat.revive(MONETIZE.reviveSeconds)) {
                this.handleEvents(this.combat.drainEvents());
              } else this.finish();
            });
          },
        },
        { label: t('あきらめる'), skin: 'gray', onPick: () => this.giveUp() },
      ],
      t('1回のランで1回だけ再開できます'),
      undefined,
      true,
    );
  }

  private giveUp(): void {
    this.inspecting = false;
    this.finish();
  }

  /** Build trial: a short summary over the screen (nothing is kept), then again or home */
  private endBuild(): void {
    if (this.ending) return;
    this.ending = true;
    sfx('runEnd');
    const r = this.combat.result();
    const layer = this.add.container(0, 0).setDepth(3000);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0).setInteractive());
    layer.add(panel(this, W / 2, H / 2, 520, 500, 'panel'));
    layer.add(
      fitText(
        this.add
          .text(
            W / 2,
            H / 2 - 180,
            t(r.reason === 'dead' ? '力尽きた…' : '撤退！'),
            textStyle(44, '#ffe27a'),
          )
          .setOrigin(0.5),
        460,
      ),
    );
    const lines = [
      t('到達 {loop}周目', { loop: r.reachedLoop }),
      t('最大連鎖 {n}', { n: r.stats.maxStep }),
      t('最大ダメージ {n}', { n: num(r.stats.maxDamage) }),
      t('拾った装備 {n}', { n: r.drops.length }),
    ];
    layer.add(
      this.add
        .text(W / 2, H / 2 - 30, lines.join('\n'), textStyle(26))
        .setOrigin(0.5)
        .setAlign('center')
        .setLineSpacing(8),
    );
    const brought = this.brought;
    layer.add(
      new Button(
        this,
        W / 2,
        H / 2 + 120,
        t('もう一度'),
        () => {
          session.build = brought;
          this.scene.start('BuildPick');
        },
        { width: 300, height: 80, skin: 'gold' },
      ),
    );
    layer.add(
      new Button(this, W / 2, H / 2 + 210, t('拠点へ'), () => this.scene.start('Base'), {
        width: 300,
        height: 70,
        fontSize: 24,
        skin: 'gray',
      }),
    );
  }

  private finish(): void {
    if (this.ending) return;
    this.ending = true;
    sfx('runEnd');
    const r = this.combat.result();
    // 挑戦とエンドレスは、ランキングに送れる記録を作っておく（送るのは自己ベストのときだけ）
    const mode = this.challenge ? 'challenge' : this.regionId === 'endless' ? 'endless' : null;
    const save = getSave();
    session.lastResult = {
      regionId: this.regionId,
      result: r,
      seed: this.seed,
      demo: this.demo,
      ...(this.challenge ? { challenge: this.challenge } : {}),
      ...(this.mastery ? { mastery: true } : {}),
      ...(mode && !this.demo
        ? { submission: buildSubmission(mode, this.season, this.cfg, r, save, totalStars(save)) }
        : {}),
    };
    this.showBanner(
      t(
        this.demo
          ? '体験おわり！'
          : r.reason === 'dead'
            ? '力尽きた…'
            : r.reason === 'timeout'
              ? '時間切れ！'
              : '撤退！',
      ),
      r.reason === 'dead' ? COLORS.textWarn : COLORS.text,
    );
    this.time.delayedCall(1300, () => this.scene.start('Result'));
  }
}
