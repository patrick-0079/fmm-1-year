import test from "node:test";
import assert from "node:assert/strict";
import { readProgress, canStand, findPath } from "../src/core.ts";
import { readEchoMemory, playEcho, melody } from "../src/echoes.ts";
import { crossedEchoGate, townEchoGate, ruinsExit, echoPool, stairLintel, southNotebook, southNotebookArt } from "../src/ruins-map.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import { arcadesIn } from "../src/town-data.ts";
import { scenes } from "../src/maps.ts";
import { readJourney } from "../src/journey.ts";

test("three games move with their hotspots and collision; seven games remain unique",()=>{
  const entries = [...arcadesIn("town"),...arcadesIn("ruins")];
  assert.equal(new Set(entries.map(([id])=>id)).size,7);
  assert.deepEqual(arcadesIn("ruins").map(([id])=>id).sort(),["miner","mines","snake"]);
  for (const [id,g] of entries) {
    const own=scenes[g.scene], other=scenes[g.scene==="town"?"ruins":"town"], spot="arcade-"+id;
    assert.ok(own.spots.some(s=>s.id===spot));
    assert.ok(!other.spots.some(s=>s.id===spot));
    if (g.scene === "ruins")
      assert.ok(!canStand({x:g.x,y:g.y+2},own.walls,own.bounds,own.floor,own.surfaces));
  }
  const old=readProgress('{"arcadeBests":{"miner":187,"snake":8,"mines":26}}');
  assert.deepEqual(old.arcadeBests,{miner:187,snake:8,mines:26});
  assert.deepEqual(old.echoes,readEchoMemory());
});
test("runes accept only a complete set and the correct notes, including after reloading",()=>{
  const memory=readEchoMemory({found:["star","star","leaf"],played:3,listened:true});
  assert.equal(playEcho(memory,"leaf"),false); assert.equal(memory.listened,false);
  memory.found.push("bell");
  assert.ok(playEcho(memory,"leaf")); assert.equal(playEcho(memory,"star"),false);
  const saved=readProgress(JSON.stringify({echoes:memory})).echoes;
  assert.equal(saved.played,1);
  assert.ok(playEcho(saved,"bell")); assert.ok(playEcho(saved,"star")); assert.equal(playEcho(saved,"star"),false);
  saved.listened=true;
  assert.deepEqual(readEchoMemory(saved),{found:[...melody],played:3,listened:true});
});
test("the south landing book stays clear of the ivy arch and can be read from the entrance aisle",()=>{
  const map = scenes.ruins, art = southNotebookArt;
  assert.ok(art.y + art.h < Math.min(...stairLintel.map(p => p.y)), "the arch must not cover the book or its stand");
  assert.equal(clickedInteraction({x:art.x + art.w/2, y:art.y + art.h/3}, map.spots)?.id, southNotebook.id);
  assert.equal(nearbyInteraction(southNotebook.approach, map.spots)?.id, southNotebook.id);
  assert.ok(!canStand(southNotebook,map.walls,map.bounds,map.floor,map.surfaces));
  assert.deepEqual(findPath(ruinsExit.approach,southNotebook.approach,map)?.at(-1),southNotebook.approach);
});
test("walk through each gate outwards only, with both landings safe",()=>{
  const town=townEchoGate, exit=ruinsExit;
  assert.ok(town.x>1350 && town.y<120);
  const streets=scenes.town, path=findPath(streets.spawn,town.approach,streets);
  assert.deepEqual(path?.at(-1),town.approach);
  for(const p of [town,town.approach,{x:1428,y:77},{x:1355,y:112}])
    assert.ok(canStand(p,streets.walls,streets.bounds,streets.floor,streets.surfaces));
  for(const p of [{x:1324,y:89},{x:1399,y:82},{x:1458,y:85},{x:1490,y:110}])
    assert.equal(canStand(p,streets.walls,streets.bounds,streets.floor,streets.surfaces),false);
  assert.equal(crossedEchoGate("town",{x:518,y:563},{x:518,y:561}),undefined);
  assert.equal(crossedEchoGate("town",{x:town.x,y:town.y+1},{x:town.x,y:town.y-1}),town.id);
  assert.equal(crossedEchoGate("town",{x:town.x,y:town.y-1},town.approach),undefined);
  assert.equal(crossedEchoGate("ruins",{x:exit.x,y:exit.y-1},{x:exit.x,y:exit.y+1}),exit.id);
  assert.equal(crossedEchoGate("ruins",exit,exit.approach),undefined);
  assert.equal(crossedEchoGate("ruins",{x:exit.x+30,y:exit.y-1},{x:exit.x+30,y:exit.y+1}),undefined);
  const map=scenes.ruins;
  for(const p of [{x:212,y:483},{x:683,y:488},{x:125,y:222},{x:790,y:216}])
    assert.equal(canStand(p,map.walls,map.bounds,map.floor,map.surfaces),false);
  assert.ok(findPath(map.spawn,echoPool.approach,map));
  const journey={scene:"ruins",...echoPool.approach,savedAt:12};
  assert.deepEqual(readJourney(JSON.stringify(journey),[]),journey);
});
