// 装備をタップして出す詳細（数値、属性、コンボの相手、この配置での段数）。配置は時間制限がないので文章で説明してよい
import { AFFIXES, type Affix } from '../core/affixes';
import Phaser from 'phaser';
import { AREA, CHAIN, COMBOS, RARITY } from '../config/balance';
import { simulateChain } from '../core/chain';
import { computeDamage } from '../core/damage';
import { heroStats, sellPrice, toggleLock } from '../core/economy';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { k, t } from '../i18n';
import { getSave, persist } from '../platform/store';
import { unitLabel } from './backpackView';
import type { IconName } from './kit/icons';
import type { ButtonSkin } from './kit/skin';
import { Button, fitText, panel } from './kit/widgets';
import { CONSUMABLE_CSS } from './kit/skin';
import { AREA_NAMES, ELEMENT_NAMES, RARITY_NAMES, STATUS_NAMES, getItemDef } from '../data/items';
import { ItemIcon } from './itemIcon';
import { COLORS, W, rarityCss, textStyle } from './theme';

const DIR_NAMES: Record<Dir, string> = {
  up: k('上'),
  right: k('右'),
  down: k('下'),
  left: k('左'),
};

/** アーティファクトの名前の色 */
const ARTIFACT_CSS = '#ff8ce8';

/** A combo's name without its exclamation mark ('感電！' → '感電'; also '!' and Spanish '¡…!') */
function comboName(label: string): string {
  return t(label)
    .replace(/^¡/, '')
    .replace(/\s*[!！]+$/, '');
}

/** An affix's effect in the current language ({v} is its value) */
function affixEffect(a: Affix): string {
  return t(AFFIXES[a.id].text, { v: a.value });
}

export function describeItem(it: ItemInstance): string[] {
  const def = getItemDef(it.defId);
  const r = RARITY[it.rarity].mult;
  const lines: string[] = [];
  lines.push(
    def.artifact
      ? t('アーティファクト（能力 ×{x}・出口の数は固定）', { x: r })
      : def.kind === 'consumable'
        ? t('消耗品')
        : t('{rarity}（能力 ×{x}）', { rarity: t(RARITY_NAMES[it.rarity]!), x: r }),
  );
  if (def.kind !== 'consumable') {
    lines.push(
      t('出口: {dirs}', {
        dirs:
          it.exits.length === 0
            ? t('なし（末端）')
            : it.exits.map((d) => t(DIR_NAMES[d])).join(t('・|sep')),
      }),
    );
  }
  for (const a of it.affixes ?? []) lines.push(`✦ ${t(AFFIXES[a.id].name)}: ${affixEffect(a)}`);
  if (def.kind === 'attack') {
    lines.push(
      t('攻撃力 {atk}（{element}・{area}）', {
        atk: (def.atk ?? 0) * r,
        element: t(ELEMENT_NAMES[def.element ?? 'physical']!),
        area: t(AREA_NAMES[def.area ?? 'single']!),
      }),
    );
    if (def.relayDelay && def.relayDelay !== CHAIN.relayDelay)
      lines.push(t('次への伝達 {s}秒', { s: def.relayDelay }));
    if (def.hits && def.hits > 1) lines.push(t('1段で{n}回攻撃', { n: def.hits }));
    if (def.critBonus) lines.push(t('会心率 +{pct}%', { pct: Math.round(def.critBonus * 100) }));
    if (def.applies) {
      const partner = COMBOS.find((c) => c.status === def.applies);
      const status = t(STATUS_NAMES[def.applies]!);
      lines.push(
        partner
          ? t('付与: {status} → {element}で{combo}', {
              status,
              element: t(ELEMENT_NAMES[partner.element]!),
              combo: comboName(partner.label),
            })
          : t('付与: {status}', { status }),
      );
    }
    const consume = COMBOS.find((c) => c.element === def.element);
    if (consume) {
      const params = {
        status: t(STATUS_NAMES[consume.status]!),
        combo: comboName(consume.label),
        x: consume.mult,
      };
      lines.push(
        t(
          consume.expandToSplash
            ? '{status}を消費して{combo}（×{x}、範囲に拡大）'
            : '{status}を消費して{combo}（×{x}）',
          params,
        ),
      );
    }
  } else if (def.kind === 'defense') {
    lines.push(
      t('防御値 +{n}（連鎖が通ると終了時に加算、段数に数えない）', { n: (def.defense ?? 0) * r }),
    );
  } else if (def.kind === 'origin') {
    lines.push(t('連鎖の始まり。攻撃せず、段数にも数えない'));
  }
  lines.push(t(def.description));
  if (it.rerollCount > 0) lines.push(t('付け直し {n}回', { n: it.rerollCount }));
  lines.push(t('売却 {price}G', { price: sellPrice(it) }));
  return lines;
}

/** この配置の中での位置（どの起点の何段目か） */
export interface ChainContext {
  /** 届いている起点の番号（合流した先なら ①② のように並ぶ） */
  origin: string;
  step: number | null; // 攻撃装備の段数。防御・起点は null
  mult: number;
  /** 合流ボーナス（%）。合流していなければ 0 */
  mergeBonus: number;
  /** 起点石の種類によるダメージ倍率（1 は効果なし） */
  lineDamage: number;
}

/** 配置の中でアイテムが連鎖のどこにいるか。どの起点からも届かなければ null */
export function chainContext(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
): ChainContext | null {
  const preview = simulateChain(loadout, items);
  for (const plan of preview.plans) {
    const index = plan.steps.findIndex((x) => x.uid === uid);
    if (index < 0) continue;
    const s = plan.steps[index]!;
    // An origin stone names everything it fires with; other items name the lines that reach them
    const origin = unitLabel(loadout, s.parentIndex < 0 ? plan.originUids : (s.origins ?? []));
    return {
      origin,
      step: s.step,
      mult: s.mult,
      mergeBonus: s.mergeBonus ?? 0,
      lineDamage: s.line?.damage ?? 1,
    };
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
  /** ロックを切り替えたあと（一覧や売るボタンを描き直す） */
  onLockChange?: () => void;
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
  const diagramX = W / 2 + CARD_W / 2 - PAD - 30;
  // Name and tags end before the exit diagram (or the card's inner edge for consumables)
  const headMaxW =
    (def.kind === 'consumable' ? W / 2 + CARD_W / 2 - PAD : diagramX - 37 - 10) - (left + 140);
  card.add(
    fitText(
      scene.add.text(
        left + 140,
        y + 4,
        t(def.name),
        textStyle(
          40,
          def.artifact
            ? ARTIFACT_CSS
            : def.kind === 'consumable'
              ? CONSUMABLE_CSS
              : rarityCss(it.rarity),
        ),
      ),
      headMaxW,
    ),
  );
  // 消耗品はレアリティを持たない（別枠）
  const tags: string[] =
    def.kind === 'consumable'
      ? []
      : [def.artifact ? t('アーティファクト') : t(RARITY_NAMES[it.rarity]!)];
  if (def.kind === 'attack')
    tags.push(t(ELEMENT_NAMES[def.element ?? 'physical']!), t(AREA_NAMES[def.area ?? 'single']!));
  else tags.push(t(def.kind === 'origin' ? '起点' : def.kind === 'defense' ? '防御' : '消耗品'));
  card.add(
    fitText(
      scene.add.text(left + 142, y + 64, tags.join(t('・|sep')), textStyle(22, COLORS.textDim)),
      headMaxW - 2,
    ),
  );
  if (def.kind !== 'consumable') {
    card.add(exitDiagram(scene, diagramX, y + 46, it));
    card.add(
      fitText(
        scene.add
          .text(diagramX, y + 92, t('出口'), textStyle(16, COLORS.textDim))
          .setOrigin(0.5, 0),
        100,
      ),
    );
  }
  y += 136;

  // 数値（くぼんだ面に label / value を並べる）
  const rows: [string, string, string?][] = [];
  if (def.kind === 'attack') {
    const atk = (def.atk ?? 0) * r;
    rows.push([
      t('攻撃力'),
      `${fmt(atk)}`,
      u !== 1 ? t('強化込み {n}', { n: fmt(atk * u) }) : undefined,
    ]);
    if (def.area === 'all') rows.push([t('全体攻撃'), t('威力 ×{x}', { x: AREA.allMult })]);
    if (def.pierce)
      rows.push([t('貫通'), t('狙いの後ろ {n}体にも同じダメージ', { n: def.pierce })]);
    if (def.hits && def.hits > 1) rows.push([t('連撃'), t('1段で{n}回攻撃', { n: def.hits })]);
    if (def.critBonus) rows.push([t('会心率'), `+${Math.round(def.critBonus * 100)}%`]);
    if (def.multCap)
      rows.push([t('連鎖倍率の上限'), `×${def.multCap.toFixed(1)}`, t('この環を通る連鎖すべて')]);
    if (def.bossMult) rows.push([t('ボス特効'), `×${def.bossMult}`]);
    if (def.lifesteal)
      rows.push([
        t('吸血'),
        t('与えたダメージの{pct}%を回復', { pct: Math.round(def.lifesteal * 100) }),
      ]);
    if (def.stepBoost) rows.push([t('疾風'), t('このあとの装備は段数+{n}', { n: def.stepBoost })]);
    if (def.applies === 'poison') rows.push([t('毒'), t('5秒間、一撃の30%を毎秒')]);
    if (def.appliesAll) rows.push([t('付与'), t('濡れ・油・凍結をまとめて')]);
    rows.push([t('次への伝達'), t('{s}秒', { s: def.relayDelay ?? CHAIN.relayDelay })]);
  } else if (def.kind === 'defense') {
    rows.push([t('防御値'), `+${fmt((def.defense ?? 0) * r)}`, t('連鎖終了時に加算')]);
    if (def.guardAll)
      rows.push([t('守り'), t('連鎖中も無防備にならない'), t('バックパックにある限り')]);
  } else if (def.kind === 'origin') {
    rows.push([
      t('出口'),
      t('{n}方向', { n: it.exits.length }),
      t(def.artifact ? '出口の数は固定' : 'レアリティで出口の数が決まる'),
    ]);
    rows.push([
      t('シンクロ'),
      t('同じ段数でシンクロさせるとボーナス'),
      t('シンクロの先は長い方の段数でつづく'),
    ]);
  }
  for (const a of it.affixes ?? []) rows.push([`✦ ${t(AFFIXES[a.id].name)}`, affixEffect(a)]);
  if (opts.context !== undefined && def.kind !== 'consumable') {
    const ctx = opts.context;
    if (!ctx) rows.push([t('この配置'), t('どの起点からも届きません')]);
    else if (ctx.step !== null && def.kind === 'attack') {
      const hit =
        computeDamage({
          atk: def.atk ?? 0,
          rarity: it.rarity,
          step: ctx.step,
          upgradeMult: u,
          area: def.area === 'all' ? 'all' : undefined,
        }) *
        (1 + ctx.mergeBonus / 100) *
        ctx.lineDamage;
      const bonus = Math.round(ctx.mergeBonus);
      rows.push([
        t('この配置'),
        t('起点{origin}の{step}段目 ×{mult}', {
          origin: ctx.origin,
          step: ctx.step,
          mult: ctx.mult.toFixed(2),
        }),
        bonus > 0
          ? t('1ヒット 約{n}・シンクロ+{bonus}%', { n: fmt(hit), bonus })
          : t('1ヒット 約{n}', { n: fmt(hit) }),
      ]);
    } else
      rows.push([
        t('この配置'),
        t('起点{origin}の連鎖', { origin: ctx.origin }),
        def.kind === 'defense' ? t('段数に数えない') : undefined,
      ]);
  }
  if (rows.length) {
    // 値と右の補足が重なるときは、補足を値の下の行へ回す（その行だけ高くする）
    const rh = 54;
    const subRight = W / 2 + CARD_W / 2 - PAD - 12;
    const valueX = left + 170;
    const laid = rows.map(([label, v, sub]) => {
      const vt = scene.add.text(valueX, 0, v, textStyle(26));
      // 値だけで枠からはみ出すときは縮める
      const maxV = subRight - valueX;
      if (vt.width > maxV) vt.setScale(maxV / vt.width);
      // The note may take the whole row width when it moves under the value
      const st = sub
        ? fitText(
            scene.add.text(subRight, 0, sub, textStyle(18, COLORS.gold)).setOrigin(1, 0),
            subRight - left - 14,
          )
        : null;
      const wrap = !!st && valueX + vt.displayWidth + 16 > subRight - st.displayWidth;
      return { label, vt, st, wrap, h: wrap ? rh + 26 : rh };
    });
    const total = laid.reduce((sum, row) => sum + row.h, 0);
    const box = panel(
      scene,
      W / 2,
      y + (total + 20) / 2,
      CARD_W - PAD * 2 + 12,
      total + 20,
      'inset',
    );
    card.add(box);
    let ry = y + 12;
    for (const row of laid) {
      // The label column ends where the values start
      card.add(
        fitText(
          scene.add.text(left + 14, ry + 12, row.label, textStyle(20, COLORS.textDim)),
          valueX - (left + 14) - 6,
        ),
      );
      card.add(row.vt.setY(ry + 6));
      if (row.st) card.add(row.st.setY(row.wrap ? ry + 40 : ry + 12));
      ry += row.h;
    }
    y += total + 36;
  }

  // 状態とコンボ
  const combos: string[] = [];
  if (def.applies) {
    const partner = COMBOS.find((c) => c.status === def.applies);
    const status = t(STATUS_NAMES[def.applies]!);
    combos.push(
      partner
        ? t('{status}を付ける → {element}の攻撃で{combo}（×{x}）', {
            status,
            element: t(ELEMENT_NAMES[partner.element]!),
            combo: t(partner.label),
            x: partner.mult,
          })
        : t('{status}を付ける', { status }),
    );
  }
  const consume = COMBOS.find((c) => c.element === def.element);
  if (consume && def.kind === 'attack') {
    const params = {
      status: t(STATUS_NAMES[consume.status]!),
      combo: t(consume.label),
      x: consume.mult,
    };
    combos.push(
      t(
        consume.expandToSplash
          ? '{status}の敵に当てると{combo}（×{x}・範囲に拡大）'
          : '{status}の敵に当てると{combo}（×{x}）',
        params,
      ),
    );
  }
  for (const line of combos) {
    const lineText = scene.add.text(left, y, `◆ ${line}`, {
      ...textStyle(21, '#ffe27a'),
      wordWrap: { width: CARD_W - PAD * 2, useAdvancedWrap: true },
    });
    card.add(lineText);
    y += lineText.height + 8;
  }
  const desc = scene.add.text(left, y + 4, t(def.description), {
    ...textStyle(21, COLORS.text, false),
    wordWrap: { width: CARD_W - PAD * 2, useAdvancedWrap: true },
    lineSpacing: 4,
  });
  card.add(desc);
  y += desc.height + 18;
  const meta = [t('売却 {price}G', { price: sellPrice(it) })];
  if (it.rerollCount > 0) meta.push(t('付け直し {n}回', { n: it.rerollCount }));
  // Ends before the lock button (consumables have none)
  const metaMaxW =
    def.kind === 'consumable' ? CARD_W - PAD * 2 : W / 2 + CARD_W / 2 - PAD - 200 - 10 - left;
  card.add(
    fitText(
      scene.add.text(left, y, meta.join(t('　|sep')), textStyle(18, COLORS.textDim)),
      metaMaxW,
    ),
  );
  // ロック（間違って売らないように）。消耗品にはない
  if (def.kind !== 'consumable') {
    const lockLabel = () => (isLocked() ? t('ロック中') : t('ロックする'));
    const isLocked = () => !!save.inventory.find((i) => i.uid === it.uid)?.locked;
    const lockBtn = new Button(
      scene,
      W / 2 + CARD_W / 2 - PAD - 100,
      y + 10,
      lockLabel(),
      () => {
        if (!toggleLock(save, it.uid)) return;
        it.locked = isLocked() || undefined;
        if (!it.locked) delete it.locked;
        persist();
        lockBtn.setText(lockLabel());
        if (opts.onLockChange) {
          close();
          opts.onLockChange();
        }
      },
      { width: 200, height: 52, fontSize: 20, skin: 'blue', icon: 'lock' },
    );
    card.add(lockBtn);
  }
  y += 44;

  // 操作
  const actions: DetailAction[] = [
    ...(opts.actions ?? []),
    { label: t('閉じる'), skin: 'gray', onTap: () => undefined },
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
