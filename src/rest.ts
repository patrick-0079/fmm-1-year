import type { Point } from "./core.ts";
import type { SceneId } from "./maps.ts";
export interface RestState {
  kind: "sitting" | "lying";
  scene: SceneId;
  anchor: Point;
  exit: Point;
}
export const HOME_BED = {
  scene: "room" as const,
  title: "小屋的床",
  anchor: { x: 486, y: 130 },
  exit: { x: 486, y: 205 },
};
export function bedRest(): RestState {
  return {
    kind: "lying",
    scene: "room",
    anchor: { ...HOME_BED.anchor },
    exit: { ...HOME_BED.exit },
  };
}
export function benchRest(
  scene: SceneId,
  anchor: Point,
  exit: Point,
): RestState {
  return {
    kind: "sitting",
    scene,
    anchor: { x: anchor.x, y: anchor.y + 12 },
    exit: { ...exit },
  };
}
