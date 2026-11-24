import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { canTravelBetween, findPath, readProgress, type Point } from "../src/core.ts";
import type { Phase } from "../src/day.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import { readJourney } from "../src/journey.ts";
import { scenes } from "../src/maps.ts";
import { ResidentChats } from "../src/resident-chats.ts";
import { mergeCollections } from "../src/shared-collections.ts";
import { townInteriorId, townInteriorKeys } from "../src/town-interior-id.ts";
import { crossedInteriorDoor, hallCollectionSlots, townInteriors } from "../src/town-interiors.ts";
import { collectTownKeepsake, mergeTownKeepsakes, readTownKeepsakes } from "../src/town-keepsakes.ts";
import { TownResidentMap } from "../src/town-resident-map.ts";
import { residentTownScene, TownRoutines } from "../src/town-routines.ts";

const empty = { x: -200, y: -200 }, view = { x: 0, y: 0, w: 1536, h: 1024 };
const street = { ...scenes.town, walls: scenes.town.walls.filter(wall => !wall.yieldsOnArrival) };
const feet = ({ x, y }: Point) => ({ x, y });
const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

test("each actual doorway is linked in both directions and only crossing it forwards enters", () => {
  for (const room of Object.values(townInteriors)) {
    const inside = townInteriorId(room.key);
    assert.equal(scenes[inside], room.scene);
    assert.ok(street.spots.includes(room.exterior));
    assert.ok(room.scene.spots.includes(room.exit));
    assert.equal(room.exterior.portalExit, room.exit.id);
    assert.equal(room.exit.portalExit, room.exterior.id);
    assert.deepEqual(findPath(street.spawn, room.exterior.approach, street)?.at(-1), room.exterior.approach);
    for (const [door, map] of [[room.exterior, street], [room.exit, room.scene]] as const) {
      const sign = door.crossing?.sign ?? -1;
      const before = { x: door.x, y: door.y - sign * 3 }, after = { x: door.x, y: door.y + sign * 2 };
      assert.equal(crossedInteriorDoor(map.spots, before, after), door.crossing ? door : undefined, door.id);
      assert.equal(crossedInteriorDoor(map.spots, after, before), undefined, door.id);
      assert.equal(crossedInteriorDoor(map.spots, after, after), undefined, door.id);
      assert.equal(crossedInteriorDoor(map.spots, { ...before, x: door.x + 31 }, { ...after, x: door.x + 31 }), undefined);
      if (door.crossing) assert.ok(canTravelBetween(before, after, map), door.id);
    }
    const valid = { scene: inside, ...room.exit.approach, savedAt: 1 };
    const solid = room.scene.walls[0];
    assert.ok("points" in solid);
    const unsafe = solid.points.reduce((p, q) => ({ x: p.x + q.x / solid.points.length, y: p.y + q.y / solid.points.length }), { x: 0, y: 0 });
    const restored = readJourney(JSON.stringify(valid), []);
    const recovered = readJourney(JSON.stringify({ ...valid, ...unsafe }), []);
    assert.equal(restored?.scene, inside);
    assert.equal(recovered?.scene, inside);
    assert.deepEqual(restored && feet(restored), room.exit.approach);
    assert.deepEqual(recovered && feet(recovered), room.scene.spawn);
  }
});

const outdoorShift = {
  florist: "day", baker: "day", maker: "dawn", post: "dawn", books: "dawn", radio: "dusk", hall: "night",
} satisfies Record<string, Phase>;

test("all seven residents walk through their own threshold both ways and bring their portrait and collision with them", () => {
  for (const room of Object.values(townInteriors)) {
    const inside = townInteriorId(room.key), id = room.resident, npcSpot = "npc-" + id;
    const [indoorShift] = Object.keys(room.shifts) as Phase[];
    for (const swapped of [false, true]) {
      const outside = outdoorShift[room.key];
      const [from, to] = swapped ? [indoorShift, outside] : [outside, indoorShift];
      const [source, target] = swapped ? [inside, "town"] as const : ["town", inside] as const;
      const cast = new TownRoutines(from), actor = cast.people.get(id)!;
      const live = new TownResidentMap(room.scene, inside), town = new TownResidentMap(scenes.town);
      assert.equal(residentTownScene(id, from), source);
      assert.equal(residentTownScene(id, to), target);
      const origin = feet(actor);
      cast.tick(.05, to, empty, view, null, id, false, source);
      assert.deepEqual(feet(actor), origin, `${id} waits until the current line ends`);
      const sourceDoor = swapped ? room.exit : room.exterior.crossing ? room.exterior : room.exterior.approach;
      const targetDoor = swapped ? room.exterior.crossing ? room.exterior : room.exterior.approach : room.exit;
      let crossed = false;
      for (let i = 0; i < 2000; i++) {
        const before = feet(actor), wasIn = actor.scene;
        cast.tick(.05, to, empty, view, null, undefined, false, actor.scene);
        const map = actor.scene === "town" ? street : room.scene;
        if (wasIn === actor.scene) assert.ok(canTravelBetween(before, actor, map), `${id} avoids furniture and streetside walls`);
        else {
          assert.equal(crossed, false, `${id} crosses once`);
          crossed = true;
          assert.ok(gap(before, sourceDoor) <= 2.3, `${id} walks to the threshold`);
          assert.deepEqual(feet(actor), feet(targetDoor), `${id} starts the new route at its own door`);
        }
        live.update(empty, undefined, undefined, cast.people);
        town.update(empty, undefined, undefined, cast.people);
        const indoors = live.scene.spots.some(spot => spot.id === npcSpot);
        const outdoors = town.scene.spots.some(spot => spot.id === npcSpot);
        assert.ok(!(indoors && outdoors), `${id} has one presence across the two maps`);
        if (crossed && actor.status === "present") break;
      }
      assert.equal(crossed, true, `${id} reached the door`);
      assert.equal(actor.scene, target);
      assert.equal(actor.status, "present");
      const active = (swapped ? town : live).scene;
      const at = active.spots.find(spot => spot.id === npcSpot)!;
      assert.deepEqual(feet(at), feet(actor));
      assert.ok(active.walls.some(wall => wall.yieldsOnArrival && "x" in wall && wall.x === at.x - 5 && wall.y === at.y - 6));
    }
  }
});

test("a departing shopkeeper can walk around a stationary player in the corridor and at the doorstep", () => {
  const flowerShop = townInteriors["town-florist"];
  for (const [from, to, player, area, reached] of [
    ["dawn", "day", flowerShop.shifts.dawn!.approach, "town-florist", "town"],
    ["day", "dusk", flowerShop.exterior.approach, "town", "town-florist"],
  ] as const) {
    const cast = new TownRoutines(from), actor = cast.people.get("florist")!;
    const source = area === "town" ? street : flowerShop.scene;
    const guarded = { ...source, walls: [...source.walls, { x: player.x - 6, y: player.y - 6, w: 12, h: 12 }] };
    for (let i = 0; i < 800 && actor.scene === area; i++) {
      const before = feet(actor);
      cast.tick(.05, to, player, view, null, undefined, false, area);
      if (actor.scene === area) assert.ok(canTravelBetween(before, actor, guarded));
    }
    assert.equal(actor.scene, reached);
  }
});

test("the live indoor maps share the collision and depth footprint for each illustrated prop", () => {
  for (const room of Object.values(townInteriors)) {
    const id = townInteriorId(room.key);
    assert.equal(room.art.props.length, room.scene.walls.length);
    room.art.props.forEach((prop, index) => {
      const wall = room.scene.walls[index];
      assert.ok("points" in wall);
      assert.equal(prop.depth, Math.max(...wall.points.map(p => p.y)));
    });
    for (const phase of Object.keys(room.shifts) as Phase[]) {
      const dynamic = new TownResidentMap(room.scene, id);
      dynamic.update(room.scene.spawn, undefined, undefined, new TownRoutines(phase).people);
      for (const spot of dynamic.scene.spots) {
        assert.deepEqual(findPath(room.scene.spawn, spot.approach, dynamic.scene)?.at(-1), spot.approach, spot.id);
        assert.deepEqual(findPath(spot.approach, feet(room.exit), dynamic.scene)?.at(-1), feet(room.exit), spot.id);
        assert.equal(nearbyInteraction(spot.approach, dynamic.scene.spots)?.id, spot.id);
        const target = spot.cue?.anchor ?? { x: 0, y: -24 };
        assert.equal(clickedInteraction({ x: spot.x + target.x, y: spot.y + target.y }, dynamic.scene.spots)?.id, spot.id);
      }
    }
  }
});

test("the hall aisle reaches the new display and the workshop cabinet has a walkable side", () => {
  const hall = townInteriors["town-hall"];
  const display = hall.scene.spots.find(spot => spot.id === "town-hall-extra")!;
  assert.ok(canTravelBetween(hall.scene.spawn, display.approach, hall.scene));
  assert.ok(!canTravelBetween(display.approach, { x: 300, y: 145 }, hall.scene));
  assert.equal(nearbyInteraction(display.approach, hall.scene.spots)?.id, display.id);
  const cabinet = hall.art.props.find(prop => prop.name === "七屋纪念展柜")!;
  const [, , width, height, left, top] = cabinet.variants.day;
  assert.deepEqual(hallCollectionSlots.map(([key]) => key).sort(), [...townInteriorKeys].sort());
  for (const [, , x, y] of hallCollectionSlots) {
    assert.ok(x - 9 >= left && x + 9 <= left + width / hall.art.scale);
    assert.ok(y - 10 >= top && y + 12 <= top + height / hall.art.scale);
  }

  const workshop = townInteriors["town-maker"].scene;
  assert.ok(!canTravelBetween({ x: 104, y: 216 }, { x: 104, y: 274 }, workshop));
  assert.ok(canTravelBetween({ x: 169, y: 268 }, { x: 169, y: 206 }, workshop));
});

test("painted controls can be targeted during every indoor shift", () => {
  const controls = [
    ["baker", "main", { x: 213, y: 130 }],
    ["post", "main", { x: 524, y: 176 }],
    ["books", "extra", { x: 50, y: 185 }],
    ["books", "extra", { x: 61, y: 220 }],
    ["radio", "extra", { x: 487, y: 145 }],
    ["hall", "main", { x: 528, y: 126 }],
  ] as const;
  const phases = ["dawn", "day", "dusk", "night"] as const;
  for (const [key, action, at] of controls) {
    const id = townInteriorId(key), room = townInteriors[id];
    for (const phase of phases) {
      const dynamic = new TownResidentMap(room.scene, id);
      dynamic.update(room.scene.spawn, undefined, undefined, new TownRoutines(phase).people);
      assert.equal(clickedInteraction(at, dynamic.scene.spots)?.id, id + "-" + action, id + " " + phase);
    }
  }
});

test("the HD atlas frames fit their textures and preserve the logical room size", async () => {
  for (const { key, scene, art } of Object.values(townInteriors)) {
    const file = fileURLToPath(new URL(`../src/assets/town-interiors/${key}.webp`, import.meta.url));
    const { width, height } = await sharp(file).metadata();
    assert.equal(art.scale, 2);
    for (const [, , w, h, left, top] of Object.values(art.backgrounds)) {
      assert.deepEqual([w / art.scale, h / art.scale, left, top], [scene.width, scene.height, 0, 0], key);
    }
    const frames = [
      ...Object.values(art.backgrounds), ...Object.values(art.lights),
      ...art.props.flatMap(prop => [...Object.values(prop.variants), ...Object.values(prop.raisedVariants ?? {})]),
    ];
    for (const [x, y, w, h] of frames) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height, key);
    }
  }
});

test("the bookshop has a separate raised blind in every phase", () => {
  const blind = townInteriors["town-books"].art.props.find(prop => prop.name === "临池侧窗木座")!;
  const raised = blind.raisedVariants!;
  const phases = ["dawn", "day", "dusk", "night"] as const;
  assert.equal(new Set(phases.map(phase => raised[phase]?.join(","))).size, phases.length);
  for (const phase of phases) {
    assert.ok(raised[phase]);
    assert.notDeepEqual(raised[phase], blind.variants[phase]);
    assert.deepEqual(raised[phase].slice(2), blind.variants[phase].slice(2));
  }
});

test("the first recorded souvenir survives loading older, malformed, and concurrent saves", () => {
  const load = (data: unknown) => readProgress(JSON.stringify({ townKeepsakes: data }));
  assert.deepEqual(load(null).townKeepsakes, { items: [] });
  const first = load({ items: ["hall", "hall", "room", "baker", 3], radioTrack: "bells" });
  assert.deepEqual(first.townKeepsakes, { items: ["baker", "hall"] });
  const second = load({ items: ["radio", "post", "post"], radioTrack: "bells" });
  mergeCollections(first, second);
  mergeCollections(first, second);
  assert.deepEqual(readProgress(JSON.stringify(first)).townKeepsakes, { items: ["baker", "post", "radio", "hall"], radioTrack: "bells" });
  assert.deepEqual(load({ items: false, radioTrack: "other" }).townKeepsakes, { items: [] });
});

test("parallel recordings converge on the earliest take and keep legacy recordings", () => {
  const first = readTownKeepsakes(null), second = readTownKeepsakes(null);
  collectTownKeepsake(first, "radio", "bells", 100);
  collectTownKeepsake(second, "radio", "creek", 120);
  mergeTownKeepsakes(first, second);
  mergeTownKeepsakes(second, first);
  assert.deepEqual(first, second);
  assert.deepEqual(readTownKeepsakes(first), { items: ["radio"], radioTrack: "bells", radioRecordedAt: 100 });
  mergeTownKeepsakes(first, readTownKeepsakes({ items: ["radio"], radioTrack: "creek", radioRecordedAt: -10 }));
  assert.deepEqual(first, { items: ["radio"], radioTrack: "creek" });
});

test("indoors the daily chat order and the meeting record survive being reloaded separately", () => {
  for (const room of Object.values(townInteriors)) {
    const base = "npc-" + room.resident, atWork = base + "-inside";
    const [a, b] = Object.keys(room.shifts) as Phase[];
    const progress = readProgress(null);
    const chats = new ResidentChats(() => progress.residents.chats);
    chats.introduce(base);
    assert.equal(chats.next(atWork, room.chat, a).text, room.chat.phases[a]);
    assert.equal(chats.next(atWork, room.chat, a).text, room.chat.familiar[0]);
    const resumed = readProgress(JSON.stringify(progress));
    const reloaded = new ResidentChats(() => resumed.residents.chats);
    assert.ok(reloaded.introduced(base));
    assert.equal(reloaded.next(atWork, room.chat, b).text, room.chat.phases[b]);
    assert.equal(reloaded.next(atWork, room.chat, a).text, room.chat.familiar[1]);
    assert.equal(reloaded.next(atWork, room.chat, a).text, room.chat.phases[a]);
  }
});
