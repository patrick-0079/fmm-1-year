import { spriteFrames } from "./sprite-frames";
import { drawItem, drawWornBag } from "./item-art";
import garmentUrl from "./assets/fufu-garments-v15.webp";
import {
  equipmentParts,
  type AvatarPose,
  type Facing,
  type EquipmentPart,
} from "./equipment";
import type { Equipped } from "./items";
import footwearUrl from "./assets/fufu-footwear-v14.webp";
const footwear = new Image();
footwear.src = footwearUrl;
const garments = new Image();
garments.src = garmentUrl;
export function whenAvatarLayersReady(refresh: () => void) {
  for (const sheet of [footwear, garments]) {
    if (!sheet.complete) sheet.addEventListener("load", refresh, { once: true });
  }
}
export interface AvatarImages {
  sprite: HTMLImageElement;
  rest: HTMLImageElement;
  wreath: HTMLImageElement;
  rewards: HTMLImageElement;
}

function paintPart(
  c: CanvasRenderingContext2D,
  p: EquipmentPart,
  facing: Facing,
  images: AvatarImages,
  frame: number,
) {
  c.save();
  if (p.style === "footwear") {
    if (footwear.complete && footwear.naturalWidth)
      c.drawImage(footwear, frame * 128, p.id === "starShoes" ? 40 : 0, 128, 40, p.x, p.y, p.w, p.h);
  } else if (p.style === "garment" || p.style === "straps") {
    const row = p.style === "straps" ? 2 : p.id === "roseDress" ? 0 : 1;
    if (garments.complete && garments.naturalWidth)
      c.drawImage(garments, frame * 128, row * 176, 128, 176, p.x, p.y, p.w, p.h);
  } else if (p.style === "bag") {
    drawWornBag(c, p, facing === 1 || facing === 2, images.rewards);
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
      c.fillStyle="#fff0cc"; c.beginPath(); c.ellipse(x+.1,y,width-.95,2.65,0,0,Math.PI*2); c.fill();
      c.fillStyle="#d28ca7"; c.fillRect(x-.9,y-.4,1.8,1.1); c.fillRect(x-.45,y+.65,.9,.65);
    }
  } else {
    if (p.mirror) {
      c.translate(p.x + p.w, p.y);
      c.scale(-1, 1);
      drawItem(c, p.id, 0, 0, p.w, p.h, images.wreath, images.rewards);
    } else drawItem(c, p.id, p.x, p.y, p.w, p.h, images.wreath, images.rewards);
  }
  c.restore();
}

export function drawAvatar(
  c: CanvasRenderingContext2D,
  pose: AvatarPose,
  facing: Facing,
  walkFrame: number,
  equipped: Equipped,
  images: AvatarImages,
) {
  if (pose === "sitting") facing = 0;
  const parts = equipmentParts(equipped, pose, facing, walkFrame);
  const frame = pose === "standing" ? facing * 3 + walkFrame : 12;
  for (const p of parts.filter((p) => p.layer === "behind"))
    paintPart(c, p, facing, images, frame);
  if (pose === "standing") {
    const f = spriteFrames[frame],
      scale = 43 / 330;
    c.drawImage(
      images.sprite,
      f.x,
      f.y,
      f.w,
      f.h,
      (-f.w * scale) / 2,
      -f.h * scale,
      f.w * scale,
      f.h * scale,
    );
  } else {
    const sleeping = pose === "lying";
    const f = sleeping
      ? { x: 754, y: 275, w: 966, h: 520 }
      : { x: 87, y: 88, w: 593, h: 733 };
    const width = sleeping ? 70 : 30,
      height = (width / f.w) * f.h;
    c.drawImage(
      images.rest,
      f.x,
      f.y,
      f.w,
      f.h,
      -width / 2,
      sleeping ? -height / 2 : -height,
      width,
      height,
    );
    if (sleeping) {
      c.fillStyle = "#a999c9";
      c.font = '8px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("z", 24, -23);
      c.font = '6px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("z", 31, -30);
    }
  }
  for (const p of parts.filter((p) => p.layer === "front"))
    paintPart(c, p, facing, images, frame);
}
