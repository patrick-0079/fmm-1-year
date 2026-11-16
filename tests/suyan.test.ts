import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { suyanFootprint, suyanSpot } from "../src/suyan-data.ts";
import { resolveCue } from "../src/interaction-cues.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";

test("Suyan has an accessible garden approach without blocking other visits or the bridge", () => {
  const garden = scenes.garden;
  assert.equal(garden.spots.filter(spot => spot.id === suyanSpot.id).length, 1);
  assert.equal(garden.walls.filter(wall => wall.label === suyanFootprint.label).length, 1);
  assert.ok(!canStand(suyanSpot, garden.walls, garden.bounds, garden.floor, garden.surfaces));
  assert.ok(canStand(suyanSpot.approach, garden.walls, garden.bounds, garden.floor, garden.surfaces));
  for (const spot of garden.spots) {
    assert.deepEqual(findPath(garden.spawn, spot.approach, garden)?.at(-1), spot.approach, spot.id);
    assert.ok(spot.id === suyanSpot.id || Math.hypot(spot.x-suyanSpot.x, spot.y-suyanSpot.y) > 70,
      "Suyan must not crowd " + spot.id);
  }
  assert.ok(canTravelBetween({x:550,y:259}, {x:637,y:259}, garden));
});

test("Suyan's hit target follows her sprite and her action says who will speak", () => {
  const cue = resolveCue(suyanSpot, "garden");
  assert.equal(cue.kind, "talk");
  assert.equal(cue.action, "与苏颜交谈");
  assert.equal(cue.verb, "交谈");
  // Clicks on the large hat and the body resolve to this guest, not the TV.
  assert.equal(clickedInteraction({x:650,y:143}, scenes.garden.spots)?.id, suyanSpot.id);
  assert.equal(clickedInteraction({x:650,y:175}, scenes.garden.spots)?.id, suyanSpot.id);
  assert.equal(nearbyInteraction(suyanSpot.approach, scenes.garden.spots)?.id, suyanSpot.id);
});
