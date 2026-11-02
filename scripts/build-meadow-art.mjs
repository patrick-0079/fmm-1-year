import sharp from "sharp";

const dir = "src/assets/";
await sharp(dir+"flower-meadow-v15.png").webp({quality:93,smartSubsample:true,effort:6})
  .toFile(dir+"flower-meadow-v15.webp");
const source = dir+"rainbow-flowers-v15.png";
const {width,height} = await sharp(source).metadata(), size = 192, layers = [];
for (let i=0; i<8; i++) {
  const col=i%4, row=Math.floor(i/4), x=Math.round(col*width/4), y=Math.round(row*height/2);
  const w=Math.round((col+1)*width/4)-x, h=Math.round((row+1)*height/2)-y;
  const raw=await sharp(source).extract({left:x,top:y,width:w,height:h}).ensureAlpha().raw().toBuffer();
  let minX=w, minY=h, maxX=0, maxY=0;
  for(let j=0;j<h;j++) for(let k=0;k<w;k++) {
    const p=(j*w+k)*4+3;
    if (raw[p]<42) {raw[p]=0; continue;}
    minX=Math.min(minX,k); maxX=Math.max(maxX,k); minY=Math.min(minY,j); maxY=Math.max(maxY,j);
  }
  const input=await sharp(raw,{raw:{width:w,height:h,channels:4}})
    .extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1})
    .resize(size,size,{fit:"contain",position:"south",background:"#0000"}).png().toBuffer();
  layers.push({input,left:col*size,top:row*size});
}
await sharp({create:{width:4*size,height:2*size,channels:4,background:"#0000"}})
  .composite(layers).webp({lossless:true,effort:6}).toFile(dir+"rainbow-flowers-v15.webp");
