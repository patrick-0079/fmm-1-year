import type { Scene } from "./maps.ts";
import { arcadesIn, TOWN_NPCS } from "./town-data.ts";
import { townEchoGate } from "./ruins-map.ts";
import { fenceSegments } from "./fences.ts";
import { townSurfaces } from "./town-surfaces.ts";
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
    {label:"旧矿车车轮",x:1306,y:83,w:38,h:12},
    {label:"洞口左木柱",x:1393,y:74,w:13,h:17},
    {label:"洞口右木柱",x:1451,y:74,w:13,h:17},
    {label:"坍塌的枕木",x:1466,y:91,w:26,h:13},
    ...townGates.filter((g) => g.scene === "town").flatMap(gatePosts),
    { label: "月兔台前的红邮筒", x: 535, y: 614, w: 19, h: 12 },
    { label: "月兔台前的花盆", x: 550, y: 604, w: 20, h: 12 },
    { label: "月兔台东侧路灯", x: 578, y: 583, w: 12, h: 13 },
    { label: "花店主屋", x: 141, y: 86, w: 284, h: 159 },
    { label: "花店温室", x: 122, y: 137, w: 110, h: 102 },
    { label: "烘焙屋", x: 645, y: 73, w: 220, h: 177 },
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
    { label: "邮局", x: 125, y: 449, w: 230, h: 170 },
    { label: "相册书屋", x: 703, y: 583, w: 294, h: 169 },
    { label: "晚安电台", x: 1245, y: 648, w: 193, h: 170 },
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
    ...fenceSegments("花店院子栅栏", [
      [117, 245],
      [230, 267],
      [341, 272],
      [426, 250],
    ]),
    ...fenceSegments("邮局院子栅栏", [
      [75, 601],
      [190, 645],
      [278, 646],
    ]),
    ...fenceSegments("邮局右侧栅栏", [
      [343, 620],
      [351, 650],
    ]),
    ...fenceSegments("工坊院子栅栏", [
      [1017, 351],
      [1088, 399],
      [1120, 415],
    ]),
    ...fenceSegments("工坊右侧栅栏", [
      [1202, 416],
      [1319, 416],
      [1351, 388],
    ]),
    ...fenceSegments("书屋院子栅栏", [
      [575, 718],
      [595, 755],
      [753, 779],
      [826, 782],
    ]),
    ...fenceSegments("书屋右侧栅栏", [
      [884, 782],
      [1005, 779],
      [1024, 745],
    ]),
    ...fenceSegments("电台院子栅栏", [
      [1161, 797],
      [1169, 835],
      [1276, 868],
    ]),
    ...fenceSegments("电台右侧栅栏", [
      [1361, 875],
      [1433, 837],
    ]),
    ...fenceSegments("广场左侧花坛", [
      [639, 405],
      [615, 437],
      [638, 485],
      [695, 518],
    ]),
    ...fenceSegments("广场右侧花坛", [
      [871, 415],
      [913, 452],
      [888, 492],
      [804, 523],
    ]),
    ...fenceSegments(
      "广场后排长椅",
      [
        [748, 390],
        [812, 402],
      ],
      9,
    ),
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
      // Leave the moon-stage host's conversation spot on his side of the cosmos.
      approach: { x: n.x, y: n.y + (n.id === "hop-keeper" ? 18 : 26) },
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
