import type { Equipped, ItemId } from "./items.ts";
import { spriteFrames } from "./sprite-frames.ts";
import type { AvatarPose, Facing } from "./costume-frames.ts";
export type { AvatarPose, Facing } from "./costume-frames.ts";
export interface EquipmentPart {
  id: ItemId;
  layer: "behind" | "underArm" | "front";
  x: number;
  y: number;
  w: number;
  h: number;
  style?: "band" | "earpieces" | "rearBand" | "rearEarpieces" | "wreathFar" | "wreathNear" | "straps" | "bag" | "hat" | "pinEdge";
  mirror?: boolean;
}
// The near shoulder moves independently of the trailing hair as the arms swing.
const profileShoulders = {
  1: [[-1.1,-19.8],[-.7,-19.5],[-.6,-19.7]],
  2: [[1.9,-19.5],[1.7,-19.1],[1,-19.7]],
} as const;
/** Relative to the foot baseline, using separate front/back and side views. */
export function equipmentParts(
  equipped: Equipped,
  pose: AvatarPose,
  facing: Facing,
  walkFrame = 0,
): EquipmentPart[] {
  const hair = equipped.hair;
  if (pose === "lying") return hair ? [
    {id:hair, layer:"front", x:-15.3, y:-9.3, w:6.3, h:6.3},
  ] : [];
  if (pose !== "standing") { facing = 0; walkFrame = 0; }
  const shift = pose === "sitting" ? 6 : pose === "bench" ? 3 : 0;
  const parts: EquipmentPart[] = [];
  const add = (
    id: ItemId,
    layer: EquipmentPart["layer"],
    x: number,
    y: number,
    w: number,
    h: number,
    style?: EquipmentPart["style"],
    mirror = false,
  ) => parts.push({ id, layer, x, y: y + shift, w, h, style, mirror });
  const head = equipped.head,
    body = equipped.body,
    bag = equipped.backpack ?? (body === "moonBag" ? body : null);
  // The sprite is anchored at its feet. Follow the crown when a walking
  // frame raises/lowers the head instead of leaving the accessory behind.
  const headShift = pose === "standing"
    ? (spriteFrames[facing * 3].h - spriteFrames[facing * 3 + walkFrame].h) * 43 / 330
    : 0;
  const addHead = (
    layer: EquipmentPart["layer"], x: number, y: number, w: number, h: number,
    style?: EquipmentPart["style"], mirror = false,
  ) => { if (head) add(head, layer, x, y + headShift, w, h, style, mirror); };
  const profile = facing === 1 || facing === 2 ? facing : undefined;
  const torsoShift = pose === "sitting" ? -1.4 : pose === "bench" ? -1.2 : 0;
  if (bag === "moonBag" || bag === "berryBag" || bag === "rabbitSatchel") {
    const satchel = bag === "rabbitSatchel";
    if (profile) {
      const [shoulder, top] = profileShoulders[profile][walkFrame];
      const right = facing === 2;
      add(bag, "underArm", right ? shoulder - 1 : shoulder - 5.4, top, 6.4, 8, "straps", right);
      if (satchel) {
        // The pouch stays at her left hip. From the opposite side only the sling is visible.
        if (!right) add(bag, "underArm", shoulder - 2.3, top + 6.1, 7.6, 5.4, "bag");
      } else {
        const moon = bag === "moonBag", width = moon ? 5.6 : 4.9;
        const inner = shoulder + (right ? -1 : 1) * 1.4;
        add(bag, "underArm", right ? inner-width : inner, top + (moon ? -.7 : 1), width, moon ? 12.9 : 11.4, "bag", right);
      }
    } else if (facing === 3) {
      add(bag, "underArm", -6.2, -20.7 + headShift, 12.4, 10.6, "straps");
      if (satchel) add(bag, "underArm", -9.4, -14.2 + headShift, 4.1, 6.2, "bag");
      else {
        const width = bag === "moonBag" ? 12 : 10.6;
        add(bag, "underArm", -width/2, (bag === "moonBag" ? -20.1 : -18.7) + headShift, width, width*1.1, "bag");
      }
    } else {
      add(bag, "underArm", -5.3, -18.7 + torsoShift, 10.6, pose === "sitting" ? 5.4 : 7.1, "straps");
      if (satchel) add(bag, "underArm", 2.9, -13.1 + torsoShift, 7.8, 5.5, "bag");
    }
  }
  if (body === "anniversaryPin" || body === "echoBrooch") {
    if (facing === 0) add(body, "front", .8, -17.9 + torsoShift, 3.2, 3.4);
    if (facing === 1) {
      const [shoulder, top] = profileShoulders[1][walkFrame];
      add(body, "front", shoulder - 6.1, top + 1.3, 1.45, 2.8, "pinEdge");
    }
  }
  if (head === "wreath") {
    const x = facing === 1 ? -12.5 : facing === 2 ? -10.5 : -13.5,
      width = facing === 1 || facing === 2 ? 23 : 27;
    // A flower crown wraps around the head: the far half belongs behind
    // the hair, not as a second flower band painted across the scalp.
    addHead("behind", x, -38.5, width, 8.5, "wreathFar", facing === 3);
    addHead("front", x, -38.5, width, 8.5, "wreathNear", facing === 3);
  }
  if (head === "headphones") {
    addHead("front", -12, -38.5, 24, 16, facing === 3 ? "rearBand" : "band");
    addHead("front", -12, -38.5, 24, 16, facing === 3 ? "rearEarpieces" : "earpieces");
  }
  if (hair && (facing === 0 || facing === 1)) {
    const width = hair === "starWings" ? 8.5 : hair === "heartClip" ? 5.8 : 6.7;
    const center = facing === 0 ? 7.2 : -.6;
    const templeY = head === "witchHat" ? -31.6 : -35;
    add(hair, "front", center-width/2, templeY + headShift, width, 6.8);
  }
  if (head === "witchHat") {
    const width = profile ? 31 : 33.5;
    const center = facing === 1 ? -3.1 : facing === 2 ? 2.9 : 0;
    // Align the band's opening with the skull, not the centre of her long hair.
    addHead("front", center-width/2, -31.1-width*.45, width, width*.45, "hat");
  }
  return parts;
}

export function fitItem(
  sw: number,
  sh: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.min(w / sw, h / sh),
    width = sw * scale,
    height = sh * scale;
  return {
    x: x + (w - width) / 2,
    y: y + (h - height) / 2,
    w: width,
    h: height,
  };
}
