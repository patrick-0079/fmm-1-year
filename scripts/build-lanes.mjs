import sharp from "sharp";

const dir = "src/assets/";
// Keep all established furniture, flowers and lighting registered to the original map.
// Only the two painted corridors are composited, with feathered grass edges.
const mask = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 900 600">
  <g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="68" d="M 445 427 C 456 463 525 465 554 499 S 579 552 562 608"/>
    <path stroke-width="58" d="M 680 146 C 700 131 746 125 754 102 S 767 63 800 55 L 827 54"/>
  </g></svg>`)).blur(4).png().toBuffer();
const corridors = await sharp(dir+"garden-lanes-v18.png").resize(1536,1024)
  .ensureAlpha().composite([{input:mask,blend:"dest-in"}]).png().toBuffer();
await sharp(dir+"garden-colorful.png").composite([{input:corridors}])
  .webp({quality:94,smartSubsample:true,effort:6}).toFile(dir+"garden-lanes-v18.webp");

// Drop stray near-transparent pixels before trimming; keep the white finish and open doorway intact.
for (const [name,edge] of [["white-bass-v18",256],["country-wicket-v18",520]]) {
  const {data,info} = await sharp(dir+name+".png").ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4+3;
    if(data[i]<64) {data[i]=0;continue;}
    left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y);
  }
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
    .extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize(edge,edge,{fit:"inside"}).webp({lossless:true,effort:6}).toFile(dir+name+".webp");
}
