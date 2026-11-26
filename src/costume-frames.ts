import type { ItemId } from "./items.ts";
import type { RestState } from "./rest.ts";

export type AvatarPose = "standing" | "sitting" | "bench" | "lying";
export type Facing = 0 | 1 | 2 | 3;

// All dressed bodies share the original foot baseline. The bed uses a centered double-width cell.
export const artScale = 4;
export const cellWidth = 144;
export const cellHeight = 184;
export const footStripHeight = 52;
export function avatarPose(rest: Pick<RestState, "kind" | "scene"> | null): AvatarPose {
  if (!rest) return "standing";
  if (rest.kind === "lying") return "lying";
  return rest.scene === "challenge" ? "bench" : "sitting";
}

export function poseFrame(pose: AvatarPose, facing: Facing, step: number) {
  if (pose === "sitting") return 12;
  if (pose === "bench") return 13;
  if (pose === "lying") return 14;
  return facing * 3 + step;
}

export const outfits = [null, "roseDress", "mintCape", "cloudPajamas", "apricotNightgown", "sailorSet", "honeyOveralls", "witchDress", "mikoOutfit"] as const satisfies readonly (ItemId | null)[];
export function outfitIndex(clothes?: ItemId | null) {
  return Math.max(0, outfits.findIndex(id => id === clothes));
}
export function costumeFrame(outfit: number, frame: number) {
  return {
    x: frame * cellWidth, y: outfit * cellHeight,
    w: frame === 14 ? cellWidth * 2 : cellWidth, h: cellHeight,
  };
}
