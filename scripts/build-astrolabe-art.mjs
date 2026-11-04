import sharp from "sharp";
import {fileURLToPath} from "node:url";

const file = name => fileURLToPath(new URL("../src/assets/"+name, import.meta.url));
for (const name of ["astrolabe-relics","astrolabe-mechanisms"]) {
  const original = file(name+".png");
  const {width, height} = await sharp(original).metadata();
  const halfW=Math.floor(width/2), halfH=Math.floor(height/2), cell=160;
  const tiles=[];
  for (let i=0;i<4;i++) {
    const cropped=await sharp(original).extract({left:(i%2)*halfW,top:Math.floor(i/2)*halfH,width:halfW,height:halfH}).png().toBuffer();
    const input=await sharp(cropped).trim({background:"#00000000",threshold:28})
      .resize(cell-6,cell-6,{fit:"contain",background:"#00000000"}).png().toBuffer();
    tiles.push({input,left:(i%2)*cell+3,top:Math.floor(i/2)*cell+3});
  }
  await sharp({create:{width:cell*2,height:cell*2,channels:4,background:"#00000000"}})
    .composite(tiles).webp({quality:94,alphaQuality:100}).toFile(file(name+".webp"));
}
