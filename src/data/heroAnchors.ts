// Points on the hero per outfit, animation and frame (see src/core/heroAnchors.ts).
// The points are found by a script from the art and checked by eye on a marked sheet.
import type { AnchorTable } from '../core/heroAnchors';

export const HERO_ANCHORS: AnchorTable = {
  knight: {
    // Sword tip in the shared special motion (assets/raw/hero/hero_special_export.json)
    special: {
      tip: [
        [71, 41],
        [34, 32],
        [29, 35],
        [27, 40],
        [107, 86],
        [109, 70],
        [108, 70],
        [108, 70],
        [97, 53],
      ],
    },
  },
};
