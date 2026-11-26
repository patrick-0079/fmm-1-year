import { drawItem, wardrobeUrl } from "./item-art";
import garmentUrl from "./assets/fufu-garments.webp";
import footwearUrl from "./assets/fufu-footwear.webp";
import { equipmentParts, type AvatarPose, type Facing, type EquipmentPart } from "./equipment";
import { artScale, cellWidth, cellHeight, footStripHeight, costumeFrame, outfitIndex, poseFrame } from "./costume-frames";
import type { Equipped } from "./items";
import { sceneImage } from "./texture-cache";

export const avatarUrls = [garmentUrl, footwearUrl, wardrobeUrl];
const footwear = sceneImage(footwearUrl), garments = sceneImage(garmentUrl);
export function whenAvatarLayersReady(refresh: () => void) {
  for (const sheet of [footwear, garments]) {
    if (!sheet.naturalWidth) sheet.addEventListener("load", refresh, {once:true});
  }
}
function paintPart(c: CanvasRenderingContext2D, p: EquipmentPart, facing: Facing) {
  c.save();
  if (p.style === "straps") {
    c.lineCap = "round";
    c.strokeStyle = p.id === "berryBag" ? "#aa656f" : p.id === "rabbitSatchel" ? "#797956" : "#997b9e";
    c.lineWidth = 1.05;
    c.beginPath();
    if (p.id === "rabbitSatchel") {
      c.moveTo(-4.4,p.y); c.quadraticCurveTo(-1.3,p.y+5,6,p.y+9);
    } else for (const side of [-1,1]) {
      c.moveTo(side*4.3,p.y); c.quadraticCurveTo(side*7.1,p.y+3,side*5.8,p.y+7.1);
    }
    c.stroke();
  } else if (p.style === "wreathFar" || p.style === "wreathNear") {
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
      const view = facing === 3 ? "witchHatBack" : facing === 0 ? "witchHat" : "witchHatProfile";
      drawItem(c,view,0,0,p.w,p.h,false);
    } else {
      const id = p.id === "rabbitSatchel" && p.style === "bag" ? "rabbitPouch" : p.id;
      drawItem(c,id,0,0,p.w,p.h);
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
  c.drawImage(garments,f.x,f.y,f.w,bodyHeight,x,y,w,bodyHeight/artScale);
  if (shoes) {
    const row=outfit*2+Number(equipped.shoes === "starShoes");
    c.drawImage(footwear,frame*cellWidth,row*footStripHeight,cellWidth,footStripHeight,
      x,-footStripHeight/artScale,w,footStripHeight/artScale);
  }
  for (const part of parts) if (part.layer === "front") paintPart(c,part,facing);
  if (pose === "lying") {
    c.fillStyle = "#a999c9";
    c.font = '8px "Microsoft YaHei", sans-serif'; c.fillText("z",24,-23);
    c.font = '6px "Microsoft YaHei", sans-serif'; c.fillText("z",31,-30);
  }
  c.restore();
}
