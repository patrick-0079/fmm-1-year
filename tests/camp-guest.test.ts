import test from "node:test";
import assert from "node:assert/strict";
import { CampGuest, campGuestStart, campGuestSeat } from "../src/camp-guest.ts";
import { canTravelBetween } from "../src/core.ts";
import { campSeat, meadowScene } from "../src/meadow-map.ts";
import { benchRest } from "../src/rest.ts";

const camp = meadowScene.spots.find(spot => spot.id === "meadow-camp")!;
const sheet = {naturalWidth: 256} as HTMLImageElement;
const sitting = () => benchRest("meadow", campSeat, camp.approach);

test("30 uninterrupted seconds of sitting brings the guest and standing clears the scene", () => {
  const world: ConstructorParameters<typeof CampGuest>[0] = {scene: "meadow", restState: sitting(), paused: false};
  let visits = 0;
  const guest = new CampGuest(world, () => ++visits === 1);
  guest.tick(.016, 10);
  guest.tick(.016, 39.999);
  assert.equal(visits, 0);
  assert.deepEqual(guest.layers(sheet, false), []);
  world.restState = sitting();
  guest.tick(.016, 40);
  guest.tick(.016, 69.999);
  assert.equal(visits, 0, "sitting again starts a new visit");
  guest.tick(.016, 70);
  assert.equal(visits, 1);
  assert.equal(guest.layers(sheet, true)[0].y, campGuestSeat.y);
  guest.tick(.016, 200);
  assert.equal(visits, 1, "staying seated must not deliver another letter");
  world.restState = null;
  assert.deepEqual(guest.layers(sheet, false), []);
  world.scene = "garden";
  guest.tick(.016, 201);
  assert.deepEqual(guest.layers(sheet, true), []);
});

test("the guest waits for an active camp view and walks along clear ground", () => {
  assert.ok(canTravelBetween(campGuestStart, campGuestSeat, meadowScene));
  const world = {scene: "meadow" as const, restState: sitting(), paused: false};
  let visits = 0;
  const guest = new CampGuest(world, () => { visits++; return true; });
  guest.tick(.016, 1);
  guest.tick(0, 31);
  world.paused = true;
  guest.tick(.016, 32);
  assert.equal(visits, 0);
  world.paused = false;
  guest.tick(.016, 33);
  assert.equal(visits, 1);
  assert.equal(guest.layers(sheet, false)[0].y, campGuestStart.y);
  guest.tick(1, 34);
  assert.equal(guest.layers(sheet, false)[0].y, campGuestSeat.y);
  guest.reset();
  assert.deepEqual(guest.layers(sheet, false), []);
});
