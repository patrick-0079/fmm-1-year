import test from "node:test";
import assert from "node:assert/strict";
import { SnakeGame, BlocksGame, HopGame, FlightGame, type Engine, type GameAction } from "../src/arcade-engines.ts";
import { LinkGame, MinesGame, MinerGame } from "../src/arcade-bonus.ts";

const constructors = [SnakeGame, BlocksGame, HopGame, FlightGame, LinkGame, MinesGame, MinerGame];
const actions: GameAction[] = ["left", "right", "up", "down", "primary", "drop"];
function random(seed: number) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function finiteState(value: unknown, name: string) {
  if (typeof value === "number") assert.ok(Number.isFinite(value), name + " became non-finite");
  else if (value && typeof value === "object") {
    const entries = value instanceof Set ? [...value].map((v, i) => [String(i), v]) : Object.entries(value);
    for (const [key, item] of entries) finiteState(item, `${name}.${key}`);
  }
}

for (const Game of constructors) test(`${Game.name}: seeded conflicting inputs, cancelled holds and out-of-board clicks remain recoverable`, () => {
  for (const seed of [49017, 1, 0xffffffff]) {
    const rng = random(seed);
    let engine: Engine = new Game(rng);
    engine.start();
    for (let step = 0; step < 3000; step++) {
      if (engine.status === "lost" && step % 23 === 0) {
        engine = new Game(rng);
        engine.start();
      }
      const score = engine.score;
      const finished = engine.status === "lost";
      const action = actions[Math.floor(rng() * actions.length)];
      engine.input(action, true);
      if (step % 3 === 0) engine.input(action, true); // repeated keydown
      if (step % 7 === 0) engine.cancelInput?.(); // focus / pointer capture lost
      engine.input(actions[Math.floor(rng() * actions.length)], false); // late or mismatched keyup
      if (step % 5 === 0) engine.pointer?.(rng() * 400 - 80, rng() * 280 - 60);
      if (step % 31 === 0) engine.hint?.();
      if (step % 11 === 0) engine.continuePlay();
      engine.update(step % 19 === 0 ? 0 : rng() * .05);
      assert.ok(["ready", "playing", "won", "lost"].includes(engine.status));
      assert.ok(Number.isSafeInteger(engine.score) && engine.score >= score, "score lost or corrupted");
      if (finished) assert.equal(engine.score, score, "input awarded points after losing");
      if (step % 29 === 0) finiteState(engine, Game.name);
      if (engine instanceof BlocksGame) {
        assert.equal(engine.board.length, 16);
        assert.ok(engine.board.every(row => row.length === 10));
      }
      if (engine instanceof MinesGame) {
        for (const cell of [...engine.revealed, ...engine.flags]) assert.ok(cell >= 0 && cell < 30);
        for (const cell of engine.flags) assert.ok(!engine.revealed.has(cell));
      }
    }
  }
});
