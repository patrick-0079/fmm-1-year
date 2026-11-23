import assert from "node:assert/strict";
import test from "node:test";
import { canTravelBetween, polygonContains } from "../src/collision.ts";
import { creekDrift } from "../src/creek-drift.ts";
import { creeks } from "../src/creek-layout.ts";
import { scenes } from "../src/maps.ts";

for (const scene of ["garden", "challenge"] as const) {
  test(`${scene} floats travel through the two waterways and beneath the actual bridge`, () => {
    const creek = creeks[scene];
    const observed = new Map<string, Set<string>>();
    for (let time = 0; time <= 21; time += .05) {
      for (const floater of creekDrift(scene, time)) {
        if (floater.opacity < .05) continue;
        const upper = polygonContains(floater, creek.upper);
        const lower = polygonContains(floater, creek.lower);
        const bridge = floater.y >= creek.bridge.y && floater.y <= creek.bridge.y + creek.bridge.h &&
          Math.abs(floater.x - (creek.bridge.x + creek.bridge.w / 2)) < creek.bridge.w / 2 - 5;
        assert.ok(upper || lower || bridge, JSON.stringify(floater));
        const regions = observed.get(floater.kind) ?? new Set();
        regions.add(bridge ? "bridge" : upper ? "upper" : "lower");
        observed.set(floater.kind, regions);
      }
    }
    assert.equal(observed.size, scene === "garden" ? 2 : 1);
    for (const regions of observed.values()) assert.equal(regions.size, 3);
  });
}

test("the paler petal starts later but emerges downstream first", () => {
  const firstAppearance = new Map<string, number>(), firstEmergence = new Map<string, number>();
  for (let t = 17.61; t < 34; t += .03) {
    for (const petal of creekDrift("garden", t)) {
      if (!firstAppearance.has(petal.kind)) firstAppearance.set(petal.kind, t);
      if (petal.y >= 277 && !firstEmergence.has(petal.kind)) firstEmergence.set(petal.kind,t);
    }
  }
  assert.ok(firstAppearance.get("rose")! < firstAppearance.get("pearl")!);
  assert.ok(firstEmergence.get("pearl")! < firstEmergence.get("rose")!);
});

test("both walkable bridge decks remain open, while the banks and rails block feet", () => {
  for (const scene of ["garden", "challenge"] as const) {
    const { bridge, head } = creeks[scene];
    const { x, y, w, h } = bridge;
    const middle = y + h / 2;
    const west = { x: x - 9, y: middle }, east = { x: x + w + 8, y: middle };
    assert.ok(canTravelBetween(west, east, scenes[scene]), scene);
    assert.ok(canTravelBetween(east, west, scenes[scene]), scene);
    const stream = head[Math.floor(head.length * .55)];
    assert.ok(!canTravelBetween({ x: stream.x - 19, y: stream.y }, { x: stream.x + 19, y: stream.y }, scenes[scene]), scene);
    assert.ok(!canTravelBetween({ x: x + w / 2, y: middle }, { x: x + w / 2, y: y + 1 }, scenes[scene]), scene);
  }
});
