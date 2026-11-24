import type { Rect } from "./core";
import type { World, DepthLayer } from "./world";

type Cover = Rect & { depth: number; mask: Path2D };
type Outline = Rect & { depth: number; path: string };

export function prepareMapCovers(outlines: Outline[]): Cover[] {
  return outlines.map(({path, ...area}) => ({...area, mask:new Path2D(path)}));
}

export function visibleMapCovers(world: World, covers: Cover[]): DepthLayer[] {
  const view = world.visibleArea;
  return covers
    .filter(({ x, y, w, h }) => x < view.x + view.w && x + w > view.x && y < view.y + view.h && y + h > view.y)
    .map(cover => ({ y: cover.depth, draw: c => world.drawMapCover(c, cover, cover.mask) }));
}
