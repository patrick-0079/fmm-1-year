import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import masks from "../doc/artwork/town-interiors/masks/props.json" with { type: "json" };
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
import { collectTownKeepsake, mergeTownKeepsakes, readTownKeepsakes, townKeepsakeChoice } from "../src/town-keepsakes.ts";
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

test("indoor props sort at their supporting footprint and all actions stay reachable", () => {
  for (const room of Object.values(townInteriors)) {
    const id = townInteriorId(room.key);
    assert.equal(room.art.props.length, room.scene.walls.length);
    room.art.props.forEach((prop, index) => {
      const wall = room.scene.walls[index];
      assert.ok("points" in wall);
      if (room.key === "radio" && prop.name === "话筒底座") {
        const consoleDepth = room.art.props.find(item => item.name === "调音台")!.depth;
        assert.equal(prop.depth, consoleDepth);
        assert.ok(Math.max(...wall.points.map(p => p.y)) < consoleDepth);
      } else {
        assert.equal(prop.depth, Math.max(...wall.points.map(p => p.y)));
      }
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
    ["books", "extra", { x: 424, y: 75 }],
    ["books", "extra", { x: 477, y: 79 }],
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
      ...Object.values(art.backgrounds), ...Object.values(art.skies), ...Object.values(art.lights),
      ...art.props.flatMap(prop => Object.values(prop.variants)),
      ...Object.values(art.blind?.raised ?? {}), ...Object.values(art.blind?.lowered ?? {}),
    ];
    for (const [x, y, w, h] of frames) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height, key);
    }
  }
});

test("the bookshop has a separate raised blind in every phase", () => {
  const { art, scene } = townInteriors["town-books"];
  const blind = art.blind!;
  const raised = blind.raised;
  const phases = ["dawn", "day", "dusk", "night"] as const;
  assert.equal(new Set(phases.map(phase => raised[phase]?.join(","))).size, phases.length);
  for (const phase of phases) {
    assert.ok(raised[phase]);
    assert.notDeepEqual(raised[phase], blind.lowered[phase]);
    assert.deepEqual(raised[phase].slice(2), blind.lowered[phase].slice(2));
    assert.ok(raised[phase][4] >= 400 && raised[phase][5] < 60);
  }
  assert.ok(canTravelBetween({ x: 38, y: 228 }, { x: 51, y: 266 }, scene));
  assert.equal(clickedInteraction({ x: 50, y: 185 }, scene.spots), undefined);
});

test("daylight maps sample the approved paintings, with translucent panes and open space around the furniture", async () => {
  for (const { key, art } of Object.values(townInteriors)) {
    const atlas = fileURLToPath(new URL(`../src/assets/town-interiors/${key}.webp`, import.meta.url));
    const original = fileURLToPath(new URL(`../doc/artwork/town-interiors/daylight-concepts/${key}.png`, import.meta.url));
    const [left, top, width, height] = art.backgrounds.day;
    const sample = async (image: ReturnType<typeof sharp>) =>
      image.resize(90, 60, { fit: "fill" }).removeAlpha().raw().toBuffer();
    const [actual, approved] = await Promise.all([sample(sharp(atlas).extract({ left, top, width, height })), sample(sharp(original))]);
    const difference = actual.reduce((sum, value, index) => sum + Math.abs(value - approved[index]), 0);
    assert.ok(difference / actual.length < 3.5, key + " uses its approved daylight illustration");
    const panes = art.props.filter(prop => /隔断|隔音玻璃/.test(prop.name));
    if (key === "florist" || key === "radio") {
      assert.equal(panes.length, 2);
      const [px, py, opening] = key === "florist" ? [180, 154, 242] : [349, 158, 281];
      const [x, y, , , l, t] = panes[0].variants.day;
      const [alpha] = await sharp(atlas).extract({ left: x + (px - l) * 2, top: y + (py - t) * 2, width: 1, height: 1 })
        .extractChannel("alpha").raw().toBuffer();
      assert.ok(alpha > 30 && alpha < 155, key + " shows the actor through glass");
      for (const pane of panes) {
        const [, , , h, , top] = pane.variants.day;
        assert.ok(opening < top || opening > top + h / 2, key + " passage has no foreground pane");
      }
    }
    if (key === "maker") {
      const [x, y, , , l, t] = art.props.find(p => p.name === "中央试光台")!.variants.day;
      for (const [px, py, opaque] of [[260, 190, true], [246, 231, true], [291, 232, false]] as const) {
        const [alpha] = await sharp(atlas).extract({ left: x + (px - l) * 2, top: y + (py - t) * 2, width: 1, height: 1 })
          .extractChannel("alpha").raw().toBuffer();
        assert.equal(alpha > 200, opaque, "tabletop, foot and clearance between the legs");
      }
    }
  }
});

test("all seven velvet cells match the empty case, including the foreground drawn over actors", async () => {
  const { art } = townInteriors["town-hall"];
  const atlas = fileURLToPath(new URL("../src/assets/town-interiors/hall.webp", import.meta.url));
  const emptyCase = fileURLToPath(new URL("../doc/artwork/town-interiors/empty-case.webp", import.meta.url));
  const inserts = [[59,163,180,84],[255,163,177,84],[446,163,174,84],[634,163,171,84],[59,259,254,89],[329,259,227,89],[571,259,234,89]];
  const cells = art.collection!;
  assert.deepEqual(Object.keys(cells).sort(), [...townInteriorKeys].sort());
  const cabinet = art.props.find(prop => prop.name === "七屋纪念展柜")!.variants.day;
  for (const [i, [key, , cx, cy]] of hallCollectionSlots.entries()) {
    const [x, y, w, h] = cells[key], [left, top, width, height] = inserts[i];
    assert.ok(cx >= x && cx <= x + w && cy >= y && cy <= y + h);
    const reference = await sharp(emptyCase).extract({ left, top, width, height })
      .resize(w * 2, h * 2, { fit: "fill" }).removeAlpha().raw().toBuffer();
    for (const [sx, sy, , , dx, dy] of [art.backgrounds.day, cabinet]) {
      const pixels = await sharp(atlas).extract({ left: sx + (x - dx) * 2, top: sy + (y - dy) * 2, width: w * 2, height: h * 2 })
        .removeAlpha().raw().toBuffer();
      const error = pixels.reduce((total, value, j) => total + Math.abs(value - reference[j]), 0) / pixels.length;
      assert.ok(error < 8, key + " only acquires an illustration when drawn from the collection");
    }
  }
});

test("every foreground frame retains the source silhouette and its exact registration", async () => {
  for (const { key, art } of Object.values(townInteriors)) {
    const asset = fileURLToPath(new URL(`../src/assets/town-interiors/${key}.webp`, import.meta.url));
    const mask = fileURLToPath(new URL(`../doc/artwork/town-interiors/masks/${key}.png`, import.meta.url));
    const [atlas, source] = await Promise.all([
      sharp(asset).extractChannel("alpha").raw().toBuffer({ resolveWithObject: true }),
      sharp(mask).extractChannel(0).raw().toBuffer({ resolveWithObject: true }),
    ]);
    let top = 0;
    for (const [i, prop] of art.props.entries()) {
      const [x, y, w, h, l, t] = prop.variants.day;
      assert.deepEqual([prop.name, l * 2, t * 2, w, h], masks[key][i]);
      for (let row = 0; row < h; row++) {
        const a = (y + row) * atlas.info.width + x, b = (top + row) * source.info.width;
        assert.ok(atlas.data.subarray(a, a + w).equals(source.data.subarray(b, b + w)), key + "/" + prop.name);
      }
      top += h;
    }
    assert.equal(top, source.info.height);
  }
});

test("the bakery silhouettes follow tin lids, cake tiers, balloons and the spaces between the jars", async () => {
  const { art } = townInteriors["town-baker"];
  const atlas = fileURLToPath(new URL("../src/assets/town-interiors/baker.webp", import.meta.url));
  // Coordinates in the 1200 × 800 painting. Each pair straddles a visible contour.
  const marks = [
    [7, [[289,543],[351,551],[409,566],[353,578]], [[323,543],[380,550],[245,552]]],
    [6, [[88,477],[120,511],[68,528],[113,635]], [[57,484],[132,482],[101,562]]],
    [4, [[134,397],[143,430],[154,451],[185,474]], [[97,399],[182,405],[167,516]]],
    [3, [[625,188],[679,185],[735,187],[653,238]], [[652,200],[709,203],[586,209]]],
  ] as const;
  for (const [index, inside, outside] of marks) {
    const [left, top, width, height, x, y] = art.props[index].variants.day;
    const mask = await sharp(atlas).extract({ left, top, width, height }).extractChannel("alpha").raw().toBuffer();
    const opacity = ([px, py]: readonly number[]) => mask[(py - 2 * y) * width + px - 2 * x] ?? 0;
    for (const point of inside) assert.ok(opacity(point) > 235, art.props[index].name + " solid at " + point);
    for (const point of outside) assert.ok(opacity(point) < 20, art.props[index].name + " clear at " + point);
  }
});

test("furniture cutouts cover painted objects and leave the adjoining floor visible", async () => {
  // Landmarks taken from the original 1200 × 800 paintings, independently of the masks.
  const rooms = [
    ["florist", [
      ["花墙矮柜", [[565,208]], [[580,198]]],
    ]],
    ["baker", [
      ["回折陈列柜", [[1070,445]], [[1075,437]]],
      ["左侧品尝柜", [[152,402],[160,411],[161,421],[166,429],[186,488]],
        [[159,399],[164,405],[168,412],[166,419],[168,424],[171,427]]],
    ]],
    ["maker", [
      ["材料抽屉柜", [[288,138]], [[302,121]]],
      ["藤紫南角花盆", [[112,606],[94,608]], [[57,620]]],
    ]],
    ["post", [
      ["邮戳机工作桌", [[995,386]], [[985,380],[1039,382]]],
      ["待寄包裹柜", [[605,641]], [[721,566],[670,644]]],
    ]],
    ["books", [
      ["装帧桌", [[384,229]], [[374,229],[382,223]]],
      ["矮书架", [[645,300],[662,301]], [[606,197]]],
      ["临窗阅读椅", [[1080,282]], [[1072,308]]],
      ["茶几", [[1047,343],[1069,327]], [[1122,365],[1067,322]]],
    ]],
    ["radio", [
      ["调音台", [[306,250]], [[308,245]]],
      ["话筒底座", [[366,246],[400,230]], [[401,223]]],
      ["监听设备架", [[1074,405],[1048,409]], [[1041,402]]],
    ]],
    ["hall", [
      ["周岁徽章边柜", [[217,217]], [[224,205]]],
      ["小镇街景展架", [[186,455]], [[186,447]]],
      ["展厅西侧绿植", [[60,465],[89,450]], [[66,493]]],
      ["展厅东南角绿植", [[1083,499]], [[1061,512]]],
    ]],
  ] as const;
  for (const [key, pieces] of rooms) {
    const { art } = townInteriors[townInteriorId(key)];
    const filename = fileURLToPath(new URL(`../src/assets/town-interiors/${key}.webp`, import.meta.url));
    const atlas = await sharp(filename).extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
    for (const [name, solid, clear] of pieces) {
      const [sx, sy, w, h, l, t] = art.props.find(prop => prop.name === name)!.variants.day;
      const alpha = ([x, y]: readonly [number, number]) => {
        const col = x - l * art.scale, row = y - t * art.scale;
        return col < 0 || row < 0 || col >= w || row >= h ? 0 : atlas.data[(sy + row) * atlas.info.width + sx + col];
      };
      for (const point of solid) assert.ok(alpha(point) > 235, name + " solid at " + point);
      for (const point of clear) assert.ok(alpha(point) < 20, name + " clear at " + point);
    }
  }
});

test("all phases follow individual windowpanes and preserve indoor frames, curtains and blossoms", async () => {
  const samples = {
    florist: { glass: [[110,90],[125,184],[285,34],[925,146]], interior: [[169,116],[191,142],[580,61],[282,121],[903,122]] },
    baker: { glass: [[555,134],[615,173]], interior: [[575,131],[600,153],[629,188]] },
    maker: { glass: [[491,162],[546,189]], interior: [[514,180],[441,155],[542,149]] },
    post: { glass: [[753,130],[818,156]], interior: [[775,120],[812,137],[690,163]] },
    books: { glass: [[856,132],[910,171]], interior: [[881,125],[899,154],[957,167]] },
    radio: { glass: [[878,136],[953,175]], interior: [[913,140],[949,154],[845,190]] },
    hall: { glass: [[541,123],[611,155]], interior: [[577,130],[600,139],[666,149]] },
  };
  for (const { key, art } of Object.values(townInteriors)) {
    const path = fileURLToPath(new URL(`../src/assets/town-interiors/${key}.webp`, import.meta.url));
    const levels: number[] = [];
    for (const phase of ["day", "dusk", "night"] as const) {
      const [left, top, width, height, x, y] = art.skies[phase];
      const pixels = await sharp(path).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
      const pixel = ([px, py]: number[], channel: number) => {
        const col = px - x * 2, row = py - y * 2;
        return col < 0 || row < 0 || col >= width || row >= height ? 0 : pixels[4 * (row * width + col) + channel];
      };
      for (const point of samples[key].interior) assert.ok(pixel(point, 3) < 20, key + " interior " + point);
      for (const point of samples[key].glass) assert.ok(pixel(point, 3) > 235, key + " glass " + point);
      levels.push(samples[key].glass.reduce((sum, point) => sum + pixel(point, 1), 0));
    }
    assert.ok(levels[0] > levels[1] && levels[1] > levels[2], key + " daylight through the same glass");
  }
});

test("claiming a remake changes the saved design and older tabs cannot restore the previous one", () => {
  for (const [key, initial, later] of [["florist", "cream", "lilac"], ["post", "lamps", "flags"]] as const) {
    const a = readTownKeepsakes(null);
    assert.ok(collectTownKeepsake(a, key, initial, 100));
    const b = readTownKeepsakes(a);
    assert.equal(collectTownKeepsake(b, key, later, 120), false);
    assert.equal(collectTownKeepsake(b, key, "invalid", 130), false);
    mergeTownKeepsakes(b, a); mergeTownKeepsakes(a, b);
    assert.deepEqual(a, b);
    assert.equal(townKeepsakeChoice(readTownKeepsakes(JSON.parse(JSON.stringify(b))), key), later);
    assert.deepEqual(b.items, [key]);
    const legacy = readTownKeepsakes({ items: [key] });
    assert.equal(collectTownKeepsake(legacy, key, initial, 140), false);
    assert.equal(townKeepsakeChoice(legacy, key), initial);
    const invalid = { [key]: { choice: "bells", at: 10 } };
    assert.deepEqual(readTownKeepsakes({ items: [key], designs: invalid }), { items: [key] });
    assert.equal(townKeepsakeChoice(readTownKeepsakes({ items: [key] }), key), later);
    assert.deepEqual(readTownKeepsakes({ items: [], designs: b.designs }), { items: [] });
  }
});

test("recorded souvenirs survive loading older, malformed, and concurrent saves", () => {
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

test("parallel recordings keep the newest claimed take, including remakes of an undated tape", () => {
  const first = readTownKeepsakes(null), second = readTownKeepsakes(null);
  collectTownKeepsake(first, "radio", "bells", 100);
  collectTownKeepsake(second, "radio", "creek", 120);
  mergeTownKeepsakes(first, second);
  mergeTownKeepsakes(second, first);
  assert.deepEqual(first, second);
  assert.deepEqual(readTownKeepsakes(first), { items: ["radio"], radioTrack: "creek", radioRecordedAt: 120 });
  mergeTownKeepsakes(first, readTownKeepsakes({ items: ["radio"], radioTrack: "creek", radioRecordedAt: -10 }));
  assert.deepEqual(first, { items: ["radio"], radioTrack: "creek", radioRecordedAt: 120 });
  const legacy = readTownKeepsakes({ items: ["radio"], radioTrack: "creek" });
  assert.equal(collectTownKeepsake(legacy, "radio", "bells", 150), false);
  mergeTownKeepsakes(legacy, first);
  assert.deepEqual(legacy, { items: ["radio"], radioTrack: "bells", radioRecordedAt: 150 });
});

test("simultaneous claims converge even if the two tabs receive the writes in opposite orders", () => {
  for (const [key, left, right] of [["florist","cream","lilac"],["post","flags","lamps"],["radio","creek","bells"]] as const) {
    const a = readTownKeepsakes(null), b = readTownKeepsakes(null);
    collectTownKeepsake(a, key, left, 100);
    collectTownKeepsake(b, key, right, 100);
    const previous = readTownKeepsakes(a);
    mergeTownKeepsakes(a, b); mergeTownKeepsakes(b, previous);
    assert.deepEqual(a, b);
    const next = townKeepsakeChoice(a, key) === left ? right : left;
    collectTownKeepsake(a, key, next, 100);
    mergeTownKeepsakes(a, b);
    assert.equal(townKeepsakeChoice(a, key), next);
  }
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
