// 配置画面: 上半分にバックパック、下半分に倉庫。ドラッグで置き、グリッド外へドラッグで外す
import Phaser from 'phaser';
import { simulateChain, type ChainPreview } from '../core/chain';
import { estimateRoute } from '../core/estimate';
import { getTechnique } from '../data/techniques';
import { otherPresetUse, presetMark, switchPreset } from '../core/presets';
import {
  consumableSlots,
  equippedUids,
  heroStats,
  itemMap,
  overflowSellPlan,
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
import type { ItemInstance } from '../core/types';
import { getItemDef } from '../data/items';
import { sfx } from '../audio/sfx';
import { getSave, persist } from '../platform/store';
import { BackpackView } from '../ui/backpackView';
import { routeColor, routeCss } from '../ui/backpackView';
import { TabBar, TopBar, goTab } from '../ui/kit/chrome';
import { SKIN, SLICE } from '../ui/kit/skin';
import { Button, RoundButton, confirmDialog, panel, bindTap } from '../ui/kit/widgets';
import { iconKey } from '../data/sprites';
import { ItemIcon } from '../ui/itemIcon';
import { chainContext, showItemDetail, type DetailAction } from '../ui/itemInfo';
import { ItemList } from '../ui/itemList';
import { COLORS, LOADOUT_LAYOUT, W, textStyle } from '../ui/theme';

const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD = 12;
const SLOT_SIZE = 84;

interface DragState {
  item: ItemInstance;
  fromCell: number; // -1 なら倉庫から、-2 なら消耗品枠から
  fromSlot: number;
  ghost: ItemIcon;
}

export class LoadoutScene extends Phaser.Scene {
  private view!: BackpackView;
  private list!: ItemList;
  private slots!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;
  /** ルートの選択（起点の発火順の添字。null は全部） */
  private focus: number | null = null;
  private routeBar!: Phaser.GameObjects.Container;
  private routeText!: Phaser.GameObjects.Text;
  private presetBar!: Phaser.GameObjects.Container;
  /** ほかの編成で使っている装備 */
  private presetUses = new Map<string, number[]>();
  private resetBtn!: Button;
  private warn!: Phaser.GameObjects.Text;
  private drag: DragState | null = null;
  private selected: ItemInstance | null = null;

  constructor() {
    super('Loadout');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = getSave();
    this.drag = null;
    this.selected = null;
    this.view = new BackpackView(this, LOADOUT_LAYOUT.backpackTop, save.loadout, itemMap(save));
    // 編成の切り替え（並べ方の記録。装備は倉庫に置いたまま）
    this.presetBar = this.add.container(0, LOADOUT_LAYOUT.backpackTop - 38);
    this.buildPresetBar();
    // 全部外す（確認してから）
    this.resetBtn = new Button(
      this,
      W - 88,
      LOADOUT_LAYOUT.backpackTop - 38,
      '全部外す',
      () => this.confirmReset(),
      {
        width: 140,
        height: 56,
        fontSize: 20,
        skin: 'red',
      },
    );
    this.focus = null;
    this.routeBar = this.add.container(0, this.view.y + this.view.gridHeight + 30);
    this.info = this.add.text(W / 2, 0, '', textStyle(18, COLORS.textDim)).setOrigin(0.5, 0);
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
      (it) => presetMark(getSave(), this.presetUses, it.uid),
    );
    const scare = this.add.image(0, 6, 'scarecrow').setScale(1.3);
    new RoundButton(this, W - 196, LOADOUT_LAYOUT.slotsTop + 44, 88, scare, 'カカシ', () =>
      this.scene.start('Dummy'),
    );
    new RoundButton(this, W - 76, LOADOUT_LAYOUT.slotsTop + 44, 88, 'swords', '出撃', () =>
      this.scene.start('StageSelect'),
    ).setLit(true);
    new TopBar(this, save);
    new TabBar(this, 'loadout', (id) => {
      sfx('click');
      goTab(this, id);
    });

    this.setupGridInput();
    this.refresh();
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
    if (save.settings.showRoutes) this.view.showPreview(preview, this.focus);
    else this.view.showPlain(preview);
    this.buildRouteBar(preview);
    this.info.setText('「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）');
    this.resetBtn.setDisabled(
      save.loadout.cells.every((c) => !c) && save.loadout.consumables.length === 0,
    );
    this.info.setVisible(save.loadout.height < 5);
    this.routeBar.setY(this.view.y + this.view.gridHeight + 30);
    this.info.setY(this.routeBar.y + 32);
    const block = sortieBlock(save);
    this.warn.setText(
      block === 'noOrigin'
        ? '起点が0個です。出撃できません'
        : block === 'storageFull'
          ? '倉庫があふれています（タップで売却）'
          : '',
    );
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
      this.add
        .text(
          x + 36,
          -2,
          '全部',
          textStyle(18, shown && this.focus === null ? '#fff6d0' : COLORS.text),
        )
        .setOrigin(0.5),
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
      this.add
        .text(
          x + 38,
          -2,
          shown ? '線を消す' : '線なし',
          textStyle(15, !shown ? '#fff6d0' : COLORS.text),
        )
        .setOrigin(0.5),
    );
    x += 82;
    // 推定ダメージ（ふつうの敵1体に撃ったときの期待値。コンボ・追加効果・会心込み）
    const save = getSave();
    const items = itemMap(save);
    const u = heroStats(save).attackMult;
    const est = preview.plans.map((p) => estimateRoute(p, items, u));
    const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
    const summary = (() => {
      if (!shown) return { text: '番号を選ぶと表示に戻す', color: COLORS.textDim };
      if (preview.plans.length === 0)
        return { text: '起点を置いてください', color: COLORS.textWarn };
      if (this.focus === null)
        return {
          text: `合計 約${fmt(est.reduce((sum, e) => sum + e.total, 0))}`,
          color: '#ffe27a',
        };
      const p = preview.plans[this.focus]!;
      const e = est[this.focus]!;
      const combo =
        e.techs.length > 0
          ? `・${getTechnique(e.techs[0]!)?.name ?? '必殺技'}`
          : e.combos > 0
            ? `・コンボ${e.combos}`
            : '';
      return {
        text: `約${fmt(e.total)}・${p.maxStep}段${combo}`,
        color: routeCss(this.focus),
      };
    })();
    this.routeText = this.add
      .text(W - 40, -2, summary.text, textStyle(18, summary.color))
      .setOrigin(1, 0.5);
    bar.add(this.routeText);
  }

  /** 編成のタブ: 1〜5。今の編成をもう一度押すと名前を変えられる */
  private buildPresetBar(): void {
    const save = getSave();
    const bar = this.presetBar;
    bar.removeAll(true);
    const w = 62;
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
    const name = save.presets[save.activePreset]!.name;
    bar.add(
      this.add
        .text(24 + 5 * (w + 6) + 4, -2, `${name} ✎`, textStyle(22, '#ffe27a'))
        .setOrigin(0, 0.5),
    );
  }

  private changePreset(i: number): void {
    const save = getSave();
    if (!switchPreset(save, i)) return;
    persist();
    this.focus = null;
    this.selected = null;
    this.buildPresetBar();
    this.refresh();
    this.showToastLine(`${save.presets[i]!.name} に切り替えました`);
  }

  private renamePreset(i: number): void {
    const save = getSave();
    const now = save.presets[i]!.name;
    const v = typeof window !== 'undefined' ? window.prompt('編成の名前（8文字まで）', now) : null;
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
    const t = this.add
      .text(W / 2, LOADOUT_LAYOUT.backpackTop + 10, msg, textStyle(24, '#ffe27a'))
      .setOrigin(0.5)
      .setDepth(3000);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 20,
      delay: 900,
      duration: 400,
      onComplete: () => t.destroy(),
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
    this.slots.add(
      this.add.text(30, -18, '消耗品', textStyle(18, COLORS.textDim)).setOrigin(0, 0.5),
    );
    for (let i = 0; i < n; i++) {
      const x = this.slotX(i);
      const frame = this.add.image(x, 44, SKIN.round).setDisplaySize(SLOT_SIZE, SLOT_SIZE);
      this.slots.add(frame);
      const uid = save.loadout.consumables[i];
      const it = uid ? items.get(uid) : undefined;
      if (it) this.slots.add(this.add.image(x, 44, iconKey(it.defId)).setScale(4));
      else this.slots.add(this.add.text(x, 44, '+', textStyle(30, COLORS.textDim)).setOrigin(0.5));
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
      '全部外す',
      `バックパックと消耗品枠の ${placed}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。`,
      '全部外す',
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
    this.routeText.setText('置きたいマスをタップ').setColor(COLORS.gold);
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
        label: '外す',
        skin: 'red',
        onTap: () => {
          save.loadout = removeItem(save.loadout, items, it.uid);
          this.commit();
        },
      });
      const order = save.loadout.originOrder;
      if (kind === 'origin' && order.length >= 2) {
        actions.push({
          label: '発火順を前へ',
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
        label: free ? '枠に入れる' : '枠がいっぱい',
        skin: 'green',
        disabled: !free,
        onTap: () => {
          save.loadout = setConsumable(save.loadout, save.loadout.consumables.length, it.uid, n);
          this.commit();
        },
      });
    } else {
      actions.push({
        label: '置く',
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
    'あふれた分を売る',
    `安いものから${plan.uids.length}個を売って倉庫に収めます\n（+${plan.gold}G）`,
    '売る',
    () => {
      sellItems(save, plan.uids);
      persist();
      sfx('drop');
      scene.scene.restart();
    },
  );
}
