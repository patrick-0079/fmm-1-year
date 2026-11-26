import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { artScale, cellWidth, cellHeight, footStripHeight, footwearIds, outfits } from "../src/costume-frames.ts";
import { spriteFrames } from "../src/sprite-frames.ts";
import { filename, figures, master, output, raster, readSheet, transparent } from "./wardrobe-sheets.mjs";
import { shoeLayers } from "./build-shoes.mjs";

const heartMaster = filename(new URL("../doc/artwork/wardrobe/heart-clip.svg", import.meta.url));
const iconIndex = new URL("../src/wardrobe-icons.json", import.meta.url);
const catalogueHeartSize = {width:99, height:136};

function heartArt(width, height) {
  return sharp(heartMaster, {density:384})
    .resize(width, height, {fit:"contain", background:"#0000"}).ensureAlpha();
}

// Replace the whole rectangle, including the transparent hole, without
// subjecting any of the neighbouring sprites to a second lossy conversion.
async function updateWornHeart() {
  const file = output("worn-jewelry.webp");
  const left = 160, top = 40, width = 40, height = 40;
  const {data, info} = await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const tile = await heartArt(width, height).raw().toBuffer();
  let changed = false;
  for (let y = 0; y < height; y++) {
    const row = tile.subarray(y*width*4, (y+1)*width*4);
    const offset = ((top+y)*info.width + left)*4;
    if (!row.equals(data.subarray(offset, offset+row.length))) {
      row.copy(data, offset);
      changed = true;
    }
  }
  if (changed) {
    const result = await sharp(data, {raw:info}).webp({lossless:true, effort:6}).toBuffer();
    await writeFile(file, result);
  }
}

await updateWornHeart();

const designs = ["base", "rose", "mint", "cloud", "apricot", "sailor", "honey", "witch", "miko"];
if (designs.length !== outfits.length) throw new Error("Missing outfit artwork");
const bodies = [], shoes = [];
for (const [row, name] of designs.entries()) {
  const walk = figures(await readSheet(master(name+"-walk")), 3, 4);
  const rest = figures(await readSheet(master(name+"-rest")), 2, 2);
  const poses = [...walk, rest[2], rest[1], rest[3]];
  for (const [frame, f] of poses.entries()) {
    const sleeping = frame === 14;
    const cellW = sleeping ? 2*cellWidth : cellWidth;
    const maxHeight = frame < 12 ? spriteFrames[frame].h * 43 / 330 : [37,40,38][frame-12];
    const scale = Math.min(maxHeight*artScale/f.height, (cellW-4)/f.width);
    const w=Math.round(f.width*scale), h=Math.round(f.height*scale);
    const art = await raster(f).resize(w,h,{fit:"fill"}).png().toBuffer();
    const left=Math.round((cellW-w)/2), top=sleeping ? Math.round((cellHeight-h)/2) : cellHeight-h;
    bodies.push({input:art,left:frame*cellWidth+left,top:row*cellHeight+top});
    if (!sleeping) {
      const normalized = await transparent(cellWidth,cellHeight).composite([{input:art,left,top}]).raw().toBuffer();
      shoes.push(...await shoeLayers(normalized, row, frame));
    }
  }
}
await transparent(cellWidth*16, cellHeight*designs.length).composite(bodies)
  .webp({quality:93,alphaQuality:100,effort:6}).toFile(filename(output("fufu-garments.webp")));
await transparent(cellWidth*14, footStripHeight*footwearIds.length*designs.length).composite(shoes)
  .webp({quality:92,alphaQuality:100,effort:6}).toFile(filename(output("fufu-footwear.webp")));

const catalogueRows = [
  {sheet:"icons", columns:4, rows:4, names:["wreath","candyClip","headphones","starWings","roseDress","mintCape","ribbonShoes","starShoes",
   "moonBag","berryBag","rabbitSatchel","anniversaryPin","echoBrooch","petBunny","petCat"]},
  {sheet:"starter-icons", columns:4, rows:2, names:["cloudPajamas","apricotNightgown","sailorSet","honeyOveralls","heartClip","fishClip","starClip"]},
  {sheet:"witch-icons", columns:2, rows:2, names:["witchDress","witchHat"]},
  {sheet:"miko-icon", columns:1, rows:1, names:["mikoOutfit"]},
  {sheet:"worn-hat", columns:2, rows:2, names:["hatFront","hatLeft","hatRight","hatRear"]},
  {sheet:"worn-bags", columns:3, rows:2, names:["moonPackRear","berryPackRear","satchelFace","moonPackSide","berryPackSide","satchelEdge"]},
  {sheet:"worn-wreath", columns:2, rows:2, names:["wreathFront","wreathLeft","wreathRight","wreathRear"]},
  {sheet:"starter-headwear", columns:3, rows:3, names:["blueBeret","beretSide","beretRear","ginghamBand","ginghamSide","ginghamRear","strawHat","strawSide","strawRear"]},
  {sheet:"starter-bags-pins", columns:3, rows:3, names:["letterPack","bearPack","compassPack","letterPackSide","bearPackSide","compassPackSide","leafPin","tulipPin","shellPin"]},
  {sheet:"starter-footwear", columns:4, rows:3, names:[null,null,null,"mintSneakers",null,null,null,"honeyRainboots",null,null,null,"pennyLoafers"]},
];
const icons = [], bounds = {}, cell = 144, cols = 6;
for (const {sheet, columns, rows, names} of catalogueRows) {
  const isolated = figures(await readSheet(master(sheet)),columns,rows);
  for (const [index, id] of names.entries()) {
    if (!id) continue;
    const f = id === "heartClip" ? catalogueHeartSize : isolated[index];
    const factor=(cell-8)/Math.max(f.width,f.height);
    const w=Math.round(f.width*factor), h=Math.round(f.height*factor);
    const left=(icons.length%cols)*cell+4, top=Math.floor(icons.length/cols)*cell+4;
    const input = id === "heartClip" ? await heartArt(w,h).png().toBuffer()
      : await raster(f).resize(w,h,{fit:"fill"}).png().toBuffer();
    icons.push({input,left,top}); bounds[id]=[left,top,w,h];
  }
}
await transparent(cell*cols,cell*Math.ceil(icons.length/cols)).composite(icons)
  .webp({quality:94,alphaQuality:100,effort:6}).toFile(filename(output("wardrobe-icons.webp")));
await writeFile(iconIndex, "{\n"+Object.entries(bounds).map(([id,box])=>`  "${id}": [${box.join(", ")}]`).join(",\n")+"\n}\n");

// Keep a fixed grid and a shared sole baseline for the companion's stride.
const cat = figures(await readSheet(master("peach")),4,3);
const catLayers = [], catCell = 128;
for (let row=0; row<3; row++) {
  const stride = cat.slice(row*4,row*4+4);
  const scale = Math.min(122/Math.max(...stride.map(f=>f.width)),117/Math.max(...stride.map(f=>f.height)));
  for (const [column,f] of stride.entries()) {
    const w=Math.round(f.width*scale), h=Math.round(f.height*scale);
    catLayers.push({input:await raster(f).resize(w,h,{fit:"fill"}).png().toBuffer(),
      left:column*catCell+Math.round((catCell-w)/2),top:row*catCell+125-h});
  }
}
await transparent(catCell*4,catCell*3).composite(catLayers)
  .webp({quality:93,alphaQuality:100,effort:6}).toFile(filename(output("peach-walk.webp")));
