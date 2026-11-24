import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pondArtBounds } from "../src/town-pond-motion.ts";

const assets = new URL("../src/assets/", import.meta.url);
const { x, y, w, h } = pondArtBounds;
const width = 2 * w, height = 2 * h;
const rgb = await sharp(fileURLToPath(new URL("anniversary-town-hd-v13.png", assets)))
  .extract({ left: 2*x, top: 2*y, width, height }).removeAlpha().raw().toBuffer();
const mask = Buffer.alloc(width * height * 4, 255);
for (let i = 0; i < width * height; i++) {
  const [r,g,b] = rgb.subarray(i*3, i*3+3);
  // The pond is teal. Pink petals, yellow-green pads, warm rock and timber
  // each fall outside this channel range. Preserve softened subpixel edges.
  const water = Math.min(g - r - 16, b - r - 18, b - g * .84 - 1);
  mask[i*4+3] = Math.round(255 * Math.max(0, Math.min(1, water / 14)));
}
await sharp(mask, { raw: {width, height, channels: 4} }).webp({lossless:true})
  .toFile(fileURLToPath(new URL("town-pond-water.webp", assets)));
