// 配置画面: 上半分に盤面、下半分に倉庫。ドラッグで置き、盤面の外へドラッグで外す
import { runTutorial, type CoachStep } from '../ui/tutorial';
import Phaser from 'phaser';
import { simulateChain, type ChainPreview } from '../core/chain';
import { estimateRoute } from '../core/estimate';
import { getTechnique, TECHNIQUES } from '../data/techniques';
import { otherBoardUse, switchBoard } from '../core/boardSave';
import { runFeatures } from '../core/runRules';
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
  boardCharmSlots,
  charmEquipped,
  charmSellPrice,
  equipCharm,
  sellCharm,
} from '../core/charmSave';
import { charmContext, charmLit, type CharmContext, type CharmInstance } from '../core/charms';
import { getCharm } from '../data/charms';
import { CharmStrip } from '../ui/charmStrip';
import { CharmList, charmText } from '../ui/charmList';
import { boardDepth, boardPosMult, ownedBoards } from '../core/boards';
import { BOARDS, getBoard, type BoardId } from '../data/boards';
import { boardMark, boardTraitText } from '../ui/boardText';
import {
  boardUids,
  restoreStackBoard,
  stackAt,
  stackMove,
  stackPut,
  stackShift,
  stackTake,
  type StackBlock,
} from '../core/stack';
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
import { clearLoadout, cycleOriginOrder, removeItem, setConsumable } from '../core/loadout';
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
  /** The edge slots, the charm case and the chosen slot (null: no charms, as in the challenge) */
  private charmStrip: CharmStrip | null = null;
  private charmList: CharmList | null = null;
  private charmSlot: number | null = null;
  private charmCtx: CharmContext | undefined;
  private routeBar!: Phaser.GameObjects.Container;
  private routeText!: Phaser.GameObjects.Text;
  /** Width the route summary may use */
  private routeTextMaxW = 0;
  private boardBar!: Phaser.GameObjects.Container;
  /** ほかの盤面で使っている装備 */
  private boardUses = new Map<string, BoardId[]>();
  private resetBtn!: Button;
  /** 戻す: 変える前の並べ方（新しいものが後ろ）。盤面を切り替えたら空にする */
  private undoStack: string[] = [];
  /** 消耗品枠の中身（変わったら「入れておきたいもの」として覚え直す） */
  private lastCons = '';
  private lastSnapshot = '';
  private undoBtn!: Button;
  private warn!: Phaser.GameObjects.Text;
  private drag: DragState | null = null;
  private selected: ItemInstance | null = null;
  /** 挑戦用の配置を編集中（その挑戦） */
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
    // Charms: made again below (a restart keeps old fields)
    this.charmStrip = null;
    this.charmList = null;
    this.charmSlot = null;
    this.charmCtx = undefined;
    // 挑戦用の配置: 画面を出ている間だけ loadout と入れ替える（出るときに戻す）
    if (this.challenge) {
      enterChallengeEdit(save, this.challenge.def.rules);
      persist();
      this.events.once('shutdown', () => {
        leaveChallengeEdit(getSave());
        persist();
      });
    }
    this.view = new BackpackView(this, LOADOUT_LAYOUT.backpackTop, save.loadout, itemMap(save));
    // 盤面の切り替え（盤面ごとに並べ方を覚える。装備は倉庫に置いたまま）
    this.boardBar = this.add.container(0, LOADOUT_LAYOUT.backpackTop - 38);
    this.buildBoardBar();
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
    this.routeBar = this.add.container(0, this.routeBarY());
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
          : boardMark(this.boardUses, it.uid),
    );
    // Charms: slots on the board's edge; the case covers the item list while a slot is chosen
    // (none in the challenge, which plays without them)
    if (runFeatures(this.challenge ? 'challenge' : 'normal').charms !== 'off') {
      const board = getBoard(save.loadout.board);
      this.charmStrip = new CharmStrip(this, this.view, board, boardCharmSlots(save, board.id), {
        // A tall board leaves no room for full slots above the route bar
        compact: save.loadout.height >= 4,
        onTapSlot: (slot) => this.tapCharmSlot(slot),
      });
      this.charmList = new CharmList(this, LOADOUT_LAYOUT.listTop, LOADOUT_LAYOUT.listBottom, {
        onTap: (c) => this.putCharm(c),
        onLongPress: (c) => this.charmDetail(c),
        onBack: () => this.chooseCharmSlot(null),
      }).setVisible(false);
    }
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
    this.runBoardGuide();
  }

  /** The board screen's guide (once): storage, arrows and the one origin, stacks, charms, boards */
  private runBoardGuide(): void {
    const grid = {
      x: W / 2,
      y: LOADOUT_LAYOUT.backpackTop + this.view.gridHeight / 2,
      w: W - 120,
      h: this.view.gridHeight + 16,
    };
    const steps: CoachStep[] = [
      {
        rect: {
          x: W / 2,
          y: (LOADOUT_LAYOUT.listTop + LOADOUT_LAYOUT.listBottom) / 2,
          w: W - 12,
          h: LOADOUT_LAYOUT.listBottom - LOADOUT_LAYOUT.listTop + 10,
        },
        text: t('下は倉庫。装備を少し押さえてから、\n盤面へドラッグして置こう'),
      },
      {
        rect: grid,
        text: t(
          '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n起点は盤面に1つだけ！',
        ),
      },
      {
        rect: grid,
        text: t('同じ装備は、同じマスに重ねられる。\n上に重ねたものほど強いよ！'),
      },
    ];
    // The edge slots (not in the challenge, which plays without charms)
    const strip = this.charmStrip;
    if (strip) {
      const l = getSave().loadout;
      // Slot centers on the screen (slotPos is in the strip's own space)
      const ps = Array.from({ length: l.width + l.height }, (_, i) => {
        const q = strip.slotPos(i);
        return { x: strip.x + q.x, y: strip.y + q.y };
      });
      const x0 = Math.min(...ps.map((q) => q.x)) - 50;
      const x1 = this.view.left + l.width * this.view.cell + 10;
      const y0 = LOADOUT_LAYOUT.backpackTop - 10;
      const y1 = Math.max(...ps.map((q) => q.y)) + 50;
      steps.push({
        rect: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 },
        text: t('盤面のふちは、アクセサリーの枠。\n手に入れたら、ここに付けよう'),
      });
    }
    if (!this.challenge)
      steps.push({
        rect: { x: (24 + W - 267) / 2, y: this.boardBar.y, w: W - 267 - 24 + 16, h: 60 },
        text: t('地域を抜けると、新しい盤面がもらえる。\nもらった盤面は、ここで切り替えよう'),
      });
    steps.push({
      rect: { x: W / 2, y: this.routeBar.y, w: W - 30, h: 66 },
      text: t('「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！'),
    });
    runTutorial(this, 'board', steps);
  }

  override update(): void {
    this.view.tick(this.time.now);
  }

  /**
   * Techniques shown by name: the ones learned by a spark. The challenge plays without mastery, so
   * every technique goes off there and all are named
   */
  private knownTechs(): readonly string[] {
    return this.challenge ? TECHNIQUES.map((x) => x.id) : getSave().mastery.learned;
  }

  private refresh(): void {
    const save = getSave();
    this.boardUses = otherBoardUse(save);
    const items = itemMap(save);
    this.view.setLoadout(save.loadout, items);
    // Charms: what the slots react to on this layout (the estimate uses it too)
    if (this.charmStrip) {
      const slots = boardCharmSlots(save, save.loadout.board ?? 'standard');
      this.charmCtx = charmContext(slots, save.loadout, items);
      const ctx = this.charmCtx;
      this.charmStrip.setSlots(slots);
      this.charmStrip.setLit(new Set(slots.map((_, i) => i).filter((i) => charmLit(i, ctx))));
      this.charmList?.setCharms(
        save.charms ?? [],
        new Set(slots.flatMap((c) => (c ? [c.uid] : []))),
      );
    }
    const preview = simulateChain(save.loadout, items);
    if (this.focus !== null && this.focus >= preview.plans.length) this.focus = null;
    if (save.settings.showRoutes)
      this.view.showPreview(preview, this.focus, new Set(this.knownTechs()));
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
    this.routeBar.setY(this.routeBarY());
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
    const order = getSave().loadout.originOrder;
    preview.plans.forEach((p, i) => {
      // One chip per origin (origins fire one at a time)
      const label = `${order.indexOf(p.originUid) + 1}`;
      chip(x, 50, shown && this.focus === i, () =>
        this.setFocus(shown && this.focus === i ? null : i),
      );
      const cx = x + 25;
      const pill = this.add.graphics();
      pill.fillStyle(routeColor(i), 1);
      pill.fillRoundedRect(cx - 14, -15, 28, 28, 14);
      pill.lineStyle(3, 0x0c0a12, 1);
      pill.strokeRoundedRect(cx - 14, -15, 28, 28, 14);
      bar.add(pill);
      bar.add(
        this.add
          .text(cx, -2, label, textStyle(16, '#1a1424'))
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
    const est = preview.plans.map((p) =>
      estimateRoute(p, items, u, save.loadout.board, this.charmCtx),
    );
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
      const knownTech = e.techs.find((id) => this.knownTechs().includes(id));
      const tech = knownTech ? getTechnique(knownTech) : undefined;
      const params = { n: num(e.total), step: p.maxStep };
      return {
        text: knownTech
          ? t('約{n}・{step}連鎖・{tech}', {
              ...params,
              tech: tech ? t(tech.name) : t('必殺技|fallback'),
            })
          : e.combos > 0
            ? t('約{n}・{step}連鎖・コンボ{combo}', { ...params, combo: e.combos })
            : t('約{n}・{step}連鎖', params),
        color: routeCss(this.focus),
      };
    })();
    // Charms: the combo multiplier the route builds up to
    const peak =
      this.focus === null
        ? Math.max(1, ...est.map((e) => e.charmPeak))
        : (est[this.focus]?.charmPeak ?? 1);
    if (shown && preview.plans.length > 0 && peak > 1)
      summary.text = t('{route}・コンボ ×{m}', { route: summary.text, m: peak.toFixed(1) });
    this.routeText = this.add
      .text(W - 36, -2, summary.text, textStyle(18, summary.color))
      .setOrigin(1, 0.5);
    // 長いときは縮めて、枠からはみ出さない
    this.routeTextMaxW = W - 36 - x - 6;
    fitText(this.routeText, this.routeTextMaxW);
    bar.add(this.routeText);
  }

  /** The bar above the board: the board's name and ◀ ▶, or the challenge's name */
  private buildBoardBar(): void {
    const bar = this.boardBar;
    bar.removeAll(true);
    if (this.challenge) {
      // 挑戦用の配置: 盤面の切り替えの代わりに、名前と「制限に合わせる」（いつも標準の盤面）
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
    this.buildBoardSwitch(bar);
  }

  /** The board's name and trait, with ◀ ▶ to go through the owned boards */
  private buildBoardSwitch(bar: Phaser.GameObjects.Container): void {
    const save = getSave();
    const owned = ownedBoards(save);
    const def = getBoard(save.loadout.board);
    const at = Math.max(
      0,
      owned.findIndex((b) => b.id === def.id),
    );
    // Up to the undo button
    const left = 24;
    const right = W - 206 - 53 - 8;
    const many = owned.length > 1;
    const step = (d: number) => {
      const next = owned[(at + d + owned.length) % owned.length]!;
      sfx('click');
      if (!switchBoard(getSave(), next.id)) return;
      persist();
      this.scene.restart();
    };
    if (many) {
      const arrow = { width: 48, height: 52, fontSize: 20, skin: 'blue' } as const;
      bar.add(new Button(this, left + 24, 0, '◀', () => step(-1), arrow));
      bar.add(new Button(this, right - 24, 0, '▶', () => step(1), arrow));
    }
    const mid = (left + right) / 2;
    const room = right - left - (many ? 2 * 56 : 0);
    const sub =
      boardTraitText(def) ??
      (owned.length < BOARDS.length ? t('地域を抜けると、新しい盤面がもらえます') : '');
    const name = this.add
      .text(mid, sub ? -13 : -2, t(def.name), textStyle(22, '#ffe27a'))
      .setOrigin(0.5);
    fitText(name, room);
    bar.add(name);
    if (sub) {
      const line = this.add.text(mid, 14, sub, textStyle(16, COLORS.text)).setOrigin(0.5);
      fitText(line, room);
      bar.add(line);
    }
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

  /** 画面下の一時的なお知らせ */
  /** Under the board, or under the charm slots when they are full size */
  private routeBarY(): number {
    const under = this.view.y + this.view.gridHeight;
    if (!this.charmStrip) return under + 30;
    // Compact badges sit on the frame's edge: just clear them (a 5-row board has no room left above
    // the consumable slots, so its bar clears them only partly)
    const h = getSave().loadout.height;
    return h >= 5 ? under + 44 : h >= 4 ? under + 50 : this.charmStrip.bottom + 30;
  }

  /** Charms: choose an edge slot (the charm case replaces the item list) or none */
  private chooseCharmSlot(slot: number | null): void {
    // The item picked for placing is hidden with the list: forget it, or a tap on a cell would
    // place it unseen
    if (slot !== null && this.selected) {
      this.selected = null;
      this.list.setSelected(null);
      this.refresh();
    }
    this.charmSlot = slot;
    this.charmStrip?.setSelected(slot);
    this.charmList?.setVisible(slot !== null);
    this.list.setVisible(slot === null);
  }

  /** Charms: a tap on a slot chooses it; a tap on the chosen one takes its charm off */
  private tapCharmSlot(slot: number): void {
    sfx('click');
    if (this.charmSlot !== slot) {
      this.chooseCharmSlot(slot);
      return;
    }
    const save = getSave();
    const board = save.loadout.board ?? 'standard';
    if (boardCharmSlots(save, board)[slot]) {
      equipCharm(save, board, slot, null);
      persist();
    }
    this.chooseCharmSlot(null);
    this.refresh();
  }

  /** Charms: put a charm from the case into the chosen slot */
  private putCharm(c: CharmInstance): void {
    if (this.charmSlot === null) return;
    const save = getSave();
    if (!equipCharm(save, save.loadout.board ?? 'standard', this.charmSlot, c.uid)) return;
    sfx('click');
    persist();
    this.chooseCharmSlot(null);
    this.refresh();
  }

  /** Charms: what a charm does, and selling it (not while it is worn on any board) */
  private charmDetail(c: CharmInstance): void {
    const def = getCharm(c.defId);
    if (!def) return;
    const save = getSave();
    if (charmEquipped(save, c.uid)) {
      this.showToastLine(t('外してから売れます'));
      return;
    }
    const price = charmSellPrice(c);
    confirmDialog(
      this,
      t(def.name),
      charmText(c),
      t('売る {price}G', { price }),
      () => {
        if (sellCharm(getSave(), c.uid) > 0) {
          sfx('drop');
          persist();
          this.refresh();
        }
      },
      'gold',
    );
  }

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
      )
        // Charms: a 5-row board's route bar comes down over this label
        .setVisible(!(this.charmStrip && save.loadout.height >= 5)),
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
    // Items sold since then drop out (the item below moves up)
    save.loadout = restoreStackBoard(
      JSON.parse(prev) as Loadout,
      itemMap(save),
      consumableSlots(save),
      save.loadout.board ?? 'standard',
    );
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

  /** Put an item on a cell of the board (an occupied cell stacks it on top) */
  private putOnStack(uid: string, cell: number): void {
    const save = getSave();
    const r = stackPut(save.loadout, itemMap(save), uid, cell);
    if (r.block) {
      sfx('error');
      this.showToastLine(stackBlockText(r.block, boardDepth(getBoard(save.loadout.board))));
      return;
    }
    save.loadout = r.loadout;
    this.commit();
  }

  /**
   * A cell's stack, top first (it rings last and hits hardest). Each item can move up or down or
   * come off; tapping its icon shows the item
   */
  private openStackPanel(cell: number): void {
    const save = getSave();
    const items = itemMap(save);
    const stack = stackAt(save.loadout, cell);
    if (stack.length === 0) return;
    const H = this.scale.gameSize.height;
    const root = this.add.container(0, 0).setDepth(2600);
    const close = () => root.destroy();
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', close);
    root.add(shade);
    const cw = W - 50;
    const rowH = 112;
    const ch = 120 + stack.length * (rowH + 12) + 96;
    const top = H / 2 - ch / 2;
    root.add(panel(this, W / 2, H / 2, cw, ch, 'panel').setInteractive());
    root.add(
      fitText(
        this.add
          .text(W / 2, top + 48, t('重ね（下から順に鳴る）'), textStyle(30, '#ffe27a'))
          .setOrigin(0.5),
        cw - 40,
      ),
    );
    // Apply a change, then show the stack again (or close when the cell is empty)
    const redo = (next: Loadout) => {
      save.loadout = next;
      close();
      this.commit();
      this.openStackPanel(cell);
    };
    const n = stack.length;
    [...stack].reverse().forEach((uid, i) => {
      const pos = n - 1 - i;
      const it = items.get(uid)!;
      const y = top + 100 + i * (rowH + 12);
      root.add(panel(this, W / 2, y + rowH / 2, cw - 40, rowH, 'paper'));
      const icon = new ItemIcon(this, 92, y + rowH / 2, it, 88).setInteractive({
        useHandCursor: true,
      });
      bindTap(icon, () => showItemDetail(this, it, { actions: [] }));
      root.add(icon);
      root.add(
        fitText(
          this.add.text(150, y + 22, t(getItemDef(it.defId).name), inkStyle(24)).setOrigin(0, 0),
          250,
        ),
      );
      const mult = boardPosMult(getBoard(save.loadout.board))[pos]!;
      root.add(
        fitText(
          this.add
            .text(
              150,
              y + 62,
              pos === n - 1
                ? t('一番上 ×{m}（矢印はこの装備）', { m: mult })
                : t('×{m}', { m: mult }),
              inkStyle(18, '#8a5a10'),
            )
            .setOrigin(0, 0),
          250,
        ),
      );
      const bx = W - 220;
      const up = new Button(
        this,
        bx,
        y + rowH / 2,
        '↑',
        () => redo(stackShift(save.loadout, uid, 1)),
        {
          width: 64,
          height: 60,
          fontSize: 26,
          skin: 'blue',
        },
      );
      up.setDisabled(pos === n - 1);
      const down = new Button(
        this,
        bx + 72,
        y + rowH / 2,
        '↓',
        () => redo(stackShift(save.loadout, uid, -1)),
        { width: 64, height: 60, fontSize: 26, skin: 'blue' },
      );
      down.setDisabled(pos === 0);
      const off = new Button(
        this,
        bx + 158,
        y + rowH / 2,
        t('外す'),
        () => redo(stackTake(save.loadout, items, uid)),
        { width: 92, height: 60, fontSize: 20, skin: 'red' },
      );
      root.add([up, down, off]);
    });
    root.add(
      new Button(this, W / 2, top + ch - 52, t('閉じる'), close, {
        width: 220,
        height: 64,
        fontSize: 24,
        skin: 'gray',
      }),
    );
  }

  private confirmReset(): void {
    const save = getSave();
    const placed = boardUids(save.loadout).length + save.loadout.consumables.length;
    if (placed === 0) return;
    confirmDialog(
      this,
      t('全部外す'),
      t('盤面と消耗品枠の {n}個をすべて倉庫に戻します。', { n: placed }),
      t('全部外す'),
      () => {
        save.loadout = clearLoadout(save.loadout);
        this.selected = null;
        this.commit();
      },
      'red',
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
          save.loadout =
            where === 'grid'
              ? stackTake(save.loadout, items, it.uid)
              : removeItem(save.loadout, items, it.uid);
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
    // Only as wide as the grid: the charm slots left of it take their own taps
    const zone = this.add
      .zone(
        this.view.left,
        LOADOUT_LAYOUT.backpackTop,
        getSave().loadout.width * this.view.cell,
        this.view.gridHeight,
      )
      .setOrigin(0, 0)
      .setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const save = getSave();
      const cell = this.view.cellAt(p.x, p.y);
      if (cell < 0) return;
      // The selected item goes on the cell (an occupied cell stacks it on top)
      const sel = this.selected;
      if (sel && getItemDef(sel.defId).kind !== 'consumable') {
        this.selected = null;
        this.putOnStack(sel.uid, cell);
        return;
      }
      const uid = save.loadout.cells[cell];
      const it = uid ? save.inventory.find((i) => i.uid === uid) : undefined;
      if (it) this.pressGrid(it, cell, -1, p);
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
      // A tap on the board shows the cell's stack
      if (cell >= 0) {
        this.openStackPanel(cell);
        return;
      }
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
    } else {
      // A cell's stack moves as a whole (swapping with the stack there); from storage the item
      // goes on the cell; dragged off the board the whole stack comes off
      if (cell >= 0 && d.fromCell >= 0) save.loadout = stackMove(save.loadout, d.fromCell, cell);
      else if (cell >= 0) return this.putOnStack(d.item.uid, cell);
      else if (d.fromCell >= 0)
        for (const u of stackAt(save.loadout, d.fromCell))
          save.loadout = stackTake(save.loadout, items, u);
      else return;
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

/** Why an item cannot go on that cell of the board (depth: items per cell) */
function stackBlockText(b: StackBlock, depth: number): string {
  return b === 'group'
    ? t('同じ装備だけ重ねられます')
    : b === 'artifact'
      ? t('アーティファクトは重ねられません（1つで{n}回鳴ります）', { n: depth })
      : b === 'full'
        ? t('1マスに重ねられるのは{n}つまで', { n: depth })
        : b === 'hole'
          ? t('ここは盤面の外です')
          : t('起点石は盤面に1つだけ');
}
