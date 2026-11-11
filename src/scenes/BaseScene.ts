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
import { otherPresetUse, presetMark } from '../core/presets';
import {
  challengeStart,
  checkRules,
  currentChallenge,
  firstChallenge,
  rulesText,
} from '../core/challenge';
import { session } from '../platform/session';
import { devChallengeOpen } from '../platform/debug';
import { RANK_REWARDS, endlessSeason, seasonLabel, type RankMode } from '../core/ranking';
import { nameText } from '../core/names';
import {
  claimSeasonRewards,
  fetchBoard,
  fetchMyRank,
  randomName,
  rankingReady,
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
  | 'ranking';

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

/** ヘルプの中身（数値は balance.ts と合わせる） */
const HELP_SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: '基本',
    lines: [
      '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。',
      '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。',
      '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。',
    ],
  },
  {
    title: 'ダメージの決まり方',
    lines: [
      '攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）',
      '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンダリー×4',
      '・連鎖倍率：1段ごとに×1.2、6段目で上限×2.5（循環の環を通ると上限×4.0）',
      '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2',
      '・強化：拠点の「攻撃倍率」',
      '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）',
    ],
  },
  {
    title: 'ダメージを伸ばすコツ',
    lines: [
      '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。',
      '・コンボを作る。状態を付ける装備（水筒・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。',
      '・強い装備ほど後ろ（6段目以降）に置く。前の段は軽い装備や状態付与に。',
      '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。',
      '・装備の左下の✦は追加効果。先駆け（3段目まで強い）は短い連鎖に、締め（6段目以降強い）は長い連鎖に向きます。',
    ],
  },
  {
    title: '必殺技',
    lines: [
      '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。',
      `・必殺技は全部で${TECHNIQUES.length}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。`,
    ],
  },
  {
    title: '短い連鎖と長い連鎖',
    lines: [
      '・次の発火までの待ちは、直前の連鎖の段数に比例します。短い連鎖は回転が速く、長い連鎖は一撃が大きい。',
      '・連鎖中は無防備（被ダメージ×1.5）。ただし3段目までは守りが残ります。',
      '・無防備中に大きく被弾すると「よろめき」、残りの段が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。',
    ],
  },
  {
    title: '地域と敵',
    lines: [
      '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。',
      '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。',
      '・アーティファクトはごくまれに出る特別な装備です。',
    ],
  },
  {
    title: 'ご褒美とプレミアム',
    lines: [
      '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。',
      `・プレミアム（${MONETIZE.premiumPrice}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。`,
    ],
  },
  {
    title: '倉庫・鍛冶屋・合成',
    lines: [
      '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。',
      '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。',
      '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。',
      '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。',
      '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。',
      '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。',
      '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンダリー25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。',
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

  private showToast(msg: string, warn = false): void {
    this.toast?.destroy();
    this.toast = this.add
      .text(W / 2, CONTENT_BOTTOM - 30, msg, textStyle(30, warn ? COLORS.textWarn : COLORS.gold))
      .setOrigin(0.5)
      .setDepth(2000);
    const t = this.toast;
    this.tweens.add({
      targets: t,
      y: t.y - 40,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => t.destroy(),
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
    }
    this.root.add(new TopBar(this, save, () => this.go('settings')));
    const tab: TabId =
      this.page === 'settings' ||
      this.page === 'help' ||
      this.page === 'techs' ||
      this.page === 'achievements' ||
      this.page === 'challenge' ||
      this.page === 'ranking'
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
    keys.forEach((k) => {
      const h = this.textures.get(k).getSourceImage().height;
      this.root.add(
        this.add
          .tileSprite(0, groundY + 80, W / 2, h, k)
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
      new RoundButton(this, 70, 340, 96, scare, 'カカシ', () => this.scene.start('Dummy')),
    );
    this.root.add(new RoundButton(this, 70, 480, 96, 'gear', '設定', () => this.go('settings')));
    this.root.add(new RoundButton(this, 70, 620, 96, 'book', 'ヘルプ', () => this.go('help')));
    this.root.add(
      new RoundButton(this, 70, 760, 96, 'star', 'ランキング', () => this.go('ranking')),
    );
    this.claimRankRewards();
    // 2週替わりの挑戦（始まるまでは予告）。開いていて今回まだ遊んでいなければ印を付ける
    const ch = currentChallenge(Date.now(), challengeStart(devChallengeOpen()));
    this.root.add(
      new RoundButton(this, W - 70, 760, 96, 'clock', '挑戦', () => this.go('challenge')).setBadge(
        !!ch && save.challenge.period !== ch.period,
      ),
    );
    const block = storageCount(save) > storageCapacity(save);
    this.root.add(
      new RoundButton(this, W - 70, 340, 96, 'chest', '倉庫', () => this.go('storage')).setBadge(
        block,
      ),
    );
    this.root.add(
      new RoundButton(this, W - 70, 480, 96, 'anvil', '鍛冶屋', () => this.go('smith')),
    );
    this.root.add(new RoundButton(this, W - 70, 620, 96, 'crown', '図鑑', () => this.go('techs')));

    // 出撃
    const sortie = new Button(this, W / 2, 760, '出撃', () => this.scene.start('StageSelect'), {
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
        this.add
          .text(
            W / 2 + 40, // 左のランキングの文字に重ねない
            830,
            '倉庫があふれています。売却するまで出撃できません',
            textStyle(19, COLORS.textWarn),
          )
          .setOrigin(0.5),
      );
    }

    // プレミアムの案内（出撃ボタンの下、軽く）
    this.addPremiumBar(878);

    // 記録（羊皮紙）
    const st = save.stats;
    const py = 1032;
    this.root.add(panel(this, W / 2, py, W - 60, 220, 'paper'));
    this.root.add(ink(this, 70, py - 92, '冒険の記録', 26, '#7a3c10'));
    const rows: [string, string][] = [
      ['出撃', `${st.runs}回`],
      ['最大連鎖', `${st.maxStep}段`],
      ['最大ダメージ', `${st.maxDamage}`],
      ['開放した地域', `${save.progress.unlocked.length}/${REGIONS.length}`],
    ];
    rows.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? 70 : W / 2 + 20;
      const y = py - 40 + Math.floor(i / 2) * 56;
      this.root.add(ink(this, x, y, k, 22, '#7a5a30'));
      this.root.add(ink(this, x + 270, y, v, 26).setOrigin(1, 0));
    });
    const bests = REGIONS.filter((r) => save.progress.best[r.id]).map(
      (r) => `${r.name} ${save.progress.best[r.id]}周`,
    );
    this.root.add(
      ink(
        this,
        70,
        py + 70,
        `最高到達: ${bests.length ? bests.join('　') : 'まだありません'}`,
        20,
        '#7a5a30',
      ),
    );
  }

  // ---- 倉庫（売却） ----
  private renderStorage(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '倉庫'));
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
            label: it.locked ? 'ロック中' : `売る ${sellPrice(it)}G`,
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
                  '編成で使っている装備',
                  `${usedIn.map((i) => save.presets[i]!.name).join('・')}で使っています。\n売ると、その編成のマスは空きになります`,
                  '売る',
                  sell,
                );
              // アーティファクトは誤って売らないよう確認する
              else if (getItemDef(it.defId).artifact)
                confirmDialog(
                  this,
                  'アーティファクトを売る',
                  `${getItemDef(it.defId).name}を${sellPrice(it)}Gで売ります`,
                  '売る',
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
            this.showToast('ロック中の装備は売れません', true);
            return;
          }
          if (presetUses.has(it.uid)) {
            sfx('error');
            this.showToast('ほかの編成で使っている装備です（詳細から売れます）', true);
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
      (it) => (pick?.has(it.uid) ? '売る' : presetMark(save, presetUses, it.uid)),
    );
    list.setItems(stored());
    this.root.add(list);
    if (pick) {
      this.root.add(
        this.add
          .text(
            W / 2,
            950,
            '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）',
            textStyle(20, COLORS.gold),
          )
          .setOrigin(0.5),
      );
    } else {
      // 自動売却の設定（ラン後の結果画面で、設定したレアリティ以下の戦利品を売る）
      const st = save.settings;
      const label =
        st.autoSell === 'off'
          ? '自動売却：オフ'
          : `自動売却：${RARITY_NAMES[st.autoSell]}${st.autoSell === 'common' ? '' : '以下'}${st.autoSellKeepAffix ? '（✦は残す）' : ''}`;
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
      confirmDialog(this, title, `${items.length}個を売ります（+${gold}G）`, '売る', () => {
        const g = sellItems(save, uids);
        persist();
        sfx('drop');
        this.sellPick = null;
        this.showToast(`+${g}G`);
        this.render();
      });
    };

    let pickBtn: Button | null = null;
    const refreshPick = () => {
      if (!pick || !pickBtn) return;
      const gold = save.inventory
        .filter((i) => pick.has(i.uid))
        .reduce((sum, i) => sum + sellPrice(i), 0);
      pickBtn.setText(pick.size > 0 ? `${pick.size}個を売る +${gold}G` : '選んで売る');
      pickBtn.setDisabled(pick.size === 0);
    };

    if (pick) {
      this.root.add(
        new Button(
          this,
          W / 2 - 166,
          1060,
          'やめる',
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
        () => sellWithConfirm([...pick], 'まとめて売る'),
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
          'まとめて売る',
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
          return {
            label: `${RARITY_NAMES[r]}${r === 'common' ? '' : '以下'}  ${list.length}個 +${gold}G`,
            disabled: list.length === 0,
            onPick: () =>
              sellWithConfirm(
                list.map((i) => i.uid),
                `${RARITY_NAMES[r]}${r === 'common' ? '' : '以下'}を一括売却`,
              ),
          };
        });
        // 消耗品（装備とは別枠。消耗品枠に入れているもの・ロック中は売らない）
        const consumables = stored().filter(
          (i) => getItemDef(i.defId).kind === 'consumable' && !i.locked && !presetUses.has(i.uid),
        );
        const cGold = consumables.reduce((sum, i) => sum + sellPrice(i), 0);
        choices.push({
          label: `消耗品  ${consumables.length}個 +${cGold}G`,
          disabled: consumables.length === 0,
          skin: 'green',
          onPick: () =>
            sellWithConfirm(
              consumables.map((i) => i.uid),
              '消耗品を一括売却',
            ),
        });
        choices.push({
          label: this.keepAffixes ? '✦付きは残す：オン' : '✦付きは残す：オフ',
          skin: 'blue',
          onPick: () => {
            this.keepAffixes = !this.keepAffixes;
            openBulk();
          },
        });
        choiceDialog(
          this,
          '一括売却',
          choices,
          '装備中・ロック中・編成で使用中・アーティファクトは売りません',
        );
      };
      this.root.add(
        new Button(this, W / 2 + 166, 1060, '一括売却', openBulk, {
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
      ['reorient', '向きの付け直し'],
      ['synth', '合成'],
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
            this.showToast('この装備は向きを付け直せません', true);
            return;
          }
          this.selected = it.uid;
          this.specify = it.exits.slice();
          this.render();
        },
        onLongPress: (it) => showItemDetail(this, it),
      },
      (it) => (eq.has(it.uid) ? '装備中' : presetMark(save, presetUses, it.uid)),
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
      this.root.add(ink(this, W / 2, py + 270, '付け直す装備を選んでください', 26).setOrigin(0.5));
      this.root.add(
        ink(
          this,
          W / 2,
          py + 312,
          '出口の数は変わらず、方向だけが変わります',
          20,
          '#7a5a30',
        ).setOrigin(0.5),
      );
      return;
    }
    const def = getItemDef(it.defId);
    this.root.add(new ItemIcon(this, 110, py + 90, it, 120));
    this.root.add(this.add.text(190, py + 40, def.name, textStyle(34, rarityCss(it.rarity))));
    this.root.add(ink(this, 190, py + 92, describeItem(it)[1] ?? '', 22, '#5a3a20'));
    this.root.add(
      ink(this, 190, py + 124, `付け直し ${it.rerollCount}回（毎回 料金×1.5）`, 18, '#7a5a30'),
    );
    const rc = rerollCost(it, 'reroll');
    const sc = rerollCost(it, 'specify');
    this.root.add(
      new Button(
        this,
        W / 2 - 160,
        py + 210,
        `再抽選 ${rc}G`,
        () => {
          if (!rerollItem(save, it.uid, new Rng(randomSeed()))) {
            this.showToast('ゴールドが足りません', true);
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
          `${isPremium() ? '' : '▶ 広告を見て'}無料で再抽選（今日あと${freeLeft}回）`,
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
    this.root.add(ink(this, 50, py + 290, `指定: ${it.exits.length}方向を選ぶ`, 22));
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
        `指定 ${sc}G`,
        () => {
          if (!specifyExits(save, it.uid, this.specify)) {
            this.showToast(
              ready ? 'ゴールドが足りません' : `方向を${it.exits.length}つ選んでください`,
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
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '強化'));
    const hs = heroStats(save);
    const bp = backpackSize(save.upgrades.backpack);
    const now: Record<UpgradeId, string> = {
      maxHp: `最大HP ${hs.maxHp}${totalStars(save) > 0 ? `（★${totalStars(save)}で+${PROGRESS.starHp * totalStars(save)}込み）` : ''}`,
      atb: `攻撃間隔 ${hs.atbTime.toFixed(2)}秒`,
      attack: `攻撃倍率 ×${hs.attackMult.toFixed(2)}${totalStars(save) > 0 ? `（★${totalStars(save)}で+${Math.round(PROGRESS.starAttack * 100 * totalStars(save))}%込み）` : ''}`,
      runTime: Number.isFinite(TIME_BONUS.maxRunTime)
        ? `出撃 ${hs.runTime}秒（延長込みの上限 ${TIME_BONUS.maxRunTime}秒）`
        : `出撃 ${hs.runTime}秒`,
      backpack: `${bp.width}×${bp.height}マス`,
      consumableSlots: `${consumableSlots(save)}枠`,
      storage: `${storageCapacity(save)}個`,
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
      this.root.add(this.add.text(140, y - 44, def.name, textStyle(26)));
      this.root.add(this.add.text(140, y - 8, now[id], textStyle(18, COLORS.textDim)));
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
          cost === null ? '最大' : `${cost}`,
          () => {
            if (!buyUpgrade(save, id)) {
              this.showToast('ゴールドが足りません', true);
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
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '設定'));
    this.root.add(panel(this, W / 2, 545, W - 40, 670, 'paper'));
    const row = (
      y: number,
      label: string,
      value: string,
      onMinus: (() => void) | null,
      onPlus: () => void,
    ) => {
      this.root.add(ink(this, 70, y, label, 28).setOrigin(0, 0.5));
      this.root.add(ink(this, W - 250, y, value, 30, '#7a3c10').setOrigin(0.5));
      if (onMinus)
        this.root.add(
          new Button(this, W - 360, y, '−', onMinus, { width: 74, height: 70, skin: 'blue' }),
        );
      this.root.add(
        new Button(this, W - 120, y, onMinus ? '+' : '切替', onPlus, {
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
      '音量',
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
      'ゲームスピード',
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
    this.root.add(ink(this, 70, 760, '検証用。×2 なら30秒のランが15秒で終わります', 18, '#7a5a30'));
    // プレミアム（買い切り）: 広告を見なくても、広告のご褒美を受け取れる
    const prem = isPremium();
    this.root.add(
      new Button(
        this,
        W / 2 - 110,
        1050,
        prem ? 'プレミアム（購入済み）' : `プレミアム ${PREMIUM_PRICE}`,
        () => {
          if (prem) {
            this.showToast('広告なしでご褒美を受け取れます');
            return;
          }
          void buyPremium(this).then((ok) => {
            if (ok) {
              sfx('openLegend');
              this.showToast('プレミアムになりました！');
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
        '購入を復元',
        () => {
          void restorePurchases().then((ok) => {
            this.showToast(ok ? '購入を復元しました' : '復元できる購入はありません', !ok);
            this.render();
          });
        },
        { width: 200, height: 76, fontSize: 20, skin: 'blue' },
      ),
    );
    this.root.add(
      new Button(this, W / 2 - 110, 960, '遊び方・強くなるコツ', () => this.go('help'), {
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
        '案内をもう一度',
        () => {
          resetTutorials();
          this.showToast('各画面で、案内がもう一度出ます');
        },
        { width: 200, height: 84, fontSize: 20, skin: 'blue' },
      ),
    );
    row(430, '振動', st.haptics ? 'ON' : 'OFF', null, () => {
      st.haptics = !st.haptics;
      changed();
    });
    row(560, '画面揺れ・光', st.shake ? 'ON' : 'OFF', null, () => {
      st.shake = !st.shake;
      changed();
    });
  }

  /** 自動売却の設定 */
  private openAutoSell(): void {
    const save = getSave();
    const st = save.settings;
    const opts: [SaveData['settings']['autoSell'], string][] = [
      ['off', 'オフ（売らない）'],
      ['common', 'コモンを売る'],
      ['rare', 'レア以下を売る'],
      ['epic', 'エピック以下を売る'],
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
      label: st.autoSellKeepAffix ? '✦付きは残す：オン' : '✦付きは残す：オフ',
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
      '自動売却',
      choices,
      'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません',
    );
  }

  /** 初めての人向けの案内（拠点・鍛冶屋） */
  private maybeTutorial(): void {
    if (this.page === 'home') {
      runTutorial(this, 'home', [
        {
          rect: { x: W / 2, y: 760, w: 476, h: 132 },
          text: 'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！',
          onTap: () => this.scene.start('StageSelect'),
        },
      ]);
      // After the first own run: guide to the loadout tab to place the loot
      if (tutorialSeen('result') && !tutorialSeen('loadout'))
        runTutorial(this, 'loadoutGo', [
          {
            rect: { x: (W / 5) * 4.5, y: H - TAB_BAR_H + 56, w: 128, h: 116 },
            text: '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね',
            onTap: () => goTab(this, 'loadout'),
          },
        ]);
    }
    if (this.page === 'smith')
      runTutorial(this, 'smith', [
        {
          rect: { x: W / 2, y: CONTENT_TOP + 40, w: W - 20, h: 80 },
          text: '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ',
        },
      ]);
  }

  // ---- 合成 ----
  /** 詳細カードの「合成」ボタン。揃っていなければ数を出して押せない */
  private synthAction(it: ItemInstance, reopen: () => void): DetailAction {
    const plan = synthPlan(getSave(), it.uid);
    const ok = plan.reason === null && plan.to !== null;
    return {
      label: plan.to === null ? '合成' : ok ? `合成 ${plan.cost}G` : `合成 ${plan.have}/3`,
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
    confirmDialog(
      this,
      '合成',
      `${def.name}（${RARITY_NAMES[it.rarity]}）を3つ使って、${plan.toDefId && plan.toDefId !== it.defId ? getItemDef(plan.toDefId).name + 'の' : ''}${RARITY_NAMES[plan.to]}を狙います（${plan.cost}G）。\n成功率は${Math.round(synthRate(it.rarity) * 100)}%。失敗すると${RARITY_NAMES[it.rarity]}のランダムな装備が1つ手に入ります`,
      '合成する',
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
        if (eq.has(it.uid)) return '装備中';
        if (it.locked) return 'ロック';
        const n = groupCount(it);
        return n >= 3 ? `${n}つ` : presetMark(save, presetUses, it.uid);
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
      this.root.add(ink(this, W / 2, py + 250, '合成する装備を選んでください', 26).setOrigin(0.5));
      this.root.add(
        ink(
          this,
          W / 2,
          py + 292,
          '同じ装備・同じレアリティを3つで、1つ上のレアリティに',
          20,
          '#7a5a30',
        ).setOrigin(0.5),
      );
      this.root.add(
        ink(
          this,
          W / 2,
          py + 326,
          '「○つ」の印は、3つ以上揃っている装備です',
          18,
          '#7a5a30',
        ).setOrigin(0.5),
      );
      return;
    }
    const def = getItemDef(it.defId);
    const plan = synthPlan(save, it.uid);
    this.root.add(new ItemIcon(this, 110, py + 90, it, 120));
    this.root.add(this.add.text(190, py + 40, def.name, textStyle(34, rarityCss(it.rarity))));
    this.root.add(
      ink(
        this,
        190,
        py + 92,
        plan.to
          ? `${RARITY_NAMES[it.rarity]} ×3 → ${
              plan.toDefId && plan.toDefId !== it.defId ? `${getItemDef(plan.toDefId).name}の` : ''
            }${RARITY_NAMES[plan.to]} ×1`
          : 'これ以上のレアリティはありません',
        24,
        '#5a3a20',
      ),
    );
    this.root.add(
      ink(
        this,
        190,
        py + 128,
        `使える数: ${groupCount(it)}つ（装備中・ロック中・ほかの編成で使用中は除く）`,
        18,
        '#7a5a30',
      ),
    );
    if (plan.to) {
      this.root.add(
        ink(this, 50, py + 176, `成功率 ${Math.round(synthRate(it.rarity) * 100)}%`, 28, '#2a6a30'),
      );
      this.root.add(
        ink(
          this,
          50,
          py + 214,
          `失敗すると${RARITY_NAMES[it.rarity]}のランダムな装備が1つ（追加効果・向きは新しく）`,
          18,
          '#7a5a30',
        ),
      );
    }
    this.root.add(
      new Button(
        this,
        W / 2,
        py + 290,
        plan.to ? `合成する ${plan.cost}G` : '合成できません',
        () => this.confirmSynth(it),
        { width: 420, height: 88, fontSize: 30, skin: 'blue', icon: 'up', disabled: !!plan.reason },
      ),
    );
    if (plan.reason)
      this.root.add(ink(this, W / 2, py + 360, plan.reason, 22, '#a03020').setOrigin(0.5));
  }

  /** 合成の結果: 宝箱から出てくる演出。成否は開いたあとに出す。開いたあとタップで閉じる */
  private showSynthResult(made: ItemInstance, success: boolean): void {
    const root = this.add.container(0, 0).setDepth(2700);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0, 0).setInteractive();
    root.add(shade);
    const title = this.add
      .text(W / 2, H / 2 - 220, '合成中…', textStyle(56, '#ffe27a'))
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
        hint.setText('タップで閉じる');
        title.setText(success ? '合成成功！' : '失敗…').setColor(success ? '#ffe27a' : '#a0a0b8');
        this.tweens.add({
          targets: title,
          scale: { from: 1.4, to: 1 },
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
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '遊び方・強くなるコツ', 420));
    const top = CONTENT_TOP + 90;
    const bottom = CONTENT_BOTTOM - 10;
    this.root.add(panel(this, W / 2, (top + bottom) / 2, W - 30, bottom - top + 10, 'paper'));
    // 中身（縦に流す。はみ出した分はドラッグでスクロール）
    const content = this.add.container(0, top);
    let y = 24;
    const left = 44;
    const width = W - 88;
    for (const sec of HELP_SECTIONS) {
      const h = ink(this, left, y, sec.title, 28, '#8a3a20');
      content.add(h);
      y += h.height + 10;
      for (const line of sec.lines) {
        const bullet = line.startsWith('・') || line.startsWith('　');
        const t = this.add.text(left + (bullet ? 8 : 0), y, line, {
          ...inkStyle(20),
          wordWrap: { width: width - (bullet ? 8 : 0), useAdvancedWrap: true },
          lineSpacing: 4,
        });
        content.add(t);
        y += t.height + 8;
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
      ['techs', '必殺技'],
      ['achievements', '実績'],
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
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, 'ランキング', 420));
    const now = Date.now();
    const ch = currentChallenge(now, challengeStart(devChallengeOpen()));
    const tabs: [RankMode, string][] = [
      ['challenge', '2週替わりの挑戦'],
      ['endless', 'エンドレス（月ごと）'],
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
      this.add
        .text(
          W / 2,
          y,
          sid ? seasonLabel(sid) : '挑戦はまだ始まっていません',
          textStyle(26, '#ffe27a'),
        )
        .setOrigin(0.5, 0),
    );
    y += 44;
    const myName = save.rankName ? nameText(save.rankName) : '（初めて記録を送るときに決まります）';
    this.root.add(this.add.text(40, y, `あなたの名前: ${myName}`, textStyle(20, COLORS.textDim)));
    if (rankingReady()) {
      this.root.add(
        new Button(
          this,
          W - 90,
          y + 12,
          '変える',
          () => {
            const n = randomName();
            void saveName(n).then((ok) => {
              if (ok === null) return this.showToast('つながりませんでした', true);
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
    const note = `シーズンの終わりに: 上位1% ${rw.top1.gold}G＋称号 / 上位10% ${rw.top10.gold}G＋称号 / 上位50% ${rw.top50.gold}G＋称号 / 参加 ${rw.joined.gold}G`;
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
            !rankingReady()
              ? 'ランキングは、サーバーの準備ができたら開きます'
              : '挑戦が始まったら、ここに順位が出ます',
            textStyle(22, COLORS.textDim),
          )
          .setOrigin(0.5),
      );
      return;
    }
    const loading = this.add
      .text(W / 2, (y + bottom) / 2, '読み込み中…', textStyle(22, COLORS.textDim))
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
            .text(W / 2, (y + bottom) / 2, 'つながりませんでした', textStyle(22, COLORS.textWarn))
            .setOrigin(0.5),
        );
        return;
      }
      const total = me?.total ?? board?.total ?? 0;
      const mine =
        me?.rank != null
          ? `あなた: ${me.rank}位 / ${total}人（上位${Math.max(1, Math.ceil((me.rank / Math.max(1, total)) * 100))}%）`
          : `まだ記録がありません（参加 ${total}人）`;
      this.root.add(this.add.text(W / 2, y, mine, textStyle(24, COLORS.text)).setOrigin(0.5, 0));
      const top = y + 46;
      const content = this.add.container(0, top);
      const rows = board?.top ?? [];
      rows.forEach((r, i) => {
        const ry = i * 52;
        const me2 = save.rankName && r.name === nameText(save.rankName);
        content.add(panel(this, W / 2, ry + 24, W - 40, 48, me2 ? 'paper' : 'inset'));
        const col = me2 ? '#5a3a20' : r.rank <= 3 ? '#ffe27a' : COLORS.text;
        content.add(this.add.text(40, ry + 10, `${r.rank}`, textStyle(22, col)));
        content.add(this.add.text(100, ry + 10, r.name, textStyle(20, col)));
        const val =
          mode === 'challenge'
            ? Math.round(r.totalDamage).toLocaleString('ja-JP')
            : `${r.reachedLoop}周・${Math.round(r.totalDamage).toLocaleString('ja-JP')}`;
        content.add(this.add.text(W - 40, ry + 10, val, textStyle(20, col)).setOrigin(1, 0));
      });
      if (rows.length === 0)
        content.add(
          this.add
            .text(W / 2, 40, 'まだ誰も記録していません', textStyle(22, COLORS.textDim))
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
      for (const r of list) {
        const rw = RANK_REWARDS[r.band];
        save.gold += rw.gold;
        const label = seasonLabel(r.season);
        if (rw.title) save.titles.unshift(`${label} ${rw.title}`);
        lines.push(`${label}: ${r.rank}位 / ${r.total}人（${rw.label}）  +${rw.gold}G`);
      }
      save.titles = save.titles.slice(0, 50);
      persist();
      if (this.page === 'home') this.render();
      confirmDialog(this, 'ランキングの報酬', lines.join('\n'), '受け取る', () => undefined);
    });
  }

  // ---- 2週替わりの挑戦 ----
  private renderChallenge(): void {
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '2週替わりの挑戦', 420));
    const now = Date.now();
    const start = challengeStart(devChallengeOpen());
    const ch = currentChallenge(now, start);
    const def = ch?.def ?? firstChallenge();
    const region = getRegion(def.regionId);
    let y = CONTENT_TOP + 100;
    // 説明（羊皮紙）
    const rules = rulesText(def.rules);
    const boxH = 150 + rules.length * 34;
    this.root.add(panel(this, W / 2, y + boxH / 2, W - 40, boxH, 'paper'));
    this.root.add(ink(this, 44, y + 18, def.name, 34, '#8a3a20'));
    this.root.add(ink(this, W - 44, y + 26, `舞台: ${region.name}`, 22, '#7a5a30').setOrigin(1, 0));
    this.root.add(
      this.add.text(44, y + 66, def.text, {
        ...inkStyle(20),
        wordWrap: { width: W - 88, useAdvancedWrap: true },
      }),
    );
    rules.forEach((r, i) =>
      this.root.add(ink(this, 52, y + 116 + i * 34, `・${r}`, 20, '#5a3a20')),
    );
    y += boxH + 24;

    if (!ch) {
      // まだ始まっていない: 予告だけ
      const when =
        start === null
          ? 'リリースから2週間後に開放！'
          : `開放まで あと${Math.ceil((start - now) / 86_400_000)}日`;
      this.root.add(this.add.text(W / 2, y + 40, when, textStyle(36, '#ffe27a')).setOrigin(0.5));
      const lines = [
        '2週間ごとに、地域と制限が入れ替わります。',
        '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。',
        '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。',
        '装備とゴールドは出ません。',
      ];
      lines.forEach((l, i) =>
        this.root.add(
          this.add.text(W / 2, y + 110 + i * 40, l, textStyle(20, COLORS.textDim)).setOrigin(0.5),
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
        .text(W / 2, y + 10, `残り ${days}日${hours}時間`, textStyle(24, COLORS.textDim))
        .setOrigin(0.5),
    );
    this.root.add(
      this.add
        .text(
          W / 2,
          y + 56,
          best > 0 ? `自己ベスト ${best.toLocaleString('ja-JP')}` : 'まだ挑戦していません',
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
    this.root.add(this.add.text(40, y, '挑戦用の編成', textStyle(26, COLORS.text)));
    this.root.add(
      this.add
        .text(
          W - 40,
          y + 4,
          placed > 0 ? `装備 ${placed}個・起点 ${origins}個` : 'まだ組んでいません',
          textStyle(22, COLORS.textDim),
        )
        .setOrigin(1, 0),
    );
    y += 48;
    const bad = checkRules(lo, items, def.rules);
    if (placed > 0 && bad.length === 0) {
      this.root.add(
        this.add
          .text(W / 2, y + 10, 'この編成で挑戦できます', textStyle(22, '#7ad67a'))
          .setOrigin(0.5, 0),
      );
    } else if (placed > 0) {
      bad
        .slice(0, 3)
        .forEach((b, i) =>
          this.root.add(
            this.add
              .text(W / 2, y + 10 + i * 30, b, textStyle(20, COLORS.textWarn))
              .setOrigin(0.5, 0),
          ),
        );
    }
    y += 110;
    // ふだんの編成をもとに、制限に合わない装備を入れ替えて「出撃できる形」まで組む（最適にはしない）
    const fromNormal = () => {
      save.challengeLoadout = fitToRules(save, save.loadout, def.rules);
      persist();
      this.showToast('ふだんの編成から組みました。並べ方を詰めよう');
      this.render();
    };
    this.root.add(
      new Button(
        this,
        W / 2,
        y,
        'ふだんの編成から組む',
        () => {
          if (placed === 0) fromNormal();
          else
            confirmDialog(
              this,
              'ふだんの編成から組む',
              '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。',
              '組み直す',
              fromNormal,
            );
        },
        { width: 440, height: 76, fontSize: 24, skin: 'green' },
      ),
    );
    this.root.add(
      this.add
        .text(
          W / 2,
          y + 56,
          '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第',
          textStyle(18, COLORS.textDim),
        )
        .setOrigin(0.5, 0),
    );

    const by = CONTENT_BOTTOM - 80;
    const blocked = placed === 0 || bad.length > 0;
    this.root.add(
      new Button(
        this,
        W / 2 - 150,
        by,
        '編成する',
        () => this.scene.start('Loadout', { challenge: true }),
        { width: 260, height: 96, fontSize: 28, skin: 'blue', icon: 'bag' },
      ),
    );
    this.root.add(
      new Button(
        this,
        W / 2 + 140,
        by,
        '挑戦する',
        () => {
          if (blocked) {
            this.showToast(
              placed === 0 ? '挑戦用の編成を組んでください' : '編成が制限に合っていません',
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
          `達成 ${done} / ${ACHIEVEMENTS.length}`,
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
      if (got) {
        content.add(ink(this, 44, y - 30, a.name, 26, '#8a3a20'));
        content.add(ink(this, 44, y + 6, a.desc, 18, '#7a5a30'));
        content.add(ink(this, W - 44, y - 12, '達成', 24, '#3a8a3a').setOrigin(1, 0));
      } else {
        content.add(this.add.text(44, y - 30, a.name, textStyle(26, COLORS.text)));
        content.add(this.add.text(44, y + 6, a.desc, textStyle(18, COLORS.textDim)));
        content.add(
          this.add.text(W - 44, y - 14, `${a.reward}G`, textStyle(26, COLORS.gold)).setOrigin(1, 0),
        );
      }
    });
    this.addScroll(content, top, bottom, list.length * (rowH + 8), 'achievements');
  }

  // ---- 必殺技図鑑 ----
  private renderTechs(): void {
    const save = getSave();
    this.addBookTabs();
    const found = TECHNIQUES.filter((t) => save.discoveredTechs.includes(t.id)).length;
    this.root.add(
      this.add
        .text(
          W / 2,
          CONTENT_TOP + 92,
          `見つけた必殺技 ${found} / ${TECHNIQUES.length}`,
          textStyle(24, '#ffe27a'),
        )
        .setOrigin(0.5),
    );
    const top = CONTENT_TOP + 130;
    const rowH = 176;
    TECHNIQUES.forEach((t, i) => {
      const y = top + i * (rowH + 10) + rowH / 2;
      const known = save.discoveredTechs.includes(t.id);
      this.root.add(panel(this, W / 2, y, W - 40, rowH, known ? 'paper' : 'inset'));
      const color = TECH_CSS[t.element] ?? '#5a3a20';
      if (known) {
        this.root.add(ink(this, 50, y - 64, t.name, 34, color));
        this.root.add(ink(this, 50, y - 14, `発動：${t.hint}`, 20, '#5a3a20'));
        this.root.add(
          ink(this, 50, y + 22, '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む', 18, '#7a5a30'),
        );
        // 並びのアイコン（それぞれの段の最初の装備）
        t.seq.forEach((opts, k) => {
          const x = W - 230 + k * 76;
          this.root.add(this.add.image(x, y + 50, iconKey(opts[0]!)).setScale(3));
          if (k < 2)
            this.root.add(
              this.add.text(x + 38, y + 50, '›', textStyle(28, '#7a5a30')).setOrigin(0.5),
            );
        });
      } else {
        this.root.add(this.add.text(50, y - 64, '？？？', textStyle(34, COLORS.textDim)));
        this.root.add(
          this.add.text(50, y - 10, `ヒント：${t.teaser}`, textStyle(22, COLORS.textDim)),
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
        prem
          ? 'プレミアム：広告なしでご褒美を受け取れます'
          : `プレミアム ${PREMIUM_PRICE}｜広告なしでご褒美がもらえる`,
        textStyle(20, prem ? COLORS.textDim : '#ffe27a'),
      )
      .setOrigin(0, 0.5);
    bar.add([bg, crown, text]);
    if (!prem)
      bar.add(
        this.add.text(w / 2 - 18, 0, '詳しく ›', textStyle(18, COLORS.text)).setOrigin(1, 0.5),
      );
    bindTap(bg, () => {
      sfx('click');
      if (prem) {
        this.showToast('広告なしでご褒美を受け取れます');
        return;
      }
      confirmDialog(
        this,
        `プレミアム ${PREMIUM_PRICE}（買い切り）`,
        '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）',
        '購入する',
        () => {
          void buyPremium(this).then((ok) => {
            if (ok) {
              sfx('openLegend');
              this.showToast('プレミアムになりました！');
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
