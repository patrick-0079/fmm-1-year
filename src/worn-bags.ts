import { artScale, cellHeight, cellWidth, outfitIndex, outfits, poseFrame } from "./costume-frames";
import type { AvatarPose, EquipmentPart, Facing } from "./equipment";
import type { Equipped, ItemId } from "./items";
import { drawItem, type WardrobeArt } from "./item-art";
import fittings from "./bag-fittings.json";

const bags: Partial<Record<ItemId, {face: WardrobeArt; side: WardrobeArt; seam: string; strap: string}>> = {
  moonBag: {face:"moonPackRear", side:"moonPackSide", seam:"#796080", strap:"#c0a1ca"},
  berryBag: {face:"berryPackRear", side:"berryPackSide", seam:"#894d58", strap:"#d88089"},
  rabbitSatchel: {face:"satchelFace", side:"satchelEdge", seam:"#685d49", strap:"#b1ad7c"},
  letterPack: {face:"letterPack", side:"letterPackSide", seam:"#547269", strap:"#9fc6ac"},
  bearPack: {face:"bearPack", side:"bearPackSide", seam:"#895f46", strap:"#d6a36c"},
  compassPack: {face:"compassPack", side:"compassPackSide", seam:"#495770", strap:"#899bb4"},
};
function drawBagBody(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  const art = bags[p.id];
  if (!art) return;
  const satchel = p.id === "rabbitSatchel";
  const side = satchel ? facing === 3 : facing === 1 || facing === 2;
  // The moon pack's padded back is on the opposite edge of its original side view.
  if (side && p.id === "moonBag") { c.translate(p.w, 0); c.scale(-1, 1); }
  drawItem(c, side ? art.side : art.face, 0, 0, p.w, p.h, !satchel);
}

function drawBagStraps(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing, returnSide = false) {
  const art = bags[p.id];
  if (!art) return;
  const { w, h } = p, satchel = p.id === "rabbitSatchel";
  c.lineCap = c.lineJoin = "round";
  c.beginPath();
  if (satchel) {
    if (facing === 1) {
      if (returnSide) {
        // The far end comes around the back seam to the rear lug.
        c.moveTo(5.7, 3.3);
        c.bezierCurveTo(7.1, 5.0, w-3.2, h-2.4, w, h+.25);
      } else {
        c.moveTo(1.55, -1.2);
        c.bezierCurveTo(1.8, 2.65, w-8.5, h-3.2, w-6.05, h+.25);
      }
    } else if (facing === 2) {
      // The pouch is on the far hip. The sling runs across the visible shoulder and around the chest.
      c.moveTo(w+.7, -.45);
      c.bezierCurveTo(w*.68, .25, w*.43, h*.46, w*.25, h*.72);
      c.quadraticCurveTo(w*.13, h*.93, -.65, h+1);
    } else if (facing === 3) {
      c.moveTo(w-.7, -.7);
      c.quadraticCurveTo(w*.64, h*.38, .15, h+.35);
    } else {
      c.moveTo(w*.19, -.65);
      c.quadraticCurveTo(w*.52, h*.46, w*.87, h+.2);
    }
  } else if (facing === 1 || facing === 2) {
    // Both ends return to the gusset; the near arm can cover the lower return during a stride.
    c.moveTo(w+.9, 3.25);
    c.bezierCurveTo(w*.78, 2.2, w*.51, .15, w*.33, .85);
    c.bezierCurveTo(w*.13, 1.4, -.1, 3.55, .55, 5.2);
    c.bezierCurveTo(1.25, 7.1, w*.68, h-.05, w+.8, h-.25);
  } else {
    for (const direction of [-1, 1]) {
      const mid = w/2;
      c.moveTo(mid+direction*w*.175, -.4);
      c.bezierCurveTo(mid+direction*w*.22, h*.23, mid+direction*w*.27, h*.65,
        mid+direction*w*.49, h*.89);
    }
  }
  c.lineWidth = satchel ? .94 : 1.22;
  c.strokeStyle = art.seam;
  c.stroke();
  c.lineWidth = satchel ? .48 : .66;
  c.strokeStyle = art.strap;
  c.stroke();
}

interface BagMasks {
  behindArm: Path2D;
  aroundShoulder: Path2D;
  cloth: Path2D;
  behindTorso: Path2D;
}
const maskCache = new Map<string, BagMasks>();

function masksFor(clothes: Equipped["clothes"], pose: AvatarPose, facing: Facing, step: number) {
  const design = outfits[outfitIndex(clothes)] ?? "base";
  const frame = poseFrame(pose, facing, step);
  const key = design + "/" + frame;
  const cached = maskCache.get(key);
  if (cached) return cached;
  const [armOutline, clothOutline] = fittings[design][frame];
  const toFoot = new DOMMatrix([1/artScale, 0, 0, 1/artScale, -cellWidth/(2*artScale), -cellHeight/artScale]);
  // Artist contours wind counter-clockwise. In the outer rectangle they cut out the arms.
  const behindArm = new Path2D();
  behindArm.rect(-40, -52, 80, 58);
  behindArm.addPath(new Path2D(armOutline), toFoot);
  const aroundShoulder = new Path2D(behindArm);
  const cap = pose === "sitting" ? -13.7 : pose === "bench" ? -16.2 : -17.8;
  aroundShoulder.rect(-40, -52, 80, cap+52);
  const cloth = new Path2D();
  cloth.addPath(new Path2D(clothOutline), toFoot);
  const behindTorso = new Path2D();
  behindTorso.rect(-40, -52, 80, 58);
  behindTorso.addPath(cloth);
  const masks = { behindArm, aroundShoulder, cloth, behindTorso };
  maskCache.set(key, masks);
  return masks;
}

export function drawWornBags(c: CanvasRenderingContext2D, parts: EquipmentPart[], clothes: Equipped["clothes"],
  pose: AvatarPose, facing: Facing, step: number, separateSleeves = false) {
  const masks = masksFor(clothes, pose, facing, step);
  for (const part of parts) {
    if (part.layer !== "underArm") continue;
    const straps = part.style === "straps", satchel = part.id === "rabbitSatchel";
    if (straps && satchel && facing === 1) {
      c.save();
      c.clip(masks.behindArm);
      c.clip(masks.behindTorso);
      c.translate(part.x, part.y);
      drawBagStraps(c, part, facing, true);
      c.restore();
    }
    c.save();
    if (straps) {
      if (!facing || facing === 3 || satchel) c.clip(masks.cloth);
      if (!separateSleeves) c.clip(satchel && facing !== 2 ? masks.behindArm : masks.aroundShoulder);
    } else if (!separateSleeves) {
      // A rucksack sits outside the hair at the back. The satchel stays beneath the nearer hand.
      c.clip(masks.behindArm);
    }
    c.translate(part.mirror ? part.x + part.w : part.x, part.y);
    if (part.mirror) c.scale(-1, 1);
    if (straps) drawBagStraps(c, part, facing);
    else drawBagBody(c, part, facing);
    c.restore();
  }
}
