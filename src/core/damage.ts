// ダメージ式と状態コンボ（仕様書 第5章）
// D = ATK × R × 1.2^(n−1) × C × U
import { AREA, COMBOS, RARITY, type ComboRule } from '../config/balance';
import { chainMultiplier } from './chain';
import type { Area, Element, Rarity, Status } from './types';

export interface DamageInput {
  atk: number;
  rarity: Rarity;
  step: number;
  comboMult?: number;
  upgradeMult?: number;
  area?: Area;
}

export function computeDamage(input: DamageInput): number {
  const r = RARITY[input.rarity].mult;
  const c = input.comboMult ?? 1;
  const u = input.upgradeMult ?? 1;
  const areaMult = input.area === 'all' ? AREA.allMult : 1;
  return input.atk * r * chainMultiplier(input.step) * c * u * areaMult;
}

/** その属性が消費する状態があればコンボを返す */
export function findCombo(
  element: Element | undefined,
  statuses: { has(s: Status): boolean },
): ComboRule | null {
  if (!element) return null;
  for (const rule of COMBOS) {
    if (rule.element === element && statuses.has(rule.status)) return rule;
  }
  return null;
}

/** 爆発などで攻撃範囲が広がるか（狙いの状態で判定） */
export function effectiveArea(base: Area, aimCombo: ComboRule | null): Area {
  if (aimCombo?.expandToSplash && base === 'single') return 'splash';
  return base;
}
