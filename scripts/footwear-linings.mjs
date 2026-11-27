import { cellHeight, cellWidth, footStripHeight, outfits } from "../src/costume-frames.ts";

// The wide stock slippers hide fabric behind the folded legs on the
// ground. The two columns are exposed folds on either side of both feet.
// Their original pixels supply the fabric colour, woven border and alpha.
const seatedFolds = {
  base: [54, 93, 175],
  roseDress: [50, 97],
  mintCape: [49, 97],
  cloudPajamas: [54, 94, 176],
  apricotNightgown: [47, 100],
  sailorSet: [54, 93, 176],
  honeyOveralls: [51, 94, 175],
  witchDress: [54, 94],
  mikoOutfit: [50, 97],
};

// In the two frontal strides the raised zori obscures a pleat. Continue
// that same vertical fold down to its neighbours so its inked hem stays
// continuous when a lower shoe exposes the fabric underneath.
const raisedHakama = {1: [53, 75, 170], 2: [72, 95, 170]};

const isOriginalShoe = label => label === 1 || label === 2;
const stripTop = cellHeight - footStripHeight;

function restoreRaisedPleat(strip, pixels, mask, [left, right, baseline]) {
  for (let x = left; x <= right; x++) {
    let hem = baseline;
    for (; hem > baseline - 15; hem--) {
      const at = hem * cellWidth + x;
      const [r, g, b, a] = pixels.subarray(at * 4, at * 4 + 4);
      if (!isOriginalShoe(mask[at - stripTop * cellWidth]) && a > 128 && r > g * 1.6 && r - b > 42) break;
    }
    const extension = Math.round((baseline - hem) * .84);
    if (extension < 2 || hem === baseline - 15) continue;
    const start = hem - 8;
    for (let y = start; y <= hem + extension; y++) {
      const sourceY = start + Math.round((y - start) * (hem - start) / (hem + extension - start));
      const source = sourceY * cellWidth + x;
      if (isOriginalShoe(mask[source - stripTop * cellWidth])) continue;
      const dest = ((y - stripTop) * cellWidth + x) * 4;
      pixels.copy(strip, dest, source * 4, source * 4 + 4);
    }
  }
}

export function restoreGarmentLining(strip, pixels, mask, row, frame) {
  const outfit = outfits[row] ?? "base";
  if (outfit === "mikoOutfit" && raisedHakama[frame]) {
    restoreRaisedPleat(strip, pixels, mask, raisedHakama[frame]);
  }
  if (frame !== 12) return;
  const [left, right, hem = cellHeight - 1] = seatedFolds[outfit];
  for (let y = stripTop; y <= hem; y++) {
    const leftSample = (y * cellWidth + left) * 4;
    const rightSample = (y * cellWidth + right) * 4;
    const line = (y - stripTop) * cellWidth;
    const leftCovered = isOriginalShoe(mask[line + left]);
    const rightCovered = isOriginalShoe(mask[line + right]);
    if (leftCovered && rightCovered) continue;
    for (let x = left + 1; x < right; x++) {
      const at = line + x;
      if (!isOriginalShoe(mask[at])) continue;
      const t = leftCovered ? 1 : rightCovered ? 0 : (x - left) / (right - left);
      const leftWeight = (1 - t) * pixels[leftSample + 3];
      const rightWeight = t * pixels[rightSample + 3];
      const alpha = leftWeight + rightWeight;
      if (alpha < 1) continue;
      for (let channel = 0; channel < 3; channel++) {
        strip[at * 4 + channel] = Math.round((pixels[leftSample + channel] * leftWeight +
          pixels[rightSample + channel] * rightWeight) / alpha);
      }
      strip[at * 4 + 3] = Math.round(alpha);
    }
  }
}
