// 30秒のランを固定ステップで進め、イベント列を出す（仕様書 第4〜6章）
// Phaser 非依存。シーンはここが出すイベントと状態を描画するだけ。
import {
  AREA,
  BOSS,
  CHAIN_RULES,
  ELITES,
  LUCK,
  type EliteId,
  type LuckRules,
  CONSUMABLE,
  FIELD,
  HERO,
  LOOP_SCALING,
  LOOT,
  RARITY,
  SIM,
  STATUS,
  TIME_BONUS,
  type ChainRules,
} from '../config/balance';
import { SCARECROW_ID, getEnemyDef, type EnemyDef } from '../data/enemies';
import { getItemDef } from '../data/items';
import { getRegion, type RegionDef } from '../data/regions';
import { rollLoop, type LoopLayout } from './layout';
import { chainMultiplier, planChain } from './chain';
import { affixValue } from './affixes';
import { computeDamage, effectiveArea, findCombo } from './damage';
import { rollLoot } from './loot';
import { Rng } from './rng';
import type {
  Area,
  ChainPlan,
  ConsumableEffect,
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
    }
  | { type: 'combo'; tick: number; enemyId: number; name: string; label: string }
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
  | { type: 'runEnd'; tick: number; reason: EndReason; reachedLoop: number };

export type TimeBonusReason = 'boss' | 'sweep' | 'consumable';

export interface RunStats {
  fires: number;
  maxStep: number;
  maxDamage: number;
  totalDamage: number;
  bossesDefeated: number;
  timeGained: number; // 延長した秒数
  sweeps: number; // 一網打尽の回数
}

export interface RunResult {
  reason: EndReason;
  /** ラン中に使った消耗品の uid（撤退の確定時に倉庫から取り除く） */
  usedConsumables: string[];
  progress: number;
  reachedLoop: number;
  drops: ItemInstance[];
  stats: RunStats;
  ticks: number;
}

interface ExecInfo {
  eff: number; // 実際の段数（狙いが変わると1に戻る）
  aim: number | null;
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
}

/** 手前から。同じ位置ならボスは後ろ（取り巻きが前に立つ） */
const byFront = (a: EnemyState, b: EnemyState): number =>
  a.x - b.x || Number(a.def.boss) - Number(b.def.boss) || a.id - b.id;

/** 爆弾のダメージ表示用（装備の uid ではない） */
export const BOMB_UID = '__bomb__';

const secToTicks = (s: number): number => Math.round(s * SIM.ticksPerSecond);

export class Combat {
  readonly region: RegionDef;
  readonly mode: 'run' | 'dummy';
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
  nextOriginIndex = 0;
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

  private readonly rng: Rng;
  private readonly cfg: RunConfig;
  private readonly origins: string[];
  private events: CombatEvent[] = [];
  private nextEnemyId = 1;
  private nextDropId = 1;
  private summonTimer = 0;
  private loopStartX = 0;
  private nextGroup = 1;
  private bossGroup = 0;

  constructor(cfg: RunConfig) {
    this.cfg = cfg;
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

  /** 連鎖中は無防備。ただし起点のあと rules.guardSteps 段目までは守りが残る（next は起点を含む添字） */
  get unguarded(): boolean {
    if (this.guardAll) return false;
    return this.chain !== null && this.chain.next > this.rules.guardSteps;
  }

  get atbRatio(): number {
    return Math.max(0, Math.min(1, this.atb / this.cfg.hero.atbTime));
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

  get nextOriginUid(): string | null {
    return this.origins.length > 0
      ? this.origins[this.nextOriginIndex % this.origins.length]!
      : null;
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
      stats: { ...this.stats, bossesDefeated: this.bossesDefeated },
      ticks: this.tick,
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
    if (this.ended) return false;
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
    this.emit({ type: 'consumable', tick: this.tick, uid, defId: def.id, effect });
    switch (effect) {
      case 'rally':
        this.atb = this.cfg.hero.atbTime;
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
          const nullified = e.def.ability === 'damageThreshold' && dmg < BOSS.ironKnightThreshold;
          this.emit({
            type: 'hit',
            tick: this.tick,
            enemyId: e.id,
            itemUid: BOMB_UID,
            damage: nullified ? 0 : dmg,
            combo: null,
            nullified,
            crit: false,
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

    // 1. 連鎖の進行
    if (this.chain) this.advanceChain();

    // 2. ATB と発火
    if (!this.chain) {
      this.atb = Math.min(this.cfg.hero.atbTime, this.atb + dt);
      if (this.mode === 'run' && this.atb >= this.cfg.hero.atbTime && this.inContact()) this.fire();
    }

    // 3. 状態の失効
    for (const e of this.enemies) {
      for (const [s, until] of e.statuses) if (this.tick >= until) e.statuses.delete(s);
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
        if (this.canAttack(e)) {
          e.attackTimer += dt;
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

  /** プレイヤーの撤退。ここまでの戦利品を持ち帰って終わる */
  retreat(): void {
    if (this.mode !== 'run') return;
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
    for (const g of layout.groups) {
      const group = this.nextGroup++;
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
    const maxHp = def.hp * Math.pow(LOOP_SCALING.hp, scaleLoop) * (el?.hp ?? 1);
    const e: EnemyState = {
      id: this.nextEnemyId++,
      defId,
      def,
      x,
      hp: maxHp,
      maxHp,
      atk: def.atk * Math.pow(LOOP_SCALING.atk, scaleLoop) * (el?.atk ?? 1),
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
    };
    this.enemies.push(e);
    this.emit({ type: 'spawn', tick: this.tick, enemyId: e.id, defId, x, escort, elite });
    return e;
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
    const originUid = this.nextOriginUid;
    if (!originUid) return;
    const originIndex = this.nextOriginIndex % this.origins.length;
    this.nextOriginIndex = (this.nextOriginIndex + 1) % this.origins.length;
    const plan = planChain(this.cfg.loadout, this.cfg.items, originUid);
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
    const gain = c.cut
      ? defenseSteps.reduce((sum, s) => {
          const it = this.cfg.items.get(s.uid)!;
          return (
            sum +
            (getItemDef(it.defId).defense ?? 0) *
              RARITY[it.rarity].mult *
              (1 + affixValue(it, 'sturdy') / 100)
          );
        }, 0)
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
      const steps = Math.max(0, (c.cut ? c.next : c.plan.steps.length) - 1);
      const origin = this.cfg.items.get(c.plan.originUid)!;
      const quick = affixValue(origin, 'quick') / 100;
      const factor =
        Math.min(r.atbMaxFactor, Math.max(r.atbMinFactor, steps / r.atbRefSteps)) *
        (1 - quick) *
        (getItemDef(origin.defId).waitMult ?? 1);
      this.atb = this.cfg.hero.atbTime * (1 - factor);
    } else {
      // 時渡りの砂時計は、段数に比例する待ちがなくても待たずに次を撃つ
      const origin = this.cfg.items.get(c.plan.originUid);
      this.atb = origin && getItemDef(origin.defId).waitMult === 0 ? this.cfg.hero.atbTime : 0;
    }
  }

  private executeStep(c: ActiveChain, index: number): void {
    const s = c.plan.steps[index]!;
    const inst = this.cfg.items.get(s.uid)!;
    const def = getItemDef(inst.defId);
    const parent = s.parentIndex >= 0 ? c.exec[s.parentIndex]! : null;
    const fromCell = s.parentIndex >= 0 ? c.plan.steps[s.parentIndex]!.cell : null;

    if (def.kind !== 'attack') {
      // 起点・防御装備: 段数を数えず、親の段数と狙いを引き継ぐ
      const aim = parent ? parent.aim : (this.targetOrder()[0]?.id ?? null);
      c.exec[index] = { eff: parent ? parent.eff : 0, aim };
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
    const eff = parent && parent.aim === aimId ? parent.eff + 1 : 1;
    c.exec[index] = { eff, aim: aimId };
    const mult = chainMultiplier(eff, c.plan.multCap);
    if (eff > this.stats.maxStep) this.stats.maxStep = eff;
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
      (this.tick < this.critUpUntil ? CONSUMABLE.critUpChance : 0);
    for (let h = 0; h < (def.hits ?? 1); h++)
      this.strike(c, s.uid, inst, def, eff, aim, critChance);
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
  ): void {
    if (!aim.alive) {
      const next = this.targetOrder()[0];
      if (!next) return;
      aim = next;
    }
    const crit = (def.atk ?? 0) > 0 && this.rng.next() < critChance;
    const aimCombo = findCombo(def.element, aim.statuses);
    const area = effectiveArea(def.area ?? 'single', aimCombo);
    const targets = this.resolveTargets(aim, area, def.pierce ?? 0);
    for (const t of targets) {
      const statused = t.statuses.size > 0;
      const combo = findCombo(def.element, t.statuses);
      if (combo) {
        t.statuses.delete(combo.status);
        this.emit({
          type: 'combo',
          tick: this.tick,
          enemyId: t.id,
          name: combo.name,
          label: combo.label,
        });
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
            this.affixMult(c, inst, eff, t, statused) *
            100,
        ) / 100;
      if (raw > 0) {
        const nullified = t.def.ability === 'damageThreshold' && raw < BOSS.ironKnightThreshold;
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
        });
        if (dmg > 0) {
          t.hp -= dmg;
          c.totalDamage += dmg;
          this.stats.totalDamage += dmg;
          if (dmg > this.stats.maxDamage) this.stats.maxDamage = dmg;
        }
      }
      if (def.applies && t.hp > 0) this.applyStatus(t, def.applies);
      if (def.appliesAll && t.hp > 0)
        for (const st of ['wet', 'oil', 'frozen'] as const) this.applyStatus(t, st);
      if (t.hp <= 0) this.killEnemy(t);
    }
  }

  /** 追加効果によるダメージ倍率（装備の分と、起点の「初撃」） */
  private affixMult(
    c: ActiveChain,
    inst: ItemInstance,
    eff: number,
    t: EnemyState,
    statused: boolean,
  ): number {
    let m = 1 + affixValue(inst, 'sharp') / 100;
    if (eff <= 3) m *= 1 + affixValue(inst, 'vanguard') / 100;
    if (eff >= 6) m *= 1 + affixValue(inst, 'finisher') / 100;
    if (statused) m *= 1 + affixValue(inst, 'exploit') / 100;
    if (t.def.boss)
      m *= (1 + affixValue(inst, 'slayer') / 100) * (getItemDef(inst.defId).bossMult ?? 1);
    if (eff === 1) {
      const origin = this.cfg.items.get(c.plan.originUid);
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

  private applyStatus(e: EnemyState, status: Status): void {
    e.statuses.set(status, this.tick + secToTicks(STATUS.duration));
    this.emit({ type: 'statusApplied', tick: this.tick, enemyId: e.id, status });
  }

  private killEnemy(e: EnemyState): void {
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
    if (!e.escort && this.mode === 'run') {
      const roll = this.rng.next();
      if (roll < e.def.dropRate || e.elite === 'golden') {
        const count = e.def.boss ? LOOT.bossDrops : e.elite ? ELITES[e.elite].drops : 1;
        const rareOrBetter = e.def.boss || e.elite === 'golden';
        for (let k = 0; k < count; k++) {
          const item = rollLoot(this.rng, e.loop, `drop-${this.nextDropId++}`, rareOrBetter);
          this.drops.push(item);
          this.emit({ type: 'drop', tick: this.tick, enemyId: e.id, item });
        }
      }
    }
    // 一網打尽: 群れの全員を同じ1回の連鎖で倒した
    if (!e.escort && !e.def.boss && this.chain && this.mode === 'run') {
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
    }
  }

  /** 出撃時間をのばす（上限 TIME_BONUS.maxRunTime）。実際に増えた分をイベントで出す */
  private addTime(seconds: number, reason: TimeBonusReason): void {
    if (this.mode !== 'run' || this.ended) return;
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
    let dmg = e.atk * (unguarded ? HERO.unguardedTakenMult : 1);
    const absorbed = Math.min(this.defense, dmg);
    this.defense -= absorbed;
    dmg -= absorbed;
    this.hp = Math.max(0, this.hp - dmg);
    // A: 連鎖中に大きく被弾するとよろめき、残りの段が途切れる
    const c = this.chain;
    if (c && !c.cut && this.rules.stagger && unguarded) {
      c.taken += dmg;
      if (c.taken >= this.maxHp * this.rules.staggerRatio) {
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
