// Trial (board shapes): the words for a board's trait (shared by the loadout and result screens)
import { boardValue } from '../core/boards';
import type { BoardDef } from '../data/boards';
import { t } from '../i18n';

/** What the board's trait does (none for the standard board) */
export function boardTraitText(def: BoardDef): string | undefined {
  return def.text ? t(def.text, { v: boardValue(def) ?? '' }) : undefined;
}
