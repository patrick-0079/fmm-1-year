import sharp from "sharp";
import { cellWidth, cellHeight, footStripHeight, footwearIds } from "../src/costume-frames.ts";
import { figures, master, raster, readSheet } from "./wardrobe-sheets.mjs";

// The artist's single-shoe views are front, left profile and heel. Mirrors
// are derived only for the opposite foot/profile, never for an entire actor.
const starterViews = figures(await readSheet(master("starter-footwear")), 4, 3);
const views = {
  ribbonShoes: figures(await readSheet(master("flats")), 2, 2),
  starShoes: figures(await readSheet(master("boots")), 2, 2),
  mintSneakers: starterViews.slice(0, 3),
  honeyRainboots: starterViews.slice(4, 7),
  pennyLoafers: starterViews.slice(8, 11),
};
const soleCenters = [
  [63,81],[61,80],[62,82],[56],[33,74],[33,82],
  [88],[63,113],[61,115],[62,81],[62,82],[62,82],[62,82],[62,82],
];

// Register each replacement to the visible slipper in that outfit and frame.
// The heel lifts at a different point on each stride and seated legs move inward.
function slippers(pixels, frame) {
  const seeds=soleCenters[frame];
  return seeds.map((seed,index)=>{
    const split=(seeds[0]+(seeds[1]??seeds[0]))/2;
    const from=Math.max(0,Math.round(index===1 ? split : seed-21));
    const until=Math.min(cellWidth,Math.round(seeds.length===2 && index===0 ? split : seed+21));
    const points=[];
    for (let y=cellHeight-32;y<cellHeight;y++) for (let x=from;x<until;x++) {
      const i=(y*cellWidth+x)*4, [r,g,b,a]=pixels.subarray(i,i+4);
      if (a>180 && r>155 && b>g+7 && r>g+5 && r-b<35 && b-r<13) points.push({x,y});
    }
    if (!points.length) throw new Error("No slipper in pose " + frame + " near " + seed);
    const sole=Math.max(...points.map(p=>p.y));
    const foot=points.filter(p=>p.y>=sole-16);
    // Seated skirts and sleeves spread alongside the slippers. Measure each
    // slipper at its sole, then find the ankle inside that footprint.
    const solePixels = frame>=12 ? foot.filter(p=>p.y>=sole-5) : foot;
    const firstX=Math.min(...solePixels.map(p=>p.x)), lastX=Math.max(...solePixels.map(p=>p.x));
    const ankle = frame>=12 ? foot.filter(p=>p.x>firstX+1 && p.x<lastX-1) : foot;
    const left=Math.max(from,firstX-2), right=Math.min(until-1,lastX+2);
    return {left,top:Math.min(...ankle.map(p=>p.y))-2,right,bottom:Math.min(cellHeight-1,sole+2)};
  }).sort((a,b)=>a.bottom-b.bottom);
}
export async function shoeLayers(pixels,row,frame) {
  const feet=slippers(pixels,frame);
  const facing=frame<12 ? Math.floor(frame/3) : 0;
  const side=facing===1 || facing===2;
  const view=side ? 1 : facing===3 ? 2 : 0;
  const stripTop=cellHeight-footStripHeight;
  const layers=[];
  for (const [kind,id] of footwearIds.entries()) {
    const boots = id === "starShoes" || id === "honeyRainboots";
    const strip=Buffer.from(pixels.subarray(stripTop*cellWidth*4));
    const art=[];
    for (const foot of feet) {
      const width=foot.right-foot.left+1;
      const height=foot.bottom-foot.top+1 + (boots ? Math.round(width*(side ? .26 : .45)) : 0);
      // Replace the original silhouette too, so old soles never peek out from under the boots.
      for (let y=foot.top; y<=Math.min(cellHeight-1,foot.bottom+1);y++)
        strip.fill(0,((y-stripTop)*cellWidth+Math.max(0,foot.left-1))*4,((y-stripTop)*cellWidth+Math.min(cellWidth,foot.right+2))*4);
      const sprite=raster(views[id][view]).resize(width,height,{fit:"fill"});
      if (facing===2 || (!side && foot.left>cellWidth/2)) sprite.flop();
      art.push({input:await sprite.png().toBuffer(),left:foot.left,top:foot.bottom+1-height-stripTop});
    }
    const input=await sharp(strip,{raw:{width:cellWidth,height:footStripHeight,channels:4}}).composite(art).png().toBuffer();
    layers.push({input,left:frame*cellWidth,top:(row*footwearIds.length+kind)*footStripHeight});
  }
  return layers;
}
