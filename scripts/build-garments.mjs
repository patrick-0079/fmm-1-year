import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { artScale, cellWidth, cellHeight, footStripHeight, outfits } from "../src/costume-frames.ts";
import { spriteFrames } from "../src/sprite-frames.ts";
import { filename, figures, master, output, raster, readSheet, transparent } from "./wardrobe-sheets.mjs";
import { shoeLayers } from "./build-shoes.mjs";

const designs = ["base", "rose", "mint", "cloud", "apricot", "sailor", "honey", "witch", "miko"];
if (designs.length !== outfits.length) throw new Error("Missing outfit artwork");
const bodies = [], shoes = [];
for (const [row, name] of designs.entries()) {
  const walk = figures(await readSheet(master(name+"-walk")), 3, 4);
  const resting = await readSheet(master(name+"-rest"));
  const rest = row ? figures(resting,2,2) : figures(resting,2,1);
  const seated = row ? rest[1] : figures(await readSheet(master("bench")),1,1)[0];
  const poses = [...walk, row ? rest[2] : rest[0], seated, row ? rest[3] : rest[1]];
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
await transparent(cellWidth*14, footStripHeight*2*designs.length).composite(shoes)
  .webp({quality:92,alphaQuality:100,effort:6}).toFile(filename(output("fufu-footwear.webp")));

// Preserve the original heart and the two separate lilac pins below it.
const heartMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="82" height="113">
  <path fill="white" d="M3 14H8V9H13V4H29V9H34V14H44V9H49V4H65V9H70V14H76V39H70V45H65V51H60V56H54V61H49V67H33V62H28V57H22V51H16V46H12V40H3Z
    M28 72H43V69H49V67H65V72H69V83H65V86H50V88H34V90H28Z
    M28 92H43V89H50V87H65V89H69V103H57V106H44V108H33V105H28Z"/></svg>`);
const originalHeart = await sharp(filename(output("fufu-rest-poses.png")))
  .extract({left:457,top:254,width:82,height:113}).composite([{input:heartMask,blend:"dest-in"}])
  .raw().toBuffer();
const catalogueRows = [
  {sheet:"icons", columns:4, rows:4, names:["wreath","candyClip","headphones","starWings","roseDress","mintCape","ribbonShoes","starShoes",
   "moonBag","berryBag","rabbitSatchel","anniversaryPin","echoBrooch","petBunny","petCat"]},
  {sheet:"starter-icons", columns:4, rows:2, names:["cloudPajamas","apricotNightgown","sailorSet","honeyOveralls","heartClip","fishClip","starClip"]},
  {sheet:"witch-icons", columns:2, rows:2, names:["witchDress","witchHat"]},
  {sheet:"miko-icon", columns:1, rows:1, names:["mikoOutfit"]},
  {sheet:"worn-hat", columns:2, rows:2, names:["hatFront","hatLeft","hatRight","hatRear"]},
  {sheet:"worn-bags", columns:3, rows:2, names:["moonPackRear","berryPackRear","satchelFace","moonPackSide","berryPackSide","satchelEdge"]},
];
const icons = [], bounds = {}, cell = 144, cols = 6;
for (const {sheet, columns, rows, names} of catalogueRows) {
  const isolated = figures(await readSheet(master(sheet)),columns,rows);
  for (const [index, id] of names.entries()) {
    const f = id === "heartClip" ? {pixels:originalHeart,width:82,height:113} : isolated[index];
    const factor=(cell-8)/Math.max(f.width,f.height);
    const w=Math.round(f.width*factor), h=Math.round(f.height*factor);
    const left=(icons.length%cols)*cell+4, top=Math.floor(icons.length/cols)*cell+4;
    const input=await raster(f).resize(w,h,{fit:"fill"}).png().toBuffer();
    icons.push({input,left,top}); bounds[id]=[left,top,w,h];
  }
}
await transparent(cell*cols,cell*Math.ceil(icons.length/cols)).composite(icons)
  .webp({quality:94,alphaQuality:100,effort:6}).toFile(filename(output("wardrobe-icons.webp")));
await writeFile(new URL("../src/wardrobe-icons.json",import.meta.url), "{\n"+Object.entries(bounds).map(([id,box])=>`  "${id}": [${box.join(", ")}]`).join(",\n")+"\n}\n");

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
