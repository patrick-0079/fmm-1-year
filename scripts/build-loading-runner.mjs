import sharp from "sharp";
import { costumeFrame, outfitIndex, poseFrame } from "../src/costume-frames.ts";
import { fileURLToPath } from "node:url";

const assets = file => fileURLToPath(new URL("../src/assets/" + file, import.meta.url));
const cell = 52, height = 68, layers = [];
for (const [index, stride] of [1, 0, 2, 0].entries()) {
  const frame = costumeFrame(outfitIndex(null), poseFrame("standing", 2, stride));
  const input = await sharp(assets("fufu-garments.webp"))
    .extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
    .resize(cell, height, {fit:"contain", position:"south", background:"#0000"}).png().toBuffer();
  layers.push({ input, left: index * cell, top: 0 });
}
await sharp({ create: { width: cell * 4, height, channels: 4, background: "#0000" } })
  .composite(layers).webp({ quality: 88, alphaQuality: 100 }).toFile(assets("loading-fufu.webp"));
