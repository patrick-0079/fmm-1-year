// Pack twelve finished drawings. Columns are consecutive poses. Rows face front, right and back.
// node scripts/import-resident-walk.mjs path/to/source.png character-id
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const [source, id] = process.argv.slice(2);
if (!source || !/^[a-z][a-z0-9-]*$/.test(id ?? "")) throw Error("Expected a sprite sheet and a resident ID");
const folder = new URL("../src/assets/resident-walk/", import.meta.url);
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const alpha = (x, y) => data[(y * width + x) * channels + 3];
// Ignore translucent matte noise when measuring. Preserve the painted alpha in the output.
const inkThreshold = 48;
const usedX = new Uint8Array(width);
const usedY = new Uint8Array(height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (alpha(x, y) > inkThreshold) usedX[x] = usedY[y] = 1;
  }
}

function gutters(occupied, count) {
  const edges = [0];
  const cell = occupied.length / count;
  for (let i = 1; i < count; i++) {
    const nominal = Math.round(i * cell);
    let edge;
    for (let offset = 0; offset < cell / 3 && edge === undefined; offset++) {
      edge = [nominal + offset, nominal - offset].find(index => !occupied[index]);
    }
    if (edge === undefined) throw Error("Separate the drawings near grid boundary " + nominal);
    let start = edge, end = edge;
    while (start > 0 && !occupied[start - 1]) start--;
    while (end < occupied.length - 1 && !occupied[end + 1]) end++;
    edges.push(Math.round((start + end) / 2));
  }
  return [...edges, occupied.length];
}

const xs = gutters(usedX, 4), ys = gutters(usedY, 3);
function measureFrame(row, col) {
  let left = xs[col + 1], right = -1, top = ys[row + 1], bottom = -1;
  for (let y = ys[row]; y < ys[row + 1]; y++) {
    for (let x = xs[col]; x < xs[col + 1]; x++) {
      if (alpha(x, y) <= inkThreshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw Error("Empty frame " + (row * 4 + col));
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  // Anchor at the torso. A swinging hand or trailing hat should not move the entire frame.
  let mass = 0, weightedX = 0;
  for (let y = top + Math.floor(crop.height * .42); y <= top + crop.height * .68; y++) {
    for (let x = left; x <= right; x++) {
      const a = alpha(x, y);
      mass += a;
      weightedX += (x - left) * a;
    }
  }
  return { crop, axis: weightedX / mass, row, col };
}

const frames = Array.from({ length: 12 }, (_, i) => measureFrame(Math.floor(i / 4), i % 4));
const heights = frames.map(frame => frame.crop.height).sort((a, b) => a - b);
const scale = 80 / ((heights[5] + heights[6]) / 2);
const layers = await Promise.all(frames.map(async ({ crop, axis, row, col }) => {
  const image = await sharp(source).extract(crop).resize({ height: Math.round(crop.height * scale) })
    .png().toBuffer({ resolveWithObject: true });
  const x = Math.round(48 - axis * scale), y = 90 - image.info.height;
  if (x < 0 || y < 0 || x + image.info.width > 96) throw Error("Frame extends outside its cell");
  return { input: image.data, left: col * 96 + x, top: row * 96 + y };
}));
await mkdir(folder, { recursive: true });
await sharp({ create: { width: 384, height: 288, channels: 4, background: "#00000000" } })
  .composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL(id + ".webp", folder)));
