import type { CampEncounterId } from "./camp-encounters";

// Pixel coordinates in each 144 × 184 original seated costume drawing.
export const campExpressionRect = {x: 45, y: 89, width: 56, height: 28} as const;
export const campExpressionDrawings = [
  "glanceLeft", "lookLeft", "glanceUp", "lookUp", "glanceRight", "lookRight",
  "glanceDown", "lookDown", "closing", "bite", "taste",
] as const;

// -1 displays the actual wardrobe drawing. Hold the neutral face while the
// player decides, and let the visitor carry the motion during held drawings.
const cels = {
  bird:        [-1, 0, 0,-1,   0, 1, 0,-1,  -1, 0, 1, 1, 1, 1, 0,-1],
  butterfly:   [-1, 2, 2,-1,   2, 3, 2,-1,  -1, 2, 3, 3, 2, 2, 2,-1],
  jelly:       [-1, 4, 4,-1,   4, 5, 4,-1,  -1, 4, 5, 5, 5, 5, 4,-1],
  marshmallow: [-1, 6, 6,-1,   6, 7, 6,-1,  -1, 6, 7, 8, 9,10, 6,-1],
} satisfies Record<CampEncounterId, number[]>;

export function campExpressionCel(id: CampEncounterId, frame: number) {
  return cels[id][frame] ?? -1;
}
