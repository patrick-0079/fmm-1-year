import type { Scene } from "./maps.ts";
import { arcadesIn, TOWN_NPCS } from "./town-data.ts";
import { townEchoGate } from "./ruins-map.ts";
import { postObstacles } from "./post-streets.ts";
import { fenceSegments } from "./fences.ts";
import { townSurfaces } from "./town-surfaces.ts";
import { townTerraceWalls } from "./town-terraces.ts";
import { townCanopies, festivalProps } from "./town-scenery.ts";
import { townGates, gatePosts, gateSpot } from "./gate-layout.ts";
export const townScene: Scene = {
  title: "晚安周年小镇",
  width: 1536,
  height: 1024,
  bounds: { x: 45, y: 45, w: 1440, h: 950 },
  spawn: { x: 620, y: 596 },
  surfaces: townSurfaces,
  floor: [
    [65, 95],
    [545, 35],
    [1250, 40],
    [1483, 54],
    [1483, 164],
    [1435, 250],
    [1440, 430],
    [1485, 492],
    [1485, 568],
    [1360, 560],
    [1450, 620],
    [1470, 910],
    [1170, 970],
    [1000, 935],
    [800, 1000],
    [420, 1005],
    [365, 910],
    [85, 850],
    [50, 560],
    [70, 340],
  ].map(([x, y]) => ({ x, y })),
  walls: [
    ...townTerraceWalls,
    {label:"旧矿车车轮",x:1306,y:83,w:38,h:12},
    {label:"洞口左木柱",x:1393,y:74,w:13,h:17},
    {label:"洞口右木柱",x:1451,y:74,w:13,h:17},
    {label:"坍塌的枕木",x:1466,y:91,w:26,h:13},
    ...townGates.filter((g) => g.scene === "town").flatMap(gatePosts),
    { label: "月兔台前的红邮筒", x: 535, y: 614, w: 19, h: 12 },
    { label: "月兔台前的花盆", x: 550, y: 604, w: 20, h: 12 },
    { label: "月兔台东侧路灯", x: 578, y: 583, w: 12, h: 13 },
    { label: "花店主屋", points: [[128,100],[416,101],[420,218],[399,239],[314,241],
      [289,238],[277,242],[209,240],[180,233],[128,229]].map(([x,y])=>({x,y})) },
    { label: "烘焙屋", points: [[639,97],[839,87],[865,163],[850,225],[808,238],
      [731,241],[697,234],[653,229],[643,218]].map(([x,y])=>({x,y})) },
    {
      label: "星饰工坊",
      points: [
        [1047, 310],
        [1084, 291],
        [1110, 259],
        [1134, 243],
        [1138, 220],
        [1201, 214],
        [1263, 254],
        [1280, 323],
        [1291, 370],
        [1280, 391],
        [1211, 401],
        [1150, 401],
        [1113, 377],
        [1068, 377],
        [1045, 349],
      ].map(([x, y]) => ({ x, y })),
    },
    ...postObstacles,
    ...[[935,247],[1042,196],[1161,124],[1219,97],[1276,145]].map(([x,y]) => ({
      label:"北街路灯底座", points:[[x-6,y-3],[x-3,y-6],[x+4,y-6],
        [x+7,y-2],[x+6,y+2],[x,y+4],[x-6,y+2]].map(([x,y]) => ({x,y})),
    })),
    { label: "相册书屋", points: [[727,582],[986,584],[991,693],[977,730],
      [929,744],[883,749],[812,741],[791,732],[773,717],[739,709],[725,699]].map(([x,y])=>({x,y})) },
    { label: "晚安电台", points: [[1260,655],[1438,651],[1438,783],[1395,798],
      [1352,811],[1302,811],[1262,803],[1244,795],[1242,753]].map(([x,y])=>({x,y})) },
    { label: "周年纪念馆", x: 905, y: 0, w: 253, h: 112 },
    ...townCanopies.map((t) => ({
      label: "小镇树干",
      x: t.x - 8,
      y: t.y - 10,
      w: 16,
      h: 15,
    })),
    ...festivalProps
      .filter((p) => p.kind === "balloons")
      .map((p) => ({
        label: "周年气球花束底座",
        x: p.x - 7,
        y: p.y - 7,
        w: 14,
        h: 10,
      })),
    {
      label: "书屋池塘",
      points: [
        [602, 824],
        [684, 811],
        [760, 825],
        [817, 850],
        [823, 880],
        [793, 904],
        [737, 927],
        [660, 924],
        [603, 905],
        [570, 877],
        [575, 846],
      ].map(([x, y]) => ({ x, y })),
    },
    ...festivalProps.filter(p=>p.kind==="garland").flatMap(p=>[-42,42].map(dx=>({
      label:"周年彩旗木柱", x:p.x+dx-2, y:p.y-3, w:4, h:4,
    }))),
    ...fenceSegments("邮局院子栅栏", [
      [65, 599],[69, 615],[85, 628],[105, 638],[125, 646],[155, 650],
    ]),
    ...fenceSegments("邮局院子前栏", [[176,645],[209,645],[247,643],[265,642]]),
    ...fenceSegments("邮局右侧栅栏", [
      [334,617],[339,634],[346,646],[356,656],
    ]),
    ...fenceSegments("广场左侧花坛", [
      [639, 405],
      [615, 437],
      [638, 485],
      [695, 518],
    ]),
    ...fenceSegments("广场东侧花坛上段", [[835,422],[849,429],[872,425],[898,424]]),
    ...fenceSegments("广场东侧花坛下段", [[874,492],[849,508],[817,520],[799,528]]),
    ...fenceSegments("南侧池塘栅栏", [
      [566, 889],
      [586, 925],
      [692, 949],
      [800, 946],
    ]),
  ],
  hazards: [],
  spots: [
    townEchoGate,
    ...TOWN_NPCS.map((n) => ({
      id: "npc-" + n.id,
      title: n.name + " · " + n.role,
      x: n.x,
      y: n.y,
      // Stand beside the blue mailbox for the photographer and clear of the cosmos for the host.
      approach: { x: n.x + (n.id === "photo-visitor" ? 17 : 0), y: n.y + (n.id === "hop-keeper" ? 18 : 26) },
      radius: 56,
      markerOffset: 53,
      color: "#ceab63",
    })),
    ...arcadesIn("town").map(([id, g]) => ({
      id: "arcade-" + id,
      title: g.title,
      x: g.x,
      y: g.y,
      approach: { x: g.x, y: g.y + 35 },
      radius: 70,
      markerOffset: 89,
      color: "#8eadda",
    })),
    ...townGates.filter((g) => g.scene === "town").map(gateSpot),
  ],
};
for (const npc of TOWN_NPCS)
  townScene.walls.push({
    label: "镇民 · " + npc.name,
    x: npc.x - 5,
    y: npc.y - 6,
    w: 10,
    h: 9,
  });
for (const [,game] of arcadesIn("town"))
  townScene.walls.push({
    label: game.title + "摊位",
    x: game.x - 24,
    y: game.y - 1,
    w: 48,
    h: 16,
  });
