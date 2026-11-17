// Art for the head and back accessories (src/core/cosmetics.ts): one still image each, worn on the
// hero at the anchor points of src/data/heroAnchors.ts. A look without an entry here, or whose PNG
// is missing, is simply not drawn.

export interface AccessoryArt {
  /** Path under assets/sprites */
  file: string;
  /**
   * The pixel of the image that sits on the hero's anchor point: the bottom middle of a crown, the
   * root of a wing or a flag pole. It may lie outside the image (a halo floats above the head)
   */
  pivot: readonly [number, number];
  /** Wings and flags swing around the pivot: up to ±deg degrees, one full swing every ms */
  sway?: { deg: number; ms: number };
  /** Replaces the helmet's red plume: the hero is drawn without it while this is worn */
  hidesPlume?: boolean;
  /**
   * A small white glint that flashes at this pixel of the image now and then (ice, star ring).
   * `arms`: the color of its four arms (default pale ice blue)
   */
  twinkle?: { at: readonly [number, number]; everyMs: number; arms?: number };
  /** Glows: the brightness breathes slowly between `min` and full, once every ms */
  pulse?: { min: number; ms: number };
}

/** Look id → art (assets/raw/accessories/<id>_export.json has how each was made) */
export const ACCESSORY_ART: Readonly<Record<string, AccessoryArt>> = {
  // The front half of a thin ring of leaves, wrapped low around the helmet between the horns
  // (the back half would be hidden by the helmet, so it is cut off)
  head_leaf_crown: { file: 'accessories/head_leaf_crown.png', pivot: [11, -3] },
  // Flame-like feathers standing on the dome and trailing back; the helmet's red plume is taken off
  // while it is worn
  head_flame_plume: {
    file: 'accessories/head_flame_plume.png',
    pivot: [14, 15],
    hidesPlume: true,
  },
  // A small ice jewel set over the red gem on the forehead (7x9), glinting now and then. Pixels
  // placed by hand in colors taken from a generated crystal (generation stops at 16 px)
  head_ice_crystal: {
    file: 'accessories/head_ice_crystal.png',
    pivot: [-2, -4],
    twinkle: { at: [4, 2], everyMs: 2600 },
  },
  // One bat wing seen from the side, rooted behind the shoulder and spread up and back
  back_bat_wings: {
    file: 'accessories/back_bat_wings.png',
    pivot: [21, 21],
    sway: { deg: 6, ms: 1400 },
  },
  // The demon king's wing: bigger than the bat wing, black bones with gold-tipped claws and a
  // crimson membrane; it swings slower, with more weight
  back_demon_wings: {
    file: 'accessories/back_demon_wings.png',
    pivot: [24, 24],
    sway: { deg: 4, ms: 1800 },
  },
  // A ring of light (a halo) standing behind the back, big enough to frame the whole helmet: red
  // outside to yellow inside. Pixels placed by script in the colors of a generated ring (which
  // came out 24 px, too small to frame the hero). Its center sits 5 px ahead of and 8 px above
  // the back point; it glows and a star glints on its left side
  back_star_ring: {
    file: 'accessories/back_star_ring.png',
    pivot: [18, 31],
    pulse: { min: 0.75, ms: 2400 },
    twinkle: { at: [6, 17], everyMs: 3000, arms: 0xfffac8 },
  },
  // A banner on a pole stood on the back (like a war banner), streaming back; the pole's foot is
  // hidden low behind the body so the spear tip shows above the helmet
  back_knight_flag: {
    file: 'accessories/back_knight_flag.png',
    pivot: [20, 38],
    sway: { deg: 4, ms: 1100 },
  },
};

/** Texture key of an accessory (never starts with 'hero', so the hero recolor leaves it alone) */
export const accessoryKey = (id: string): string => `acc_${id}`;
