// 30秒のランを固定ステップで進め、イベント列を出す（仕様書 第4〜6章）
// Phaser 非依存。シーンはここが出すイベントと状態を描画するだけ。
import {
  AREA,
  BOSS,
  CHAIN_RULES,
  CHARM,
  ELITES,
  LUCK,
  MASTERY,
  type EliteId,
  type LuckRules,
  CONSUMABLE,
  FIELD,
  HERO,
  LIGHT_DARK,
  LOOP_SCALING,
  LOOT,
  SIM,
  STATUS,
  POISON,
  PROGRESS,
  RELIC,
  TIME_BONUS,
  TREASURE,
  type ChainRules,
} from '../config/balance';
import { SCARECROW_ID, getEnemyDef, type EnemyDef } from '../data/enemies';
import { getItemDef } from '../data/items';
import { TECHNIQUE_MULT, getTechnique } from '../data/techniques';
import { getRegion, type RegionDef } from '../data/regions';
import type { RelicId } from '../data/relics';
import { getBoard, type BoardDef } from '../data/boards';
import { rollLoop, type LoopLayout } from './layout';
import {
  chainMultiplier,
  defenseValue,
  firedPieces,
  flowRules,
  lineEffects,
  lineOrigin,
  simulateChain,
} from './chain';
import { affixValue } from './affixes';
import { boardDamageMult } from './boards';
import {
  applyCharmEvent,
  cellTop,
  charmContext,
  comboWeight,
  rollCharmDrop,
  stackTop,
  type CharmContext,
  type CharmInstance,
  type CharmSlots,
} from './charms';
import type { CharmTrigger } from '../data/charms';
import { computeDamage, effectiveArea, findCombo } from './damage';
import { rollLoot } from './loot';
import { sparkChance } from './mastery';
import { canStickRelic, rollRelicOffer } from './relics';
import { Rng, ipow } from './rng';
import { cellRings } from './stack';
import type {
  Area,
  ChainPlan,
  ChainStep,
  ConsumableEffect,
  Element,
  ItemDef,
  ItemInstance,
  Loadout,
  Status,
} from './types';

export interface HeroStats {
  maxHp: number;
  atbTime: number;
  attackMult: number; // 永続強化の攻撃倍率 U
  runTime: number; // 出撃時間（秒）。強化込み、延長前
}

export const BASE_HERO_STATS: HeroStats = {
  maxHp: HERO.maxHp,
  atbTime: HERO.atbTime,
  attackMult: 1,
  runTime: SIM.runDuration,
};

export interface RunConfig {
  seed: number;
  regionId: string;
  loadout: Loadout;
  items: ReadonlyMap<string, ItemInstance>;
  hero: HeroStats;
  mode?: 'run' | 'dummy';
  consumableSlots?: number;
  /** 連鎖の性格づけ（省略時は CHAIN_RULES） */
  rules?: Partial<ChainRules>;
  /** 会心・ダメージの揺れ・精鋭（省略時は LUCK） */
  luck?: Partial<LuckRules>;
  /** 体験ラン: 時間はのびない・戦利品は落ちない */
  demo?: boolean;
  /** 装備とゴールドを落とさない（挑戦。エンドレスは地域で決まる） */
  noLoot?: boolean;
  /** First own run after the demo: the first enemy killed always drops an equipment piece */
  firstRun?: boolean;
  /** Artifact types the player already has: they never drop (one of each type) */
  ownedArtifacts?: readonly string[];
  /** The hero's levels per element and the techniques learned so far */
  mastery?: RunMastery;
  /** A beaten boss offers relics. `stuck` are on the board from the start (bots) */
  relics?: { stuck?: readonly (readonly [number, RelicId])[] };
  /** The chance per loop that a lone treasure goblin takes a group's place */
  treasure?: { chance: number };
  /**
   * The charm in each edge slot of the board (columns, then rows). Its presence also
   * lets charms drop (from their own random stream)
   */
  charms?: CharmSlots;
  /** The player has none yet, so the first boss beaten surely drops one */
  charmSure?: boolean;
}

/** What a run starts with (see core/mastery.ts) */
export interface RunMastery {
  levels: Partial<Record<Element, number>>;
  learned: readonly string[];
}

export interface EnemyState {
  id: number;
  defId: string;
  def: EnemyDef;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  interval: number; // 攻撃間隔（秒）。精鋭・激昂で変わる
  attackTimer: number;
  alive: boolean;
  statuses: Map<Status, number>; // 状態 → 失効する tick
  standOffset: number;
  aggro: boolean;
  escort: boolean;
  loop: number;
  group: number; // 同じ群れは一緒に寄ってくる
  row: number; // 見た目の前後列（描画のみ。core の距離・標的順には使わない）
  killedBy: number; // 倒した連鎖の番号（-1 は生存中・連鎖以外）
  elite: EliteId | null;
  enraged: boolean;
  /** 毒の毎秒ダメージ（毒1重あたり。毒が切れたら 0） */
  poisonDps: number;
  /** 毒の重ね数（風で増える。毒が切れたら 0） */
  poisonLayers: number;
  /** まだ表示していない毒のダメージ */
  poisonAcc: number;
  /** 封印: この tick まで攻撃のたまり方が遅い */
  slowUntil: number;
  /** 粉砕: この tick まで「一撃○○未満を無効」が効かない */
  guardBrokenUntil: number;
  /** The fleeing treasure goblin (does not attack) */
  treasure: boolean;
  /** Ticks left at the hero before it runs off */
  fleeLeft: number;
}

/** timeout: 時間切れ、dead: 力尽きた、retreat: プレイヤーが撤退した（戦利品は持ち帰る） */
export type EndReason = 'timeout' | 'dead' | 'retreat';

export type CombatEvent =
  | { type: 'loopStart'; tick: number; loop: number; bossId: string }
  | {
      type: 'spawn';
      tick: number;
      enemyId: number;
      defId: string;
      x: number;
      escort: boolean;
      elite: EliteId | null;
    }
  | { type: 'enrage'; tick: number; enemyId: number }
  | { type: 'revive'; tick: number }
  /** 必殺技の一撃（演出用。ダメージは続く hit に入っている） */
  | { type: 'technique'; tick: number; id: string; enemyId: number; uid: string }
  /** A technique sparked and is learned (its technique event follows) */
  | { type: 'spark'; tick: number; id: string; enemyId: number; uid: string }
  | {
      type: 'chainStart';
      tick: number;
      originUid: string;
      originIndex: number;
      plan: ChainPlan;
      aimId: number | null;
    }
  | {
      type: 'step';
      tick: number;
      index: number;
      uid: string;
      cell: number;
      fromCell: number | null;
      step: number | null;
      mult: number;
      whiff: boolean;
    }
  | {
      type: 'hit';
      tick: number;
      enemyId: number;
      itemUid: string;
      damage: number;
      combo: string | null;
      nullified: boolean;
      crit: boolean;
      /** 連鎖の何段目の攻撃か（爆弾などは 0） */
      step: number;
      /** 毒など、時間でじわじわ与えたダメージ */
      dot?: boolean;
    }
  | { type: 'combo'; tick: number; enemyId: number; name: string; label: string }
  /** A charm in `slot` raised the chain's combo multiplier to m */
  | { type: 'charm'; tick: number; slot: number; op: '+' | '×'; value: number; m: number }
  /** An enemy dropped a charm */
  | { type: 'charmDrop'; tick: number; enemyId: number; charm: CharmInstance }
  | { type: 'statusApplied'; tick: number; enemyId: number; status: Status }
  | {
      type: 'enemyDeath';
      tick: number;
      enemyId: number;
      defId: string;
      boss: boolean;
      fled: boolean;
    }
  | { type: 'drop'; tick: number; enemyId: number; item: ItemInstance }
  | {
      type: 'heroHit';
      tick: number;
      enemyId: number;
      damage: number;
      absorbed: number;
      unguarded: boolean;
    }
  | {
      type: 'chainEnd';
      tick: number;
      originUid: string;
      defenseGain: number;
      defenseCells: number[];
      totalDamage: number;
      duration: number;
      cut: boolean; // 敵がいなくなった、またはよろめいて途中で打ち切った
      staggered: boolean; // 被弾でよろめいて途切れた
    }
  | { type: 'bossDefeated'; tick: number; loop: number; bossId: string }
  | { type: 'consumable'; tick: number; uid: string; defId: string; effect: ConsumableEffect }
  | {
      type: 'timeBonus';
      tick: number;
      reason: TimeBonusReason;
      seconds: number; // 実際に増えた秒数（上限で削られた後）
      capped: boolean;
    }
  | { type: 'runEnd'; tick: number; reason: EndReason; reachedLoop: number }
  /** A beaten boss offers these; the run waits until one is stuck or skipped */
  | { type: 'relicOffer'; tick: number; ids: RelicId[] }
  | { type: 'relicStuck'; tick: number; id: RelicId; cell: number }
  | { type: 'relicSkipped'; tick: number }
  /** The goblin came, was beaten, or ran off */
  | { type: 'treasure'; tick: number; enemyId: number; phase: 'appear' | 'caught' | 'fled' };

export type TimeBonusReason = 'boss' | 'sweep' | 'consumable';

export interface RunStats {
  fires: number;
  maxStep: number;
  maxDamage: number;
  totalDamage: number;
  bossesDefeated: number;
  timeGained: number; // 延長した秒数
  /** 倒した敵から拾ったゴールド */
  gold?: number;
  sweeps: number; // 一網打尽の回数
  /** Rings of attack gear per element */
  rings?: Partial<Record<Element, number>>;
  /** Techniques that sparked in this run */
  sparks?: string[];
}

export interface RunResult {
  reason: EndReason;
  /** ラン中に使った消耗品の uid（撤退の確定時に倉庫から取り除く） */
  usedConsumables: string[];
  progress: number;
  reachedLoop: number;
  drops: ItemInstance[];
  /** Charms picked up (only when the run had charms on) */
  charms?: CharmInstance[];
  stats: RunStats;
  ticks: number;
  /** プレイヤーの操作（ランキングでサーバーが同じランを再生するのに使う） */
  inputs?: RunInput[];
}

/** プレイヤーの操作。t はその操作をしたときの tick（その tick の step の前に行う） */
export type RunInput =
  | { t: number; k: 'use'; slot: number }
  | { t: number; k: 'retreat' }
  | { t: number; k: 'revive'; s: number }
  /** Relics: stick an offered one on a cell, or go on without */
  | { t: number; k: 'relic'; id: RelicId; cell: number }
  | { t: number; k: 'relicSkip' };

interface ExecInfo {
  eff: number; // 実際の段数（狙いが変わると1に戻る）
  aim: number | null;
  /** The count fell below the plan on this branch (a kill restarted it) */
  reset: boolean;
  /** The count an attack struck with (a ring repeated by 残響の起点石 strikes with it again) */
  hit?: number;
}

interface ActiveChain {
  plan: ChainPlan;
  startTick: number;
  next: number;
  exec: ExecInfo[];
  totalDamage: number;
  durationTicks: number;
  cut: boolean; // 狙える敵がいなくなって打ち切った、またはよろめいた
  staggered: boolean; // 被弾でよろめいて途切れた
  taken: number; // この連鎖中に受けたダメージ（防御で吸った分は除く）
  /** The chain reached a 呼び戻しの笛, so the wait before the next is cut */
  recall: boolean;
  /** The combo multiplier (×1 at the start of every chain) */
  charmM: number;
  /** Cells kept guarded after the origin, and the share of max HP that staggers (盾の起点石) */
  guardSteps: number;
  staggerRatio: number;
}

/** 手前から。同じ位置ならボスは後ろ（取り巻きが前に立つ） */
const byFront = (a: EnemyState, b: EnemyState): number =>
  a.x - b.x || Number(a.def.boss) - Number(b.def.boss) || a.id - b.id;

/** 1回の攻撃にかかる倍率など（必殺技・合流ボーナスと起点石の種類・その線の起点） */
interface StrikeMods {
  tech: number;
  bonus: number;
  /** 初撃: この線の起点 */
  origin: string;
  /** The relic on the cell of this gear */
  relic?: RelicId;
  /** The cell of this gear (the charms of its column and row react to it) */
  cell: number;
}

/** 爆弾のダメージ表示用（装備の uid ではない） */
export const BOMB_UID = '__bomb__';

/** 敵の属性の得意・苦手（ダメージ倍率） */
export function resistMult(
  def: { resist?: Partial<Record<string, number>> },
  element?: string,
): number {
  return def.resist?.[element ?? 'physical'] ?? 1;
}

const secToTicks = (s: number): number => Math.round(s * SIM.ticksPerSecond);

/** The enemy the treasure goblin looks like */
const TREASURE_ENEMY = 'goblin';

export class Combat {
  readonly region: RegionDef;
  readonly mode: 'run' | 'dummy';
  /** 装備とゴールドを落とさない（挑戦・エンドレス） */
  private get noLoot(): boolean {
    return !!this.cfg.noLoot || this.region.id === 'endless';
  }

  /** 終了する tick。時間延長で増える（上限 TIME_BONUS.maxRunTime） */
  maxTicks: number;
  /** 出撃時間の時計（交戦中・連鎖中だけ進む。走っているあいだは止まる） */
  clock = 0;
  private chainSerial = 0;
  tick = 0;
  heroX = 0;
  hp: number;
  defense = 0;
  /** 幸運の硬貨の効き目が切れる tick */
  private critUpUntil = -1;
  atb = 0; // 秒（B の待ちが長いときは負から始まる）
  readonly rules: ChainRules;
  readonly luck: LuckRules;
  private readonly guardAll: boolean;
  private readonly layoutRng: Rng;
  /** 今の周回の並び（地域選択・進み具合の表示用） */
  layout: LoopLayout | null = null;
  running = false; // 勇者が走っているか
  loop = 1;
  bossesDefeated = 0;
  /** 次に撃つ単位（units の添字） */
  nextUnitIndex = 0;
  chain: ActiveChain | null = null;
  timeStopUntil = -1;
  ended: EndReason | null = null;
  enemies: EnemyState[] = [];
  drops: ItemInstance[] = [];
  usedConsumables: string[] = [];
  consumables: (string | null)[];
  stats: RunStats = {
    fires: 0,
    maxStep: 0,
    maxDamage: 0,
    totalDamage: 0,
    bossesDefeated: 0,
    timeGained: 0,
    sweeps: 0,
  };

  /** The relics offered now (the run waits until `until`), or null */
  relicOffer: { ids: RelicId[]; until: number } | null = null;
  /** The relic stuck on each cell (cell → relic) */
  readonly relics = new Map<number, RelicId>();
  /** The goblin came already (once per run) */
  private treasureDone = false;

  private readonly rng: Rng;
  private readonly cfg: RunConfig;
  /** Artifact types the player has, plus those dropped in this run (one of each type) */
  private readonly artifactsOwned: Set<string>;
  /** Which board the gear sits on (its trait works in combat) */
  private readonly board: BoardDef;
  /** What the edge charms react to (null: no charms, nothing changes) */
  private readonly charms: CharmContext | null;
  /** Charm drops draw from here, so every other drop stays as it was */
  private readonly charmRng: Rng | null;
  private readonly charmDrops: CharmInstance[] = [];
  /** Techniques known in this run (null: every technique fires as usual) */
  private readonly learned: Set<string> | null;
  private readonly origins: string[];
  /** 1回の発火で撃つ単位（起点は1つずつ。発火順） */
  private readonly units: string[][];
  /** Each origin's chain (the layout does not change during a run) */
  private readonly plans = new Map<string, ChainPlan>();
  private events: CombatEvent[] = [];
  private readonly inputs: RunInput[] = [];
  private nextEnemyId = 1;
  private nextDropId = 1;
  private summonTimer = 0;
  private loopStartX = 0;
  private nextGroup = 1;
  private bossGroup = 0;

  constructor(cfg: RunConfig) {
    this.cfg = cfg;
    this.artifactsOwned = new Set(cfg.ownedArtifacts);
    this.board = getBoard(cfg.loadout.board);
    this.charms = cfg.charms?.some((c) => c !== null)
      ? charmContext(cfg.charms, cfg.loadout, cfg.items)
      : null;
    this.charmRng = cfg.charms ? new Rng((cfg.seed ^ CHARM.rngSalt) >>> 0) : null;
    this.learned = cfg.mastery ? new Set(cfg.mastery.learned) : null;
    if (cfg.mastery) {
      this.stats.rings = {};
      this.stats.sparks = [];
    }
    this.rules = { ...CHAIN_RULES, ...cfg.rules };
    this.luck = { ...LUCK, ...cfg.luck };
    // 不落の城門: バックパックに置いてあれば常に守られる
    this.guardAll = cfg.loadout.cells.some(
      (u) => !!u && !!cfg.items.get(u) && !!getItemDef(cfg.items.get(u)!.defId).guardAll,
    );
    // 敵の並びは戦利品の抽選と別の乱数列にする（拾い方で並びが変わらないように）
    this.layoutRng = new Rng((cfg.seed ^ 0x9e3779b9) >>> 0);
    this.mode = cfg.mode ?? 'run';
    this.rng = new Rng(cfg.seed);
    this.region = getRegion(cfg.regionId);
    this.hp = cfg.hero.maxHp;
    this.maxTicks =
      this.mode === 'dummy'
        ? Number.POSITIVE_INFINITY
        : secToTicks(Math.min(TIME_BONUS.maxRunTime, cfg.hero.runTime ?? SIM.runDuration));
    this.origins = cfg.loadout.originOrder.filter((u) => cfg.loadout.cells.includes(u));
    // Origins fire one at a time, even when their routes sync
    this.units = this.origins.map((o) => [o]);
    for (const p of simulateChain(cfg.loadout, cfg.items).plans) this.plans.set(p.originUid, p);
    for (const [cell, id] of cfg.relics?.stuck ?? []) this.relics.set(cell, id);
    const slots = cfg.consumableSlots ?? CONSUMABLE.baseSlots;
    this.consumables = cfg.loadout.consumables
      .slice(0, slots)
      .map((u) => (cfg.items.has(u) ? u : null));
    if (this.mode === 'dummy') {
      this.consumables = [];
      this.spawnEnemy(
        SCARECROW_ID,
        FIELD.frontStand + FIELD.columnSpacing,
        FIELD.frontStand + FIELD.columnSpacing,
        false,
        0,
      );
    } else {
      this.startLoop();
    }
  }

  // ---- 公開 API ----

  get time(): number {
    return this.tick / SIM.ticksPerSecond;
  }

  get remaining(): number {
    return Math.max(0, (this.maxTicks - this.clock) / SIM.ticksPerSecond);
  }

  private isOrigin(uid: string): boolean {
    const it = this.cfg.items.get(uid);
    return !!it && getItemDef(it.defId).kind === 'origin';
  }

  /** 連鎖中は無防備。ただし起点のあと rules.guardSteps 段目までは守りが残る（next は起点を含む添字） */
  get unguarded(): boolean {
    if (this.guardAll) return false;
    if (this.chain === null) return false;
    // Stacked board (trial): counted in cells, a stack is one
    if (this.cfg.loadout.under) {
      const done = this.chain.plan.steps.slice(0, this.chain.next);
      return firedPieces(done, (u) => this.isOrigin(u)) >= this.chain.guardSteps;
    }
    // 線を出す起点（先頭にまとめて並ぶ）の分だけずらす。ほかの線が届く起点は途中のマス
    const heads = this.chain.plan.steps.findIndex((s) => s.parentIndex >= 0);
    const origins = heads < 0 ? this.chain.plan.steps.length : heads;
    // Rings repeated by 残響の起点石 come last and are not new pieces
    const repeated = this.chain.plan.steps.slice(0, this.chain.next).filter((s) => s.echo).length;
    return this.chain.next - repeated > this.chain.guardSteps + Math.max(1, origins) - 1;
  }

  /** The full gauge: the hero's time, × the board's wait (trial) */
  private get atbFull(): number {
    return this.cfg.hero.atbTime * (this.board.wait ?? 1);
  }

  get atbRatio(): number {
    return Math.max(0, Math.min(1, this.atb / this.atbFull));
  }

  get maxHp(): number {
    return this.cfg.hero.maxHp;
  }

  get reachedLoop(): number {
    return this.bossesDefeated + 1;
  }

  get originOrder(): readonly string[] {
    return this.origins;
  }

  /** 1回の発火で撃つ単位（起点は1つずつ） */
  get fireUnits(): readonly (readonly string[])[] {
    return this.units;
  }

  /** 次に撃つ単位の起点（発火順） */
  get nextUnit(): readonly string[] | null {
    return this.units.length > 0 ? this.units[this.nextUnitIndex % this.units.length]! : null;
  }

  /** 次に撃つ単位の先頭の起点 */
  get nextOriginUid(): string | null {
    return this.nextUnit?.[0] ?? null;
  }

  /** The chain this origin fires (computed once per run) */
  planOf(originUid: string): ChainPlan | undefined {
    return this.plans.get(originUid);
  }

  get timeStopped(): boolean {
    return this.tick < this.timeStopUntil;
  }

  /** 交戦範囲内の生きている敵 */
  engagedEnemies(): EnemyState[] {
    return this.enemies.filter((e) => e.alive && e.x - this.heroX <= HERO.engageRange);
  }

  /** 接敵: 交戦範囲の敵が、勇者の前の立ち位置まで来ている（連鎖はここから撃つ） */
  inContact(): boolean {
    return this.engagedEnemies().some((e) => e.x <= this.heroX + e.standOffset + 0.5);
  }

  get engaged(): boolean {
    return this.engagedEnemies().length > 0;
  }

  drainEvents(): CombatEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** 到達周回 + 現在のボスに与えたHPの割合（バランス検証用） */
  get progress(): number {
    const boss = this.enemies.find((e) => e.alive && e.def.boss);
    const frac = boss ? 1 - boss.hp / boss.maxHp : 0;
    return this.reachedLoop + frac;
  }

  result(): RunResult {
    return {
      usedConsumables: this.usedConsumables.slice(),
      progress: this.progress,
      reason: this.ended ?? 'timeout',
      reachedLoop: this.reachedLoop,
      drops: this.drops.slice(),
      ...(this.cfg.charms ? { charms: this.charmDrops.slice() } : {}),
      stats: { ...this.stats, bossesDefeated: this.bossesDefeated },
      ticks: this.tick,
      inputs: this.inputs.slice(),
    };
  }

  /** 画面なしで最後まで実行（テスト・sim 用） */
  runToEnd(): RunResult {
    while (!this.ended) this.step();
    return this.result();
  }

  /** カカシ用: 連鎖中でなければ次の起点を発火 */
  fireNext(): boolean {
    if (this.chain || this.origins.length === 0 || this.ended) return false;
    this.fire();
    return true;
  }

  useConsumable(slot: number): boolean {
    // Not while the run waits for a relic choice
    if (this.ended || this.relicOffer) return false;
    const uid = this.consumables[slot];
    if (!uid) return false;
    const inst = this.cfg.items.get(uid);
    if (!inst) return false;
    const def = getItemDef(inst.defId);
    const effect = def.effect;
    if (!effect) return false;
    if (effect === 'rally' && (this.chain || this.origins.length === 0)) return false;
    this.consumables[slot] = null;
    this.usedConsumables.push(uid);
    this.inputs.push({ t: this.tick, k: 'use', slot });
    this.emit({ type: 'consumable', tick: this.tick, uid, defId: def.id, effect });
    switch (effect) {
      case 'rally':
        this.atb = this.atbFull;
        this.fire();
        break;
      case 'timeStop':
        this.timeStopUntil = this.tick + secToTicks(CONSUMABLE.timeStopDuration);
        break;
      case 'oilAll':
        for (const e of this.onScreen()) this.applyStatus(e, 'oil');
        break;
      case 'wetAll':
        for (const e of this.onScreen()) this.applyStatus(e, 'wet');
        break;
      case 'addTime':
        this.addTime(CONSUMABLE.timeSandSeconds, 'consumable');
        break;
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + CONSUMABLE.healAmount);
        break;
      case 'bombAll': {
        const dmg = CONSUMABLE.bombDamage * this.cfg.hero.attackMult;
        for (const e of this.onScreen()) {
          const nullified = this.guardStops(e, dmg);
          this.emit({
            type: 'hit',
            tick: this.tick,
            enemyId: e.id,
            itemUid: BOMB_UID,
            damage: nullified ? 0 : dmg,
            combo: null,
            nullified,
            crit: false,
            step: 0,
          });
          if (nullified) continue;
          e.hp -= dmg;
          this.stats.totalDamage += dmg;
          if (e.hp <= 0) this.killEnemy(e);
        }
        break;
      }
      case 'critUp':
        this.critUpUntil = this.tick + secToTicks(CONSUMABLE.critUpDuration);
        break;
    }
    return true;
  }

  /** 固定ステップ1つ分進める */
  step(): void {
    if (this.ended) return;
    const dt = SIM.fixedStep;
    // The run waits while a beaten boss's relics are offered
    if (this.relicOffer) {
      if (this.tick < this.relicOffer.until) {
        this.tick++;
        return;
      }
      this.closeRelicOffer();
    }

    // 1. 連鎖の進行
    if (this.chain) this.advanceChain();

    // 2. ATB と発火
    if (!this.chain) {
      this.atb = Math.min(this.atbFull, this.atb + dt);
      if (this.mode === 'run' && this.atb >= this.atbFull && this.inContact()) this.fire();
    }

    // 3. 状態の失効と、毒のダメージ
    for (const e of this.enemies) {
      for (const [s, until] of e.statuses) if (this.tick >= until) e.statuses.delete(s);
      if (!e.statuses.has('poison')) {
        e.poisonDps = 0;
        e.poisonLayers = 0;
      } else if (e.alive && e.poisonDps > 0) this.tickPoison(e, dt);
    }

    // 4. 敵の行動
    if (this.mode === 'run') {
      const stopped = this.timeStopped;
      this.repack();
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dist = e.x - this.heroX;
        if (!e.aggro && dist <= FIELD.aggroRange) {
          for (const o of this.enemies) if (o.group === e.group) o.aggro = true;
        }
        if (stopped || !e.aggro) continue;
        const stand = this.heroX + e.standOffset;
        if (e.x > stand) e.x = Math.max(stand, e.x - FIELD.enemySpeed * dt);
        if (e.treasure) {
          this.treasureWaits(e);
          continue;
        }
        if (this.canAttack(e)) {
          e.attackTimer += dt * (this.tick < e.slowUntil ? LIGHT_DARK.sealSlow : 1);
          if (e.attackTimer >= e.interval) {
            e.attackTimer -= e.interval;
            this.damageHero(e);
            if (this.ended) return;
          }
        }
      }
      this.updateSummons(dt, stopped);
      this.updateBossAbilities(dt, stopped);
    }

    // 5. 勇者の移動（連鎖中は立ち止まって攻撃する）
    this.running = this.mode === 'run' && !this.chain && !this.engaged;
    if (this.running) this.heroX += HERO.speed * dt;

    this.tick++;
    // 走っているあいだ（会敵するまで）は出撃時間を減らさない
    if (!this.running) this.clock++;
    if (this.clock >= this.maxTicks) this.end('timeout');
  }

  // ---- 内部 ----

  private emit(ev: CombatEvent): void {
    this.events.push(ev);
  }

  /** 力尽きたあとの再開（広告の報酬）。1ランに1回、HP全回復＋出撃時間 seconds 秒 */
  revive(seconds: number): boolean {
    if (this.mode !== 'run' || this.ended !== 'dead' || this.revived) return false;
    this.ended = null;
    this.revived = true;
    this.inputs.push({ t: this.tick, k: 'revive', s: seconds });
    this.hp = this.maxHp;
    this.maxTicks += secToTicks(seconds);
    this.emit({ type: 'revive', tick: this.tick });
    return true;
  }

  /** このランで再開を使ったか */
  revived = false;

  /** Stick an offered relic on a cell (false: not offered, or the cell won't take it) */
  placeRelic(id: RelicId, cell: number): boolean {
    const offer = this.relicOffer;
    if (!offer || this.ended || !offer.ids.includes(id)) return false;
    if (!canStickRelic(this.cfg.loadout, this.cfg.items, this.relics, id, cell)) return false;
    this.inputs.push({ t: this.tick, k: 'relic', id, cell });
    this.relics.set(cell, id);
    this.relicOffer = null;
    this.emit({ type: 'relicStuck', tick: this.tick, id, cell });
    return true;
  }

  /** Go on without a relic */
  skipRelic(): boolean {
    if (!this.relicOffer || this.ended) return false;
    this.inputs.push({ t: this.tick, k: 'relicSkip' });
    this.closeRelicOffer();
    return true;
  }

  /** プレイヤーの撤退。ここまでの戦利品を持ち帰って終わる */
  retreat(): void {
    if (this.mode !== 'run' || this.ended) return;
    this.inputs.push({ t: this.tick, k: 'retreat' });
    this.end('retreat');
  }

  private end(reason: EndReason): void {
    if (this.ended) return;
    this.ended = reason;
    this.stats.bossesDefeated = this.bossesDefeated;
    this.emit({ type: 'runEnd', tick: this.tick, reason, reachedLoop: this.reachedLoop });
  }

  private startLoop(): void {
    const layout = rollLoop(this.region, this.loop, this.layoutRng, this.layout?.bossId);
    this.layout = layout;
    const bossId = layout.bossId;
    this.emit({ type: 'loopStart', tick: this.tick, loop: this.loop, bossId });
    const eliteChance = Math.min(
      this.luck.eliteChanceMax,
      this.luck.eliteChance + this.luck.eliteChancePerLoop * (this.loop - 1),
    );
    // Once per run, a lone goblin may take one group's place
    let treasureAt = -1;
    if (
      this.cfg.treasure &&
      this.mode === 'run' &&
      !this.treasureDone &&
      layout.groups.length > 0 &&
      this.layoutRng.next() < this.cfg.treasure.chance
    ) {
      treasureAt = this.layoutRng.int(layout.groups.length);
      this.treasureDone = true;
    }
    for (const [gi, g] of layout.groups.entries()) {
      const group = this.nextGroup++;
      if (gi === treasureAt) {
        this.spawnTreasure(this.loopStartX + g.x, group);
        continue;
      }
      // 群れに1体まで精鋭が混ざる（後列の呪術師も対象）
      const eliteAt =
        this.mode === 'run' && this.layoutRng.next() < eliteChance
          ? this.layoutRng.int(g.enemies.length)
          : -1;
      const elite =
        eliteAt >= 0
          ? this.layoutRng.weighted(
              (Object.keys(ELITES) as EliteId[]).map(
                (k) => [k, ELITES[k].weight] as [EliteId, number],
              ),
            )
          : null;
      // 前後2列×列。後列（呪術師）は最後の列（rollLoop で並べ済み）
      g.enemies.forEach((id, i) => {
        const col = Math.floor(i / FIELD.rowsPerColumn);
        const row = i % FIELD.rowsPerColumn;
        const offset = FIELD.columnSpacing * col;
        this.spawnEnemy(
          id,
          this.loopStartX + g.x + offset,
          FIELD.frontStand + offset,
          false,
          group,
          row,
          i === eliteAt ? elite : null,
        );
      });
    }
    this.bossGroup = this.nextGroup++;
    this.spawnEnemy(bossId, this.loopStartX + layout.bossX, FIELD.bossStand, false, this.bossGroup);
    this.summonTimer = 0;
  }

  private spawnEnemy(
    defId: string,
    x: number,
    standOffset: number,
    escort: boolean,
    group: number,
    row = 0,
    elite: EliteId | null = null,
  ): EnemyState {
    const def = getEnemyDef(defId);
    const scaleLoop = this.loop - 1;
    const el = elite ? ELITES[elite] : null;
    // 地域の強さ × 周回の伸び × 精鋭
    const maxHp = def.hp * this.region.power.hp * ipow(LOOP_SCALING.hp, scaleLoop) * (el?.hp ?? 1);
    const e: EnemyState = {
      id: this.nextEnemyId++,
      defId,
      def,
      x,
      hp: maxHp,
      maxHp,
      atk: def.atk * this.region.power.atk * ipow(LOOP_SCALING.atk, scaleLoop) * (el?.atk ?? 1),
      interval: def.interval * (el?.interval ?? 1),
      // 攻撃のタイミングはシードで少しずらす（同じシードなら同じ結果）
      attackTimer: def.boss ? 0 : this.rng.next() * def.interval * FIELD.attackPhaseJitter,
      alive: true,
      statuses: new Map(),
      standOffset,
      aggro: escort,
      escort,
      loop: this.loop,
      group,
      row,
      killedBy: -1,
      elite,
      enraged: false,
      poisonDps: 0,
      poisonLayers: 0,
      poisonAcc: 0,
      slowUntil: -1,
      guardBrokenUntil: -1,
      treasure: false,
      fleeLeft: 0,
    };
    this.enemies.push(e);
    this.emit({ type: 'spawn', tick: this.tick, enemyId: e.id, defId, x, escort, elite });
    return e;
  }

  /** The lone goblin, much tougher than a goblin of this loop */
  private spawnTreasure(x: number, group: number): void {
    const e = this.spawnEnemy(TREASURE_ENEMY, x, FIELD.frontStand, false, group);
    e.treasure = true;
    e.maxHp *= TREASURE.hpMult;
    e.hp = e.maxHp;
    e.fleeLeft = secToTicks(TREASURE.fleeSeconds);
    this.emit({ type: 'treasure', tick: this.tick, enemyId: e.id, phase: 'appear' });
  }

  /** At the hero, the goblin's time runs out, and then it runs off */
  private treasureWaits(e: EnemyState): void {
    if (e.x > this.heroX + e.standOffset + 0.5) return;
    e.fleeLeft--;
    if (e.fleeLeft > 0) return;
    e.alive = false;
    this.emit({
      type: 'enemyDeath',
      tick: this.tick,
      enemyId: e.id,
      defId: e.defId,
      boss: false,
      fled: true,
    });
    this.emit({ type: 'treasure', tick: this.tick, enemyId: e.id, phase: 'fled' });
  }

  /** A beaten boss offers relics; the run waits for a choice */
  private openRelicOffer(): void {
    const ids = rollRelicOffer(this.rng);
    this.relicOffer = { ids, until: this.tick + secToTicks(RELIC.pickSeconds) };
    this.emit({ type: 'relicOffer', tick: this.tick, ids });
  }

  private closeRelicOffer(): void {
    this.relicOffer = null;
    this.emit({ type: 'relicSkipped', tick: this.tick });
  }

  /** A cell with a 呼び戻しの笛 or a 守りの札 rang */
  private relicRing(c: ActiveChain, relic: RelicId | undefined): void {
    if (relic === 'whistle') c.recall = true;
    if (relic === 'ward') this.defense = Math.min(this.maxHp, this.defense + RELIC.wardDefense);
  }

  /** The step is the last ring of its cell (always, on an ordinary board) */
  private topOfCell(s: ChainStep): boolean {
    return (
      s.ring === undefined ||
      s.ring === cellRings(this.cfg.loadout, this.cfg.items, s.cell).length - 1
    );
  }

  private currentBoss(): EnemyState | undefined {
    return this.enemies.find((e) => e.alive && e.def.boss);
  }

  private updateSummons(dt: number, stopped: boolean): void {
    const boss = this.currentBoss();
    if (!boss || boss.def.ability !== 'summonEscorts' || !boss.aggro || stopped) return;
    const escortId = boss.def.escortId ?? 'goblin';
    const count = boss.def.escortCount ?? 4;
    const interval = boss.def.summonInterval ?? 4;
    const escorts = this.enemies.filter((e) => e.alive && e.escort);
    if (escorts.length >= count) {
      this.summonTimer = 0;
      return;
    }
    const firstWave = this.enemies.every((e) => !e.escort);
    // 立ち位置は repack() が2列×前後2段に詰める
    const summon = (): void => {
      this.spawnEnemy(
        escortId,
        boss.x - FIELD.columnSpacing,
        FIELD.frontStand,
        true,
        this.bossGroup,
      );
    };
    if (firstWave) {
      for (let i = 0; i < count; i++) summon();
      return;
    }
    this.summonTimer += dt;
    if (this.summonTimer >= interval) {
      this.summonTimer -= interval;
      summon();
    }
  }

  /** 呪術王の回復、ゴーレムの激昂 */
  private updateBossAbilities(dt: number, stopped: boolean): void {
    const boss = this.currentBoss();
    if (!boss || !boss.aggro || stopped) return;
    if (boss.def.ability === 'regen' && boss.hp < boss.maxHp) {
      boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * BOSS.regenPerSec * dt);
    }
    if (boss.def.ability === 'enrage' && !boss.enraged && boss.hp < boss.maxHp * BOSS.enrageAt) {
      boss.enraged = true;
      boss.interval *= BOSS.enrageInterval;
      boss.atk *= BOSS.enrageAtk;
      this.emit({ type: 'enrage', tick: this.tick, enemyId: boss.id });
    }
  }

  /**
   * 群れの立ち位置を詰め直す: 生きている順に前後2列×横80px。
   * 前の列が倒れると後ろが前へ出る。後列（呪術師）は最後の列。ボス本人は bossStand のまま。
   */
  private repack(): void {
    const groups = new Map<number, EnemyState[]>();
    for (const e of this.enemies) {
      if (!e.alive || e.def.boss) continue;
      let g = groups.get(e.group);
      if (!g) groups.set(e.group, (g = []));
      g.push(e);
    }
    // 取り巻きがいないボスは目の前まで出てくる
    const escortsAlive = this.enemies.some((e) => e.alive && e.escort);
    for (const e of this.enemies) {
      if (e.alive && e.def.boss)
        e.standOffset = escortsAlive ? FIELD.bossStand : FIELD.bossSoloStand;
    }
    for (const members of groups.values()) {
      members.sort((a, b) => Number(a.def.backRow) - Number(b.def.backRow) || a.id - b.id);
      members.forEach((e, i) => {
        e.standOffset =
          FIELD.frontStand + FIELD.columnSpacing * Math.floor(i / FIELD.rowsPerColumn);
        e.row = i % FIELD.rowsPerColumn;
      });
    }
  }

  /** 近接の雑魚は最前列からだけ攻撃する。後列（呪術師）とボスは交戦範囲のどこからでも */
  private canAttack(e: EnemyState): boolean {
    const dist = e.x - this.heroX;
    if (dist > HERO.engageRange) return false;
    if (e.def.boss || e.def.backRow) return true;
    return dist <= FIELD.meleeReach;
  }

  private onScreen(): EnemyState[] {
    return this.enemies.filter((e) => e.alive && e.x - this.heroX <= FIELD.viewRange);
  }

  /** 単体で狙える順（前列優先、手前から） */
  private targetOrder(): EnemyState[] {
    const engaged = this.engagedEnemies().sort(byFront);
    const front = engaged.filter((e) => !e.def.backRow);
    return front.length > 0 ? front : engaged;
  }

  private fire(): void {
    const unit = this.nextUnit;
    if (!unit) return;
    const originUid = unit[0]!;
    const originIndex = this.nextUnitIndex % this.units.length;
    this.nextUnitIndex = (this.nextUnitIndex + 1) % this.units.length;
    const plan = this.plans.get(originUid)!;
    const aim = this.targetOrder()[0] ?? null;
    this.chain = {
      plan,
      startTick: this.tick,
      next: 0,
      exec: [],
      totalDamage: 0,
      durationTicks: secToTicks(plan.duration),
      cut: false,
      staggered: false,
      taken: 0,
      recall: false,
      charmM: 1,
      ...flowRules(lineEffects(this.cfg.items, plan.originUids), this.rules),
    };
    this.atb = 0;
    this.chainSerial++;
    this.stats.fires++;
    this.emit({
      type: 'chainStart',
      tick: this.tick,
      originUid,
      originIndex,
      plan,
      aimId: aim?.id ?? null,
    });
    // 起点そのもの（t=0）を即座に処理
    this.advanceChain();
  }

  private advanceChain(): void {
    const c = this.chain!;
    const elapsed = this.tick - c.startTick;
    if (c.cut) {
      this.finishChain(c, elapsed);
      return;
    }
    while (c.next < c.plan.steps.length && secToTicks(c.plan.steps[c.next]!.t) <= elapsed) {
      this.executeStep(c, c.next);
      if (c.cut) break;
      c.next++;
    }
    if (c.cut || (c.next >= c.plan.steps.length && elapsed >= c.durationTicks))
      this.finishChain(c, elapsed);
  }

  /** 連鎖の終了。打ち切ったときは、それまでに通った防御装備の分だけ防御値に加える */
  private finishChain(c: ActiveChain, elapsed: number): void {
    const passed = c.cut ? c.plan.steps.slice(0, c.next) : c.plan.steps;
    const defenseSteps = passed.filter(
      (s) => getItemDef(this.cfg.items.get(s.uid)!.defId).kind === 'defense',
    );
    // A cut chain counts only the defense items it reached (盾の起点石 included, per step)
    const gain = c.cut
      ? defenseSteps.reduce(
          (sum, s) => sum + defenseValue(this.cfg.items.get(s.uid)!) * (s.stackMult ?? 1),
          0,
        )
      : c.plan.defenseGain;
    // 癒し: 通った防御装備の分だけ回復
    const mend = defenseSteps.reduce(
      (sum, s) => sum + affixValue(this.cfg.items.get(s.uid)!, 'mend'),
      0,
    );
    if (mend > 0) this.hp = Math.min(this.maxHp, this.hp + mend);
    this.defense = Math.min(this.maxHp, this.defense + gain);
    this.emit({
      type: 'chainEnd',
      tick: this.tick,
      originUid: c.plan.originUid,
      defenseGain: gain,
      defenseCells: defenseSteps.map((s) => s.cell),
      totalDamage: c.totalDamage,
      duration: c.cut ? elapsed / SIM.ticksPerSecond : c.plan.duration,
      cut: c.cut,
      staggered: c.staggered,
    });
    this.chain = null;
    // B: 次の発火までの待ちは、撃てた段数に比例（atb を負から始めることで待ちを伸ばす）
    const r = this.rules;
    if (r.atbPerStep) {
      // 起点（先頭）は数えない
      // 起点石は数えない（線を出した起点も、途中で通しただけの起点も）
      // A stack counts once (stacked board, trial)
      const fired = c.plan.steps.slice(0, c.cut ? c.next : c.plan.steps.length);
      const steps = firedPieces(fired, (u) => this.isOrigin(u));
      // 速攻: この発火の起点の値
      const quick =
        Math.max(
          0,
          ...c.plan.originUids.map((u) => {
            const o = this.cfg.items.get(u);
            return o ? affixValue(o, 'quick') : 0;
          }),
        ) / 100;
      const factor =
        Math.min(r.atbMaxFactor, Math.max(r.atbMinFactor, steps / r.atbRefSteps)) * (1 - quick);
      this.atb = this.atbFull * (1 - factor);
    } else {
      this.atb = 0;
    }
    // A 呼び戻しの笛 on the way cuts the wait before the next chain
    if (c.recall) {
      const full = this.atbFull;
      this.atb = full - (full - this.atb) * RELIC.whistleWait;
    }
  }

  private executeStep(c: ActiveChain, index: number): void {
    const s = c.plan.steps[index]!;
    const inst = this.cfg.items.get(s.uid)!;
    const def = getItemDef(inst.defId);
    const parent = s.parentIndex >= 0 ? c.exec[s.parentIndex]! : null;
    const fromCell = s.parentIndex >= 0 ? c.plan.steps[s.parentIndex]!.cell : null;
    // The relic on this cell works on the gear in it
    const relic = this.relics.size > 0 ? this.relics.get(s.cell) : undefined;

    if (def.kind !== 'attack') {
      // 起点・防御装備: 段数を数えず、親の段数と狙いを引き継ぐ
      const aim = parent ? parent.aim : (this.targetOrder()[0]?.id ?? null);
      const eff = parent ? parent.eff : 0;
      c.exec[index] = { eff, aim, reset: parent?.reset ?? false };
      this.relicRing(c, relic);
      this.emit({
        type: 'step',
        tick: this.tick,
        index,
        uid: s.uid,
        cell: s.cell,
        fromCell,
        step: null,
        mult: 1,
        whiff: false,
      });
      return;
    }

    // 狙いが倒れていたら最も手前の敵へ移し、その枝の段数は1に戻る
    let aim =
      parent?.aim != null ? this.enemies.find((e) => e.id === parent.aim && e.alive) : undefined;
    if (!aim) aim = this.targetOrder()[0];
    // 狙える敵がもういない: 残りの段は空振りせず、連鎖を打ち切る
    if (!aim) {
      c.cut = true;
      return;
    }
    const aimId = aim.id;
    // The branch keeps counting while it aims at the same enemy (with the trial rule, across kills too)
    const counts = parent && (parent.aim === aimId || this.rules.keepCountOnKill);
    // 残響の起点石: a repeated ring strikes with the count its original struck with
    const eff = s.echo ? (parent?.hit ?? 1) : counts ? parent.eff + 1 : 1;
    this.relicRing(c, relic);
    // 疾風の羽: このあとに続く装備の段数を多く数える（子へ渡す段数だけ増やす）
    // 加速の羽 does the same, once per cell (from the top of a stack)
    const feather = relic === 'feather' && this.topOfCell(s) ? RELIC.featherSteps : 0;
    c.exec[index] = {
      eff: eff + (def.stepBoost ?? 0) + feather,
      aim: aimId,
      reset: eff < (s.step ?? 0),
      hit: eff,
    };
    const mult = chainMultiplier(eff, c.plan.multCap);
    if (!s.echo && eff > this.stats.maxStep) this.stats.maxStep = eff;
    // Every ring of attack gear grows its element (a repeated ring is the same ring)
    const rings = this.stats.rings;
    if (rings && !s.echo) {
      const el = def.element ?? 'physical';
      rings[el] = (rings[el] ?? 0) + 1;
    }
    this.emit({
      type: 'step',
      tick: this.tick,
      index,
      uid: s.uid,
      cell: s.cell,
      fromCell,
      step: eff,
      mult,
      whiff: false,
    });

    // 会心は1回の攻撃ごとに抽選（範囲攻撃なら当たった全員が会心）。双剣は2回それぞれ抽選
    const critChance =
      this.luck.critChance +
      (def.critBonus ?? 0) +
      affixValue(inst, 'keen') / 100 +
      (this.tick < this.critUpUntil ? CONSUMABLE.critUpChance : 0) +
      (relic === 'eye' ? RELIC.eyeCrit : 0);
    // 必殺技: 決まった並びの3つ目。止めずに、この一撃だけ強くする
    const tech = this.knownTech(s.tech, aim.id, s.uid);
    const techMult = tech ? TECHNIQUE_MULT : 1;
    if (tech)
      this.emit({ type: 'technique', tick: this.tick, id: tech, enemyId: aim.id, uid: s.uid });
    const mods: StrikeMods = {
      tech: techMult,
      // 起点石の種類のダメージと、重ねの位置
      bonus: (s.line?.damage ?? 1) * (s.stackMult ?? 1),
      origin: lineOrigin(c.plan, index),
      ...(relic ? { relic } : {}),
      cell: s.cell,
    };
    const strikes = (def.hits ?? 1) * (relic === 'bell' ? 2 : 1);
    for (let h = 0; h < strikes; h++) this.strike(c, s.uid, inst, def, eff, aim, critChance, mods);
    // After the step's own strikes, so they still use the multiplier before it. A ring repeated by
    // 残響の起点石 is the same cell again: the cell's own charm events are not counted twice
    if (this.charms && !s.echo && cellTop(s, this.charms)) this.charmEvent(c, 'cell', s.cell);
    if (tech) this.charmEvent(c, 'tech', s.cell);
    if (this.charms && !s.echo && stackTop(s, this.charms)) this.charmEvent(c, 'stackTop', s.cell);
  }

  /** An event in a cell raises the chain's combo multiplier (no charms: nothing) */
  private charmEvent(c: ActiveChain, trigger: CharmTrigger, cell: number, weight = 1): void {
    if (!this.charms) return;
    const r = applyCharmEvent(c.charmM, trigger, cell, this.charms, weight);
    c.charmM = r.m;
    for (const f of r.fired) this.emit({ type: 'charm', tick: this.tick, ...f });
  }

  /**
   * The technique this step fires. One not learned yet fires only if it sparks
   * now (chance by its element's level), and is learned from then on
   */
  private knownTech(id: string | undefined, enemyId: number, uid: string): string | undefined {
    if (!id || !this.learned || this.learned.has(id)) return id;
    // The scarecrow tries the board as it is: nothing sparks (or is learned) there
    if (this.mode === 'dummy') return undefined;
    const el = getTechnique(id)?.element ?? 'physical';
    const p = sparkChance(this.cfg.mastery?.levels[el] ?? 0);
    if (p <= 0 || this.rng.next() >= p) return undefined;
    this.learned.add(id);
    this.stats.sparks?.push(id);
    this.emit({ type: 'spark', tick: this.tick, id, enemyId, uid });
    return id;
  }

  /** 1回の攻撃（双剣は1段で2回呼ぶ）。1回目で狙いが倒れたら手前の敵へ */
  private strike(
    c: ActiveChain,
    uid: string,
    inst: ItemInstance,
    def: ItemDef,
    eff: number,
    aim: EnemyState,
    critChance: number,
    mods: StrikeMods,
  ): void {
    if (!aim.alive) {
      const next = this.targetOrder()[0];
      if (!next) return;
      aim = next;
    }
    const crit = (def.atk ?? 0) > 0 && this.rng.next() < critChance;
    const aimCombo = findCombo(def.element, aim.statuses);
    const baseArea = effectiveArea(def.area ?? 'single', aimCombo);
    // 薙ぎ払いの紋 widens a single or splash attack, 貫きの矢じり pierces further
    const area = mods.relic === 'sweep' && baseArea !== 'all' ? 'sweep' : baseArea;
    const pierce = (def.pierce ?? 0) + (mods.relic === 'pierce' ? RELIC.pierce : 0);
    const targets = this.resolveTargets(aim, area, pierce);
    // The whole attack uses the multiplier as it was when the attack began
    const charmM = c.charmM;
    let landed = false;
    // The strongest combo this attack made (0: none)
    let comboW = 0;
    for (const t of targets) {
      const statused = t.statuses.size > 0;
      const combo = findCombo(def.element, t.statuses);
      if (combo) {
        comboW = Math.max(comboW, comboWeight(combo.name));
        t.statuses.delete(combo.status);
        this.emit({
          type: 'combo',
          tick: this.tick,
          enemyId: t.id,
          name: combo.name,
          label: combo.label,
        });
        this.comboEffect(t, combo.name);
      }
      const base = computeDamage({
        atk: def.atk ?? 0,
        rarity: inst.rarity,
        step: eff,
        comboMult: combo?.mult ?? (t.statuses.size > 0 ? STATUS.exposedMult : 1),
        upgradeMult: this.cfg.hero.attackMult,
        area: def.area === 'all' ? 'all' : undefined,
        multCap: c.plan.multCap,
      });
      const v = this.luck.damageVariance;
      const roll = v > 0 ? 1 + (this.rng.next() * 2 - 1) * v : 1;
      const raw =
        Math.round(
          base *
            roll *
            (crit ? this.luck.critMult : 1) *
            mods.tech *
            mods.bonus *
            resistMult(t.def, def.element) *
            this.regionResist(def.element) *
            this.affixMult(c, inst, eff, t, statused, mods.origin) *
            this.masteryMult(def) *
            boardDamageMult(this.board, def.element) *
            (mods.relic === 'fist' ? RELIC.fistMult : 1) *
            charmM *
            100,
        ) / 100;
      if (raw > 0) {
        landed = true;
        const nullified = this.guardStops(t, raw);
        const dmg = nullified ? 0 : raw;
        this.emit({
          type: 'hit',
          tick: this.tick,
          enemyId: t.id,
          itemUid: uid,
          damage: dmg,
          combo: combo?.name ?? null,
          nullified,
          crit,
          step: eff,
        });
        if (dmg > 0) {
          t.hp -= dmg;
          c.totalDamage += dmg;
          this.stats.totalDamage += dmg;
          if (dmg > this.stats.maxDamage) this.stats.maxDamage = dmg;
          // 吸血の牙
          if (mods.relic === 'fang') this.hp = Math.min(this.maxHp, this.hp + dmg * RELIC.fangHeal);
          // 吸血: 与えた分の一部を回復
          if (def.lifesteal) this.hp = Math.min(this.maxHp, this.hp + dmg * def.lifesteal);
          // 毒: この一撃の一部を、毎秒のダメージにする（強い方を残す）
          if (def.applies === 'poison') {
            t.poisonDps = Math.max(t.poisonDps, dmg * POISON.dpsRatio);
            t.poisonLayers = Math.max(1, t.poisonLayers);
          }
        }
      }
      if (def.applies && t.hp > 0) this.applyStatus(t, def.applies);
      if (def.appliesAll && t.hp > 0)
        for (const st of ['wet', 'oil', 'frozen'] as const) this.applyStatus(t, st);
      // 風: 毒の敵に毒を重ねる。重ね切った敵なら毒爆
      if (def.element === 'wind' && t.hp > 0 && this.windOnPoison(c, t, uid, eff))
        comboW = Math.max(comboW, comboWeight(POISON.burstName));
      if (t.hp <= 0 && t.alive) {
        this.killEnemy(t, mods.relic === 'claw');
        // とどめ counts every enemy this attack beats
        this.charmEvent(c, 'kill', mods.cell);
      }
    }
    // Once per attack, however many enemies it reached
    if (landed && crit) this.charmEvent(c, 'crit', mods.cell);
    if (comboW > 0) this.charmEvent(c, 'combo', mods.cell, comboW);
  }

  /** The region's resistance to this element (not on the scarecrow, which only shows numbers) */
  private regionResist(element: Element | undefined): number {
    if (this.mode === 'dummy') return 1;
    return this.region.resist?.[element ?? 'physical'] ?? 1;
  }

  /** The element's level adds damage to its gear */
  private masteryMult(def: ItemDef): number {
    const levels = this.cfg.mastery?.levels;
    if (!levels) return 1;
    return 1 + (levels[def.element ?? 'physical'] ?? 0) * MASTERY.dmgPerLevel;
  }

  /** 追加効果によるダメージ倍率（装備の分と、起点の「初撃」） */
  private affixMult(
    _c: ActiveChain,
    inst: ItemInstance,
    eff: number,
    t: EnemyState,
    statused: boolean,
    originUid: string,
  ): number {
    let m = 1 + affixValue(inst, 'sharp') / 100;
    if (eff <= 3) m *= 1 + affixValue(inst, 'vanguard') / 100;
    if (eff >= 6) m *= 1 + affixValue(inst, 'finisher') / 100;
    if (statused) m *= 1 + affixValue(inst, 'exploit') / 100;
    if (t.def.boss)
      m *= (1 + affixValue(inst, 'slayer') / 100) * (getItemDef(inst.defId).bossMult ?? 1);
    // 初撃: この発火の起点の効果
    if (eff === 1) {
      const origin = this.cfg.items.get(originUid);
      if (origin) m *= 1 + affixValue(origin, 'spark') / 100;
    }
    return m;
  }

  private resolveTargets(aim: EnemyState, area: Area, pierce: number): EnemyState[] {
    switch (area) {
      case 'single': {
        if (pierce <= 0) return [aim];
        const order = this.targetOrder();
        const i = order.indexOf(aim);
        const behind = order.filter((e, j) => j > i && e !== aim).slice(0, pierce);
        return [aim, ...behind];
      }
      case 'sweep':
        return this.engagedEnemies().sort(byFront);
      case 'splash':
        return this.enemies
          .filter((e) => e.alive && Math.abs(e.x - aim.x) <= AREA.splashRadius)
          .sort((a, b) => (a === aim ? -1 : b === aim ? 1 : byFront(a, b)));
      case 'all':
        return this.onScreen().sort(byFront);
    }
  }

  /** 毒: 毎秒ダメージを少しずつ与え、一定の間隔でまとめて表示する */
  private tickPoison(e: EnemyState, dt: number): void {
    const dps = e.poisonDps * Math.max(1, e.poisonLayers);
    const d = dps * dt;
    e.hp -= d;
    e.poisonAcc += d;
    this.stats.totalDamage += d;
    const show = e.poisonAcc >= dps * POISON.tickEvery || e.hp <= 0;
    if (show) {
      this.emit({
        type: 'hit',
        tick: this.tick,
        enemyId: e.id,
        itemUid: '',
        damage: Math.round(e.poisonAcc * 100) / 100,
        combo: null,
        nullified: false,
        crit: false,
        step: 0,
        dot: true,
      });
      e.poisonAcc = 0;
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  /** 一撃○○未満を無効にする敵か（粉砕を受けたあとしばらくは効かない） */
  private guardStops(e: EnemyState, dmg: number): boolean {
    return (
      e.def.ability === 'damageThreshold' &&
      this.tick >= e.guardBrokenUntil &&
      dmg < (e.def.threshold ?? BOSS.ironKnightThreshold)
    );
  }

  /** コンボの追加効果（浄化は回復、封印は攻撃を遅く、粉砕は守りを崩す） */
  private comboEffect(t: EnemyState, name: string): void {
    if (name === 'purify')
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * LIGHT_DARK.purifyHeal);
    else if (name === 'seal') t.slowUntil = this.tick + secToTicks(LIGHT_DARK.sealSeconds);
    else if (name === 'shatter' && t.def.ability === 'damageThreshold')
      t.guardBrokenUntil = this.tick + secToTicks(BOSS.guardBreakSeconds);
  }

  /**
   * 風が毒の敵に当たった: 毒を1重ふやして時間を延ばす。重ね切っていたら、残りの毒をまとめて与える。
   * Returns true when it burst (毒爆)
   */
  private windOnPoison(c: ActiveChain, t: EnemyState, uid: string, eff: number): boolean {
    const until = t.statuses.get('poison');
    if (until === undefined || t.poisonDps <= 0) return false;
    if (t.poisonLayers < POISON.maxLayers) {
      t.poisonLayers++;
      this.applyStatus(t, 'poison');
      return false;
    }
    const left = Math.max(0, until - this.tick) / SIM.ticksPerSecond;
    const dmg = Math.round(t.poisonDps * t.poisonLayers * left * POISON.burstMult * 100) / 100;
    t.statuses.delete('poison');
    t.poisonDps = 0;
    t.poisonLayers = 0;
    this.emit({
      type: 'combo',
      tick: this.tick,
      enemyId: t.id,
      name: POISON.burstName,
      label: POISON.burstLabel,
    });
    if (dmg <= 0) return true;
    this.emit({
      type: 'hit',
      tick: this.tick,
      enemyId: t.id,
      itemUid: uid,
      damage: dmg,
      combo: POISON.burstName,
      nullified: false,
      crit: false,
      step: eff,
    });
    t.hp -= dmg;
    c.totalDamage += dmg;
    this.stats.totalDamage += dmg;
    if (dmg > this.stats.maxDamage) this.stats.maxDamage = dmg;
    return true;
  }

  private applyStatus(e: EnemyState, status: Status): void {
    e.statuses.set(status, this.tick + secToTicks(STATUS.duration));
    this.emit({ type: 'statusApplied', tick: this.tick, enemyId: e.id, status });
  }

  /** sureDrop: beaten by gear with a 金の爪 (trial), so it always drops */
  private killEnemy(e: EnemyState, sureDrop = false): void {
    if (!e.alive) return;
    e.alive = false;
    e.hp = 0;
    e.killedBy = this.chain ? this.chainSerial : -1;
    this.emit({
      type: 'enemyDeath',
      tick: this.tick,
      enemyId: e.id,
      defId: e.defId,
      boss: e.def.boss,
      fled: false,
    });
    // ゴールド: 地域ごとの1体あたり（ボスは多め）。お供からは出ない
    if (!e.escort && this.mode === 'run' && !this.cfg.demo && !this.noLoot)
      this.stats.gold =
        (this.stats.gold ?? 0) +
        this.region.goldPerKill *
          (e.def.boss ? PROGRESS.bossGold : e.treasure ? TREASURE.goldKills : 1);
    if (e.treasure)
      this.emit({ type: 'treasure', tick: this.tick, enemyId: e.id, phase: 'caught' });
    // エンドレスは装備を落とさない
    if (!e.escort && this.mode === 'run' && !this.cfg.demo && !this.noLoot) {
      const roll = this.rng.next();
      // The first own run never ends empty-handed (the roll is still drawn, as in any run)
      const promised = !!this.cfg.firstRun && this.drops.length === 0;
      if (roll < e.def.dropRate || e.elite === 'golden' || promised || sureDrop || e.treasure) {
        const count = e.def.boss
          ? LOOT.bossDrops
          : e.treasure
            ? TREASURE.drops
            : e.elite
              ? ELITES[e.elite].drops
              : 1;
        const rareOrBetter = e.def.boss || e.elite === 'golden' || e.treasure;
        for (let k = 0; k < count; k++) {
          const item = rollLoot(
            this.rng,
            e.loop,
            `drop-${this.nextDropId++}`,
            rareOrBetter,
            this.region.loot,
            promised,
            // The first of the goblin's drops is epic or better
            e.treasure && k === 0 ? 'epic' : undefined,
            this.artifactsOwned,
          );
          if (getItemDef(item.defId).artifact) this.artifactsOwned.add(item.defId);
          this.drops.push(item);
          this.emit({ type: 'drop', tick: this.tick, enemyId: e.id, item });
          this.dropCharm(e, rareOrBetter, false);
        }
      }
      // A player with none gets one from the first boss
      if (e.def.boss && this.cfg.charmSure && this.charmDrops.length === 0)
        this.dropCharm(e, true, true);
    }
    // 一網打尽: 群れの全員を同じ1回の連鎖で倒した (the lone treasure goblin does not count)
    if (!e.escort && !e.def.boss && !e.treasure && this.chain && this.mode === 'run') {
      const members = this.enemies.filter((o) => o.group === e.group);
      if (members.every((o) => !o.alive && o.killedBy === this.chainSerial)) {
        this.stats.sweeps++;
        this.addTime(TIME_BONUS.sweep, 'sweep');
      }
    }
    if (e.def.boss) {
      // 取り巻きは王と一緒に逃げる
      for (const o of this.enemies) {
        if (o.alive && o.escort) {
          o.alive = false;
          this.emit({
            type: 'enemyDeath',
            tick: this.tick,
            enemyId: o.id,
            defId: o.defId,
            boss: false,
            fled: true,
          });
        }
      }
      this.bossesDefeated++;
      this.stats.bossesDefeated = this.bossesDefeated;
      this.emit({ type: 'bossDefeated', tick: this.tick, loop: this.loop, bossId: e.defId });
      this.addTime(TIME_BONUS.boss, 'boss');
      this.loop++;
      this.loopStartX = this.heroX + FIELD.loopGap;
      this.enemies = this.enemies.filter((x) => x.alive);
      this.startLoop();
      if (this.cfg.relics && this.mode === 'run') this.openRelicOffer();
    }
  }

  /** Maybe a charm comes with a dropped item (never without charms on) */
  private dropCharm(e: EnemyState, rareOrBetter: boolean, sure: boolean): void {
    if (!this.charmRng) return;
    const c = rollCharmDrop(this.charmRng, e.loop, rareOrBetter, this.region.loot, sure);
    if (!c) return;
    const charm = { ...c, uid: `charm-${this.charmDrops.length + 1}` };
    this.charmDrops.push(charm);
    this.emit({ type: 'charmDrop', tick: this.tick, enemyId: e.id, charm });
  }

  /** 出撃時間をのばす（上限 TIME_BONUS.maxRunTime）。実際に増えた分をイベントで出す */
  private addTime(seconds: number, reason: TimeBonusReason): void {
    if (this.mode !== 'run' || this.ended || this.cfg.demo) return;
    const cap = secToTicks(TIME_BONUS.maxRunTime);
    const before = this.maxTicks;
    this.maxTicks = Math.min(cap, this.maxTicks + secToTicks(seconds));
    const gained = (this.maxTicks - before) / SIM.ticksPerSecond;
    this.stats.timeGained += gained;
    this.emit({
      type: 'timeBonus',
      tick: this.tick,
      reason,
      seconds: gained,
      capped: gained < seconds,
    });
  }

  private damageHero(e: EnemyState): void {
    if (e.atk <= 0) return;
    const unguarded = this.unguarded;
    let dmg =
      e.atk *
      (e.statuses.has('bound') ? 1 - LIGHT_DARK.boundAtkDown : 1) *
      (unguarded ? HERO.unguardedTakenMult : 1);
    const absorbed = Math.min(this.defense, dmg);
    this.defense -= absorbed;
    dmg -= absorbed;
    this.hp = Math.max(0, this.hp - dmg);
    // A: 連鎖中に大きく被弾するとよろめき、残りの段が途切れる
    const c = this.chain;
    if (c && !c.cut && this.rules.stagger && unguarded) {
      c.taken += dmg;
      if (c.taken >= this.maxHp * c.staggerRatio) {
        c.cut = true;
        c.staggered = true;
      }
    }
    this.emit({
      type: 'heroHit',
      tick: this.tick,
      enemyId: e.id,
      damage: dmg,
      absorbed,
      unguarded,
    });
    if (this.hp <= 0) this.end('dead');
  }
}
