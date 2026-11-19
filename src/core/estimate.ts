// 配置画面の見積もり: ルート1本を「ふつうの敵1体」に撃ったときの合計ダメージ（期待値）
// 連鎖倍率・レアリティ・強化・コンボ（同じルート内で付けた状態を、後ろの装備が使う）・追加効果・会心の期待値を含む。
// 狙いの切り替え（敵が倒れて段数が戻る）、範囲攻撃で巻き込む分、ボス特効は含めない。
// 毒は「時間で与える分の半分」と見積もる。風で重ねた毒・毒爆もその見積もりの上に足す（おおよそ）。
import { LUCK, POISON, STATUS } from '../config/balance';
import { getItemDef } from '../data/items';
import { getBoard, type BoardId } from '../data/boards';
import type { CharmTrigger } from '../data/charms';
import { TECHNIQUE_MULT } from '../data/techniques';
import { affixValue } from './affixes';
import { boardDamageMult } from './boards';
import { applyCharmEvent, cellTop, stackTop, type CharmContext } from './charms';
import { computeDamage, findCombo } from './damage';
import { lineOrigin } from './chain';
import type { ChainPlan, ItemInstance, Status } from './types';

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
   * Trial (charms): the combo multiplier at the end of the route (1 without charms). Crits and
   * kills are left out: they depend on luck and the enemy's health
   */
  charmPeak: number;
}

export function estimateRoute(
  plan: ChainPlan,
  items: ReadonlyMap<string, ItemInstance>,
  attackMult: number,
  /** Trial (stacked board): the board's damage trait counts too */
  board?: BoardId,
  /** Trial (charms): the edge charms build a combo multiplier along the route */
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
  const charmEvent = (trigger: CharmTrigger, cell: number) => {
    if (charms) charmM = applyCharmEvent(charmM, trigger, cell, charms).m;
  };
  for (const [index, s] of plan.steps.entries()) {
    if (s.step === null) continue;
    const inst = items.get(s.uid);
    if (!inst) continue;
    const def = getItemDef(inst.defId);
    const statused = statuses.size > 0;
    const combo = findCombo(def.element, statuses);
    if (combo) {
      statuses.delete(combo.status);
      combos++;
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
    // 合流ボーナス（合流したマスから先の本流）と、起点石の種類
    m *= (1 + (s.mergeBonus ?? 0) / 100) * (s.line?.damage ?? 1) * (s.stackMult ?? 1);
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
      const dps = hit * POISON.dpsRatio * (s.line?.poison ?? 1);
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
        statuses.delete('poison');
        layers = 0;
        poisonDps = 0;
      }
    }
    if (combo) fromCombos += hit - hit / combo.mult;
    if (s.tech) techs.push(s.tech);
    // Trial (charms): after the step (both strikes of twin blades use the multiplier before it)
    if (charms) {
      if (cellTop(s, charms)) charmEvent('cell', s.cell);
      if (combo) charmEvent('combo', s.cell);
      if (s.tech) charmEvent('tech', s.cell);
      if (stackTop(s, charms)) charmEvent('stackTop', s.cell);
    }
    if (def.applies) statuses.add(def.applies);
    if (def.appliesAll) for (const st of ['wet', 'oil', 'frozen'] as const) statuses.add(st);
  }
  return { total, fromCombos, combos, techs, charmPeak: charmM };
}
