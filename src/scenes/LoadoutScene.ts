// 配置画面: 上半分にバックパック、下半分に倉庫。ドラッグで置き、グリッド外へドラッグで外す
import Phaser from 'phaser';
import { simulateChain } from '../core/chain';
import { consumableSlots, equippedUids, itemMap, sortieBlock } from '../core/economy';
import { cycleOriginOrder, placeItem, removeItem, setConsumable } from '../core/loadout';
import type { ItemInstance } from '../core/types';
import { getItemDef } from '../data/items';
import { sfx } from '../audio/sfx';
import { getSave, persist } from '../platform/store';
import { BackpackView } from '../ui/backpackView';
import { originLabel } from '../ui/backpackView';
import { TabBar, TopBar, goTab } from '../ui/kit/chrome';
import { SKIN } from '../ui/kit/skin';
import { Pill, RoundButton, ribbon } from '../ui/kit/widgets';
import { iconKey } from '../data/sprites';
import { ItemIcon } from '../ui/itemIcon';
import { showItemDetail } from '../ui/itemInfo';
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
  private infoPill!: Pill;
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
    this.add.existing(ribbon(this, W / 2, LOADOUT_LAYOUT.backpackTop - 34, 'バックパック', 320));
    this.infoPill = new Pill(
      this,
      W / 2,
      this.view.y + this.view.gridHeight + 26,
      W - 120,
      null,
      '',
    );
    this.info = this.add
      .text(W / 2, this.infoPill.y + 40, '', textStyle(18, COLORS.textDim))
      .setOrigin(0.5, 0);
    this.slots = this.add.container(0, LOADOUT_LAYOUT.slotsTop);
    this.warn = this.add
      .text(W / 2 + 60, LOADOUT_LAYOUT.slotsTop - 18, '', textStyle(20, COLORS.textWarn))
      .setOrigin(0.5);
    this.list = new ItemList(this, LOADOUT_LAYOUT.listTop, LOADOUT_LAYOUT.listBottom, {
      onTap: (it) => this.onListTap(it),
      onLongPress: (it) => showItemDetail(this, it),
      onDragStart: (it, p) => this.startDrag(it, -1, -1, p),
    });
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

  private refresh(): void {
    const save = getSave();
    const items = itemMap(save);
    this.view.setLoadout(save.loadout, items);
    const t0 = performance.now();
    const preview = simulateChain(save.loadout, items);
    this.view.showPreview(preview);
    const ms = performance.now() - t0;
    const durs = preview.plans
      .map((p, i) => `${originLabel(i)} ${p.maxStep}段・${p.duration.toFixed(1)}秒`)
      .join('　');
    this.infoPill.setValue(durs || '起点を置いてください', durs ? COLORS.text : COLORS.textWarn);
    this.info.setText(`長押しで詳細・起点タップで発火順（計算 ${ms.toFixed(1)}ms）`);
    this.info.setVisible(save.loadout.height < 5);
    this.info.setY(this.infoPill.y + 34);
    this.infoPill.setY(this.view.y + this.view.gridHeight + 26);
    const block = sortieBlock(save);
    this.warn.setText(
      block === 'noOrigin'
        ? '起点が0個です。出撃できません'
        : block === 'storageFull'
          ? '倉庫があふれています'
          : '',
    );
    const eq = equippedUids(save);
    this.list.setItems(save.inventory.filter((i) => !eq.has(i.uid)));
    this.list.setSelected(this.selected?.uid ?? null);
    this.renderSlots();
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

  private onListTap(it: ItemInstance): void {
    this.selected = this.selected?.uid === it.uid ? null : it;
    this.list.setSelected(this.selected?.uid ?? null);
    if (this.selected) {
      const kind = getItemDef(it.defId).kind;
      this.infoPill.setValue(
        kind === 'consumable' ? '空いている消耗品枠をタップ' : '置きたいマスをタップ',
        COLORS.gold,
      );
    }
  }

  private setupGridInput(): void {
    // バックパックのマス: タップ（起点の順番入れ替え／選択中を置く）、長押し（詳細）、ドラッグ（移動・外す）
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
    const long = this.time.delayedCall(LONG_PRESS_MS, () => {
      if (!moved && !this.drag) {
        cleanup();
        showItemDetail(this, it);
      }
    });
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
      if (moved) return;
      // タップ: 起点なら発火順を入れ替える
      if (cell >= 0 && getItemDef(it.defId).kind === 'origin') {
        const save = getSave();
        save.loadout = cycleOriginOrder(save.loadout, it.uid);
        this.commit();
      }
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
