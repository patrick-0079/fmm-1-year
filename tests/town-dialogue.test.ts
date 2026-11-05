import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_NPCS } from "../src/town-data.ts";
import { residentOpening, townDialogues } from "../src/town-dialogue.ts";
import { POST_LETTER_REVISION, type ResidentStory } from "../src/resident-story.ts";
import { scenes } from "../src/maps.ts";
import { findPath } from "../src/core.ts";

const fresh: ResidentStory = {
  postDelivered: false, postReadRevision: 0, welcomeReceived: false, cake: "new", guardianInvited: false,
};

test("every town dialogue and its timed pages resolve to real pages or available controls", () => {
  assert.deepEqual(Object.keys(townDialogues).sort(), TOWN_NPCS.map(n => n.id).sort());
  for (const npc of TOWN_NPCS) {
    const pages = townDialogues[npc.id];
    assert.ok(pages[residentOpening(npc.id, fresh, false)]);
    for (const [id, page] of Object.entries(pages)) {
      assert.ok(page.text.trim(), npc.id + "/" + id);
      const destinations = page.choices?.map(reply => reply[1]) ?? [];
      if (page.after) {
        assert.ok(page.after.seconds > 0);
        assert.ok(destinations.includes(page.after.next), "timed lines can be advanced manually");
      }
      for (const next of destinations) {
        if (next === "@game") assert.ok(npc.game, npc.id);
        else assert.ok(Object.hasOwn(pages, next) || ["@bag", "@bouquet", "@decline"].includes(next), next);
      }
    }
  }
});

test("the two calls to Yinling and Hongjian's first reply are separate from receiving gifts", () => {
  const welcome = townDialogues.welcome;
  assert.equal(welcome.start.text, "......");
  assert.deepEqual(welcome.start.choices, [["你好？", "silent"]]);
  assert.equal(welcome.silent.text, "......");
  assert.deepEqual(welcome.silent.choices, [["你好？？", "awake"]]);
  for (const page of [welcome.start, welcome.silent, welcome.awake, townDialogues.post.letter, townDialogues.florist.show])
    assert.equal(page.effect, undefined);
  assert.equal(welcome.pin.effect, "pin");
  assert.equal(townDialogues.post.delivered.effect, "deliver");
  assert.equal(townDialogues.florist.receive.effect, "bouquet");
});

test("E talks to the intended resident from every approach, even before picking any rainbow flower", () => {
  const map = scenes.town;
  for (const npc of TOWN_NPCS) {
    const spot = map.spots.find(s => s.id === "npc-" + npc.id)!;
    const nearest = map.spots.map(s => ({
      spot: s, distance: Math.hypot(s.x - spot.approach.x, s.y - spot.approach.y),
    })).filter(({spot, distance}) => distance < (spot.radius ?? 48)).sort((a,b) => a.distance - b.distance)[0];
    assert.equal(nearest.spot.id, spot.id);
    assert.deepEqual(findPath(map.spawn, spot.approach, map)?.at(-1), spot.approach);
  }
});

test("revisits depend on story completion, letter revision, reserved cakes and real bouquets", () => {
  assert.equal(residentOpening("welcome", fresh, false), "start");
  assert.equal(residentOpening("welcome", {...fresh, welcomeReceived: true}, false), "return");
  const delivered = {...fresh, postDelivered: true, postReadRevision: POST_LETTER_REVISION};
  assert.equal(residentOpening("post", delivered, false), "read");
  assert.equal(residentOpening("post", {...delivered, postReadRevision: POST_LETTER_REVISION - 1}, false), "unread");
  assert.equal(residentOpening("baker", {...fresh, cake: "reserved"}, false), "reserved");
  assert.equal(residentOpening("baker", {...fresh, cake: "eaten"}, false), "return");
  assert.equal(residentOpening("florist", fresh, true), "return");
  assert.equal(residentOpening("florist", fresh, false), "start");
  assert.deepEqual(townDialogues.baker.eat.after, {seconds: 3, next: "finished"});
  assert.deepEqual(townDialogues.bunny.hug.after, {seconds: 1.5, next: "intro"});
});
