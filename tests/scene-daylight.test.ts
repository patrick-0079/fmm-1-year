import assert from "node:assert/strict";
import test from "node:test";
import { daylightMix } from "../src/daylight-mix.ts";
import { drawSceneDaylight, drawWindowLightOnFloor } from "../src/scene-daylight.ts";

test("all four surfaces share continuous, monotonic clock transitions at the boundaries", () => {
  const phases = ["night", "dawn", "day", "dusk", "night"];
  for (const [i, at] of [5, 8, 17, 20].entries()) {
    const before = daylightMix(at - .4), center = daylightMix(at), after = daylightMix(at + .4);
    assert.equal(before.from, phases[i]);
    assert.ok(before.mix < 1e-8);
    assert.deepEqual([center.from, center.to], phases.slice(i, i + 2));
    assert.ok(Math.abs(center.mix - .5) < 1e-8);
    assert.ok(daylightMix(at - 1 / 60).mix < center.mix && center.mix < daylightMix(at + 1 / 60).mix);
    assert.deepEqual(after, { from: phases[i + 1], to: phases[i + 1], mix: 0 });
  }
  assert.deepEqual(daylightMix(23.99), daylightMix(0));
});

test("room and garden lighting reuses its raster, keeps real lamps warm and changes light direction", () => {
  const maps: { width: number; height: number; fills: string[]; directions: number[][]; pools: number[][] }[] = [];
  const mockDocument = {
    createElement() {
      const map = { width: 0, height: 0, fills: [] as string[], directions: [] as number[][], pools: [] as number[][] };
      maps.push(map);
      const color = { addColorStop(_offset: number, rgba: string) { map.fills.push(rgba); } };
      return Object.assign(map, { getContext() { return {
        scale() {}, fillRect() {},
        createLinearGradient(...coords: number[]) { map.directions.push(coords); return color; },
        createRadialGradient(...coords: number[]) { map.pools.push(coords); return color; },
      }; } });
    },
  };
  const images: unknown[] = [], ctx = { globalAlpha: 1, drawImage(image: unknown) { images.push(image); }, save() {}, restore() {} };
  const draw = (scene: "room" | "garden" | "challenge", hour: number) =>
    drawSceneDaylight(ctx as unknown as CanvasRenderingContext2D, scene, daylightMix(hour));
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: mockDocument });
  try {
    for (const scene of ["room", "garden", "challenge"] as const) {
      const n = maps.length;
      draw(scene, 6); draw(scene, 12); draw(scene, 18); draw(scene, 22);
      const [dawn, day, dusk, night] = maps.slice(n, n + 4);
      assert.ok(dawn.directions[0][0] > dusk.directions[0][0]);
      assert.ok(dawn.directions[0][2] < dusk.directions[0][2]);
      assert.equal(day.pools.length, 0);
      assert.ok(night.pools.length > 0);
      assert.notDeepEqual(dawn.fills, dusk.fills);
      const w = scene === "room" ? 300 : 450;
      assert.equal(night.width, w); assert.equal(night.height, w * 2 / 3);
      draw(scene, 17);
      assert.deepEqual(images.slice(-2), [day, dusk]);
      assert.equal(maps.length, n + 4);
    }
    assert.notDeepEqual(maps[7].fills, maps[11].fills);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("three sunset panes reach the soft edge beside the bed and leave the cake table clear", () => {
  const shears: number[] = [], panes: number[][] = [], gradients: number[][] = [];
  const tile = { width: 0, height: 0, getContext: () => ({
    save() {}, restore() {},
    transform(_a: number, _b: number, skew: number) { shears.push(skew); },
    fillRect(x: number, y: number, w: number, h: number) { if (w <= 42) panes.push([x,y,w,h]); },
    createLinearGradient(...coords: number[]) { gradients.push(coords); return { addColorStop() {} }; },
  }) };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => tile } });
  const ctx = { globalAlpha: 1, save() {}, restore() {}, drawImage() {} } as unknown as CanvasRenderingContext2D;
  try {
    for (const hour of [6, 18]) drawWindowLightOnFloor(ctx, daylightMix(hour));
    assert.equal(panes.length, 6);
    const [morning, evening] = shears;
    assert.ok(morning < 0 && evening > 0);
    function sunsetReaches(x: number, y: number) {
      // Invert the projection from the three glass panes to actual floor coordinates.
      const u = ((x - 259) - evening * (y - 99)) / (1 - .035 * evening);
      const v = y - 99 - .035 * u;
      return x < 224 + tile.width && panes.slice(3).some(([left, top, w, h]) =>
        u >= left && u < left + w && v >= top && v < top + h);
    }
    assert.ok(sunsetReaches(424, 179));
    assert.ok(!sunsetReaches(428, 178) && !sunsetReaches(332, 166) && !sunsetReaches(300, 197));
    assert.deepEqual(gradients.at(-1), [415 - 224, 0, 427 - 224, 0]);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
