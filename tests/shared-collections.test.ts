import assert from "node:assert/strict";
import test from "node:test";
import { readProgress } from "../src/core.ts";
import { collectHandedLetter, handedLetters, markLetterRead, mergeResidentStory, unreadLetterIds } from "../src/resident-story.ts";
import { mergeCollections } from "../src/shared-collections.ts";
import { mergeAchievementProgress } from "../src/achievements.ts";

test("two tabs combine read receipts, acquired mail and story milestones without resealing letters", () => {
  const a = readProgress(null).residents, b = readProgress(null).residents;
  markLetterRead(a, "xiaoaimen-anniversary-letter");
  collectHandedLetter(a, handedLetters.guli);
  markLetterRead(a, handedLetters.guli);
  collectHandedLetter(b, handedLetters.guli);
  collectHandedLetter(b, handedLetters.suyan);
  a.cake = "eaten"; b.cake = "reserved";
  b.postDelivered = true; b.postReadRevision = 2;
  a.patrickArrived = true;
  assert.ok(mergeResidentStory(b, a));
  assert.ok(mergeResidentStory(a, b));
  assert.deepEqual(a, b);
  assert.equal(mergeResidentStory(b, a), false);
  assert.deepEqual(unreadLetterIds(b), ["kerry-anniversary-letter", handedLetters.suyan]);
  assert.equal(b.cake, "eaten");
  assert.equal(b.patrickDelivered, false);
});

test("a stale save cannot revert collected flowers, rings or an already aligned moonbeam", () => {
  const a = readProgress(null), b = readProgress(null);
  a.generation = "reset-id";
  assert.equal(readProgress(JSON.stringify(a)).generation, "reset-id");
  a.rainbowFlowers.push("prism-calendula");
  b.creditStars.push("star-xiaoye");
  b.astrolabe = {found: ["vine", "star", "brass"], installed: true, turns: [0, 0, 0], mirrors: ["\\", "/"]};
  mergeCollections(a, b);
  mergeCollections(b, a);
  assert.deepEqual(b.rainbowFlowers, a.rainbowFlowers);
  assert.deepEqual(a.creditStars, b.creditStars);
  assert.deepEqual(a.astrolabe, b.astrolabe);
});

test("independent arcade records converge on the highest score per game", () => {
  const local = readProgress(null), remote = readProgress(null);
  local.arcadeBests = { flight: 16, mines: 24 };
  remote.arcadeBests = { flight: 8, miner: 320, mines: 26 };
  for (const [target, source] of [[local, remote], [remote, local]]) {
    mergeAchievementProgress(target, source);
    assert.deepEqual(target.arcadeBests, { flight: 16, mines: 26, miner: 320 });
  }
});

test("the garden tape stays picked up and inserted when tabs save in either order", () => {
  const states = ["missing", "carried", "inserted"] as const;
  for (const [index, first] of states.entries()) {
    for (const second of states.slice(index)) {
      const a = readProgress(null), b = readProgress(null);
      a.gardenTape = first;
      b.gardenTape = second;
      mergeCollections(b, a);
      mergeCollections(a, b);
      assert.equal(a.gardenTape, second);
      assert.equal(b.gardenTape, second);
    }
  }
});
