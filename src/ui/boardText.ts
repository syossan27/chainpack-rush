// The words for boards: a board's trait, and the mark on gear used on another board
import { boardValue } from '../core/boards';
import { getBoard, type BoardDef, type BoardId } from '../data/boards';
import { t } from '../i18n';

/** What the board's trait does (none for the standard board) */
export function boardTraitText(def: BoardDef): string | undefined {
  return def.text ? t(def.text, { v: boardValue(def) ?? '' }) : undefined;
}

/** The mark on gear used on a board not chosen now: that board's name ("+" when on several) */
export function boardMark(
  uses: ReadonlyMap<string, readonly BoardId[]>,
  uid: string,
): string | null {
  const list = uses.get(uid);
  if (!list || list.length === 0) return null;
  const first = t(getBoard(list[0]!).name);
  return list.length > 1 ? `${first}+` : first;
}
