import test from "node:test";
import assert from "node:assert/strict";
import { OPEN_AT, countdownParts, getDeadline, setDebugDeadline } from "../src/launch/time.ts";

test("Beijing opening uses the same instant across time zones and never displays an early zero", () => {
  assert.equal(OPEN_AT, Date.UTC(2026, 11, 1, 14));
  assert.deepEqual(countdownParts(OPEN_AT, OPEN_AT - 90_061_000), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.equal(countdownParts(OPEN_AT, OPEN_AT - 1).seconds, 1);
  assert.equal(countdownParts(OPEN_AT, OPEN_AT - 1000).seconds, 1);
  for (const delta of [0, 1, 345_678_900]) {
    assert.deepEqual(countdownParts(OPEN_AT, OPEN_AT + delta), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  }
});

test("release builds ignore even valid debug overrides and invalid storage falls back to the official opening", t => {
  let stored: string | null = null;
  const storage = {
    getItem: () => stored,
    setItem: (_key: string, text: string) => { stored = text; },
    removeItem: () => { stored = null; },
  };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  });
  for (const invalid of ["", "NaN", "-1", "8640000000000000"]) {
    stored = invalid;
    assert.equal(getDeadline(true), OPEN_AT);
  }
  setDebugDeadline(0);
  assert.equal(getDeadline(true), 0);
  assert.equal(getDeadline(false), OPEN_AT);
  setDebugDeadline(null);
  assert.equal(getDeadline(true), OPEN_AT);
  assert.throws(() => setDebugDeadline(Infinity), RangeError);
});
