import assert from "node:assert/strict";
import test from "node:test";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";

const town = { ...scenes.town, walls: scenes.town.walls.filter(w => !w.yieldsOnArrival) };

test("the town's flowerbeds, stone faces and lamp bases exclude feet", () => {
  const solids = {
    工坊邮筒前花坛及石墙: [[953,518],[960,523],[1003,579],[1007,588],[1019,598]],
    工坊台阶及东桥两侧种植带: [[1094,564],[1219,539],[1260,501],[1281,512],[1318,510]],
    工坊小门花盆和露台石沿: [[1058,355],[1073,358],[1081,384]],
    烘焙屋花坛及墙根的花: [[674,262],[855,270],[838,294],[850,290]],
    路灯与树根: [[929,396],[943,397],[1164,546],[975,747]],
    邮局围篱和书屋椅子: [[94,594],[662,702]],
  };
  for (const [name, positions] of Object.entries(solids)) {
    for (const [x,y] of positions)
      assert.equal(canStand({x,y}, town.walls, town.bounds, town.floor, town.surfaces), false, name+" "+x+","+y);
  }
});

test("paved steps, landings and street edges are connected in both directions", () => {
  const walks = {
    花店正面台阶: [[262,254],[263,240],[263,229]],
    花店东侧上阶: [[443,233],[437,215],[429,198],[425,184]],
    烘焙屋正门: [[715,245],[714,240],[712,233]],
    烘焙屋桌旁东阶: [[919,264],[910,255],[904,248],[902,237],[901,224],[902,214]],
    烘焙屋弧形街沿: [[915,271],[894,284],[874,299],[849,312],[826,318],[807,319]],
    工坊花坛旁正阶: [[1071,637],[1057,615],[1045,595],[1044,579],[1038,566],[1034,554]],
    工坊门前上阶: [[1168,437],[1164,423],[1151,408],[1166,402],[1192,405],[1216,390]],
    工坊西侧木台: [[1161,422],[1151,408],[1144,399],[1136,393],[1118,385],[1103,381],
      [1090,376],[1078,373],[1070,370],[1062,367],[1055,364],[1050,362]],
    东桥西侧落脚处: [[1328,549],[1310,550],[1292,553],[1275,562]],
    书屋东侧树与石栏之间: [[940,757],[961,757],[978,755],[985,751],[990,744],[998,735],[998,722]],
    电台上方台阶东侧: [[1100,694],[1111,714],[1125,735],[1134,755],[1142,765]],
  };
  for (const [name, positions] of Object.entries(walks)) {
    const points = positions.map(([x,y]) => ({x,y}));
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i];
      assert.ok(canTravelBetween(a,b,town) && canTravelBetween(b,a,town), name+" "+positions[i]);
    }
    const end = points.at(-1)!;
    assert.deepEqual(findPath(town.spawn,end,town)?.at(-1), end, name);
    assert.deepEqual(findPath(end,town.spawn,town)?.at(-1), town.spawn, name);
  }
});
