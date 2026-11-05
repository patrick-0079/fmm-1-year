import sharp from "sharp";
import { fileURLToPath } from "node:url";

const file = (name) => fileURLToPath(new URL("../src/assets/" + name, import.meta.url));
await sharp(file("qingya-bouquet.png"))
  .trim({ threshold: 30 })
  .resize({ width: 256, height: 256, fit: "inside" })
  .webp({ quality: 93, alphaQuality: 100 })
  .toFile(file("qingya-bouquet.webp"));

const source = file("town-gestures.png");
const { width, height } = await sharp(source).metadata();
const frames = [];
for (let i = 0; i < 8; i++) {
  const left = Math.round(((i % 4) * width) / 4),
    top = Math.round((Math.floor(i / 4) * height) / 2);
  const w = Math.round((((i % 4) + 1) * width) / 4) - left,
    h = Math.round(((Math.floor(i / 4) + 1) * height) / 2) - top;
  const raw = await sharp(source)
    .extract({ left, top, width: w, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer();
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const index = (y * w + x) * 4 + 3;
      if (raw[index] < 45) {
        raw[index] = 0;
        continue;
      }
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  if (x1 <= x0 || y1 <= y0) throw Error("Empty gesture " + i);
  const cw = x1 - x0 + 1,
    ch = y1 - y0 + 1;
  const input = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .png()
    .toBuffer();
  frames.push({ input, width: cw, height: ch, group: i < 4 ? "baker" : i === 4 ? "rabbit" : "cat" });
}
const cell = 128,
  sheet = [];
for (const [i, f] of frames.entries()) {
  const neighbors = frames.filter((other) => other.group === f.group);
  const scale = (cell - 3) / Math.max(...neighbors.map((other) => Math.max(other.width, other.height)));
  const w = Math.round(f.width * scale),
    h = Math.round(f.height * scale);
  sheet.push({
    input: await sharp(f.input).resize(w, h).png().toBuffer(),
    left: (i % 4) * cell + Math.round((cell - w) / 2),
    top: Math.floor(i / 4) * cell + cell - 1 - h,
  });
}
await sharp({ create: { width: 4 * cell, height: 2 * cell, channels: 4, background: "#00000000" } })
  .composite(sheet)
  .webp({ quality: 94, alphaQuality: 100 })
  .toFile(file("town-gestures.webp"));
