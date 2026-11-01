import { drawAvatar } from "../src/avatar";
import { ITEMS, type ItemId } from "../src/items";
import type { AvatarPose, Facing } from "../src/equipment";
import sprite from "../src/assets/nemu-sprites.webp";
import rest from "../src/assets/fufu-rest-poses.webp";
import wreath from "../src/assets/flower-wreath.webp";
import rewards from "../src/assets/reward-icons.webp";
const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = src;
  });
const [a, b, c, d] = await Promise.all(
  [sprite, rest, wreath, rewards].map(load),
);
const images = { sprite: a, rest: b, wreath: c, rewards: d };
const poses: [string, AvatarPose, Facing][] = [
  ["正面", "standing", 0],
  ["向左", "standing", 1],
  ["向右", "standing", 2],
  ["背面", "standing", 3],
  ["坐下", "sitting", 0],
  ["睡觉 · 无饰品", "lying", 0],
];
for (const [id, item] of Object.entries(ITEMS))
  for (const [label, pose, facing] of poses) {
    const card = document.createElement("article"),
      canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 175;
    canvas.setAttribute("aria-label", item.name + " · " + label);
    const name = document.createElement("small");
    name.textContent = item.name + " · " + label;
    card.append(name, canvas);
    document.querySelector("main")!.append(card);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(90, pose === "lying" ? 105 : 145);
    ctx.scale(pose === "lying" ? 2 : 2.5, pose === "lying" ? 2 : 2.5);
    drawAvatar(
      ctx,
      pose,
      facing,
      0,
      {
        head: item.slot === "head" ? (id as ItemId) : null,
        body: item.slot === "body" ? (id as ItemId) : null,
      },
      images,
    );
  }
