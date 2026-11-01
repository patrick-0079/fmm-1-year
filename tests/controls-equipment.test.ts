import test from "node:test";
import assert from "node:assert/strict";
import { equipmentParts, fitItem, type Facing } from "../src/equipment.ts";
import { ITEMS, type ItemId } from "../src/items.ts";
import { scenes } from "../src/maps.ts";
import { canStand, canTravelBetween } from "../src/core.ts";
import { clickedInteraction } from "../src/interaction.ts";
import { wishAtBurst, wishOpacity } from "../src/celebration.ts";

test("all six souvenirs have bounded directional attachments and disappear while sleeping", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    const worn = {
      head: item.slot === "head" ? (id as ItemId) : null,
      body: item.slot === "body" ? (id as ItemId) : null,
    };
    for (const facing of [0, 1, 2, 3] as Facing[])
      for (const pose of ["standing", "sitting"] as const) {
        for (const p of equipmentParts(worn, pose, facing)) {
          assert.equal(p.id, id);
          assert.ok(p.w > 0 && p.h > 0);
          assert.ok(
            p.x >= -40 && p.x + p.w <= 40 && p.y >= -55 && p.y + p.h <= 5,
            id + " stays attached to the character",
          );
        }
        assert.deepEqual(equipmentParts(worn, "lying", facing), []);
      }
  }
  assert.ok(
    equipmentParts({ head: null, body: "moonBag" }, "standing", 0)
      .filter((p) => !p.style)
      .every((p) => p.layer === "behind"),
  );
  assert.ok(
    equipmentParts({ head: null, body: "moonBag" }, "standing", 3).some(
      (p) => p.layer === "front",
    ),
  );
  assert.deepEqual(
    equipmentParts({ head: null, body: "anniversaryPin" }, "standing", 3),
    [],
  );
});
test("item art keeps its original aspect ratio within both small wearables and inventory icons", () => {
  for (const [w, h] of [
    [239, 76],
    [493, 416],
    [546, 555],
    [598, 604],
    [585, 411],
  ])
    for (const size of [11, 42]) {
      const box = fitItem(w, h, 3, 5, size, size);
      assert.ok(Math.abs(box.w / box.h - w / h) < 1e-8);
      assert.ok(
        box.x >= 3 &&
          box.y >= 5 &&
          box.x + box.w <= 3 + size + 1e-8 &&
          box.y + box.h <= 5 + size + 1e-8,
      );
    }
});
test("physical map exits are reciprocal and lead to safe, reachable arrival points", () => {
  for (const [id, scene] of Object.entries(scenes))
    for (const portal of scene.spots.filter((s) => s.portal)) {
      const target = scenes[portal.portal!],
        exit = target.spots.find((s) => s.id === portal.portalExit);
      assert.ok(exit, `${id}/${portal.id} has a real opposite entrance`);
      assert.equal(exit.portal, id);
      assert.equal(exit.portalExit, portal.id);
      assert.ok(
        canStand(
          exit.approach,
          target.walls,
          target.bounds,
          target.floor,
          target.surfaces,
        ),
      );
    }
  const s = scenes.town,
    p = s.spots.find((s) => s.id === "town-return")!;
  assert.ok(
    canTravelBetween(p.approach, { x: 450, y: 875 }, s),
    "town arrival faces the open street, clear of the overhead arch",
  );
});
test("mouse interaction hits both a raised marker and the actual NPC, rather than empty ground", () => {
  const s = scenes.town.spots.find((s) => s.id === "npc-welcome")!;
  const marker = (p: typeof s) => p.y - (p.markerOffset ?? 12);
  assert.equal(
    clickedInteraction({ x: s.x, y: marker(s) }, [s], marker)?.id,
    s.id,
  );
  assert.equal(
    clickedInteraction({ x: s.x, y: s.y - 20 }, [s], marker)?.id,
    s.id,
  );
  assert.equal(
    clickedInteraction({ x: s.x + 120, y: s.y }, [s], marker),
    undefined,
  );
  const gate = scenes.garden.spots.find((s) => s.id === "town-gate")!;
  assert.equal(
    clickedInteraction({ x: gate.x, y: gate.y - 48 }, [gate], marker)?.id,
    gate.id,
    "the gate's sign is clickable between its high marker and its foot",
  );
});
test("firework wishes cycle through anniversary messages and fade in and out", () => {
  assert.match(wishAtBurst(0), /一周年/);
  assert.equal(wishAtBurst(5), wishAtBurst(0));
  assert.equal(wishOpacity(3.4, 3.4), 0);
  assert.equal(wishOpacity(2, 3.4), 1);
  assert.equal(wishOpacity(0, 3.4), 0);
  assert.ok(wishOpacity(0.3, 3.4) > 0 && wishOpacity(0.3, 3.4) < 1);
});
