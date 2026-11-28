import type { CampEncounterId } from "./camp-encounters.ts";
import { artScale, cellWidth, cellHeight } from "./costume-frames.ts";

// Landmarks are in the unaltered 144 × 184 seated drawings. The bird's toes,
// the butterfly's feet and the jelly's lowest filament touch different spots.
const landmarks = [
  // knee, cuff, hem, mouth
  [[56,148],[53,136],[95,156],[74,111]],
  [[56,148],[55,137],[109,163],[74,112]],
  [[55,148],[53,135],[107,165],[74,113]],
  [[55,148],[53,136],[96,155],[74,111]],
  [[55,149],[55,136],[106,163],[74,112]],
  [[56,147],[53,135],[96,154],[74,112]],
  [[55,146],[52,135],[96,154],[72,109]],
  [[56,149],[54,137],[105,165],[74,112]],
  [[56,149],[54,136],[102,164],[74,111]],
] as const;
const spot = {bird: 0, butterfly: 1, jelly: 2, marshmallow: 3} as const;

export function campEncounterLandmark(id: CampEncounterId, outfit: number) {
  const [x, y] = landmarks[outfit][spot[id]];
  return {x: (x - cellWidth / 2) / artScale, y: (y - cellHeight) / artScale};
}
