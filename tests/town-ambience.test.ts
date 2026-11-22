import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {pageTurn, pennantLift} from "../src/town-idle-motion.ts";
import {pondArtBounds, pondFishAt} from "../src/town-pond-motion.ts";

test("flags lift in order and settle on their cord; the book rests flat between page turns", () => {
  for (let i = 0; i < 7; i++) {
    assert.equal(pennantLift(2.5, i), 0);
    assert.ok(pennantLift(2.5 + i * .15 + .82, i) > .7);
    assert.equal(pennantLift(6, i), 0);
  }
  assert.ok(pennantLift(3, 0) > 0 && pennantLift(3, 6) === 0);
  assert.equal(pageTurn(1.4), 0);
  assert.ok(Math.abs(pageTurn(2.3) - .5) < 1e-9);
  assert.equal(pageTurn(3.11), 0);
});

test("fish silhouettes swim behind real HD lily pads, with head and tail independently obscured", async () => {
  const mask = fileURLToPath(new URL("../src/assets/town-pond-water.webp", import.meta.url));
  const {data,info} = await sharp(mask).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {x,y,w,h} = pondArtBounds;
  assert.equal(info.width, 2*w); assert.equal(info.height, 2*h);
  function coverage(index: 0 | 1, time: number, along: number) {
    const fish = pondFishAt(index, time);
    const column = Math.round(2 * (fish.x + Math.cos(fish.angle)*along - x));
    const row = Math.round(2 * (fish.y + Math.sin(fish.angle)*along - y));
    assert.ok(column>=0 && column<info.width && row>=0 && row<info.height);
    return data[(row * info.width + column)*4+3];
  }
  for (const [index, time, period] of [[0, 4.85, 19], [1, 2.4, 23]] as const) {
    assert.ok(coverage(index,time,3.5) < 25, "the leading half is behind a leaf");
    assert.ok(coverage(index,time,-5) > 210, "the tail remains in open water");
    const first = pondFishAt(index,0), last = pondFishAt(index,period-.0001);
    assert.ok(Math.hypot(first.x-last.x,first.y-last.y) < .002);
    for (let i = 0; i < 104; i++) coverage(index, i/104*period, -9);
  }
});
