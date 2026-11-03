import test from "node:test";
import assert from "node:assert/strict";
import { readJourney } from "../src/journey.ts";
import { scenes } from "../src/maps.ts";
import { rainbowIds } from "../src/rainbow-flowers.ts";
import { readProgress } from "../src/core.ts";

const savedAt = 1793664000000;
test("resuming respects existing collision, hazards and the seven-flower lock", () => {
  const restore = (scene: string, p: {x:number;y:number}, flowers: readonly string[] = []) =>
    readJourney(JSON.stringify({scene, x:p.x, y:p.y, savedAt}), flowers);
  const lawn = {x:382,y:251};
  assert.deepEqual(restore("meadow",lawn,rainbowIds),{scene:"meadow",...lawn,savedAt});
  assert.deepEqual(restore("meadow",lawn),{scene:"garden",...scenes.garden.spawn,savedAt});
  for (const pos of [scenes.challenge.hazards[0],{x:-999,y:88}])
    assert.deepEqual(restore("challenge", pos),{scene:"challenge",...scenes.challenge.spawn,savedAt});
});
test("malformed location data cannot enter an unknown scene or disturb earned records", () => {
  for (const raw of [null, "{", "null", JSON.stringify({scene:"constructor",x:30,y:40,savedAt}),
    JSON.stringify({scene:["room"],x:40,y:40,savedAt}), JSON.stringify({scene:"room",x:40,y:40,savedAt:Number.MAX_SAFE_INTEGER}),
    JSON.stringify({scene:"garden",x:"100",y:150,savedAt})])
    assert.equal(readJourney(raw,[]),null);
  const state = readProgress(JSON.stringify({completed:["cake"],arcadeBests:{snake:7,hop:-1,unknown:14,blocks:"9"}}));
  assert.deepEqual(state.completed,["cake"]);
  assert.deepEqual(state.arcadeBests,{snake:7});
});
