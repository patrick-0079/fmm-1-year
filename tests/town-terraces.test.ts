import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";

const town = scenes.town;
const point = ([x, y]: number[]) => ({ x, y });

test("the shop terraces, stairs and dock gates can be walked in both directions", () => {
  const walks = {
    花店双入口: [[370,406],[328,400],[294,388],[268,367],[246,346],[233,322],
      [233,303],[233,278],[240,260],[270,251],[305,251],[355,249],[396,248],
      [424,233],[441,231],[455,254],[474,275],[484,296]],
    广场西北入口: [[655,374],[674,394],[686,414],[704,434],[739,435]],
    广场东入口: [[780,455],[822,448],[858,450],[885,449],[903,432],[920,435],[937,427]],
    工坊溪桥: [[1330,540],[1352,554],[1377,553],[1420,545],[1475,534]],
    书屋正门: [[957,751],[946,755],[931,756],[883,763],[853,771],[851,795],[859,814],[873,831]],
    麦田外沿: [[285,702],[267,706],[249,712],[234,719],[218,724],[203,726],
      [178,728],[153,732],[130,733],[105,724],[83,711]],
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

test("solid deck rails, bank, lamp feet and furniture cannot be crossed", () => {
  for (const [name, feet] of [
    ["书屋西侧花墙",[600,718]], ["码头北护栏",[872,875]], ["码头隔栏上柱",[903,903]],
    ["码头隔栏下柱",[889,926]], ["码头长椅",[850,889]], ["工坊茶桌",[1300,401]],
    ["电台留声机",[1425,818]], ["庆典彩旗灯柱",[1242,882]], ["东桥后栏",[1405,532]],
    ["东桥前栏",[1442,559]], ["广场路灯",[834,434]], ["烘焙屋花坛",[720,262]],
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
