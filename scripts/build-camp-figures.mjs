import sharp from "sharp";
import { campExpressionDrawings, campExpressionRect } from "../src/camp-expression-cels.ts";
import { expressionDrawing } from "./camp-figure-art.mjs";
import { fileURLToPath } from "node:url";

const asset = name => fileURLToPath(new URL("../src/assets/"+name,import.meta.url));
const master = asset("fufu-garments.webp");
const cellWidth=144, cellHeight=184, seat=12;
const {x,y,width,height} = campExpressionRect;
const {height: sheetHeight} = await sharp(master).metadata();
const outfits=sheetHeight/cellHeight;
const atlasWidth=width*campExpressionDrawings.length;
const atlas=Buffer.alloc(atlasWidth*height*outfits*4);
for (let row=0;row<outfits;row++) {
  const source=await sharp(master).extract({
    left:seat*cellWidth,top:row*cellHeight,width:cellWidth,height:cellHeight,
  }).ensureAlpha().raw().toBuffer();
  for (const [column,drawing] of campExpressionDrawings.entries()) {
    const {pixels,strokes}=expressionDrawing(source,row,drawing);
    const ink=strokes && await sharp(Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+
      '" viewBox="'+[x,y,width,height].join(" ")+'">'+strokes+'</svg>',
    )).ensureAlpha().raw().toBuffer();

    // Export just the ink that differs. Neutral skin, facial contours and all
    // of the clothing are rendered by the same seated frame as ordinary rest.
    for (let v=0;v<height;v++) for (let u=0;u<width;u++) {
      const i=4*((v+y)*cellWidth+u+x), j=4*(v*width+u);
      const alpha=ink?ink[j+3]/255:0;
      if (alpha) {
        for (let k=0;k<3;k++) pixels[i+k]=Math.round(pixels[i+k]*(1-alpha)+ink[j+k]*alpha);
      }
      if (source[i]===pixels[i] && source[i+1]===pixels[i+1] && source[i+2]===pixels[i+2]) continue;
      const dest=4*((row*height+v)*atlasWidth+column*width+u);
      pixels.copy(atlas,dest,i,i+3);
      atlas[dest+3]=255;
    }
  }
}
await sharp(atlas,{raw:{width:atlasWidth,height:height*outfits,channels:4}})
  .webp({lossless:true,effort:6}).toFile(asset("meadow-camp-expressions.webp"));
