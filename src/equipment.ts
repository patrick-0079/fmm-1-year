import type { Equipped, ItemId } from "./items.ts";
export type AvatarPose = "standing" | "sitting" | "lying";
export type Facing = 0 | 1 | 2 | 3;
export interface EquipmentPart {
  id: ItemId;
  layer: "behind" | "front";
  x: number;
  y: number;
  w: number;
  h: number;
  style?: "band" | "earpieces" | "straps" | "garment" | "bag" | "footwear";
  mirror?: boolean;
}
/** Relative to the foot baseline, using separate front/back and side views. */
export function equipmentParts(
  equipped: Equipped,
  pose: AvatarPose,
  facing: Facing,
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
  if (equipped.clothes === "roseDress" || equipped.clothes === "mintCape")
    add(equipped.clothes, "front", -16, -44 - shift, 32, 44, "garment");
  if (bag === "moonBag" || bag === "berryBag" || bag === "rabbitSatchel") {
    if (facing === 3) add(bag, "front", -6, -19, 12, 12, "bag");
    else if (facing === 1) add(bag, "front", 6.7, -15.6, 8.4, 9.6, "bag");
    else if (facing === 2) add(bag, "front", -15.1, -15.6, 8.4, 9.6, "bag", true);
    else {
      add(bag, "behind", -12, -18.5, 12, 12, "bag");
      add(bag, "front", -16, -44 - shift, 32, 44, "straps");
    }
  }
  if (equipped.shoes === "ribbonShoes" || equipped.shoes === "starShoes")
    add(equipped.shoes, "front", -16, -10 - shift, 32, 10, "footwear");
  if ((body === "anniversaryPin" || body === "echoBrooch") && facing !== 3)
    add(body, "front", facing === 1 ? -7.3 : facing === 2 ? 3.6 : -3.6, -16.7, 4.2, 4.5);
  if (head === "wreath")
    add(head, "front", facing === 1 ? -12.5 : facing === 2 ? -10.5 : -13.5, -38.5, facing === 1 || facing === 2 ? 23 : 27, 8.5);
  if (head === "candyClip")
    add(head, "front", facing === 1 ? -6.5 : facing === 2 ? .5 : -10, -36.5, 7.5, 7, undefined, facing === 1);
  if (head === "headphones") {
    add(head, "front", -12, -38.5, 24, 16, "band");
    add(head, "front", -12, -38.5, 24, 16, "earpieces");
  }
  if (head === "starWings") {
    if (facing === 3) add(head, "front", -9.5, -34, 19, 13);
    else add(head, "front", facing === 2 ? -9.5 : 1, -37.5, 11.5, 8.5, undefined, facing === 2);
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
