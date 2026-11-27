import { canArriveAt, touchingHazard, type Point } from "./core.ts";
import { scenes, type SceneId } from "./maps.ts";
import { meadowOpen } from "./rainbow-flowers.ts";

export const JOURNEY_KEY = "fufu-journey-v1";
export interface Journey extends Point { scene: SceneId; savedAt: number }
export function showJourneyStatus(element: HTMLElement, journey: Journey | null) {
  if (!journey) {
    element.textContent = "开始冒险后自动保存";
    element.removeAttribute("title");
    return;
  }
  const date = new Date(journey.savedAt);
  const when = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  element.textContent = `本机已保存 · ${scenes[journey.scene].title} ${when}`;
  element.title = date.toLocaleString("zh-CN");
}
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
    const map = scenes[scene];
    const safe = scene === value.scene && canArriveAt(value, map) &&
      !touchingHazard(value, map.hazards);
    const {x, y} = safe ? value : map.spawn;
    return {scene, x, y, savedAt: value.savedAt};
  } catch { return null; }
}
