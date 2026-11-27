import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, readProgress } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { rainbowFlowers, rainbowIds, meadowOpen, meadowGate, pickRainbow, rainbowReminderStrength } from "../src/rainbow-flowers.ts";
import { producers } from "../src/content.ts";
import { campfire, enteredTravelCircle, meadowExit, campTapeSpot } from "../src/meadow-map.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import { xiaoyeSpot } from "../src/xiaoye-data.ts";

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

test("small flowers remain clickable at their petals", () => {
  for (const f of rainbowFlowers) {
    const spots=scenes[f.scene].spots;
    assert.equal(clickedInteraction({x:f.x,y:f.y-9},spots,s=>s.y-(s.markerOffset??12))?.id,f.id);
    assert.ok(spots.find(s=>s.id===f.id)?.selfMarked);
  }
});
test("both travel circles trigger when entering their centres and leave each return landing clear", () => {
  for (const [map,circle] of [[scenes.garden,meadowGate],[scenes.meadow,meadowExit]] as const) {
    const arrival=circle.approach;
    assert.equal(enteredTravelCircle(circle,arrival,arrival),false);
    assert.equal(enteredTravelCircle(circle,arrival,circle),true);
    assert.equal(enteredTravelCircle(circle,circle,circle),false);
    assert.equal(enteredTravelCircle(circle,circle,arrival),false);
    assert.ok(canTravelBetween(arrival,circle,map));
    assert.equal(nearbyInteraction(arrival,map.spots)?.id,circle.id);
  }
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
test("the rainbow circle beside Xiaoye follows its artwork and leaves her approach clear", () => {
  const map = scenes.garden;
  assert.ok(Math.hypot(meadowGate.x-xiaoyeSpot.x,meadowGate.y-xiaoyeSpot.y)<65);
  assert.equal(nearbyInteraction(xiaoyeSpot.approach,map.spots)?.id,xiaoyeSpot.id);
  for (const point of [{x:205,y:378}, xiaoyeSpot, xiaoyeSpot.approach])
    assert.notEqual(clickedInteraction(point,map.spots)?.id,meadowGate.id);
  for (const [dx,dy] of [[0,0],[-26,0],[26,0],[0,-13],[0,13]])
    assert.equal(clickedInteraction({x:meadowGate.x+dx,y:meadowGate.y+dy},map.spots)?.id,meadowGate.id);
  assert.ok(canTravelBetween({x:170,y:375},{x:240,y:375},map));
  for (const s of map.spots)
    assert.deepEqual(findPath(map.spawn,s.approach,map)?.at(-1),s.approach,s.id);
});

test("the tape on the grass beside the campfire is reachable without sitting or picking up the camp letter", () => {
  const map = scenes.meadow, tape = campTapeSpot;
  assert.ok(tape.x < campfire.x && Math.hypot(tape.x-campfire.x,tape.y-campfire.y)<36);
  assert.ok(canStand(tape, map.walls, map.bounds, map.floor));
  assert.deepEqual(findPath(map.spawn, tape.approach, map)?.at(-1), tape.approach);
  assert.equal(nearbyInteraction(tape.approach, map.spots), tape);
  assert.equal(clickedInteraction({ x: tape.x, y: tape.y - 5 }, map.spots), tape);
  for (const id of ["meadow-jar", "meadow-camp", "meadow-camp-letter"]) {
    const neighbour = map.spots.find(spot => spot.id === id)!;
    assert.equal(nearbyInteraction(neighbour.approach, map.spots), neighbour);
  }
});

test("each producer has one anonymous, clickable and reachable star", () => {
  const spots = scenes.meadow.spots;
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

test("older six- and nine-star collections survive expansion in any catalogue order", () => {
  const firstSix = ["star-patrick", "star-kerry", "star-suyan", "star-qing", "star-zhenghao", "star-qianyu"];
  const nextThree = ["star-xiaoye", "star-yeshenhua", "star-rabe"];
  const newestThree = ["star-xiaoyou", "star-guli", "star-qianxiao"];
  const originalIds = [...firstSix, ...nextThree, ...newestThree];
  const currentIds = new Set(producers.map(star => star.id));
  for (const id of originalIds) assert.ok(currentIds.has(id), "missing saved star " + id);

  for (const owned of [firstSix, [...firstSix, ...nextThree]]) {
    const old = readProgress(JSON.stringify({ creditStars: owned }));
    assert.deepEqual(old.creditStars, owned);
    const available = producers.filter(star => !old.creditStars.includes(star.id));
    const availableIds = new Set(available.map(star => star.id));
    for (const id of originalIds.filter(id => !owned.includes(id))) assert.ok(availableIds.has(id), id);
    const collected = [...old.creditStars, ...availableIds];
    assert.equal(collected.length, currentIds.size);
    assert.deepEqual(readProgress(JSON.stringify({ creditStars: collected })).creditStars, collected);
  }
});

test("new stars and meadow fixtures keep enough clearance to interact individually", () => {
  const starIds = new Set(producers.map(star => star.id));
  for (const star of producers) {
    for (const other of scenes.meadow.spots) {
      if (other.id === star.id) continue;
      const gap = starIds.has(other.id) ? 42 : 60;
      assert.ok(Math.hypot(other.x - star.x, other.y - star.y) >= gap, star.id + " crowds " + other.id);
    }
  }
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
