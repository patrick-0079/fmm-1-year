import { spriteFrames } from "./sprite-frames";
import { drawItem } from "./item-art";
import {
  equipmentParts,
  type AvatarPose,
  type Facing,
  type EquipmentPart,
} from "./equipment";
import type { EquipSlot, ItemId } from "./items";
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
) {
  c.save();
  if (p.style === "band" || p.style === "earpieces") {
    c.translate(0, p.y + 2);
    if (p.style === "band") {
      c.fillStyle = "#806185";
      c.fillRect(-8, -2, 16, 3);
      c.fillRect(-11, 0, 4, 4);
      c.fillRect(7, 0, 4, 4);
      c.fillRect(-13, 3, 3, 9);
      c.fillRect(10, 3, 3, 9);
      c.fillStyle = "#d8c3e5";
      c.fillRect(-7, -2, 14, 2);
      c.fillRect(-10, 0, 2, 4);
      c.fillRect(8, 0, 2, 4);
      c.fillRect(-12, 4, 1, 7);
      c.fillRect(11, 4, 1, 7);
      c.fillStyle = "#f4d48e";
      c.fillRect(-2, -3, 4, 3);
    } else {
      const sides = facing === 1 ? [5] : facing === 2 ? [-10] : [-15, 10];
      for (const x of sides) {
        c.fillStyle = "#826081";
        c.fillRect(x + 1, 10, 4, 11);
        c.fillRect(x, 12, 6, 7);
        c.fillStyle = "#d7b5d9";
        c.fillRect(x + 1, 12, 4, 7);
        c.fillStyle = "#ffe3a0";
        c.fillRect(x + 2, 13, 2, 5);
        c.fillRect(x + 1, 15, 4, 1);
      }
    }
  } else if (p.style === "straps") {
    c.fillStyle = "#d7b68d";
    c.fillRect(p.x, p.y, 2, p.h);
    c.fillRect(p.x + p.w - 2, p.y, 2, p.h);
    c.fillStyle = "#f9dfab";
    c.fillRect(p.x, p.y + 6, 3, 2);
    c.fillRect(p.x + p.w - 3, p.y + 6, 3, 2);
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
  equipped: Record<EquipSlot, ItemId | null>,
  images: AvatarImages,
) {
  const parts = equipmentParts(equipped, pose, facing);
  for (const p of parts.filter((p) => p.layer === "behind"))
    paintPart(c, p, facing, images);
  if (pose === "standing") {
    const f = spriteFrames[facing * 3 + walkFrame],
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
    paintPart(c, p, facing, images);
}
