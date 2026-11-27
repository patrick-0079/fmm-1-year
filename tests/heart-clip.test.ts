import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import frames from "../src/wardrobe-icons.json" with { type: "json" };

test("both heart clips keep an open centre and a visible rim at wearable scale", async () => {
  const atlasFrames: [string, number[]][] = [
    ["wardrobe-icons.webp", frames.heartClip],
    ["worn-jewelry.webp", [160, 40, 40, 40]],
  ];
  for (const [name, [left, top, width, height]] of atlasFrames) {
    const alpha = await sharp(fileURLToPath(new URL("../src/assets/" + name, import.meta.url)))
      .extract({left, top, width, height}).resize(10, 10, {fit:"fill"})
      .ensureAlpha().extractChannel("alpha").raw().toBuffer();
    for (const y of [3, 4]) {
      const row = alpha.subarray(y * 10, (y + 1) * 10);
      assert.ok(row[4] < 16 && row[5] < 16, name + " must show the hair through its centre");
      assert.ok(Math.max(...row.subarray(0, 3)) > 120 && Math.max(...row.subarray(7)) > 120,
        name + " needs a visible rim on both sides of the opening");
    }
  }
});
