import type { DepthLayer, World } from "./world";
import { townForeground } from "./town-foreground";
import playgrounds from "./town-playground-masks.generated.json";
import streetlights from "./town-streetlight-outlines.json";

// Every outline samples the current base painting, including the SD fallback.
// Cache paths and source rectangles once. Only visible fragments enter the sort.
const covers = [
  ...[...playgrounds, ...streetlights].map(({ path, ...region }) => ({ ...region, mask: new Path2D(path) })),
  ...townForeground.map(({ y: depth, points }) => {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
    const mask = new Path2D();
    mask.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) mask.lineTo(p.x, p.y);
    mask.closePath();
    return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y, depth, mask };
  }),
];

export function townMapCovers(world: World): DepthLayer[] {
  const view = world.visibleArea;
  return covers
    .filter(({ x, y, w, h }) => x < view.x + view.w && x + w > view.x && y < view.y + view.h && y + h > view.y)
    .map(cover => ({ y: cover.depth, draw: c => world.drawMapCover(c, cover, cover.mask) }));
}
