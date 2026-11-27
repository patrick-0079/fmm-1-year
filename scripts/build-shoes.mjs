import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { cellWidth, cellHeight, footStripHeight, footwearIds, outfits } from "../src/costume-frames.ts";
import { restoreGarmentLining } from "./footwear-linings.mjs";
import { figures, master, raster, readSheet } from "./wardrobe-sheets.mjs";

const stripTop = cellHeight - footStripHeight;
const frameCount = 14;
const maskUrl = new URL("../doc/artwork/wardrobe/footwear-profile-masks.png", import.meta.url);
const maskAtlas = await sharp(fileURLToPath(maskUrl)).removeAlpha().raw().toBuffer({resolveWithObject: true});
if (maskAtlas.info.width !== frameCount * cellWidth || maskAtlas.info.height !== outfits.length * footStripHeight) {
  throw new Error("Footwear masks must contain all fourteen poses for each outfit");
}

const starters = figures(await readSheet(master("starter-footwear")), 4, 3);
const originals = {
  ribbonShoes: figures(await readSheet(master("flats")), 2, 2),
  starShoes: figures(await readSheet(master("boots")), 2, 2),
  mintSneakers: starters.slice(0, 3),
  honeyRainboots: starters.slice(4, 7),
  pennyLoafers: starters.slice(8, 11),
};

// Front, left profile and rear sizes on a 144 × 184 character. The front
// and rear views are foreshortened for the map camera. Each opening records
// its centre, width and collar height on the artist's left-profile drawing.
const fittings = {
  ribbonShoes:   {sizes: [[18.5, 17.5], [27.3, 15.4], [18.3, 15.8]], opening: [.68, .56, .33]},
  starShoes:     {sizes: [[18.8, 22.4], [23.3, 23.2], [18.6, 22.7]], opening: [.65, .63, .19]},
  mintSneakers:  {sizes: [[17.6, 15.6], [27.7, 15.4], [17.9, 14.8]], opening: [.66, .61, .31]},
  honeyRainboots:{sizes: [[18.6, 22.6], [24.4, 23.7], [18.4, 22.5]], opening: [.65, .58, .22]},
  pennyLoafers:  {sizes: [[18.4, 15.2], [27.8, 14.5], [18.4, 14.9]], opening: [.66, .63, .29]},
};

const views = Object.fromEntries(await Promise.all(footwearIds.map(async id => {
  const art = await Promise.all(originals[id].slice(0, 3).map(async (original, view) => {
    const [width, height] = fittings[id].sizes[view];
    const sourceWidth = Math.round(width * 3);
    const sourceHeight = Math.round(height * 3);
    const pixels = await raster(original).resize(sourceWidth, sourceHeight, {fit: "fill"}).raw().toBuffer();
    return {pixels, sourceWidth, sourceHeight, width, height, opening: fittings[id].opening};
  }));
  return [id, art];
})));

// A front-facing step exposes the underside of the toe. Build it from the
// illustrated outsole and its border, under the foreshortened original upper.
async function frontStepViews(art) {
  const {pixels, sourceWidth, sourceHeight} = art;
  const raw = {width: sourceWidth, height: sourceHeight, channels: 4};
  const upperHeight = Math.round(sourceHeight * .72);
  const upper = await sharp(pixels, {raw}).resize(sourceWidth, upperHeight, {fit: "fill"}).raw().toBuffer();
  const toe = Buffer.alloc(pixels.length), retreat = Buffer.alloc(pixels.length);
  const bottomAt = new Int16Array(sourceWidth).fill(-1);
  for (let x = 0; x < sourceWidth; x++) {
    for (let y = sourceHeight - 1; y >= 0; y--) {
      if (pixels[(y * sourceWidth + x) * 4 + 3] > 115) { bottomAt[x] = y; break; }
    }
  }
  const tip = [...bottomAt.keys()].filter(x => bottomAt[x] > sourceHeight * .78);
  const left = tip[0], right = tip.at(-1);
  const middle = Math.floor((left + right) / 2);
  const swatch = (Math.floor(sourceHeight * .93) * sourceWidth + middle) * 4;
  const rim = (bottomAt[middle] * sourceWidth + middle) * 4;
  for (const x of tip) {
    const position = 2 * (x - left) / (right - left) - 1;
    const curve = Math.sqrt(Math.max(0, 1 - position * position));
    const join = bottomAt[x] * upperHeight / sourceHeight - 1.6;
    const end = Math.min(sourceHeight - .5, join + .325 * sourceHeight * curve);
    for (let y = Math.max(0, Math.floor(join)); y < Math.min(sourceHeight, Math.ceil(end)); y++) {
      const i = (y * sourceWidth + x) * 4;
      const boundary = Math.max(0, Math.min(y + 1 - join, end - y, 1));
      const depth = (y - join) / Math.max(1, end - join);
      const edge = clamp((1.8 - (end - y)) / 1.35, 0, 1);
      for (let channel = 0; channel < 3; channel++) {
        const material = pixels[swatch + channel] * (.88 - .08 * depth);
        toe[i + channel] = material * (1 - edge) + pixels[rim + channel] * edge;
      }
      toe[i + 3] = Math.round(255 * boundary);
    }
  }
  for (let y = 0; y < upperHeight; y++) for (let x = 0; x < sourceWidth; x++) {
    const i = (y * sourceWidth + x) * 4;
    compositePixel(toe, i, upper[i], upper[i + 1], upper[i + 2], upper[i + 3]);
  }

  // On the receding foot the calf conceals more of the opening. Compress
  // the upper portion of the art, preserving its toes, strap, sole and alpha.
  for (let y = 0; y < sourceHeight; y++) {
    const v = (y + .5) / sourceHeight;
    const originalY = Math.min(sourceHeight - 1, Math.floor((-.66 + Math.sqrt(.66 * .66 + 1.36 * v)) / .68 * sourceHeight));
    pixels.copy(retreat, y * sourceWidth * 4, originalY * sourceWidth * 4, (originalY + 1) * sourceWidth * 4);
  }
  return {
    forward: {...art, pixels: toe, width: art.width * 1.12, height: art.height * 1.13},
    retreat: {...art, pixels: retreat, width: art.width * .87, height: art.height * .86},
  };
}

// Split the back counter and insole from the parts that sit over the foot.
// The ankle can then enter the opening without covering the strap or tongue.
function frontFacingUpper(id, art) {
  const front = Buffer.from(art.pixels);
  for (let y = 0; y < art.sourceHeight; y++) for (let x = 0; x < art.sourceWidth; x++) {
    const index = (y * art.sourceWidth + x) * 4;
    const u = (x + .5) / art.sourceWidth, v = (y + .5) / art.sourceHeight;
    const curve = (2 * u - 1) ** 2;
    let behind;
    switch (id) {
      case "ribbonShoes": {
        const strap = v >= .26 + .18 * curve && v <= .405 + .15 * curve;
        behind = !strap && v < .54 - .045 * curve;
        break;
      }
      case "starShoes": behind = v < .145 - .065 * curve; break;
      case "mintSneakers": behind = v < .278 - .055 * curve; break;
      case "honeyRainboots": {
        const pullTab = u > .34 && u < .66 && v < .21;
        behind = !pullTab && v < .216 - .046 * curve;
        break;
      }
      case "pennyLoafers": behind = v < .235 + .19 * curve; break;
    }
    if (behind) front[index + 3] = 0;
  }
  return front;
}

const frontSteps = Object.fromEntries(await Promise.all(footwearIds.map(async id => {
  const art = views[id][0];
  art.frontPixels = frontFacingUpper(id, art);
  const variants = await frontStepViews(art);
  const uppers = await frontStepViews({...art, pixels: art.frontPixels});
  for (const pose of ["forward", "retreat"]) variants[pose].frontPixels = uppers[pose].pixels;
  return [id, variants];
})));

const soleSlopes = {4: [.40, -.24], 5: [.45, -.30], 7: [.35, -.38], 8: [.40, -.44]};
// Where a trouser cuff covers the ankle, use the same walk cycle's joint
// offset from the slipper centre instead of looking for bare skin.
const coveredAnkles = {3: [2, 2], 4: [7, 0], 5: [7, -1], 6: [-2, -2], 7: [1, -5], 8: [1, -6]};
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
const underStrip = index => (stripTop * cellWidth + index) * 4;

function poseMask(row, frame) {
  const result = Buffer.alloc(cellWidth * footStripHeight);
  for (let y = 0; y < footStripHeight; y++) {
    for (let x = 0; x < cellWidth; x++) {
      const pixel = (row * footStripHeight + y) * maskAtlas.info.width + frame * cellWidth + x;
      const offset = pixel * maskAtlas.info.channels;
      const [near, cuff, far] = maskAtlas.data.subarray(offset, offset + 3);
      if (near || far) result[y * cellWidth + x] = (near ? 1 : 2) + (cuff ? 2 : 0);
    }
  }
  return result;
}

export function clearFootwear(pixels, row, frame, mask = poseMask(row, frame)) {
  const clean = Buffer.from(pixels.subarray(underStrip(0)));
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1 || mask[i] === 2) clean.fill(0, i * 4, i * 4 + 4);
  }
  return clean;
}

function measureAnkle(pixels, mask, joint) {
  const widths = [], centers = [];
  for (const offsetY of [-2, -1, 0]) {
    const y = Math.round(joint.y) + offsetY;
    const isLeg = x => {
      if (x < 0 || x >= cellWidth) return false;
      const index = y * cellWidth + x;
      if (mask[index] === 1 || mask[index] === 2) return false;
      const offset = underStrip(index);
      return pixels[offset + 3] > 155 && pixels[offset + 1] > 106 && pixels[offset] > 150;
    };
    const start = Math.round(joint.x);
    if (!isLeg(start)) continue;
    let left = start, right = start;
    while (isLeg(left - 1) && start - left < 16) left--;
    while (isLeg(right + 1) && right - start < 16) right++;
    if (right - left >= 4 && right - left < 25) {
      widths.push(right - left + 4); // include the ink on both sides of the leg
      centers.push((left + right) / 2);
    }
  }
  const median = samples => samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  return widths.length ? {width: median(widths), center: median(centers)} : {width: 16, center: joint.x};
}

function measureFeet(pixels, mask, frame) {
  const soles = [[], []], cuffs = [[], []];
  const profile = frame >= 3 && frame <= 8;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || pixels[underStrip(i) + 3] < 105) continue;
    const points = mask[i] <= 2 ? soles : cuffs;
    points[(mask[i] - 1) % 2].push({x: i % cellWidth, y: Math.floor(i / cellWidth)});
  }
  if (!soles[0].length) throw new Error(`Missing near foot in frame ${frame}`);
  const feet = soles.filter(points => points.length).map((points, side) => {
    const xs = points.map(p => p.x);
    const left = Math.min(...xs), right = Math.max(...xs);
    const center = (left + right) / 2, slot = center < 70 ? 0 : 1;
    const bottom = Math.max(...points.map(p => p.y));
    const scale = clamp((right - left + 1) / (profile ? 27 : 19), .88, 1.065);
    const markers = cuffs[side];
    const joint = markers.length ? {
      x: markers.reduce((sum, p) => sum + p.x, 0) / markers.length,
      y: markers.reduce((sum, p) => sum + p.y, 0) / markers.length,
    } : {x: center + (coveredAnkles[frame]?.[slot] ?? 0), y: bottom - 14};
    const ankle = markers.length && profile ? measureAnkle(pixels, mask, joint) : {width: 16, center: joint.x};
    joint.x = ankle.center;
    return {
      center, bottom, joint, scale, slope: soleSlopes[frame]?.[slot] ?? 0,
      ankleWidth: clamp(ankle.width, 13, 22), far: side === 1,
    };
  });
  if (frame === 3 || frame === 6) {
    const near = feet[0], sign = frame === 3 ? -1 : 1;
    // A long skirt can hide the far slipper entirely. Its replacement still
    // occupies that foot, behind the near shoe and in front of its own ankle.
    const far = feet[1] ?? {...near, far: true};
    if (!feet[1] || !cuffs[1].length) {
      far.joint = {x: near.joint.x + sign * (feet[1] ? 8 : 3), y: near.joint.y - 1};
    }
    far.bottom = Math.min(far.bottom, near.bottom - (feet[1] ? 1.8 : 2.5));
    far.scale = near.scale * .94;
    if (!feet[1]) feet.push(far);
  }
  return feet.reverse(); // painter's order, far before near
}

const longHems = new Set(["roseDress", "mintCape", "apricotNightgown", "witchDress", "mikoOutfit"]);
function hemInFront(pixels, mask, outfit, frame) {
  const protectedFabric = new Uint8Array(mask.length);
  if (!longHems.has(outfit) || frame >= 12) return protectedFabric;
  // Where a foot obscures the hem, interpolate the line between the exposed
  // fabric-to-background edges on both sides of the ankle.
  const edge = new Map();
  for (let x = 27; x < cellWidth - 27; x++) {
    for (let y = 13; y < footStripHeight - 9; y++) {
      const at = y * cellWidth + x;
      const alpha = index => pixels[underStrip(index) + 3];
      if (mask[at] || mask[at + cellWidth] || alpha(at) < 85 || alpha(at - cellWidth * 2) < 90) continue;
      if (alpha(at + cellWidth) < 68 && alpha(at + cellWidth * 2) < 30 && alpha(at + cellWidth * 3) < 30) {
        edge.set(x, y);
      }
    }
  }
  if (edge.size < 5) return protectedFabric;
  const sorted = [...edge.values()].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)];
  const visible = [...edge].filter(([, y]) => Math.abs(y - typical) <= 6);
  for (let x = 25; x < cellWidth - 25; x++) {
    const left = visible.filter(([sx]) => sx <= x).at(-1);
    const right = visible.find(([sx]) => sx >= x);
    if (!left && !right) continue;
    const first = left ?? right, last = right ?? left;
    if (Math.min(Math.abs(x - first[0]), Math.abs(x - last[0])) > 25) continue;
    const fraction = first[0] === last[0] ? 0 : (x - first[0]) / (last[0] - first[0]);
    const bottom = Math.round(first[1] * (1 - fraction) + last[1] * fraction);
    for (let y = 0; y <= bottom; y++) protectedFabric[y * cellWidth + x] = 1;
  }
  return protectedFabric;
}

function sampleLeg(pixels, mask, protectedFabric, foot, outfit) {
  const pants = outfit === "cloudPajamas" || outfit === "honeyOveralls";
  const isLegMaterial = (x, y) => {
    if (x < 1 || x >= cellWidth - 1 || y < 0 || y >= footStripHeight) return false;
    const i = y * cellWidth + x;
    if (mask[i] === 1 || mask[i] === 2 || protectedFabric[i]) return false;
    const [r, g, b, a] = pixels.subarray(underStrip(i), underStrip(i) + 4);
    if (a < 135) return false;
    if (pants) {
      const cuff = outfit === "honeyOveralls" ? r > g + 12 && g > b + 6 : r + g + b > 520;
      return r > 130 && g > 100 && cuff;
    }
    return (r > 174 && g > 110 && b > 84 && r > g + 4 && r > b + 7)
      || (outfit === "mikoOutfit" && r > 200 && g > 155 && b > 150);
  };
  // Find a complete visible slice of the actual calf immediately above the
  // source shoe; an isolated highlight at the edge is not a usable slice.
  const first = Math.min(footStripHeight - 1, Math.round(foot.joint.y + 5));
  let best;
  for (let y = first; y >= Math.max(2, foot.bottom - 33); y--) {
    const center = Math.round(foot.joint.x - foot.slope * (y - foot.joint.y));
    let seed;
    for (const shift of [0, -1, 1, -2, 2, -3, 3]) {
      if (isLegMaterial(center + shift, y)) {
        seed = center + shift;
        break;
      }
    }
    if (seed === undefined) continue;
    let left = seed, right = seed;
    while (isLegMaterial(left - 1, y)) left--;
    while (isLegMaterial(right + 1, y)) right++;
    const width = right - left + 1;
    if (width > 25 || width < 3) continue;
    const span = {left, right, y};
    const usableWidth = pants ? 14 : Math.min(foot.ankleWidth * .57, 9);
    if (width >= usableWidth && Math.abs((left + right) / 2 - center) <= (pants ? 3 : 5)) return span;
    if (!best || width > best.right - best.left + 1) best = span;
  }
  if (best && best.right - best.left >= (pants ? 12 : 6)) return best;
  // The stock slipper sometimes hides the entire ankle beneath a long hem;
  // continue the character's bare leg or white tabi from underneath it.
  const y = clamp(Math.floor(Math.min(foot.joint.y - 2, foot.bottom - 17)), 0, footStripHeight - 1);
  const center = foot.joint.x - foot.slope * (y - foot.joint.y);
  const half = (pants ? .5 : .44) * foot.ankleWidth;
  const fill = {mikoOutfit: [250, 231, 231], honeyOveralls: [232, 179, 116], cloudPajamas: [244, 229, 209]}[outfit]
    ?? [250, 220, 205];
  return {left: Math.round(center - half), right: Math.round(center + half), y, fill};
}

function restoreLeg(legs, pixels, mask, section, geometry) {
  const {width, height, sin, cos, pivotX, pivotY, ankleOffset, profile} = geometry;
  const targetX = pivotX + cos * ankleOffset + sin * height * .29;
  const targetY = pivotY + sin * ankleOffset - cos * height * .29;
  if (targetY <= section.y) return;
  const startX = (section.left + section.right) / 2;
  const startWidth = section.right - section.left + 3;
  const endWidth = Math.min(startWidth, width * (profile ? .59 : .73));
  // Continue the calf behind the opening of the selected shoe. Use its own
  // source skin, stocking, or trouser cuff, including the ink at the sides.
  for (let y = section.y; y <= Math.min(footStripHeight - 1, Math.ceil(targetY)); y++) {
    const progress = clamp((y - section.y) / (targetY - section.y), 0, 1);
    const center = startX * (1 - progress) + targetX * progress;
    const across = startWidth * (1 - progress) + endWidth * progress;
    for (let x = Math.max(0, Math.floor(center - across / 2)); x <= Math.min(cellWidth - 1, Math.ceil(center + across / 2)); x++) {
      const coverage = clamp(across / 2 + .5 - Math.abs(x - center), 0, 1);
      if (!coverage) continue;
      const unit = clamp((x - center) / across + .5, 0, 1);
      const sx = clamp(Math.round(section.left - 1 + unit * (startWidth - 1)), section.left - 1, section.right + 1);
      const index = section.y * cellWidth + sx;
      const offset = underStrip(index);
      const edge = Math.min(unit, 1 - unit) < .11;
      // Never pick up a remnant from pixels known to belong to the old slipper.
      const sample = pixels[offset + 3] > 140 && mask[index] !== 1 && mask[index] !== 2
        ? offset : underStrip(section.y * cellWidth + clamp(sx, section.left, section.right));
      const colour = section.fill ?? pixels.subarray(sample, sample + 3);
      const shade = edge && colour[1] > 125 ? .61 : 1;
      compositePixel(legs, (y * cellWidth + x) * 4, colour[0] * shade, colour[1] * shade, colour[2] * shade, coverage * 255);
    }
  }
}

function exposedAnkles(pixels, mask, outfit) {
  const allowed = new Uint8Array(mask.length);
  if (outfit === "cloudPajamas" || outfit === "honeyOveralls") return allowed;
  const isSkin = index => {
    if (index < 0 || index >= mask.length) return false;
    const [r, g, b, a] = pixels.subarray(underStrip(index), underStrip(index) + 4);
    const skin = r > 170 && g > 105 && b > 88 && r > g + 5 && r > b + 8;
    const tabi = outfit === "mikoOutfit" && r > 200 && g > 160 && b > 155;
    return a > 65 && (skin || tabi);
  };
  // Follow the lower leg up from an exposed ankle. A dark skirt seam stops
  // the fill even when the skin and cream hem have very similar colours.
  const queue = [], distance = new Uint8Array(mask.length);
  for (let i = cellWidth; i < mask.length; i++) {
    const cuff = mask[i] >= 3;
    if (!cuff && !(mask[i] && !mask[i - cellWidth] && isSkin(i - cellWidth))) continue;
    const start = cuff ? i : i - cellWidth;
    if (!distance[start]) {
      distance[start] = 1;
      queue.push(start);
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    allowed[index] = 1;
    if (distance[index] >= 10) continue;
    for (const neighbour of [index - 1, index + 1, index - cellWidth, index + cellWidth]) {
      if (distance[neighbour] || mask[neighbour] || !isSkin(neighbour)) continue;
      distance[neighbour] = distance[index] + 1;
      queue.push(neighbour);
    }
  }
  // Include the ankle's outside ink and the double outline where two legs
  // touch. Both stop at a boot opening. The scarlet hakama stays in front.
  for (const index of queue) {
    if (!isSkin(index)) continue;
    const x = index % cellWidth;
    for (let shift = -3; shift <= 3; shift++) {
      const neighbour = index + shift;
      if (x + shift < 0 || x + shift >= cellWidth || allowed[neighbour]) continue;
      const offset = underStrip(neighbour);
      const skirt = outfit === "mikoOutfit" && pixels[offset] > pixels[offset + 1] * 1.48
        && pixels[offset] - pixels[offset + 2] > 28;
      if (!skirt) allowed[neighbour] = 1;
    }
  }
  return allowed;
}

function compositePixel(out, i, red, green, blue, alpha) {
  if (!alpha) return;
  const below = out[i + 3] * (1 - alpha / 255);
  const combined = alpha + below;
  out[i] = (red * alpha + out[i] * below) / combined;
  out[i + 1] = (green * alpha + out[i + 1] * below) / combined;
  out[i + 2] = (blue * alpha + out[i + 2] * below) / combined;
  out[i + 3] = Math.round(combined);
}

function soleContact(art, width, height, mirror, sin, cos) {
  const {pixels, sourceWidth, sourceHeight} = art;
  let lowest = -Infinity;
  for (let x = 0; x < sourceWidth; x++) {
    for (let y = sourceHeight - 1; y >= 0; y--) {
      if (pixels[(y * sourceWidth + x) * 4 + 3] < 110) continue;
      const horizontal = ((mirror ? sourceWidth - x - .5 : x + .5) / sourceWidth - .5) * width;
      const vertical = ((y + .5) / sourceHeight - 1) * height;
      lowest = Math.max(lowest, sin * horizontal + cos * vertical);
      break;
    }
  }
  return lowest;
}

const sampleOffsets = [.125, .375, .625, .875];
function shoeGeometry(foot, art, mirror, profile) {
  const [opening, openingWidth, openingHeight] = art.opening;
  const naturalWidth = art.width * foot.scale;
  const width = profile ? clamp((foot.ankleWidth + .8) / openingWidth, naturalWidth, naturalWidth * 1.19) : naturalWidth;
  const height = art.height * foot.scale;
  const angle = Math.atan(foot.slope), cos = Math.cos(angle), sin = Math.sin(angle);
  const pivotY = foot.bottom + .5 - soleContact(art, width, height, mirror, sin, cos);
  const ankleOffset = profile ? (mirror ? .5 - opening : opening - .5) * width : 0;
  const pivotX = profile
    ? foot.joint.x + .5 - foot.slope * (pivotY - foot.joint.y - .5) - ankleOffset / cos
    : foot.center + .5;
  return {width, height, cos, sin, pivotX, pivotY, ankleOffset, openingHeight, profile};
}

function drawShoe(layer, counters, uppers, trim, foot, art, mirror, geometry, standingSide) {
  const {width, height, cos, sin, pivotX, pivotY, ankleOffset, openingHeight, profile} = geometry;
  const extent = Math.ceil(width * .65 + height);
  const shade = foot.far ? (standingSide ? .83 : .91) : 1;
  for (let y = Math.max(0, Math.floor(pivotY - extent)); y < Math.min(footStripHeight, Math.ceil(pivotY + extent)); y++) {
    for (let x = Math.max(0, Math.floor(pivotX - extent)); x < Math.min(cellWidth, Math.ceil(pivotX + extent)); x++) {
      const index = y * cellWidth + x;
      if (profile) {
        const dx = x + .5 - pivotX, dy = y + .5 - pivotY;
        const across = cos * dx + sin * dy, depth = (-sin * dx + cos * dy) / height + 1;
        if (depth >= openingHeight && depth <= 1.08 && Math.abs(across - ankleOffset) <= foot.ankleWidth * .62 + 2) {
          trim[index] = 1;
        }
      }
      // Area-sample the original transparency as well as the colour. The
      // spaces behind the heel and between a strap and a cuff remain clear.
      let alpha = 0, red = 0, green = 0, blue = 0;
      let counterAlpha = 0, counterRed = 0, counterGreen = 0, counterBlue = 0;
      for (const offsetY of sampleOffsets) {
        for (const offsetX of sampleOffsets) {
          const dx = x + offsetX - pivotX, dy = y + offsetY - pivotY;
          let u = (cos * dx + sin * dy) / width + .5;
          const v = (-sin * dx + cos * dy) / height + 1;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
          if (mirror) u = 1 - u;
          const sx = Math.min(art.sourceWidth - 1, Math.floor(u * art.sourceWidth));
          const sy = Math.min(art.sourceHeight - 1, Math.floor(v * art.sourceHeight));
          const source = (sy * art.sourceWidth + sx) * 4;
          const weight = art.pixels[source + 3];
          alpha += weight;
          red += weight * art.pixels[source];
          green += weight * art.pixels[source + 1];
          blue += weight * art.pixels[source + 2];
          if (art.frontPixels) {
            const behind = Math.max(0, weight - art.frontPixels[source + 3]);
            counterAlpha += behind;
            counterRed += behind * art.pixels[source];
            counterGreen += behind * art.pixels[source + 1];
            counterBlue += behind * art.pixels[source + 2];
          }
        }
      }
      if (!alpha) continue;
      compositePixel(layer, index * 4, red / alpha * shade, green / alpha * shade, blue / alpha * shade, alpha / 16);
      if (!art.frontPixels) continue;
      if (counterAlpha) compositePixel(counters, index * 4, shade * counterRed / counterAlpha,
        shade * counterGreen / counterAlpha, shade * counterBlue / counterAlpha, counterAlpha / 16);
      const frontAlpha = alpha - counterAlpha;
      if (frontAlpha) compositePixel(uppers, index * 4, shade * (red - counterRed) / frontAlpha,
        shade * (green - counterGreen) / frontAlpha, shade * (blue - counterBlue) / frontAlpha, frontAlpha / 16);
    }
  }
}

export async function shoeLayers(pixels, row, frame) {
  const mask = poseMask(row, frame);
  const clean = clearFootwear(pixels, row, frame, mask);
  restoreGarmentLining(clean, pixels, mask, row, frame);
  const protectedFabric = hemInFront(pixels, mask, outfits[row], frame);
  const ankles = exposedAnkles(pixels, mask, outfits[row]);
  const feet = measureFeet(pixels, mask, frame);
  if (frame === 1 || frame === 2) {
    for (const foot of feet) {
      const right = foot.center > cellWidth / 2;
      // In the shrine walk both lifted sandals face the viewer. The other
      // bodies lift the left toe towards the viewer and draw the right back.
      const forward = frame === 1 ? !right : outfits[row] === "mikoOutfit" && right;
      const near = frame === 2 && outfits[row] === "mikoOutfit" ? right : !right;
      foot.far = !near;
      foot.frontStep = forward ? "forward" : foot.far ? "retreat" : undefined;
    }
    feet.sort((a, b) => Number(b.far) - Number(a.far));
  }
  const legSections = feet.map(foot => sampleLeg(pixels, mask, protectedFabric, foot, outfits[row]));
  const facing = frame < 12 ? Math.floor(frame / 3) : 0;
  const profile = facing === 1 || facing === 2;
  const view = profile ? 1 : facing === 3 ? 2 : 0;
  const result = [];
  for (const [kind, id] of footwearIds.entries()) {
    const shoes = Buffer.alloc(clean.length);
    const counters = Buffer.alloc(clean.length), uppers = Buffer.alloc(clean.length);
    const legs = Buffer.alloc(clean.length);
    const trim = new Uint8Array(mask.length);
    for (const [index, foot] of feet.entries()) {
      const mirror = facing === 2 || (!profile && foot.center > cellWidth / 2);
      const art = foot.frontStep ? frontSteps[id][foot.frontStep] : views[id][view];
      const geometry = shoeGeometry(foot, art, mirror, profile);
      restoreLeg(legs, pixels, mask, legSections[index], geometry);
      drawShoe(shoes, counters, uppers, trim, foot, art, mirror, geometry, frame === 3 || frame === 6);
    }
    const strip = Buffer.from(clean);
    for (let index = 0; index < mask.length; index++) {
      const offset = index * 4;
      const removed = mask[index] === 1 || mask[index] === 2;
      const fabric = !removed && protectedFabric[index] && pixels[underStrip(index) + 3] > 0;
      if (trim[index] && ankles[index] && !fabric) strip.fill(0, offset, offset + 4);
      if (legs[offset + 3] && (removed || !pixels[underStrip(index) + 3] || (trim[index] && ankles[index] && !fabric))) {
        compositePixel(strip, offset, legs[offset], legs[offset + 1], legs[offset + 2], legs[offset + 3]);
      }
      if (!shoes[offset + 3]) continue;
      const ankleHere = legs[offset + 3] || (ankles[index] && !removed && pixels[underStrip(index) + 3]);
      if (!fabric && counters[offset + 3] && ankleHere) {
        const body = [...strip.subarray(offset, offset + 4)];
        counters.copy(strip, offset, offset, offset + 4);
        compositePixel(strip, offset, ...body);
        compositePixel(strip, offset, uppers[offset], uppers[offset + 1], uppers[offset + 2], uppers[offset + 3]);
      } else if (!fabric && (mask[index] || ankles[index] || !clean[offset + 3])) {
        compositePixel(strip, offset, shoes[offset], shoes[offset + 1], shoes[offset + 2], shoes[offset + 3]);
      } else {
        shoes.copy(strip, offset, offset, offset + 4);
        compositePixel(strip, offset, clean[offset], clean[offset + 1], clean[offset + 2], clean[offset + 3]);
      }
    }
    const input = await sharp(strip, {raw: {width: cellWidth, height: footStripHeight, channels: 4}}).png().toBuffer();
    result.push({input, left: frame * cellWidth, top: (row * footwearIds.length + kind) * footStripHeight});
  }
  return result;
}
