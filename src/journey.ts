import { canStand, touchingHazard, type Point } from "./core.ts";
import { bloomingGarden, scenes, type SceneId } from "./maps.ts";
import { meadowOpen } from "./rainbow-flowers.ts";

export const JOURNEY_KEY = "fufu-journey-v1";
export interface Journey extends Point { scene: SceneId; savedAt: number }
export function readJourney(raw: string | null, flowers: readonly string[]): Journey | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw) as Journey;
    if (!value || typeof value.scene !== "string" || !Object.hasOwn(scenes, value.scene) ||
      !Number.isFinite(value.x) || !Number.isFinite(value.y) ||
      !Number.isSafeInteger(value.savedAt) || value.savedAt <= 0 ||
      !Number.isFinite(new Date(value.savedAt).getTime())) return null;
    const unlocked = meadowOpen(flowers);
    const scene = value.scene === "meadow" && !unlocked ? "garden" : value.scene;
    const map = scene === "garden" && unlocked ? bloomingGarden : scenes[scene];
    const safe = scene === value.scene && canStand(value, map.walls, map.bounds, map.floor, map.surfaces) &&
      !touchingHazard(value, map.hazards);
    const {x, y} = safe ? value : map.spawn;
    return {scene, x, y, savedAt: value.savedAt};
  } catch { return null; }
}
