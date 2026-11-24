import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { gardenGuests } from "../src/garden-guests.ts";
import { TOWN_NPCS } from "../src/town-data.ts";

test("every walking resident has twelve distinct, transparent cels registered to the same ground line", async () => {
  const walkingIds = [...TOWN_NPCS, ...gardenGuests, { id: "suyan" }].map(npc => npc.id);
  const folder = new URL("../src/assets/resident-walk/", import.meta.url);
  assert.deepEqual((await readdir(folder)).sort(), walkingIds.map(id => id + ".webp").sort());
  for (const id of walkingIds) {
    const { data, info } = await sharp(fileURLToPath(new URL(id + ".webp", folder)))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [384, 288], id);
    const poses = new Set<string>();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const hash = createHash("sha256");
        let sole = -1;
        for (let y = 0; y < 96; y++) {
          const start = ((row * 96 + y) * info.width + col * 96) * 4;
          const line = data.subarray(start, start + 96 * 4);
          hash.update(line);
          for (let x = 0; x < 96; x++) {
            if (line[x * 4 + 3] < 128) continue;
            assert.ok(x > 0 && x < 95 && y > 0, id + " touches a neighbouring cel");
            sole = y;
          }
        }
        assert.ok(sole >= 87 && sole <= 90, id + " loses its foot anchor");
        poses.add(hash.digest("hex"));
      }
    }
    assert.equal(poses.size, 12, id + " repeats an entire cel");
  }
});
