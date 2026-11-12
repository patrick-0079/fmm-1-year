import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Two low, ground-level props, generated for the existing garden palette.
// Each cell keeps transparent padding; the shared frame size is used by trap-art.ts.
const source = new URL("../src/assets/courage-path-props-v35.png", import.meta.url);
const crops = [
  { left: 101, top: 255, width: 931, height: 251 },
  { left: 1171, top: 255, width: 825, height: 263 },
];
const sprites = await Promise.all(crops.map(async (crop, i) => {
  const { data, info } = await sharp(fileURLToPath(source))
    .extract(crop).resize({width:240}).png().toBuffer({resolveWithObject:true});
  return {input:data, left:i*256+8, top:88-info.height};
}));
await sharp({create:{width:512,height:96,channels:4,background:"#00000000"}})
  .composite(sprites).webp({lossless:true,effort:6})
  .toFile(fileURLToPath(new URL("../src/assets/courage-path-props-v35.webp",import.meta.url)));
console.log("Built the vine and mossy paving stone atlas (512 × 96).");
