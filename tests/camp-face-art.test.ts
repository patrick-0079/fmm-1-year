import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { campEncounterIds } from "../src/camp-encounters.ts";
import { campExpressionCel, campExpressionRect } from "../src/camp-expression-cels.ts";
import { cellHeight, cellWidth, outfits, poseFrame } from "../src/costume-frames.ts";

async function artwork(name: string) {
  const url = new URL("../src/assets/" + name, import.meta.url);
  return sharp(await readFile(url)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
}

// Iris centres measured on the original seated wardrobe art, independently of the camp sheets.
// The overalls sit higher. Several other costumes also differ by a pixel or two.
const features = [
  [60, 86, 101, 110], [61, 87, 102, 111], [60, 86, 104, 112],
  [61, 87, 102, 110], [60, 86, 103, 111], [61, 88, 103, 111],
  [59, 85, 100, 108], [61, 87, 103, 111], [61, 87, 102, 110],
];
const irisColours = [
  (r: number, g: number, b: number) => g > r + 7 && g > b + 3,
  (r: number, g: number, b: number) => r > g + 40 && b > g + 17 && g < 120 && r > b + 9,
];

test("all camp cels keep the seated costume's face contour, fringe, nose and original eye drawing", async () => {
  const [master, expressions] = await Promise.all([artwork("fufu-garments.webp"), artwork("meadow-camp-expressions.webp")]);
  const rect = campExpressionRect;
  assert.equal(expressions.info.height, outfits.length * rect.height);
  assert.equal(expressions.info.width % rect.width, 0);
  const columns = expressions.info.width / rect.width;
  const seated = poseFrame("sitting", 0, 0);
  for (const [row, outfit] of outfits.entries()) {
    const [left, right, irisY, lipY] = features[row];
    for (const id of campEncounterIds) {
      for (let frame = 0; frame < 16; frame++) {
        const cel = campExpressionCel(id, frame), label = [outfit ?? "base", id, frame].join("/");
        const tasting = id === "marshmallow" && frame >= 11 && frame <= 13;
        if (frame === 0) assert.equal(cel, -1, label + " must enter on the seated portrait");
        if (cel === -1) {
          assert.ok(!tasting, label + " is missing the tasting expression");
          continue;
        }
        assert.ok(Number.isInteger(cel) && cel >= 0 && cel < columns, label + " has no expression cel");
        const changed = [0, 0], originalIris = [0, 0], visibleIris = [0, 0];
        for (let py = 0; py < rect.height; py++) for (let px = 0; px < rect.width; px++) {
          const x = rect.x + px, y = rect.y + py;
          const a = 4 * ((row * cellHeight + y) * master.info.width + seated * cellWidth + x);
          const b = 4 * ((row * rect.height + py) * expressions.info.width + cel * rect.width + px);
          const side = x < (left + right) / 2 ? 0 : 1;
          const eyeX = side === 0 ? left : right;
          const opacity = expressions.data[b + 3] / 255;
          const r = master.data[a], g = master.data[a + 1], blue = master.data[a + 2];
          const dr = opacity * (expressions.data[b] - r);
          const dg = opacity * (expressions.data[b + 1] - g);
          const db = opacity * (expressions.data[b + 2] - blue);
          if (Math.abs(x - eyeX) <= 6 && Math.abs(y - irisY) <= 6 && irisColours[side](r, g, blue)) {
            originalIris[side]++;
            if (irisColours[side](r + dr, g + dg, blue + db)) visibleIris[side]++;
          }
          if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) < 1) continue;
          const eye = Math.abs(x - eyeX) <= (tasting ? 12 : 3) && Math.abs(y - irisY) <= (tasting ? 11 : 4);
          const lips = tasting && Math.abs(x - (row === 6 ? 72 : 74)) <= 6 && Math.abs(y - lipY) <= 4;
          assert.ok(eye || lips, `${label} repaints the seated portrait at (${x}, ${y})`);
          if (eye) changed[side]++;
        }
        assert.ok(originalIris.every(n => n > 35), label + " has no matching original seated eyes");
        if (!tasting) {
          assert.ok(changed.every(n => n <= 25), label + " repaints more than the pupils");
          assert.ok(visibleIris.every((n, i) => n >= originalIris[i] * .8), label + " loses the original iris colour");
        } else if (frame >= 12) {
          assert.ok(visibleIris.every((n, i) => n < originalIris[i] * .1),
            label + " leaves the iris showing through the closed lashes");
        }
      }
    }
  }
});
