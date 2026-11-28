import test from "node:test";
import assert from "node:assert/strict";
import { CampEncounters, campEncounterIds } from "../src/camp-encounters.ts";
import { CampGuest } from "../src/camp-guest.ts";
import { campSeat } from "../src/meadow-ground.ts";
import { readResidentStory } from "../src/resident-story.ts";
import { benchRest } from "../src/rest.ts";

const sit = () => benchRest("meadow", campSeat, { x: 247, y: 184 });

test("debug selections replay on the current seat without drawing from the random bag", () => {
  let rolls = 0;
  const visits = new CampEncounters(() => { rolls++; return 0; }), seat = sit();
  const recorded: string[] = [];
  for (const id of [...campEncounterIds, "marshmallow"] as const) {
    visits.preview(id, seat, false);
    assert.deepEqual(visits.current, {id, phase:"arrival", elapsed:0});
    visits.tick(1.7, seat, false);
    assert.ok(visits.respond(id => recorded.push(id)));
  }
  visits.preview("jelly", seat, true);
  assert.equal(visits.current, null);
  visits.tick(0, seat, false);
  assert.equal(visits.current?.id, "jelly");
  visits.tick(9.61, seat, false);
  assert.equal(rolls, 0);
  visits.tick(7, seat, false);
  assert.equal(visits.current?.id, "bird");
  assert.equal(rolls, 2);
  assert.deepEqual(recorded, []);
  visits.tick(1.7, seat, false);
  assert.ok(visits.respond(id => recorded.push(id)));
  assert.deepEqual(recorded, ["bird"]);
});

test("the bird arrives, offers six seconds to respond, then naturally leaves through the passive frames", () => {
  const visits = new CampEncounters(() => 0), seat = sit();
  const tick = (dt: number) => visits.tick(dt, seat, false);
  tick(6.99);
  assert.equal(visits.current, null);
  tick(.02);
  assert.deepEqual([visits.current?.id, visits.current?.phase], ["bird", "arrival"]);
  assert.equal(visits.respond(), false);
  for (let frame = 0; frame < 4; frame++) {
    assert.equal(visits.frame(false), frame);
    assert.equal(visits.frame(true), 3);
    tick(.4);
  }
  assert.equal(visits.current?.phase, "waiting");
  tick(5.98);
  assert.equal(visits.frame(false), 3);
  tick(.02);
  assert.equal(visits.current?.phase, "passive");
  assert.equal(visits.respond(), false);
  for (let frame = 4; frame < 8; frame++) {
    assert.equal(visits.frame(false), frame);
    assert.equal(visits.frame(true), 5);
    tick(.5);
  }
  assert.equal(visits.current, null);
  tick(6.98);
  assert.equal(visits.current, null);
  tick(.02);
  assert.equal(visits.current?.id, "butterfly");
});

test("responding at the end of the invitation plays one active sequence and holds still while covered", () => {
  const visits = new CampEncounters(() => 0), seat = sit();
  visits.tick(7 + 1.6 + 5.99, seat, false);
  assert.equal(visits.current?.phase, "waiting");
  assert.ok(visits.respond());
  assert.equal(visits.respond(), false);
  visits.tick(.1, seat, false);
  for (let frame = 8; frame < 16; frame++) {
    assert.equal(visits.frame(false), frame);
    assert.equal(visits.frame(true), 12);
    const elapsed = visits.current?.elapsed;
    visits.tick(0, seat, false);
    assert.equal(visits.current?.elapsed, elapsed);
    visits.tick(.4, seat, false);
  }
  assert.equal(visits.current, null);
});

test("replacement seats restart the delay and each bag draws every visitor without adjacent repeats", () => {
  const visits = new CampEncounters(() => .4);
  const order: string[] = [];
  const size = campEncounterIds.length;
  for (let i = 0; i < 3 * size; i++) {
    const seat = sit();
    visits.tick(4, seat, false);
    assert.equal(visits.current, null);
    visits.tick(3, seat, false);
    order.push(visits.current!.id);
    visits.tick(1, null, false);
    assert.equal(visits.current, null);
    assert.equal(visits.respond(), false);
  }
  for (let i = 0; i < order.length; i += size)
    assert.deepEqual(order.slice(i, i + size).sort(), [...campEncounterIds].sort());
  assert.ok(order.every((id, i) => !i || id !== order[i - 1]));
});

test("only full seven-second idle intervals roll, using a strict 47 percent chance", () => {
  const rolls = [.47, .99, .47, .469999, 0];
  let calls = 0;
  const visits = new CampEncounters(() => rolls[calls++] ?? .99), seat = sit();
  visits.tick(6.99, seat, false);
  visits.tick(0, seat, false);
  assert.equal(calls, 0);
  visits.tick(14.02, seat, false);
  assert.equal(calls, 3);
  assert.equal(visits.current, null);
  visits.tick(7, seat, false);
  assert.equal(calls, 5, "the winning roll makes one separate draw from the visitor bag");
  assert.equal(visits.current?.id, "bird");
  visits.tick(1.6 + 6 + 2, seat, false);
  assert.equal(visits.current, null);
  assert.equal(calls, 5, "no rolls accumulated during the visit");
  visits.tick(6.9, seat, false);
  assert.equal(calls, 5);
  visits.tick(.1, seat, false);
  assert.equal(calls, 6);
});

test("the 28-second roll can win and Patrick hides and freezes its invitation until the letter lands", () => {
  const story = readResidentStory();
  const world = { scene: "meadow" as const, restState: sit(), paused: false };
  const guest = new CampGuest(world, () => story, () => {});
  const rolls = [.8, .8, .8, .2, 0];
  const visits = new CampEncounters(() => rolls.shift() ?? 0);
  const tick = (dt: number, time: number) => {
    guest.tick(dt, time);
    visits.tick(world.paused ? 0 : dt, world.restState, guest.reservesCamp());
  };
  tick(0, 0);
  for (const t of [7, 14, 21, 28]) tick(7, t);
  assert.equal(visits.current?.phase, "arrival");
  tick(1.9, 29.9);
  assert.equal(visits.current?.phase, "waiting");
  assert.equal(guest.reservesCamp(), false);
  const before = {...visits.current};
  tick(.016, 30.1);
  assert.ok(story.patrickArrived);
  assert.ok(guest.reservesCamp());
  assert.equal(visits.current, null);
  assert.equal(visits.respond(), false);
  tick(2, 32.1);
  assert.equal(guest.letterOnGround, false);
  tick(.21, 32.31);
  assert.ok(guest.letterOnGround);
  assert.equal(guest.reservesCamp(), false);
  assert.deepEqual(visits.current, before);
  assert.ok(visits.respond());
  assert.ok(guest.letterOnGround);
});

test("standing during any part of a visit clears it immediately, including Patrick's reserved window", () => {
  for (const phase of ["arrival", "waiting", "passive", "active", "story"]) {
    const visits = new CampEncounters(() => 0), seat = sit();
    visits.tick(7, seat, false);
    if (phase !== "arrival") visits.tick(1.6, seat, false);
    if (phase === "passive") visits.tick(6, seat, false);
    if (phase === "active") assert.ok(visits.respond());
    if (phase === "story") visits.tick(0, seat, true);
    else assert.equal(visits.current?.phase, phase);
    visits.reset();
    assert.equal(visits.current, null);
    assert.equal(visits.respond(), false);
    visits.tick(6.9, sit(), false);
    assert.equal(visits.current, null);
  }
});
