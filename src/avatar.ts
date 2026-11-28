import { drawItem, wardrobeUrl, type WardrobeArt } from "./item-art";
import garmentUrl from "./assets/fufu-garments.webp";
import footwearUrl from "./assets/fufu-footwear.webp";
import jewelryUrl from "./assets/worn-jewelry.webp";
import { equipmentParts, type AvatarPose, type Facing, type EquipmentPart } from "./equipment";
import { artScale, cellWidth, cellHeight, footStripHeight, footwearIds, costumeFrame, outfitIndex, poseFrame } from "./costume-frames";
import type { Equipped, ItemId } from "./items";
import { sceneImage } from "./texture-cache";
import { drawWornBags } from "./worn-bags";
import { campHeadFrame, drawCampExpression, type CampAvatarPose } from "./camp-costumes";
import { campHeadOffsets } from "./camp-expression-cels";

export const avatarUrls = [garmentUrl, footwearUrl, wardrobeUrl, jewelryUrl];
const footwear = sceneImage(footwearUrl), garments = sceneImage(garmentUrl);
const jewelry = sceneImage(jewelryUrl);
const jewelryCells: Partial<Record<ItemId, number>> = {
  anniversaryPin: 0, echoBrooch: 1, leafPin: 2, tulipPin: 3, shellPin: 4,
  candyClip: 5, fishClip: 6, starClip: 7, starWings: 8, heartClip: 9,
};
const headwearViews: Partial<Record<ItemId, readonly [WardrobeArt, WardrobeArt, WardrobeArt, WardrobeArt]>> = {
  wreath: ["wreathFront", "wreathLeft", "wreathRight", "wreathRear"],
  witchHat: ["hatFront", "hatLeft", "hatRight", "hatRear"],
  blueBeret: ["blueBeret", "beretSide", "beretSide", "beretRear"],
  ginghamBand: ["ginghamBand", "ginghamSide", "ginghamSide", "ginghamRear"],
  strawHat: ["strawHat", "strawSide", "strawSide", "strawRear"],
};
export function whenAvatarLayersReady(refresh: () => void) {
  for (const sheet of [footwear, garments, jewelry]) {
    if (!sheet.naturalWidth) sheet.addEventListener("load", refresh, {once:true});
  }
}
function paintPart(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  c.save();
  if (p.style === "rearBand" || p.style === "rearEarpieces") {
    c.translate(0, p.y);
    if (p.style === "rearBand") {
      c.beginPath(); c.moveTo(-10.8, 11.3);
      c.bezierCurveTo(-11.4, -1.5, 10.7, -1.5, 10.8, 11.3);
      c.lineCap = "round";
      c.lineWidth = 1.8; c.strokeStyle = "#80627f"; c.stroke();
      c.lineWidth = .8; c.strokeStyle = "#d4b8d3"; c.stroke();
    } else for (const side of [-1, 1]) {
      // Only the narrow rear shells are visible, not the front heart pads.
      const x = side * 10.9;
      c.fillStyle = "#795d79";
      c.beginPath(); c.ellipse(x, 12.2, 1.7, 3.8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#b69cbd";
      c.beginPath(); c.ellipse(x + side * .3, 12.05, 1.05, 3.05, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#eed5dc"; c.lineWidth = .55;
      c.beginPath(); c.moveTo(x + side * .65, 10.6); c.lineTo(x + side * .65, 13.2); c.stroke();
    }
  } else if (p.style === "profileBand" || p.style === "profileCup") {
    c.translate(p.mirror ? p.x + p.w : p.x, p.y);
    if (p.mirror) c.scale(-1, 1);
    c.lineJoin = "round";
    if (p.style === "profileBand") {
      // In profile the far side disappears at the crown. Only the strap
      // leading from behind the cowlick down to the near hinge is visible.
      c.beginPath();
      c.moveTo(.25, .65);
      c.quadraticCurveTo(.9, .16, 1.9, .25);
      c.bezierCurveTo(4, 2.15, 4.9, 6.25, 4.95, 9.3);
      c.lineTo(3.05, 9.45);
      c.bezierCurveTo(3.04, 6.15, 2.25, 2.7, .25, .65);
      c.closePath();
      c.fillStyle = "#c5a1c4"; c.fill();
      c.lineWidth = .48; c.strokeStyle = "#78586e"; c.stroke();
    } else {
      // The pale cushion is just visible ahead of the broad outer housing.
      c.beginPath(); c.ellipse(4.15, 3.9, 3.94, 3.64, -.12, 0, 2*Math.PI);
      c.fillStyle = "#f6ddbc"; c.fill();
      c.lineWidth = .55; c.strokeStyle = "#77576c"; c.stroke();
      c.beginPath(); c.ellipse(4.65, 3.75, 3.23, 3.27, -.12, 0, 2*Math.PI);
      c.fillStyle = "#bea0c6"; c.fill();
      c.lineWidth = .42; c.strokeStyle = "#805e78"; c.stroke();
      c.beginPath();
      c.moveTo(4.68, 1.63); c.quadraticCurveTo(5.13, 3.19, 6.72, 3.73);
      c.quadraticCurveTo(5.17, 4.19, 4.68, 5.83);
      c.quadraticCurveTo(4.22, 4.22, 2.68, 3.73);
      c.quadraticCurveTo(4.20, 3.20, 4.68, 1.63); c.closePath();
      c.fillStyle = "#ffe5a9"; c.fill();
      c.lineWidth = .28; c.strokeStyle = "#997384"; c.stroke();
    }
  } else if (p.style === "band" || p.style === "earpieces") {
    c.translate(0,p.y);
    if (p.style === "band") {
      c.beginPath();
      c.moveTo(-10.6, 12.2); c.bezierCurveTo(-11,-1.6,10,-1.6,10.6,12.2);
      c.lineCap = "round";
      c.lineWidth = 2.3; c.strokeStyle = "#775971"; c.stroke();
      c.lineWidth = 1.25; c.strokeStyle = "#dcb7d4"; c.stroke();
    } else for (const x of [-10.5,10.5]) {
      const y=12.5, width=2.05;
      c.fillStyle="#78586e"; c.beginPath(); c.ellipse(x,y,width,4.2,0,0,Math.PI*2); c.fill();
      c.fillStyle="#c4a8d0"; c.beginPath(); c.ellipse(x,y-.15,width-.55,3.5,0,0,Math.PI*2); c.fill();
      c.fillStyle="#fff0cc";
      c.beginPath(); c.moveTo(x,y-2); c.lineTo(x+.5,y-.5); c.lineTo(x+1.6,y);
      c.lineTo(x+.5,y+.5); c.lineTo(x,y+2); c.lineTo(x-.5,y+.5);
      c.lineTo(x-1.6,y); c.lineTo(x-.5,y-.5); c.closePath(); c.fill();
    }
  } else {
    c.translate(p.mirror ? p.x+p.w : p.x, p.y);
    if (p.mirror) c.scale(-1,1);
    if (p.style === "pinEdge") {
      // Seen edge-on, only the setting catches the light on her left lapel.
      c.rotate(.25);
      c.fillStyle = "#805a53";
      c.beginPath(); c.roundRect(0, 0, p.w, p.h, p.w/2); c.fill();
      c.fillStyle = p.id === "echoBrooch" ? "#d99979" : "#edbb71";
      c.fillRect(.35, .35, .65, p.h - 1.0);
    } else {
      const cell = jewelryCells[p.id];
      if (cell !== undefined && jewelry.naturalWidth) {
        c.drawImage(jewelry, cell % 5 * 40, Math.floor(cell / 5) * 40, 40, 40, 0, 0, p.w, p.h);
      } else {
        drawItem(c,headwearViews[p.id]?.[facing] ?? p.id,0,0,p.w,p.h);
      }
    }
  }
  c.restore();
}

export function drawAvatar(c: CanvasRenderingContext2D, pose: AvatarPose, facing: Facing,
  step: number, equipped: Equipped, campPose?: CampAvatarPose) {
  if (!garments.naturalWidth) return;
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  if (pose !== "standing") facing = 0;
  const frame = poseFrame(pose, facing, step), outfit = outfitIndex(equipped.clothes);
  const f = costumeFrame(outfit,frame), w=f.w/artScale, h=f.h/artScale;
  const x=-w/2, y=pose === "lying" ? -h/2 : -h;
  const parts=equipmentParts(equipped,pose,facing,step);
  const head = pose === "sitting" ? campPose?.head ?? "neutral" : "neutral";
  const headFrame = campHeadFrame(head,outfit);
  const [px,py] = campHeadOffsets[headFrame ? head : "neutral"];
  const dx = px/artScale, dy = py/artScale;
  const shoeIndex = pose !== "lying" && footwear.naturalWidth ? footwearIds.findIndex(id => id === equipped.shoes) : -1;
  const bodyHeight = shoeIndex >= 0 ? cellHeight-footStripHeight : cellHeight;
  const hat = parts.find(p => p.style === "hat");
  if (hat) {
    // Only the central cowlick tucks into a cap. Keep the silhouette of the
    // fringe visible below a tilted beret or the raised edge of a brim.
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.rect(hat.x+hat.w/2-5.5+dx, y, 11, hat.y+hat.h*.69+dy-y);
    c.clip("evenodd");
  }
  c.drawImage(headFrame?.image ?? garments,headFrame?.x ?? f.x,headFrame?.y ?? f.y,f.w,bodyHeight,x,y,w,bodyHeight/artScale);
  if (pose === "sitting" && campPose) drawCampExpression(c,campPose.expression,outfit,dx,dy);
  if (hat) c.restore();
  if (shoeIndex >= 0) {
    const row=outfit*footwearIds.length+shoeIndex;
    c.drawImage(footwear,frame*cellWidth,row*footStripHeight,cellWidth,footStripHeight,
      x,-footStripHeight/artScale,w,footStripHeight/artScale);
  }
  if (parts.some(part => part.layer === "underArm")) drawWornBags(c, parts, equipped.clothes, pose, facing, step);
  for (const part of parts) {
    if (part.layer !== "front") continue;
    if (headFrame && (part.id === equipped.head || part.id === equipped.hair)) {
      c.save(); c.translate(dx,dy); paintPart(c,part,facing); c.restore();
    } else paintPart(c,part,facing);
  }
  if (pose === "lying") {
    c.fillStyle = "#a999c9";
    c.font = '8px "Microsoft YaHei", sans-serif'; c.fillText("z",24,-23);
    c.font = '6px "Microsoft YaHei", sans-serif'; c.fillText("z",31,-30);
  }
  c.restore();
}
