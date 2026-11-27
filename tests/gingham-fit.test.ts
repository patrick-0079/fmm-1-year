import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { artScale, cellHeight, cellWidth, costumeFrame, outfits, type Facing } from "../src/costume-frames.ts";
import { equipmentParts, fitItem } from "../src/equipment.ts";
import frames from "../src/wardrobe-icons.json" with {type:"json"};

test("the gingham band rests on the hair on both temples and across the crown in every worn frame", async () => {
  const image = (name: string) => sharp(fileURLToPath(new URL("../src/assets/" + name, import.meta.url)));
  const body = await image("fufu-garments.webp").ensureAlpha().extractChannel("alpha").raw().toBuffer({resolveWithObject:true});
  const atlas = image("wardrobe-icons.webp");
  const views = ["ginghamBand", "ginghamSide", "ginghamSide", "ginghamRear"] as const;
  for (const [direction, name] of views.entries()) {
    const facing = direction as Facing;
    const [left, top, width, height] = frames[name];
    const alpha = await atlas.clone().extract({left, top, width, height}).ensureAlpha().extractChannel("alpha").raw().toBuffer();
    // Sample the underside of the actual cloth; the two tied ends may point above the hair.
    const support = [.055, .12, .2, .32, .4, .5, .6, .68, .8, .88, .945].map(u => {
      const x = Math.floor(u * width);
      let y = height - 1;
      while (y >= 0 && alpha[y * width + x] < 155) y--;
      assert.ok(y >= 0, name + " has no cloth in this column");
      return {u, v:(y + 1) / height};
    });
    const poses = facing === 0 ? ["standing", "sitting", "bench"] as const : ["standing"] as const;
    for (const [row, clothes] of outfits.entries()) for (const pose of poses) {
      for (const step of pose === "standing" ? [0, 1, 2] : [0]) {
        const [part] = equipmentParts({clothes, head:"ginghamBand"}, pose, facing, step);
        const box = fitItem(width, height, part.x, part.y, part.w, part.h);
        const frame = costumeFrame(row, pose === "sitting" ? 12 : pose === "bench" ? 13 : facing * 3 + step);
        for (const {u, v} of support) {
          const x = frame.x + Math.round(cellWidth / 2 + artScale * (box.x + (part.mirror ? 1 - u : u) * box.w));
          const y = frame.y + Math.round(cellHeight + artScale * (box.y + v * box.h));
          assert.ok(body.data[y * body.info.width + x] >= 100, `${clothes ?? "base"} ${pose} ${facing}/${step}, band at ${u}`);
        }
      }
    }
  }
});
