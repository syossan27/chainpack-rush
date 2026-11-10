// 配置画面の見積もり: ルート1本を「ふつうの敵1体」に撃ったときの合計ダメージ（期待値）
// 連鎖倍率・レアリティ・強化・コンボ（同じルート内で付けた状態を、後ろの装備が使う）・追加効果・会心の期待値を含む。
// 狙いの切り替え（敵が倒れて段数が戻る）、範囲攻撃で巻き込む分、ボス特効は含めない。
import { LUCK, POISON, STATUS } from '../config/balance';
import { getItemDef } from '../data/items';
import { TECHNIQUE_MULT } from '../data/techniques';
import { affixValue } from './affixes';
import { computeDamage, findCombo } from './damage';
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
}

export function estimateRoute(
  plan: ChainPlan,
  items: ReadonlyMap<string, ItemInstance>,
  attackMult: number,
): RouteEstimate {
  const statuses = new Set<Status>();
  const origin = items.get(plan.originUid);
  const spark = origin ? 1 + affixValue(origin, 'spark') / 100 : 1;
  let total = 0;
  let fromCombos = 0;
  let combos = 0;
  const techs: string[] = [];
  for (const s of plan.steps) {
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
    if (s.step === 1) m *= spark;
    const critChance = Math.min(
      1,
      LUCK.critChance + (def.critBonus ?? 0) + affixValue(inst, 'keen') / 100,
    );
    const critAvg = 1 + critChance * (LUCK.critMult - 1);
    const hit = base * m * critAvg * (def.hits ?? 1) * (s.tech ? TECHNIQUE_MULT : 1);
    total += hit;
    // 毒: 時間でじわじわ与える分（敵が先に倒れることもあるので半分に見積もる）
    if (def.applies === 'poison') total += hit * POISON.dpsRatio * STATUS.duration * 0.5;
    if (combo) fromCombos += hit - hit / combo.mult;
    if (s.tech) techs.push(s.tech);
    if (def.applies) statuses.add(def.applies);
    if (def.appliesAll) for (const st of ['wet', 'oil', 'frozen'] as const) statuses.add(st);
  }
  return { total, fromCombos, combos, techs };
}
