import sharp from "sharp";
import { fileURLToPath } from "node:url";
const asset = name => fileURLToPath(new URL("../src/assets/"+name,import.meta.url));
const cell = 144;
for (const [name,cols,rows] of [["fufu-room-fox",3,2],["qingtang-picnic",2,2],["peach-walk",4,3]]) {
  const original=asset(name+".png"), {width,height}=await sharp(original).metadata();
  const frames=[];
  for(let i=0;i<cols*rows;i++) {
    const w=width/cols, h=height/rows;
    const raw=await sharp(original).extract({left:(i%cols)*w,top:Math.floor(i/cols)*h,width:w,height:h}).ensureAlpha().raw().toBuffer();
    let left=w,right=0,top=h,bottom=0;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const a=(y*w+x)*4+3;
      if(raw[a]<36){raw[a]=0;continue;}
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(left>=right || top>=bottom)throw Error("Empty sprite "+i);
    frames.push({image:await sharp(raw,{raw:{width:w,height:h,channels:4}}).extract({left,top,width:right-left+1,height:bottom-top+1}).png().toBuffer(),
      w:right-left+1,h:bottom-top+1});
  }
  const bodyScale=(cell-4)/Math.max(...frames.map(f=>Math.max(f.w,f.h)));
  const tiles=[];
  for(const [i,f] of frames.entries()) {
    const scale=name==="qingtang-picnic" && i===3 ? (cell-4)/Math.max(f.w,f.h) : bodyScale;
    const w=Math.round(f.w*scale), h=Math.round(f.h*scale);
    tiles.push({input:await sharp(f.image).resize(w,h).png().toBuffer(),
      left:(i%cols)*cell+Math.round((cell-w)/2), top:Math.floor(i/cols)*cell+cell-h-1});
  }
  await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite(tiles).webp({quality:94,alphaQuality:100}).toFile(asset(name+".webp"));
}
