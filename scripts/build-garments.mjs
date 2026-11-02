import sharp from "sharp";
import { spriteFrames } from "../src/sprite-frames.ts";

// Recolor only the visible lavender fabric of the actual pose. Hair lies over
// the back and the seated character's hands and knees lie over the dress.
const neutral = ["#4b3949","#735464","#ad8587","#dec0b0","#fff0d7"];
const rose = ["#593649","#863e58","#b85170","#e5899b","#ffc2bc"];
const mint = ["#314c49","#426a5c","#64997b","#93b994","#d2e3c3"];
const trim = ["#6b4c40","#8e6e49","#b49563","#ddbd83","#ffe4ac"];
const rgba = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const ramps = [neutral,rose,mint,trim].map(ramp=>ramp.map(rgba));
const frameWidth = 128, frameHeight = 176;
const frames = [...spriteFrames,{x:87,y:88,w:593,h:733}];
const layers = [];
for (const [index,frame] of frames.entries()) {
  const sitting = index === 12, facing = sitting ? 0 : Math.floor(index / 3);
  const {w,h} = frame, scale = sitting ? 30 / w : 43 / 330;
  const source = await sharp(sitting ? "src/assets/fufu-rest-poses.png" : "src/assets/nemu-sprites.png")
    .extract({left:frame.x,top:frame.y,width:w,height:h}).ensureAlpha().raw().toBuffer();
  const overlays = Array.from({length:3},()=>Buffer.alloc(source.length));
  const center = [0.5,0.31,0.69,0.50][facing];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x/w, v = y/h, p = (y*w+x)*4;
    if (v < (sitting ? .625 : facing === 3 ? .715 : .591) || v > (sitting ? .955 : .847)) continue;
    const r=source[p], g=source[p+1], b=source[p+2], alpha=source[p+3];
    if (alpha < 100 || b < r*.94 || b < g+1) continue;
    // Skin, the blush-pink hair and the space between the arms are excluded
    // by their real color/alpha, including along the asymmetrical side poses.
    if (sitting && v>.82 && u>.31 && u<.68) continue;
    const luminance=.31*r+.46*g+.23*b;
    const value=Math.min(3.999,Math.max(0,(luminance-46)/48));
    const shade=Math.floor(value), fraction=value-shade;
    const skirt = sitting ? .795 : .723;
    const shoulder = Math.abs(u-center);
    const capeEdge = (sitting ? .748 : .700) + .032*Math.cos((u-center)*8);
    const bowY = sitting ? .678 : .635;
    for (const [row, pixels] of overlays.entries()) {
      let material = 0;
      if (row === 0) {
        if (v > skirt || (shoulder < .115 && v > bowY+.032)) material=1;
        if (Math.abs(v-skirt)<.008 || (facing!==3 && shoulder<.065 && Math.abs(v-bowY)<.023-shoulder*.2)) material=2;
        if (v > skirt+.045 && Math.abs(Math.sin(u*60))>.86 && Math.abs(v-(skirt+.065))<.015) material=0;
      } else if (row === 1) {
        if (v > capeEdge) material=2;
        if (Math.abs(v-capeEdge)<.009) material=3;
        if (facing!==3 && shoulder<.085 && Math.abs(v-bowY)<.031-shoulder*.18) material=1;
      } else {
        // Front straps follow the fabric instead of painting over loose hair.
        if (facing!==0 || v<bowY || v>(sitting ? .77 : .76)) continue;
        const line=.113+(v-bowY)*.32;
        if (Math.abs(shoulder-line)>.013) continue;
        material=3;
      }
      const ramp=ramps[material], lo=ramp[shade], hi=ramp[shade+1];
      for(let ch=0; ch<3; ch++) pixels[p+ch]=Math.round(lo[ch]+(hi[ch]-lo[ch])*fraction);
      pixels[p+3]=alpha;
    }
  }
  const width=Math.round(w*scale*4), height=Math.round(h*scale*4);
  for(const [row,pixels] of overlays.entries()) {
    const input=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).resize(width,height,{fit:"fill"}).png().toBuffer();
    layers.push({input,left:index*frameWidth+Math.round((frameWidth-width)/2),top:(row+1)*frameHeight-height});
  }
}
await sharp({create:{width:frameWidth*frames.length,height:3*frameHeight,channels:4,background:"#0000"}})
  .composite(layers).webp({lossless:true,effort:6}).toFile("src/assets/fufu-garments-v15.webp");
