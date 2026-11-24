import test from "node:test";
import assert from "node:assert/strict";
import { formatBeijingInput, parseBeijingInput } from "../src/launch/beijing-input.ts";

test("debug fields mean Beijing time regardless of the browser's own timezone", () => {
  const opening = Date.parse("2026-12-01T14:10:00Z");
  assert.equal(formatBeijingInput(opening), "2026-12-01T22:10:00");
  assert.equal(parseBeijingInput("2026-12-01T22:10"), opening);
  assert.equal(parseBeijingInput("2026-12-01T22:10:09"), opening + 9000);
  assert.equal(formatBeijingInput(Date.parse("2026-12-31T18:00:00Z")), "2027-01-01T02:00:00");
  assert.equal(parseBeijingInput("1970-01-01T08:00:00"), 0);
  assert.equal(formatBeijingInput(parseBeijingInput("9999-12-31T23:59:59")!), "9999-12-31T23:59:59");
});

test("malformed fields and normalized dates do not overwrite a preview", () => {
  for (const bad of ["", "2026-02-29T22:00", "2026-02-30T22:00", "2026-13-04T00:00:00",
    "2026-12-01T24:00", "2026-12-01T22:60", "2026-12-01T22:00:00Z", "1970-01-01T07:59:59"]) {
    assert.equal(parseBeijingInput(bad), null);
  }
  assert.equal(parseBeijingInput("2028-02-29T00:00"), Date.parse("2028-02-28T16:00:00Z"));
});
