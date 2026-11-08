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
  storageCount,
  upgradeCost,
} from '../core/economy';
import { Rng, randomSeed } from '../core/rng';
import type { Dir, ItemInstance } from '../core/types';
import { DIRS } from '../core/types';
import { getItemDef } from '../data/items';
import { REGIONS, getRegion } from '../data/regions';
import { UNIT_SPRITES, animKey, stillOrigin } from '../data/sprites';
import { sfx } from '../audio/sfx';
import { applySettings, getSave, persist } from '../platform/store';
import { ItemIcon } from '../ui/itemIcon';
import { describeItem, showItemDetail } from '../ui/itemInfo';
import { ItemList } from '../ui/itemList';
import { TAB_BAR_H, TOP_BAR_H, TabBar, TopBar, goTab, type TabId } from '../ui/kit/chrome';
import type { IconName } from '../ui/kit/icons';
import { Button, RoundButton, confirmDialog, ink, panel, ribbon } from '../ui/kit/widgets';
import { generateBackgroundTextures } from '../ui/textures';
import { COLORS, H, W, rarityCss, textStyle } from '../ui/theme';

type Page = 'home' | 'storage' | 'smith' | 'upgrade' | 'settings';

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

export class BaseScene extends Phaser.Scene {
  private page: Page = 'home';
  private root!: Phaser.GameObjects.Container;
  private selected: string | null = null;
  private specify: Dir[] = [];
  /** 倉庫の「まとめて売る」で選んでいる uid（null = 選ぶモードではない） */
  private sellPick: Set<string> | null = null;
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
    }
    this.root.add(new TopBar(this, save, () => this.go('settings')));
    const tab: TabId = this.page === 'settings' ? 'home' : this.page;
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
    const openDetail = (it: ItemInstance) =>
      showItemDetail(this, it, {
        actions: [
          {
            label: `売る ${sellPrice(it)}G`,
            skin: 'gold',
            icon: 'coin',
            onTap: () => {
              const g = sellItems(save, [it.uid]);
              persist();
              sfx('drop');
              this.render();
              this.showToast(`+${g}G`);
            },
          },
        ],
      });
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
      const commons = stored().filter(
        (i) => i.rarity === 'common' && getItemDef(i.defId).kind !== 'consumable',
      );
      this.root.add(
        new Button(
          this,
          W / 2 + 166,
          1060,
          `コモン一括売却 ${commons.length}`,
          () =>
            sellWithConfirm(
              commons.map((i) => i.uid),
              'コモンを一括売却',
            ),
          { width: 320, height: 72, fontSize: 22, skin: 'red', disabled: commons.length === 0 },
        ),
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
    row(430, '振動', st.haptics ? 'ON' : 'OFF', null, () => {
      st.haptics = !st.haptics;
      changed();
    });
    row(560, '画面揺れ・光', st.shake ? 'ON' : 'OFF', null, () => {
      st.shake = !st.shake;
      changed();
    });
  }
}
