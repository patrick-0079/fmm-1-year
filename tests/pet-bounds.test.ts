import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

test("pet placement bounds match the visible sprite, not the padded canvas", async () => {
  const folder = new URL("../src/launch/fufu-pet/", import.meta.url);
  const { visibleBounds } = JSON.parse(await readFile(new URL("rig.json", folder), "utf8"));
  const layer = (name: string) => fileURLToPath(new URL(name + ".webp", folder));
  const { data, info } = await sharp(layer("body"))
    .composite([{ input: layer("eyes") }, { input: layer("head") }])
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [600, 750]);
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let row = 0; row < info.height; row++) {
    for (let col = 0; col < info.width; col++) {
      if (data[(row * info.width + col) * 4 + 3] < 8) continue;
      left = Math.min(left, col);
      top = Math.min(top, row);
      right = Math.max(right, col);
      bottom = Math.max(bottom, row);
    }
  }
  assert.deepEqual(visibleBounds, { left, top, width: right - left + 1, height: bottom - top + 1 });
});
