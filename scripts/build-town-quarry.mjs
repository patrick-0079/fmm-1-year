import sharp from "sharp";
import {fileURLToPath} from "node:url";
const asset=name=>fileURLToPath(new URL("../src/assets/"+name,import.meta.url));
const w=752, h=488;
const rgb=await sharp(asset("town-quarry.png")).resize(w,h,{fit:"fill"}).removeAlpha().raw().toBuffer();
const rgba=Buffer.alloc(w*h*4);
const ease=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
  const i=y*w+x, u=x/2, v=y/2;
  rgba[i*4]=rgb[i*3]; rgba[i*4+1]=rgb[i*3+1]; rgba[i*4+2]=rgb[i*3+2];
  // Fade into the original road and stream. The top and east edges are town boundaries.
  rgba[i*4+3]=Math.round(255*ease((u-12-54*v/244)/28)*ease((226+12*u/376-v)/42));
}
await sharp(rgba,{raw:{width:w,height:h,channels:4}})
  .webp({quality:94,alphaQuality:100}).toFile(asset("town-quarry.webp"));
