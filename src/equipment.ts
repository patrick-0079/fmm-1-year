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
  style?: "band" | "earpieces" | "straps";
  mirror?: boolean;
}
/** Relative to the foot baseline, using separate front/back and side views. */
export function equipmentParts(
  equipped: Equipped,
  pose: AvatarPose,
  facing: Facing,
): EquipmentPart[] {
  if (pose === "lying") return [];
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
  if (bag === "moonBag" || bag === "berryBag" || bag === "rabbitSatchel") {
    if (facing === 3) add(bag, "front", -9, -25, 18, 20);
    else if (facing === 1) add(bag, "behind", 3, -26, 17, 20);
    else if (facing === 2) add(bag, "behind", -20, -26, 17, 20);
    else {
      add(bag, "behind", -18, -25, 17, 20);
      add(bag, "front", -7, -20, 14, 11, "straps");
    }
  }
  if (equipped.clothes === "roseDress" || equipped.clothes === "mintCape")
    add(
      equipped.clothes,
      facing === 3 ? "behind" : "front",
      -9,
      -23,
      18,
      pose === "sitting" ? 16 : 20,
    );
  if (equipped.shoes === "ribbonShoes" || equipped.shoes === "starShoes")
    add(
      equipped.shoes,
      "front",
      facing === 1 ? -9 : -8,
      -6 - shift,
      facing === 1 || facing === 2 ? 12 : 17,
      8,
    );
  if (body === "anniversaryPin" && facing !== 3) {
    add(
      body,
      "front",
      facing === 1 ? -10 : facing === 2 ? 5 : -5,
      -19,
      facing === 0 ? 8 : 5,
      9,
    );
  }
  if (head === "wreath")
    add(
      head,
      "front",
      facing === 1 ? -12 : facing === 2 ? -10 : -16,
      -40,
      facing === 1 || facing === 2 ? 23 : 32,
      11,
    );
  if (head === "candyClip") {
    add(
      head,
      "front",
      facing === 1 ? -10 : facing === 3 ? -12 : 5,
      -39,
      11,
      10,
      undefined,
      facing === 1 || facing === 3,
    );
  }
  if (head === "headphones") {
    add(head, "behind", -14, -41, 28, 25, "band");
    add(head, "front", -14, -41, 28, 25, "earpieces");
  }
  if (head === "starWings") {
    add(
      head,
      facing === 3 ? "front" : "behind",
      facing === 1 ? -15 : facing === 2 ? -11 : -19,
      -43,
      facing === 1 || facing === 2 ? 26 : 38,
      27,
      undefined,
      facing === 1,
    );
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
