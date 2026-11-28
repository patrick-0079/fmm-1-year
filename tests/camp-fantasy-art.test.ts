import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

test("every fantasy visitor has sixteen complete cels and both magical responses have visible key art", async () => {
  const file = new URL("../src/assets/meadow-camp-fantasy.webp",import.meta.url);
  const {data,info} = await sharp(await readFile(file))
    .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=80, h=64;
  assert.deepEqual([info.width,info.height],[16*w,6*h]);
  for (let row=0; row<6; row++) {
    const poses = new Set<string>();
    for (let col=0; col<16; col++) {
      const hash = createHash("sha256");
      let visible = 0;
      for (let y=0; y<h; y++) {
        const start = 4*((row*h+y)*info.width+col*w);
        const line = data.subarray(start,start+4*w);
        if (row<3) hash.update(line);
        for (let x=0; x<w; x++) {
          const alpha = line[x*4+3];
          if (x===0 || x===w-1 || y===0 || y===h-1) assert.equal(alpha,0,`cropped drawing at ${row}/${col}`);
          if (alpha>32) visible++;
        }
      }
      // Rows 3 and 5 are the whale's breath and the fawn's antler constellation.
      if (row<3 || row===4 || col===12) assert.ok(visible>0,`empty cel at ${row}/${col}`);
      if (row<3) poses.add(hash.digest("hex"));
    }
    if (row<3) assert.equal(poses.size,16,`missing drawing in visitor row ${row}`);
  }
});
