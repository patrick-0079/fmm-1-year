import test from "node:test";
import assert from "node:assert/strict";
import { scenes, type SceneId } from "../src/maps.ts";
import { resolveCue } from "../src/interaction-cues.ts";
import { sampleInteractionGlints } from "../src/interaction-glints.ts";

test("every existing scene object has a deliberate action and a local visual anchor", () => {
  const readingObjects = new Set(["letters", "album", "star-notebook", "meadow-jar"]);
  for (const [scene, map] of Object.entries(scenes)) {
    for (const spot of map.spots) {
      const before = structuredClone(spot), cue = resolveCue(spot, scene as SceneId);
      assert.ok(cue.action.length > 2 && cue.action.length < 28, `${scene}/${spot.id}: concise actionable label`);
      assert.ok(!cue.action.includes("互动") && !cue.action.includes("彩蛋"), `${spot.id}: no generic verb or premature secret announcement`);
      assert.ok(cue.verb.length >= 2 && cue.verb.length <= 3, `${spot.id}: compact touch-button verb`);
      if (cue.kind === "read") assert.ok(readingObjects.has(spot.id), `${scene}/${spot.id} fell through to unconfigured metadata`);
      const box = cue.objectBox;
      assert.ok(box.w > 0 && box.h > 0 && Object.values(box).every(Number.isFinite));
      assert.ok(cue.anchor.x >= box.x && cue.anchor.x <= box.x + box.w);
      assert.ok(cue.anchor.y >= box.y && cue.anchor.y <= box.y + box.h, `${scene}/${spot.id}: reflection rests on the object`);
      assert.deepEqual(spot, before, "resolving presentation must not change click, path or map data");
      if (spot.portal) {
        assert.equal(cue.kind, "exit"); assert.equal(cue.natural, true);
        assert.match(cue.action, /^前往/);
      }
    }
  }
});

test("NPC cues are distinct from their neighbouring shop and appear only for the selected person", () => {
  const map = scenes.town, npc = map.spots.find(s => s.id === "npc-hop-keeper")!, shop = map.spots.find(s => s.id === "arcade-hop")!;
  assert.equal(resolveCue(npc, "town").action, "与阿澈交谈");
  assert.equal(resolveCue(shop, "town").action, "玩月兔跳一跳");
  assert.deepEqual(sampleInteractionGlints([npc], "town", 0, false, ""), []);
  const selected = sampleInteractionGlints([npc], "town", 0, false, npc.id);
  assert.equal(selected.length, 1); assert.equal(selected[0].bubble, true);
  assert.equal(selected[0].id, npc.id);
  const cat = map.spots.find(s => s.id === "npc-cat")!;
  assert.equal(resolveCue(cat, "town").kind, "pet");
  assert.equal(resolveCue(cat, "town").action, "摸摸奶糖");
});

test("natural lights and doors retain their own artwork without extra sparkles even when selected", () => {
  for (const [scene, map] of Object.entries(scenes)) {
    const natural = map.spots.filter(spot => spot.portal || spot.id.startsWith("prism-") ||
      spot.id.startsWith("star-ring-") || spot.id.startsWith("star-mirror-") ||
      ["firefly", "danmaku", "room-fox", "echo-altar", "echo-pool", "star-plate", "star-brick", "meadow-camp", "meadow-jar"].includes(spot.id) ||
      scene === "meadow" && spot.id.startsWith("star-") || scene === "ruins" && spot.id.startsWith("arcade-"));
    for (const spot of natural) {
      assert.equal(resolveCue(spot, scene as SceneId).natural, true, spot.id);
      assert.deepEqual(sampleInteractionGlints([spot], scene as SceneId, .6, false, spot.id), []);
    }
  }
});

test("shimmers remain sparse, respect supplied availability, and stop animating with reduced motion", () => {
  for (const [scene, map] of Object.entries(scenes)) {
    const key = scene as SceneId;
    for (let tick = 0; tick < 80; tick++) {
      const samples = sampleInteractionGlints(map.spots, key, tick / 8, false, "");
      assert.ok(samples.length <= 4);
      assert.ok(samples.every(s => s.opacity > 0 && s.opacity <= 1 && !s.bubble));
    }
    assert.deepEqual(sampleInteractionGlints([], key, 0, false, "apple"), [], "unavailable items must not be reintroduced by presentation");
    assert.deepEqual(sampleInteractionGlints(map.spots, key, 0, true, ""), sampleInteractionGlints(map.spots, key, 17, true, ""));
  }
  const onlyApple = scenes.garden.spots.filter(s => s.id === "apple");
  const selected = sampleInteractionGlints(onlyApple, "garden", 4, false, "apple");
  assert.equal(selected.length, 1); assert.equal(selected[0].id, "apple"); assert.equal(selected[0].active, true);
});
