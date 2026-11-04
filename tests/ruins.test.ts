import test from "node:test";
import assert from "node:assert/strict";
import { readProgress, canStand, findPath } from "../src/core.ts";
import { readEchoMemory, playEcho, melody } from "../src/echoes.ts";
import { crossedEchoGate, townEchoGate, ruinsExit, echoPool } from "../src/ruins-map.ts";
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
test("walk through each gate outwards only, with both landings safe",()=>{
  const town=townEchoGate, exit=ruinsExit;
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
