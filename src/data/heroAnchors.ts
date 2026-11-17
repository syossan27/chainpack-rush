// Points on the hero per outfit, animation and frame (see src/core/heroAnchors.ts).
// The points are found by a script from the art and checked by eye on a marked sheet.
// head: the top edge of the helmet dome, at the plume's base (head accessories sit there and the
// plume pokes through); back: behind the shoulder, under the helmet (back accessories hang there).
// Found from the helmet's dark face opening (find_anchors.py next to the Phase 2 plan); no frame
// needed a hand fix.
import type { AnchorTable } from '../core/heroAnchors';

export const HERO_ANCHORS: AnchorTable = {
  knight: {
    idle: {
      head: [
        [33, 13],
        [33, 13],
        [33, 12],
        [33, 12],
        [33, 12],
        [33, 12],
        [33, 13],
        [33, 13],
        [33, 13],
      ],
      back: [
        [23, 36],
        [23, 36],
        [23, 35],
        [23, 35],
        [23, 35],
        [23, 35],
        [23, 36],
        [23, 36],
        [23, 36],
      ],
    },
    run: {
      head: [
        [48, 31],
        [48, 28],
        [48, 27],
        [48, 28],
        [48, 31],
        [48, 28],
        [48, 27],
        [48, 28],
      ],
      back: [
        [38, 54],
        [38, 51],
        [38, 50],
        [38, 51],
        [38, 54],
        [38, 51],
        [38, 50],
        [38, 51],
      ],
    },
    attack: {
      head: [
        [54, 37],
        [56, 42],
        [56, 42],
        [74, 41],
        [76, 41],
        [76, 41],
        [74, 41],
        [62, 38],
        [54, 37],
      ],
      back: [
        [44, 60],
        [44, 65],
        [44, 65],
        [63, 64],
        [66, 64],
        [66, 64],
        [64, 64],
        [52, 61],
        [44, 60],
      ],
    },
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
      head: [
        [52, 45],
        [60, 46],
        [59, 45],
        [66, 48],
        [64, 48],
        [61, 48],
        [60, 48],
        [60, 47],
        [57, 46],
      ],
      back: [
        [42, 68],
        [49, 70],
        [48, 69],
        [55, 72],
        [54, 72],
        [50, 71],
        [49, 71],
        [50, 71],
        [47, 70],
      ],
    },
  },
};
