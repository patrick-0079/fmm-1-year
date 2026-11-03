import test from "node:test";
import assert from "node:assert/strict";
import { canStand, isCakeCut, movePlayer, readProgress } from "../src/core.ts";

test("corrupt or unexpected saved data cannot break a new visit", () => {
  for (const value of [null, "{", "null", "42", "[]", '"oops"']) {
    assert.deepEqual(readProgress(value), {
      visited: [],
      completed: [],
      sound: true,
      bassSound: true,
      bgm: true,
      volume: 0.45,
      bedNoteUnlocked: false,
      bassSongPlayed: false,
      rainbowFlowers: [],
      creditStars: [],
      arcadeBests: {},
    });
  }
  assert.deepEqual(
    readProgress(
      JSON.stringify({
        visited: ["cake", "cake", "nope", 2, "danmaku"],
        completed: ["letters", "cake"],
        sound: "true",
      }),
    ),
    {
      visited: ["cake", "danmaku"],
      completed: ["cake"],
      sound: false,
      bassSound: true,
      bgm: false,
      volume: 0.45,
      bedNoteUnlocked: false,
      bassSongPlayed: false,
      rainbowFlowers: [],
      creditStars: [],
      arcadeBests: {},
    },
  );
});

test("furniture and world borders block the player, but walls allow sliding", () => {
  const bounds = { x: 0, y: 0, w: 100, h: 100 },
    walls = [{ x: 50, y: 20, w: 20, h: 60 }];
  assert.equal(canStand({ x: 52, y: 50 }, walls, bounds), false);
  assert.equal(canStand({ x: 2, y: 50 }, walls, bounds), false);
  assert.equal(canStand({ x: 20, y: 50 }, walls, bounds), true);
  const moved = movePlayer(
    { x: 45, y: 45 },
    { x: 1, y: 1 },
    0.05,
    walls,
    bounds,
  );
  assert.equal(moved.x, 45);
  assert.ok(moved.y > 45);
});

test("diagonal movement has no speed advantage and returning from a suspended tab cannot teleport", () => {
  const bounds = { x: 0, y: 0, w: 100, h: 100 },
    start = { x: 30, y: 30 };
  const straight = movePlayer(start, { x: 1, y: 0 }, 0.016, [], bounds);
  const diagonal = movePlayer(start, { x: 1, y: 1 }, 0.016, [], bounds);
  assert.ok(
    Math.abs(Math.hypot(diagonal.x - 30, diagonal.y - 30) - (straight.x - 30)) <
      1e-8,
  );
  assert.deepEqual(
    movePlayer(start, { x: 1, y: 0 }, 20, [], bounds),
    movePlayer(start, { x: 1, y: 0 }, 0.05, [], bounds),
  );
});

test("cutting a cake requires a long top-to-bottom stroke through the cake", () => {
  assert.equal(isCakeCut({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.9 }), true);
  assert.equal(isCakeCut({ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.2 }), false);
  assert.equal(isCakeCut({ x: 0.1, y: 0.2 }, { x: 0.1, y: 0.9 }), false);
  assert.equal(isCakeCut({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.4 }), false);
});
