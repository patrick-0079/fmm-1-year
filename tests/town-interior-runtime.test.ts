import test from "node:test";
import assert from "node:assert/strict";
import { canTravelBetween, findPath, readProgress, type Point } from "../src/core.ts";
import type { Phase } from "../src/day.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import { readJourney } from "../src/journey.ts";
import { scenes } from "../src/maps.ts";
import { ResidentChats } from "../src/resident-chats.ts";
import { mergeCollections } from "../src/shared-collections.ts";
import { townInteriorId } from "../src/town-interior-id.ts";
import { crossedInteriorDoor, townInteriors } from "../src/town-interiors.ts";
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
