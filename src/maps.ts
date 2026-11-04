import type { Geometry, Hazard, Point } from "./core.ts";
import { gardenTrees, creeks } from "./landscape.ts";
import { townScene } from "./town-map.ts";
import { fenceSegments } from "./fences.ts";
import { gardenGuests } from "./garden-guests.ts";
import { townGates, gatePosts, gateSpot } from "./gate-layout.ts";
import { rainbowFlowers, rainbowSpot, meadowGate, meadowGatePosts } from "./rainbow-flowers.ts";
import { meadowScene } from "./meadow-map.ts";
import { ruinsScene } from "./ruins-map.ts";
import { bassStand } from "./room-props.ts";
export type SceneId = "room" | "garden" | "challenge" | "town" | "meadow" | "ruins";
export interface Hotspot {
  id: string;
  title: string;
  x: number;
  y: number;
  approach: Point;
  color?: string;
  radius?: number;
  portal?: SceneId;
  portalExit?: string;
  markerOffset?: number;
  /** The illustrated object is itself the click target. */
  selfMarked?: boolean;
  /** Parts of a wide or offset illustrated entrance that can be clicked directly. */
  hitAreas?: {x:number;y:number;w:number;h:number}[];
}
export interface Scene extends Geometry {
  title: string;
  width: number;
  height: number;
  spawn: Point;
  spots: Hotspot[];
  hazards: Hazard[];
}
const polygon = (label: string, coordinates: number[][]) => ({
  label,
  points: coordinates.map(([x, y]) => ({ x, y })),
});

// Logical pixels. Follow visible object bases, not their overhead decorations.
export const scenes: Record<SceneId, Scene> = {
  town: townScene,
  ruins: ruinsScene,
  meadow: meadowScene,
  room: {
    title: "晚安小屋",
    width: 600,
    height: 400,
    bounds: { x: 15, y: 89, w: 570, h: 292 },
    spawn: { x: 300, y: 310 },
    walls: [
      bassStand.footprint,
      { label: "电视柜", x: 46, y: 77, w: 112, h: 36 },
      polygon("花瓶", [
        [168, 80],
        [180, 80],
        [184, 94],
        [178, 104],
        [166, 100],
        [163, 89],
      ]),
      polygon("圆坐垫", [
        [192, 86],
        [211, 83],
        [223, 91],
        [221, 101],
        [205, 107],
        [191, 101],
      ]),
      polygon("书桌", [
        [18, 157],
        [72, 157],
        [83, 174],
        [82, 248],
        [65, 259],
        [18, 253],
      ]),
      polygon("椅子", [
        [84, 167],
        [104, 163],
        [107, 219],
        [98, 228],
        [80, 226],
        [79, 201],
      ]),
      polygon("床", [
        [428, 89],
        [541, 89],
        [545, 178],
        [537, 190],
        [434, 188],
        [427, 178],
      ]),
      { label: "床头柜", x: 547, y: 82, w: 35, h: 39 },
      polygon("床边花瓶", [
        [568, 193],
        [579, 192],
        [584, 207],
        [579, 218],
        [565, 216],
        [563, 203],
      ]),
      polygon("圆蛋糕桌", [
        [279, 197],
        [318, 197],
        [335, 209],
        [337, 234],
        [324, 247],
        [280, 249],
        [263, 237],
        [262, 216],
      ]),
      polygon("气球与花篮", [
        [18, 282],
        [55, 280],
        [76, 293],
        [79, 322],
        [102, 349],
        [105, 380],
        [16, 380],
      ]),
      polygon("礼物堆", [
        [519, 278],
        [551, 266],
        [577, 281],
        [584, 318],
        [583, 379],
        [537, 379],
        [506, 362],
        [486, 338],
        [497, 309],
      ]),
    ],
    hazards: [],
    spots: [
      bassStand.spot,
      {
        id: "bed",
        title: "在床上躺一会",
        x: 486,
        y: 140,
        approach: { x: 486, y: 205 },
        radius: 85,
        color: "#a294cc",
      },
      {
        id: "cake",
        title: "周年蛋糕",
        x: 300,
        y: 190,
        approach: { x: 300, y: 267 },
        radius: 92,
      },
      {
        id: "gifts",
        title: "拆开礼物",
        x: 537,
        y: 302,
        approach: { x: 476, y: 308 },
        radius: 92,
      },
      {
        id: "letters",
        title: "晚安信箱",
        x: 53,
        y: 164,
        approach: { x: 121, y: 179 },
        radius: 88,
        color: "#e7c482",
      },
      {
        id: "album",
        title: "回忆相册",
        x: 45,
        y: 211,
        approach: { x: 121, y: 240 },
        radius: 88,
        color: "#e7c482",
      },
      {
        id: "radio",
        title: "枕边电台",
        x: 558,
        y: 84,
        approach: { x: 567, y: 145 },
        radius: 80,
        color: "#e7c482",
      },
      {
        id: "tv",
        title: "小小放映室",
        x: 85,
        y: 65,
        approach: { x: 130, y: 130 },
        radius: 90,
        color: "#e7c482",
      },
      {
        id: "door",
        portal: "garden",
        portalExit: "door",
        title: "去周年花园",
        x: 300,
        y: 373,
        approach: { x: 300, y: 357 },
        color: "#67c2d8",
      },
    ],
  },
  garden: {
    title: "周年花园",
    width: 900,
    height: 600,
    bounds: { x: 30, y: 35, w: 840, h: 550 },
    spawn: { x: 450, y: 175 },
    floor: [
      [150, 95],
      [345, 80],
      [550, 80],
      // The northeast lane follows the bank, then turns east onto the wooden deck.
      [709, 89], [730, 102], [741, 95], [751, 78], [769, 58], [795, 43],
      [858, 42], [858, 65], [802, 71], [790, 96], [775, 123],
      [790, 155],
      [825, 180],
      [805, 240],
      [800, 325],
      [790, 420],
      [775, 500],
      [720, 534],
      // Keep the two fence ends on grass and open only the gate-sized gap.
      [603, 541], [591, 550], [586, 582], [551, 582], [555, 550], [546, 543],
      [520, 550],
      [484, 560],
      [478, 582],
      [422, 582],
      [416, 554],
      [190, 537],
      [90, 500],
      [75, 440],
      [85, 360],
      [70, 310],
      [65, 245],
      [100, 200],
      [140, 155],
    ].map(([x, y]) => ({ x, y })),
    walls: [
      { label: "房屋左翼", x: 349, y: 25, w: 65, h: 121 },
      { label: "房屋右翼", x: 478, y: 25, w: 60, h: 123 },
      { label: "房屋门槛", x: 414, y: 25, w: 64, h: 86 },
      { label: "门前左花坛", x: 352, y: 141, w: 59, h: 17 },
      { label: "门前右花坛", x: 480, y: 141, w: 59, h: 18 },
      polygon("气球摊", [
        [158, 230],
        [231, 226],
        [254, 246],
        [257, 278],
        [219, 287],
        [150, 281],
        [138, 259],
      ]),
      polygon("放映屏", [
        [643, 216],
        [778, 216],
        [784, 260],
        [775, 278],
        [646, 278],
        [638, 263],
      ]),
      polygon("放映坐垫", [
        [623, 282],
        [762, 284],
        [785, 316],
        [779, 329],
        [663, 328],
        [616, 302],
      ]),
      { label: "左上花园桌椅", x: 224, y: 96, w: 58, h: 31 },
      { label: "右上长椅", x: 570, y: 103, w: 46, h: 22 },
      { label: "右上双人椅", x: 637, y: 103, w: 42, h: 22 },
      { label: "左侧长椅", x: 85, y: 251, w: 47, h: 24 },
      { label: "小电视路牌", x: 180, y: 439, w: 38, h: 43 },
      { label: "打卡站长椅", x: 229, y: 469, w: 45, h: 20 },
      { label: "打卡站花篮", x: 275, y: 486, w: 32, h: 27 },
      polygon("烟花礼盒", [
        [614, 437],
        [640, 420],
        [662, 435],
        [659, 454],
        [626, 457],
      ]),
      polygon("烟花筒", [
        [654, 438],
        [699, 437],
        [716, 461],
        [713, 480],
        [651, 479],
      ]),
      polygon("烟花星星", [
        [697, 417],
        [751, 422],
        [770, 447],
        [755, 457],
        [700, 448],
      ]),
      { label: "野餐灯", x: 738, y: 469, w: 24, h: 30 },
      ...fenceSegments(
        "庭院左侧矮栅栏",
        [
          [352, 302],
          [334, 323],
          [326, 346],
        ],
        6,
      ),
      ...fenceSegments(
        "庭院左下矮栅栏",
        [
          [326, 355],
          [337, 381],
          [357, 397],
        ],
        6,
      ),
      ...fenceSegments(
        "庭院右侧矮栅栏",
        [
          [546, 302],
          [564, 323],
          [571, 346],
        ],
        6,
      ),
      ...fenceSegments(
        "庭院右下矮栅栏",
        [
          [571, 355],
          [560, 382],
          [539, 398],
        ],
        6,
      ),
      { label: "庭院左侧栅栏立柱", x: 326, y: 347, w: 12, h: 24 },
      { label: "庭院右侧栅栏立柱", x: 552, y: 347, w: 12, h: 24 },
    ],
    hazards: [],
    spots: [
      {
        id: "door",
        portal: "room",
        portalExit: "door",
        title: "回晚安小屋",
        x: 446,
        y: 116,
        approach: { x: 446, y: 145 },
        color: "#67c2d8",
      },
      ...townGates.filter((g) => g.scene === "garden").map(gateSpot),
      {
        id: "balloons",
        title: "放飞心愿气球",
        x: 203,
        y: 242,
        approach: { x: 275, y: 287 },
        radius: 100,
      },
      {
        id: "danmaku",
        title: "花园小电视 · 周年放映",
        x: 713,
        y: 235,
        approach: { x: 710, y: 347 },
        radius: 130,
        color: "#66bfd8",
      },
      {
        id: "fireworks",
        title: "一周年烟花",
        x: 688,
        y: 449,
        approach: { x: 620, y: 488 },
        radius: 100,
      },
      {
        id: "bili",
        title: "小电视打卡站",
        x: 199,
        y: 449,
        approach: { x: 242, y: 435 },
        radius: 85,
        color: "#66bfd8",
      },
      {
        id: "garden-gate",
        title: "去勇气花园",
        portal: "challenge",
        portalExit: "return-gate",
        x: 450,
        y: 563,
        approach: { x: 450, y: 550 },
        color: "#89b77c",
      },
    ],
  },
  challenge: {
    title: "勇气花园",
    width: 900,
    height: 600,
    bounds: { x: 105, y: 100, w: 690, h: 425 },
    spawn: { x: 450, y: 510 },
    walls: [],
    hazards: [
      {
        id: "ribbon",
        title: "绊脚缎带",
        kind: "ribbon",
        x: 335,
        y: 438,
        radius: 17,
      },
      {
        id: "stone",
        title: "小小绊脚石",
        kind: "stone",
        x: 325,
        y: 356,
        radius: 18,
      },
      {
        id: "mist",
        title: "迷路的小雾",
        kind: "mist",
        x: 605,
        y: 254,
        radius: 23,
      },
      {
        id: "wind",
        title: "回旋小风",
        kind: "wind",
        x: 466,
        y: 195,
        radius: 20,
      },
    ],
    spots: [
      {
        id: "return-gate",
        title: "回周年花园",
        portal: "garden",
        portalExit: "garden-gate",
        x: 450,
        y: 530,
        approach: { x: 450, y: 510 },
        color: "#67c2d8",
      },
      {
        id: "courage",
        title: "摘一朵勇气之花",
        x: 450,
        y: 100,
        approach: { x: 450, y: 125 },
        radius: 52,
        markerOffset: 29,
        color: "#e4b458",
      },
    ],
  },
};

scenes.garden.walls.push(...townGates.filter((g) => g.scene === "garden").flatMap(gatePosts));
scenes.garden.spots.push(meadowGate);
for (const flower of rainbowFlowers) scenes[flower.scene].spots.push(rainbowSpot(flower));
for (const guest of gardenGuests) {
  scenes.garden.spots.push({
    id: "garden-guest-" + guest.id,
    title: `${guest.name} · ${guest.role}`,
    x: guest.x,
    y: guest.y,
    approach: { x: guest.x, y: guest.y + 26 },
    radius: 50,
    markerOffset: 54,
    color: "#cfa970",
  });
  scenes.garden.walls.push({
    label: "庭院来宾 · " + guest.name,
    x: guest.x - 5,
    y: guest.y - 6,
    w: 10,
    h: 9,
  });
}
// Flat collectible patches do not block feet; only the new apple-tree trunks do.
for (const id of ["garden", "challenge"] as const) {
  const outdoor = scenes[id];
  for (const tree of gardenTrees[id])
    outdoor.walls.push({
      label: "花园树干",
      x: tree.x - 7 * tree.scale,
      y: tree.y + 13 * tree.scale,
      w: 14 * tree.scale,
      h: 13 * tree.scale,
    });
  outdoor.walls.push(
    { label: "小溪上游", points: creeks[id].upper },
    { label: "小溪下游", points: creeks[id].lower },
  );
  const tree = id === "garden" ? { x: 315, y: 235 } : { x: 705, y: 392 };
  const flowers = id === "garden" ? { x: 548, y: 410 } : { x: 170, y: 267 };
  const drop = id === "garden" ? { x: 590, y: 365 } : { x: 295, y: 225 };
  const bench = id === "garden" ? { x: 385, y: 420 } : { x: 560, y: 430 };
  outdoor.walls.push({
    label: "苹果树树干",
    x: tree.x - 8,
    y: tree.y + 13,
    w: 16,
    h: 13,
  });
  outdoor.walls.push({
    label: "休息长椅",
    x: bench.x - 27,
    y: bench.y + 1,
    w: 54,
    h: 15,
  });
  outdoor.spots.push(
    {
      id: "apple",
      title: "摘一颗苹果",
      x: tree.x,
      y: tree.y,
      approach: { x: tree.x + 30, y: tree.y + 31 },
      radius: 65,
      markerOffset: 61,
      color: "#e99585",
    },
    {
      id: "flowers",
      title: "采一朵小花",
      x: flowers.x,
      y: flowers.y,
      approach: { x: flowers.x, y: flowers.y + 14 },
      radius: 50,
      markerOffset: 31,
      color: "#eaa7bc",
    },
    {
      id: "wreath",
      title: "捡起花环",
      x: flowers.x - 20,
      y: flowers.y + 32,
      approach: { x: flowers.x - 20, y: flowers.y + 53 },
      radius: 46,
      color: "#cbb5df",
    },
    {
      id: "drop",
      title: "捡起闪亮掉落物",
      x: drop.x,
      y: drop.y,
      approach: { x: drop.x, y: drop.y + 15 },
      radius: 38,
      color: "#e4c776",
    },
    {
      id: "rest",
      title: "在花园里歇一会",
      x: id === "garden" ? 385 : 560,
      y: id === "garden" ? 420 : 430,
      approach: id === "garden" ? { x: 385, y: 447 } : { x: 560, y: 457 },
      radius: 50,
      color: "#97c9ce",
    },
    {
      id: "dew",
      title: "清晨彩蛋 · 晨露花",
      x: 510,
      y: 180,
      approach: { x: 510, y: 205 },
      radius: 45,
      markerOffset: 42,
      color: "#b5e2e6",
    },
    {
      id: "sunset",
      title: "黄昏彩蛋 · 金色小纸船",
      x: 755,
      y: 383,
      approach: { x: 735, y: 395 },
      radius: 48,
      color: "#edc375",
    },
    {
      id: "firefly",
      title: "星夜彩蛋 · 萤火心愿",
      x: 375,
      y: 285,
      approach: { x: 375, y: 308 },
      radius: 48,
      color: "#e8dd8f",
    },
  );
}

export const bloomingGarden: Scene = {
  ...scenes.garden, walls: [...scenes.garden.walls,...meadowGatePosts],
};
