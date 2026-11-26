import sharp from "sharp";
import { cellWidth, cellHeight, footStripHeight, footwearIds, outfits } from "../src/costume-frames.ts";
import { figures, master, raster, readSheet } from "./wardrobe-sheets.mjs";

const starterViews = figures(await readSheet(master("starter-footwear")), 4, 3);
const figuresByShoe = {
  ribbonShoes: figures(await readSheet(master("flats")), 2, 2),
  starShoes: figures(await readSheet(master("boots")), 2, 2),
  mintSneakers: starterViews.slice(0, 3),
  honeyRainboots: starterViews.slice(4, 7),
  pennyLoafers: starterViews.slice(8, 11),
};

// X coordinates below the ankles on the 144 × 184 normalized garment cell.
// A stationary profile shows the near foot almost directly over the far foot.
const ankleCenters = [
  [63,81], [61,80], [62,82], [56], [33,74], [33,82], [88], [63,113], [61,115],
  [62,81], [62,82], [62,82], [62,82], [62,82],
];
// Scan parallel to the original sole. Both feet turn independently in a stride.
const soleSlopes = {4:[.40,-.24], 5:[.45,-.30], 7:[.35,-.38], 8:[.40,-.44]};
const lowBootCuffs = new Set(["cloudPajamas", "honeyOveralls", "mikoOutfit"]);
const stripTop = cellHeight - footStripHeight;
const pixelAt = (x, y) => 4 * (y * cellWidth + x);

function fitFoot(pixels, frame, side, outfit) {
  const anchors = ankleCenters[frame];
  const ankle = anchors[side];
  const split = Math.round((anchors[0] + (anchors[1] ?? anchors[0])) / 2);
  const overlap = [1, 2, 10, 11].includes(frame) ? 2 : 0;
  const leftLimit = side === 1 ? Math.max(ankle - 25, split - overlap) : Math.max(0, ankle - 25);
  const rightLimit = anchors.length === 2 && side === 0
    ? Math.min(ankle + 25, split - 1 + overlap) : Math.min(cellWidth - 1, ankle + 25);
  const slope = soleSlopes[frame]?.[side] ?? 0;
  const candidates = [];
  const counts = new Map();
  const fitError = () => new Error(`No usable slipper in ${outfit ?? "base"}, frame ${frame}, foot ${side}`);
  for (let y = cellHeight - 32; y < cellHeight; y++) {
    for (let x = leftLimit; x <= rightLimit; x++) {
      const offset = pixelAt(x, y);
      const [r, g, b, a] = pixels.subarray(offset, offset + 4);
      if (a > 155 && r > 159 && r > g + 4 && b > g + 6 && Math.abs(r - b) < 35) {
        const level = Math.round(y - slope * (x - ankle));
        candidates.push({x, level});
        counts.set(level, (counts.get(level) ?? 0) + 1);
      }
    }
  }
  if (!candidates.length) throw fitError();

  // A raised shoe may touch its neighbour. Locate the sole directly below
  // this ankle, then follow this slipper's lavender upholstery out to the toe.
  const nearest = Math.min(...candidates.map(p => Math.abs(p.x - ankle)));
  const underAnkle = candidates.filter(p => Math.abs(p.x - ankle) <= nearest + 3);
  const lowestFill = Math.max(...underAnkle.map(p => p.level));
  const sole = [];
  for (let x = ankle - 3; x <= ankle + 3; x++) {
    for (let y = cellHeight - 1; y >= cellHeight - 32; y--) {
      if (pixels[pixelAt(x, y) + 3] < 100) continue;
      sole.push(Math.round(y - slope * (x - ankle)));
      break;
    }
  }
  sole.sort((a, b) => a - b);
  const bottom = sole[Math.floor(sole.length / 2)] ?? lowestFill + 2;
  let densest = lowestFill;
  for (let level = bottom - 16; level <= bottom; level++) {
    if ((counts.get(level) ?? 0) > (counts.get(densest) ?? 0)) densest = level;
  }
  // Stop at the gap under a cream trouser cuff before reaching lilac trousers.
  let start = densest;
  while (bottom - start < 18 && counts.has(start - 1)) start--;
  const core = candidates.filter(p => p.level >= start && p.level <= bottom);
  if (!core.length) throw fitError();
  const atSole = core.filter(p => p.level >= bottom - 7);
  const widthSamples = frame >= 12 && atSole.length ? atSole : core;
  const left = Math.max(leftLimit, Math.min(...widthSamples.map(p => p.x)) - 3);
  const right = Math.min(rightLimit, Math.max(...widthSamples.map(p => p.x)) + 3);
  const slipper = core.filter(p => p.x >= left && p.x <= right);
  if (left >= right || !slipper.length) throw fitError();
  // White tabi and lilac straps occupy the same toe on the shrine outfit.
  const top = Math.min(Math.min(...slipper.map(p => p.level)) - 1, outfit === "mikoOutfit" ? bottom - 12 : Infinity);
  if (top >= bottom) throw fitError();
  return {left, right, ankle, slope, top, bottom:bottom + 1};
}

const sampleWidth = 20, sampleHeight = 14;
async function sampledView(figure) {
  const size = 32;
  const data = await raster(figure).resize(size, size, {fit:"fill"}).raw().toBuffer();
  // Bleed the nearest leather colour into empty texels before filtering.
  // The transparent area of the source image must not tint the worn edge.
  const queue = [];
  for (let i = 0; i < size * size; i++) if (data[i * 4 + 3] > 130) queue.push(i);
  for (let next = 0; next < queue.length; next++) {
    const from = queue[next], column = from % size;
    const neighbours = [column > 0 ? from - 1 : -1, column < size - 1 ? from + 1 : -1, from - size, from + size];
    for (const to of neighbours) {
      if (to < 0 || to >= size * size || data[to * 4 + 3] > 130) continue;
      data.copy(data, to * 4, from * 4, from * 4 + 3);
      data[to * 4 + 3] = 255;
      queue.push(to);
    }
  }
  return sharp(data, {raw:{width:size, height:size, channels:4}})
    .resize(sampleWidth, sampleHeight, {fit:"fill"}).raw().toBuffer();
}
const shoeViews = Object.fromEntries(await Promise.all(footwearIds.map(async id => [
  id, await Promise.all(figuresByShoe[id].slice(0, 3).map(sampledView)),
])));

function mappedShoe(strip, pixels, foot, view, boots, mirror, outfit) {
  const {left, right, ankle, slope, top, bottom} = foot;
  const height = bottom - top + 1;
  const extension = boots && !lowBootCuffs.has(outfit) ? Math.round(height * .48) : 0;
  let visibleTop = top - extension;
  // A raised ankle can disappear under a long hem. Follow the seam at the
  // end of the shin so the boot shaft stays tucked behind the fabric.
  for (let level = top - 3; level >= visibleTop; level--) {
    let dark = 0;
    for (let x = ankle - 3; x <= ankle + 3; x++) {
      const offset = pixelAt(x, Math.round(level + slope * (x - ankle)));
      if (pixels[offset + 3] > 140 && pixels[offset + 1] < 125) dark++;
    }
    if (dark >= 4) { visibleTop = level + 1; break; }
  }
  for (let x = left; x <= right; x++) {
    for (let level = visibleTop; level <= bottom; level++) {
      const y = Math.round(level + slope * (x - ankle));
      if (y < stripTop || y >= cellHeight) continue;
      const offset = pixelAt(x, y);
      const [r, g, b, a] = pixels.subarray(offset, offset + 4);
      if (!a || (level < top && (x < left + 2 || x > right - 2))) continue;
      if (outfit === "mikoOutfit" && r > g * 1.5 && g > b * .8 && r - b > 30) continue;

      const u = (x - left) / (right - left);
      const sourceX = (mirror ? 1 - u : u) * (sampleWidth - 1);
      const sourceY = (level - top + extension) / (height + extension - 1) * (sampleHeight - 1);
      const x0 = Math.floor(sourceX), y0 = Math.floor(sourceY);
      const wx = sourceX - x0, wy = sourceY - y0;
      const topLeft = (y0 * sampleWidth + x0) * 4;
      const topRight = (y0 * sampleWidth + Math.min(x0 + 1, sampleWidth - 1)) * 4;
      const nextRow = y0 < sampleHeight - 1 ? sampleWidth * 4 : 0;
      const dest = offset - stripTop * cellWidth * 4;
      // Keep the alpha of the original foot, including the exact sole contact.
      for (let channel = 0; channel < 3; channel++) {
        const near = (1 - wx) * view[topLeft + channel] + wx * view[topRight + channel];
        const far = (1 - wx) * view[topLeft + channel + nextRow] + wx * view[topRight + channel + nextRow];
        strip[dest + channel] = (1 - wy) * near + wy * far;
      }
    }
  }
}

export async function shoeLayers(pixels, row, frame) {
  const outfit = outfits[row];
  const feet = ankleCenters[frame].map((_, side) => fitFoot(pixels, frame, side, outfit))
    .sort((a, b) => a.bottom - b.bottom);
  const facing = frame < 12 ? Math.floor(frame / 3) : 0;
  const profile = facing === 1 || facing === 2;
  const view = profile ? 1 : facing === 3 ? 2 : 0;
  const layers = [];
  for (const [kind, id] of footwearIds.entries()) {
    const strip = Buffer.from(pixels.subarray(stripTop * cellWidth * 4));
    const boots = id === "starShoes" || id === "honeyRainboots";
    for (const foot of feet) {
      const mirror = facing === 2 || (!profile && foot.ankle > cellWidth / 2);
      mappedShoe(strip, pixels, foot, shoeViews[id][view], boots, mirror, outfit);
    }
    const input = await sharp(strip, {raw:{width:cellWidth, height:footStripHeight, channels:4}}).png().toBuffer();
    layers.push({input, left:frame * cellWidth, top:(row * footwearIds.length + kind) * footStripHeight});
  }
  return layers;
}
