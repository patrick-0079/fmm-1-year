import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, readProgress } from "../src/core.ts";
import { bloomingGarden, scenes } from "../src/maps.ts";
import { rainbowFlowers, rainbowIds, meadowOpen, meadowGate, meadowGatePosts, pickRainbow } from "../src/rainbow-flowers.ts";
import { producers } from "../src/content.ts";
import { campfire, enteredMoonCircle, meadowExit } from "../src/meadow-map.ts";
import { clickedInteraction } from "../src/interaction.ts";

test("small flowers remain clickable at their petals and the moon circle only triggers on entry", () => {
  for (const f of rainbowFlowers) {
    const spots=scenes[f.scene].spots;
    assert.equal(clickedInteraction({x:f.x,y:f.y-9},spots,s=>s.y-(s.markerOffset??12))?.id,f.id);
    assert.ok(spots.find(s=>s.id===f.id)?.selfMarked);
  }
  const arrival=scenes.meadow.spots.find(s=>s.id==="meadow-exit")!.approach;
  assert.equal(enteredMoonCircle(arrival,arrival),false);
  assert.equal(enteredMoonCircle(arrival,meadowExit),true);
  assert.equal(enteredMoonCircle(meadowExit,arrival),false);
  assert.ok(canTravelBetween(arrival,meadowExit,scenes.meadow));
});
test("only seven different flowers from their own maps open the meadow", () => {
  const bag: string[] = [];
  for (const flower of rainbowFlowers) {
    assert.equal(meadowOpen(bag), false);
    assert.equal(pickRainbow(bag,"room",flower.id), undefined);
    assert.equal(pickRainbow(bag,flower.scene,flower.id)?.id, flower.id);
    assert.equal(pickRainbow(bag,flower.scene,flower.id), undefined);
  }
  assert.deepEqual(bag,rainbowIds);
  assert.equal(meadowOpen(bag), true);
  assert.equal(meadowOpen(Array(7).fill(rainbowIds[0])), false);
});
test("old and malformed saves cannot unlock the meadow; real collections survive reload", () => {
  assert.deepEqual(readProgress('{"bedNoteUnlocked":true}').rainbowFlowers,[]);
  const stored=JSON.stringify({rainbowFlowers:[...rainbowIds.slice(0,6),rainbowIds[0],"wreath","meadow",12]});
  assert.deepEqual(readProgress(stored).rainbowFlowers,rainbowIds.slice(0,6));
  assert.ok(!meadowOpen(readProgress(stored).rainbowFlowers));
  assert.ok(meadowOpen(readProgress(JSON.stringify({rainbowFlowers:rainbowIds})).rainbowFlowers));
});
test("when the rainbow arch appears its pillars are solid, its mouth and the courtyard routes stay open", () => {
  for (const post of meadowGatePosts) {
    const center={x:post.x+post.w/2,y:post.y+post.h/2};
    for (const [map,walkable] of [[scenes.garden,true],[bloomingGarden,false]] as const)
      assert.equal(canStand(center,map.walls,map.bounds,map.floor),walkable);
  }
  assert.ok(canTravelBetween(meadowGate.approach,meadowGate,bloomingGarden));
  for (const s of bloomingGarden.spots)
    assert.deepEqual(findPath(bloomingGarden.spawn,s.approach,bloomingGarden)?.at(-1),s.approach,s.id);
});

test("each producer has one anonymous, clickable and reachable star", () => {
  const spots = scenes.meadow.spots;
  assert.equal(new Set(producers.map(p => p.id)).size, producers.length);
  for (const person of producers) {
    const s = spots.find(p => p.id === person.id)!;
    assert.equal(s.title, "拾起草间的落星");
    assert.ok(s.selfMarked);
    assert.equal(clickedInteraction({x: s.x, y: s.y - 11}, spots, p => p.y - 11)?.id, person.id);
    const nearest = [...spots].sort((a, b) => Math.hypot(a.x - s.approach.x, a.y - s.approach.y) -
      Math.hypot(b.x - s.approach.x, b.y - s.approach.y))[0];
    assert.equal(nearest.id, person.id);
  }
});
test("credit discoveries survive updates and reload, without counting as any of the seven flowers", () => {
  const ids = producers.map(p => p.id);
  assert.deepEqual(readProgress(JSON.stringify({rainbowFlowers: rainbowIds})).creditStars, []);
  const p = readProgress(JSON.stringify({creditStars: [ids[1], 3, ids[1], "unknown", ids[0]], rainbowFlowers: ids}));
  assert.deepEqual(p.creditStars, [ids[1], ids[0]]);
  assert.equal(meadowOpen(p.rainbowFlowers), false);
  assert.deepEqual(readProgress(JSON.stringify(p)), p);
});
test("moonlit grass can be crossed freely off-axis; the tent, kettle and fire are solid", () => {
  const m = scenes.meadow, stand = (x: number, y: number) => canStand({x,y}, m.walls, m.bounds, m.floor, m.surfaces);
  for (let y = 91; y <= 508; y += 38) for (let x = 82; x <= 816; x += 43) {
    if (x >= 78 && x <= 270 && y >= 108 && y <= 184) continue;
    assert.ok(stand(x,y), `unexpected closed grass at ${x},${y}`);
  }
  assert.ok(!stand(campfire.x,campfire.y + 4) && !stand(153,148) && !stand(252,138));
  assert.ok(canTravelBetween({x:91,y:367},{x:795,y:221},m));
  assert.ok(canTravelBetween({x:719,y:95},{x:221,y:522},m));
});
