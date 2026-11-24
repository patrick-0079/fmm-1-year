import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { readJourney } from "../src/journey.ts";

const town = scenes.town;
const point = ([x, y]: number[]) => ({ x, y });

test("the pond deck ends at the water-side rail and joins the stone stairs only through the opening", () => {
  const oldFoot = {x:888.2, y:891.7};
  const plank = {x:888.2, y:909};
  assert.equal(canStand(oldFoot, town.walls, town.bounds, town.floor, town.surfaces), false);
  // Check the beams independently of the floor edge, including a diagonal at
  // the join with the divider. A missing beam must not pass behind a solid bank.
  const solids = {bounds:town.bounds, walls:town.walls};
  for (const [land, deck] of [[oldFoot,plank],[point([821,898]),point([842,907])],
    [point([895,891]),point([898,912])],[point([810,920]),point([826,925])]]) {
    assert.equal(canTravelBetween(land,deck,solids), false);
    assert.equal(canTravelBetween(deck,land,solids), false);
  }
  assert.deepEqual(findPath(town.spawn,plank,town)?.at(-1), plank);
  assert.deepEqual(findPath(plank,town.spawn,town)?.at(-1), town.spawn);
  const save = (p:typeof oldFoot) => ({scene:"town", ...p, savedAt:1});
  assert.deepEqual(readJourney(JSON.stringify(save(oldFoot)),[]), save(town.spawn));
  assert.deepEqual(readJourney(JSON.stringify(save(plank)),[]), save(plank));
});

test("pond deck posts stop feet while both sides of the stair and connecting landing remain reachable", () => {
  for (const [x,y] of [[870,895],[819,906]]) {
    assert.equal(canStand({x,y}, town.walls, town.bounds, town.floor, town.surfaces), false);
  }
  for (const [x,y] of [[827,909],[821,918],[838,912],[867,910],[896,917]]) {
    assert.deepEqual(findPath(town.spawn, {x,y}, town)?.at(-1), {x,y});
    assert.deepEqual(findPath({x,y}, town.spawn, town)?.at(-1), town.spawn);
  }
});

test("the shop terraces, stairs and dock gates can be walked in both directions", () => {
  const walks = {
    花店双入口: [[370,406],[328,400],[294,388],[268,367],[246,346],[233,322],
      [233,303],[233,278],[240,260],[270,251],[305,251],[355,249],[396,248],
      [424,233],[441,231],[455,254],[474,275],[484,296]],
    广场西北入口: [[655,374],[674,394],[686,414],[704,434],[739,435]],
    广场东入口: [[780,455],[822,448],[858,450],[885,449],[903,448],[920,435],[937,427]],
    工坊溪桥: [[1330,540],[1352,554],[1377,553],[1420,545],[1475,534]],
    书屋东花盆前: [[985,751],[969,755],[960,756],[943,759],[930,763],[914,769],
      [893,771],[874,767],[853,771],[851,795],[859,814],[873,831]],
    书屋西侧露台: [[748,738],[776,743],[808,754],[834,760],[852,765],[858,773]],
    麦田外沿: [[285,702],[267,706],[249,712],[234,719],[218,724],[203,726],
      [178,728],[156,728],[130,733],[105,724],[83,711]],
    麦田石阶: [[130,733],[132,749],[136,770],[137,777]],
    双码头开口: [[824,939],[836,918],[848,907],[867,910],[883,916],[890,917],
      [896,917],[915,911],[924,897],[925,875],[925,856],[909,848],[888,851],[871,835]],
    电台露台: [[1260,879],[1285,883],[1318,859],[1319,843],[1313,828],[1280,823],[1261,818]],
    北街弯梯: [[562,82],[562,103],[575,139],[586,173],[584,192],[573,220],[562,242]],
    工坊坡道: [[972,315],[975,339],[982,360],[996,380],[1013,392],[1048,411]],
  };
  for (const [name, steps] of Object.entries(walks)) {
    for (let i = 1; i < steps.length; i++) {
      const a = point(steps[i-1]), b = point(steps[i]);
      assert.ok(canTravelBetween(a,b,town) && canTravelBetween(b,a,town), name+" "+steps[i]);
    }
  }
});

test("both bookshop terraces connect to the town entrance past their planters and rails", () => {
  for (const endpoint of [[748,738],[960,756],[985,751]].map(point)) {
    assert.deepEqual(findPath(town.spawn,endpoint,town)?.at(-1),endpoint);
    assert.deepEqual(findPath(endpoint,town.spawn,town)?.at(-1),town.spawn);
  }
});

test("solid deck rails, bank, lamp feet and furniture cannot be crossed", () => {
  for (const [name, feet] of [
    ["书屋西侧花墙",[600,718]], ["码头北护栏",[881,897.5]], ["北栏外花地",[872,875]], ["码头隔栏上柱",[903,903]],
    ["码头隔栏下柱",[889,926]], ["码头长椅",[850,889]], ["工坊茶桌",[1300,401]],
    ["电台留声机",[1425,818]], ["庆典彩旗灯柱",[1242,882]], ["东桥后栏",[1405,532]],
    ["东桥前栏",[1442,559]], ["广场东口石柱",[903,432]], ["广场路灯",[834,434]], ["烘焙屋花坛",[720,262]],
    ["书屋茶座栏柱",[732,738]], ["书屋门东花盆",[891,759]], ["书屋窗边盆栽",[907,756]],
    ["书屋粉花盆",[953,748]], ["书屋前栏末柱",[883,791]],
  ] as const) {
    const [x,y] = feet;
    assert.equal(canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces),false,name);
  }
});

test("every town interaction can still be reached at its exact approach point", () => {
  for (const spot of town.spots) {
    const path = findPath(town.spawn, spot.approach, town);
    assert.deepEqual(path?.at(-1), spot.approach, spot.id);
  }
});

test("streetlamp feet stop a walker without closing the path around their posts", () => {
  const stand = (x: number, y: number) => canStand({x,y}, town.walls, town.bounds, town.floor, town.surfaces);
  for (const [x,y] of [[1043,197],[1163,125],[1220,94],[1277,151],[1344,62],[1389,268],
    [1328,532],[585,950],[472,710],[392,891],[446,813]]) {
    assert.equal(stand(x,y),false,`lamp foot at ${x},${y}`);
  }
  // Beside the quarry lamp the paving runs behind the diagonal wooden rail.
  assert.equal(stand(1261,151), false, "quarry rail beside lamp");
  for (const [x,y] of [[1059,197],[1179,125],[1204,94],[1261,143],[1312,532],[1344,532],
    [569,950],[601,950],[488,710],[430,813],[462,813]]) {
    assert.equal(stand(x,y),true,`paving beside lamp at ${x},${y}`);
  }
});
