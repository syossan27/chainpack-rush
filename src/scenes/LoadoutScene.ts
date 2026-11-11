// 配置画面: 上半分にバックパック、下半分に倉庫。ドラッグで置き、グリッド外へドラッグで外す
import { runTutorial } from '../ui/tutorial';
import Phaser from 'phaser';
import { simulateChain, type ChainPreview } from '../core/chain';
import { estimateRoute } from '../core/estimate';
import { diagnose } from '../core/diagnose';
import { getTechnique } from '../data/techniques';
import { otherPresetUse, presetMark, presetName, switchPreset } from '../core/presets';
import {
  checkRules,
  challengeStart,
  currentChallenge,
  itemViolation,
  type ChallengeNow,
} from '../core/challenge';
import { enterChallengeEdit, fitToRules, leaveChallengeEdit } from '../core/challengeLoadout';
import { devChallengeOpen } from '../platform/debug';
import {
  consumableSlots,
  equippedUids,
  heroStats,
  itemMap,
  overflowSellPlan,
  rememberConsumables,
  sellItems,
  sortieBlock,
} from '../core/economy';
import {
  clearLoadout,
  cycleOriginOrder,
  placeItem,
  removeItem,
  setConsumable,
} from '../core/loadout';
import { BASE_HERO_STATS } from '../core/combat';
import type { ItemInstance, Loadout } from '../core/types';
import { getItemDef } from '../data/items';
import { sfx } from '../audio/sfx';
import { getSave, persist } from '../platform/store';
import { BackpackView } from '../ui/backpackView';
import { routeColor, routeCss } from '../ui/backpackView';
import { TabBar, TopBar, goTab } from '../ui/kit/chrome';
import { SKIN, SLICE } from '../ui/kit/skin';
import { Button, RoundButton, confirmDialog, fitText, panel, bindTap } from '../ui/kit/widgets';
import { iconKey } from '../data/sprites';
import { ItemIcon } from '../ui/itemIcon';
import { chainContext, showItemDetail, type DetailAction } from '../ui/itemInfo';
import { ItemList } from '../ui/itemList';
import { COLORS, LOADOUT_LAYOUT, W, inkStyle, textStyle } from '../ui/theme';
import { num, t } from '../i18n';

const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD = 12;
const SLOT_SIZE = 84;

interface DragState {
  item: ItemInstance;
  fromCell: number; // -1 なら倉庫から、-2 なら消耗品枠から
  fromSlot: number;
  ghost: ItemIcon;
}

/** 戻せる回数 */
const UNDO_LIMIT = 30;

export class LoadoutScene extends Phaser.Scene {
  private view!: BackpackView;
  private list!: ItemList;
  private slots!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;
  /** ルートの選択（起点の発火順の添字。null は全部） */
  private focus: number | null = null;
  private routeBar!: Phaser.GameObjects.Container;
  private routeText!: Phaser.GameObjects.Text;
  /** Width the route summary may use (up to the diagnosis button) */
  private routeTextMaxW = 0;
  private presetBar!: Phaser.GameObjects.Container;
  /** ほかの編成で使っている装備 */
  private presetUses = new Map<string, number[]>();
  private resetBtn!: Button;
  /** 戻す: 変える前の並べ方（新しいものが後ろ）。編成を切り替えたら空にする */
  private undoStack: string[] = [];
  /** 消耗品枠の中身（変わったら「入れておきたいもの」として覚え直す） */
  private lastCons = '';
  private lastSnapshot = '';
  private undoBtn!: Button;
  private warn!: Phaser.GameObjects.Text;
  private drag: DragState | null = null;
  private selected: ItemInstance | null = null;
  /** 挑戦用の編成を編集中（その挑戦） */
  private challenge: ChallengeNow | null = null;

  constructor() {
    super('Loadout');
  }

  init(data?: { challenge?: boolean }): void {
    this.challenge = data?.challenge
      ? currentChallenge(Date.now(), challengeStart(devChallengeOpen()))
      : null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = getSave();
    this.drag = null;
    this.selected = null;
    // 挑戦用の編成: 画面を出ている間だけ loadout と入れ替える（出るときに戻す）
    if (this.challenge) {
      enterChallengeEdit(save);
      persist();
      this.events.once('shutdown', () => {
        leaveChallengeEdit(getSave());
        persist();
      });
    }
    this.view = new BackpackView(this, LOADOUT_LAYOUT.backpackTop, save.loadout, itemMap(save));
    // 編成の切り替え（並べ方の記録。装備は倉庫に置いたまま）
    this.presetBar = this.add.container(0, LOADOUT_LAYOUT.backpackTop - 38);
    this.buildPresetBar();
    // 戻す（ひとつ前の並べ方へ）
    this.undoStack = [];
    this.lastSnapshot = JSON.stringify(save.loadout);
    this.lastCons = JSON.stringify(save.loadout.consumables);
    this.undoBtn = new Button(
      this,
      W - 206,
      LOADOUT_LAYOUT.backpackTop - 38,
      t('↶ 戻す'),
      () => this.undo(),
      { width: 106, height: 56, fontSize: 20, skin: 'blue' },
    );
    // 全部外す（確認してから）
    this.resetBtn = new Button(
      this,
      W - 80,
      LOADOUT_LAYOUT.backpackTop - 38,
      t('全部外す'),
      () => this.confirmReset(),
      {
        width: 132,
        height: 56,
        fontSize: 20,
        skin: 'red',
      },
    );
    this.focus = null;
    this.routeBar = this.add.container(0, this.view.y + this.view.gridHeight + 30);
    this.info = this.add
      .text(W / 2, 0, '', {
        ...textStyle(18, COLORS.textDim),
        align: 'center',
        wordWrap: { width: W - 40, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);
    this.slots = this.add.container(0, LOADOUT_LAYOUT.slotsTop);
    this.warn = this.add
      .text(W / 2 + 60, LOADOUT_LAYOUT.slotsTop - 18, '', textStyle(20, COLORS.textWarn))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    bindTap(this.warn, () => {
      if (sortieBlock(getSave()) === 'storageFull') sellOverflow(this);
    });
    this.list = new ItemList(
      this,
      LOADOUT_LAYOUT.listTop,
      LOADOUT_LAYOUT.listBottom,
      {
        onTap: (it) => this.onListTap(it),
        onLongPress: (it) => this.openDetail(it, 'list'),
        onDragStart: (it, p) => this.startDrag(it, -1, -1, p),
      },
      (it) =>
        this.challenge
          ? itemViolation(it, this.challenge.def.rules)
            ? t('使えない')
            : null
          : presetMark(getSave(), this.presetUses, it.uid),
    );
    const scare = this.add.image(0, 6, 'scarecrow').setScale(1.3);
    new RoundButton(this, W - 196, LOADOUT_LAYOUT.slotsTop + 44, 88, scare, t('カカシ'), () =>
      this.scene.start('Dummy'),
    );
    new RoundButton(
      this,
      W - 76,
      LOADOUT_LAYOUT.slotsTop + 44,
      88,
      this.challenge ? 'clock' : 'swords',
      t(this.challenge ? '挑戦へ' : '出撃'),
      () =>
        this.challenge
          ? this.scene.start('Base', { page: 'challenge' })
          : this.scene.start('StageSelect'),
    ).setLit(true);
    new TopBar(this, save);
    new TabBar(this, 'loadout', (id) => {
      sfx('click');
      goTab(this, id);
    });

    this.setupGridInput();
    this.refresh();
    runTutorial(this, 'loadout', [
      {
        rect: {
          x: W / 2,
          y: (LOADOUT_LAYOUT.listTop + LOADOUT_LAYOUT.listBottom) / 2,
          w: W - 12,
          h: LOADOUT_LAYOUT.listBottom - LOADOUT_LAYOUT.listTop + 10,
        },
        text: t('下は倉庫。装備を少し押さえてから、\nバックパックへドラッグして置こう'),
      },
      {
        rect: {
          x: W / 2,
          y: LOADOUT_LAYOUT.backpackTop + this.view.gridHeight / 2,
          w: W - 120,
          h: this.view.gridHeight + 16,
        },
        text: t(
          '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n後ろの段ほどダメージが大きい！',
        ),
      },
      {
        rect: { x: W / 2, y: this.routeBar.y, w: W - 30, h: 66 },
        text: t('「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！'),
      },
    ]);
  }

  override update(): void {
    this.view.tick(this.time.now);
  }

  private refresh(): void {
    const save = getSave();
    this.presetUses = otherPresetUse(save);
    const items = itemMap(save);
    this.view.setLoadout(save.loadout, items);
    const preview = simulateChain(save.loadout, items);
    if (this.focus !== null && this.focus >= preview.plans.length) this.focus = null;
    if (save.settings.showRoutes)
      this.view.showPreview(preview, this.focus, new Set(save.discoveredTechs));
    else this.view.showPlain(preview);
    this.buildRouteBar(preview);
    this.info.setText(t('「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）'));
    // 消耗品枠を手で変えたら、その中身を覚える（使い切ったら倉庫から自動で入れ直す）
    const cons = JSON.stringify(save.loadout.consumables);
    if (cons !== this.lastCons) {
      this.lastCons = cons;
      rememberConsumables(save);
      persist();
    }
    // 並べ方が変わっていたら、変える前を「戻す」に積む
    const snap = JSON.stringify(save.loadout);
    if (snap !== this.lastSnapshot) {
      this.undoStack.push(this.lastSnapshot);
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
      this.lastSnapshot = snap;
    }
    this.undoBtn.setDisabled(this.undoStack.length === 0);
    this.resetBtn.setDisabled(
      save.loadout.cells.every((c) => !c) && save.loadout.consumables.length === 0,
    );
    this.info.setVisible(save.loadout.height < 5);
    this.routeBar.setY(this.view.y + this.view.gridHeight + 30);
    this.info.setY(this.routeBar.y + 32);
    const block = sortieBlock(save);
    const bad = this.challenge ? checkRules(save.loadout, items, this.challenge.def.rules) : [];
    // The challenge reason comes translated from core and is shown as is
    this.warn
      .setScale(1)
      .setText(
        bad.length > 0
          ? bad[0]!
          : block === 'noOrigin'
            ? t('起点が0個です。出撃できません')
            : block === 'storageFull' && !this.challenge
              ? t('倉庫があふれています（タップで売却）')
              : '',
      );
    // Centered at W/2 + 60: x 130..710, clear of the "consumables" label on the same row
    fitText(this.warn, 2 * (W / 2 + 60 - 130));
    const eq = equippedUids(save);
    this.list.setItems(save.inventory.filter((i) => !eq.has(i.uid)));
    this.list.setSelected(this.selected?.uid ?? null);
    this.renderSlots();
  }

  /** ルートの選択: [全部] [①] [②]… と、選んだルートの要約 */
  private buildRouteBar(preview: ChainPreview): void {
    const bar = this.routeBar;
    bar.removeAll(true);
    bar.add(panel(this, W / 2, 0, W - 40, 56, 'plate'));
    const chip = (x: number, w: number, on: boolean, onTap: () => void) => {
      const bg = this.add
        .nineslice(
          x + w / 2,
          0,
          on ? SKIN.tabOn : SKIN.tab,
          undefined,
          w,
          44,
          SLICE.tab,
          SLICE.tab,
          14,
          14,
        )
        .setInteractive({ useHandCursor: true });
      bindTap(bg, () => {
        sfx('click');
        onTap();
      });
      bar.add(bg);
      return bg;
    };
    const shown = getSave().settings.showRoutes;
    let x = 30;
    chip(x, 72, shown && this.focus === null, () => this.setFocus(null));
    bar.add(
      fitText(
        this.add
          .text(
            x + 36,
            -2,
            t('全部'),
            textStyle(18, shown && this.focus === null ? '#fff6d0' : COLORS.text),
          )
          .setOrigin(0.5),
        64,
      ),
    );
    x += 78;
    preview.plans.forEach((_, i) => {
      chip(x, 50, shown && this.focus === i, () =>
        this.setFocus(shown && this.focus === i ? null : i),
      );
      bar.add(this.add.circle(x + 25, -1, 14, routeColor(i)).setStrokeStyle(3, 0x0c0a12));
      bar.add(
        this.add
          .text(x + 25, -2, `${i + 1}`, textStyle(16, '#1a1424'))
          .setOrigin(0.5)
          .setStroke('#fff6d0', 2)
          .setShadow(0, 0, '#000', 0),
      );
      x += 54;
    });
    // ルートの線・段数を消す／出す
    chip(x, 76, !shown, () => {
      const save = getSave();
      save.settings.showRoutes = !save.settings.showRoutes;
      persist();
      this.refresh();
    });
    bar.add(
      fitText(
        this.add
          .text(
            x + 38,
            -2,
            t(shown ? '線を消す' : '線なし'),
            textStyle(15, !shown ? '#fff6d0' : COLORS.text),
          )
          .setOrigin(0.5),
        68,
      ),
    );
    x += 82;
    // 推定ダメージ（ふつうの敵1体に撃ったときの期待値。コンボ・追加効果・会心込み）
    const save = getSave();
    const items = itemMap(save);
    const u = heroStats(save).attackMult;
    const est = preview.plans.map((p) => estimateRoute(p, items, u));
    const summary = (() => {
      if (!shown) return { text: t('番号を選ぶと表示に戻す'), color: COLORS.textDim };
      if (preview.plans.length === 0)
        return { text: t('起点を置いてください'), color: COLORS.textWarn };
      if (this.focus === null)
        return {
          text: t('合計 約{n}', { n: num(est.reduce((sum, e) => sum + e.total, 0)) }),
          color: '#ffe27a',
        };
      const p = preview.plans[this.focus]!;
      const e = est[this.focus]!;
      // 必殺技の名前は、見つけたあとだけ出す（ネタバレしない）
      const knownTech = e.techs.find((id) => save.discoveredTechs.includes(id));
      const tech = knownTech ? getTechnique(knownTech) : undefined;
      const params = { n: num(e.total), step: p.maxStep };
      return {
        text: knownTech
          ? t('約{n}・{step}段・{tech}', {
              ...params,
              tech: tech ? t(tech.name) : t('必殺技|fallback'),
            })
          : e.combos > 0
            ? t('約{n}・{step}段・コンボ{combo}', { ...params, combo: e.combos })
            : t('約{n}・{step}段', params),
        color: routeCss(this.focus),
      };
    })();
    this.routeText = this.add
      .text(W - 132, -2, summary.text, textStyle(18, summary.color))
      .setOrigin(1, 0.5);
    // 長いときは縮めて、診断ボタンに重ねない
    this.routeTextMaxW = W - 132 - x - 6;
    fitText(this.routeText, this.routeTextMaxW);
    bar.add(this.routeText);
    // 診断: いまの並べ方から、伸ばせる次の一手を出す
    const dg = this.add
      .nineslice(W - 80, 0, SKIN.tabOn, undefined, 92, 44, SLICE.tab, SLICE.tab, 14, 14)
      .setInteractive({ useHandCursor: true });
    bindTap(dg, () => {
      sfx('click');
      this.openDiagnosis();
    });
    bar.add(dg);
    bar.add(
      fitText(this.add.text(W - 80, -2, t('診断'), textStyle(18, '#fff6d0')).setOrigin(0.5), 84),
    );
  }

  /** 配置の診断（入れ替え・置きかえ・空きマスを実際に試して、伸びる手を出す） */
  private openDiagnosis(): void {
    const save = getSave();
    // In the challenge: the hero starts from base strength and only allowed items are suggested
    const rules = this.challenge?.def.rules;
    const res = diagnose(
      save.loadout,
      save.inventory,
      rules ? BASE_HERO_STATS.attackMult : heroStats(save).attackMult,
      save.discoveredTechs,
      rules ? (it) => !itemViolation(it, rules) : undefined,
    );
    const H = this.scale.gameSize.height;
    const root = this.add.container(0, 0).setDepth(2600);
    const close = () => root.destroy();
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', close);
    root.add(shade);
    const cw = W - 50;
    const cardH = 150;
    const list = res.advices;
    const ch = 170 + Math.max(1, list.length) * (cardH + 12) + 100;
    const top = H / 2 - ch / 2;
    root.add(panel(this, W / 2, H / 2, cw, ch, 'panel').setInteractive());
    root.add(
      fitText(
        this.add.text(W / 2, top + 44, t('配置の診断'), textStyle(34, '#ffe27a')).setOrigin(0.5),
        cw - 40,
      ),
    );
    root.add(
      fitText(
        this.add
          .text(
            W / 2,
            top + 92,
            t('いまの推定ダメージ 合計 約{n}', { n: num(res.total) }),
            textStyle(20, COLORS.text),
          )
          .setOrigin(0.5),
        cw - 40,
      ),
    );
    if (list.length === 0)
      root.add(
        this.add
          .text(
            W / 2,
            top + 170 + cardH / 2,
            t('いまの装備では、これ以上の手は見つかりませんでした。\nいい並べ方です！'),
            {
              ...textStyle(22, COLORS.text),
              align: 'center',
              wordWrap: { width: cw - 60, useAdvancedWrap: true },
            },
          )
          .setOrigin(0.5),
      );
    list.forEach((a, i) => {
      const y = top + 140 + i * (cardH + 12);
      root.add(panel(this, W / 2, y + cardH / 2, cw - 40, cardH, 'paper'));
      const left = 60;
      const titleText = this.add.text(left, y + 16, a.title, {
        ...inkStyle(22),
        wordWrap: { width: cw - 260, useAdvancedWrap: true },
      });
      root.add(titleText);
      root.add(
        this.add.text(left, y + 24 + titleText.height, a.reason, {
          ...inkStyle(18, '#8a5a10'),
          wordWrap: { width: cw - 260, useAdvancedWrap: true },
        }),
      );
      // Right column: between the text column (ends at x=left + cw - 260) and the card edge
      const rx = W - 130;
      const colW = 2 * (W - 40 - rx);
      if (a.gain > 0)
        root.add(
          fitText(
            this.add
              .text(rx, y + 40, t('+約{n}', { n: num(a.gain) }), textStyle(28, '#3a8a3a'))
              .setOrigin(0.5)
              .setStroke('#fff6d0', 4),
            colW,
          ),
        );
      if (a.gain > 0 && res.total > 0)
        root.add(
          fitText(
            this.add
              .text(
                rx,
                y + 72,
                t('（+{pct}%）', { pct: Math.round((a.gain / res.total) * 100) }),
                inkStyle(18, '#3a8a3a'),
              )
              .setOrigin(0.5),
            colW,
          ),
        );
      if (a.cells.length > 0) {
        root.add(
          new Button(
            this,
            rx,
            y + cardH - 34,
            t('場所を見る'),
            () => {
              close();
              this.flashCells(a.cells);
            },
            { width: 170, height: 52, fontSize: 18, skin: 'blue' },
          ),
        );
      }
    });
    root.add(
      new Button(this, W / 2, top + ch - 50, t('閉じる'), close, {
        width: 230,
        height: 68,
        skin: 'gray',
      }),
    );
  }

  /** 診断で示したマスを、しばらく光らせる */
  private flashCells(cells: readonly number[]): void {
    const now = this.time.now;
    for (const c of cells) this.view.glow(c, 0x6ee06a, now, 2500);
  }

  /** 編成のタブ: 1〜5。今の編成をもう一度押すと名前を変えられる */
  private buildPresetBar(): void {
    const save = getSave();
    const bar = this.presetBar;
    bar.removeAll(true);
    if (this.challenge) {
      // 挑戦用の編成: 編成の切り替えの代わりに、名前と「制限に合わせる」
      const label = this.add
        .text(
          24,
          -2,
          t('挑戦「{name}」用', { name: t(this.challenge.def.name) }),
          textStyle(22, '#ffe27a'),
        )
        .setOrigin(0, 0.5);
      fitText(label, 380 - 76 - 8 - 24);
      bar.add(label);
      bar.add(
        new Button(this, 380, 0, t('制限に合わせる'), () => this.fitChallenge(), {
          width: 150,
          height: 52,
          fontSize: 18,
          skin: 'gold',
        }),
      );
      return;
    }
    const w = 54;
    save.presets.forEach((p, i) => {
      const x = 24 + i * (w + 6);
      const on = i === save.activePreset;
      const bg = this.add
        .nineslice(
          x + w / 2,
          0,
          on ? SKIN.tabOn : SKIN.tab,
          undefined,
          w,
          52,
          SLICE.tab,
          SLICE.tab,
          14,
          14,
        )
        .setInteractive({ useHandCursor: true });
      bindTap(bg, () => {
        sfx('click');
        if (on) this.renamePreset(i);
        else this.changePreset(i);
      });
      bar.add(bg);
      bar.add(
        this.add
          .text(
            x + w / 2,
            -2,
            `${i + 1}`,
            textStyle(24, on ? '#fff6d0' : p.loadout ? COLORS.text : COLORS.textDim),
          )
          .setOrigin(0.5),
      );
    });
    const name = presetName(save, save.activePreset);
    // 名前は「戻す」ボタンの手前まで（長い名前は縮める）
    const nameX = 24 + 5 * (w + 6) + 4;
    const label = this.add.text(nameX, -2, `${name} ✎`, textStyle(22, '#ffe27a')).setOrigin(0, 0.5);
    fitText(label, W - 206 - 53 - 8 - nameX);
    bar.add(label);
  }

  private changePreset(i: number): void {
    const save = getSave();
    if (!switchPreset(save, i)) return;
    persist();
    // 別の編成の並べ方には戻さない
    this.undoStack = [];
    this.lastSnapshot = JSON.stringify(save.loadout);
    this.focus = null;
    this.selected = null;
    this.buildPresetBar();
    this.refresh();
    this.showToastLine(t('{name} に切り替えました', { name: presetName(save, i) }));
  }

  /** 制限に合わない装備を、同じ種類で出口の向きが近いものに入れ替える（最適にはしない） */
  private fitChallenge(): void {
    if (!this.challenge) return;
    const save = getSave();
    const items = itemMap(save);
    if (checkRules(save.loadout, items, this.challenge.def.rules).length === 0) {
      this.showToastLine(t('もう制限に合っています'));
      return;
    }
    save.loadout = fitToRules(save, save.loadout, this.challenge.def.rules);
    this.selected = null;
    this.commit();
    const left = checkRules(save.loadout, itemMap(save), this.challenge.def.rules);
    this.showToastLine(
      t(
        left.length === 0
          ? '制限に合わせました。並べ方を詰めよう'
          : '合う装備が足りず、空いたマスがあります',
      ),
    );
  }

  private renamePreset(i: number): void {
    const save = getSave();
    const now = presetName(save, i);
    const v =
      typeof window !== 'undefined' ? window.prompt(t('編成の名前（8文字まで）'), now) : null;
    if (v === null) return;
    const name = v.trim().slice(0, 8);
    if (!name) return;
    save.presets[i]!.name = name;
    persist();
    this.buildPresetBar();
    this.refresh();
  }

  /** 画面下の一時的なお知らせ */
  private showToastLine(msg: string): void {
    const line = fitText(
      this.add
        .text(W / 2, LOADOUT_LAYOUT.backpackTop + 10, msg, textStyle(24, '#ffe27a'))
        .setOrigin(0.5)
        .setDepth(3000),
      W - 40,
    );
    this.tweens.add({
      targets: line,
      alpha: 0,
      y: line.y - 20,
      delay: 900,
      duration: 400,
      onComplete: () => line.destroy(),
    });
  }

  private setFocus(i: number | null): void {
    // 線を消していたら、番号・全部を選んだときに表示へ戻す
    const save = getSave();
    if (!save.settings.showRoutes) {
      save.settings.showRoutes = true;
      persist();
    }
    this.focus = i;
    this.refresh();
  }

  private renderSlots(): void {
    const save = getSave();
    this.slots.removeAll(true);
    const n = consumableSlots(save);
    const items = itemMap(save);
    // Stops short of the warning line on the same row (its left edge is at x >= 130)
    this.slots.add(
      fitText(
        this.add.text(30, -18, t('消耗品|slots'), textStyle(18, COLORS.textDim)).setOrigin(0, 0.5),
        92,
      ),
    );
    // 覚えている消耗品のうち、いま枠に入っていないもの（空いた枠にうすく出す）
    const ghosts = (save.loadout.consumableAuto ?? []).slice();
    for (const u of save.loadout.consumables) {
      const k = ghosts.indexOf(items.get(u)?.defId ?? '');
      if (k >= 0) ghosts.splice(k, 1);
    }
    for (let i = 0; i < n; i++) {
      const x = this.slotX(i);
      const frame = this.add.image(x, 44, SKIN.round).setDisplaySize(SLOT_SIZE, SLOT_SIZE);
      this.slots.add(frame);
      const uid = save.loadout.consumables[i];
      const it = uid ? items.get(uid) : undefined;
      if (it) this.slots.add(this.add.image(x, 44, iconKey(it.defId)).setScale(4));
      else if (ghosts[i - save.loadout.consumables.length]) {
        // 覚えている消耗品が倉庫にない: うすく出して、手に入ったら自動で入ることを知らせる
        this.slots.add(
          this.add
            .image(x, 44, iconKey(ghosts[i - save.loadout.consumables.length]!))
            .setScale(4)
            .setAlpha(0.3),
        );
        this.slots.add(
          fitText(
            this.add
              .text(x, 44 + SLOT_SIZE / 2 - 4, t('自動|refill'), textStyle(14, COLORS.textDim))
              .setOrigin(0.5),
            SLOT_SIZE - 8,
          ),
        );
      } else
        this.slots.add(this.add.text(x, 44, '+', textStyle(30, COLORS.textDim)).setOrigin(0.5));
      frame.setInteractive();
      frame.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (it) this.pressGrid(it, -2, i, p);
        else if (this.selected && getItemDef(this.selected.defId).kind === 'consumable') {
          save.loadout = setConsumable(save.loadout, i, this.selected.uid, n);
          this.selected = null;
          this.commit();
        }
      });
    }
  }

  private slotX(i: number): number {
    return 70 + i * (SLOT_SIZE + 6);
  }

  private slotAt(x: number, y: number): number {
    const n = consumableSlots(getSave());
    const ly = y - LOADOUT_LAYOUT.slotsTop - 44;
    if (Math.abs(ly) > SLOT_SIZE / 2) return -1;
    for (let i = 0; i < n; i++) if (Math.abs(x - this.slotX(i)) <= SLOT_SIZE / 2) return i;
    return -1;
  }

  /** ひとつ前の並べ方に戻す（そのあと売った装備は外したままにする） */
  private undo(): void {
    const prev = this.undoStack.pop();
    if (prev === undefined) return;
    const save = getSave();
    const have = new Set(save.inventory.map((i) => i.uid));
    const l = JSON.parse(prev) as Loadout;
    l.cells = l.cells.map((u) => (u && have.has(u) ? u : null));
    l.originOrder = l.originOrder.filter((u) => have.has(u));
    l.consumables = l.consumables.filter((u) => have.has(u));
    save.loadout = l;
    this.lastSnapshot = JSON.stringify(save.loadout);
    this.selected = null;
    persist();
    sfx('click');
    this.refresh();
    this.showToastLine(t('ひとつ前の並べ方に戻しました'));
  }

  private commit(): void {
    persist();
    sfx('click');
    this.refresh();
  }

  private confirmReset(): void {
    const save = getSave();
    const placed = save.loadout.cells.filter(Boolean).length + save.loadout.consumables.length;
    if (placed === 0) return;
    confirmDialog(
      this,
      t('全部外す'),
      t(
        'バックパックと消耗品枠の {n}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。',
        { n: placed },
      ),
      t('全部外す'),
      () => {
        save.loadout = clearLoadout(save.loadout);
        this.selected = null;
        this.commit();
      },
    );
  }

  private onListTap(it: ItemInstance): void {
    this.openDetail(it, 'list');
  }

  /** 選んで「置く」: 次にタップしたマスへ置く */
  private selectForPlacing(it: ItemInstance): void {
    this.selected = it;
    this.list.setSelected(it.uid);
    fitText(
      this.routeText.setScale(1).setText(t('置きたいマスをタップ')).setColor(COLORS.gold),
      this.routeTextMaxW,
    );
  }

  /** 装備の詳細カード。置き場所に応じた操作をカードに並べる */
  private openDetail(it: ItemInstance, where: 'grid' | 'slot' | 'list'): void {
    const save = getSave();
    const items = itemMap(save);
    if (where === 'grid') {
      // タップした装備が乗っているルートを強調する
      const plans = simulateChain(save.loadout, items).plans;
      const i = plans.findIndex((p) => p.steps.some((s) => s.uid === it.uid));
      if (i >= 0 && i !== this.focus) this.setFocus(i);
    }
    const kind = getItemDef(it.defId).kind;
    const actions: DetailAction[] = [];
    if (where === 'grid' || where === 'slot') {
      actions.push({
        label: t('外す'),
        skin: 'red',
        onTap: () => {
          save.loadout = removeItem(save.loadout, items, it.uid);
          this.commit();
        },
      });
      const order = save.loadout.originOrder;
      if (kind === 'origin' && order.length >= 2) {
        actions.push({
          label: t('発火順を前へ'),
          skin: 'blue',
          onTap: () => {
            save.loadout = cycleOriginOrder(save.loadout, it.uid);
            this.commit();
          },
        });
      }
    } else if (kind === 'consumable') {
      const n = consumableSlots(save);
      const free = save.loadout.consumables.length < n;
      actions.push({
        label: t(free ? '枠に入れる' : '枠がいっぱい'),
        skin: 'green',
        disabled: !free,
        onTap: () => {
          save.loadout = setConsumable(save.loadout, save.loadout.consumables.length, it.uid, n);
          this.commit();
        },
      });
    } else {
      actions.push({
        label: t('置く'),
        skin: 'green',
        icon: 'bag',
        onTap: () => this.selectForPlacing(it),
      });
    }
    showItemDetail(this, it, {
      actions,
      context: where === 'grid' ? chainContext(save.loadout, items, it.uid) : undefined,
    });
  }

  private setupGridInput(): void {
    // バックパックのマス: タップ（能力の詳細／選択中を置く）、ドラッグ（移動・外す）
    const zone = this.add
      .zone(0, LOADOUT_LAYOUT.backpackTop, W, this.view.gridHeight)
      .setOrigin(0, 0)
      .setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const save = getSave();
      const cell = this.view.cellAt(p.x, p.y);
      if (cell < 0) return;
      const uid = save.loadout.cells[cell];
      const it = uid ? save.inventory.find((i) => i.uid === uid) : undefined;
      if (!it) {
        if (this.selected && getItemDef(this.selected.defId).kind !== 'consumable') {
          save.loadout = placeItem(save.loadout, itemMap(save), this.selected.uid, cell);
          this.selected = null;
          this.commit();
        }
        return;
      }
      this.pressGrid(it, cell, -1, p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      this.drag.ghost.setPosition(p.x, p.y - 40);
      this.view.setHighlightCell(this.view.cellAt(p.x, p.y - 40));
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.endDrag(p));
  }

  private pressGrid(it: ItemInstance, cell: number, slot: number, p: Phaser.Input.Pointer): void {
    const sx = p.x;
    const sy = p.y;
    let moved = false;
    const where = cell >= 0 ? 'grid' : 'slot';
    const long = this.time.delayedCall(LONG_PRESS_MS, () => {
      if (!moved && !this.drag) {
        cleanup();
        done = true;
        this.openDetail(it, where);
      }
    });
    let done = false;
    const onMove = (q: Phaser.Input.Pointer) => {
      if (moved || Math.hypot(q.x - sx, q.y - sy) < DRAG_THRESHOLD) return;
      moved = true;
      long.remove();
      cleanup();
      this.startDrag(it, cell, slot, q);
    };
    const onUp = () => {
      long.remove();
      cleanup();
      if (moved || done) return;
      // タップ: 能力の詳細（外す・発火順の入れ替えはカードから）
      this.openDetail(it, where);
    };
    const cleanup = () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
    };
    this.input.on('pointermove', onMove);
    this.input.once('pointerup', onUp);
  }

  private startDrag(
    item: ItemInstance,
    fromCell: number,
    fromSlot: number,
    p: Phaser.Input.Pointer,
  ): void {
    if (this.drag) return;
    const ghost = new ItemIcon(this, p.x, p.y - 40, item, 92).setDepth(500).setAlpha(0.9);
    this.drag = { item, fromCell, fromSlot, ghost };
    this.selected = null;
  }

  private endDrag(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.ghost.destroy();
    this.view.setHighlightCell(-1);
    const save = getSave();
    const items = itemMap(save);
    const kind = getItemDef(d.item.defId).kind;
    const cell = this.view.cellAt(p.x, p.y - 40);
    const slot = this.slotAt(p.x, p.y - 40);
    if (kind === 'consumable') {
      if (slot >= 0)
        save.loadout = setConsumable(save.loadout, slot, d.item.uid, consumableSlots(save));
      else if (d.fromSlot >= 0) save.loadout = removeItem(save.loadout, items, d.item.uid);
      else return;
    } else if (cell >= 0) {
      save.loadout = placeItem(save.loadout, items, d.item.uid, cell);
    } else if (d.fromCell >= 0) {
      save.loadout = removeItem(save.loadout, items, d.item.uid); // グリッド外へドラッグで外す
    } else {
      return;
    }
    this.commit();
  }
}

/** 倉庫からあふれた分を、安いものから売る（確認つき）。売ったらシーンを開き直す */
export function sellOverflow(scene: Phaser.Scene): void {
  const save = getSave();
  const plan = overflowSellPlan(save);
  if (plan.uids.length === 0) return;
  confirmDialog(
    scene,
    t('あふれた分を売る'),
    t('安いものから{n}個を売って倉庫に収めます\n（+{gold}G）', {
      n: plan.uids.length,
      gold: plan.gold,
    }),
    t('売る'),
    () => {
      sellItems(save, plan.uids);
      persist();
      sfx('drop');
      scene.scene.restart();
    },
  );
}
