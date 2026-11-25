import sharp from "sharp";
import { spriteFrames } from "../src/sprite-frames.ts";
import { fileURLToPath } from "node:url";

const assets = file => fileURLToPath(new URL("../src/assets/" + file, import.meta.url));
const cell = 52, height = 68, layers = [];
for (const [index, stride] of [1, 0, 2, 0].entries()) {
  const frame = spriteFrames[6 + stride];
  const width = Math.round(frame.w / 5), h = Math.round(frame.h / 5);
  const input = await sharp(assets("nemu-sprites.webp"))
    .extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h }).resize(width, h).png().toBuffer();
  layers.push({ input, left: index * cell + Math.floor((cell - width) / 2), top: height - h });
}
await sharp({ create: { width: cell * 4, height, channels: 4, background: "#0000" } })
  .composite(layers).webp({ quality: 88, alphaQuality: 100 }).toFile(assets("loading-fufu.webp"));
