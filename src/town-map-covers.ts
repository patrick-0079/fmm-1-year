import type { DepthLayer, World } from "./world";
import { prepareMapCovers, visibleMapCovers } from "./map-covers";
import { mapFragment } from "./map-fragment";
import { townForeground } from "./town-foreground";
import playgrounds from "./town-playground-masks.generated.json";
import waterfront from "./town-waterfront-masks.json";
import streetFurniture from "./town-street-furniture-masks.json";
import streetlights from "./town-streetlight-outlines.json";

// Every outline samples the current base painting, including the SD fallback.
// Cache paths and source rectangles once. Only visible fragments enter the sort.
const covers = [
  ...prepareMapCovers([...playgrounds, ...streetlights, ...waterfront, ...streetFurniture]),
  ...townForeground.map(({ y: depth, points }) => ({ ...mapFragment(points), depth })),
];

export function townMapCovers(world: World): DepthLayer[] {
  return visibleMapCovers(world, covers);
}
