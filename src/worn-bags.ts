import type { AvatarPose, EquipmentPart, Facing } from "./equipment";
import type { Equipped } from "./items";
import { drawItem } from "./item-art";

function drawBagBody(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  const side = facing === 1 || facing === 2;
  if (p.id === "rabbitSatchel") {
    drawItem(c, facing === 3 ? "satchelEdge" : "satchelFace", 0, 0, p.w, p.h);
  } else if (p.id === "berryBag") {
    drawItem(c, side ? "berryPackSide" : "berryPackRear", 0, 0, p.w, p.h);
  } else {
    // On the artist's moon pack the flat padded back is the right edge.
    if (side) { c.translate(p.w, 0); c.scale(-1, 1); }
    drawItem(c, side ? "moonPackSide" : "moonPackRear", 0, 0, p.w, p.h);
  }
}

function drawBagStraps(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  const {w, h} = p, satchel = p.id === "rabbitSatchel";
  const side = facing === 1 || facing === 2;
  c.lineCap = c.lineJoin = "round";
  c.beginPath();
  if (satchel) {
    if (side) {
      if (facing === 1) {
        c.moveTo(2.0, .8);
        c.bezierCurveTo(2.8, 2.8, 4.5, 5.4, w, h);
      } else {
        c.moveTo(w, 3.3);
        c.quadraticCurveTo(3.4, -.7, 2.1, 1.0);
        c.quadraticCurveTo(.7, 2.8, .8, 5.4);
      }
    } else if (facing === 3) {
      c.moveTo(w - 2.1, .3);
      c.quadraticCurveTo(w * .55, h * .42, -.6, h - .5);
    } else {
      c.moveTo(1.55, .1);
      c.quadraticCurveTo(w * .48, h * .49, w - .65, h);
    }
  } else if (side) {
    // The upper loop lies across the shoulder. The swinging arm hides its middle.
    c.moveTo(w + 1, 2.7);
    c.bezierCurveTo(w - .7, .35, 3.1, .1, 2, 1.2);
    c.quadraticCurveTo(.45, 2.7, 1.2, 4.2);
    c.moveTo(w - 2, h - .2);
    c.quadraticCurveTo(w - .4, h + .8, w + 1.6, h + .8);
  } else {
    for (const direction of [-1, 1]) {
      const mid = w / 2;
      c.moveTo(mid + direction * (w * .31), 0);
      c.bezierCurveTo(mid + direction * (w * .47), h * .22, mid + direction * (w * .49), h * .65,
        mid + direction * (w * .39), facing === 3 ? h * .83 : h * .87);
    }
  }
  const berry = p.id === "berryBag";
  c.lineWidth = satchel ? 1.05 : 1.35;
  c.strokeStyle = satchel ? "#685d49" : berry ? "#894d58" : "#796080";
  c.stroke();
  c.lineWidth = satchel ? .52 : .75;
  c.strokeStyle = satchel ? "#b1ad7c" : berry ? "#d88089" : "#c0a1ca";
  c.stroke();
}

// The strap and the pouch share this cutout. It follows the nearer arm through
// the stride and lets the ends of the hair fall in front of the bag opening.
function clipBehindActor(c: CanvasRenderingContext2D, clothes: Equipped["clothes"],
  pose: AvatarPose, facing: Facing, step: number) {
  if (facing === 2) c.scale(-1, 1);
  c.beginPath();
  c.rect(-32, -50, 64, 54);
  if (facing === 3) {
    const longHair = !clothes || clothes === "mikoOutfit";
    const tip = longHair ? -16.2 : -18;
    c.moveTo(-14,-44); c.lineTo(-14,-20);
    c.quadraticCurveTo(-11,-16,-8.2,-14.6);
    c.quadraticCurveTo(-7.4,-15.8,-6.7,-18.7);
    c.quadraticCurveTo(-5,-17.3,-3.8,-17.2);
    c.lineTo(-3.6,-19.2); c.quadraticCurveTo(-2,tip-.6,0,tip);
    c.quadraticCurveTo(2.3,tip-1.1,3.9,-19.3); c.lineTo(4.3,-17.4);
    c.quadraticCurveTo(6,-18.2,6.8,-19);
    c.quadraticCurveTo(7.5,-16,9,-14.9);
    c.quadraticCurveTo(12,-17.4,14,-20.5); c.lineTo(14,-44);
  } else if (facing === 1 || facing === 2) {
    // Wrist positions in the left-facing drawing; the opposite arm has its own baseline.
    const wrist = [-1.4, -.7, -5.8][step] + (facing === 2 ? -.55 : 0);
    const wide = !clothes || clothes === "mikoOutfit" || clothes === "mintCape";
    const half = wide ? 2.1 : 1.25, end = wide ? -9.6 : -10.8;
    c.moveTo(-3.7, -16.6); c.quadraticCurveTo(-2.3,-17.1,-1.1,-16.1);
    c.quadraticCurveTo(wrist+half,-13,wrist+half,end-.7);
    c.quadraticCurveTo(wrist+.1,end+.65,wrist-half,end-.3);
    c.quadraticCurveTo(wrist-half-.2,-12.4,-3.7,-16.6);
  } else {
    const x = pose === "standing" ? 7.7 : 3.8;
    const y = pose === "sitting" ? -9.8 : pose === "bench" ? -13.5 : -12;
    c.moveTo(x + 1.65 * Math.cos(-.28), y + 1.65 * Math.sin(-.28));
    c.ellipse(x, y, 1.65, 2.3, -.28, 0, Math.PI*2);
  }
  c.closePath();
  c.clip("evenodd");
  if (facing === 2) c.scale(-1, 1);
}

export function drawWornBags(c: CanvasRenderingContext2D, parts: EquipmentPart[], clothes: Equipped["clothes"],
  pose: AvatarPose, facing: Facing, step: number) {
  c.save();
  clipBehindActor(c, clothes, pose, facing, step);
  for (const part of parts) {
    if (part.layer !== "underArm") continue;
    c.save();
    c.translate(part.mirror ? part.x + part.w : part.x, part.y);
    if (part.mirror) c.scale(-1,1);
    if (part.style === "straps") drawBagStraps(c, part, facing);
    else drawBagBody(c, part, facing);
    c.restore();
  }
  c.restore();
}
