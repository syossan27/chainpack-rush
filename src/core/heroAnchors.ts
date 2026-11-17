// Where things sit on the hero in each animation frame (sword tip, top of the helmet, back), so
// effects and accessories can follow the hero. Pure: no Phaser.

/** A point inside one frame of that animation, in px */
export type AnchorPoint = readonly [number, number];
export type AnchorKind = 'tip' | 'head' | 'back';
/** One point per frame; null hides whatever follows it in that frame */
export type AnimAnchors = Partial<Record<AnchorKind, readonly (AnchorPoint | null)[]>>;
/** Outfit id → animation name → points */
export type AnchorTable = Readonly<Record<string, Partial<Record<string, AnimAnchors>>>>;

/** The point for one frame, or null when the table has none */
export function anchorAt(
  table: AnchorTable,
  body: string,
  anim: string,
  frame: number,
  kind: AnchorKind,
): AnchorPoint | null {
  return table[body]?.[anim]?.[kind]?.[frame] ?? null;
}

/** A point in a frame drawn at `at` with the given origin and scale, as a screen position */
export function anchorToWorld(
  p: AnchorPoint,
  frame: { width: number; height: number },
  origin: { originX: number; originY: number },
  at: { x: number; y: number },
  scale: number,
): { x: number; y: number } {
  return {
    x: at.x + (p[0] - origin.originX * frame.width) * scale,
    y: at.y + (p[1] - origin.originY * frame.height) * scale,
  };
}
