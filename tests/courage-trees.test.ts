import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { canTravelBetween, obstacleContainsFoot, polygonContains } from "../src/core.ts";
import { challengeTrees } from "../src/landscape.ts";
import { creeks } from "../src/creek-layout.ts";
import { scenes } from "../src/maps.ts";

const garden = scenes.challenge;
const creek = creeks.challenge;

test("every trunk in the courage garden stands on painted lawn clear of the stream banks", async () => {
  const bitmap = fileURLToPath(new URL("../src/assets/courage-garden.webp", import.meta.url));
  const { data, info } = await sharp(bitmap)
    .resize(garden.width, garden.height, { fit: "fill" })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const apple = garden.spots.find(spot => spot.id === "apple")!;
  const trees = [...challengeTrees, { ...apple, scale: 1 }];
  const roots = garden.walls.filter(wall => wall.label === "花园树根");
  assert.equal(roots.length, trees.length);

  for (const tree of trees) {
    const cx = tree.x, cy = tree.y + 23 * tree.scale;
    const label = `trunk at ${cx},${cy}`;
    assert.equal(roots.filter(wall => obstacleContainsFoot({ x: cx, y: cy }, wall)).length, 1, label + " needs its own solid base");

    // Sample the root flare in world pixels. Individual daisies can interrupt
    // the green lawn; peach cobblestones and the dense border beds cannot.
    const w = Math.ceil(12 * tree.scale), h = Math.ceil(6 * tree.scale);
    let grass = 0, samples = 0;
    for (let dy = -h; dy <= h; dy++) for (let dx = -w; dx <= w; dx++) {
      const p = (Math.round(cy + dy) * info.width + Math.round(cx + dx)) * info.channels;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      if (g >= .96 * r && g > 1.2 * b) grass++;
      samples++;
    }
    assert.ok(grass / samples >= .85, label + " overlaps the painted path or flowerbeds");

    // The stream is drawn over the bitmap, including a 13px bank stroke.
    const bank = 7;
    for (let dy = -h - bank; dy <= h + bank; dy++) for (let dx = -w - bank; dx <= w + bank; dx++) {
      const point = { x: cx + dx, y: cy + dy };
      assert.ok(!polygonContains(point, creek.upper) && !polygonContains(point, creek.lower), label + " overlaps the stream bank");
    }
  }
});

test("players can follow the bends in the painted path and pass either end of the stream bridge", () => {
  // Trace the paving from the entrance mat to the flower at the northern bend.
  const stonePath = [
    [450,555], [450,481], [445,458], [424,438], [383,422], [347,405], [322,385], [316,363],
    [324,341], [351,322], [395,305], [449,292], [502,282], [554,261], [581,244], [591,224],
    [589,204], [572,187], [547,170], [509,157], [466,144], [450,125],
  ];
  for (let i = 1; i < stonePath.length; i++) {
    const [ax, ay] = stonePath[i - 1], [bx, by] = stonePath[i];
    const length = Math.hypot(bx - ax, by - ay);
    for (const lane of [-11, 0, 11]) {
      const dx = lane * (by - ay) / length, dy = -lane * (bx - ax) / length;
      assert.ok(canTravelBetween({ x: ax + dx, y: ay + dy }, { x: bx + dx, y: by + dy }, garden),
        `painted path blocked between ${ax},${ay} and ${bx},${by}`);
    }
  }
  const { x, y, w, h } = creek.bridge;
  for (const lane of [-7, 0, 7]) {
    const bridgeY = y + h / 2 + lane;
    assert.ok(canTravelBetween({ x: x - 25, y: bridgeY }, { x: x + w + 25, y: bridgeY }, garden));
  }
});
