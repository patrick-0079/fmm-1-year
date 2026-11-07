import type { Geometry, Hazard, Point } from "./core.ts";
import { gardenTrees, creeks } from "./landscape.ts";
import { townScene } from "./town-map.ts";
import { fenceSegments } from "./fences.ts";
import { gardenGuests } from "./garden-guests.ts";
import { townGates, gatePosts, gateSpot } from "./gate-layout.ts";
import { rainbowFlowers, rainbowSpot, meadowGate, meadowGatePosts } from "./rainbow-flowers.ts";
import { meadowScene } from "./meadow-map.ts";
import { ruinsScene } from "./ruins-map.ts";
import { bassStand, foxNook } from "./room-props.ts";
import { elderPlaces } from "./elders-data.ts";
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
      polygon("电视柜", [[52,78],[151,78],[158,84],[157,111],[151,114],[53,114],[46,107],[46,85]]),
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
      polygon("墙边花盆", [[18,266],[39,266],[44,278],[38,285],[19,286]]),
      polygon("草编圆篮", [[18,292],[32,281],[53,278],[70,285],[80,297],[78,310],[66,320],[45,324],[23,318],[17,309]]),
      // The balloons float above the boards. Their tied ends rest against the skirting.
      polygon("气球系绳处", [[23,371],[54,367],[90,370],[99,378],[21,380]]),
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
      foxNook,
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
      [153, 95], [225, 92], [285, 93], [345, 80],
      [550, 80],
      // The northeast lane follows the bank, then turns east onto the wooden deck.
      [709, 89], [730, 102], [741, 95], [751, 78], [769, 58], [795, 43],
      [858, 42], [858, 65], [802, 71], [790, 96], [775, 123],
      [784,145],[798,160],[823,181],[823,199],[818,227],[818,260],
      [821,284],[823,320],[828,351],[837,378],[837,392],[816,395],
      [800,408],[791,429],[790,459],[799,475],[786,495],[765,510],[750,521],[714,534],
      // Keep the two fence ends on grass and open only the gate-sized gap.
      [603, 541], [591, 550], [586, 582], [551, 582], [555, 550], [546, 543],
      [520, 550],
      [484, 560],
      [478, 582],
      [422, 582],
      [416, 554],
      [370,542],[291,542],[222,538],[160,534],[97,522],[82,504],
      [78,472],[74,448],[58,419],[45,405],[48,381],[49,356],[58,323],
      [60,294],[65,269],[65,253],[53,251],[48,232],[54,214],[54,191],
      [54,163],[85,173],[113,175],[150,164],[192,146],[216,137],
      [216,101],[178,98],
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
        [649,253],[657,251],[774,256],[787,265],[786,275],
        [779,285],[768,284],[762,279],[657,273],[649,271],[645,266],
      ]),
      polygon("放映区后排坐垫", [[661,279],[750,286],[753,290],[750,300],[654,291],[653,287]]),
      polygon("放映区前排坐垫", [[654,297],[738,306],[741,307],[737,319],[647,312],[647,308]]),
      polygon("放映区左花灯", [[625,301],[640,301],[644,309],[640,316],[626,315],[624,311]]),
      polygon("放映区右花灯", [[747,316],[761,317],[766,321],[761,331],[747,330],[745,326]]),
      polygon("左上花园桌椅", [[226,99],[239,94],[268,94],[281,102],[280,126],[270,130],[259,123],[239,124],[226,130],[221,123]]),
      { label: "右上长椅", x: 570, y: 103, w: 46, h: 22 },
      { label: "右上双人椅", x: 637, y: 103, w: 42, h: 22 },
      { label: "左侧长椅", x: 85, y: 251, w: 47, h: 24 },
      polygon("小电视路牌底座", [[185,459],[211,459],[216,473],[212,482],[185,482],[180,474]]),
      polygon("打卡站花盆", [[124,463],[143,463],[145,469],[141,478],[127,478],[122,471]]),
      polygon("打卡站行李", [[155,472],[171,468],[180,476],[178,486],[157,486]]),
      { label: "打卡站长椅", x: 229, y: 469, w: 45, h: 20 },
      { label: "打卡站花篮", x: 275, y: 486, w: 32, h: 27 },
      polygon("烟花礼盒", [[604,439],[615,435],[631,438],[634,444],[618,453],[606,449]]),
      polygon("烟花筒", [
        [658,449],[682,445],[702,451],[718,463],[714,471],
        [698,481],[677,474],[650,480],[647,472],
      ]),
      polygon("烟花星星", [
        [709,431],[726,432],[729,437],[719,440],[708,437],
      ]),
      polygon("野餐花箱", [[744,461],[757,457],[767,463],[766,474],[751,479],[743,475]]),
      polygon("野餐礼盒", [[727,474],[737,470],[749,475],[748,485],[736,492],[726,487]]),
      polygon("广场西北花坛", [[382,285],[391,286],[390,295],[377,300],[373,309],[356,316],[348,316],[348,308],[356,297],[374,291]]),
      ...fenceSegments(
        "庭院左下矮栅栏",
        [
          [330, 373],
          [333, 389],
          [352, 402],
          [366, 410],
          [384, 420],
        ],
        6,
      ),
      polygon("广场东北花坛", [[494,286],[502,285],[504,291],[521,297],[533,304],[537,314],[524,319],[511,312],[508,302],[494,297]]),
      ...fenceSegments(
        "庭院右下矮栅栏",
        [
          [551, 373],
          [549, 389],
          [530, 400],
          [516, 410],
          [498, 420],
        ],
        6,
      ),
      polygon("西廊石座", [[42,360],[67,353],[77,356],[77,365],[53,374],[43,371]]),
      polygon("西廊灯座", [[82,357],[91,355],[100,359],[100,367],[91,371],[81,366]]),
      polygon("西花拱左脚", [[95,441],[106,437],[110,438],[109,448],[97,449]]),
      polygon("西花拱右脚", [[149,430],[155,428],[159,430],[159,436],[149,439]]),
      polygon("门径左花盆", [[382,227],[400,227],[403,235],[398,244],[383,244],[380,236]]),
      polygon("门径右花盆", [[483,227],[501,227],[503,236],[497,244],[485,244],[481,235]]),
      polygon("勇气花门西脚", [[391,549],[399,548],[403,553],[403,566],[391,567],[388,560]]),
      polygon("勇气花门东脚", [[478,550],[486,550],[491,558],[488,566],[476,567],[475,560]]),
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
    bounds: { x: 56, y: 51, w: 789, h: 525 },
    // Inside the banks and the woodland, with independent openings at both arches.
    floor: [
      [96,135],[109,114],[128,96],[157,87],[164,72],[193,68],[224,72],
      [248,78],[282,77],[319,87],[351,97],[392,104],[415,99],[420,75],
      [469,75],[475,94],[491,99],[524,94],[557,89],[588,85],[620,80],
      [648,72],[675,65],[705,65],[730,81],[749,98],[775,106],[784,124],
      [786,151],[802,171],[822,181],[833,202],[821,226],[810,242],[803,259],
      [809,287],[825,306],[831,325],[824,347],[817,370],[810,399],[815,415],
      [799,439],[778,456],[752,467],[729,466],[713,482],[682,498],[652,500],
      [632,511],[608,501],[588,498],[557,506],[531,508],[507,519],[497,549],
      [496,574],[398,574],[402,547],[403,523],[390,512],[366,514],[341,507],
      [321,498],[307,505],[282,508],[263,497],[239,497],[221,488],[200,486],
      [185,475],[168,461],[148,455],[122,446],[111,431],[95,426],[84,407],
      [77,391],[80,367],[69,349],[74,327],[81,305],[71,293],[69,274],
      [83,256],[88,239],[83,218],[77,203],[83,180],[76,164],[84,147],
    ].map(([x,y]) => ({x,y})),
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
for (const scene of ["challenge", "ruins"] as const) {
  const elder = elderPlaces[scene];
  scenes[scene].spots.push(elder);
  scenes[scene].walls.push({ label: elder.title, x: elder.x - 5, y: elder.y - 6, w: 10, h: 9 });
}
for (const flower of rainbowFlowers) scenes[flower.scene].spots.push(rainbowSpot(flower));
for (const guest of gardenGuests) {
  scenes.garden.spots.push({
    id: "garden-guest-" + guest.id,
    title: `${guest.name} · ${guest.role}`,
    x: guest.x,
    y: guest.y,
    approach: guest.approach,
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
  const tree = id === "garden" ? { x: 315, y: 235 } : { x: 705, y: 392 };
  for (const trunk of [...gardenTrees[id], { ...tree, scale: 1, tone: 0 }]) {
    const roots = [[-4,13],[4,13],[5,18],[10,24],[7,26],[1,24],[-4,25],[-10,23],[-5,19]];
    outdoor.walls.push(polygon("花园树根", roots.map(([dx,dy]) =>
      [trunk.x + dx*trunk.scale, trunk.y + dy*trunk.scale])));
  }
  outdoor.walls.push(
    { label: "小溪上游", points: creeks[id].upper },
    { label: "小溪下游", points: creeks[id].lower },
  );
  const { x, y, w, h } = creeks[id].bridge;
  for (const railY of [y, y+h-3]) {
    outdoor.walls.push({label: "木桥护栏", x: x+3, y: railY, w: w-6, h: 3});
  }
  const flowers = id === "garden" ? { x: 548, y: 410 } : { x: 170, y: 267 };
  const drop = id === "garden" ? { x: 590, y: 365 } : { x: 295, y: 225 };
  const bench = id === "garden" ? { x: 385, y: 420 } : { x: 560, y: 430 };
  outdoor.walls.push(polygon("休息长椅", [
    [-27,0],[26,0],[30,6],[28,16],[22,18],[20,13],[-19,13],[-21,18],[-27,16],[-30,7],
  ].map(([dx,dy]) => [bench.x+dx,bench.y+dy])));
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
      approach: { x: id === "garden" ? 385 : 375, y: 308 },
      radius: 48,
      color: "#e8dd8f",
    },
  );
}

export const bloomingGarden: Scene = {
  ...scenes.garden, walls: [...scenes.garden.walls,...meadowGatePosts],
};
