// 装備をタップして出す詳細（数値、属性、コンボの相手、この配置での段数）。配置は時間制限がないので文章で説明してよい
import { AFFIXES, affixText } from '../core/affixes';
import Phaser from 'phaser';
import { AREA, CHAIN, COMBOS, RARITY } from '../config/balance';
import { simulateChain } from '../core/chain';
import { computeDamage } from '../core/damage';
import { heroStats, sellPrice } from '../core/economy';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { getSave } from '../platform/store';
import { originLabel } from './backpackView';
import type { IconName } from './kit/icons';
import type { ButtonSkin } from './kit/skin';
import { Button, panel } from './kit/widgets';
import { AREA_NAMES, ELEMENT_NAMES, RARITY_NAMES, STATUS_NAMES, getItemDef } from '../data/items';
import { ItemIcon } from './itemIcon';
import { COLORS, W, rarityCss, textStyle } from './theme';

const DIR_NAMES: Record<Dir, string> = { up: '上', right: '右', down: '下', left: '左' };

/** アーティファクトの名前の色 */
const ARTIFACT_CSS = '#ff8ce8';

export function describeItem(it: ItemInstance): string[] {
  const def = getItemDef(it.defId);
  const r = RARITY[it.rarity].mult;
  const lines: string[] = [];
  lines.push(
    def.artifact
      ? `アーティファクト（能力 ×${r}・出口固定）`
      : `${RARITY_NAMES[it.rarity]}（能力 ×${r}）`,
  );
  if (def.kind !== 'consumable') {
    lines.push(
      `出口: ${it.exits.length === 0 ? 'なし（末端）' : it.exits.map((d) => DIR_NAMES[d]).join('・')}`,
    );
  }
  for (const a of it.affixes ?? []) lines.push(`✦ ${affixText(a)}`);
  if (def.kind === 'attack') {
    lines.push(
      `攻撃力 ${(def.atk ?? 0) * r}（${ELEMENT_NAMES[def.element ?? 'physical']}・${AREA_NAMES[def.area ?? 'single']}）`,
    );
    if (def.relayDelay && def.relayDelay !== CHAIN.relayDelay)
      lines.push(`次への伝達 ${def.relayDelay}秒`);
    if (def.hits && def.hits > 1) lines.push(`1段で${def.hits}回攻撃`);
    if (def.critBonus) lines.push(`会心率 +${Math.round(def.critBonus * 100)}%`);
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

/** この配置の中での位置（どの起点の何段目か） */
export interface ChainContext {
  originIndex: number;
  step: number | null; // 攻撃装備の段数。防御・起点は null
  mult: number;
}

/** 配置の中でアイテムが連鎖のどこにいるか。どの起点からも届かなければ null */
export function chainContext(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
): ChainContext | null {
  const preview = simulateChain(loadout, items);
  for (const [i, plan] of preview.plans.entries()) {
    const s = plan.steps.find((x) => x.uid === uid);
    if (s) return { originIndex: i, step: s.step, mult: s.mult };
  }
  return null;
}

export interface DetailAction {
  label: string;
  skin: ButtonSkin;
  icon?: IconName;
  disabled?: boolean;
  onTap: () => void;
}

export interface DetailOptions {
  /** カードの下に並べる操作（外す・置く・売る など） */
  actions?: DetailAction[];
  /** バックパックに置かれているとき: 連鎖の中の位置。undefined なら配置外、null なら届かない */
  context?: ChainContext | null;
  onClose?: () => void;
}

const CARD_W = W - 48;
const PAD = 36;

/** 出口の向きの小さな図（中央のマスと4方向） */
function exitDiagram(
  scene: Phaser.Scene,
  x: number,
  y: number,
  it: ItemInstance,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  const c = 22;
  const cell = (cx: number, cy: number, on: boolean, center = false) => {
    g.fillStyle(center ? 0x5c5470 : on ? 0xffd25a : 0x2a2234, 1);
    g.fillRoundedRect(cx - c / 2, cy - c / 2, c, c, 5);
    g.lineStyle(2, 0x0c0a12, 1);
    g.strokeRoundedRect(cx - c / 2, cy - c / 2, c, c, 5);
  };
  const d = c + 4;
  cell(0, 0, false, true);
  cell(0, -d, it.exits.includes('up'));
  cell(d, 0, it.exits.includes('right'));
  cell(0, d, it.exits.includes('down'));
  cell(-d, 0, it.exits.includes('left'));
  return g;
}

/** タップで出す装備の詳細カード。外側をタップするか「閉じる」で閉じる */
export function showItemDetail(
  scene: Phaser.Scene,
  it: ItemInstance,
  opts: DetailOptions = {},
): Phaser.GameObjects.Container {
  const def = getItemDef(it.defId);
  const r = RARITY[it.rarity].mult;
  const save = getSave();
  const u = heroStats(save).attackMult;
  const root = scene.add.container(0, 0).setDepth(2500);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.destroy();
    opts.onClose?.();
  };
  const shade = scene.add.rectangle(0, 0, W, 1280, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
  shade.on('pointerup', close);
  root.add(shade);
  const card = scene.add.container(0, 0);
  const bg = panel(scene, W / 2, 0, CARD_W, 100, 'panel').setInteractive();
  card.add(bg);
  const left = (W - CARD_W) / 2 + PAD;
  let y = PAD;

  // 見出し: アイコン・名前・レアリティ・種類・出口
  card.add(new ItemIcon(scene, left + 60, y + 60, it, 120));
  card.add(
    scene.add.text(
      left + 140,
      y + 4,
      def.name,
      textStyle(40, def.artifact ? ARTIFACT_CSS : rarityCss(it.rarity)),
    ),
  );
  const tags = [def.artifact ? 'アーティファクト' : RARITY_NAMES[it.rarity]!];
  if (def.kind === 'attack')
    tags.push(ELEMENT_NAMES[def.element ?? 'physical']!, AREA_NAMES[def.area ?? 'single']!);
  else tags.push({ origin: '起点', defense: '防御', consumable: '消耗品', attack: '' }[def.kind]);
  card.add(scene.add.text(left + 142, y + 64, tags.join('・'), textStyle(22, COLORS.textDim)));
  if (def.kind !== 'consumable') {
    card.add(exitDiagram(scene, W / 2 + CARD_W / 2 - PAD - 30, y + 46, it));
    card.add(
      scene.add
        .text(W / 2 + CARD_W / 2 - PAD - 30, y + 92, '出口', textStyle(16, COLORS.textDim))
        .setOrigin(0.5, 0),
    );
  }
  y += 136;

  // 数値（くぼんだ面に label / value を並べる）
  const rows: [string, string, string?][] = [];
  if (def.kind === 'attack') {
    const atk = (def.atk ?? 0) * r;
    rows.push(['攻撃力', `${fmt(atk)}`, u !== 1 ? `強化込み ${fmt(atk * u)}` : undefined]);
    if (def.area === 'all') rows.push(['全体攻撃', `威力 ×${AREA.allMult}`]);
    if (def.pierce) rows.push(['貫通', `狙いの後ろ ${def.pierce}体にも同じダメージ`]);
    if (def.hits && def.hits > 1) rows.push(['連撃', `1段で${def.hits}回攻撃`]);
    if (def.critBonus) rows.push(['会心率', `+${Math.round(def.critBonus * 100)}%`]);
    if (def.multCap)
      rows.push(['連鎖倍率の上限', `×${def.multCap.toFixed(1)}`, 'この環を通る連鎖すべて']);
    if (def.bossMult) rows.push(['ボス特効', `×${def.bossMult}`]);
    if (def.appliesAll) rows.push(['付与', '濡れ・油・凍結をまとめて']);
    rows.push(['次への伝達', `${def.relayDelay ?? CHAIN.relayDelay}秒`]);
  } else if (def.kind === 'defense') {
    rows.push(['防御値', `+${fmt((def.defense ?? 0) * r)}`, '連鎖終了時に加算']);
    if (def.guardAll) rows.push(['守り', '連鎖中も無防備にならない', 'バックパックにある限り']);
  } else if (def.kind === 'origin') {
    rows.push([
      '出口',
      `${it.exits.length}方向`,
      def.artifact ? '出口は固定' : 'レアリティで出口の数が決まる',
    ]);
  }
  for (const a of it.affixes ?? []) {
    const d = AFFIXES[a.id];
    rows.push([`✦ ${d.name}`, d.text.replace('{v}', `${a.value}`)]);
  }
  if (opts.context !== undefined && def.kind !== 'consumable') {
    const ctx = opts.context;
    if (!ctx) rows.push(['この配置', 'どの起点からも届きません']);
    else if (ctx.step !== null && def.kind === 'attack') {
      const hit = computeDamage({
        atk: def.atk ?? 0,
        rarity: it.rarity,
        step: ctx.step,
        upgradeMult: u,
        area: def.area === 'all' ? 'all' : undefined,
      });
      rows.push([
        'この配置',
        `起点${originLabel(ctx.originIndex)}の${ctx.step}段目 ×${ctx.mult.toFixed(2)}`,
        `1ヒット 約${fmt(hit)}`,
      ]);
    } else
      rows.push([
        'この配置',
        `起点${originLabel(ctx.originIndex)}の連鎖`,
        def.kind === 'defense' ? '段数に数えない' : undefined,
      ]);
  }
  if (rows.length) {
    const rh = 54;
    const box = panel(
      scene,
      W / 2,
      y + (rows.length * rh + 20) / 2,
      CARD_W - PAD * 2 + 12,
      rows.length * rh + 20,
      'inset',
    );
    card.add(box);
    rows.forEach(([k, v, sub], i) => {
      const ry = y + 12 + i * rh;
      card.add(scene.add.text(left + 14, ry + 12, k, textStyle(20, COLORS.textDim)));
      card.add(scene.add.text(left + 170, ry + 6, v, textStyle(26)));
      if (sub)
        card.add(
          scene.add
            .text(W / 2 + CARD_W / 2 - PAD - 12, ry + 12, sub, textStyle(18, COLORS.gold))
            .setOrigin(1, 0),
        );
    });
    y += rows.length * rh + 36;
  }

  // 状態とコンボ
  const combos: string[] = [];
  if (def.applies) {
    const partner = COMBOS.find((c) => c.status === def.applies);
    combos.push(
      `${STATUS_NAMES[def.applies]}を付ける${partner ? ` → ${ELEMENT_NAMES[partner.element]}の攻撃で${partner.label}（×${partner.mult}）` : ''}`,
    );
  }
  const consume = COMBOS.find((c) => c.element === def.element);
  if (consume && def.kind === 'attack') {
    combos.push(
      `${STATUS_NAMES[consume.status]}の敵に当てると${consume.label}（×${consume.mult}${consume.expandToSplash ? '・範囲に拡大' : ''}）`,
    );
  }
  for (const line of combos) {
    const t = scene.add.text(left, y, `◆ ${line}`, {
      ...textStyle(21, '#ffe27a'),
      wordWrap: { width: CARD_W - PAD * 2, useAdvancedWrap: true },
    });
    card.add(t);
    y += t.height + 8;
  }
  const desc = scene.add.text(left, y + 4, def.description, {
    ...textStyle(21, COLORS.text, false),
    wordWrap: { width: CARD_W - PAD * 2, useAdvancedWrap: true },
    lineSpacing: 4,
  });
  card.add(desc);
  y += desc.height + 18;
  const meta = [`売却 ${sellPrice(it)}G`];
  if (it.rerollCount > 0) meta.push(`付け直し ${it.rerollCount}回`);
  card.add(scene.add.text(left, y, meta.join('　'), textStyle(18, COLORS.textDim)));
  y += 44;

  // 操作
  const actions: DetailAction[] = [
    ...(opts.actions ?? []),
    { label: '閉じる', skin: 'gray', onTap: () => undefined },
  ];
  const bw = Math.min(260, (CARD_W - PAD * 2 - (actions.length - 1) * 14) / actions.length);
  actions.forEach((a, i) => {
    const total = actions.length * bw + (actions.length - 1) * 14;
    const bx = W / 2 - total / 2 + bw / 2 + i * (bw + 14);
    card.add(
      new Button(
        scene,
        bx,
        y + 38,
        a.label,
        () => {
          close();
          a.onTap();
        },
        { width: bw, height: 76, skin: a.skin, icon: a.icon, disabled: a.disabled, fontSize: 24 },
      ),
    );
  });
  y += 76 + PAD + 4;

  // パネルを中身の高さに合わせ、画面中央へ
  bg.setSize(CARD_W, y);
  bg.setY(y / 2);
  card.setY(Math.max(40, (1280 - y) / 2));
  root.add(card);
  card.setScale(0.92).setAlpha(0);
  scene.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
  return root;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}
