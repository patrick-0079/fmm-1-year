import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { equipmentParts } from "../src/equipment.ts";
import frames from "../src/wardrobe-icons.json" with { type: "json" };

test("both heart clips keep an open centre and a visible rim at wearable scale", async () => {
  const [clip] = equipmentParts({hair:"heartClip"}, "standing", 0);
  const size = Math.round(clip.w);
  const atlasFrames: [string, number[]][] = [
    ["wardrobe-icons.webp", frames.heartClip],
    ["worn-jewelry.webp", [160, 40, 40, 40]],
  ];
  for (const [name, [left, top, width, height]] of atlasFrames) {
    const alpha = await sharp(fileURLToPath(new URL("../src/assets/" + name, import.meta.url)))
      .extract({left, top, width, height}).resize(size, size, {fit:"fill"})
      .ensureAlpha().extractChannel("alpha").raw().toBuffer();
    const middle = (size - 1) / 2;
    for (const y of [Math.round(size * .3), Math.round(size * .4)]) {
      const row = alpha.subarray(y * size, (y + 1) * size);
      assert.ok(row[Math.floor(middle)] < 16 && row[Math.ceil(middle)] < 16, name + " must show the hair through its centre");
      assert.ok(Math.max(...row.subarray(0, Math.floor(middle))) > 120 && Math.max(...row.subarray(Math.ceil(middle) + 1)) > 120,
        name + " needs a visible rim on both sides of the opening");
    }
  }
});
