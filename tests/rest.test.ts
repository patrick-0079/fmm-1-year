import test from "node:test";
import assert from "node:assert/strict";
import { bedRest, benchRest, HOME_BED } from "../src/rest.ts";
import { scenes } from "../src/maps.ts";
import { creeks } from "../src/landscape.ts";
import { canStand, canTravelBetween, readProgress } from "../src/core.ts";
test("the single respawn destination is the bed, with a safe exit from its solid furniture", () => {
  const rest = bedRest(),
    room = scenes.room;
  assert.equal(rest.scene, "room");
  assert.equal(rest.kind, "lying");
  assert.deepEqual(rest.anchor, HOME_BED.anchor);
  assert.equal(canStand(rest.anchor, room.walls, room.bounds), false);
  assert.equal(canStand(rest.exit, room.walls, room.bounds), true);
  rest.exit.x = 0;
  assert.equal(
    bedRest().exit.x,
    486,
    "mutating a rest session cannot move the fixed bed",
  );
  assert.equal(
    Object.values(scenes).some((s) => "checkpoints" in s),
    false,
    "outdoor lights must not become respawn locations",
  );
});
test("every garden seat has a safe get-up position outside the bench collider", () => {
  for (const name of ["garden", "challenge"] as const) {
    const scene = scenes[name],
      spot = scene.spots.find((s) => s.id === "rest")!;
    const rest = benchRest(name, spot, spot.approach);
    assert.equal(rest.kind, "sitting");
    assert.equal(
      canStand(rest.anchor, scene.walls, scene.bounds, scene.floor),
      false,
    );
    assert.equal(
      canStand(rest.exit, scene.walls, scene.bounds, scene.floor),
      true,
    );
  }
});
test("stream water is solid while each wooden bridge permits a crossing", () => {
  for (const name of ["garden", "challenge"] as const) {
    const b = creeks[name].bridge,
      scene = scenes[name];
    assert.equal(
      canTravelBetween(
        { x: b.x + 8, y: b.y + b.h / 2 },
        { x: b.x + b.w - 8, y: b.y + b.h / 2 },
        scene,
      ),
      true,
      `${name} bridge must be open`,
    );
    const water = name === "garden" ? { x: 590, y: 310 } : { x: 225, y: 245 };
    assert.equal(
      canStand(water, scene.walls, scene.bounds, scene.floor),
      false,
    );
  }
});
test("the first-revival note unlock survives reload and old saves start locked", () => {
  assert.equal(readProgress(null).bedNoteUnlocked, false);
  assert.equal(readProgress('{"sound":false}').bedNoteUnlocked, false);
  assert.equal(readProgress('{"bedNoteUnlocked":true}').bedNoteUnlocked, true);
  assert.equal(
    readProgress('{"bedNoteUnlocked":"true"}').bedNoteUnlocked,
    false,
  );
});
