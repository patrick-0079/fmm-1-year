import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { campEncounterContact } from "../src/camp-encounter-contacts.ts";
import { campEncounterIds } from "../src/camp-encounters.ts";
import { outfits } from "../src/costume-frames.ts";

const w = 144, h = 72;

function nearestFinger(pixels: Buffer, x: number, y: number) {
  let nearest = -1, best = 8;
  for (let py = Math.max(0,Math.floor(y-8)); py <= Math.min(h-1,Math.ceil(y+8)); py++) {
    for (let px = Math.max(0,Math.floor(x-8)); px <= Math.min(w-1,Math.ceil(x+8)); px++) {
      const index = py*w+px, i = 4*index, distance = Math.hypot(px-x,py-y);
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      if (distance <= best && pixels[i+3] > 155 && r > 186 &&
          r-g >= 19 && r-g < 69 && g-b >= 12 && g-b < 44) {
        nearest = index;
        best = distance;
      }
    }
  }
  return nearest;
}

// Look for a continuous painted arm from the fingertip to the costume's
// shoulder seam. This catches a detached wrist even when the hand still
// lines up with the bird's feet or with the tip of a tentacle.
function reachesShoulder(pixels: Buffer, finger: number, shoulderX: number, shoulderY: number) {
  const seen = new Uint8Array(w*h), queue = [finger];
  seen[finger] = 1;
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i]%w, y = Math.floor(queue[i]/w);
    if (Math.hypot(x-shoulderX,y-shoulderY) <= 12) return true;
    for (let ny = Math.max(0,y-1); ny <= Math.min(h-1,y+1); ny++)
      for (let nx = Math.max(0,x-1); nx <= Math.min(w-1,x+1); nx++) {
        const next = ny*w+nx;
        if (seen[next] || pixels[4*next+3] < 95) continue;
        seen[next] = 1;
        queue.push(next);
      }
  }
  return false;
}

test("all 576 foreground cels keep resting arms still or connect the drawn hand to its shoulder", async () => {
  for (const id of campEncounterIds) {
    const file = new URL("../src/assets/meadow-camp-"+id+"-sleeves.webp",import.meta.url);
    const {data, info} = await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.deepEqual([info.width,info.height],[16*w,outfits.length*h]);
    for (const [row,outfit] of outfits.entries()) {
      let resting: Buffer | undefined;
      for (let frame = 0; frame < 16; frame++) {
        const label = [outfit || "base",id,frame].join("/"), cell = Buffer.alloc(w*h*4);
        for (let y = 0; y < h; y++) {
          const start = ((row*h+y)*info.width+frame*w)*4;
          data.copy(cell,4*y*w,start,start+4*w);
        }
        if (id !== "marshmallow" && (frame < 9 || frame === 15)) {
          // Lossless WebP may choose any RGB value under a transparent pixel.
          for (let i = 0; i < cell.length; i += 4) if (!cell[i+3]) cell.fill(0,i,i+3);
          resting ??= cell;
          assert.ok(cell.equals(resting),label+" moved a resting sleeve");
          continue;
        }
        const at = campEncounterContact(id,frame);
        const sides = id === "butterfly" ? [-1,1] : [id === "jelly" ? 1 : -1];
        for (const side of sides) {
          const x = 72+4*at.x+(id === "butterfly" ? 7*side : 0), y = 88+4*at.y;
          const finger = nearestFinger(cell,x,y);
          assert.notEqual(finger,-1,label+" hides the hand at its contact point");
          assert.ok(reachesShoulder(cell,finger,72+18*side,row === 0 ? 34 : 31),label+" detaches the hand");
        }
      }
    }
  }
});

test("a reaching arm uncovers pink hair beside the mint and witch capes", async () => {
  const file = new URL("../src/assets/meadow-camp-jelly.webp",import.meta.url);
  const {data, info} = await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // The old resting sleeve edges crossed these two locks even after her hand
  // reached the jelly. The figure sheet starts at y32 of the 144 × 184 master.
  for (const [outfit, x, y] of [["witchDress",103,135],["mintCape",108,149]] as const) {
    const row = outfits.indexOf(outfit);
    const i = 4*((row*152+y-32)*info.width+12*144+x);
    const [r,g,b,a] = data.subarray(i,i+4);
    assert.ok(a>230 && r>155 && r>g+20 && b>=g-5,outfit+" has a stray dark sleeve edge in the hair");
  }
});
