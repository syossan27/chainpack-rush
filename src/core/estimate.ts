// 配置画面の見積もり: ルート1本を「ふつうの敵1体」に撃ったときの合計ダメージ（期待値）
// 連鎖倍率・レアリティ・強化・コンボ（同じルート内で付けた状態を、後ろの装備が使う）・追加効果・会心の期待値を含む。
// 狙いの切り替え（敵が倒れて段数が戻る）、範囲攻撃で巻き込む分、ボス特効は含めない。
// 毒は「時間で与える分の半分」と見積もる。風で重ねた毒・毒爆もその見積もりの上に足す（おおよそ）。
import { CHAIN_RULES, LUCK, POISON, STATUS, type ChainRules } from '../config/balance';
import { getItemDef } from '../data/items';
import { getBoard, type BoardId } from '../data/boards';
import type { CharmTrigger } from '../data/charms';
import { TECHNIQUE_MULT } from '../data/techniques';
import { affixValue } from './affixes';
import { boardDamageMult } from './boards';
import { applyCharmEvent, cellTop, comboWeight, stackTop, type CharmContext } from './charms';
import { computeDamage, findCombo } from './damage';
import { firedPieces, lineOrigin, originQuick, waitFactor } from './chain';
import type { ChainPlan, ItemInstance, Status } from './types';

/**
 * Seconds one firing of this plan takes, until the next can fire: the chain itself plus the wait
 * after it (the same wait as battle; a 呼び戻しの笛 picked during a run is left out).
 * `atbFull` is the full gauge in seconds: the hero's wait time × the board's wait
 */
export function chainCycle(
  plan: ChainPlan,
  items: ReadonlyMap<string, ItemInstance>,
  atbFull: number,
  rules: ChainRules = CHAIN_RULES,
): number {
  const isOrigin = (u: string) => getItemDef(items.get(u)!.defId).kind === 'origin';
  const pieces = firedPieces(plan.steps, isOrigin);
  return plan.duration + atbFull * waitFactor(pieces, originQuick(plan.originUids, items), rules);
}

/** Damage per second when the routes fire one after another: all damage ÷ all their time */
export function routeRate(routes: readonly { total: number; cycle: number }[]): number {
  const time = routes.reduce((sum, r) => sum + r.cycle, 0);
  return time > 0 ? routes.reduce((sum, r) => sum + r.total, 0) / time : 0;
}

export interface RouteEstimate {
  /** 合計ダメージ（期待値） */
  total: number;
  /** そのうちコンボで増えた分 */
  fromCombos: number;
  /** コンボが起きる回数 */
  combos: number;
  /** 成立している必殺技（id） */
  techs: string[];
  /**
   * The combo multiplier at the end of the route (1 without charms). Crits and
   * kills are left out: they depend on luck and the enemy's health
   */
  charmPeak: number;
}

export function estimateRoute(
  plan: ChainPlan,
  items: ReadonlyMap<string, ItemInstance>,
  attackMult: number,
  /** The board's damage trait counts too */
  board?: BoardId,
  /** The edge charms build a combo multiplier along the route */
  charms?: CharmContext,
): RouteEstimate {
  const boardDef = getBoard(board);
  const statuses = new Set<Status>();
  // Poison per second of one layer, and how many layers wind has stacked
  let poisonDps = 0;
  let layers = 0;
  let total = 0;
  let fromCombos = 0;
  let combos = 0;
  const techs: string[] = [];
  let charmM = 1;
  const charmEvent = (trigger: CharmTrigger, cell: number, weight = 1) => {
    if (charms) charmM = applyCharmEvent(charmM, trigger, cell, charms, weight).m;
  };
  for (const [index, s] of plan.steps.entries()) {
    if (s.step === null) continue;
    const inst = items.get(s.uid);
    if (!inst) continue;
    const def = getItemDef(inst.defId);
    const statused = statuses.size > 0;
    const combo = findCombo(def.element, statuses);
    // The strongest combo of this step (0: none)
    let comboW = 0;
    if (combo) {
      statuses.delete(combo.status);
      combos++;
      comboW = comboWeight(combo.name);
    }
    const base = computeDamage({
      atk: def.atk ?? 0,
      rarity: inst.rarity,
      step: s.step,
      comboMult: combo?.mult ?? (statused ? STATUS.exposedMult : 1),
      upgradeMult: attackMult,
      area: def.area === 'all' ? 'all' : undefined,
      multCap: plan.multCap,
    });
    let m = 1 + affixValue(inst, 'sharp') / 100;
    if (s.step <= 3) m *= 1 + affixValue(inst, 'vanguard') / 100;
    if (s.step >= 6) m *= 1 + affixValue(inst, 'finisher') / 100;
    if (statused) m *= 1 + affixValue(inst, 'exploit') / 100;
    // 初撃: その線の起点の効果
    if (s.step === 1) {
      const origin = items.get(lineOrigin(plan, index));
      if (origin) m *= 1 + affixValue(origin, 'spark') / 100;
    }
    // 起点石の種類と、重ねの位置
    m *= (s.line?.damage ?? 1) * (s.stackMult ?? 1);
    m *= boardDamageMult(boardDef, def.element);
    const critChance = Math.min(
      1,
      LUCK.critChance + (def.critBonus ?? 0) + affixValue(inst, 'keen') / 100,
    );
    const critAvg = 1 + critChance * (LUCK.critMult - 1);
    const hit = base * m * critAvg * (def.hits ?? 1) * (s.tech ? TECHNIQUE_MULT : 1) * charmM;
    total += hit;
    // 毒: 時間でじわじわ与える分（敵が先に倒れることもあるので半分に見積もる）
    if (def.applies === 'poison') {
      const dps = hit * POISON.dpsRatio;
      total += dps * STATUS.duration * 0.5;
      poisonDps = Math.max(poisonDps, dps);
      layers = Math.max(1, layers);
    }
    // 風: 毒の敵なら1重ふやす（その分の毒を足す）。重ね切っていれば毒爆（残りの毒が倍率の分ふえる）
    if (def.element === 'wind' && statuses.has('poison') && poisonDps > 0) {
      if (layers < POISON.maxLayers) {
        layers++;
        total += poisonDps * STATUS.duration * 0.5;
      } else {
        total += poisonDps * layers * STATUS.duration * 0.5 * (POISON.burstMult - 1);
        comboW = Math.max(comboW, comboWeight(POISON.burstName));
        statuses.delete('poison');
        layers = 0;
        poisonDps = 0;
      }
    }
    if (combo) fromCombos += hit - hit / combo.mult;
    if (s.tech) techs.push(s.tech);
    // After the step (both strikes of twin blades use the multiplier before it)
    if (charms) {
      // The battle's order: a combo during the attack, then the cell, technique and stack
      if (comboW > 0) charmEvent('combo', s.cell, comboW);
      // A repeated ring (残響) counts no cell and no stack, as in battle
      if (!s.echo && cellTop(s, charms)) charmEvent('cell', s.cell);
      if (s.tech) charmEvent('tech', s.cell);
      if (!s.echo && stackTop(s, charms)) charmEvent('stackTop', s.cell);
    }
    if (def.applies) statuses.add(def.applies);
    if (def.appliesAll) for (const st of ['wet', 'oil', 'frozen'] as const) statuses.add(st);
  }
  return { total, fromCombos, combos, techs, charmPeak: charmM };
}
