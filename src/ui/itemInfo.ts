// 長押しで出すアイテムの詳細（数値、属性、コンボの相手）。配置は時間制限がないので文章で説明してよい
import Phaser from 'phaser';
import { CHAIN, COMBOS, RARITY } from '../config/balance';
import { sellPrice } from '../core/economy';
import type { Dir, ItemInstance } from '../core/types';
import { AREA_NAMES, ELEMENT_NAMES, RARITY_NAMES, STATUS_NAMES, getItemDef } from '../data/items';
import { ItemIcon } from './itemIcon';
import { COLORS, W, rarityCss, textStyle } from './theme';

const DIR_NAMES: Record<Dir, string> = { up: '上', right: '右', down: '下', left: '左' };

export function describeItem(it: ItemInstance): string[] {
  const def = getItemDef(it.defId);
  const r = RARITY[it.rarity].mult;
  const lines: string[] = [];
  lines.push(`${RARITY_NAMES[it.rarity]}（能力 ×${r}）`);
  if (def.kind !== 'consumable') {
    lines.push(
      `出口: ${it.exits.length === 0 ? 'なし（末端）' : it.exits.map((d) => DIR_NAMES[d]).join('・')}`,
    );
  }
  if (def.kind === 'attack') {
    lines.push(
      `攻撃力 ${(def.atk ?? 0) * r}（${ELEMENT_NAMES[def.element ?? 'physical']}・${AREA_NAMES[def.area ?? 'single']}）`,
    );
    if (def.relayDelay && def.relayDelay !== CHAIN.relayDelay)
      lines.push(`次への伝達 ${def.relayDelay}秒`);
    if (def.applies) {
      const partner = COMBOS.find((c) => c.status === def.applies);
      lines.push(
        `付与: ${STATUS_NAMES[def.applies]}${partner ? ` → ${ELEMENT_NAMES[partner.element]}で${partner.label.replace('！', '')}` : ''}`,
      );
    }
    const consume = COMBOS.find((c) => c.element === def.element);
    if (consume)
      lines.push(
        `${STATUS_NAMES[consume.status]}を消費して${consume.label.replace('！', '')}（×${consume.mult}${consume.expandToSplash ? '、範囲に拡大' : ''}）`,
      );
  } else if (def.kind === 'defense') {
    lines.push(`防御値 +${(def.defense ?? 0) * r}（連鎖が通ると終了時に加算、段数に数えない）`);
  } else if (def.kind === 'origin') {
    lines.push('連鎖の始まり。攻撃せず、段数にも数えない');
  }
  lines.push(def.description);
  if (it.rerollCount > 0) lines.push(`付け直し ${it.rerollCount}回`);
  lines.push(`売却 ${sellPrice(it)}G`);
  return lines;
}

/** 画面中央のモーダル */
export class Modal extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, height: number, onClose?: () => void) {
    super(scene, 0, 0);
    const shade = scene.add
      .rectangle(0, 0, W, 1280, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setInteractive();
    const panel = scene.add
      .rectangle(W / 2, 640, W - 60, height, COLORS.panel)
      .setStrokeStyle(4, COLORS.panelEdge)
      .setInteractive();
    shade.on('pointerup', () => {
      this.destroy();
      onClose?.();
    });
    this.add([shade, panel]);
    this.setDepth(1000);
    scene.add.existing(this);
  }

  get top(): number {
    return 640 - (this.list[1] as Phaser.GameObjects.Rectangle).height / 2;
  }
}

export function showItemDetail(scene: Phaser.Scene, it: ItemInstance): Modal {
  const lines = describeItem(it);
  const h = 220 + lines.length * 40;
  const m = new Modal(scene, h);
  const top = m.top;
  const def = getItemDef(it.defId);
  m.add(new ItemIcon(scene, 110, top + 80, it, 100));
  m.add(scene.add.text(180, top + 50, def.name, textStyle(40, rarityCss(it.rarity))));
  m.add(scene.add.text(W - 60, top + 30, '×', textStyle(40)).setOrigin(1, 0));
  lines.forEach((l, i) => {
    m.add(
      scene.add.text(60, top + 150 + i * 40, l, {
        ...textStyle(24, COLORS.text, false),
        wordWrap: { width: W - 120, useAdvancedWrap: true },
      }),
    );
  });
  return m;
}
