// 拠点: 出撃、配置、倉庫（売却）、鍛冶屋（付け直し）、強化、カカシ、設定
import Phaser from 'phaser';
import { UPGRADES, type UpgradeId } from '../config/balance';
import {
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
  backpackSize,
} from '../core/economy';
import { Rng, randomSeed } from '../core/rng';
import type { Dir, ItemInstance } from '../core/types';
import { DIRS } from '../core/types';
import { getItemDef } from '../data/items';
import { sfx } from '../audio/sfx';
import { applySettings, getSave, persist } from '../platform/store';
import { Button } from '../ui/button';
import { ItemIcon } from '../ui/itemIcon';
import { describeItem, showItemDetail } from '../ui/itemInfo';
import { ItemList } from '../ui/itemList';
import { COLORS, H, W, rarityCss, textStyle } from '../ui/theme';

type Page = 'home' | 'storage' | 'smith' | 'upgrade' | 'settings';

const DIR_LABEL: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };

export class BaseScene extends Phaser.Scene {
  private page: Page = 'home';
  private root!: Phaser.GameObjects.Container;
  private selected: string | null = null;
  private specify: Dir[] = [];
  private toast: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Base');
  }

  init(data: { page?: Page }): void {
    this.page = data.page ?? 'home';
    this.selected = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.render();
  }

  private go(page: Page): void {
    this.page = page;
    this.selected = null;
    this.specify = [];
    this.render();
  }

  private showToast(msg: string, warn = false): void {
    this.toast?.destroy();
    this.toast = this.add
      .text(W / 2, H - 60, msg, textStyle(26, warn ? COLORS.textWarn : COLORS.gold))
      .setOrigin(0.5)
      .setDepth(2000);
    const t = this.toast;
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1400,
      duration: 400,
      onComplete: () => t.destroy(),
    });
  }

  private render(): void {
    this.root?.destroy();
    this.input.removeAllListeners('pointermove');
    this.input.removeAllListeners('pointerup');
    this.root = this.add.container(0, 0);
    const save = getSave();
    // 共通ヘッダー
    this.root.add(this.add.text(30, 30, `${save.gold} G`, textStyle(40, COLORS.gold)));
    const cap = storageCapacity(save);
    const cnt = storageCount(save);
    this.root.add(
      this.add
        .text(
          W - 30,
          38,
          `倉庫 ${cnt}/${cap}`,
          textStyle(28, cnt > cap ? COLORS.textWarn : COLORS.textDim),
        )
        .setOrigin(1, 0),
    );
    if (this.page !== 'home') {
      this.root.add(
        new Button(this, 100, H - 140, '← 拠点', () => this.go('home'), { width: 160, height: 64 }),
      );
    }
    switch (this.page) {
      case 'home':
        return this.renderHome();
      case 'storage':
        return this.renderStorage();
      case 'smith':
        return this.renderSmith();
      case 'upgrade':
        return this.renderUpgrade();
      case 'settings':
        return this.renderSettings();
    }
  }

  private renderHome(): void {
    const save = getSave();
    this.root.add(
      this.add.text(W / 2, 170, 'Chainpack Rush', textStyle(60, COLORS.accentText)).setOrigin(0.5),
    );
    this.root.add(
      this.add
        .text(W / 2, 235, '30-Second Loot Chains', textStyle(26, COLORS.textDim))
        .setOrigin(0.5),
    );
    const hero = this.add
      .image(W / 2, 470, 'hero')
      .setScale(3)
      .setOrigin(0.5, 1);
    this.root.add(hero);
    this.tweens.add({
      targets: hero,
      y: 462,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });

    const btn = (y: number, label: string, fn: () => void, x = W / 2, w = 560) =>
      this.root.add(new Button(this, x, y, label, fn, { width: w, height: 84, fontSize: 32 }));
    btn(580, '出撃', () => this.scene.start('StageSelect'));
    btn(690, '配置', () => this.scene.start('Loadout'));
    btn(800, '倉庫（売却）', () => this.go('storage'), W / 2 - 145, 270);
    btn(800, '鍛冶屋', () => this.go('smith'), W / 2 + 145, 270);
    btn(910, '強化', () => this.go('upgrade'), W / 2 - 145, 270);
    btn(910, 'カカシ', () => this.scene.start('Dummy'), W / 2 + 145, 270);
    btn(1020, '設定', () => this.go('settings'), W / 2, 270);

    const st = save.stats;
    this.root.add(
      this.add
        .text(
          W / 2,
          1130,
          `出撃 ${st.runs}回　最大連鎖 ${st.maxStep}段　最大ダメージ ${st.maxDamage}`,
          textStyle(22, COLORS.textDim),
        )
        .setOrigin(0.5),
    );
    if (storageCount(save) > storageCapacity(save)) {
      this.root.add(
        this.add
          .text(
            W / 2,
            1180,
            '倉庫があふれています。売却するまで出撃できません',
            textStyle(24, COLORS.textWarn),
          )
          .setOrigin(0.5),
      );
    }
  }

  // ---- 倉庫（売却） ----
  private renderStorage(): void {
    const save = getSave();
    this.root.add(this.add.text(W / 2, 110, '倉庫（売却）', textStyle(40)).setOrigin(0.5));
    const eq = equippedUids(save);
    const list = new ItemList(this, 160, 880, {
      onTap: (it) => {
        this.selected = this.selected === it.uid ? null : it.uid;
        list.setSelected(this.selected);
        info.setText(
          this.selected ? `${getItemDef(it.defId).name}　${sellPrice(it)}G で売れます` : '',
        );
        sellBtn.setDisabled(!this.selected);
      },
      onLongPress: (it) => showItemDetail(this, it),
    });
    list.setItems(save.inventory.filter((i) => !eq.has(i.uid)));
    this.root.add(list);
    const info = this.add.text(W / 2, 910, '', textStyle(26)).setOrigin(0.5);
    this.root.add(info);
    const sellBtn = new Button(
      this,
      W / 2,
      980,
      '売る',
      () => {
        if (!this.selected) return;
        const g = sellItems(save, [this.selected]);
        persist();
        sfx('drop');
        this.showToast(`+${g}G`);
        this.selected = null;
        this.render();
      },
      { width: 300, height: 72, disabled: true },
    );
    this.root.add(sellBtn);
    const bulk = (x: number, label: string, pred: (it: ItemInstance) => boolean) => {
      const targets = save.inventory.filter((i) => !eq.has(i.uid) && pred(i));
      this.root.add(
        new Button(
          this,
          x,
          1070,
          `${label}（${targets.length}）`,
          () => {
            const g = sellItems(
              save,
              targets.map((t) => t.uid),
            );
            persist();
            sfx('drop');
            this.showToast(`+${g}G`);
            this.render();
          },
          { width: 300, height: 64, fontSize: 22, disabled: targets.length === 0 },
        ),
      );
    };
    bulk(
      W / 2 - 160,
      'コモンを一括',
      (i) => i.rarity === 'common' && getItemDef(i.defId).kind !== 'consumable',
    );
    bulk(W / 2 + 160, '消耗品を一括', (i) => getItemDef(i.defId).kind === 'consumable');
    this.root.add(
      this.add
        .text(W - 30, H - 140, '装備中のものは一覧に出ません', textStyle(20, COLORS.textDim))
        .setOrigin(1, 0.5),
    );
  }

  // ---- 鍛冶屋（向きの付け直し） ----
  private renderSmith(): void {
    const save = getSave();
    this.root.add(
      this.add.text(W / 2, 110, '鍛冶屋（向きの付け直し）', textStyle(36)).setOrigin(0.5),
    );
    const eq = equippedUids(save);
    const list = new ItemList(
      this,
      160,
      700,
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

    const it = save.inventory.find((i) => i.uid === this.selected);
    if (!it) {
      this.root.add(
        this.add
          .text(W / 2, 800, '付け直す装備を選んでください', textStyle(26, COLORS.textDim))
          .setOrigin(0.5),
      );
      this.root.add(
        this.add
          .text(
            W / 2,
            850,
            '出口の数は変わらず、方向だけが変わります',
            textStyle(22, COLORS.textDim),
          )
          .setOrigin(0.5),
      );
      return;
    }
    const def = getItemDef(it.defId);
    this.root.add(new ItemIcon(this, 90, 790, it, 110));
    this.root.add(this.add.text(170, 745, def.name, textStyle(32, rarityCss(it.rarity))));
    this.root.add(
      this.add.text(170, 790, describeItem(it)[1] ?? '', textStyle(22, COLORS.textDim)),
    );
    const rc = rerollCost(it, 'reroll');
    const sc = rerollCost(it, 'specify');
    this.root.add(
      new Button(
        this,
        W / 2 - 160,
        900,
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
        { width: 300, height: 72, disabled: save.gold < rc },
      ),
    );
    // 指定: 方向ボタンで出口の数ぶん選ぶ
    DIRS.forEach((d, i) => {
      const on = this.specify.includes(d);
      const b = new Button(
        this,
        W / 2 + 40 + i * 70,
        990,
        DIR_LABEL[d],
        () => {
          if (on) this.specify = this.specify.filter((x) => x !== d);
          else if (this.specify.length < it.exits.length) this.specify = [...this.specify, d];
          this.render();
        },
        { width: 62, height: 62, fontSize: 30, color: on ? COLORS.ok : COLORS.button },
      );
      this.root.add(b);
    });
    this.root.add(
      this.add.text(40, 990, `指定（${it.exits.length}方向）`, textStyle(24)).setOrigin(0, 0.5),
    );
    const ready = this.specify.length === it.exits.length;
    this.root.add(
      new Button(
        this,
        W / 2 + 160,
        900,
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
        { width: 300, height: 72, disabled: save.gold < sc || !ready },
      ),
    );
    this.root.add(
      this.add
        .text(
          W / 2,
          1060,
          `付け直すたびに次回の料金は×1.5（付け直し ${it.rerollCount}回）`,
          textStyle(20, COLORS.textDim),
        )
        .setOrigin(0.5),
    );
  }

  // ---- 永続強化 ----
  private renderUpgrade(): void {
    const save = getSave();
    this.root.add(this.add.text(W / 2, 110, '強化', textStyle(40)).setOrigin(0.5));
    const hs = heroStats(save);
    const bp = backpackSize(save.upgrades.backpack);
    const now: Record<UpgradeId, string> = {
      maxHp: `最大HP ${hs.maxHp}`,
      atb: `ATB ${hs.atbTime.toFixed(2)}秒`,
      attack: `攻撃倍率 ×${hs.attackMult.toFixed(2)}`,
      backpack: `${bp.width}×${bp.height}マス`,
      consumableSlots: `${consumableSlots(save)}枠`,
      storage: `${storageCapacity(save)}個`,
    };
    (Object.keys(UPGRADES) as UpgradeId[]).forEach((id, i) => {
      const def = UPGRADES[id];
      const lv = save.upgrades[id];
      const cost = upgradeCost(id, lv);
      const y = 200 + i * 140;
      this.root.add(
        this.add
          .rectangle(W / 2, y + 40, W - 40, 124, COLORS.panel)
          .setStrokeStyle(2, COLORS.panelEdge),
      );
      this.root.add(this.add.text(40, y, `${def.name}　Lv ${lv}/${def.maxLevel}`, textStyle(28)));
      this.root.add(this.add.text(40, y + 46, `現在: ${now[id]}`, textStyle(22, COLORS.textDim)));
      this.root.add(
        new Button(
          this,
          W - 140,
          y + 40,
          cost === null ? '最大' : `${cost}G`,
          () => {
            if (!buyUpgrade(save, id)) {
              this.showToast('ゴールドが足りません', true);
              return;
            }
            persist();
            sfx('openEpic');
            this.render();
          },
          { width: 200, height: 72, disabled: cost === null || save.gold < cost },
        ),
      );
    });
  }

  // ---- 設定 ----
  private renderSettings(): void {
    const save = getSave();
    const st = save.settings;
    this.root.add(this.add.text(W / 2, 110, '設定', textStyle(40)).setOrigin(0.5));
    const row = (
      y: number,
      label: string,
      value: string,
      onMinus: (() => void) | null,
      onPlus: () => void,
    ) => {
      this.root.add(this.add.text(60, y, label, textStyle(30)).setOrigin(0, 0.5));
      this.root.add(
        this.add.text(W - 230, y, value, textStyle(30, COLORS.accentText)).setOrigin(0.5),
      );
      if (onMinus)
        this.root.add(new Button(this, W - 350, y, '−', onMinus, { width: 70, height: 64 }));
      this.root.add(
        new Button(this, W - 100, y, onMinus ? '+' : '切替', onPlus, {
          width: onMinus ? 70 : 140,
          height: 64,
        }),
      );
    };
    const changed = () => {
      applySettings();
      persist();
      this.render();
    };
    row(
      250,
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
    row(370, '振動', st.haptics ? 'ON' : 'OFF', null, () => {
      st.haptics = !st.haptics;
      changed();
    });
    row(490, '画面揺れ・フラッシュ', st.shake ? 'ON' : 'OFF', null, () => {
      st.shake = !st.shake;
      changed();
    });
  }
}
