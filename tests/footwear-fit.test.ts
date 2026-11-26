import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { cellWidth, cellHeight, footStripHeight, footwearIds, outfitIndex, outfits } from "../src/costume-frames.ts";

const readAtlas = (name: string) => sharp(fileURLToPath(new URL("../src/assets/" + name, import.meta.url)))
  .ensureAlpha().raw().toBuffer({resolveWithObject:true});

test("each worn shoe keeps the ankle, moving sole and clothing silhouette in its garment's own frame", async () => {
  const [body, shoes] = await Promise.all([readAtlas("fufu-garments.webp"), readAtlas("fufu-footwear.webp")]);
  const frames = 14; // Twelve standing frames, sit on the ground, sit on the bench.
  for (let row = 0; row < outfits.length; row++) {
    for (const [kind, shoe] of footwearIds.entries()) {
      for (let frame = 0; frame < frames; frame++) {
        const bodyY = row * cellHeight + cellHeight - footStripHeight;
        const shoeY = (row * footwearIds.length + kind) * footStripHeight;
        for (let y = 0; y < footStripHeight; y++) {
          const x0 = frame * cellWidth;
          const garmentStart = ((bodyY + y) * body.info.width + x0) * 4;
          const shoeStart = ((shoeY + y) * shoes.info.width + x0) * 4;
          for (let x = 0; x < cellWidth; x++) {
            const alpha = x * 4 + 3;
            if (body.data[garmentStart + alpha] !== shoes.data[shoeStart + alpha])
              assert.fail(`${outfits[row]} / ${shoe} frame ${frame} displaced (${x}, ${y})`);
          }
        }
      }
    }
  }
});

test("the far foot under a long hem and both seated tabi receive the selected leather", async () => {
  const shoes = await readAtlas("fufu-footwear.webp");
  const kind = footwearIds.indexOf("pennyLoafers");
  for (const [clothes, frame, x, y] of [
    ["apricotNightgown", 11, 61, 167], ["apricotNightgown", 11, 80, 175],
    ["mikoOutfit", 13, 65, 177], ["mikoOutfit", 13, 79, 178],
  ] as const) {
    const row = outfitIndex(clothes) * footwearIds.length + kind;
    const imageY = row * footStripHeight + y - (cellHeight - footStripHeight);
    const offset = (imageY * shoes.info.width + frame * cellWidth + x) * 4;
    const [r, g, b, a] = shoes.data.subarray(offset, offset + 4);
    assert.ok(a > 200 && r - g > 35 && r - b > 45, clothes + " should show brown leather at " + x + ", " + y);
  }
});

test("the raised side-view toe samples the painted upper and sole of each source design", async () => {
  const shoes = await readAtlas("fufu-footwear.webp");
  const frame = 8, x = 119;
  const sample = (id: typeof footwearIds[number], y: number) => {
    const imageY = footwearIds.indexOf(id) * footStripHeight + y - (cellHeight - footStripHeight);
    const offset = (imageY * shoes.info.width + frame * cellWidth + x) * 4;
    return shoes.data.subarray(offset, offset + 4);
  };
  // The raised toe points right. Its upper is yellow on the rain boot and
  // cream on the canvas sneaker; their outsole material is visible below.
  const boot = sample("honeyRainboots", 160);
  const sneaker = sample("mintSneakers", 160);
  assert.ok(boot[3] > 220 && boot[0] > 175 && boot[1] > 130 && boot[1] - boot[2] > 65);
  assert.ok(sneaker[3] > 220 && Math.min(sneaker[0], sneaker[1], sneaker[2]) > 145);
  const bootSole = sample("honeyRainboots", 169);
  assert.ok(bootSole[3] > 200 && bootSole[0] < boot[0] - 50 && bootSole[1] < boot[1] - 60);
});
