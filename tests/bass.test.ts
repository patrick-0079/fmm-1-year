import test from "node:test";
import assert from "node:assert/strict";
import {
  BassLesson,
  bassScore,
  bassStrings,
  beatSeconds,
  notePitch,
} from "../src/bass-score.ts";
import { readProgress } from "../src/core.ts";

test("the anniversary score has four playable four-beat phrases on all four strings", () => {
  assert.equal(
    new Set(bassScore.map((n) => n.string)).size,
    bassStrings.length,
  );
  for (let i = 0; i < 4; i++)
    assert.equal(
      bassScore.slice(i * 4, i * 4 + 4).reduce((a, n) => a + n.beats, 0),
      4,
    );
  assert.deepEqual(
    bassScore.map(notePitch),
    [31, 35, 38, 43, 45, 47, 45, 43, 40, 38, 35, 33, 35, 38, 33, 31],
  );
  assert.equal(
    bassScore.map((n) => n.word).join(""),
    "窗边星光落在琴弦周年快乐芙芙晚安",
  );
});
test("practice waits through mistakes and a demonstration resumes the exact player note", () => {
  const l = new BassLesson();
  assert.equal(l.pluck(3)?.matched, false);
  assert.equal(l.played, 0);
  assert.equal(l.pluck(0)?.pitch, 31);
  assert.equal(l.listen(4), bassScore[0]);
  assert.equal(l.pluck(1), null);
  assert.equal(l.advance(4 + beatSeconds - 0.001), undefined);
  assert.equal(l.advance(4 + beatSeconds), bassScore[1]);
  l.stopListening();
  assert.equal(l.shown, 1);
  for (const n of bassScore.slice(1))
    assert.equal(l.pluck(n.string)?.matched, true);
  assert.equal(l.complete, true);
  assert.equal(l.pluck(3)?.finished, false);
  assert.equal(l.played, 16);
});
test("a full demo, including a stalled frame, never completes the practice for the player", () => {
  const l = new BassLesson();
  l.listen(0);
  for (let i = 1; i < 16; i++) {
    assert.equal(l.advance(i * 5), bassScore[i]);
    assert.equal(l.advance(i * 5), undefined);
  }
  assert.equal(l.advance(80), null);
  assert.equal(l.preview, null);
  assert.equal(l.played, 0);
  assert.equal(l.complete, false);
});
test("older saves start with a blank dedication, only the exact saved boolean unlocks it", () => {
  assert.equal(readProgress('{"rainbowFlowers":[]}').bassSongPlayed, false);
  assert.equal(readProgress('{"bassSongPlayed":"true"}').bassSongPlayed, false);
  assert.equal(readProgress('{"bassSongPlayed":true}').bassSongPlayed, true);
});
