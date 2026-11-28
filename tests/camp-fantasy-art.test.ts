import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

async function checkAtlas(file: string, width: number, height: number, rows: readonly string[]) {
  const path = fileURLToPath(new URL(`../src/assets/${file}.webp`, import.meta.url));
  const {data, info} = await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  assert.deepEqual([info.width, info.height], [16 * width, rows.length * height]);

  for (const [row, name] of rows.entries()) {
    const isVisitor = name === "fawn" || name === "boat" || name === "whale";
    const drawings = new Set<string>();
    for (let col = 0; col < 16; col++) {
      const hash = createHash("sha256");
      let visible = 0;
      for (let y = 0; y < height; y++) {
        const start = 4 * ((row * height + y) * info.width + col * width);
        const line = data.subarray(start, start + 4 * width);
        hash.update(line);
        for (let x = 0; x < width; x++) {
          const alpha = line[x * 4 + 3];
          if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            assert.equal(alpha, 0, `cropped drawing in ${name} cel ${col}`);
          }
          if (alpha > 32) visible++;
        }
      }
      if (isVisitor || name === "wake" || col === 12) {
        assert.ok(visible > 0, `empty drawing in ${name} cel ${col}`);
      }
      drawings.add(hash.digest("hex"));
    }
    if (isVisitor) assert.equal(drawings.size, 16, `missing pose for ${name}`);
  }
}

test("all sixteen painted fawn poses fit the high-resolution atlas", async () => {
  await checkAtlas("meadow-camp-star-fawn", 160, 128, ["fawn"]);
});

test("the other fantasy visitors and their effects have complete, uncropped cels", async () => {
  await checkAtlas("meadow-camp-fantasy", 80, 64, ["boat", "whale", "ring", "wake", "antlers"]);
});
