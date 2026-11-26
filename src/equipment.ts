import { ITEMS, type Equipped, type ItemId } from "./items.ts";
import { spriteFrames } from "./sprite-frames.ts";
import { outfitIndex, outfits, type AvatarPose, type Facing } from "./costume-frames.ts";
export type { AvatarPose, Facing } from "./costume-frames.ts";
export interface EquipmentPart {
  id: ItemId;
  layer: "underArm" | "front";
  x: number;
  y: number;
  w: number;
  h: number;
  style?: "band" | "earpieces" | "rearBand" | "rearEarpieces" | "straps" | "bag" | "hat" | "pinEdge";
  mirror?: boolean;
}
// The near shoulder moves independently of the trailing hair as the arms swing.
const profileShoulders = {
  1: [[-1.1,-19.8],[-.7,-19.5],[-.6,-19.7]],
  2: [[1.9,-19.5],[1.7,-19.1],[1,-19.7]],
} as const;

// Positions on the left-facing garment, measured from the foot centre.
// A pack rests on the back seam; the satchel hangs at the left hip.
const bagSeats = {
  base:            { back: 2.3, hip: 1.2 },
  roseDress:       { back: 2.0, hip: .8 },
  mintCape:        { back: 3.8, hip: 3.2 },
  cloudPajamas:    { back: .9,  hip: .1 },
  apricotNightgown:{ back: 1.6, hip: .6 },
  sailorSet:       { back: 1.2, hip: .1 },
  honeyOveralls:   { back: .9,  hip: .1 },
  witchDress:      { back: 1.8, hip: .65 },
  mikoOutfit:      { back: 2.1, hip: 1.3 },
} satisfies Record<NonNullable<typeof outfits[number]> | "base", {back:number; hip:number}>;
/** Relative to the foot baseline, using separate front/back and side views. */
export function equipmentParts(
  equipped: Equipped,
  pose: AvatarPose,
  facing: Facing,
  walkFrame = 0,
): EquipmentPart[] {
  const hair = equipped.hair;
  if (pose === "lying") return hair ? [
    {id:hair, layer:"front", x:-16.15, y:-10.15, w:8, h:8},
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
    x: number, y: number, w: number, h: number,
    style?: EquipmentPart["style"], mirror = false,
  ) => { if (head) add(head, "front", x, y + headShift, w, h, style, mirror); };
  const profile = facing === 1 || facing === 2 ? facing : undefined;
  const torsoShift = pose === "sitting" ? -1.4 : pose === "bench" ? -1.2 : 0;
  if (bag && ITEMS[bag]?.slot === "backpack") {
    const satchel = bag === "rabbitSatchel";
    const tall = bag === "moonBag" || bag === "bearPack";
    if (profile) {
      const seat = bagSeats[outfits[outfitIndex(equipped.clothes)] ?? "base"];
      const right = profile === 2;
      const sway = [.0, .35, -.15][walkFrame] - (right ? .4 : 0);
      const rise = [0, .15, -.2][walkFrame];
      const sidePart = (x:number, y:number, w:number, h:number, style:"straps" | "bag") =>
        add(bag, "underArm", right ? -x-w : x, y+rise, w, h, style, right);
      if (satchel && right) {
        sidePart(-10.6+sway, -22.4, 11.3, 7.5, "straps");
      } else if (satchel) {
        const hip = seat.hip+sway;
        sidePart(-7.6+sway, -21.05, hip+7.15-(-7.6+sway), 9.35, "straps");
        sidePart(hip, -13.05, 7.6, 5.4, "bag");
      } else {
        const back = seat.back+sway;
        sidePart(-5.75+sway, -20.75, seat.back+5.75, 10, "straps");
        sidePart(back, tall ? -20.25 : -18.75, tall ? 4.9 : 4.15, tall ? 11.8 : 10.2, "bag");
      }
    } else if (facing === 3) {
      add(bag, "underArm", -8.1, -21.8 + headShift, 14.2, 10.4, "straps");
      if (satchel) add(bag, "underArm", -9.8, -12.65 + headShift, 4.0, 6.1, "bag");
      else {
        const width = tall ? 12 : 10.6;
        add(bag, "underArm", -width/2, (tall ? -20.1 : -18.7) + headShift, width, width*1.1, "bag");
      }
    } else {
      const seated = pose !== "standing";
      const shoulderY = pose === "sitting" ? -15.9 : pose === "bench" ? -18.45 : -21.15;
      const hipY = pose === "sitting" ? -9.95 : pose === "bench" ? -12.15 : -13.25;
      const hipX = seated ? 5.3 : 4.65;
      // add() normally offsets resting equipment. These points already use the seated artwork.
      add(bag, "underArm", -7.85, shoulderY-shift, 15.7, hipY+1.45-shoulderY, "straps");
      if (satchel) add(bag, "underArm", hipX, hipY-shift, 6.2, 5.25, "bag");
    }
  }
  if (body && ITEMS[body]?.slot === "body") {
    if (facing === 0) add(body, "front", .15, -18.7 + torsoShift, 5, 5);
    if (facing === 1) {
      const [shoulder, top] = profileShoulders[1][walkFrame];
      add(body, "front", shoulder - 6.1, top + 1.3, 1.45, 2.8, "pinEdge");
    }
  }
  if (head === "headphones") {
    addHead(-12, -38.5, 24, 16, facing === 3 ? "rearBand" : "band");
    addHead(-12, -38.5, 24, 16, facing === 3 ? "rearEarpieces" : "earpieces");
  }
  const cap = head === "witchHat" || head === "blueBeret" || head === "strawHat";
  const crownX = facing === 1 ? -3.1 : facing === 2 ? 2.9 : 0;
  if (hair && (facing === 0 || facing === 1)) {
    const size = hair === "starWings" ? 9 : 8;
    const center = facing === 0 ? 7.2 : -.6;
    const templeCenter = cap ? -28.2 : -31.6;
    add(hair, "front", center-size/2, templeCenter-size/2 + headShift, size, size);
  }
  if (cap || head === "ginghamBand") {
    const width = (head === "ginghamBand" ? 23 : head === "blueBeret" ? 27 : 33.5) - (profile ? 2.5 : 0);
    const height = head === "witchHat" ? width*.45 : head === "ginghamBand" ? 15 : 15.5;
    const bottom = head === "ginghamBand" && facing === 3 ? -27.8 : -31.1;
    addHead(crownX-width/2, bottom-height, width, height, cap ? "hat" : undefined, facing === 2 && head !== "witchHat");
  }
  if (equipped.wreath === "wreath") {
    // The artist already hid the far side of the garland behind the skull.
    // Lay its visible flowers over every clip, band or hat in one pass.
    const width = profile ? 23.5 : 26;
    const top = cap ? -41.3 : -39.4;
    add("wreath", "front", crownX-width/2, top+headShift, width, 9);
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
