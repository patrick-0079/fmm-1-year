import test from "node:test";
import assert from "node:assert/strict";
import {
  SnakeGame,
  BlocksGame,
  HopGame,
  FlightGame,
} from "../src/arcade-engines.ts";
import {
  readInventory,
  emptyInventory,
  grantItem,
  equipItem,
  ITEMS,
} from "../src/items.ts";
import { ARCADES, TOWN_NPCS, TOWN_FRAMES } from "../src/town-data.ts";
test("snake cannot reverse into its neck, eats valid candy and ends at the reward goal", () => {
  const g = new SnakeGame(() => 0.5);
  g.start();
  g.input("left", true);
  g.step();
  assert.deepEqual(g.body[0], { x: 9, y: 7 });
  for (let i = 0; i < 6; i++) {
    g.food = { x: g.body[0].x + 1, y: 7 };
    g.step();
  }
  assert.equal(g.status, "won");
  assert.equal(g.score, 6);
  assert.equal(g.body.length, 9);
  const wall = new SnakeGame();
  wall.start();
  for (let i = 0; i < 30; i++) wall.step();
  assert.equal(wall.status, "lost");
});
test("four simultaneous tetris lines clear cleanly and award a win", () => {
  const g = new BlocksGame(() => 0);
  g.start();
  for (let y = 12; y < 16; y++)
    g.board[y] = Array.from({ length: 10 }, (_, x) => (x === 5 ? 0 : 2));
  g.piece = [[1], [1], [1], [1]];
  g.x = 5;
  g.y = 0;
  g.input("drop", true);
  assert.equal(g.status, "won");
  assert.equal(g.score, 4);
  assert.equal(g.board.length, 16);
  assert.ok(g.board.every((r) => r.every((v) => v === 0)));
  const edge = new BlocksGame(() => 0);
  edge.start();
  for (let i = 0; i < 30; i++) edge.input("left", true);
  assert.equal(edge.x, 0);
  assert.equal(edge.fits(edge.x, edge.y), true);
});
test("hop charging and landing can reach eight platforms without mid-air double jumps", () => {
  const g = new HopGame(() => 0.35);
  g.start();
  for (let jump = 0; jump < 8; jump++) {
    const next = g.platforms[g.platformId + 1],
      target = next.y - 5,
      delta = target - g.y;
    const time = (175 + Math.sqrt(175 ** 2 + 2 * 440 * delta)) / 440;
    const charge = Math.max(
      0,
      Math.min(1.2, ((next.x - g.x) / time - 82) / 70),
    );
    g.input("primary", true);
    g.update(charge);
    g.input("primary", false);
    const velocity = g.vx;
    g.input("primary", true);
    assert.equal(g.vx, velocity);
    for (let i = 0; i < 250 && !g.grounded && g.status === "playing"; i++)
      g.update(1 / 120);
    assert.notEqual(g.status, "lost", `missed platform ${jump + 1}`);
  }
  assert.equal(g.score, 8);
  assert.equal(g.status, "won");
});
test("flight has achievable gates and correctly fails on collision", () => {
  const g = new FlightGame(() => 0.5);
  g.start();
  for (let i = 0; i < 3000 && g.status === "playing"; i++) {
    const next = g.gates.find((p) => !p.passed);
    if (g.y > (next?.center ?? 80) && g.vy > 0) g.input("primary", true);
    g.update(1 / 120);
  }
  assert.equal(g.status, "won");
  assert.equal(g.score, 8);
  const crash = new FlightGame();
  crash.start();
  crash.gates = [{ x: 45, center: 40, passed: false }];
  crash.y = 120;
  crash.update(0.01);
  assert.equal(crash.status, "lost");
});
test("souvenir rewards are unique, equipment slots persist and legacy wreaths migrate", () => {
  const bag = emptyInventory();
  assert.equal(equipItem(bag, "wreath"), false);
  assert.equal(grantItem(bag, "wreath"), true);
  assert.equal(grantItem(bag, "wreath"), false);
  equipItem(bag, "wreath");
  grantItem(bag, "headphones");
  grantItem(bag, "moonBag");
  equipItem(bag, "headphones");
  equipItem(bag, "moonBag");
  assert.deepEqual(bag.equipped, {
    ...emptyInventory().equipped,
    head: "headphones",
    backpack: "moonBag",
  });
  assert.deepEqual(readInventory(JSON.stringify(bag)), bag);
  equipItem(bag, "headphones");
  assert.deepEqual(bag.equipped, {
    ...emptyInventory().equipped,
    backpack: "moonBag",
  });
  assert.equal(readInventory(null, '{"wearing":true}').equipped.head, "wreath");
  const corrupt = readInventory(
    '{"owned":["wreath","bad","wreath"],"equipped":{"body":"wreath","head":"headphones"}}',
  );
  assert.deepEqual(corrupt.owned, ["wreath"]);
  assert.deepEqual(corrupt.equipped, emptyInventory().equipped);
  const rewards = Object.values(ARCADES).map((g) => g.reward);
  assert.equal(new Set(rewards).size, 7);
  for (const id of rewards) assert.ok(ITEMS[id]);
});
test("the anniversary town has fifteen distinct configurable NPCs and complete sprite crops", () => {
  assert.equal(TOWN_NPCS.length, 15);
  assert.equal(new Set(TOWN_NPCS.map((n) => n.id)).size, 15);
  assert.equal(TOWN_FRAMES.length, 15);
  for (const npc of TOWN_NPCS) {
    assert.ok(npc.lines.length > 0);
    const f = TOWN_FRAMES[npc.sprite];
    assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= 1536 && f.y + f.h <= 1024);
  }
});
