import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  advancePathDistance, canStand, canTravelBetween, findPath, polygonContains,
  type Geometry, type Point,
} from "../src/core.ts";
import { phaseNames, type Phase } from "../src/day.ts";
import { nearbyInteraction } from "../src/interaction.ts";
import { scenes, type Hotspot } from "../src/maps.ts";
import { readChatMemory, ResidentChats, type ChatBook } from "../src/resident-chats.ts";
import { TOWN_NPCS } from "../src/town-data.ts";
import type { TownResidentId } from "../src/town-dialogue.ts";
import { townLives } from "../src/town-routines.ts";

type Coordinates = [number, number];
type Station = { anchor: Coordinates; approach: Coordinates };
type Shift = { foot: Coordinates; approach: Coordinates };

interface Plan {
  floor: Coordinates[];
  spawn: Coordinates;
  exit: Coordinates;
  street: { arrival: Coordinates; threshold: Coordinates; halfWidth: number };
  actions: Station[];
  resident: TownResidentId;
  shifts: Partial<Record<Phase, Shift>>;
}

const art = new URL("../doc/artwork/", import.meta.url);
const names = ["florist", "baker", "maker", "post", "books", "radio", "hall"];
const document = readFileSync(new URL("ARTWORK-town-interiors.md", art), "utf8");
const phases = Object.keys(phaseNames) as Phase[];
const point = ([x, y]: Coordinates): Point => ({ x, y });
const coordinates = (list: string) => list.split(" ").map(entry =>
  point(entry.split(",").map(Number) as Coordinates));
const town = { ...scenes.town, walls: scenes.town.walls.filter(w => !w.yieldsOnArrival) };

function readPlan(name: string) {
  const svg = readFileSync(new URL("town-interiors/" + name + ".svg", art), "utf8");
  const metadata = svg.match(/<metadata id="review-geometry">([^<]+)<\/metadata>/);
  assert.ok(metadata, name + " must include its draft coordinates");
  const plan: Plan = JSON.parse(metadata[1]);
  const walls = Array.from(svg.matchAll(/<polygon points="([^"]+)" data-name="([^"]+)"/g),
    ([, points, label]) => ({ label, points: coordinates(points) }));
  const routes = Array.from(svg.matchAll(/<polyline points="([^"]+)"[^>]*data-route="walk"(?: data-shift="([^"]+)")?/g),
    ([, points, phase]) => ({ phase, points: coordinates(points) }));
  const panes = Array.from(svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^>]*fill-opacity="([^"]+)"[^>]*data-divider-pane="true"/g),
    ([, x, y, w, h, opacity]) => ({ x: +x, y: +y, w: +w, h: +h, opacity: +opacity }));
  const room: Geometry = { bounds: { x: 0, y: 0, w: 600, h: 400 }, floor: plan.floor.map(point), walls };
  return { plan, room, routes, panes };
}

function assertWalk(from: Point, to: Point, geometry: Geometry, label: string) {
  const path = findPath(from, to, geometry);
  assert.ok(path?.length && path.at(-1)?.x === to.x && path.at(-1)?.y === to.y, label);
  const walk = advancePathDistance(from, path, 10000, geometry);
  assert.ok(!walk.blocked && Math.hypot(walk.point.x - to.x, walk.point.y - to.y) < .001, label);
}

test("all seven draft entrances connect the two floors with a clear landing on either side", () => {
  for (const name of names) {
    const { plan, room } = readPlan(name);
    const coords = [plan.street.arrival, plan.street.threshold, plan.spawn, ...plan.actions.map(action => action.approach)];
    const columns = coords.map(p => "(" + p.join(", ") + ")").join(" | ");
    assert.ok(document.includes("| " + columns + " |"), name + " coordinates match the design table");
    const arrival = point(plan.street.arrival);
    assertWalk(town.spawn, arrival, town, name + " street arrival");
    assertWalk(arrival, town.spawn, town, name + " return to the plaza");
    const npc = TOWN_NPCS.find(person => person.id === plan.resident)!;
    assert.ok(npc, name + " existing resident");
    assertWalk(npc, arrival, town, name + " resident reaches the street door");
    assertWalk(arrival, npc, town, name + " resident returns to the street");
    const threshold = point(plan.street.threshold);
    if (plan.street.halfWidth > 0) {
      assert.ok(arrival.y > threshold.y, name + " outside spawn leaves a step before crossing");
      for (const side of [-1, 0, 1]) {
        const x = threshold.x + side * plan.street.halfWidth;
        assert.ok(canTravelBetween({ x, y: arrival.y }, { x, y: threshold.y - 2 }, town), name + " doorway sweep");
      }
    } else {
      assert.ok(Math.hypot(threshold.x - arrival.x, threshold.y - arrival.y) < 30, name + " side sign reach");
    }
    const spawn = point(plan.spawn), exit = point(plan.exit);
    assert.ok(exit.y > spawn.y + 10, name + " interior spawn leaves a step before crossing");
    for (const offset of [-22, 0, 22]) {
      const a = { x: spawn.x + offset, y: spawn.y };
      const b = { x: exit.x + offset, y: exit.y + 2 };
      assert.ok(canTravelBetween(a, b, room) && canTravelBetween(b, a, room), name + " open south doorway");
    }
    for (const offset of [-40, 40]) {
      const from = { x: spawn.x + offset, y: spawn.y };
      const to = { ...from, y: exit.y + 2 };
      assert.ok(!canTravelBetween(from, to, room), name + " south wall");
    }
  }
  // The earlier bookshop landing overlapped Motao during her walk towards the door.
  const { plan } = readPlan("books");
  const home = TOWN_NPCS.find(person => person.id === "books")!;
  for (const stop of [home, ...townLives.books.stops, ...(townLives.books.doorway ?? [])]) {
    const wall = { x: stop.x - 5, y: stop.y - 6, w: 10, h: 9 };
    for (const tile of [plan.street.arrival, plan.street.threshold]) {
      assert.ok(canStand(point(tile), [wall], town.bounds), "bookshop crossing clears Motao's feet");
    }
  }
});

test("draft furniture blocks feet, glass gaps stay open, and either shift can reach both activities", () => {
  for (const name of names) {
    const { plan, room, routes } = readPlan(name);
    for (const wall of room.walls) {
      assert.ok("points" in wall);
      const centre = {
        x: wall.points.reduce((sum, p) => sum + p.x, 0) / wall.points.length,
        y: wall.points.reduce((sum, p) => sum + p.y, 0) / wall.points.length,
      };
      assert.ok(polygonContains(centre, wall.points), wall.label);
      assert.equal(canStand(centre, [wall], room.bounds), false, name + " " + wall.label);
    }
    for (const phase of phases) {
      const shift = plan.shifts[phase];
      const walls = [...room.walls];
      const stations: Hotspot[] = plan.actions.map((s, i) => ({
        id: "action-" + i, title: name, ...point(s.anchor), approach: point(s.approach),
      }));
      if (shift) {
        const foot = point(shift.foot), talk = point(shift.approach);
        assert.ok(canTravelBetween(talk, foot, room), name + " " + phase + " face-to-face");
        assertWalk(point(plan.spawn), foot, room, name + " " + phase + " resident moves in");
        assertWalk(foot, point(plan.exit), room, name + " " + phase + " resident moves out");
        walls.push({ x: foot.x - 5, y: foot.y - 6, w: 10, h: 9 });
        stations.push({ id: "resident", title: name, ...foot, approach: talk, radius: 56 });
      }
      const occupied = { ...room, walls };
      const segments = new Map<string, Set<string>>();
      const key = (p: Point) => p.x + "," + p.y;
      for (const route of routes.filter(route => !route.phase || route.phase === phase)) {
        for (let i = 1; i < route.points.length; i++) {
          const a = route.points[i - 1], b = route.points[i];
          assert.ok(canTravelBetween(a, b, occupied) && canTravelBetween(b, a, occupied),
            name + " " + phase + " drawn route " + JSON.stringify([a, b]));
          for (const [from, to] of [[key(a), key(b)], [key(b), key(a)]]) {
            if (!segments.has(from)) segments.set(from, new Set());
            segments.get(from)!.add(to);
          }
        }
      }
      const reachable = new Set([key(point(plan.spawn))]);
      for (const from of reachable) {
        for (const to of segments.get(from) ?? []) reachable.add(to);
      }
      for (const station of stations) {
        const label = name + " " + phase + " " + station.id;
        assert.ok(reachable.has(key(station.approach)), label + " has a continuous drawn route");
        assertWalk(point(plan.spawn), station.approach, occupied, label + " approach");
        assertWalk(station.approach, point(plan.exit), occupied, label + " exit");
        for (const current of ["", ...stations.map(s => s.id)]) {
          assert.equal(nearbyInteraction(station.approach, stations, current)?.id, station.id,
            label + " keeps the correct E target from " + current);
        }
      }
    }
  }
  for (const [name, left, right, glass, opening] of [
    ["florist", 162, 199, 173, 242],
    ["radio", 332, 365, 219, 281],
  ] as const) {
    const { room, panes } = readPlan(name);
    assert.equal(canTravelBetween({ x: left, y: glass }, { x: right, y: glass }, room), false);
    assert.ok(canTravelBetween({ x: left, y: opening }, { x: right, y: opening }, room));
    assert.equal(panes.length, 2, name + " two separate glass faces");
    for (const pane of panes) {
      assert.ok(pane.x > left && pane.x + pane.w < right && pane.opacity > 0 && pane.opacity < 1, name);
      assert.ok(opening < pane.y || opening > pane.y + pane.h, name + " opening is clear of painted glass");
    }
  }
});

test("draft dialogue covers both indoor shifts and uses the game's persisted conversation order", () => {
  const textByRoom = Array.from(document.matchAll(/^## (.+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm),
    ([, title, text]) => ({ title, text }));
  for (const name of names) {
    const { plan } = readPlan(name);
    const text = textByRoom.find(room => room.text.includes("town-interiors/" + name + ".svg"))!.text;
    const lines = Object.fromEntries(Array.from(text.matchAll(/^\| ([^|\r\n]+) \| ([^|\r\n]+) \|\r?$/gm),
      ([, heading, line]) => [heading, line]));
    const indoorPhases = Object.keys(plan.shifts) as Phase[];
    assert.equal(indoorPhases.length, 2, name);
    assert.deepEqual(phases.filter(p => lines[phaseNames[p] + "开场"]).sort(), indoorPhases.sort(), name);
    const familiar = [lines.熟客话题一, lines.熟客话题二] as const;
    const book: ChatBook = {
      phases: Object.fromEntries(indoorPhases.map(p => [p, lines[phaseNames[p] + "开场"]])),
      familiar,
    };
    assert.ok(familiar.every(line => line?.trim()), name);
    assert.equal(new Set([...Object.values(book.phases), ...familiar]).size, 4, name);
    const memory = readChatMemory();
    const chats = new ResidentChats(() => memory);
    const id = "npc-" + plan.resident;
    const [a, b] = indoorPhases;
    assert.equal(chats.next(id, book, a).text, book.phases[a]);
    assert.equal(chats.next(id, book, b).text, book.phases[b]);
    assert.equal(chats.next(id, book, a).text, familiar[0]);
    assert.equal(chats.next(id, book, b).text, familiar[1]);
    const reloaded = new ResidentChats(() => readChatMemory(JSON.parse(JSON.stringify(memory))));
    assert.equal(reloaded.next(id, book, a).text, book.phases[a], name + " reload skips immediate repeat");
  }
});
