import { ITEMS, type Equipped, type ItemId } from "./items.ts";
import { spriteFrames } from "./sprite-frames.ts";
import { artScale, cellHeight, cellWidth, outfitIndex, outfits, type AvatarPose, type Facing } from "./costume-frames.ts";
export type { AvatarPose, Facing } from "./costume-frames.ts";
export interface EquipmentPart {
  id: ItemId;
  layer: "underArm" | "front";
  x: number;
  y: number;
  w: number;
  h: number;
  style?: "band" | "earpieces" | "profileBand" | "profileCup" | "rearBand" | "rearEarpieces" | "straps" | "bag" | "hat" | "pinEdge";
  mirror?: boolean;
}
// The near shoulder moves independently of the trailing hair as the arms swing.
const profileShoulders = {
  1: [[-1.1,-19.8],[-.7,-19.5],[-.6,-19.7]],
  2: [[1.9,-19.5],[1.7,-19.1],[1,-19.7]],
} as const;

// Near ear centres in the 144 × 184 garment cells, in atlas order (three
// left-facing frames, then three right-facing frames). The side lock covers
// the ear: fit just behind the outer eye, above the jaw, on each drawing.
const profileEars = {
  base:             [[70,75],[70,76],[70,76], [76,75],[75,77],[76,75]],
  roseDress:        [[69,74],[69,76],[69,74], [76,74],[77,77],[77,74]],
  mintCape:         [[68,79],[69,80],[69,79], [77,79],[78,81],[77,79]],
  cloudPajamas:     [[69,74],[69,76],[70,75], [76,74],[76,77],[77,75]],
  apricotNightgown: [[70,75],[69,76],[70,74], [76,74],[76,77],[76,75]],
  sailorSet:        [[70,75],[70,76],[69,75], [76,74],[76,77],[77,75]],
  honeyOveralls:    [[69,74],[69,76],[68,75], [76,74],[76,77],[76,75]],
  witchDress:       [[69,75],[69,76],[70,75], [77,74],[77,77],[77,76]],
  mikoOutfit:       [[70,77],[68,78],[67,78], [76,78],[76,80],[77,78]],
} as const satisfies Record<NonNullable<typeof outfits[number]> | "base", readonly (readonly [number, number])[]>;

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
  const hairSize = hair === "heartClip" ? 8.5 : 8;
  if (pose === "lying") return hair ? [
    {id:hair, layer:"front", x:-12.15-hairSize/2, y:-6.15-hairSize/2, w:hairSize, h:hairSize},
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
  const cap = head === "witchHat" || head === "blueBeret" || head === "strawHat";
  const crownX = facing === 1 ? -3.1 : facing === 2 ? 2.9 : 0;
  if (hair && (facing === 0 || facing === 1)) {
    const size = hair === "starWings" ? 9 : hairSize;
    const templeX = facing === 0 ? 7.2 : -.6;
    // A clip grips the fringe just forward of the near cup.
    const center = head === "headphones" ? templeX - (profile ? 3.8 : 1.6) : templeX;
    const templeCenter = cap ? -28.2 : -31.6;
    add(hair, "front", center-size/2, templeCenter-size/2 + headShift, size, size);
  }
  if (head === "headphones") {
    if (profile) {
      const outfit = outfits[outfitIndex(equipped.clothes)] ?? "base";
      const right = profile === 2;
      const [px, py] = profileEars[outfit][(right ? 3 : 0) + walkFrame];
      const cx = (px - cellWidth/2) / artScale, cy = (py - cellHeight) / artScale;
      const piece = (x: number, y: number, w: number, h: number, style: "profileBand" | "profileCup") =>
        add(head, "front", cx + (right ? -x-w : x), cy+y, w, h, style, right);
      piece(-3.75, -11.7, 5.2, 9.7, "profileBand");
      piece(-4.15, -3.9, 8.3, 7.8, "profileCup");
    } else {
      addHead(-12, -38.5, 24, 16, facing === 3 ? "rearBand" : "band");
      addHead(-12, -38.5, 24, 16, facing === 3 ? "rearEarpieces" : "earpieces");
    }
  }
  if (head === "ginghamBand") {
    // Fit the cloth to the temples; only the two tied ends project above the hair.
    if (profile) addHead(crownX-5.6, -43, 11.2, 16, undefined, facing === 2);
    else if (facing === 3) addHead(-10.7, -39.5, 21.4, 13.4);
    else addHead(-10.2, -44.4, 20.4, 18.2);
  } else if (cap) {
    const width = (head === "blueBeret" ? 27 : 33.5) - (profile ? 2.5 : 0);
    const height = head === "witchHat" ? width*.45 : 15.5;
    addHead(crownX-width/2, -31.1-height, width, height, "hat", facing === 2 && head !== "witchHat");
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
