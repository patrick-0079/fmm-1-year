import { drawAvatar } from "../src/avatar";
import { ITEMS, type ItemId } from "../src/items";
import type { AvatarPose, Facing } from "../src/equipment";
import sprite from "../src/assets/nemu-sprites.webp";
import rest from "../src/assets/fufu-rest-poses.webp";
import wreath from "../src/assets/flower-wreath.webp";
import rewards from "../src/assets/reward-icons.webp";
import { drawItem, whenWardrobeReady } from "../src/item-art";
import { prepareSceneArt } from "../src/scene-art";
import shoes from "../src/assets/fufu-footwear-v14.webp";
import garments from "../src/assets/fufu-garments-v15.webp";
import type { Equipped } from "../src/items";
const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = src;
  });
const [a, b, c, d] = await Promise.all(
  [sprite, rest, wreath, rewards, shoes, garments].map(load),
);
const images = { sprite: a, rest: b, wreath: c, rewards: d };
await Promise.all([prepareSceneArt("ruins"), new Promise<void>(whenWardrobeReady)]);

const bagRows = document.querySelector<HTMLTableSectionElement>("#backpacks tbody")!;
for (const backpack of ["moonBag", "berryBag", "rabbitSatchel"] as const) {
  const row = bagRows.insertRow();
  const name = document.createElement("th");
  name.scope = "row";
  name.textContent = ITEMS[backpack].name;
  row.append(name);
  for (const facing of [1, 2] as const) {
    for (let frame = 0; frame < 3; frame++) {
      const canvas = document.createElement("canvas");
      canvas.width = 108;
      canvas.height = 144;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(54, 136);
      ctx.scale(3, 3);
      drawAvatar(ctx, "standing", facing, frame, { backpack }, images);
      row.insertCell().append(canvas);
    }
  }
}
const cloth = document.querySelector<HTMLCanvasElement>("#garments")!.getContext("2d")!;
cloth.fillStyle="#e4e7d5"; cloth.fillRect(0,0,1176,440); cloth.imageSmoothingEnabled=false;
const outfits: Equipped[] = [{},{clothes:"roseDress"},{clothes:"mintCape"},{clothes:"mintCape",backpack:"rabbitSatchel",head:"headphones",shoes:"starShoes"}];
outfits.forEach((outfit,row) => {
  for(let frame=0;frame<14;frame++) {
    const sleeping=frame===13, zoom=sleeping ? 1.12 : 2.25;
    cloth.save(); cloth.translate(frame*84+42,row*110+(sleeping?77:103)); cloth.scale(zoom,zoom);
    drawAvatar(cloth,sleeping?"lying":frame===12?"sitting":"standing",(Math.floor(frame/3)%4) as Facing,frame%3,outfit,images);
    cloth.restore();
  }
});
const steps = document.querySelector<HTMLCanvasElement>("#footsteps")!.getContext("2d")!;
steps.fillStyle = "#e8e6d2"; steps.fillRect(0,0,1092,350);
steps.imageSmoothingEnabled = false;
for (const [row, pair] of ([null,"ribbonShoes","starShoes"] as const).entries()) {
  for (let frame = 0; frame < 13; frame++) {
    const x = frame * 84 + 42, y = row * 115 + 104;
    steps.save(); steps.translate(x,y); steps.scale(2.25,2.25);
    drawAvatar(steps, frame === 12 ? "sitting" : "standing", (Math.floor(frame / 3) % 4) as Facing, frame % 3, { shoes: pair }, images);
    steps.restore();
  }
}
const poses: [string, AvatarPose, Facing][] = [
  ["正面", "standing", 0],
  ["向左", "standing", 1],
  ["向右", "standing", 2],
  ["背面", "standing", 3],
  ["坐下", "sitting", 0],
  ["睡觉 · 无饰品", "lying", 0],
];
const catalog = document.querySelector<HTMLCanvasElement>("#catalog")!.getContext("2d")!;
const catalogRows=Math.ceil(Object.keys(ITEMS).length/2);
catalog.canvas.height=catalogRows*90;
catalog.fillStyle="#e6e9d9"; catalog.fillRect(0,0,catalog.canvas.width,catalog.canvas.height); catalog.imageSmoothingEnabled=false;
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
    drawAvatar(ctx, pose, facing, 0, { [item.slot]: id as ItemId }, images);
    if (item.slot === "pet" && pose !== "lying")
      drawItem(ctx, id as ItemId, 16, -18, 20, 19);
    const index=Object.keys(ITEMS).indexOf(id), column=poses.findIndex(p=>p[0]===label);
    const x=Math.floor(index/catalogRows)*576, y=(index%catalogRows)*90;
    if (!column) {
      catalog.fillStyle="#685663"; catalog.font="12px sans-serif"; catalog.fillText(item.name,x+6,y+13);
    }
    catalog.drawImage(canvas,x+column*93+7,y+13,79,77);
  }
