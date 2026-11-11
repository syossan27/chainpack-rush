// 拠点: 出撃、配置、倉庫（売却）、鍛冶屋（付け直し）、強化、カカシ、設定
import Phaser from 'phaser';
import { MONETIZE, PROGRESS, SIM, TIME_BONUS, UPGRADES, type UpgradeId } from '../config/balance';
import {
  backpackSize,
  buyUpgrade,
  canReorient,
  consumableSlots,
  equippedUids,
  heroStats,
  totalStars,
  upgradeMaxLevel,
  itemMap,
  adRemaining,
  recordAd,
  rerollCost,
  rerollItem,
  sellItems,
  sellPrice,
  specifyExits,
  storageCapacity,
  synthPlan,
  synthRate,
  synthesize,
  storageCount,
  upgradeCost,
} from '../core/economy';
import { Rng, randomSeed } from '../core/rng';
import type { SaveData } from '../core/save';
import type { Dir, ItemInstance, Rarity } from '../core/types';
import { DIRS } from '../core/types';
import { RARITY_NAMES, getItemDef } from '../data/items';
import { REGIONS, getRegion } from '../data/regions';
import { UNIT_SPRITES, animKey, iconKey, stillOrigin } from '../data/sprites';
import { sfx } from '../audio/sfx';
import { applySettings, getSave, persist } from '../platform/store';
import { ItemIcon } from '../ui/itemIcon';
import { describeItem, showItemDetail, type DetailAction } from '../ui/itemInfo';
import { ChestReveal } from '../ui/chestReveal';
import { resetTutorials, runTutorial, tutorialSeen } from '../ui/tutorial';
import { showAchievements } from '../ui/achievementToast';
import { checkAchievements } from '../core/achievements';
import { ACHIEVEMENTS } from '../data/achievements';
import {
  PREMIUM_PRICE,
  buyPremium,
  earnReward,
  isPremium,
  restorePurchases,
} from '../platform/monetization';
import { TECHNIQUES } from '../data/techniques';
import { HeroAura, auraTier } from '../ui/aura';
import { otherPresetUse, presetMark, presetName } from '../core/presets';
import {
  challengeStart,
  checkRules,
  currentChallenge,
  firstChallenge,
  rulesText,
} from '../core/challenge';
import { session } from '../platform/session';
import { devAllCosmetics, devChallengeOpen } from '../platform/debug';
import { LANG_NAMES, k, lang, num, t } from '../i18n';
import { READY_LANGS, applyLang, type LangSetting } from '../i18n/setup';
import { loadFonts } from '../ui/fonts';
import { RANK_REWARDS, endlessSeason, seasonLabel, titleId, type RankMode } from '../core/ranking';
import { nameText, rowName, sameName } from '../core/names';
import {
  addPet,
  applyHeroLook,
  cosmeticTexture,
  decoTexture,
  heroLookPreview,
} from '../ui/cosmeticsView';
import {
  COSMETICS,
  cosmeticsForBand,
  getCosmetic,
  isChallengeSeason,
  type CosmeticKind,
} from '../core/cosmetics';
import {
  claimSeasonRewards,
  fetchBoard,
  fetchMyRank,
  randomName,
  rankingReady,
  saveDeco,
  saveName,
} from '../platform/ranking';

/** ランキングの報酬は、起動してから1回だけ確かめる */
let rewardsChecked = false;
import { challengeLoadoutOf, fitToRules } from '../core/challengeLoadout';
import { ItemList } from '../ui/itemList';
import { TAB_BAR_H, TOP_BAR_H, TabBar, TopBar, goTab, type TabId } from '../ui/kit/chrome';
import type { IconName } from '../ui/kit/icons';
import {
  Button,
  RoundButton,
  bindTap,
  choiceDialog,
  confirmDialog,
  fitText,
  ink,
  panel,
  ribbon,
  type Choice,
} from '../ui/kit/widgets';
import { generateBackgroundTextures } from '../ui/textures';
import { COLORS, H, W, inkStyle, rarityCss, textStyle } from '../ui/theme';

type Page =
  | 'home'
  | 'storage'
  | 'smith'
  | 'upgrade'
  | 'settings'
  | 'help'
  | 'techs'
  | 'achievements'
  | 'challenge'
  | 'ranking'
  | 'wardrobe';

const DIR_ARROW: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };

const UPGRADE_ICON: Record<UpgradeId, IconName> = {
  maxHp: 'shield',
  atb: 'clock',
  attack: 'swords',
  runTime: 'hourglass',
  backpack: 'bag',
  consumableSlots: 'star',
  storage: 'chest',
};

const CONTENT_TOP = TOP_BAR_H + 8;
const CONTENT_BOTTOM = H - TAB_BAR_H - 8;

/** 拠点の勇者を地面の帯へ沈める量（論理px。勇者は×3表示なので 4ドット分） */
const HOME_HERO_SINK = 12;

/**
 * ヘルプの中身（数値は balance.ts と合わせる）
 * Translation keys, drawn with t(line, params): {n} = technique count, {price} = premium price.
 */
const HELP_SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: k('基本'),
    lines: [
      k(
        '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。',
      ),
      k('1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。'),
      k(
        '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。',
      ),
    ],
  },
  {
    title: k('ダメージの決まり方'),
    lines: [
      k('攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）'),
      k('・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンダリー×4'),
      k('・連鎖倍率：1段ごとに×1.2、6段目で上限×2.5（循環の環を通ると上限×4.0）'),
      k(
        '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2',
      ),
      k('・強化：拠点の「攻撃倍率」'),
      k('・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）'),
    ],
  },
  {
    title: k('ダメージを伸ばすコツ'),
    lines: [
      k(
        '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。',
      ),
      k(
        '・コンボを作る。状態を付ける装備（水筒・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。',
      ),
      k('・強い装備ほど後ろ（6段目以降）に置く。前の段は軽い装備や状態付与に。'),
      k('・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。'),
      k(
        '・装備の左下の✦は追加効果。先駆け（3段目まで強い）は短い連鎖に、締め（6段目以降強い）は長い連鎖に向きます。',
      ),
    ],
  },
  {
    title: k('必殺技'),
    lines: [
      k(
        '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。',
      ),
      k(
        '・必殺技は全部で{n}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。',
      ),
    ],
  },
  {
    title: k('短い連鎖と長い連鎖'),
    lines: [
      k(
        '・次の発火までの待ちは、直前の連鎖の段数に比例します。短い連鎖は回転が速く、長い連鎖は一撃が大きい。',
      ),
      k('・連鎖中は無防備（被ダメージ×1.5）。ただし3段目までは守りが残ります。'),
      k(
        '・無防備中に大きく被弾すると「よろめき」、残りの段が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。',
      ),
    ],
  },
  {
    title: k('地域と敵'),
    lines: [
      k(
        '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。',
      ),
      k(
        '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。',
      ),
      k('・アーティファクトはごくまれに出る特別な装備です。'),
    ],
  },
  {
    title: k('ご褒美とプレミアム'),
    lines: [
      k(
        '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。',
      ),
      k(
        '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。',
      ),
    ],
  },
  {
    title: k('倉庫・鍛冶屋・合成'),
    lines: [
      k(
        '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。',
      ),
      k(
        '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。',
      ),
      k(
        '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。',
      ),
      k(
        '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。',
      ),
      k(
        '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。',
      ),
      k(
        '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。',
      ),
      k(
        '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンダリー25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。',
      ),
    ],
  },
];

/** 必殺技図鑑の名前の色（属性） */
const TECH_CSS: Partial<Record<string, string>> = {
  fire: '#c84a10',
  thunder: '#b08a00',
  ice: '#2a7aa8',
  physical: '#5a3a20',
};

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export class BaseScene extends Phaser.Scene {
  private page: Page = 'home';
  private root!: Phaser.GameObjects.Container;
  private selected: string | null = null;
  private specify: Dir[] = [];
  /** 倉庫の「まとめて売る」で選んでいる uid（null = 選ぶモードではない） */
  private sellPick: Set<string> | null = null;
  /** 鍛冶屋のモード */
  private smithMode: 'reorient' | 'synth' = 'reorient';
  /** 一括売却で、追加効果（✦）つきの装備を残すか */
  private keepAffixes = true;
  /** 拠点のオーラを毎フレーム動かす（描き直すたびに付け替える） */
  private auraTick: ((t: number, dt: number) => void) | null = null;
  private toast: Phaser.GameObjects.Text | null = null;
  private rankTab: RankMode = 'challenge';
  private rankGen = 0;

  constructor() {
    super('Base');
  }

  init(data: { page?: Page }): void {
    this.page = data.page ?? 'home';
    this.selected = null;
    this.sellPick = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.render();
  }

  private go(page: Page): void {
    this.page = page;
    this.selected = null;
    this.specify = [];
    this.sellPick = null;
    this.render();
  }

  /** Home "出撃" (shared by the button and the tutorial's action step) */
  private goSortie(): void {
    this.scene.start('StageSelect');
  }

  private showToast(msg: string, warn = false): void {
    this.toast?.destroy();
    this.toast = this.add
      .text(W / 2, CONTENT_BOTTOM - 30, msg, textStyle(30, warn ? COLORS.textWarn : COLORS.gold))
      .setOrigin(0.5)
      .setDepth(2000);
    const toast = fitText(this.toast, W - 40);
    this.tweens.add({
      targets: toast,
      y: toast.y - 40,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => toast.destroy(),
    });
  }

  private render(): void {
    this.root?.destroy();
    this.input.removeAllListeners('pointermove');
    this.input.removeAllListeners('pointerup');
    this.root = this.add.container(0, 0);
    const save = getSave();
    // 実績（合成で手に入れた装備・見つけた必殺技など、拠点で満たしたもの）
    const achieved = checkAchievements(save);
    if (achieved.length > 0) {
      persist();
      showAchievements(this, achieved, CONTENT_TOP + 70, 300);
    }
    if (this.page !== 'home')
      this.root.add(this.add.rectangle(0, 0, W, H, COLORS.bg).setOrigin(0, 0));
    switch (this.page) {
      case 'home':
        this.renderHome();
        break;
      case 'storage':
        this.renderStorage();
        break;
      case 'smith':
        this.renderSmith();
        break;
      case 'upgrade':
        this.renderUpgrade();
        break;
      case 'settings':
        this.renderSettings();
        break;
      case 'help':
        this.renderHelp();
        break;
      case 'techs':
        this.renderTechs();
        break;
      case 'achievements':
        this.renderAchievements();
        break;
      case 'challenge':
        this.renderChallenge();
        break;
      case 'ranking':
        this.renderRanking();
        break;
      case 'wardrobe':
        this.renderWardrobe();
        break;
    }
    this.root.add(new TopBar(this, save, () => this.go('settings')));
    const tab: TabId =
      this.page === 'settings' ||
      this.page === 'help' ||
      this.page === 'techs' ||
      this.page === 'achievements' ||
      this.page === 'challenge' ||
      this.page === 'ranking' ||
      this.page === 'wardrobe'
        ? 'home'
        : this.page;
    this.root.add(
      new TabBar(this, tab, (id) => {
        sfx('click');
        if (id === 'loadout') goTab(this, id);
        else this.go(id);
      }),
    );
    this.maybeTutorial();
  }

  // ---- ホーム ----
  private renderHome(): void {
    const save = getSave();
    const regionId = save.progress.unlocked[save.progress.unlocked.length - 1] ?? REGIONS[0]!.id;
    const region = getRegion(regionId);
    // 最後に開放した地域の景色の中に勇者が立つ
    const groundY = 600;
    this.root.add(this.add.rectangle(0, 0, W, groundY + 60, region.bgColors[0]).setOrigin(0, 0));
    const keys = generateBackgroundTextures(this, region.id, region.bgColors, region.groundColor);
    keys.forEach((key) => {
      const h = this.textures.get(key).getSourceImage().height;
      this.root.add(
        this.add
          .tileSprite(0, groundY + 80, W / 2, h, key)
          .setOrigin(0, 1)
          .setScale(2),
      );
    });
    this.root.add(this.add.rectangle(0, groundY + 80, W, H, 0x120e1a).setOrigin(0, 0));

    const logo = this.add
      .text(W / 2, 170, 'Chainpack Rush', textStyle(66, '#ffe27a'))
      .setOrigin(0.5);
    const sub = this.add
      .text(W / 2, 228, '30-Second Loot Chains', textStyle(24, '#fff6d0'))
      .setOrigin(0.5);
    this.root.add([logo, sub]);
    const glow = this.add
      .image(W / 2, groundY - 90, 'sk_glow')
      .setScale(5, 3)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    const heroOrigin = stillOrigin(UNIT_SPRITES.hero!);
    // 足元の線ちょうどだと浮いて見えるので、地面の帯へ少し沈めて影を敷く
    const footY = groundY + HOME_HERO_SINK;
    const shadow = this.add.ellipse(W / 2 + 6, footY - 2, 150, 22, 0x000000, 0.28);
    const hero = this.add
      .sprite(W / 2, footY, 'hero')
      .setScale(3)
      .setOrigin(heroOrigin.originX, heroOrigin.originY);
    // 置いている装備の強さで、勇者にオーラ
    const aura = new HeroAura(this, W / 2, footY, auraTier(save.loadout, itemMap(save)), 170);
    this.root.add([glow, shadow, aura, hero]);
    // Pet (challenge reward) flies at the hero's upper left
    const pet = addPet(this, save.look.pet, W / 2 - 120, footY - 128, 4);
    if (pet) this.root.add(pet);
    if (this.auraTick) this.events.off('update', this.auraTick);
    this.auraTick = (_t: number, dt: number) => {
      if (aura.active) aura.tick(dt / 1000);
    };
    this.events.on('update', this.auraTick);
    // 本素材があれば地面に立ったまま待機モーション。仮素材のときだけ上下に揺らす
    const idleKey = animKey('hero', 'idle');
    if (this.anims.exists(idleKey)) {
      hero.play(idleKey);
    } else {
      this.tweens.add({
        targets: hero,
        y: footY - 8,
        yoyo: true,
        repeat: -1,
        duration: 800,
        ease: 'Sine.easeInOut',
      });
    }
    this.tweens.add({ targets: glow, alpha: 0.15, yoyo: true, repeat: -1, duration: 1200 });

    // 左右の丸ボタン（イベントアイコン風）
    const scare = this.add.image(0, 6, 'scarecrow').setScale(1.4);
    this.root.add(
      new RoundButton(this, 70, 340, 96, scare, t('カカシ'), () => this.scene.start('Dummy')),
    );
    this.root.add(new RoundButton(this, 70, 480, 96, 'gear', t('設定'), () => this.go('settings')));
    this.root.add(new RoundButton(this, 70, 620, 96, 'book', t('ヘルプ'), () => this.go('help')));
    this.root.add(
      new RoundButton(this, 70, 760, 96, 'star', t('ランキング'), () => this.go('ranking')),
    );
    this.claimRankRewards();
    // 2週替わりの挑戦（始まるまでは予告）。開いていて今回まだ遊んでいなければ印を付ける
    const ch = currentChallenge(Date.now(), challengeStart(devChallengeOpen()));
    this.root.add(
      new RoundButton(this, W - 70, 760, 96, 'clock', t('挑戦'), () =>
        this.go('challenge'),
      ).setBadge(!!ch && save.challenge.period !== ch.period),
    );
    const block = storageCount(save) > storageCapacity(save);
    this.root.add(
      new RoundButton(this, W - 70, 340, 96, 'chest', t('倉庫'), () => this.go('storage')).setBadge(
        block,
      ),
    );
    this.root.add(
      new RoundButton(this, W - 70, 480, 96, 'anvil', t('鍛冶屋'), () => this.go('smith')),
    );
    this.root.add(
      new RoundButton(this, W - 70, 620, 96, 'crown', t('図鑑'), () => this.go('techs')),
    );

    // 出撃
    const sortie = new Button(this, W / 2, 760, t('出撃'), () => this.goSortie(), {
      width: 460,
      height: 116,
      fontSize: 48,
      skin: 'gold',
      icon: 'swords',
    });
    this.root.add(sortie);
    this.tweens.add({
      targets: sortie,
      scale: 1.04,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });
    if (block) {
      this.root.add(
        fitText(
          this.add
            .text(
              W / 2 + 40, // 左のランキングの文字に重ねない
              830,
              t('倉庫があふれています。売却するまで出撃できません'),
              textStyle(19, COLORS.textWarn),
            )
            .setOrigin(0.5),
          // Stay between the left and right round-button captions
          W - 220,
        ),
      );
    }

    // プレミアムの案内（出撃ボタンの下、軽く）
    this.addPremiumBar(878);

    // 記録（羊皮紙）
    const st = save.stats;
    const py = 1032;
    this.root.add(panel(this, W / 2, py, W - 60, 220, 'paper'));
    this.root.add(ink(this, 70, py - 92, t('冒険の記録'), 26, '#7a3c10'));
    const rows: [string, string][] = [
      [t('出撃|stat'), t('{n}回', { n: st.runs })],
      [t('最大連鎖'), t('{n}段', { n: st.maxStep })],
      [t('最大ダメージ'), `${st.maxDamage}`],
      [t('開放した地域'), `${save.progress.unlocked.length}/${REGIONS.length}`],
    ];
    rows.forEach(([label, v], i) => {
      const x = i % 2 === 0 ? 70 : W / 2 + 20;
      const y = py - 40 + Math.floor(i / 2) * 56;
      const value = ink(this, x + 270, y, v, 26).setOrigin(1, 0);
      // The label must end before the right-aligned value
      this.root.add(fitText(ink(this, x, y, label, 22, '#7a5a30'), 270 - value.width - 12));
      this.root.add(value);
    });
    const bests = REGIONS.filter((r) => save.progress.best[r.id]).map((r) =>
      t('{region} {n}周', { region: t(r.name), n: save.progress.best[r.id] ?? 0 }),
    );
    this.root.add(
      fitText(
        ink(
          this,
          70,
          py + 70,
          t('最高到達: {list}', {
            list: bests.length ? bests.join(t('　|sep')) : t('まだありません'),
          }),
          20,
          '#7a5a30',
        ),
        W - 140,
      ),
    );
  }

  // ---- 倉庫（売却） ----
  private renderStorage(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('倉庫')));
    const eq = equippedUids(save);
    // タップで能力の詳細。売却はカードから
    const openDetail = (it: ItemInstance): void => {
      showItemDetail(this, it, {
        onLockChange: () => {
          this.render();
          openDetail(it);
        },
        actions: [
          ...(getItemDef(it.defId).kind === 'consumable' || getItemDef(it.defId).artifact
            ? []
            : [this.synthAction(it, () => openDetail(it))]),
          {
            label: it.locked ? t('ロック中') : t('売る {price}G', { price: sellPrice(it) }),
            skin: 'gold',
            icon: 'coin',
            disabled: !!it.locked,
            onTap: () => {
              const sell = () => {
                const g = sellItems(save, [it.uid]);
                persist();
                sfx('drop');
                this.render();
                this.showToast(`+${g}G`);
              };
              // ほかの編成で使っている装備は、編成から外れることを確認する
              const usedIn = otherPresetUse(save).get(it.uid);
              if (usedIn && usedIn.length > 0)
                confirmDialog(
                  this,
                  t('編成で使っている装備'),
                  t('{presets}で使っています。\n売ると、その編成のマスは空きになります', {
                    presets: usedIn.map((i) => presetName(save, i)).join(t('・|sep')),
                  }),
                  t('売る'),
                  sell,
                );
              // アーティファクトは誤って売らないよう確認する
              else if (getItemDef(it.defId).artifact)
                confirmDialog(
                  this,
                  t('アーティファクトを売る'),
                  t('{item}を{price}Gで売ります', {
                    item: t(getItemDef(it.defId).name),
                    price: sellPrice(it),
                  }),
                  t('売る'),
                  sell,
                );
              else sell();
            },
          },
        ],
      });
    };
    // まとめて売る: 選ぶモードではタップで選択／解除し、最後にまとめて売る
    const pick = this.sellPick;
    const presetUses = otherPresetUse(save);
    const stored = () => getSave().inventory.filter((i) => !eq.has(i.uid));
    const list = new ItemList(
      this,
      CONTENT_TOP + 84,
      900,
      {
        onTap: (it) => {
          if (!pick) return openDetail(it);
          if (it.locked) {
            sfx('error');
            this.showToast(t('ロック中の装備は売れません'), true);
            return;
          }
          if (presetUses.has(it.uid)) {
            sfx('error');
            this.showToast(t('ほかの編成で使っている装備です（詳細から売れます）'), true);
            return;
          }
          if (pick.has(it.uid)) pick.delete(it.uid);
          else pick.add(it.uid);
          sfx('click');
          list.setItems(stored());
          refreshPick();
        },
        onLongPress: openDetail,
      },
      (it) => (pick?.has(it.uid) ? t('売る') : presetMark(save, presetUses, it.uid)),
    );
    list.setItems(stored());
    this.root.add(list);
    if (pick) {
      this.root.add(
        fitText(
          this.add
            .text(
              W / 2,
              950,
              t('売るものをタップで選ぶ（もう一度で外す・長押しで詳細）'),
              textStyle(20, COLORS.gold),
            )
            .setOrigin(0.5),
          W - 40,
        ),
      );
    } else {
      // 自動売却の設定（ラン後の結果画面で、設定したレアリティ以下の戦利品を売る）
      const st = save.settings;
      const label =
        st.autoSell === 'off'
          ? t('自動売却：オフ')
          : t(
              st.autoSell === 'common'
                ? st.autoSellKeepAffix
                  ? '自動売却：{rarity}（✦は残す）'
                  : '自動売却：{rarity}'
                : st.autoSellKeepAffix
                  ? '自動売却：{rarity}以下（✦は残す）'
                  : '自動売却：{rarity}以下',
              { rarity: t(RARITY_NAMES[st.autoSell]) },
            );
      this.root.add(
        new Button(this, W / 2, 952, label, () => this.openAutoSell(), {
          width: W - 120,
          height: 64,
          fontSize: 22,
          skin: st.autoSell === 'off' ? 'gray' : 'green',
          icon: 'coin',
        }),
      );
    }

    const sellWithConfirm = (uids: string[], title: string) => {
      const items = save.inventory.filter((i) => uids.includes(i.uid));
      const gold = items.reduce((sum, i) => sum + sellPrice(i), 0);
      confirmDialog(
        this,
        title,
        t('{n}個を売ります（+{gold}G）', { n: items.length, gold }),
        t('売る'),
        () => {
          const g = sellItems(save, uids);
          persist();
          sfx('drop');
          this.sellPick = null;
          this.showToast(`+${g}G`);
          this.render();
        },
      );
    };

    let pickBtn: Button | null = null;
    const refreshPick = () => {
      if (!pick || !pickBtn) return;
      const gold = save.inventory
        .filter((i) => pick.has(i.uid))
        .reduce((sum, i) => sum + sellPrice(i), 0);
      pickBtn.setText(
        t(pick.size > 0 ? '{n}個を売る +{gold}G' : '選んで売る', { n: pick.size, gold }),
      );
      pickBtn.setDisabled(pick.size === 0);
    };

    if (pick) {
      this.root.add(
        new Button(
          this,
          W / 2 - 166,
          1060,
          t('やめる'),
          () => {
            this.sellPick = null;
            this.render();
          },
          { width: 320, height: 72, fontSize: 24, skin: 'gray', icon: 'back' },
        ),
      );
      pickBtn = new Button(
        this,
        W / 2 + 166,
        1060,
        '',
        () => sellWithConfirm([...pick], t('まとめて売る')),
        { width: 320, height: 72, fontSize: 22, skin: 'red' },
      );
      this.root.add(pickBtn);
      refreshPick();
    } else {
      this.root.add(
        new Button(
          this,
          W / 2 - 166,
          1060,
          t('まとめて売る'),
          () => {
            this.sellPick = new Set();
            this.render();
          },
          { width: 320, height: 72, fontSize: 24, skin: 'blue', icon: 'coin' },
        ),
      );
      // レアリティ以下を一括売却（装備のみ。消耗品・アーティファクトは含めない）
      const below = (max: Rarity) =>
        stored().filter((i) => {
          const d = getItemDef(i.defId);
          if (d.kind === 'consumable' || d.artifact || i.locked || presetUses.has(i.uid))
            return false;
          if (this.keepAffixes && (i.affixes?.length ?? 0) > 0) return false;
          return RARITY_RANK[i.rarity] <= RARITY_RANK[max];
        });
      const openBulk = (): void => {
        const choices: Choice[] = (['common', 'rare', 'epic'] as const).map((r) => {
          const list = below(r);
          const gold = list.reduce((sum, i) => sum + sellPrice(i), 0);
          const rarity = t(RARITY_NAMES[r]);
          return {
            label: t(r === 'common' ? '{rarity}  {n}個 +{gold}G' : '{rarity}以下  {n}個 +{gold}G', {
              rarity,
              n: list.length,
              gold,
            }),
            disabled: list.length === 0,
            onPick: () =>
              sellWithConfirm(
                list.map((i) => i.uid),
                t(r === 'common' ? '{rarity}を一括売却' : '{rarity}以下を一括売却', { rarity }),
              ),
          };
        });
        // 消耗品（装備とは別枠。消耗品枠に入れているもの・ロック中は売らない）
        const consumables = stored().filter(
          (i) => getItemDef(i.defId).kind === 'consumable' && !i.locked && !presetUses.has(i.uid),
        );
        const cGold = consumables.reduce((sum, i) => sum + sellPrice(i), 0);
        choices.push({
          label: t('消耗品  {n}個 +{gold}G', { n: consumables.length, gold: cGold }),
          disabled: consumables.length === 0,
          skin: 'green',
          onPick: () =>
            sellWithConfirm(
              consumables.map((i) => i.uid),
              t('消耗品を一括売却'),
            ),
        });
        choices.push({
          label: t(this.keepAffixes ? '✦付きは残す：オン' : '✦付きは残す：オフ'),
          skin: 'blue',
          onPick: () => {
            this.keepAffixes = !this.keepAffixes;
            openBulk();
          },
        });
        choiceDialog(
          this,
          t('一括売却'),
          choices,
          t('装備中・ロック中・編成で使用中・アーティファクトは売りません'),
        );
      };
      this.root.add(
        new Button(this, W / 2 + 166, 1060, t('一括売却'), openBulk, {
          width: 320,
          height: 72,
          fontSize: 24,
          skin: 'red',
        }),
      );
    }
  }

  // ---- 鍛冶屋（向きの付け直し） ----
  private renderSmith(): void {
    // 上の切り替え: 付け直し／合成
    const modes: ['reorient' | 'synth', string][] = [
      ['reorient', t('向きの付け直し')],
      ['synth', t('合成')],
    ];
    modes.forEach(([m, label], i) => {
      this.root.add(
        new Button(
          this,
          W / 2 + (i === 0 ? -168 : 168),
          CONTENT_TOP + 40,
          label,
          () => {
            if (this.smithMode === m) return;
            this.smithMode = m;
            this.selected = null;
            this.specify = [];
            this.render();
          },
          {
            width: 320,
            height: 66,
            fontSize: 24,
            skin: this.smithMode === m ? 'gold' : 'gray',
            icon: m === 'synth' ? 'up' : 'anvil',
          },
        ),
      );
    });
    if (this.smithMode === 'synth') {
      this.renderSynth();
      return;
    }
    const save = getSave();
    const eq = equippedUids(save);
    const presetUses = otherPresetUse(save);
    const list = new ItemList(
      this,
      CONTENT_TOP + 84,
      610,
      {
        onTap: (it) => {
          if (!canReorient(it)) {
            sfx('error');
            this.showToast(t('この装備は向きを付け直せません'), true);
            return;
          }
          this.selected = it.uid;
          this.specify = it.exits.slice();
          this.render();
        },
        onLongPress: (it) => showItemDetail(this, it),
      },
      (it) => (eq.has(it.uid) ? t('装備中') : presetMark(save, presetUses, it.uid)),
    );
    list.setItems(save.inventory.filter((i) => getItemDef(i.defId).kind !== 'consumable'));
    list.setSelected(this.selected);
    this.root.add(list);

    const py = 640;
    this.root.add(panel(this, W / 2, py + 220, W - 30, 450, 'paper'));
    const it = save.inventory.find((i) => i.uid === this.selected);
    if (!it) {
      this.root.add(
        this.add
          .image(W / 2, py + 170, 'ic_anvil')
          .setScale(7)
          .setAlpha(0.5),
      );
      this.root.add(
        fitText(
          ink(this, W / 2, py + 270, t('付け直す装備を選んでください'), 26).setOrigin(0.5),
          W - 70,
        ),
      );
      this.root.add(
        fitText(
          ink(
            this,
            W / 2,
            py + 312,
            t('出口の数は変わらず、方向だけが変わります'),
            20,
            '#7a5a30',
          ).setOrigin(0.5),
          W - 70,
        ),
      );
      return;
    }
    const def = getItemDef(it.defId);
    this.root.add(new ItemIcon(this, 110, py + 90, it, 120));
    // Text right of the icon stays inside the paper panel
    const infoW = W - 190 - 30;
    this.root.add(
      fitText(this.add.text(190, py + 40, t(def.name), textStyle(34, rarityCss(it.rarity))), infoW),
    );
    this.root.add(
      fitText(ink(this, 190, py + 92, describeItem(it)[1] ?? '', 22, '#5a3a20'), infoW),
    );
    this.root.add(
      fitText(
        ink(
          this,
          190,
          py + 124,
          t('付け直し {n}回（毎回 料金×1.5）', { n: it.rerollCount }),
          18,
          '#7a5a30',
        ),
        infoW,
      ),
    );
    const rc = rerollCost(it, 'reroll');
    const sc = rerollCost(it, 'specify');
    this.root.add(
      new Button(
        this,
        W / 2 - 160,
        py + 210,
        t('再抽選 {gold}G', { gold: rc }),
        () => {
          if (!rerollItem(save, it.uid, new Rng(randomSeed()))) {
            this.showToast(t('ゴールドが足りません'), true);
            return;
          }
          persist();
          sfx('openRare');
          this.specify = it.exits.slice();
          this.render();
        },
        { width: 290, height: 80, skin: 'blue', disabled: save.gold < rc },
      ),
    );
    // 報酬つき広告: 無料で付け直し（1日の回数まで。お金も付け直し回数も増えない）
    const freeLeft = adRemaining(save, 'smithReroll');
    if (freeLeft > 0)
      this.root.add(
        new Button(
          this,
          W / 2,
          py + 388,
          t(
            isPremium()
              ? '無料で再抽選（今日あと{n}回）'
              : '▶ 広告を見て無料で再抽選（今日あと{n}回）',
            {
              n: freeLeft,
            },
          ),
          () => {
            void earnReward(this).then((ok) => {
              if (!ok) return;
              recordAd(save, 'smithReroll');
              rerollItem(save, it.uid, new Rng(randomSeed()), true);
              persist();
              sfx('openRare');
              this.specify = it.exits.slice();
              this.render();
            });
          },
          { width: W - 120, height: 58, fontSize: 22, skin: 'green' },
        ),
      );
    // Must end before the first arrow button (its left edge is at x = 330 - 37)
    this.root.add(
      fitText(ink(this, 50, py + 290, t('指定: {n}方向を選ぶ', { n: it.exits.length }), 22), 233),
    );
    DIRS.forEach((d, i) => {
      const on = this.specify.includes(d);
      this.root.add(
        new Button(
          this,
          330 + i * 82,
          py + 304,
          DIR_ARROW[d],
          () => {
            if (on) this.specify = this.specify.filter((x) => x !== d);
            else if (this.specify.length < it.exits.length) this.specify = [...this.specify, d];
            this.render();
          },
          { width: 74, height: 74, fontSize: 34, skin: on ? 'gold' : 'gray' },
        ),
      );
    });
    const ready = this.specify.length === it.exits.length;
    this.root.add(
      new Button(
        this,
        W / 2 + 160,
        py + 210,
        t('指定 {gold}G', { gold: sc }),
        () => {
          if (!specifyExits(save, it.uid, this.specify)) {
            this.showToast(
              ready
                ? t('ゴールドが足りません')
                : t('方向を{n}つ選んでください', { n: it.exits.length }),
              true,
            );
            return;
          }
          persist();
          sfx('openRare');
          this.render();
        },
        { width: 290, height: 80, skin: 'purple', disabled: save.gold < sc || !ready },
      ),
    );
  }

  // ---- 永続強化 ----
  private renderUpgrade(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('強化')));
    const hs = heroStats(save);
    const bp = backpackSize(save.upgrades.backpack);
    const stars = totalStars(save);
    const now: Record<UpgradeId, string> = {
      maxHp: t(stars > 0 ? '最大HP {hp}（★{stars}で+{bonus}込み）' : '最大HP {hp}', {
        hp: hs.maxHp,
        stars,
        bonus: PROGRESS.starHp * stars,
      }),
      atb: t('攻撃間隔 {sec}秒', { sec: hs.atbTime.toFixed(2) }),
      attack: t(stars > 0 ? '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）' : '攻撃倍率 ×{mult}', {
        mult: hs.attackMult.toFixed(2),
        stars,
        bonus: Math.round(PROGRESS.starAttack * 100 * stars),
      }),
      runTime: Number.isFinite(TIME_BONUS.maxRunTime)
        ? t('出撃 {sec}秒（延長込みの上限 {max}秒）', {
            sec: hs.runTime,
            max: TIME_BONUS.maxRunTime,
          })
        : t('出撃 {sec}秒', { sec: hs.runTime }),
      backpack: t('{w}×{h}マス', { w: bp.width, h: bp.height }),
      consumableSlots: t('{n}枠', { n: consumableSlots(save) }),
      storage: t('{n}個', { n: storageCapacity(save) }),
    };
    (Object.keys(UPGRADES) as UpgradeId[]).forEach((id, i) => {
      const def = UPGRADES[id];
      const lv = save.upgrades[id];
      const max = upgradeMaxLevel(save, id);
      const cost = upgradeCost(id, lv, max);
      // 7項目を1画面に収める（1行 128px）
      const y = CONTENT_TOP + 132 + i * 128;
      this.root.add(panel(this, W / 2, y, W - 30, 120, 'panel'));
      this.root.add(new RoundButton(this, 80, y, 84, UPGRADE_ICON[id], null, () => undefined));
      // Name and value end before the buy button (its left edge is at x = W - 220)
      const textW = W - 220 - 140 - 10;
      this.root.add(fitText(this.add.text(140, y - 44, t(def.name), textStyle(26)), textW));
      this.root.add(
        fitText(this.add.text(140, y - 8, now[id], textStyle(18, COLORS.textDim)), textW),
      );
      // 段階のつぶ
      const pips = max;
      const pw = Math.min(22, 300 / pips);
      for (let k = 0; k < pips; k++) {
        this.root.add(
          this.add
            .rectangle(142 + k * pw, y + 30, pw - 4, 12, k < lv ? 0xffd25a : 0x2a2234)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0x0c0a12),
        );
      }
      this.root.add(
        new Button(
          this,
          W - 130,
          y,
          cost === null ? t('最大') : `${cost}`,
          () => {
            if (!buyUpgrade(save, id)) {
              this.showToast(t('ゴールドが足りません'), true);
              return;
            }
            persist();
            sfx('openEpic');
            this.render();
          },
          {
            width: 180,
            height: 76,
            skin: 'green',
            icon: cost === null ? undefined : 'coin',
            disabled: cost === null || save.gold < cost,
          },
        ),
      );
    });
  }

  // ---- 設定 ----
  private renderSettings(): void {
    const save = getSave();
    const st = save.settings;
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('設定')));
    this.root.add(panel(this, W / 2, 545, W - 40, 670, 'paper'));
    const row = (
      y: number,
      label: string,
      value: string,
      onMinus: (() => void) | null,
      onPlus: () => void,
    ) => {
      const valueText = ink(this, W - 250, y, value, 30, '#7a3c10').setOrigin(0.5);
      // The label ends before the − button, or before the value when there is none
      const labelEnd = onMinus ? W - 360 - 37 : valueText.x - valueText.width / 2;
      this.root.add(fitText(ink(this, 70, y, label, 28).setOrigin(0, 0.5), labelEnd - 70 - 12));
      this.root.add(valueText);
      if (onMinus)
        this.root.add(
          new Button(this, W - 360, y, '−', onMinus, { width: 74, height: 70, skin: 'blue' }),
        );
      this.root.add(
        new Button(this, W - 120, y, onMinus ? '+' : t('切替'), onPlus, {
          width: onMinus ? 74 : 140,
          height: 70,
          skin: onMinus ? 'blue' : value === 'ON' ? 'green' : 'gray',
        }),
      );
    };
    const changed = () => {
      applySettings();
      persist();
      this.render();
    };
    row(
      300,
      t('音量'),
      `${Math.round(st.volume * 100)}%`,
      () => {
        st.volume = Math.max(0, Math.round((st.volume - 0.1) * 10) / 10);
        changed();
      },
      () => {
        st.volume = Math.min(1, Math.round((st.volume + 0.1) * 10) / 10);
        changed();
      },
    );
    // 検証用: ゲームスピード（ルールの秒数は変えず、進む速さだけを倍にする）
    const speeds: readonly number[] = SIM.speedOptions;
    const si = Math.max(0, speeds.indexOf(st.gameSpeed));
    row(
      690,
      t('ゲームスピード'),
      `×${st.gameSpeed}`,
      () => {
        st.gameSpeed = speeds[Math.max(0, si - 1)]!;
        changed();
      },
      () => {
        st.gameSpeed = speeds[Math.min(speeds.length - 1, si + 1)]!;
        changed();
      },
    );
    this.root.add(
      fitText(
        ink(this, 70, 760, t('検証用。×2 なら30秒のランが15秒で終わります'), 18, '#7a5a30'),
        W - 140,
      ),
    );
    // プレミアム（買い切り）: 広告を見なくても、広告のご褒美を受け取れる
    const prem = isPremium();
    this.root.add(
      new Button(
        this,
        W / 2 - 110,
        1050,
        t(prem ? 'プレミアム（購入済み）' : 'プレミアム {price}', { price: t(PREMIUM_PRICE) }),
        () => {
          if (prem) {
            this.showToast(t('広告なしでご褒美を受け取れます'));
            return;
          }
          void buyPremium(this).then((ok) => {
            if (ok) {
              sfx('openLegend');
              this.showToast(t('プレミアムになりました！'));
            }
            this.render();
          });
        },
        { width: 400, height: 76, fontSize: 24, skin: prem ? 'gray' : 'gold', icon: 'crown' },
      ),
    );
    this.root.add(
      new Button(
        this,
        W / 2 + 214,
        1050,
        t('購入を復元'),
        () => {
          void restorePurchases().then((ok) => {
            this.showToast(t(ok ? '購入を復元しました' : '復元できる購入はありません'), !ok);
            this.render();
          });
        },
        { width: 200, height: 76, fontSize: 20, skin: 'blue' },
      ),
    );
    this.root.add(
      new Button(this, W / 2 - 110, 960, t('遊び方・強くなるコツ'), () => this.go('help'), {
        width: 400,
        height: 84,
        fontSize: 24,
        skin: 'blue',
        icon: 'book',
      }),
    );
    // 案内をもう一度（各画面を開いたときに、また1回ずつ出る）
    this.root.add(
      new Button(
        this,
        W / 2 + 214,
        960,
        t('案内をもう一度'),
        () => {
          resetTutorials();
          this.showToast(t('各画面で、案内がもう一度出ます'));
        },
        { width: 200, height: 84, fontSize: 20, skin: 'blue' },
      ),
    );
    row(430, t('振動'), st.haptics ? 'ON' : 'OFF', null, () => {
      st.haptics = !st.haptics;
      changed();
    });
    row(560, t('画面揺れ・光'), st.shake ? 'ON' : 'OFF', null, () => {
      st.shake = !st.shake;
      changed();
    });
    // Language (also labelled in English so a player stuck in an unknown language can find it)
    if (READY_LANGS.length > 1) {
      const y = 830;
      const label = lang() === 'en' ? 'Language' : `${t('言語')} / Language`;
      // Ends before the language button (its left edge is at x = W - 340)
      this.root.add(fitText(ink(this, 70, y, label, 26).setOrigin(0, 0.5), W - 340 - 70 - 12));
      // "{auto}（{lang}）" is a label with its value; keeps the existing 自動 / 端末の言語 keys
      const now =
        st.lang === 'auto'
          ? t('{auto}（{lang}）', { auto: t('自動'), lang: LANG_NAMES[lang()] })
          : LANG_NAMES[st.lang];
      this.root.add(
        new Button(this, W - 190, y, now, () => this.openLanguage(), {
          width: 300,
          height: 70,
          fontSize: 22,
          skin: 'blue',
        }),
      );
    }
  }

  /** Pick the display language: re-applies it, loads its font, then redraws the screen */
  private openLanguage(): void {
    const st = getSave().settings;
    const opts: LangSetting[] = ['auto', ...READY_LANGS];
    const choices: Choice[] = opts.map((v) => {
      const name =
        v === 'auto'
          ? t('{auto}（{lang}）', { auto: t('自動'), lang: t('端末の言語') })
          : LANG_NAMES[v];
      return {
        label: st.lang === v ? `● ${name}` : name,
        skin: st.lang === v ? 'gold' : 'blue',
        onPick: () => {
          st.lang = v;
          persist();
          applyLang(v);
          void loadFonts().then(() => this.scene.restart({ page: 'settings' }));
        },
      };
    });
    choiceDialog(this, `${t('言語')} / Language`, choices);
  }

  /** 自動売却の設定 */
  private openAutoSell(): void {
    const save = getSave();
    const st = save.settings;
    const opts: [SaveData['settings']['autoSell'], string][] = [
      ['off', t('オフ（売らない）')],
      ['common', t('コモンを売る')],
      ['rare', t('レア以下を売る')],
      ['epic', t('エピック以下を売る')],
    ];
    const choices: Choice[] = opts.map(([v, label]) => ({
      label: st.autoSell === v ? `● ${label}` : label,
      skin: st.autoSell === v ? 'gold' : 'blue',
      onPick: () => {
        st.autoSell = v;
        persist();
        this.render();
      },
    }));
    choices.push({
      label: t(st.autoSellKeepAffix ? '✦付きは残す：オン' : '✦付きは残す：オフ'),
      skin: 'gray',
      onPick: () => {
        st.autoSellKeepAffix = !st.autoSellKeepAffix;
        persist();
        this.render();
        this.openAutoSell();
      },
    });
    choiceDialog(
      this,
      t('自動売却'),
      choices,
      t('ラン後に戦利品から売ります。消耗品・アーティファクトは売りません'),
    );
  }

  /** 初めての人向けの案内（拠点・鍛冶屋） */
  private maybeTutorial(): void {
    if (this.page === 'home') {
      runTutorial(this, 'home', [
        {
          rect: { x: W / 2, y: 760, w: 476, h: 132 },
          text: t(
            'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！',
          ),
          onTap: () => this.goSortie(),
        },
      ]);
      // After the first own run: guide to the loadout tab to place the loot
      if (tutorialSeen('result') && !tutorialSeen('loadout'))
        runTutorial(this, 'loadoutGo', [
          {
            rect: { x: (W / 5) * 4.5, y: H - TAB_BAR_H + 56, w: 128, h: 116 },
            text: t(
              '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね',
            ),
            onTap: () => goTab(this, 'loadout'),
          },
        ]);
    }
    if (this.page === 'smith')
      runTutorial(this, 'smith', [
        {
          rect: { x: W / 2, y: CONTENT_TOP + 40, w: W - 20, h: 80 },
          text: t(
            '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ',
          ),
        },
      ]);
  }

  // ---- 合成 ----
  /** 詳細カードの「合成」ボタン。揃っていなければ数を出して押せない */
  private synthAction(it: ItemInstance, reopen: () => void): DetailAction {
    const plan = synthPlan(getSave(), it.uid);
    const ok = plan.reason === null && plan.to !== null;
    return {
      label: t(plan.to === null ? '合成' : ok ? '合成 {gold}G' : '合成 {have}/3', {
        gold: plan.cost,
        have: plan.have,
      }),
      skin: 'blue',
      icon: 'up',
      disabled: !ok,
      onTap: () => {
        if (!ok) {
          if (plan.reason) this.showToast(plan.reason, true);
          reopen();
          return;
        }
        this.confirmSynth(it);
      },
    };
  }

  /** 合成の確認 → 合成 → 結果の演出 */
  private confirmSynth(it: ItemInstance): void {
    const plan = synthPlan(getSave(), it.uid);
    if (plan.reason || !plan.to) {
      if (plan.reason) this.showToast(plan.reason, true);
      return;
    }
    const def = getItemDef(it.defId);
    const lineUp = !!plan.toDefId && plan.toDefId !== it.defId;
    confirmDialog(
      this,
      t('合成'),
      t(
        lineUp
          ? '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります'
          : '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります',
        {
          item: t(def.name),
          rarity: t(RARITY_NAMES[it.rarity]),
          target: plan.toDefId ? t(getItemDef(plan.toDefId).name) : '',
          to: t(RARITY_NAMES[plan.to]),
          gold: plan.cost,
          rate: Math.round(synthRate(it.rarity) * 100),
        },
      ),
      t('合成する'),
      () => {
        const save = getSave();
        const res = synthesize(save, it.uid, new Rng(randomSeed()));
        if (!res) return;
        persist();
        // 鍛冶屋では、成功したらできた装備を選んだままにして続けて合成できるように
        if (this.page === 'smith') this.selected = res.success ? res.item.uid : null;
        this.render();
        this.showSynthResult(res.item, res.success);
      },
      'blue',
    );
  }

  /** 鍛冶屋の合成モード: 同じ装備・同じレアリティが揃っているものに数を出す */
  private renderSynth(): void {
    const save = getSave();
    const eq = equippedUids(save);
    const presetUses = otherPresetUse(save);
    const usable = (i: ItemInstance) => !eq.has(i.uid) && !i.locked && !presetUses.has(i.uid);
    const groupCount = (i: ItemInstance) =>
      save.inventory.filter((o) => o.defId === i.defId && o.rarity === i.rarity && usable(o))
        .length;
    const candidates = save.inventory.filter((i) => {
      const d = getItemDef(i.defId);
      return d.kind !== 'consumable' && !d.artifact && i.rarity !== 'legendary';
    });
    const list = new ItemList(
      this,
      CONTENT_TOP + 84,
      610,
      {
        onTap: (it) => {
          this.selected = it.uid;
          this.render();
        },
        onLongPress: (it) => showItemDetail(this, it),
      },
      (it) => {
        if (eq.has(it.uid)) return t('装備中');
        if (it.locked) return t('ロック');
        const n = groupCount(it);
        return n >= 3 ? t('{n}つ', { n }) : presetMark(save, presetUses, it.uid);
      },
    );
    list.setItems(candidates);
    list.setSelected(this.selected);
    this.root.add(list);

    const py = 640;
    this.root.add(panel(this, W / 2, py + 220, W - 30, 450, 'paper'));
    const it = save.inventory.find((i) => i.uid === this.selected);
    if (!it || !candidates.includes(it)) {
      this.root.add(
        this.add
          .image(W / 2, py + 150, 'ic_up')
          .setScale(7)
          .setAlpha(0.5),
      );
      this.root.add(
        fitText(
          ink(this, W / 2, py + 250, t('合成する装備を選んでください'), 26).setOrigin(0.5),
          W - 70,
        ),
      );
      this.root.add(
        fitText(
          ink(
            this,
            W / 2,
            py + 292,
            t('同じ装備・同じレアリティを3つで、1つ上のレアリティに'),
            20,
            '#7a5a30',
          ).setOrigin(0.5),
          W - 70,
        ),
      );
      this.root.add(
        fitText(
          ink(
            this,
            W / 2,
            py + 326,
            t('「○つ」の印は、3つ以上揃っている装備です'),
            18,
            '#7a5a30',
          ).setOrigin(0.5),
          W - 70,
        ),
      );
      return;
    }
    const def = getItemDef(it.defId);
    const plan = synthPlan(save, it.uid);
    this.root.add(new ItemIcon(this, 110, py + 90, it, 120));
    // Text right of the icon stays inside the paper panel
    const infoW = W - 190 - 30;
    this.root.add(
      fitText(this.add.text(190, py + 40, t(def.name), textStyle(34, rarityCss(it.rarity))), infoW),
    );
    const lineUp = !!plan.toDefId && plan.toDefId !== it.defId;
    this.root.add(
      fitText(
        ink(
          this,
          190,
          py + 92,
          plan.to
            ? t(lineUp ? '{rarity} ×3 → {target}の{to} ×1' : '{rarity} ×3 → {to} ×1', {
                rarity: t(RARITY_NAMES[it.rarity]),
                target: plan.toDefId ? t(getItemDef(plan.toDefId).name) : '',
                to: t(RARITY_NAMES[plan.to]),
              })
            : t('これ以上のレアリティはありません'),
          24,
          '#5a3a20',
        ),
        infoW,
      ),
    );
    this.root.add(
      fitText(
        ink(
          this,
          190,
          py + 128,
          t('使える数: {n}つ（装備中・ロック中・ほかの編成で使用中は除く）', { n: groupCount(it) }),
          18,
          '#7a5a30',
        ),
        infoW,
      ),
    );
    if (plan.to) {
      this.root.add(
        ink(
          this,
          50,
          py + 176,
          t('成功率 {rate}%', { rate: Math.round(synthRate(it.rarity) * 100) }),
          28,
          '#2a6a30',
        ),
      );
      this.root.add(
        fitText(
          ink(
            this,
            50,
            py + 214,
            t('失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）', {
              rarity: t(RARITY_NAMES[it.rarity]),
            }),
            18,
            '#7a5a30',
          ),
          W - 50 - 30,
        ),
      );
    }
    this.root.add(
      new Button(
        this,
        W / 2,
        py + 290,
        t(plan.to ? '合成する {gold}G' : '合成できません', { gold: plan.cost }),
        () => this.confirmSynth(it),
        { width: 420, height: 88, fontSize: 30, skin: 'blue', icon: 'up', disabled: !!plan.reason },
      ),
    );
    if (plan.reason)
      this.root.add(
        fitText(ink(this, W / 2, py + 360, plan.reason, 22, '#a03020').setOrigin(0.5), W - 70),
      );
  }

  /** 合成の結果: 宝箱から出てくる演出。成否は開いたあとに出す。開いたあとタップで閉じる */
  private showSynthResult(made: ItemInstance, success: boolean): void {
    const root = this.add.container(0, 0).setDepth(2700);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0, 0).setInteractive();
    root.add(shade);
    const title = this.add
      .text(W / 2, H / 2 - 220, t('合成中…'), textStyle(56, '#ffe27a'))
      .setOrigin(0.5);
    root.add(title);
    const hint = this.add
      .text(W / 2, H / 2 + 200, '', textStyle(22, COLORS.textDim))
      .setOrigin(0.5);
    root.add(hint);
    const reveal = new ChestReveal(this, [made], {
      position: () => ({ x: W / 2, y: H / 2 }),
      iconSize: 160,
      shake: getSave().settings.shake,
      onDone: () => {
        hint.setText(t('タップで閉じる'));
        title
          .setText(t(success ? '合成成功！' : '失敗…'))
          .setColor(success ? '#ffe27a' : '#a0a0b8');
        // Pop relative to the fitted scale so a long translation stays on screen
        const fit = fitText(title, W - 40).scaleX;
        this.tweens.add({
          targets: title,
          scale: { from: 1.4 * fit, to: fit },
          duration: 260,
          ease: 'Back.easeOut',
        });
        if (!success) sfx('error');
      },
    });
    reveal.root.setDepth(2701);
    reveal.start();
    shade.on('pointerup', () => {
      if (!reveal.finished) {
        reveal.fastForward();
        return;
      }
      reveal.root.destroy();
      root.destroy();
    });
  }

  // ---- ヘルプ（遊び方・強くなるコツ） ----
  private renderHelp(): void {
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('遊び方・強くなるコツ'), 420));
    const top = CONTENT_TOP + 90;
    const bottom = CONTENT_BOTTOM - 10;
    this.root.add(panel(this, W / 2, (top + bottom) / 2, W - 30, bottom - top + 10, 'paper'));
    // 中身（縦に流す。はみ出した分はドラッグでスクロール）
    const content = this.add.container(0, top);
    let y = 24;
    const left = 44;
    const width = W - 88;
    const params = { n: TECHNIQUES.length, price: t(MONETIZE.premiumPrice) };
    for (const sec of HELP_SECTIONS) {
      const h = ink(this, left, y, t(sec.title), 28, '#8a3a20').setWordWrapWidth(width, true);
      content.add(h);
      y += h.height + 10;
      for (const line of sec.lines) {
        // Indent decided by the Japanese key ('・' bullet or U+3000 indent), whatever the translation
        const bullet = line.charCodeAt(0) === 0x30fb || line.charCodeAt(0) === 0x3000;
        const text = this.add.text(left + (bullet ? 8 : 0), y, t(line, params), {
          ...inkStyle(20),
          wordWrap: { width: width - (bullet ? 8 : 0), useAdvancedWrap: true },
          lineSpacing: 4,
        });
        content.add(text);
        y += text.height + 8;
      }
      y += 22;
    }
    this.addScroll(content, top, bottom, y, 'help');
  }

  /** 縦に流す中身: はみ出した分はドラッグ（PCはホイール）でスクロール */
  private addScroll(
    content: Phaser.GameObjects.Container,
    top: number,
    bottom: number,
    contentH: number,
    page: Page,
  ): void {
    const viewH = bottom - top;
    const mask = this.make.graphics({}, false);
    mask.fillRect(0, top, W, viewH);
    content.setMask(mask.createGeometryMask());
    this.root.add(content);
    const zone = this.add.zone(W / 2, (top + bottom) / 2, W - 30, viewH).setInteractive();
    this.root.add(zone);
    let startY = 0;
    let startScroll = 0;
    let scroll = 0;
    const clamp = (v: number) => Phaser.Math.Clamp(v, 0, Math.max(0, contentH - viewH));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startY = p.y;
      startScroll = scroll;
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      scroll = clamp(startScroll - (p.y - startY));
      content.y = top - scroll;
    });
    this.input.off('wheel');
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.page !== page) return;
      scroll = clamp(scroll + dy);
      content.y = top - scroll;
    });
  }

  /** 図鑑の切り替え（必殺技・実績） */
  private addBookTabs(): void {
    const tabs: [Page, string][] = [
      ['techs', t('必殺技')],
      ['achievements', t('実績')],
    ];
    tabs.forEach(([page, label], i) => {
      this.root.add(
        new Button(
          this,
          W / 2 + (i === 0 ? -150 : 150),
          CONTENT_TOP + 40,
          label,
          () => this.go(page),
          {
            width: 280,
            height: 68,
            fontSize: 26,
            skin: this.page === page ? 'gold' : 'gray',
            icon: page === 'techs' ? 'crown' : 'star',
          },
        ),
      );
    });
  }

  // ---- 実績 ----
  // ---- ランキング（挑戦・エンドレス） ----
  private renderRanking(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('ランキング'), 420));
    const now = Date.now();
    const ch = currentChallenge(now, challengeStart(devChallengeOpen()));
    const tabs: [RankMode, string][] = [
      ['challenge', t('2週替わりの挑戦')],
      ['endless', t('エンドレス（月ごと）')],
    ];
    tabs.forEach(([m, label], i) =>
      this.root.add(
        new Button(
          this,
          W / 2 + (i === 0 ? -170 : 170),
          CONTENT_TOP + 110,
          label,
          () => {
            this.rankTab = m;
            this.render();
          },
          { width: 320, height: 64, fontSize: 22, skin: this.rankTab === m ? 'gold' : 'gray' },
        ),
      ),
    );
    let y = CONTENT_TOP + 170;
    const season = this.rankTab === 'challenge' ? (ch?.period ?? null) : endlessSeason(now);
    const sid = season === null ? null : `${this.rankTab}-${season}`;
    this.root.add(
      fitText(
        this.add
          .text(
            W / 2,
            y,
            sid ? seasonLabel(sid) : t('挑戦はまだ始まっていません'),
            textStyle(26, '#ffe27a'),
          )
          .setOrigin(0.5, 0),
        W - 40,
      ),
    );
    y += 44;
    const myName = save.rankName
      ? nameText(save.rankName)
      : t('（初めて記録を送るときに決まります）');
    // Ends before the "change" button (its left edge is at x = W - 145) when it is shown
    this.root.add(
      fitText(
        this.add.text(
          40,
          y,
          t('あなたの名前: {name}', { name: myName }),
          textStyle(20, COLORS.textDim),
        ),
        (rankingReady() ? W - 145 - 10 : W - 40) - 40,
      ),
    );
    if (rankingReady()) {
      this.root.add(
        new Button(
          this,
          W - 90,
          y + 12,
          t('変える'),
          () => {
            const n = randomName();
            void saveName(n).then((ok) => {
              if (ok === null) return this.showToast(t('つながりませんでした'), true);
              save.rankName = n;
              persist();
              if (this.page === 'ranking') this.render();
            });
          },
          { width: 110, height: 48, fontSize: 20, skin: 'blue' },
        ),
      );
    }
    y += 50;
    // 報酬の案内
    const rw = RANK_REWARDS;
    const note = t(
      'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G',
      { top1: rw.top1.gold, top10: rw.top10.gold, top50: rw.top50.gold, joined: rw.joined.gold },
    );
    const bottom = CONTENT_BOTTOM - 70;
    this.root.add(
      this.add
        .text(W / 2, CONTENT_BOTTOM - 36, note, {
          ...textStyle(16, COLORS.textDim),
          align: 'center',
          wordWrap: { width: W - 60, useAdvancedWrap: true },
        })
        .setOrigin(0.5),
    );
    if (!rankingReady() || !sid || season === null) {
      this.root.add(
        this.add
          .text(
            W / 2,
            (y + bottom) / 2,
            t(
              !rankingReady()
                ? 'ランキングは、サーバーの準備ができたら開きます'
                : '挑戦が始まったら、ここに順位が出ます',
            ),
            {
              ...textStyle(22, COLORS.textDim),
              align: 'center',
              wordWrap: { width: W - 60, useAdvancedWrap: true },
            },
          )
          .setOrigin(0.5),
      );
      return;
    }
    const loading = this.add
      .text(W / 2, (y + bottom) / 2, t('読み込み中…'), textStyle(22, COLORS.textDim))
      .setOrigin(0.5);
    this.root.add(loading);
    const gen = ++this.rankGen;
    const mode = this.rankTab;
    void Promise.all([fetchBoard(mode, season), fetchMyRank(mode, season)]).then(([board, me]) => {
      if (gen !== this.rankGen || this.page !== 'ranking' || !loading.active) return;
      loading.destroy();
      if (!board && !me) {
        this.root.add(
          this.add
            .text(
              W / 2,
              (y + bottom) / 2,
              t('つながりませんでした'),
              textStyle(22, COLORS.textWarn),
            )
            .setOrigin(0.5),
        );
        return;
      }
      const total = me?.total ?? board?.total ?? 0;
      const mine =
        me?.rank != null
          ? t('あなた: {rank}位 / {total}人（上位{pct}%）', {
              rank: me.rank,
              total,
              pct: Math.max(1, Math.ceil((me.rank / Math.max(1, total)) * 100)),
            })
          : t('まだ記録がありません（参加 {total}人）', { total });
      this.root.add(
        fitText(
          this.add.text(W / 2, y, mine, textStyle(24, COLORS.text)).setOrigin(0.5, 0),
          W - 40,
        ),
      );
      const top = y + 46;
      const content = this.add.container(0, top);
      const rows = board?.top ?? [];
      rows.forEach((r, i) => {
        const ry = i * 52;
        // Names arrive as word ids and are shown in this language
        const me2 = sameName(r.name, save.rankName);
        const name = rowName(r.name);
        content.add(panel(this, W / 2, ry + 24, W - 40, 48, me2 ? 'paper' : 'inset'));
        const col = me2 ? '#5a3a20' : r.rank <= 3 ? '#ffe27a' : COLORS.text;
        content.add(this.add.text(40, ry + 10, `${r.rank}`, textStyle(22, col)));
        const val =
          mode === 'challenge'
            ? num(r.totalDamage)
            : t('{loop}周・{damage}', { loop: r.reachedLoop, damage: num(r.totalDamage) });
        const valText = this.add.text(W - 40, ry + 10, val, textStyle(20, col)).setOrigin(1, 0);
        // Name decoration (challenge reward) before the name
        const deco = decoTexture(this, r.deco);
        if (deco)
          content.add(
            this.add
              .image(100, ry + 24, deco)
              .setScale(2)
              .setOrigin(0, 0.5),
          );
        const nameX = deco ? 136 : 100;
        // The name ends before the right-aligned score
        content.add(
          fitText(
            this.add.text(nameX, ry + 10, name, textStyle(20, col)),
            W - 40 - valText.width - nameX - 16,
          ),
        );
        content.add(valText);
      });
      if (rows.length === 0)
        content.add(
          this.add
            .text(W / 2, 40, t('まだ誰も記録していません'), textStyle(22, COLORS.textDim))
            .setOrigin(0.5),
        );
      this.addScroll(content, top, bottom, Math.max(rows.length * 52, 80), 'ranking');
    });
  }

  /** 終わったシーズンの報酬を受け取る（起動して最初にホームを開いたとき） */
  private claimRankRewards(): void {
    if (rewardsChecked || !rankingReady()) return;
    rewardsChecked = true;
    void claimSeasonRewards().then((list) => {
      if (list.length === 0) return;
      const save = getSave();
      const lines: string[] = [];
      const gained: string[] = [];
      for (const r of list) {
        const rw = RANK_REWARDS[r.band];
        save.gold += rw.gold;
        // Saved as an id so the title shows in whatever language is active later
        if (rw.title) save.titles.unshift(titleId(r.season, r.band));
        lines.push(
          t('{season}: {rank}位 / {total}人（{band}）  +{gold}G', {
            season: seasonLabel(r.season),
            rank: r.rank,
            total: r.total,
            band: t(rw.label),
            gold: rw.gold,
          }),
        );
        // Challenge top ranks also earn cosmetics (looks only)
        if (isChallengeSeason(r.season))
          for (const id of cosmeticsForBand(r.band))
            if (!save.cosmetics.includes(id)) {
              save.cosmetics.push(id);
              gained.push(id);
            }
      }
      if (gained.length > 0)
        lines.push(
          t('新しい装飾品: {list}', {
            list: gained.map((id) => t(getCosmetic(id)!.name)).join(t('・|sep')),
          }),
        );
      save.titles = save.titles.slice(0, 50);
      persist();
      if (this.page === 'home') this.render();
      confirmDialog(this, t('ランキングの報酬'), lines.join('\n'), t('受け取る'), () => undefined);
    });
  }

  // ---- 装飾品（挑戦の上位のご褒美。見た目だけで、強さは変わらない） ----
  private renderWardrobe(): void {
    const save = getSave();
    const owns = (id: string | null) => !id || devAllCosmetics() || save.cosmetics.includes(id);
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('装飾品'), 340));
    this.root.add(
      new Button(this, 76, CONTENT_TOP + 40, t('戻る'), () => this.go('challenge'), {
        width: 112,
        height: 56,
        fontSize: 20,
      }),
    );
    this.root.add(
      fitText(
        this.add
          .text(
            W / 2,
            CONTENT_TOP + 80,
            t('挑戦で上位に入るともらえる、見た目だけの装飾品'),
            textStyle(20, COLORS.textDim),
          )
          .setOrigin(0.5, 0),
        W - 40,
      ),
    );
    // Preview: the hero in the worn look with the pet, and the name as the ranking shows it
    const stageY = CONTENT_TOP + 222;
    this.root.add(panel(this, W / 2, stageY, W - 40, 196, 'inset'));
    const heroOrigin = stillOrigin(UNIT_SPRITES.hero!);
    const footY = stageY + 86;
    this.root.add(
      this.add
        .sprite(W / 2, footY, 'hero')
        .setScale(2.2)
        .setOrigin(heroOrigin.originX, heroOrigin.originY),
    );
    const pet = addPet(this, save.look.pet, W / 2 - 104, footY - 96, 3);
    if (pet) this.root.add(pet);
    const nameY = stageY + 124;
    const deco = decoTexture(this, save.look.deco);
    const nameText0 = this.add
      .text(
        0,
        nameY,
        save.rankName ? nameText(save.rankName) : t('冒険者'),
        textStyle(22, COLORS.text),
      )
      .setOrigin(0, 0.5);
    fitText(nameText0, W - 160);
    const rowW = nameText0.displayWidth + (deco ? 40 : 0);
    nameText0.x = W / 2 - rowW / 2 + (deco ? 40 : 0);
    if (deco)
      this.root.add(
        this.add
          .image(W / 2 - rowW / 2, nameY, deco)
          .setScale(2)
          .setOrigin(0, 0.5),
      );
    this.root.add(nameText0);

    const wear = (kind: CosmeticKind, id: string | null) => {
      if (!owns(id)) {
        this.showToast(t('挑戦で上位に入るともらえます'), true);
        return;
      }
      sfx('click');
      save.look = { ...save.look, [kind]: id };
      if (kind === 'hero') applyHeroLook(this, id);
      // Others see the decoration in the ranking (the server checks it was earned)
      if (kind === 'deco') void saveDeco(id);
      persist();
      this.render();
    };
    const sections: { kind: CosmeticKind; title: string; none: string }[] = [
      { kind: 'hero', title: t('勇者の色'), none: t('いつもの色') },
      { kind: 'pet', title: t('ペット'), none: t('なし') },
      { kind: 'deco', title: t('名前の飾り（ランキング）'), none: t('なし') },
    ];
    const cw = 150;
    const ch = 140;
    const gap = 12;
    sections.forEach((sec, si) => {
      const hy = CONTENT_TOP + 372 + si * 206;
      this.root.add(fitText(this.add.text(36, hy, sec.title, textStyle(24, '#ffe27a')), W - 72));
      const opts: (string | null)[] = [
        null,
        ...COSMETICS.filter((c) => c.kind === sec.kind).map((c) => c.id),
      ];
      const total = opts.length * cw + (opts.length - 1) * gap;
      opts.forEach((id, i) => {
        const x = W / 2 - total / 2 + cw / 2 + i * (cw + gap);
        const cy = hy + 40 + ch / 2;
        const def = id ? getCosmetic(id) : undefined;
        const owned = owns(id);
        const worn = save.look[sec.kind] === id;
        this.root.add(panel(this, x, cy, cw, ch, worn ? 'paper' : 'inset'));
        const key =
          sec.kind === 'hero' ? heroLookPreview(this, id) : id ? cosmeticTexture(this, id) : null;
        if (key) {
          const src = this.textures.get(key).getSourceImage();
          const img = this.add
            .image(x, cy - 16, key)
            .setScale(Math.min(80 / src.height, 120 / src.width, 4));
          if (!owned) img.setTint(0x222230);
          this.root.add(img);
        } else {
          const none = worn
            ? ink(this, x, cy - 16, '—', 30)
            : this.add.text(x, cy - 16, '—', textStyle(30, COLORS.textDim));
          this.root.add(none.setOrigin(0.5));
        }
        const label = def ? t(def.name) : sec.none;
        const name = worn
          ? ink(this, x, cy + 30, label, 18, '#5a3a20')
          : this.add.text(x, cy + 30, label, textStyle(18, owned ? COLORS.text : COLORS.textDim));
        this.root.add(fitText(name.setOrigin(0.5), cw - 14));
        const state = worn
          ? t('使用中')
          : owned
            ? ''
            : t('{band}でもらえる', { band: t(RANK_REWARDS[def!.band].label) });
        if (state)
          this.root.add(
            fitText(
              (worn
                ? ink(this, x, cy + 54, state, 16, '#3a8a3a')
                : this.add.text(x, cy + 54, state, textStyle(16, COLORS.textWarn))
              ).setOrigin(0.5),
              cw - 12,
            ),
          );
        const hit = this.add.zone(x, cy, cw, ch).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => wear(sec.kind, id));
        this.root.add(hit);
      });
    });
  }

  // ---- 2週替わりの挑戦 ----
  private renderChallenge(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, t('2週替わりの挑戦'), 400));
    // Cosmetics earned from the challenge ranking
    this.root.add(
      new Button(this, W - 64, CONTENT_TOP + 40, t('装飾品'), () => this.go('wardrobe'), {
        width: 104,
        height: 56,
        fontSize: 18,
        skin: save.cosmetics.length > 0 || devAllCosmetics() ? 'gold' : undefined,
      }),
    );
    const now = Date.now();
    const start = challengeStart(devChallengeOpen());
    const ch = currentChallenge(now, start);
    const def = ch?.def ?? firstChallenge();
    const region = getRegion(def.regionId);
    let y = CONTENT_TOP + 100;
    // 説明（羊皮紙）
    const rules = rulesText(def.rules);
    const desc = this.add.text(44, y + 66, t(def.text), {
      ...inkStyle(20),
      wordWrap: { width: W - 88, useAdvancedWrap: true },
    });
    // Rules start below the description (50px fits one or two lines; longer translations push down)
    const rulesTop = 66 + Math.max(50, desc.height + 8);
    const boxH = rulesTop + rules.length * 34 + 34;
    this.root.add(panel(this, W / 2, y + boxH / 2, W - 40, boxH, 'paper'));
    const stage = ink(
      this,
      W - 44,
      y + 26,
      t('舞台: {region}', { region: t(region.name) }),
      22,
      '#7a5a30',
    ).setOrigin(1, 0);
    // The challenge name ends before the stage label on the same row
    this.root.add(
      fitText(ink(this, 44, y + 18, t(def.name), 34, '#8a3a20'), W - 88 - stage.width - 16),
    );
    this.root.add(stage);
    this.root.add(desc);
    rules.forEach((r, i) =>
      this.root.add(
        fitText(
          ink(this, 52, y + rulesTop + i * 34, t('・{rule}', { rule: r }), 20, '#5a3a20'),
          W - 52 - 40,
        ),
      ),
    );
    y += boxH + 24;

    if (!ch) {
      // まだ始まっていない: 予告だけ
      const when =
        start === null
          ? t('リリースから2週間後に開放！')
          : t('開放まで あと{n}日', { n: Math.ceil((start - now) / 86_400_000) });
      this.root.add(
        fitText(
          this.add.text(W / 2, y + 40, when, textStyle(36, '#ffe27a')).setOrigin(0.5),
          W - 40,
        ),
      );
      const lines = [
        t('2週間ごとに、地域と制限が入れ替わります。'),
        t('全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。'),
        t('強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。'),
        t('装備とゴールドは出ません。'),
      ];
      // Fixed 40px rows: shrink rather than wrap
      lines.forEach((l, i) =>
        this.root.add(
          fitText(
            this.add.text(W / 2, y + 110 + i * 40, l, textStyle(20, COLORS.textDim)).setOrigin(0.5),
            W - 40,
          ),
        ),
      );
      return;
    }

    // 期間と自己ベスト
    const left = ch.endsAt - now;
    const days = Math.floor(left / 86_400_000);
    const hours = Math.floor((left % 86_400_000) / 3_600_000);
    const best = save.challenge.period === ch.period ? save.challenge.best : 0;
    this.root.add(
      this.add
        .text(
          W / 2,
          y + 10,
          t('残り {days}日{hours}時間', { days, hours }),
          textStyle(24, COLORS.textDim),
        )
        .setOrigin(0.5),
    );
    this.root.add(
      this.add
        .text(
          W / 2,
          y + 56,
          best > 0 ? t('自己ベスト {score}', { score: num(best) }) : t('まだ挑戦していません'),
          textStyle(32, '#ffe27a'),
        )
        .setOrigin(0.5),
    );
    y += 110;

    // 挑戦用の編成（ふだんの編成とは別）
    const lo = challengeLoadoutOf(save);
    const items = itemMap(save);
    const placed = lo.cells.filter(Boolean).length;
    const origins = lo.cells.filter(
      (u) => u && getItemDef(items.get(u)!.defId).kind === 'origin',
    ).length;
    const loStatus = this.add
      .text(
        W - 40,
        y + 4,
        placed > 0
          ? t('装備 {n}個・起点 {origins}個', { n: placed, origins })
          : t('まだ組んでいません'),
        textStyle(22, COLORS.textDim),
      )
      .setOrigin(1, 0);
    // The heading ends before the right-aligned status
    this.root.add(
      fitText(
        this.add.text(40, y, t('挑戦用の編成'), textStyle(26, COLORS.text)),
        W - 80 - loStatus.width - 16,
      ),
    );
    this.root.add(loStatus);
    y += 48;
    const bad = checkRules(lo, items, def.rules);
    if (placed > 0 && bad.length === 0) {
      this.root.add(
        this.add
          .text(W / 2, y + 10, t('この編成で挑戦できます'), textStyle(22, '#7ad67a'))
          .setOrigin(0.5, 0),
      );
    } else if (placed > 0) {
      bad
        .slice(0, 3)
        .forEach((b, i) =>
          this.root.add(
            fitText(
              this.add
                .text(W / 2, y + 10 + i * 30, b, textStyle(20, COLORS.textWarn))
                .setOrigin(0.5, 0),
              W - 40,
            ),
          ),
        );
    }
    y += 110;
    // ふだんの編成をもとに、制限に合わない装備を入れ替えて「出撃できる形」まで組む（最適にはしない）
    const fromNormal = () => {
      save.challengeLoadout = fitToRules(save, save.loadout, def.rules);
      persist();
      this.showToast(t('ふだんの編成から組みました。並べ方を詰めよう'));
      this.render();
    };
    this.root.add(
      new Button(
        this,
        W / 2,
        y,
        t('ふだんの編成から組む'),
        () => {
          if (placed === 0) fromNormal();
          else
            confirmDialog(
              this,
              t('ふだんの編成から組む'),
              t(
                '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。',
              ),
              t('組み直す'),
              fromNormal,
            );
        },
        { width: 440, height: 76, fontSize: 24, skin: 'green' },
      ),
    );
    this.root.add(
      fitText(
        this.add
          .text(
            W / 2,
            y + 56,
            t('出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第'),
            textStyle(18, COLORS.textDim),
          )
          .setOrigin(0.5, 0),
        W - 40,
      ),
    );

    const by = CONTENT_BOTTOM - 80;
    const blocked = placed === 0 || bad.length > 0;
    this.root.add(
      new Button(
        this,
        W / 2 - 150,
        by,
        t('編成する'),
        () => this.scene.start('Loadout', { challenge: true }),
        { width: 260, height: 96, fontSize: 28, skin: 'blue', icon: 'bag' },
      ),
    );
    this.root.add(
      new Button(
        this,
        W / 2 + 140,
        by,
        t('挑戦する'),
        () => {
          if (blocked) {
            this.showToast(
              t(placed === 0 ? '挑戦用の編成を組んでください' : '編成が制限に合っていません'),
              true,
            );
            return;
          }
          session.challenge = {
            period: ch.period,
            seed: ch.seed,
            regionId: def.regionId,
            name: def.name,
          };
          this.scene.start('Run');
        },
        {
          width: 280,
          height: 96,
          fontSize: 30,
          skin: blocked ? 'gray' : 'gold',
          icon: 'swords',
        },
      ),
    );
  }

  private renderAchievements(): void {
    const save = getSave();
    this.addBookTabs();
    const done = ACHIEVEMENTS.filter((a) => save.achievements.includes(a.id)).length;
    this.root.add(
      this.add
        .text(
          W / 2,
          CONTENT_TOP + 104,
          t('達成 {done} / {total}', { done, total: ACHIEVEMENTS.length }),
          textStyle(24, '#ffe27a'),
        )
        .setOrigin(0.5),
    );
    const top = CONTENT_TOP + 134;
    const bottom = CONTENT_BOTTOM - 10;
    const content = this.add.container(0, top);
    const rowH = 92;
    // 達成していないものを先に（次の目標が上に来る）。並びは定義の順
    const list = [
      ...ACHIEVEMENTS.filter((a) => !save.achievements.includes(a.id)),
      ...ACHIEVEMENTS.filter((a) => save.achievements.includes(a.id)),
    ];
    list.forEach((a, i) => {
      const y = i * (rowH + 8) + rowH / 2;
      const got = save.achievements.includes(a.id);
      content.add(panel(this, W / 2, y, W - 40, rowH, got ? 'paper' : 'inset'));
      // Name and description end before the right-hand mark (達成 or the reward)
      if (got) {
        const mark = ink(this, W - 44, y - 12, t('達成'), 24, '#3a8a3a').setOrigin(1, 0);
        const textW = W - 88 - mark.width - 16;
        content.add(fitText(ink(this, 44, y - 30, t(a.name), 26, '#8a3a20'), textW));
        content.add(fitText(ink(this, 44, y + 6, t(a.desc), 18, '#7a5a30'), textW));
        content.add(mark);
      } else {
        const mark = this.add
          .text(W - 44, y - 14, `${a.reward}G`, textStyle(26, COLORS.gold))
          .setOrigin(1, 0);
        const textW = W - 88 - mark.width - 16;
        content.add(
          fitText(this.add.text(44, y - 30, t(a.name), textStyle(26, COLORS.text)), textW),
        );
        content.add(
          fitText(this.add.text(44, y + 6, t(a.desc), textStyle(18, COLORS.textDim)), textW),
        );
        content.add(mark);
      }
    });
    this.addScroll(content, top, bottom, list.length * (rowH + 8), 'achievements');
  }

  // ---- 必殺技図鑑 ----
  private renderTechs(): void {
    const save = getSave();
    this.addBookTabs();
    const found = TECHNIQUES.filter((tech) => save.discoveredTechs.includes(tech.id)).length;
    this.root.add(
      this.add
        .text(
          W / 2,
          CONTENT_TOP + 92,
          t('見つけた必殺技 {found} / {total}', { found, total: TECHNIQUES.length }),
          textStyle(24, '#ffe27a'),
        )
        .setOrigin(0.5),
    );
    const top = CONTENT_TOP + 130;
    const rowH = 176;
    // Single lines inside the row panel (W - 40 wide)
    const lineW = W - 100;
    TECHNIQUES.forEach((tech, i) => {
      const y = top + i * (rowH + 10) + rowH / 2;
      const known = save.discoveredTechs.includes(tech.id);
      this.root.add(panel(this, W / 2, y, W - 40, rowH, known ? 'paper' : 'inset'));
      const color = TECH_CSS[tech.element] ?? '#5a3a20';
      if (known) {
        this.root.add(fitText(ink(this, 50, y - 64, t(tech.name), 34, color), lineW));
        this.root.add(
          fitText(
            ink(this, 50, y - 14, t('発動：{hint}', { hint: t(tech.hint) }), 20, '#5a3a20'),
            lineW,
          ),
        );
        this.root.add(
          fitText(
            ink(
              this,
              50,
              y + 22,
              t('3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む'),
              18,
              '#7a5a30',
            ),
            lineW,
          ),
        );
        // 並びのアイコン（それぞれの段の最初の装備）
        tech.seq.forEach((opts, step) => {
          const x = W - 230 + step * 76;
          this.root.add(this.add.image(x, y + 50, iconKey(opts[0]!)).setScale(3));
          if (step < 2)
            this.root.add(
              this.add.text(x + 38, y + 50, '›', textStyle(28, '#7a5a30')).setOrigin(0.5),
            );
        });
      } else {
        this.root.add(this.add.text(50, y - 64, t('？？？'), textStyle(34, COLORS.textDim)));
        this.root.add(
          fitText(
            this.add.text(
              50,
              y - 10,
              t('ヒント：{teaser}', { teaser: t(tech.teaser) }),
              textStyle(22, COLORS.textDim),
            ),
            lineW,
          ),
        );
      }
    });
  }

  /** 拠点のプレミアムの案内: タップで中身を説明して、購入へ */
  private addPremiumBar(y: number): void {
    const prem = isPremium();
    const w = W - 60;
    const bar = this.add.container(W / 2, y);
    const bg = panel(this, 0, 0, w, 62, 'plate').setInteractive({ useHandCursor: true });
    const crown = this.add.image(-w / 2 + 34, 0, 'ic_crown').setScale(2.5);
    const text = this.add
      .text(
        -w / 2 + 64,
        0,
        t(
          prem
            ? 'プレミアム：広告なしでご褒美を受け取れます'
            : 'プレミアム {price}｜広告なしでご褒美がもらえる',
          { price: t(PREMIUM_PRICE) },
        ),
        textStyle(20, prem ? COLORS.textDim : '#ffe27a'),
      )
      .setOrigin(0, 0.5);
    const more = prem
      ? null
      : this.add.text(w / 2 - 18, 0, t('詳しく ›'), textStyle(18, COLORS.text)).setOrigin(1, 0.5);
    // The message ends before "詳しく ›" (or the bar's right edge)
    fitText(text, w / 2 - 18 - (more ? more.width + 12 : 0) - (-w / 2 + 64));
    bar.add([bg, crown, text]);
    if (more) bar.add(more);
    bindTap(bg, () => {
      sfx('click');
      if (prem) {
        this.showToast(t('広告なしでご褒美を受け取れます'));
        return;
      }
      confirmDialog(
        this,
        t('プレミアム {price}（買い切り）', { price: t(PREMIUM_PRICE) }),
        t(
          '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）',
        ),
        t('購入する'),
        () => {
          void buyPremium(this).then((ok) => {
            if (ok) {
              sfx('openLegend');
              this.showToast(t('プレミアムになりました！'));
            }
            this.render();
          });
        },
        'gold',
      );
    });
    this.root.add(bar);
  }
}
