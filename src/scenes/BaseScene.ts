// 拠点: 出撃、配置、倉庫（売却）、鍛冶屋（付け直し）、強化、カカシ、設定
import Phaser from 'phaser';
import { SIM, TIME_BONUS, UPGRADES, type UpgradeId } from '../config/balance';
import {
  backpackSize,
  buyUpgrade,
  canReorient,
  consumableSlots,
  equippedUids,
  heroStats,
  rerollCost,
  rerollItem,
  sellItems,
  sellPrice,
  specifyExits,
  storageCapacity,
  synthPlan,
  synthesize,
  storageCount,
  upgradeCost,
} from '../core/economy';
import { Rng, randomSeed } from '../core/rng';
import type { Dir, ItemInstance, Rarity } from '../core/types';
import { DIRS } from '../core/types';
import { RARITY_NAMES, getItemDef } from '../data/items';
import { REGIONS, getRegion } from '../data/regions';
import { UNIT_SPRITES, animKey, stillOrigin } from '../data/sprites';
import { sfx } from '../audio/sfx';
import { applySettings, getSave, persist } from '../platform/store';
import { ItemIcon } from '../ui/itemIcon';
import { describeItem, showItemDetail, type DetailAction } from '../ui/itemInfo';
import { ChestReveal } from '../ui/chestReveal';
import { ItemList } from '../ui/itemList';
import { TAB_BAR_H, TOP_BAR_H, TabBar, TopBar, goTab, type TabId } from '../ui/kit/chrome';
import type { IconName } from '../ui/kit/icons';
import {
  Button,
  RoundButton,
  choiceDialog,
  confirmDialog,
  ink,
  panel,
  ribbon,
  type Choice,
} from '../ui/kit/widgets';
import { generateBackgroundTextures } from '../ui/textures';
import { COLORS, H, W, inkStyle, rarityCss, textStyle } from '../ui/theme';

type Page = 'home' | 'storage' | 'smith' | 'upgrade' | 'settings' | 'help';

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
      '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。ATBがたまると起点が順に発火し、つながった装備が順番に攻撃します。',
      '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。',
      '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます（上限60秒）。',
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
    title: '倉庫・鍛冶屋・合成',
    lines: [
      '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。',
      '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。',
      '・同じ装備・同じレアリティを3つ集めると、詳細カードの「合成」で1つ上のレアリティにできます（コモン→レア20G、レア→エピック100G、エピック→レジェンダリー500G）。追加効果と出口の向きは新しく決まります。',
    ],
  },
];

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export class BaseScene extends Phaser.Scene {
  private page: Page = 'home';
  private root!: Phaser.GameObjects.Container;
  private selected: string | null = null;
  private specify: Dir[] = [];
  /** 倉庫の「まとめて売る」で選んでいる uid（null = 選ぶモードではない） */
  private sellPick: Set<string> | null = null;
  /** 一括売却で、追加効果（✦）つきの装備を残すか */
  private keepAffixes = true;
  private toast: Phaser.GameObjects.Text | null = null;

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
    }
    this.root.add(new TopBar(this, save, () => this.go('settings')));
    const tab: TabId = this.page === 'settings' || this.page === 'help' ? 'home' : this.page;
    this.root.add(
      new TabBar(this, tab, (id) => {
        sfx('click');
        if (id === 'loadout') goTab(this, id);
        else this.go(id);
      }),
    );
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
    this.root.add([glow, shadow, hero]);
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
    const block = storageCount(save) > storageCapacity(save);
    this.root.add(
      new RoundButton(this, W - 70, 340, 96, 'chest', '倉庫', () => this.go('storage')).setBadge(
        block,
      ),
    );
    this.root.add(
      new RoundButton(this, W - 70, 480, 96, 'anvil', '鍛冶屋', () => this.go('smith')),
    );

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
            W / 2,
            836,
            '倉庫があふれています。売却するまで出撃できません',
            textStyle(20, COLORS.textWarn),
          )
          .setOrigin(0.5),
      );
    }

    // 記録（羊皮紙）
    const st = save.stats;
    const py = 990;
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
              // アーティファクトは誤って売らないよう確認する
              if (getItemDef(it.defId).artifact)
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
          if (pick.has(it.uid)) pick.delete(it.uid);
          else pick.add(it.uid);
          sfx('click');
          list.setItems(stored());
          refreshPick();
        },
        onLongPress: openDetail,
      },
      (it) => (pick?.has(it.uid) ? '売る' : null),
    );
    list.setItems(stored());
    this.root.add(list);
    const hint = this.add
      .text(
        W / 2,
        950,
        pick
          ? '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）'
          : 'タップで能力を確認・売却。装備中のものは一覧に出ません',
        textStyle(20, pick ? COLORS.gold : COLORS.textDim),
      )
      .setOrigin(0.5);
    this.root.add(hint);

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
          if (d.kind === 'consumable' || d.artifact || i.locked) return false;
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
          '装備中・ロック中・消耗品・アーティファクトは売りません',
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
    const save = getSave();
    this.root.add(ribbon(this, W / 2, CONTENT_TOP + 40, '鍛冶屋'));
    const eq = equippedUids(save);
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
      (it) => (eq.has(it.uid) ? '装備中' : null),
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
      maxHp: `最大HP ${hs.maxHp}`,
      atb: `ATB ${hs.atbTime.toFixed(2)}秒`,
      attack: `攻撃倍率 ×${hs.attackMult.toFixed(2)}`,
      runTime: `出撃 ${hs.runTime}秒（延長込みの上限 ${TIME_BONUS.maxRunTime}秒）`,
      backpack: `${bp.width}×${bp.height}マス`,
      consumableSlots: `${consumableSlots(save)}枠`,
      storage: `${storageCapacity(save)}個`,
    };
    (Object.keys(UPGRADES) as UpgradeId[]).forEach((id, i) => {
      const def = UPGRADES[id];
      const lv = save.upgrades[id];
      const cost = upgradeCost(id, lv);
      // 7項目を1画面に収める（1行 128px）
      const y = CONTENT_TOP + 132 + i * 128;
      this.root.add(panel(this, W / 2, y, W - 30, 120, 'panel'));
      this.root.add(new RoundButton(this, 80, y, 84, UPGRADE_ICON[id], null, () => undefined));
      this.root.add(this.add.text(140, y - 44, def.name, textStyle(26)));
      this.root.add(this.add.text(140, y - 8, now[id], textStyle(18, COLORS.textDim)));
      // 段階のつぶ
      const pips = def.maxLevel;
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
    this.root.add(
      new Button(this, W / 2, 960, '遊び方・強くなるコツ', () => this.go('help'), {
        width: 460,
        height: 84,
        fontSize: 26,
        skin: 'blue',
        icon: 'book',
      }),
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
        if (!ok || !plan.to) {
          if (plan.reason) this.showToast(plan.reason, true);
          reopen();
          return;
        }
        const def = getItemDef(it.defId);
        confirmDialog(
          this,
          '合成',
          `${def.name}（${RARITY_NAMES[it.rarity]}）を3つ使って、\n${RARITY_NAMES[plan.to]}を1つ作ります（${plan.cost}G）。\n追加効果と出口の向きは新しく決まります`,
          '合成する',
          () => {
            const save = getSave();
            const made = synthesize(save, it.uid, new Rng(randomSeed()));
            if (!made) return;
            persist();
            this.render();
            this.showSynthResult(made);
          },
          'blue',
        );
      },
    };
  }

  /** 合成の結果: 宝箱から出てくる演出。開いたあとタップで閉じる */
  private showSynthResult(made: ItemInstance): void {
    const root = this.add.container(0, 0).setDepth(2700);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0, 0).setInteractive();
    root.add(shade);
    root.add(this.add.text(W / 2, H / 2 - 220, '合成！', textStyle(56, '#ffe27a')).setOrigin(0.5));
    const hint = this.add
      .text(W / 2, H / 2 + 200, '', textStyle(22, COLORS.textDim))
      .setOrigin(0.5);
    root.add(hint);
    const reveal = new ChestReveal(this, [made], {
      position: () => ({ x: W / 2, y: H / 2 }),
      iconSize: 160,
      shake: getSave().settings.shake,
      onDone: () => hint.setText('タップで閉じる'),
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
    const contentH = y;
    const viewH = bottom - top;
    const mask = this.make.graphics({}, false);
    mask.fillRect(0, top, W, viewH);
    content.setMask(mask.createGeometryMask());
    this.root.add(content);
    // ドラッグでスクロール
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
    // ホイール（PC）
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.page !== 'help') return;
      scroll = clamp(scroll + dy);
      content.y = top - scroll;
    });
  }
}
