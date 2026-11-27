import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY_SECONDS,
  eggAvailable,
  untilNextPhase,
  worldTime,
} from "../src/day.ts";
import { readProgress } from "../src/core.ts";
import { loadWorldClock, WORLD_CLOCK_KEY } from "../src/nature-save.ts";
import { spriteFrames } from "../src/sprite-frames.ts";
import { townLightMix } from "../src/town-light.ts";

test("the town has four distinct light phases and blends them gently at sunrise and sunset",()=>{
  for(const [hours,phase] of [[0,"night"],[6,"dawn"],[12,"day"],[18,"dusk"],[22,"night"]] as const)
    assert.equal(townLightMix(hours).from,phase);
  const dusk=townLightMix(17);
  assert.equal(dusk.from,"day");assert.equal(dusk.to,"dusk");assert.ok(Math.abs(dusk.mix-.5)<1e-8);
  assert.deepEqual(townLightMix(23.99),townLightMix(.01));
});

test("each real second advances exactly one displayed minute, including midnight and repeat days", () => {
  assert.equal(DAY_SECONDS, 1440);
  for (let seconds = 0; seconds <= 2880; seconds++) {
    const totalMinutes = 480 + seconds;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const label = `${String(hour).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    for (const elapsed of [seconds, seconds + .999]) {
      const time = worldTime(elapsed);
      assert.equal(time.label, label);
      assert.equal(time.day, 1 + Math.floor(totalMinutes / 1440));
    }
  }
  for (const [seconds, before, after] of [[540, "day", "dusk"], [720, "dusk", "night"], [1260, "night", "dawn"], [1440, "dawn", "day"]] as const) {
    assert.equal(worldTime(seconds - .001).phase, before);
    assert.equal(worldTime(seconds).phase, after);
  }
});
test("a ten-minute clock migrates once with its day, minute, bench jumps and offline time intact", () => {
  const now = 1_800_000_000_000;
  const records = new Map([["fufu-world-clock-v1", JSON.stringify({ origin: now - 2_500_000, shift: 125 })]]);
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const migrated = loadWorldClock(storage, now);
  assert.deepEqual(migrated, { origin: now, shift: 6300 });
  assert.deepEqual(worldTime(migrated.shift), { day: 5, label: "17:00", hours: 17, phase: "dusk" });
  records.set("fufu-world-clock-v1", JSON.stringify({ origin: now, shift: 0 }));
  const later = now + 1_441_000;
  const loaded = loadWorldClock(storage, later);
  assert.deepEqual(loaded, migrated);
  const time = worldTime((later - loaded.origin) / 1000 + loaded.shift);
  assert.equal(time.label, "17:01");
  assert.equal(time.day, 6);
  records.set(WORLD_CLOCK_KEY, "{");
  assert.deepEqual(loadWorldClock(storage, later), { origin: later, shift: 0 });
});
test("the courage garden bench advances to each exclusive easter-egg window", () => {
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
test("the bench leaves a pinned preview at its next boundary on the natural clock", () => {
  for (const elapsed of [0,539.999,540,720,959.999,1260,1439.999,1440,9087.25]) {
    for (const [shown,next,hour] of [["dawn","day",8],["day","dusk",17],["dusk","night",20],["night","dawn",5]] as const) {
      const delta=untilNextPhase(elapsed,shown);
      const time=worldTime(elapsed+delta);
      assert.ok(delta>=0 && delta<DAY_SECONDS);
      assert.equal(time.phase,next);
      assert.equal(Math.floor(time.hours),hour);
    }
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
