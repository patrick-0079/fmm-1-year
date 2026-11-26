import { fileURLToPath } from "node:url";
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
async function sampledView(figure, followContour) {
  const size = followContour ? 72 : 32;
  const data = await raster(figure).resize(size, size, {fit:"fill"}).raw().toBuffer();
  const bounds = Array.from({length:size}, (_, x) => {
    let top = size, bottom = -1;
    for (let y = 0; y < size; y++) {
      if (data[(y * size + x) * 4 + 3] < 160) continue;
      top = Math.min(top, y);
      bottom = y;
    }
    return {top, bottom};
  });
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
  let surface = data;
  if (followContour) {
    // The side-view art has a low toe and a tall heel. Normalize each
    // painted column separately, keeping the upper, trim and sole in order.
    surface = Buffer.alloc(data.length);
    for (let x = 0; x < size; x++) {
      const sourceX = Math.round(1 + x / (size - 1) * (size - 3));
      const {top, bottom} = bounds[sourceX];
      if (top > bottom) throw new Error("Empty column inside footwear artwork");
      for (let y = 0; y < size; y++) {
        const sourceY = top + (bottom - top) * y / (size - 1);
        const first = (Math.floor(sourceY) * size + sourceX) * 4;
        const second = (Math.ceil(sourceY) * size + sourceX) * 4;
        const weight = sourceY % 1, dest = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) surface[dest + c] = data[first + c] * (1 - weight) + data[second + c] * weight;
        surface[dest + 3] = 255;
      }
    }
  }
  return sharp(surface, {raw:{width:size, height:size, channels:4}})
    .resize(sampleWidth, sampleHeight, {fit:"fill"}).raw().toBuffer();
}
const shoeViews = Object.fromEntries(await Promise.all(footwearIds.map(async id => [
  id, await Promise.all(figuresByShoe[id].slice(0, 3).map(figure => sampledView(figure, false))),
])));

const contouredViews = Object.fromEntries(await Promise.all(footwearIds.map(async id => [
  id, await Promise.all(figuresByShoe[id].slice(0, 3).map(figure => sampledView(figure, true))),
])));

// Hand-fitted masks use normalized garment coordinates. Red is the near shoe,
// blue the visible part of the far shoe. Green extends a boot onto the shin.
const maskedFrames = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11];
const maskPath = new URL("../doc/artwork/wardrobe/footwear-profile-masks.png", import.meta.url);
const {data: profileMasks, info: maskInfo} = await sharp(fileURLToPath(maskPath))
  .removeAlpha().raw().toBuffer({resolveWithObject:true});
if (maskInfo.width !== cellWidth * maskedFrames.length || maskInfo.height !== outfits.length * footStripHeight)
  throw new Error("Footwear masks must match the garment pose grid");

function maskedFeet(pixels, row, frame, maskColumn) {
  const feet = [[], []];
  const cut = (row * footStripHeight * maskInfo.width + maskColumn * cellWidth) * maskInfo.channels;
  for (let y = 0; y < footStripHeight; y++) {
    for (let x = 0; x < cellWidth; x++) {
      const offset = (y * cellWidth + x) * 4;
      if (!pixels[stripTop * cellWidth * 4 + offset + 3]) continue;
      const marker = cut + (y * maskInfo.width + x) * maskInfo.channels;
      const near = profileMasks[marker], far = profileMasks[marker + 2];
      if (!near && !far) continue;
      feet[far ? 1 : 0].push({x, y:stripTop + y, offset, cuff:!!profileMasks[marker + 1]});
    }
  }
  if (!feet[0].some(p => !p.cuff)) throw new Error(`Missing near shoe in outfit ${row}, frame ${frame}`);
  const farPixels = new Set(feet[1].filter(p => !p.cuff).map(p => p.offset));
  return feet.filter(points => points.length).map((points, side) => {
    const sole = points.filter(p => !p.cuff && pixels[stripTop * cellWidth * 4 + p.offset + 3] >= 100);
    if (!sole.length) throw new Error(`Empty shoe mask in outfit ${row}, frame ${frame}, foot ${side}`);
    let left = Math.min(...sole.map(p => p.x)), right = Math.max(...sole.map(p => p.x));
    const mid = (left + right) / 2;
    const overlap = frame === 3 || frame === 6;
    // Only a small part of the second shoe shows in profile. Project a
    // full-size shoe through that window, keeping the toe and heel distinct.
    if (side === 1 && overlap) {
      const near = feet[0].filter(p => !p.cuff);
      const width = Math.max(...near.map(p => p.x)) - Math.min(...near.map(p => p.x));
      if (frame === 3) right = left + width;
      else left = right - width;
    }
    const columns = Array.from({length:cellWidth}, () => ({top:Infinity, bootTop:Infinity, bottom:-Infinity}));
    for (const point of points) {
      const col = columns[point.x];
      col.bootTop = Math.min(col.bootTop, point.y);
      if (!point.cuff) {
        col.top = Math.min(col.top, point.y);
        col.bottom = Math.max(col.bottom, point.y);
      }
      const {offset} = point;
      const nearSeam = side === 0 && overlap &&
        [-4, 4, -cellWidth*4, cellWidth*4].some(delta => farPixels.has(offset + delta));
      point.shade = nearSeam ? .66 : side === 1 ? (overlap ? .78 : .9) : 1;
    }
    return {points, left, right, mid, columns};
  });
}

function paintSample(strip, dest, view, u, v, shade = 1) {
  const sx = Math.max(0, Math.min(1, u)) * (sampleWidth - 1);
  const sy = Math.max(0, Math.min(1, v)) * (sampleHeight - 1);
  const x0 = Math.floor(sx), y0 = Math.floor(sy), wx = sx - x0, wy = sy - y0;
  const a = (y0 * sampleWidth + x0) * 4;
  const b = (y0 * sampleWidth + Math.min(x0 + 1, sampleWidth - 1)) * 4;
  const stride = y0 < sampleHeight - 1 ? sampleWidth * 4 : 0;
  for (let channel = 0; channel < 3; channel++) {
    const upper = (1 - wx) * view[a + channel] + wx * view[b + channel];
    const lower = (1 - wx) * view[a + channel + stride] + wx * view[b + channel + stride];
    strip[dest + channel] = ((1 - wy) * upper + wy * lower) * shade;
  }
}

function paintMaskedShoe(strip, foot, view, boots, mirror) {
  const {points, left, right, columns} = foot;
  for (const {x, y, offset, cuff, shade} of points) {
    if (cuff && !boots) continue;
    const column = columns[x];
    const top = boots ? column.bootTop : column.top;
    const u = (x - left) / Math.max(1, right - left);
    const v = (y - top) / Math.max(1, column.bottom - top);
    paintSample(strip, offset, view, mirror ? 1 - u : u, v, shade);
  }
}

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
      const v = (level - top + extension) / (height + extension - 1);
      paintSample(strip, offset - stripTop * cellWidth * 4, view, mirror ? 1 - u : u, v);
    }
  }
}

export async function shoeLayers(pixels, row, frame) {
  const outfit = outfits[row];
  const maskColumn = maskedFrames.indexOf(frame);
  const footprints = maskColumn >= 0 ? maskedFeet(pixels, row, frame, maskColumn) : [];
  const feet = maskColumn >= 0 ? [] : ankleCenters[frame].map((_, side) => fitFoot(pixels, frame, side, outfit))
    .sort((a, b) => a.bottom - b.bottom);
  const facing = frame < 12 ? Math.floor(frame / 3) : 0;
  const profile = facing === 1 || facing === 2;
  const view = profile ? 1 : facing === 3 ? 2 : 0;
  const layers = [];
  for (const [kind, id] of footwearIds.entries()) {
    const strip = Buffer.from(pixels.subarray(stripTop * cellWidth * 4));
    const boots = id === "starShoes" || id === "honeyRainboots";
    for (const footprint of footprints) {
      const mirror = facing === 2 || (!profile && footprint.mid > cellWidth / 2);
      paintMaskedShoe(strip, footprint, contouredViews[id][view], boots, mirror);
    }
    for (const foot of feet) {
      const mirror = facing === 2 || (!profile && foot.ankle > cellWidth / 2);
      mappedShoe(strip, pixels, foot, shoeViews[id][view], boots, mirror, outfit);
    }
    const input = await sharp(strip, {raw:{width:cellWidth, height:footStripHeight, channels:4}}).png().toBuffer();
    layers.push({input, left:frame * cellWidth, top:(row * footwearIds.length + kind) * footStripHeight});
  }
  return layers;
}
