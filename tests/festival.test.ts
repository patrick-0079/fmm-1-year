import test from "node:test";
import assert from "node:assert/strict";
import {
  SnakeGame,
  BlocksGame,
  HopGame,
  FlightGame,
} from "../src/arcade-engines.ts";
import {
  LinkGame,
  MinesGame,
  MinerGame,
  minerHook,
  linkPath,
} from "../src/arcade-bonus.ts";
import { cakeGuides, cakePlates, followsCakeGuide } from "../src/cake-party.ts";
import {
  emptyInventory,
  readInventory,
  grantItem,
  equipItem,
  EQUIP_SLOTS,
} from "../src/items.ts";
import { scenes } from "../src/maps.ts";
import { canStand, findPath } from "../src/core.ts";

test("a full snake board begins another lap without an undefined candy", () => {
  const game = new SnakeGame();
  game.start();
  game.achieved = true;
  game.score = 276;
  game.body = [{ x: 18, y: 13 }];
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 20; x++)
      if (!(y === 13 && x >= 18)) game.body.push({ x, y });
  game.food = { x: 19, y: 13 };
  game.step();
  assert.equal(game.status, "playing");
  assert.equal(game.score, 277);
  assert.equal(game.body.length, 3);
  assert.deepEqual(game.food, { x: 13, y: 7 });
  game.step();
  assert.equal(game.status, "playing");
});

test("snake and blocks resume the same run after the first reward milestone", () => {
  const snake = new SnakeGame(() => 0.5);
  snake.start();
  for (let i = 0; i < 6; i++) {
    snake.food = { x: snake.body[0].x + 1, y: 7 };
    snake.step();
  }
  assert.equal(snake.status, "won");
  snake.continuePlay();
  snake.food = { x: snake.body[0].x + 1, y: 7 };
  snake.step();
  assert.equal(snake.status, "playing");
  assert.equal(snake.score, 7);
  assert.ok(
    !snake.body.some((p) => p.x === snake.food.x && p.y === snake.food.y),
  );
  const blocks = new BlocksGame(() => 0);
  blocks.start();
  for (let y = 12; y < 16; y++)
    blocks.board[y] = Array.from({ length: 10 }, (_, x) => (x === 5 ? 0 : 2));
  blocks.piece = [[1], [1], [1], [1]];
  blocks.x = 5;
  blocks.input("drop", true);
  blocks.continuePlay();
  assert.equal(blocks.status, "playing");
  assert.ok(blocks.fits(blocks.x, blocks.y));
  blocks.input("drop", true);
  assert.equal(blocks.status, "playing");
  assert.ok(blocks.board.some((row) => row.some(Boolean)));
});

test("hop keeps generating platforms beyond its original course", () => {
  const game = new HopGame(() => 0.35);
  game.start();
  for (let jump = 0; jump < 24; jump++) {
    const next = game.platforms[game.platformId + 1];
    assert.ok(next, `platform ${jump + 1} exists`);
    const delta = next.y - 5 - game.y;
    const time = (175 + Math.sqrt(175 ** 2 + 2 * 440 * delta)) / 440;
    const charge = Math.max(
      0,
      Math.min(1.2, ((next.x - game.x) / time - 82) / 70),
    );
    game.input("primary", true);
    game.update(charge);
    game.input("primary", false);
    for (let i = 0; i < 250 && !game.grounded && game.status === "playing"; i++)
      game.update(1 / 120);
    assert.notEqual(game.status, "lost", `landing ${jump + 1}`);
    if (game.status === "won") game.continuePlay();
  }
  assert.equal(game.score, 24);
  assert.equal(game.status, "playing");
  assert.ok(game.platforms.length > 24);
});

test("flight collects a star only once and continues past eight gates", () => {
  const pickup = new FlightGame(() => 0.5);
  pickup.start();
  pickup.y = 62;
  pickup.vy = 0;
  pickup.gates = [{ x: 40, center: 80, passed: false }];
  pickup.update(0.01);
  assert.equal(pickup.gates[0].collected, true);
  assert.equal(pickup.stars, 1);
  pickup.update(0.01);
  assert.equal(pickup.stars, 1);
  const game = new FlightGame(() => 0.5);
  game.start();
  for (let i = 0; i < 6500 && game.status !== "lost" && game.score < 17; i++) {
    if (game.status === "won") game.continuePlay();
    const next = game.gates.find((p) => !p.passed);
    if (game.y > (next?.center ?? 80) && game.vy > 0)
      game.input("primary", true);
    game.update(1 / 120);
  }
  assert.equal(game.status, "playing");
  assert.ok(game.achieved && game.score >= 17);
});

test("link paths obey the two-turn limit and can use the outside border", () => {
  const full = Array(16).fill(2);
  full[0] = full[3] = 1;
  const outside = linkPath(full, 0, 3);
  assert.ok(outside?.some((p) => p.y === -1));
  const blocked = Array(16).fill(2);
  blocked[5] = blocked[10] = 1;
  assert.equal(linkPath(blocked, 5, 10), null);
  assert.equal(linkPath(full, 0, 1), null);
  assert.equal(linkPath(full, 0, 0), null);
});

test("link pairs disappear immediately, hints work, and the next board preserves score", () => {
  const game = new LinkGame(() => 0.5);
  game.start();
  for (let n = 0; n < 16; n++) {
    game.hint();
    assert.equal(game.suggested.length, 2);
    const [a, b] = game.suggested;
    game.choose(a);
    game.choose(b);
    if (n === 0) assert.equal(game.board[a] + game.board[b], 0);
    if (game.status === "won") game.continuePlay();
  }
  assert.equal(game.score, 16);
  assert.equal(game.status, "playing");
  assert.equal(game.round, 3);
  assert.ok(game.findPair());
});

test("mines begins with a safe neighbourhood, respects flags and continues with a fresh field", () => {
  const game = new MinesGame(() => 0.5);
  game.start();
  game.cursor = 14;
  game.input("drop", true);
  game.reveal(14);
  assert.equal(game.revealed.size, 0);
  game.input("drop", true);
  game.reveal(14);
  assert.equal(game.mines.size, 4);
  assert.equal(game.count(14), 0);
  assert.ok(game.revealed.has(14));
  for (let i = 0; i < 30; i++) if (!game.mines.has(i)) game.reveal(i);
  assert.equal(game.score, 26);
  assert.equal(game.status, "won");
  assert.equal(game.pointer(50, 26, true), false);
  assert.equal(game.status, "won");
  game.continuePlay();
  assert.equal(game.status, "playing");
  assert.equal(game.round, 2);
  assert.equal(game.mines.size + game.revealed.size + game.flags.size, 0);
  game.hint();
  assert.equal(game.hints, 2);
  assert.ok(game.score > 26 && game.achieved);
});

test("mines marks the pointed tile independently of the first reveal and touch mode", () => {
  const game = new MinesGame(() => 0.5);
  // Column 4, row 3, different from the initial keyboard cursor.
  const x = 134, y = 82, tile = 15;
  assert.equal(game.pointer(2, 2, true), false);
  assert.equal(game.status, "ready");
  game.pointer(x, y, true);
  assert.deepEqual([...game.flags], [tile]);
  assert.equal(game.cursor, tile);
  assert.equal(game.mines.size + game.revealed.size, 0);
  game.flagMode = true;
  game.pointer(x, y, false);
  assert.equal(game.score, 0);
  assert.ok(game.flags.has(tile));
  game.pointer(x, y); // Touch in flag mode removes the flag.
  assert.equal(game.flags.size, 0);
  game.pointer(x, y, false); // A mouse left-click still reveals.
  assert.ok(game.revealed.has(tile));
  assert.equal(game.count(tile), 0);
  game.pointer(x, y, true);
  assert.equal(game.flags.size, 0);
});

test("the rotated jaws point along the rope and recover treasure at the visible tip on either side",()=>{
  for(const angle of [-.91,0,.91]) {
    const hook=minerHook(angle,60);
    assert.ok(Math.abs(hook.tipX-(hook.x-5*Math.sin(hook.rotation)))<1e-8);
    assert.ok(Math.abs(hook.tipY-(hook.y+5*Math.cos(hook.rotation)))<1e-8);
    const g=new MinerGame(()=>.5);g.start();g.angle=angle;g.length=58;
    g.treasures=[{x:hook.tipX,y:hook.tipY,r:2,value:40,kind:1}];
    g.input("primary",true);g.update(.02);assert.ok(g.held);
  }
});
test("miner misses have no penalty and rewards can be followed by another full field", () => {
  const game = new MinerGame(() => 0.5);
  game.start();
  for (let i = 0; i < 12000; i++) game.update(1 / 120);
  assert.equal(game.status, "playing", "there is no time limit");
  game.angle = 1.1;
  game.input("primary", true);
  for (let i = 0; i < 500 && game.phase !== "swing"; i++) game.update(1 / 120);
  assert.equal(game.score, 0);
  for (let n = 0; n < 8; n++) {
    const target = game.treasures[0];
    game.angle = Math.atan2(target.x - 120, target.y - 22);
    game.input("primary", true);
    for (let i = 0; i < 500 && game.phase !== "swing"; i++)
      game.update(1 / 120);
    if (game.status === "won") game.continuePlay();
  }
  assert.ok(game.score >= 320);
  assert.ok(game.achieved && game.round >= 2);
  assert.equal(game.status, "playing");
});

test("all wardrobe slots persist independently and the older moon bag migrates", () => {
  const bag = emptyInventory();
  for (const id of [
    "wreath",
    "roseDress",
    "ribbonShoes",
    "berryBag",
    "anniversaryPin",
    "petCat",
  ] as const) {
    grantItem(bag, id);
    equipItem(bag, id);
  }
  assert.equal(
    Object.values(bag.equipped).filter(Boolean).length,
    EQUIP_SLOTS.length,
  );
  assert.deepEqual(readInventory(JSON.stringify(bag)), bag);
  grantItem(bag, "mintCape");
  equipItem(bag, "mintCape");
  assert.equal(bag.equipped.clothes, "mintCape");
  assert.equal(bag.equipped.backpack, "berryBag");
  assert.equal(bag.equipped.pet, "petCat");
  const legacy = readInventory(
    '{"owned":["moonBag","wreath"],"equipped":{"head":"wreath","body":"moonBag"}}',
  );
  assert.equal(legacy.equipped.backpack, "moonBag");
  assert.equal(legacy.equipped.body, null);
  assert.equal(legacy.equipped.head, "wreath");
});

test("cake accepts each complete guide in either direction and rejects clicks or shortcuts", () => {
  assert.equal(cakePlates.length, 6);
  assert.equal(new Set(cakePlates.map((p) => `${p.x},${p.y}`)).size, 6);
  cakeGuides.forEach(([a, b], index) => {
    const stroke = Array.from({ length: 11 }, (_, n) => ({
      x: a.x + ((b.x - a.x) * n) / 10,
      y: a.y + ((b.y - a.y) * n) / 10,
    }));
    assert.ok(followsCakeGuide(stroke, index));
    assert.ok(followsCakeGuide([...stroke].reverse(), index));
    assert.equal(followsCakeGuide([a, b], index), false);
    assert.equal(followsCakeGuide(stroke.slice(2, 8), index), false);
    assert.equal(followsCakeGuide([a, { x: 360, y: 220 }, b], index), false);
  });
});

test("bookshop stairs and pond decking connect while the old cliff shortcut is blocked", () => {
  const scene = scenes.town;
  for (const p of [
    { x: 850, y: 790 },
    { x: 896, y: 917 },
    { x: 810, y: 950 },
  ])
    assert.ok(
      canStand(p, scene.walls, scene.bounds, scene.floor, scene.surfaces),
    );
  for (const p of [
    { x: 866, y: 930 }, // Front rail below the left deck, beside the first flower bed.
    { x: 975, y: 885 },
    { x: 995, y: 900 },
    { x: 1345, y: 924 },
  ])
    assert.equal(
      canStand(p, scene.walls, scene.bounds, scene.floor, scene.surfaces),
      false,
    );
  const gate = { x: 896, y: 917 }, waterfront = { x: 613, y: 960 };
  assert.deepEqual(findPath({ x: 867, y: 808 }, gate, scene)?.at(-1), gate);
  assert.deepEqual(findPath(gate, waterfront, scene)?.at(-1), waterfront);
});
