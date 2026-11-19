import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, readProgress } from "../src/core.ts";
import { bloomingGarden, scenes } from "../src/maps.ts";
import { rainbowFlowers, rainbowIds, meadowOpen, meadowGate, meadowGatePosts, pickRainbow, rainbowReminderStrength } from "../src/rainbow-flowers.ts";
import { producers } from "../src/content.ts";
import { campfire, enteredMoonCircle, meadowExit } from "../src/meadow-map.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";

test("unpicked flower reminders fade in every 30 seconds and hold steady in reduced motion", () => {
  for (const start of [30, 60, 90]) {
    assert.equal(rainbowReminderStrength(start - .01, false), 0);
    assert.ok(rainbowReminderStrength(start + .2, false) > 0);
    assert.equal(rainbowReminderStrength(start + 1, false), 1);
    assert.ok(rainbowReminderStrength(start + 2.8, false) < 1);
    assert.equal(rainbowReminderStrength(start + 3, false), 0);
    assert.equal(rainbowReminderStrength(start - .01, true), 0);
    assert.equal(rainbowReminderStrength(start, true), 1);
    assert.equal(rainbowReminderStrength(start + 2.8, true), 1);
    assert.equal(rainbowReminderStrength(start + 3, true), 0);
  }
});

test("small flowers remain clickable at their petals and the moon circle only triggers on entry", () => {
  for (const f of rainbowFlowers) {
    const spots=scenes[f.scene].spots;
    assert.equal(clickedInteraction({x:f.x,y:f.y-9},spots,s=>s.y-(s.markerOffset??12))?.id,f.id);
    assert.ok(spots.find(s=>s.id===f.id)?.selfMarked);
  }
  const arrival=scenes.meadow.spots.find(s=>s.id==="meadow-exit")!.approach;
  assert.equal(enteredMoonCircle(arrival,arrival),false);
  assert.equal(enteredMoonCircle(arrival,meadowExit),true);
  assert.equal(enteredMoonCircle(meadowExit,arrival),false);
  assert.ok(canTravelBetween(arrival,meadowExit,scenes.meadow));
});
test("only seven different flowers from their own maps open the meadow", () => {
  const bag: string[] = [];
  for (const flower of rainbowFlowers) {
    assert.equal(meadowOpen(bag), false);
    assert.equal(pickRainbow(bag,"room",flower.id), undefined);
    assert.equal(pickRainbow(bag,flower.scene,flower.id)?.id, flower.id);
    assert.equal(pickRainbow(bag,flower.scene,flower.id), undefined);
  }
  assert.deepEqual(bag,rainbowIds);
  assert.equal(meadowOpen(bag), true);
  assert.equal(meadowOpen(Array(7).fill(rainbowIds[0])), false);
});
test("old and malformed saves cannot unlock the meadow; real collections survive reload", () => {
  assert.deepEqual(readProgress('{"bedNoteUnlocked":true}').rainbowFlowers,[]);
  const stored=JSON.stringify({rainbowFlowers:[...rainbowIds.slice(0,6),rainbowIds[0],"wreath","meadow",12]});
  assert.deepEqual(readProgress(stored).rainbowFlowers,rainbowIds.slice(0,6));
  assert.ok(!meadowOpen(readProgress(stored).rainbowFlowers));
  assert.ok(meadowOpen(readProgress(JSON.stringify({rainbowFlowers:rainbowIds})).rainbowFlowers));
});
test("the former orange flower migrates once and a complete old flower book still opens the meadow",()=>{
  const old=rainbowIds.map(id=>id==="prism-calendula"?"prism-poppy":id);
  const p=readProgress(JSON.stringify({rainbowFlowers:[...old,"prism-calendula","unknown"]}));
  assert.deepEqual(p.rainbowFlowers,rainbowIds);
  assert.ok(meadowOpen(p.rainbowFlowers));
  assert.equal(pickRainbow(p.rainbowFlowers,"garden","prism-calendula"),undefined);
});
test("when the rainbow arch appears its pillars are solid, its mouth and the courtyard routes stay open", () => {
  for (const post of meadowGatePosts) {
    const center={x:post.x+post.w/2,y:post.y+post.h/2};
    for (const [map,walkable] of [[scenes.garden,true],[bloomingGarden,false]] as const)
      assert.equal(canStand(center,map.walls,map.bounds,map.floor),walkable);
  }
  assert.ok(canTravelBetween(meadowGate.approach,meadowGate,bloomingGarden));
  for (const s of bloomingGarden.spots)
    assert.deepEqual(findPath(bloomingGarden.spawn,s.approach,bloomingGarden)?.at(-1),s.approach,s.id);
});

test("each producer has one anonymous, clickable and reachable star", () => {
  const spots = scenes.meadow.spots;
  assert.equal(producers.length, 12);
  assert.equal(new Set(producers.map(p => p.id)).size, producers.length);
  for (const person of producers) {
    const s = spots.find(p => p.id === person.id)!;
    assert.equal(s.title, "拾起草间的落星");
    assert.ok(s.selfMarked);
    assert.equal(clickedInteraction({x: s.x, y: s.y - 11}, spots)?.id, person.id);
    assert.equal(nearbyInteraction(s.approach, spots)?.id, person.id, "E at the reachable approach selects this star");
    assert.deepEqual(findPath(scenes.meadow.spawn, s.approach, scenes.meadow)?.at(-1), s.approach, person.id + " has a real route from the entrance");
  }
});

test("six previous producer IDs and positions survive adding Xiaoye, Yeshenhua and Rabe", () => {
  const previous = [
    ["star-patrick", 390, 450], ["star-kerry", 172, 308], ["star-suyan", 415, 160],
    ["star-qing", 724, 142], ["star-zhenghao", 754, 378], ["star-qianyu", 578, 502],
  ] as const;
  for (const [id, x, y] of previous) {
    const person = producers.find(p => p.id === id);
    assert.ok(person, id);
    assert.deepEqual({ x: person.x, y: person.y }, { x, y });
    assert.equal(person.message, "", "no placeholder text should become a message");
  }
  const old = readProgress(JSON.stringify({ creditStars: previous.map(([id]) => id) }));
  assert.deepEqual(old.creditStars, previous.map(([id]) => id));
  assert.deepEqual(producers.filter(p => !old.creditStars.includes(p.id)).map(p => p.id), [
    "star-xiaoye", "star-yeshenhua", "star-rabe", "star-xiaoyou", "star-guli", "star-qianxiao",
  ]);
});
test("the last three stars are discoverable without resetting any of the original nine", () => {
  const previousIds = [
    "star-xiaoye", "star-yeshenhua", "star-patrick", "star-kerry", "star-suyan",
    "star-qing", "star-zhenghao", "star-qianyu", "star-rabe",
  ];
  const newIds = ["star-xiaoyou", "star-guli", "star-qianxiao"];
  const old = readProgress(JSON.stringify({ creditStars: previousIds }));
  assert.deepEqual(old.creditStars, previousIds);
  assert.deepEqual(producers.filter(person => !old.creditStars.includes(person.id)).map(person => person.id), newIds);
  const spots = scenes.meadow.spots;
  for (const id of newIds) {
    const spot = spots.find(s => s.id === id)!;
    for (const other of spots.filter(s => s !== spot)) {
      assert.ok(Math.hypot(other.x - spot.x, other.y - spot.y) > 60, id + " crowds " + other.id);
    }
  }
  const allIds = [...old.creditStars, ...newIds];
  const restored = readProgress(JSON.stringify({ ...old, creditStars: allIds }));
  assert.deepEqual(restored.creditStars, allIds);
});
test("credit discoveries survive updates and reload, without counting as any of the seven flowers", () => {
  const ids = producers.map(p => p.id);
  assert.deepEqual(readProgress(JSON.stringify({rainbowFlowers: rainbowIds})).creditStars, []);
  const p = readProgress(JSON.stringify({creditStars: [ids[1], 3, ids[1], "unknown", ids[0]], rainbowFlowers: ids}));
  assert.deepEqual(p.creditStars, [ids[1], ids[0]]);
  assert.equal(meadowOpen(p.rainbowFlowers), false);
  assert.deepEqual(readProgress(JSON.stringify(p)), p);
});
test("moonlit grass can be crossed freely off-axis; the tent, kettle and fire are solid", () => {
  const m = scenes.meadow, stand = (x: number, y: number) => canStand({x,y}, m.walls, m.bounds, m.floor, m.surfaces);
  for (let y = 91; y <= 508; y += 38) for (let x = 82; x <= 816; x += 43) {
    if (x >= 78 && x <= 270 && y >= 108 && y <= 184) continue;
    assert.ok(stand(x,y), `unexpected closed grass at ${x},${y}`);
  }
  assert.ok(!stand(campfire.x,campfire.y + 4) && !stand(153,148) && !stand(252,138));
  assert.ok(canTravelBetween({x:91,y:367},{x:795,y:221},m));
  assert.ok(canTravelBetween({x:719,y:95},{x:221,y:522},m));
});
