import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, readProgress } from "../src/core.ts";
import { bloomingGarden, scenes } from "../src/maps.ts";
import { rainbowFlowers, rainbowIds, meadowOpen, meadowGate, meadowGatePosts, pickRainbow } from "../src/rainbow-flowers.ts";

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
