import { avatarUrls, drawAvatar } from "../src/avatar";
import { outfits, type AvatarPose, type Facing } from "../src/costume-frames";
import { ITEMS, type Equipped, type ItemId } from "../src/items";
import { drawItem } from "../src/item-art";
import { loadSceneImage } from "../src/texture-cache";

await Promise.all(avatarUrls.map(loadSceneImage));
const poses: {pose: AvatarPose; facing: Facing; step: number; name: string}[] = [];
for (const [facing, direction] of ["正面","向左","向右","背面"].entries())
  for (const [step, action] of ["待机","迈步一","迈步二"].entries())
    poses.push({pose:"standing",facing:facing as Facing,step,name:direction+" · "+action});
poses.push({pose:"sitting",facing:0,step:0,name:"花海坐地"}, {pose:"bench",facing:0,step:0,name:"长椅落座"},
  {pose:"lying",facing:0,step:0,name:"床上侧卧"});

function table(id: string) {
  const element=document.createElement("table");
  const head=element.createTHead().insertRow();
  for (const word of ["穿搭",...poses.map(p=>p.name)]) {
    const label=document.createElement("th"); label.scope="col"; label.textContent=word; head.append(label);
  }
  const rows=element.createTBody();
  document.getElementById(id)!.append(element);
  return (name:string, worn: Equipped, icon?:ItemId) => {
    const row=rows.insertRow(); const label=document.createElement("th");
    if (worn.clothes) row.dataset.outfit = worn.clothes;
    label.scope="row"; label.textContent=name; row.append(label);
    if (icon) {
      const c=document.createElement("canvas"); c.width=80; c.height=48;
      drawItem(c.getContext("2d")!,icon,16,0,48,48); label.append(c);
    }
    for (const p of poses) {
      const canvas=document.createElement("canvas");
      canvas.width=p.pose==="lying" ? 145 : 88; canvas.height=104;
      const ctx=canvas.getContext("2d")!;
      ctx.translate(canvas.width/2,p.pose==="lying" ? 61 : 98);
      const zoom = worn.head === "witchHat" && p.pose !== "lying" ? 1.8 : 2;
      ctx.scale(zoom,zoom);
      drawAvatar(ctx,p.pose,p.facing,p.step,worn);
      if (worn.pet && p.pose!=="lying") drawItem(ctx,worn.pet,8,-12,13,12);
      canvas.dataset.pose=p.pose;
      canvas.setAttribute("aria-label",name+" · "+p.name);
      row.insertCell().append(canvas);
    }
    return row;
  };
}
const bodyRow=table("outfits"), headRow=table("headwear"), bagRow=table("backpacks");
const shoeRow=table("footsteps"), mixRow=table("catalog");
for (const clothes of outfits)
  bodyRow(clothes ? ITEMS[clothes].name : "原版淡紫睡衣",{clothes},clothes ?? undefined);
headRow("摘下头饰和发夹",{});
shoeRow("原鞋",{});
for (const id of Object.keys(ITEMS) as ItemId[]) {
  const item=ITEMS[id], worn={[item.slot]:id};
  if (item.slot==="head" || item.slot==="hair") headRow(item.name,worn,id);
  if (item.slot==="backpack" || item.slot==="body") bagRow(item.name,worn,id);
  if (item.slot==="shoes") shoeRow(item.name,worn,id);
  if (item.slot==="pet") mixRow(item.name,worn,id);
}
for (const [i,clothes] of outfits.entries()) {
  mixRow(clothes ? ITEMS[clothes].name : "原版淡紫睡衣", {
    clothes, hair:(["heartClip","fishClip","starClip"] as const)[i%3], head:clothes === "witchDress" ? "witchHat" : i%2 ? "wreath" : "headphones",
    backpack:(["moonBag","rabbitSatchel","berryBag"] as const)[i%3], shoes:i%2 ? "ribbonShoes" : "starShoes",
    body:i%2 ? "echoBrooch" : "anniversaryPin",
  });
}
mixRow("月灯女巫套装",{clothes:"witchDress",head:"witchHat",hair:"heartClip"}).id = "witch-set";
document.body.dataset.ready="true";
