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
test("saved positions remain safe after removing the anniversary bench and closing the north gate", () => {
  const oldNorth = readJourney(JSON.stringify({scene:"challenge",x:450,y:78,savedAt}),[]);
  assert.deepEqual(oldNorth,{scene:"challenge",...scenes.challenge.spawn,savedAt},
    "a save inside the planted north hedge returns to the safe south entrance");
  const northPaving = {scene:"challenge",x:450,y:86,savedAt};
  assert.deepEqual(readJourney(JSON.stringify(northPaving),[]),northPaving,
    "a save on the pale paving in front of that hedge keeps its position");
  for (const flowers of [[],rainbowIds]) {
    const oldBenchExit = {scene:"garden",x:385,y:447,savedAt};
    assert.deepEqual(readJourney(JSON.stringify(oldBenchExit),flowers),oldBenchExit,
      "removing the bench does not move players saved at its former get-up point");
  }
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

test("an empty shift mark is a valid saved position in town and both gardens", () => {
  for (const [scene, id] of [["town","npc-walker"],["garden","garden-guest-suyan"]] as const) {
    const mark = scenes[scene].spots.find(s => s.id === id)!;
    const save = {scene, x:mark.x, y:mark.y, savedAt};
    for (const flowers of [[],rainbowIds]) {
      assert.deepEqual(readJourney(JSON.stringify(save),flowers),save);
    }
  }
});
