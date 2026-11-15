import test from "node:test";
import assert from "node:assert/strict";
import { clickedInteraction, interactionHitY, nearbyInteraction } from "../src/interaction.ts";
import type { Hotspot } from "../src/maps.ts";
import { gateSpot, gateSignFoot, townGates } from "../src/gate-layout.ts";

const spot = (id: string, x: number, y = 100, radius = 80): Hotspot => ({
  id, title: id, x, y, approach: { x, y: y + 15 }, radius,
});

test("nearby interaction holds a choice through small distance changes, then switches at eight pixels", () => {
  const a = spot("a", 100), b = spot("b", 140);
  assert.equal(nearbyInteraction({ x: 120, y: 100 }, [a, b], "b")?.id, "b", "a tie keeps the current target");
  assert.equal(nearbyInteraction({ x: 123.9, y: 100 }, [a, b], "a")?.id, "a", "7.8 px difference should not flicker");
  assert.equal(nearbyInteraction({ x: 124, y: 100 }, [a, b], "a")?.id, "b", "8 px difference selects the closer target");
  assert.equal(nearbyInteraction({ x: 116.1, y: 100 }, [a, b], "b")?.id, "b");
  assert.equal(nearbyInteraction({ x: 116, y: 100 }, [a, b], "b")?.id, "a");
});

test("collected or out-of-range targets immediately release the selection", () => {
  const collected = spot("collected", 100, 100, 20), remaining = spot("remaining", 130, 100, 30);
  assert.equal(nearbyInteraction({ x: 112, y: 100 }, [remaining], collected.id), remaining);
  assert.equal(nearbyInteraction({ x: 120, y: 100 }, [collected, remaining], collected.id), remaining, "radius boundary is not reachable");
  assert.equal(nearbyInteraction({ x: 160, y: 100 }, [remaining], remaining.id), null);
  assert.equal(nearbyInteraction({ x: 100, y: 100 }, [], collected.id), null);
});

test("the object hit anchor stays fixed while the player and selected target change", () => {
  const letter = { ...spot("letters", 53, 164), markerOffset: 12 };
  const objectPoint = { x: 53, y: 152 };
  for (const player of [{ x: 53, y: 150 }, { x: 53, y: 180 }, { x: 300, y: 300 }]) {
    nearbyInteraction(player, [letter], "letters");
    assert.equal(interactionHitY(letter), 152);
    assert.equal(clickedInteraction(objectPoint, [letter]), letter);
  }
  assert.equal(interactionHitY({ ...letter, markerOffset: 0 }), letter.y, "zero is an intentional offset");
  assert.equal(interactionHitY({ ...spot("natural", 40), selfMarked: true }), 90);
  assert.equal(interactionHitY(spot("ordinary", 40)), 88);
});

test("wide entrances retain both passage and sign hit areas without relying on a floating marker", () => {
  for (const gate of townGates) {
    const entry = gateSpot(gate), sign = gateSignFoot(gate);
    assert.equal(clickedInteraction({ x: sign.x, y: sign.y - 18 }, [entry]), entry, gate.id + " sign");
    for (const area of entry.hitAreas) {
      for (const point of [
        { x: area.x, y: area.y },
        { x: area.x + area.w, y: area.y + area.h },
        { x: area.x + area.w / 2, y: area.y + area.h / 2 },
      ]) assert.equal(clickedInteraction(point, [entry]), entry, gate.id + " edge remains clickable");
    }
    const x = Math.min(...entry.hitAreas.map(a => a.x)) - 1;
    assert.equal(clickedInteraction({ x, y: gate.y }, [entry]), undefined, gate.id + " exterior is not a door click");
  }
});

test("a shifted cosmetic cue never expands the clickable extent into a neighboring subject", () => {
  const npc = { ...spot("npc", 100), markerOffset: 53 };
  const object = { ...spot("book", 160), markerOffset: 12 };
  assert.equal(clickedInteraction({ x: 100, y: 47 }, [npc, object]), npc);
  assert.equal(clickedInteraction({ x: 160, y: 88 }, [npc, object]), object);
  assert.equal(clickedInteraction({ x: 130, y: 35 }, [npc, object]), undefined);
});
