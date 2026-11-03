// Stamp the new plants into the editable atlases; all other cells remain intact.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const source = "src/assets/garden-daisies-v20.png";
const { width, height } = await sharp(source).metadata();
for (const [atlas, columns, column, row, plant] of [
  ["rainbow-flowers-v15", 4, 1, 0, 0],
  ["orchard-v16", 2, 0, 1, 1],
]) {
  const path = "src/assets/" + atlas + ".png",
    original = await readFile(path);
  const {data,info:meta} = await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const left = Math.round((meta.width * column) / columns),
    top = Math.round((meta.height * row) / 2);
  const w = Math.round((meta.width * (column + 1)) / columns) - left;
  const h = Math.round((meta.height * (row + 1)) / 2) - top;
  const split = Math.round(width / 2);
  const flower = await sharp(source)
    .extract({
      left: plant ? split : 0,
      top: 0,
      width: plant ? width - split : split,
      height,
    })
    .png()
    .toBuffer();
  const replacement = await sharp(flower)
    .trim({ background: "#0000", threshold: 25 })
    .resize(w - 18, h - 18, { fit: "contain", background: "#0000" })
    .extend({ top: 9, bottom: 9, left: 9, right: 9, background: "#0000" })
    .ensureAlpha().raw()
    .toBuffer();
  // Copy complete RGBA rows; blending with the entire atlas would round the
  // semi-transparent edges of unrelated plants on each rebuild.
  for(let y=0;y<h;y++) replacement.copy(data,((top+y)*meta.width+left)*4,y*w*4,(y+1)*w*4);
  const output=await sharp(data,{raw:{width:meta.width,height:meta.height,channels:4}}).png().toBuffer();
  await writeFile(path, output);
}
