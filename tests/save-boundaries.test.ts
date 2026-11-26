import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { emptyInventory, readInventory, starterItems } from "../src/items.ts";
import { readJourney } from "../src/journey.ts";
import { scenes } from "../src/maps.ts";
import { rainbowIds } from "../src/rainbow-flowers.ts";

const unusual = [null, false, 7, "broken", [], {}, ["vine", "vine", "__proto__"], {found: "vine", installed: true}];

test("malformed nested quest records never erase independent earned progress", () => {
  for (const key of ["roomFox", "residents", "echoes", "astrolabe", "arcadeBests"])
    for (const value of unusual) {
      const result = readProgress(JSON.stringify({
        completed: ["cake", "cake"], creditStars: ["star-rabe", "star-rabe"],
        rainbowFlowers: [rainbowIds[0]], [key]: value,
      }));
      assert.deepEqual(result.completed, ["cake"], `${key}: ${JSON.stringify(value)}`);
      assert.deepEqual(result.creditStars, ["star-rabe"]);
      assert.deepEqual(result.rainbowFlowers, [rainbowIds[0]]);
      assert.ok(Number.isFinite(result.volume));
    }
});

test("inventory rejects prototype names, duplicate IDs and wrong equipment slots", () => {
  const inventory = readInventory(JSON.stringify({
    owned: ["petCat", "petCat", "wreath", "constructor", "__proto__", null, {}, ["petCat"]],
    equipped: {head: "petCat", pet: "wreath", shoes: "constructor", body: {id: "wreath"}},
    bouquet: "yes",
  }));
  assert.deepEqual(inventory.owned, [...starterItems, "petCat", "wreath"]);
  assert.deepEqual(inventory.equipped, emptyInventory().equipped);
  assert.equal(inventory.bouquet, false);
  for (const value of unusual) {
    const restored = readInventory(JSON.stringify({owned: ["petCat"], equipped: value}));
    assert.deepEqual(restored.owned, [...starterItems, "petCat"]);
    assert.deepEqual(restored.equipped, emptyInventory().equipped);
  }
});

test("a complete old quest survives duplicate records without duplicate rewards or fabricated rings", () => {
  const result = readProgress(JSON.stringify({
    astrolabe: {found: ["brass", "star", "vine", "star", "unknown"], installed: true,
      turns: [0, 0, 0], mirrors: ["\\", "/"]},
    echoes: {found: ["star", "leaf", "bell", "star"], played: 3, listened: true},
    residents: {postDelivered: true, postReadRevision: 1, guardianInvited: true},
  }));
  assert.deepEqual(result.astrolabe.found, ["vine", "star", "brass"]);
  assert.deepEqual(result.astrolabe.mirrors, ["\\", "/"]);
  assert.deepEqual(result.echoes.found, ["leaf", "bell", "star"]);
  assert.equal(result.echoes.listened, true);
  assert.equal(result.residents.postReadRevision, 1);
  assert.deepEqual(readProgress(JSON.stringify(result)), result);
});

test("all six maps recover an invalid saved coordinate to a safe spawn", () => {
  for (const [scene, map] of Object.entries(scenes)) {
    const savedAt = Date.now();
    const recovered = readJourney(JSON.stringify({scene, x: -1e100, y: 1e100, savedAt}), rainbowIds);
    assert.deepEqual(recovered, {scene, ...map.spawn, savedAt});
  }
  for (const scene of ["__proto__", "constructor", "toString", ["room"], {}])
    assert.equal(readJourney(JSON.stringify({scene, x: 300, y: 300, savedAt: Date.now()}), rainbowIds), null);
});
