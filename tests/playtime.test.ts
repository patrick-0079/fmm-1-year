import assert from "node:assert/strict";
import test from "node:test";
import { addForegroundTime } from "../src/playtime.ts";

const empty = { milliseconds: 0, through: 0, epoch: "" };
test("foreground intervals count only elapsed play, including handoff between two windows", () => {
  let clock = addForegroundTime(empty, 10_000, 12_000);
  clock = addForegroundTime(clock, 11_000, 13_000);
  clock = addForegroundTime(clock, 11_000, 13_000);
  assert.equal(clock.milliseconds, 3000);
  clock = addForegroundTime(clock, 50_000, 50_750);
  assert.equal(clock.milliseconds, 3750);
});
test("suspension, duplicate ticks and idle time between visits never grant days", () => {
  const before = { milliseconds: 599_999, through: 2000, epoch: "reset" };
  assert.equal(addForegroundTime(before, 2000, 4_202_000), before);
  assert.equal(addForegroundTime(before, 2010, 2000), before);
  const next = addForegroundTime(before, 4_202_000, 4_202_001);
  assert.equal(next.milliseconds, 600_000);
  assert.equal(next.epoch, before.epoch);
});
