import type { DepthLayer, World } from "./world";
import { prepareMapCovers, visibleMapCovers } from "./map-covers";
import { mapFragment } from "./map-fragment";
import { townForeground } from "./town-foreground";
import playgrounds from "./town-playground-masks.generated.json";
import waterfront from "./town-waterfront-masks.json";
import streetFurniture from "./town-street-furniture-masks.json";
import streetlights from "./town-streetlight-outlines.json";

// Suspended fabric is above every actor, including NPCs and companions. It
// still receives the normal scene lighting before interaction cues are drawn.
export const townOverheadDepth = Infinity;

// Every outline samples the current base painting, including the SD fallback.
// Cache paths and source rectangles once. Only visible fragments enter the sort.
const covers = [
  ...prepareMapCovers([...playgrounds, ...streetlights, ...waterfront, ...streetFurniture]),
  ...townForeground.map(part => ({
    ...mapFragment(part.points), depth: part.overhead ? townOverheadDepth : part.y,
  })),
];

export function townMapCovers(world: World): DepthLayer[] {
  return visibleMapCovers(world, covers);
}
