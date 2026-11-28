import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { campHeadDrawings, campHeadOffsets } from "../src/camp-expression-cels.ts";
import { cellWidth as width, cellHeight as height, outfits, poseFrame } from "../src/costume-frames.ts";

const asset = name => fileURLToPath(new URL("../src/assets/" + name, import.meta.url));
const master = asset("fufu-garments.webp");
const index = (x, y) => (y * width + x) * 4;
// The central trace follows the jaw and the short fringe in each seated view.
const fringe = [[0,93],[18,97],[21,100],[24,103],[28,104],[30,106],[33,107],[36,104],[38,103],[41,106],
  [46,108],[51,110],[54,110],[58,114],[64,116],[69,117],[74,117],[79,116],[84,115],[89,113],
  [93,110],[98,109],[102,107],[105,103],[108,105],[112,108],[115,106],[117,104],[120,104],
  [123,102],[126,99],[131,96],[143,93]];
// Side locks sit wider on the rose dress, and slightly higher on the overalls.
const registration = [[0,0],[0,1],[0,2],[1,1],[0,1],[1,1],[-1,-1],[1,1],[1,0]];
// On each side the little shaded curl belongs to the head. Its pointed end
// meets the stationary long hair at these landmarks on the costume original.
const fittings = [
  {left:[32,115], right:[114,115], neck:[64,82], shade:"#e4afa1", skin:"#f9d5c4"},
  {left:[30,117], right:[116,117], neck:[67,79], shade:"#d5a28f", skin:"#f4d2b9"},
  {left:[28,117], right:[117,117], neck:[67,78], shade:"#c58f83", skin:"#f6cdbc"},
  {left:[30,117], right:[115,117], neck:[68,78], shade:"#d9a38e", skin:"#f5d2b9"},
  {left:[29,116], right:[116,116], neck:[68,79], shade:"#cf9787", skin:"#efc8b0"},
  {left:[31,117], right:[117,117], neck:[68,79], shade:"#d29b89", skin:"#efc6b1"},
  {left:[30,115], right:[112,115], neck:[66,77], shade:"#ce9c84", skin:"#edc6a8"},
  {left:[30,118], right:[117,118], neck:[68,79], shade:"#d69f8b", skin:"#f1c7b2"},
  {left:[31,116], right:[116,116], neck:[67,77], shade:"#ce998b", skin:"#efc9b8"},
];
function headEdge(original,row) {
  const [dx,dy] = registration[row];
  const {left, right} = fittings[row];
  const edge = new Float32Array(width);
  let segment = 0;
  for (let x=0;x<width;x++) {
    const u=x-dx;
    while (segment<fringe.length-2 && u>fringe[segment+1][0]) segment++;
    const [ax,ay]=fringe[segment], [bx,by]=fringe[segment+1];
    const guess=Math.round(ay+(by-ay)*(u-ax)/(bx-ax)+dy);
    // Snap the trace to the bottom of this garment's anti-aliased ink.
    // In the open pink area between two locks, the authored trace suffices.
    let y=guess, best=Infinity;
    for(let v=guess-2;v<=guess+1;v++) {
      const i=index(x,v), green=original[i+1];
      if(original[i+3]<125 || green>147) continue;
      const score=green+16*Math.abs(v-guess);
      if(score<best){best=score;y=v;}
    }
    if(best!==Infinity) {
      for(let n=0;n<2 && original[index(x,y+1)+3]>100 && original[index(x,y+1)+1]<146;n++) y++;
    }
    if (u <= 38 || u >= 107) {
      const side = u <= 38 ? 1 : -1;
      const [cx,cy] = side === 1 ? left : right;
      const inset = (x-cx)*side;
      // Outside the curl its antialiased silhouette is already on transparency.
      // Inside the curl trace its diagonal join with the long, lower lock.
      edge[x]=inset <= 0 ? cy+.7 : cy+.7-inset*(cy-104-dy)/Math.max(1,side*((side===1?38:107)+dx-cx));
    } else edge[x]=y+1;
  }
  return edge;
}
const clamp = n => Math.max(0,Math.min(1,n));
const path = (d,fill,stroke="none",w=1) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const hex = (pixels,x,y) => "#"+pixels.subarray(index(x,y),index(x,y)+3).toString("hex");

// Feather the painted underlap into the visible surface facing it. A small
// two-dimensional neighbourhood retains cape/skin/hair colours at a junction
// without dragging a vertical copy of an outline into the newly exposed area.
function joinPaint(plate,original,edge) {
  const paint=Buffer.from(plate);
  for(let x=0;x<width;x++) for(let y=Math.ceil(edge[x]-5);y<=edge[x]+1;y++) {
    const i=index(x,y);
    if(paint[i+3]<230) continue;
    let weight=0;
    const rgb=[0,0,0];
    for(let sx=Math.max(0,x-6);sx<=Math.min(width-1,x+6);sx++) {
      const top=Math.ceil(edge[sx]+1.25);
      for(let sy=top;sy<=Math.min(top+4,y+8);sy++) {
        const s=index(sx,sy);
        if(original[s+3]<220) continue;
        const space=((x-sx)/2.55)**2 + ((y-sy)/3.6)**2;
        const chroma=[0,1,2].reduce((d,k)=>d+(paint[i+k]-original[s+k])**2,0);
        const amount=Math.exp(-.5*space)/(1+chroma/6500);
        weight+=amount;
        for(let k=0;k<3;k++) rgb[k]+=amount*original[s+k];
      }
    }
    if(weight>.01) {
      const blend=.95*clamp(1-(edge[x]-y)/9);
      for(let k=0;k<3;k++) plate[i+k]=Math.round(paint[i+k]*(1-blend)+rgb[k]/weight*blend);
    }
  }
}

async function underpaint(original,row,edge) {
  const {left,right,neck:[nl,nr],shade,skin} = fittings[row];
  const [shift,dy] = registration[row], mid=(nl+nr)/2;
  const y=118+dy;
  const gradient = (id,a,b) => `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  // Under the chin are the two long pink locks, the shadow between them and
  // the neck entering the painted collar. The exposed strip is at most 3 px.
  // Draw the missing continuation once per costume, before placing any head.
  let drawing = "<defs>"+gradient("neck",shade,skin)+"</defs>";
  const leftEdge = `M ${left[0]+8} ${left[1]-24} Q ${left[0]} ${left[1]-9} ${left[0]-.7} ${left[1]} Q ${left[0]-9} ${left[1]+8} ${left[0]-19} ${left[1]+15}`;
  const rightEdge = `M ${right[0]-8} ${right[1]-24} Q ${right[0]} ${right[1]-9} ${right[0]+.7} ${right[1]} Q ${right[0]+9} ${right[1]+8} ${right[0]+19} ${right[1]+15}`;
  const leftHair=hex(original,43+shift,116+dy), rightHair=hex(original,101+shift,116+dy);
  drawing += path(`M 44 90 H 99 L 103 135 H 41 Z`, "#ac7383");
  drawing += path(leftEdge+` L ${52+shift} 135 Q ${65+shift} ${y+3} ${53+shift} ${y-6} Q ${47+shift} 106 ${49+shift} 92 Z`,leftHair,"#a46c79",1.05);
  drawing += path(rightEdge+` L ${93+shift} 135 Q ${82+shift} ${y+3} ${92+shift} ${y-6} Q ${99+shift} 105 ${96+shift} 92 Z`,rightHair,"#a46c79",1.05);
  drawing += path(`M ${nl+.5} ${y-10} Q ${nl+1} ${y-1} ${nl-.9} ${y+7} Q ${mid} ${y+12} ${nr+1} ${y+7} Q ${nr-1} ${y} ${nr-.7} ${y-10} Z`,"url(#neck)","#9b6d68",.8);
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${drawing}</svg>`);
  const plate=await sharp(svg).ensureAlpha().raw().toBuffer();
  joinPaint(plate,original,edge);
  for(let x=0;x<width;x++) for(let y=0;y<height;y++) {
    const b=index(x,y), coverage=clamp(y-edge[x]-.15);
    if(coverage===1) original.copy(plate,b,b,b+4);
    else if(coverage>0) for(let k=0;k<4;k++) plate[b+k]=Math.round(plate[b+k]*(1-coverage)+original[b+k]*coverage);
  }
  return plate;
}

function drawPose(original,plate,edge,dx,dy) {
  const cel=Buffer.from(plate);
  for(let x=0;x<width;x++) for(let y=0;y<=130;y++) {
    const sx=x-dx, sy=y-dy;
    if(sx<0 || sx>=width || sy<0) continue;
    const matte=clamp(edge[sx]-sy+.85);
    if(!matte) continue;
    const a=index(sx,sy), b=index(x,y), opacity=matte*original[a+3]/255;
    if(!opacity) continue;
    if(matte===1 && (original[a+3]>=245 || !plate[b+3])) {
      original.copy(cel,b,a,a+4);
      continue;
    }
    const residual=(1-opacity)*plate[b+3]/255, alpha=opacity+residual;
    for(let k=0;k<3;k++) cel[b+k]=Math.round((original[a+k]*opacity+plate[b+k]*residual)/alpha);
    cel[b+3]=Math.round(alpha*255);
  }
  return cel;
}

const columns = campHeadDrawings.length;
const atlas = Buffer.alloc(width*columns*height*outfits.length*4);
for (const [row] of outfits.entries()) {
  const original = await sharp(master).extract({
    left: poseFrame("sitting",0,0)*width, top: row*height, width, height,
  }).ensureAlpha().raw().toBuffer();
  const edge=headEdge(original,row);
  const plate=await underpaint(original,row,edge);
  for (const [col,pose] of campHeadDrawings.entries()) {
    const [dx,dy] = campHeadOffsets[pose];
    const cel = drawPose(original,plate,edge,dx,dy);
    for (let y=0; y<height; y++) {
      cel.copy(atlas,4*width*((row*height+y)*columns+col), y*width*4,(y+1)*width*4);
    }
  }
}
await sharp(atlas,{raw:{width:width*columns,height:height*outfits.length,channels:4}})
  .webp({lossless:true,effort:6}).toFile(asset("meadow-camp-heads.webp"));
