import type { Equipped, ItemId } from "./items.ts";
import { spriteFrames } from "./sprite-frames.ts";
export type AvatarPose = "standing" | "sitting" | "lying";
export type Facing = 0 | 1 | 2 | 3;
export interface EquipmentPart {
  id: ItemId;
  layer: "behind" | "front";
  x: number;
  y: number;
  w: number;
  h: number;
  style?: "band" | "earpieces" | "rearBand" | "rearEarpieces" | "wreathFar" | "wreathNear" | "straps" | "garment" | "bag" | "footwear";
  mirror?: boolean;
}
// Inner top corner of the pouch against the near shoulder, relative to the feet.
// In profile the trailing hair extends much farther back than the side of the dress.
const sideBagSeams = {
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
  if (pose === "lying") return [];
  if (pose === "sitting") facing = 0;
  const shift = pose === "sitting" ? 6 : 0,
    parts: EquipmentPart[] = [];
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
  if (equipped.clothes === "roseDress" || equipped.clothes === "mintCape")
    add(equipped.clothes, "front", -16, -44 - shift, 32, 44, "garment");
  if (bag === "moonBag" || bag === "berryBag" || bag === "rabbitSatchel") {
    if (facing === 3) add(bag, "front", -6, -19, 12, 12, "bag");
    else if (facing === 1 || facing === 2) {
      const [seamX, top] = sideBagSeams[facing][walkFrame];
      const width = 8, height = 9.2;
      add(bag, "front", facing === 1 ? seamX : seamX - width, top, width, height, "bag", facing === 2);
    }
    else {
      add(bag, "behind", -12, -18.5, 12, 12, "bag");
      add(bag, "front", -16, -44 - shift, 32, 44, "straps");
    }
  }
  if (equipped.shoes === "ribbonShoes" || equipped.shoes === "starShoes")
    add(equipped.shoes, "front", -16, -10 - shift, 32, 10, "footwear");
  if ((body === "anniversaryPin" || body === "echoBrooch") && facing !== 3)
    add(body, "front", facing === 1 ? -7.3 : facing === 2 ? 3.6 : -3.6, -16.7, 4.2, 4.5);
  if (head === "wreath") {
    const x = facing === 1 ? -12.5 : facing === 2 ? -10.5 : -13.5,
      width = facing === 1 || facing === 2 ? 23 : 27;
    // A flower crown wraps around the head: the far half belongs behind
    // the hair, not as a second flower band painted across the scalp.
    addHead("behind", x, -38.5, width, 8.5, "wreathFar", facing === 3);
    addHead("front", x, -38.5, width, 8.5, "wreathNear", facing === 3);
  }
  if (head === "candyClip")
    // The barrette sits on the fringe. From behind, the back hair covers it.
    addHead(facing === 3 ? "behind" : "front", facing === 1 ? -6.5 : facing === 2 ? .5 : facing === 3 ? 2.5 : -10, -36.5, 7.5, 7, undefined, facing === 1 || facing === 3);
  if (head === "headphones") {
    addHead("front", -12, -38.5, 24, 16, facing === 3 ? "rearBand" : "band");
    addHead("front", -12, -38.5, 24, 16, facing === 3 ? "rearEarpieces" : "earpieces");
  }
  if (head === "starWings") {
    // Keep the same small side-mounted clip when turning; do not turn it
    // into an enlarged ornament in the middle of the back of the head.
    addHead(facing === 3 ? "behind" : "front", facing === 3 ? -12.5 : facing === 2 ? -9.5 : 1, -37.5, 11.5, 8.5, undefined, facing === 2 || facing === 3);
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
