import type { Point, Rect } from "./core.ts";

export type CreekScene = "garden" | "challenge";
type Bend = readonly [x: number, y: number, halfWidth: number];

// The narrower ends are springs among the bank stones. The challenge stream
// stops on the lawn, north of the tree line and white fence in the map painting.
const reaches: Record<CreekScene, readonly (readonly Bend[])[]> = {
  garden: [
    [[585,156,0],[585,161,9],[587,172,12],[593,195,13],
      [588,213,11],[583,229,12],[587,245,13]],
    [[587,273,13],[593,286,11],[598,300,14],[595,328,12],
      [589,342,13],[585,350,10],[585,356,0]],
  ],
  challenge: [
    [[232,110,0],[232,116,11],[231,136,12],[232,168,12],
      [226,187,13],[219,209,13],[221,232,12],[224,255,13],
      [232,275,12],[241,296,14],[242,306,14]],
    [[242,334,14],[240,352,12],[239,369,12],[226,391,13],
      [218,408,12],[223,434,12],[222,452,13],[218,470,15],
      [215,482,11],[215,487,0]],
  ],
};
const decks: Record<CreekScene, Rect> = {
  garden: { x: 557, y: 245, w: 70, h: 28 },
  challenge: { x: 202, y: 305, w: 80, h: 30 },
};

export interface CreekRow { x: number; y: number; halfWidth: number }
function rows(bends: readonly Bend[]): CreekRow[] {
  return bends.flatMap(([xa, ya, wa], index) => {
    const next = bends[index + 1];
    if (!next) return [{ x: xa, y: ya, halfWidth: wa }];
    const [xb, yb, wb] = next;
    const count = Math.ceil((yb - ya) / 3);
    return Array.from({ length: count }, (_, step) => {
      const t = step / count;
      const ease = t * t * (3 - 2 * t);
      return { x: xa + (xb - xa) * ease, y: ya + (yb - ya) * t, halfWidth: wa + (wb - wa) * (index === 0 ? Math.sin(t * Math.PI / 2) : ease) };
    });
  });
}

/** Return the same shore for the painting, collision, and water animation. */
export function creekOutline(reach: CreekRow[], width = 1): Point[] {
  return [
    ...reach.map(({x,y,halfWidth}) => ({x:x-halfWidth*width,y})),
    ...reach.slice().reverse().map(({x,y,halfWidth}) => ({x:x+halfWidth*width,y})),
  ];
}

function makeCreek(scene: CreekScene) {
  const [head, tail] = reaches[scene].map(rows);
  return { head, tail, upper: creekOutline(head), lower: creekOutline(tail), bridge: decks[scene] };
}
export const creeks = { garden: makeCreek("garden"), challenge: makeCreek("challenge") };
export type Creek = (typeof creeks)[CreekScene];

export function creekRowAt(rows: CreekRow[], y: number) {
  const next = rows.findIndex(row => row.y >= y);
  if (next <= 0) return next === 0 ? rows[0] : rows[rows.length - 1];
  const a = rows[next - 1], b = rows[next];
  const t = (y - a.y) / (b.y - a.y);
  return { y, x: a.x + (b.x - a.x) * t, halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * t };
}
