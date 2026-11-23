import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_NPCS } from "../src/town-data.ts";
import { residentOpening, townDailyActions, townDialogues } from "../src/town-dialogue.ts";
import { townChatTopics } from "../src/town-chat-topics.ts";
import { worksInTown } from "../src/town-routines.ts";
import { handedLetters, POST_LETTER_REVISION, readResidentStory } from "../src/resident-story.ts";
import { scenes } from "../src/maps.ts";
import { canStand, findPath } from "../src/core.ts";
import { clickedInteraction } from "../src/interaction.ts";

const fresh = readResidentStory();

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
        else assert.ok(Object.hasOwn(pages, next) || ["@bag", "@bouquet", "@decline", "@post"].includes(next), next);
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

test("the three anniversary guests are reachable from town entrances and do not grant automatic rewards", () => {
  const map = scenes.town;
  const entrances = [map.spawn, ...map.spots.filter(spot => spot.portal).map(spot => spot.approach)];
  for (const [id, x, y, approach] of [
    ["xiaoyou", 436, 892, {x: 467, y: 916}],
    ["guli", 862, 324, {x: 830, y: 345}],
    ["qianxiao", 1220, 514, {x: 1192, y: 539}],
  ] as const) {
    const spot = map.spots.find(s => s.id === "npc-" + id)!;
    assert.deepEqual([spot.x, spot.y], [x, y]);
    assert.deepEqual(spot.approach, approach);
    assert.equal(canStand(spot, map.walls, map.bounds, map.floor, map.surfaces), false);
    assert.equal(clickedInteraction({x, y: y - 17}, map.spots), spot);
    for (const start of entrances) {
      assert.deepEqual(findPath(start, spot.approach, map)?.at(-1), spot.approach);
    }
    for (const page of Object.values(townDialogues[id])) assert.equal(page.effect, undefined);
  }
});

test("the town residents offer their own letters only after the intended dialogue", () => {
  const radio = townDialogues["radio-host"];
  for (const [, next] of radio.start.choices!) {
    assert.deepEqual(radio[next].choices?.[0], ["看看节目单", "offer-letter"]);
    assert.equal(radio[next].letter, undefined);
  }
  assert.equal(radio["offer-letter"].letter, handedLetters["radio-host"]);
  assert.deepEqual(townDialogues.xiaoyou["taste-orange"].choices, [["看看果篮", "offer-letter"]]);
  assert.equal(townDialogues.xiaoyou["offer-letter"].letter, handedLetters.xiaoyou);
  assert.deepEqual(townDialogues.guli["show-fish"].choices, [["你手里的是什么？", "offer-letter"]]);
  assert.equal(townDialogues.guli["offer-letter"].letter, handedLetters.guli);
});

test("revisits depend on actual delivery or gift completion even if the player has never read it", () => {
  assert.equal(residentOpening("welcome", fresh, false), "start");
  assert.equal(residentOpening("welcome", fresh, false, true), "start");
  assert.equal(residentOpening("welcome", {...fresh, welcomeReceived: true}, false), "daily");
  const delivered = {...fresh, postDelivered: true, postReadRevision: POST_LETTER_REVISION};
  assert.equal(residentOpening("post", delivered, false), "daily");
  assert.equal(residentOpening("post", {...delivered, postReadRevision: POST_LETTER_REVISION - 1}, false), "daily");
  for (const id of ["radio-host", "xiaoyou", "guli"] as const) {
    assert.equal(residentOpening(id, fresh, false, true), "start");
    for (const status of ["unread", "read"] as const) {
      assert.equal(residentOpening(id, {...fresh, npcLetters:{[handedLetters[id]]:status}}, false), "daily");
    }
  }
  assert.equal(residentOpening("baker", {...fresh, cake: "reserved"}, false), "reserved");
  assert.equal(residentOpening("baker", {...fresh, cake: "eaten"}, false), "daily");
  assert.equal(residentOpening("florist", fresh, true), "daily");
  assert.equal(residentOpening("florist", fresh, false), "start");
  assert.equal(residentOpening("books", fresh, false, true), "daily");
  assert.deepEqual(townDialogues.baker.eat.after, {seconds: 3, next: "finished"});
  assert.deepEqual(townDialogues.bunny.hug.after, {seconds: 1.5, next: "intro"});
});

test("all 18 town residents have a topic for each working shift, two familiar topics and distinct player replies", () => {
  const references = new Set<string>();
  assert.deepEqual(Object.keys(townChatTopics).sort(), TOWN_NPCS.map(n => n.id).sort());
  for (const { id } of TOWN_NPCS) {
    const book = townChatTopics[id];
    assert.deepEqual(Object.keys(book.phases).sort(), ["dawn", "day", "dusk", "night"].filter(
      phase => worksInTown(id, phase as keyof typeof book.phases)).sort());
    const topics = [...Object.values(book.phases), ...book.familiar];
    assert.equal(book.familiar.length, 2);
    assert.equal(topics.filter(topic => typeof topic !== "string" && topic.replies?.length === 2).length, 1, id);
    for (const topic of topics) {
      const line = typeof topic === "string" ? topic : topic.text;
      assert.ok(line.trim() && !references.has(line), id + ": " + line);
      references.add(line);
      if (typeof topic !== "string" && topic.replies) {
        const [[a, first], [b, second]] = topic.replies;
        assert.notEqual(a, b);
        assert.notEqual(first, second);
      }
      if (["post", "radio-host", "xiaoyou", "guli"].includes(id))
        assert.doesNotMatch(JSON.stringify(topic), /信封|邮局|来信|读信|投递|那封信/);
    }
    for (const [, target] of townDailyActions[id] ?? [])
      assert.ok(target.startsWith("@") || Object.hasOwn(townDialogues[id], target), id + "/" + target);
  }
});
