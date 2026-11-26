import { drawItem, wardrobeUrl } from "./item-art";
import garmentUrl from "./assets/fufu-garments.webp";
import footwearUrl from "./assets/fufu-footwear.webp";
import { equipmentParts, type AvatarPose, type Facing, type EquipmentPart } from "./equipment";
import { artScale, cellWidth, cellHeight, footStripHeight, costumeFrame, outfitIndex, poseFrame } from "./costume-frames";
import type { Equipped } from "./items";
import { sceneImage } from "./texture-cache";
import { drawWornBags } from "./worn-bags";

export const avatarUrls = [garmentUrl, footwearUrl, wardrobeUrl];
const footwear = sceneImage(footwearUrl), garments = sceneImage(garmentUrl);
export function whenAvatarLayersReady(refresh: () => void) {
  for (const sheet of [footwear, garments]) {
    if (!sheet.naturalWidth) sheet.addEventListener("load", refresh, {once:true});
  }
}
function paintPart(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  c.save();
  if (p.style === "wreathFar" || p.style === "wreathNear") {
    const far = p.style === "wreathFar", split = p.h*.42;
    c.translate(p.mirror ? p.x+p.w : p.x, p.y);
    if (p.mirror) c.scale(-1,1);
    c.beginPath(); c.rect(0,far ? 0 : split,p.w,far ? split : p.h-split); c.clip();
    drawItem(c,p.id,0,0,p.w,p.h,false);
  } else if (p.style === "rearBand" || p.style === "rearEarpieces") {
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
  } else if (p.style === "band" || p.style === "earpieces") {
    c.translate(0,p.y);
    const profile = facing === 1 || facing === 2;
    if (facing === 2) c.scale(-1,1);
    if (p.style === "band") {
      c.beginPath();
      if (profile) {
        c.moveTo(7.4, 8.3); c.bezierCurveTo(7, -1.8, -3.4, -2, -1.5, 12);
      } else {
        c.moveTo(-10.6, 12.2); c.bezierCurveTo(-11,-1.6,10,-1.6,10.6,12.2);
      }
      c.lineCap = "round";
      c.lineWidth = 2.3; c.strokeStyle = "#775971"; c.stroke();
      c.lineWidth = 1.25; c.strokeStyle = "#dcb7d4"; c.stroke();
    } else for (const x of profile ? [-1.5] : [-10.5,10.5]) {
      const y=12.5, width=profile ? 3.15 : 2.05;
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
    if (p.style === "hat") {
      drawItem(c, (["hatFront", "hatLeft", "hatRight", "hatRear"] as const)[facing], 0, 0, p.w, p.h);
    } else if (p.style === "pinEdge") {
      // Seen edge-on, only the setting catches the light on her left lapel.
      c.rotate(.25);
      c.fillStyle = "#805a53";
      c.beginPath(); c.roundRect(0, 0, p.w, p.h, p.w/2); c.fill();
      c.fillStyle = p.id === "anniversaryPin" ? "#edbb71" : "#d99979";
      c.fillRect(.35, .35, .65, p.h - 1.0);
    } else {
      drawItem(c,p.id,0,0,p.w,p.h);
    }
  }
  c.restore();
}

export function drawAvatar(c: CanvasRenderingContext2D, pose: AvatarPose, facing: Facing,
  step: number, equipped: Equipped) {
  if (!garments.naturalWidth) return;
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  if (pose !== "standing") facing = 0;
  const frame = poseFrame(pose, facing, step), outfit = outfitIndex(equipped.clothes);
  const f = costumeFrame(outfit,frame), w=f.w/artScale, h=f.h/artScale;
  const x=-w/2, y=pose === "lying" ? -h/2 : -h;
  const parts=equipmentParts(equipped,pose,facing,step);
  for (const part of parts) if (part.layer === "behind") paintPart(c,part,facing);
  const shoes = pose !== "lying" && footwear.naturalWidth && (equipped.shoes === "ribbonShoes" || equipped.shoes === "starShoes");
  const bodyHeight = shoes ? cellHeight-footStripHeight : cellHeight;
  const hat = parts.find(p => p.style === "hat");
  // Tuck the loose curl inside the crown. The cut lies underneath the hatband.
  const tucked = hat ? Math.max(0, Math.round((hat.y + hat.h * .73 - y) * artScale)) : 0;
  c.drawImage(garments,f.x,f.y+tucked,f.w,bodyHeight-tucked,x,y+tucked/artScale,w,(bodyHeight-tucked)/artScale);
  if (shoes) {
    const row=outfit*2+Number(equipped.shoes === "starShoes");
    c.drawImage(footwear,frame*cellWidth,row*footStripHeight,cellWidth,footStripHeight,
      x,-footStripHeight/artScale,w,footStripHeight/artScale);
  }
  if (parts.some(part => part.layer === "underArm")) drawWornBags(c, parts, equipped.clothes, pose, facing, step);
  for (const part of parts) if (part.layer === "front") paintPart(c,part,facing);
  if (pose === "lying") {
    c.fillStyle = "#a999c9";
    c.font = '8px "Microsoft YaHei", sans-serif'; c.fillText("z",24,-23);
    c.font = '6px "Microsoft YaHei", sans-serif'; c.fillText("z",31,-30);
  }
  c.restore();
}
