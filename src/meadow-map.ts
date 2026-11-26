import { producers } from "./content.ts";
import { meadowGround, meadowStarSpot } from "./meadow-ground.ts";
import type { Scene } from "./maps.ts";

export { campfire, campSeat, campLetterSpot, tentTapeSpot, starJar, meadowExit, enteredMoonCircle, tentRoof } from "./meadow-ground.ts";

export const meadowScene: Scene = {
  ...meadowGround,
  spots: [...meadowGround.spots, ...producers.map(meadowStarSpot)],
};
