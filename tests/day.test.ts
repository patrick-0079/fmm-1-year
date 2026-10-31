import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY_SECONDS,
  eggAvailable,
  untilNextPhase,
  worldTime,
} from "../src/day.ts";
import { readProgress } from "../src/core.ts";
import { spriteFrames } from "../src/sprite-frames.ts";

test("one real ten-minute interval is exactly one complete world day", () => {
  assert.equal(DAY_SECONDS, 600);
  for (const seconds of [0, 25, 200, 399, 599]) {
    const first = worldTime(seconds),
      next = worldTime(seconds + 600);
    assert.ok(Math.abs(first.hours - next.hours) < 1e-9);
    assert.equal(next.day, first.day + 1);
  }
  assert.equal(worldTime(0).label, "08:00");
  assert.equal(worldTime(225).phase, "dusk");
  assert.equal(worldTime(300).phase, "night");
  assert.equal(worldTime(525).phase, "dawn");
});
test("the garden bench advances to each exclusive easter-egg window", () => {
  let elapsed = 0;
  for (const phase of ["dusk", "night", "dawn", "day"]) {
    elapsed += untilNextPhase(elapsed);
    assert.equal(worldTime(elapsed).phase, phase);
  }
  for (const phase of ["dawn", "day", "dusk", "night"] as const) {
    assert.equal(eggAvailable("dew", phase), phase === "dawn");
    assert.equal(eggAvailable("sunset", phase), phase === "dusk");
    assert.equal(eggAvailable("firefly", phase), phase === "night");
  }
});
test("old mute preferences survive the music upgrade and invalid volumes are clamped", () => {
  assert.equal(readProgress('{"sound":false}').bgm, false);
  assert.equal(readProgress('{"sound":true}').bgm, true);
  assert.equal(readProgress('{"volume":90}').volume, 1);
  assert.equal(readProgress('{"volume":-5}').volume, 0);
  assert.equal(readProgress('{"volume":"loud"}').volume, 0.45);
});
test("pose crops exclude adjacent frames and preserve a single scale", () => {
  assert.equal(spriteFrames.length, 12);
  for (const a of spriteFrames) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 1086 && a.y + a.h <= 1448);
    assert.ok(a.w / a.h > 0.6 && a.w / a.h < 0.8);
    for (const b of spriteFrames)
      if (a !== b)
        assert.ok(
          a.x + a.w <= b.x ||
            b.x + b.w <= a.x ||
            a.y + a.h <= b.y ||
            b.y + b.h <= a.y,
          "source crops overlap",
        );
  }
  // The first pose's feet really extend past its nominal equal-height cell.
  assert.ok(spriteFrames[0].y + spriteFrames[0].h > 362);
});
