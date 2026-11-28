import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { campEncounterIds } from "../src/camp-encounters.ts";
import { campEncounterExpression, campExpressionDrawings, campExpressionRect, campRestExpression } from "../src/camp-expression-cels.ts";
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
  assert.equal(expressions.info.width, campExpressionDrawings.length * rect.width);
  const seated = poseFrame("sitting", 0, 0);
  for (const [row, outfit] of outfits.entries()) {
    const [left, right, irisY, lipY] = features[row];
    for (const [cel, drawing] of campExpressionDrawings.entries()) {
      const label = [outfit ?? "base", drawing].join("/");
      const tasting = drawing === "closing" || drawing === "bite" || drawing === "taste";
      const blink = drawing === "blinkHalf" || drawing === "blinkShut", smile = drawing === "softSmile";
      const gaze = !tasting && !blink && !smile;
      const changed = [0, 0], originalIris = [0, 0], visibleIris = [0, 0];
      const lashColumns = [new Set<number>(), new Set<number>()];
      let changedMouth = 0;
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
        if (drawing === "blinkShut" && Math.abs(x - eyeX) <= 6 && y >= irisY - 2 && y <= irisY + 5 &&
            g + dg < 170) lashColumns[side].add(x);
        if (Math.abs(x - eyeX) <= 6 && Math.abs(y - irisY) <= 6 && irisColours[side](r, g, blue)) {
          originalIris[side]++;
          if (irisColours[side](r + dr, g + dg, blue + db)) visibleIris[side]++;
        }
        if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) < 1) continue;
        const eye = Math.abs(x - eyeX) <= (gaze ? 3 : 12) && Math.abs(y - irisY) <= (gaze ? 4 : 11);
        const lips = (tasting || smile) && Math.abs(x - (row === 6 ? 72 : 74)) <= 6 && Math.abs(y - lipY) <= 4;
        assert.ok(eye || lips, `${label} repaints the seated portrait at (${x}, ${y})`);
        if (eye) changed[side]++;
        if (lips) changedMouth++;
      }
      assert.ok(originalIris.every(n => n > 35), label + " has no matching original seated eyes");
      const remaining = visibleIris.map((n, i) => n / originalIris[i]);
      if (gaze) {
        assert.ok(changed.every(n => n <= 25), label + " repaints more than the pupils");
        assert.ok(remaining.every(n => n >= .8), label + " loses the original iris colour");
      } else if (drawing === "blinkHalf") {
        assert.ok(remaining.every(n => n > .12 && n < .85), label + " must show part of both original irises");
      } else if (smile) {
        assert.ok(remaining.every(n => n > .7), label + " changes too much of the original eyes");
        assert.ok(changedMouth >= 4, label + " must lift the mouth");
      } else if (drawing !== "closing") {
        assert.ok(remaining.every(n => n < .1), label + " leaves the iris showing through the closed lashes");
        if (drawing === "blinkShut") assert.ok(lashColumns.every(columns => columns.size >= 10),
          label + " needs a visible eyelid across each closed eye");
      }
    }
  }
});

test("the nine costumes retain the approved closing, bite and tasting drawings", async () => {
  const {width, height} = campExpressionRect;
  const sheet = new URL("../src/assets/meadow-camp-expressions.webp", import.meta.url);
  const bite = await sharp(await readFile(sheet)).extract({
    left: campExpressionDrawings.indexOf("closing") * width, top: 0, width: 3 * width, height: outfits.length * height,
  }).ensureAlpha().raw().toBuffer();
  // WebP may encode invisible RGB differently when more columns are added to the sheet.
  for (let i = 0; i < bite.length; i += 4) if (bite[i + 3] === 0) bite.fill(0, i, i + 3);
  assert.equal(createHash("sha256").update(bite).digest("hex"),
    "735f8cc2c17046b00f4ea50f9fcceccc0af1676327e2c07fbb2079d3c3a12ba2");
});

test("rest and every visitor's response window animate a blink with distinct half and closed drawings", () => {
  const half = campExpressionDrawings.indexOf("blinkHalf"), shut = campExpressionDrawings.indexOf("blinkShut");
  const resting: number[] = [];
  for (let step = 0; step < 360; step++) {
    resting.push(campRestExpression(step / 60, false));
    assert.equal(campRestExpression(step / 60, true), -1);
  }
  const hasBlink = (frames: number[]) => {
    const transitions = frames.filter((frame, i) => i === 0 || frame !== frames[i - 1]);
    return transitions.some((frame, i) => frame === half && transitions[i + 1] === shut && transitions[i + 2] === half);
  };
  assert.ok(hasBlink(resting), "resting must lower and lift the eyelids");
  for (const id of campEncounterIds) {
    const waiting = resting.map((_, step) => campEncounterExpression({id, phase:"waiting", elapsed:step / 60}, 3, false));
    assert.ok(hasBlink(waiting), id + " must lower and lift the eyelids while the player decides");
  }
});
