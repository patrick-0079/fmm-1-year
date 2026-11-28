import { avatarUrls, drawAvatar } from "../src/avatar";
import { footwearIds, outfits, type AvatarPose, type Facing } from "../src/costume-frames";
import { equipmentParts } from "../src/equipment";
import { ITEMS, type Equipped, type ItemId } from "../src/items";
import { drawItem, wardrobeUrl } from "../src/item-art";
import iconFrames from "../src/wardrobe-icons.json";
import { loadSceneImage, sceneImage } from "../src/texture-cache";
import { backpacks } from "./bag-fitting-cases";

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
      ctx.scale(2,2);
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
for (const backpack of backpacks) {
  const section = document.createElement("section");
  section.id = "fit-" + backpack;
  const title = document.createElement("h3");
  title.textContent = ITEMS[backpack].name;
  section.append(title);
  document.getElementById("bag-fits")!.append(section);
  const addFit = table(section.id);
  for (const clothes of outfits)
    addFit(clothes ? ITEMS[clothes].name : "原版淡紫睡衣", {clothes, backpack});
}
headRow("摘下头饰和发夹",{});
shoeRow("原鞋",{});
for (const id of Object.keys(ITEMS) as ItemId[]) {
  const item=ITEMS[id], worn={[item.slot]:id};
  if (item.slot==="head" || item.slot==="hair") headRow(item.name,worn,id);
  if (item.slot==="hair") headRow("花环 × "+item.name,{head:"wreath",hair:id});
  if (item.slot==="backpack" || item.slot==="body") bagRow(item.name,worn,id);
  if (item.slot==="shoes") shoeRow(item.name,worn,id);
  if (item.slot==="pet") mixRow(item.name,worn,id);
}
for (const [i,clothes] of outfits.entries()) {
  mixRow(clothes ? ITEMS[clothes].name : "原版淡紫睡衣", {
    clothes, hair:(["heartClip","fishClip","starClip"] as const)[i%3],
    head:clothes === "witchDress" ? "witchHat" : (["headphones","wreath"] as const)[i%2],
    backpack:(["moonBag","rabbitSatchel","berryBag"] as const)[i%3], shoes:i%2 ? "ribbonShoes" : "starShoes",
    body:i%2 ? "echoBrooch" : "anniversaryPin",
  });
}
mixRow("月灯女巫套装",{clothes:"witchDress",head:"witchHat",hair:"heartClip"}).id = "witch-set";
document.body.dataset.ready="true";

export function verifyWornViews() {
  const atlas = sceneImage(wardrobeUrl);
  const canvas=document.createElement("canvas");
  canvas.width=116; canvas.height=108;
  const c=canvas.getContext("2d",{willReadFrequently:true})!;
  const paint=(pose:AvatarPose, facing:Facing, step:number, worn:Equipped) => {
    c.clearRect(0,0,canvas.width,canvas.height);
    c.save(); c.translate(58,pose==="lying" ? 60 : 101); c.scale(2,2);
    drawAvatar(c,pose,facing,step,worn); c.restore();
    return new Uint32Array(c.getImageData(0,0,canvas.width,canvas.height).data.buffer);
  };
  const pinsAndClips = (Object.keys(ITEMS) as ItemId[]).filter(id=>["hair","body"].includes(ITEMS[id].slot));
  const hairClips = pinsAndClips.filter(id => ITEMS[id].slot === "hair");
  const wreathViews = ["wreathFront","wreathLeft","wreathRight","wreathRear"] as const;
  for (const clothes of outfits) for (const {pose,facing,step,name} of poses) {
    const bare=paint(pose,facing,step,{clothes});
    const differs=(worn:Equipped)=>{
      const next=paint(pose,facing,step,{clothes,...worn});
      return next.some((pixel,i)=>pixel!==bare[i]);
    };
    const check=(ok:boolean,id:ItemId)=>{if (!ok) throw Error(`${clothes ?? "原装"} · ${name} · ${ITEMS[id].name} 显隐错误`);};
    for (const id of pinsAndClips) {
      const slot=ITEMS[id].slot;
      const visible=pose==="lying" ? slot==="hair" : facing===0 || facing===1;
      check(differs({[slot]:id})===visible,id);
    }
    check(differs({head:"witchHat"})===(pose!=="lying"),"witchHat");
    const shoeViews = new Set<string>();
    for (const shoes of footwearIds) {
      check(differs({shoes}) === (pose !== "lying"), shoes);
      if (pose !== "lying") shoeViews.add(canvas.toDataURL());
    }
    if (pose !== "lying" && shoeViews.size !== footwearIds.length) throw Error(name+" · 两双鞋用了同一帧");
    for (const hair of hairClips) {
      const layers: Equipped = {clothes,head:"wreath",hair};
      const actual = paint(pose,facing,step,layers);
      const under = paint(pose,facing,step,{clothes,hair});
      if (pose === "lying") { check(actual.every((p,i)=>p===under[i]),"wreath"); continue; }
      const crown = equipmentParts(layers,pose,facing,step).find(part=>part.id==="wreath")!;
      const [sx,sy,sw,sh] = iconFrames[wreathViews[facing]];
      const scale = Math.min(crown.w/sw,crown.h/sh), w = sw*scale, h = sh*scale;
      c.save(); c.translate(58,101); c.scale(2,2);
      c.imageSmoothingQuality = "high";
      // Recompose from the native aspect ratio independently of the item renderer.
      c.drawImage(atlas,sx,sy,sw,sh,crown.x+(crown.w-w)/2,crown.y+(crown.h-h)/2,w,h);
      c.restore();
      const expected = new Uint32Array(c.getImageData(0,0,canvas.width,canvas.height).data.buffer);
      check(actual.some((p,i)=>p!==under[i]) && actual.every((p,i)=>p===expected[i]),"wreath");
    }
    if (pose==="standing" && facing>=2) {
      const hat=paint(pose,facing,step,{clothes,head:"witchHat"});
      const clipped=paint(pose,facing,step,{clothes,head:"witchHat",hair:"heartClip"});
      check(hat.every((pixel,i)=>pixel===clipped[i]),"heartClip");
    }
  }
  return outfits.length * poses.length;
}
