// Storage list: once a press has moved past the threshold, decide whether it drags the item or scrolls the list

/** Holding this long before moving means a drag (a quick flick scrolls) */
export const HOLD_TO_DRAG_MS = 150;

export interface ListGestureInput {
  /** The press started on an item */
  onItem: boolean;
  /** The list is taller than its view */
  canScroll: boolean;
  /** Time from the press to this move, measured with the input events' own timestamps */
  heldMs: number;
  dx: number;
  dy: number;
}

export function listGesture(g: ListGestureInput): 'drag' | 'scroll' {
  if (!g.onItem) return 'scroll';
  // A list that cannot scroll has nothing to flick, so any move from an item picks it up
  if (!g.canScroll) return 'drag';
  return g.heldMs >= HOLD_TO_DRAG_MS || Math.abs(g.dx) > Math.abs(g.dy) ? 'drag' : 'scroll';
}
