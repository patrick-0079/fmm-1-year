import type { Geometry, Hazard, Point } from "./core.ts";
import { challengeTrees } from "./landscape.ts";
import { creeks } from "./creek-layout.ts";
import { courageFlowerRoots } from "./courage-flowerbeds.ts";
import { townScene } from "./town-map.ts";
import { fenceSegments } from "./fences.ts";
import { gardenPlantingBeds } from "./garden-planting-beds.ts";
import { gardenGuests } from "./garden-guests.ts";
import { townGates, gatePosts, gateSpot } from "./gate-layout.ts";
import { rainbowFlowers, rainbowSpot, meadowGate } from "./rainbow-flowers.ts";
import { meadowScene } from "./meadow-map.ts";
import { ruinsScene } from "./ruins-map.ts";
import { roomGiftBases } from "./room-furniture.ts";
import { bassStand, foxNook } from "./room-props.ts";
import { elderPlaces } from "./elders-data.ts";
import { xiaoyeSpot, xiaoyeFootprint } from "./xiaoye-data.ts";
import { suyanSpot, suyanFootprint } from "./suyan-data.ts";
import { anniversaryVisitors } from "./anniversary-visitor-spots.ts";
import type { InteractionCue } from "./interaction-cues.ts";
import { townInteriorScenes } from "./town-interiors.ts";
import type { TownInteriorId } from "./town-interior-id.ts";
export type BaseSceneId = "room" | "garden" | "challenge" | "town" | "meadow" | "ruins";
export type SceneId = BaseSceneId | TownInteriorId;
export interface Hotspot {
  id: string;
  title: string;
  x: number;
  y: number;
  approach: Point;
  /** Presentation only; never used for reach, pathfinding, or click geometry. */
  cue?: InteractionCue;
  color?: string;
  radius?: number;
  portal?: SceneId;
  portalExit?: string;
  crossing?: { sign: -1 | 1; halfWidth: number };
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
  ...townInteriorScenes,
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
        [18,160],[80,159],[82,168],[79,183],[69,211],[64,226],
        [63,247],[65,251],[62,254],[58,253],[56,246],[26,246],
        [26,252],[20,254],[18,249],
      ]),
      polygon("椅子", [
        [74,192],[95,190],[97,176],[102,162],[107,162],[105,201],
        [107,217],[103,221],[100,220],[100,231],[95,232],[92,220],
        [77,220],[76,232],[70,232],[71,219],[68,215],
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
      ...roomGiftBases,
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
        hitAreas: [{ x: 428, y: 88, w: 115, h: 101 }],
        approach: { x: 486, y: 205 },
        radius: 85,
        color: "#a294cc",
      },
      {
        id: "cake",
        title: "周年蛋糕",
        x: 300,
        y: 190,
        hitAreas: [{ x: 269, y: 166, w: 63, h: 49 }, { x: 262, y: 215, w: 75, h: 32 }],
        approach: { x: 300, y: 267 },
        radius: 92,
      },
      {
        id: "gifts",
        title: "拆开礼物",
        x: 537,
        y: 302,
        hitAreas: [{ x: 504, y: 269, w: 65, h: 48 }, { x: 488, y: 310, w: 94, h: 33 }, { x: 511, y: 340, w: 71, h: 22 }, { x: 533, y: 361, w: 49, h: 15 }],
        approach: { x: 476, y: 308 },
        radius: 92,
      },
      {
        id: "letters",
        title: "晚安信箱",
        x: 53,
        y: 164,
        hitAreas: [{ x: 37, y: 147, w: 37, h: 46 }, { x: 54, y: 191, w: 18, h: 11 }],
        approach: { x: 121, y: 179 },
        radius: 88,
        color: "#e7c482",
      },
      {
        id: "album",
        title: "回忆相册",
        x: 45,
        y: 211,
        hitAreas: [{ x: 19, y: 193, w: 35, h: 27 }, { x: 30, y: 204, w: 30, h: 14 }],
        approach: { x: 121, y: 240 },
        radius: 88,
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
      [821,284],[823,320],[828,351],[829,357],
      // Follow the grass side of the waterfall's upper rocks, cliff and lower pool.
      [820,360],[815,364],[813,373],[806,374],[801,373],[797,377],[789,380],
      [785,383],[782,386],[777,388],[772,387],[768,389],[765,393],[763,401],
      [762,405],[765,408],[770,410],[771,414],[777,416],[781,416],[781,421],
      [785,428],[786,431],[783,435],[782,441],[784,445],[789,448],
      [793,453],[795,458],[799,462],[800,468],[796,476],[792,482],
      [784,484],[780,486],[778,490],[778,494],[773,493],[769,492],[765,492],
      [761,495],[759,497],[754,496],[750,497],[746,500],[744,505],[745,510],
      [751,514],[754,518],[750,521],[714,534],
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
      polygon("长椅花拱西脚", [[620,101],[625,101],[628,105],[627,108],[620,109],[618,107]]),
      { label: "左侧长椅", x: 85, y: 251, w: 47, h: 24 },
      { label: "气球摊西侧灯串柱", x: 135, y: 238, w: 6, h: 9 },
      polygon("小电视路牌底座", [[185,459],[211,459],[216,473],[212,482],[185,482],[180,474]]),
      ...gardenPlantingBeds,
      polygon("打卡站花盆", [[124,463],[143,463],[145,469],[141,478],[127,478],[122,471]]),
      polygon("打卡站行李", [[155,472],[171,468],[180,476],[178,486],[157,486]]),
      { label: "打卡站长椅", x: 229, y: 469, w: 45, h: 20 },
      polygon("打卡站花篮", [[266,491],[277,487],[287,489],[295,493],[294,501],[284,507],[266,501]]),
      polygon("打卡站西灯脚", [[150,471],[158,471],[160,476],[156,480],[150,478]]),
      polygon("打卡站东灯脚", [[296,497],[302,496],[304,500],[301,503],[295,502]]),
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
      polygon("野餐区西灯座", [[594,479],[606,479],[609,482],[606,486],[598,486],[594,484]]),
      polygon("野餐区东灯座", [[784,464],[794,464],[799,468],[796,471],[786,472],[782,469]]),
      polygon("广场西北花坛", [[382,285],[391,286],[390,295],[377,300],[373,309],[356,316],[348,316],[348,308],[356,297],[374,291]]),
      polygon("庭院左下栏柱石脚", [[329,388],[335,388],[341,391],[343,394],[339,396],[332,393],[329,391]]),
      polygon("庭院左下栏柱花根", [[314,386],[320,383],[326,381],[331,384],[331,390],[326,393],[317,391]]),
      ...fenceSegments(
        "庭院左下矮栅栏",
        [[334,391],[342,396],[349,401],[362,407],[373,411],[377,411],[384,419]],
        3.5,
      ),
      polygon("广场东北花坛", [[494,286],[502,285],[504,291],[521,297],[533,304],[537,314],[524,319],[511,312],[508,302],[494,297]]),
      polygon("庭院右下栏柱石脚", [[540,391],[546,388],[553,388],[553,391],[550,393],[543,396],[539,394]]),
      polygon("庭院右下栏柱花根", [[552,384],[557,381],[563,383],[568,387],[566,391],[556,393],[552,390]]),
      ...fenceSegments(
        "庭院右下矮栅栏",
        [[548,391],[541,396],[533,401],[521,407],[511,411],[505,411],[498,419]],
        3.5,
      ),
      polygon("西廊石座", [[42,360],[67,353],[77,356],[77,365],[53,374],[43,371]]),
      polygon("西廊灯座", [[82,357],[91,355],[100,359],[100,367],[91,371],[81,366]]),
      polygon("西廊花拱右脚", [[136,344],[145,343],[149,349],[147,355],[137,355],[134,352]]),
      polygon("西花拱左脚", [[95,441],[106,437],[110,438],[109,448],[97,449]]),
      polygon("西花拱右脚", [[149,430],[155,428],[159,430],[159,436],[149,439]]),
      polygon("门径左花盆", [[382,227],[400,227],[403,235],[398,244],[383,244],[380,236]]),
      polygon("门径右花盆", [[483,227],[501,227],[503,236],[497,244],[485,244],[481,235]]),
      polygon("西南广场灯盆", [[376,414],[388,412],[395,417],[393,425],[385,428],[375,425],[373,421]]),
      polygon("东南广场灯盆", [[490,414],[502,412],[507,417],[507,425],[498,428],[489,425],[487,421]]),
      polygon("西南矮栏花箱", [[348,399],[353,398],[372,406],[371,410],[365,412],[348,404]]),
      polygon("东南矮栏花箱", [[509,406],[529,398],[535,399],[534,404],[517,412],[510,410]]),
      polygon("门阶西灯座", [[405,157],[414,157],[417,161],[413,164],[405,165],[402,162]]),
      polygon("门阶东灯座", [[467,157],[475,156],[478,161],[474,165],[467,165],[464,162]]),
      polygon("门前西侧高灯座", [[338,105],[345,104],[347,106],[345,109],[339,109],[337,107]]),
      polygon("门前东侧高灯座", [[536,105],[543,105],[545,107],[543,109],[537,109],[535,107]]),
      polygon("北街木桥西灯座", [[792,69.75],[798,69.5],[799.5,70.5],[798.5,72],[792,72],[791,71]]),
      polygon("北街木桥东灯座", [[865.5,68.5],[872,69],[873.5,71],[872.5,72.5],[865.5,72],[864.5,70.5]]),
      polygon("茶座花盆", [[277,130],[288,130],[293,134],[289,138],[279,138],[275,135]]),
      polygon("长椅花盆", [[604,130],[615,130],[622,134],[618,138],[607,139],[601,135]]),
      polygon("气球摊东灯栅", [[266,260],[285,259],[290,263],[289,276],[285,276],[284,269],[268,270],[266,275],[263,273]]),
      polygon("放映区西南角灯座", [[595,291],[605,290],[610,295],[609,302],[601,305],[595,301]]),
      // The creek deck covers the west end of this painted planter.
      polygon("放映区西花箱", [[628,267],[636,264],[639,267],[634,274],[628,274]]),
      polygon("放映区东灯盆", [[793,259],[807,258],[810,265],[806,273],[797,273],[790,270]]),
      polygon("放映区东南花架", [[781,327],[802,330],[807,334],[807,341],[802,341],[800,337],[783,335],[780,340],[776,338]]),
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
        hitAreas: [{ x: 150, y: 181, w: 105, h: 61 }, { x: 160, y: 242, w: 90, h: 25 }, { x: 182, y: 266, w: 44, h: 25 }],
        approach: { x: 275, y: 287 },
        radius: 100,
      },
      {
        id: "danmaku",
        title: "花园小电视 · 周年放映",
        x: 713,
        y: 235,
        hitAreas: [{ x: 641, y: 187, w: 145, h: 86 }],
        approach: { x: 710, y: 331 },
        radius: 130,
        color: "#66bfd8",
      },
      {
        id: "fireworks",
        title: "一周年烟花",
        x: 688,
        y: 449,
        hitAreas: [{ x: 653, y: 429, w: 69, h: 51 }],
        approach: { x: 620, y: 488 },
        radius: 100,
      },
      {
        id: "bili",
        title: "小电视打卡站",
        x: 199,
        y: 449,
        hitAreas: [{ x: 164, y: 412, w: 69, h: 68 }],
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
    // The north edge ends at the flowering hedge; only the southern gate is an exit.
    floor: [
      [96,135],[109,114],[128,96],[157,87],[164,72],[193,68],[224,72],
      [248,78],[282,77],[319,87],[351,97],[392,92],[407,86],[425,82],
      [445,79],[462,80],[477,85],[491,92],[524,94],[557,89],[588,85],[620,80],
      [648,72],[675,65],[705,65],[730,81],[749,98],[775,106],[784,124],
      [786,151],[802,171],[822,181],[833,202],[821,226],[810,242],[803,259],
      [809,287],[825,306],[831,325],[824,347],[817,370],[810,399],[815,415],
      [799,439],[778,456],[752,467],[729,466],[713,482],[682,498],[652,500],
      [632,511],[608,501],[588,498],[571,489],[566,491],[559,496],[555,500],
      [550,496],[545,496],[542,493],[539,495],[536,491],[533,493],[529,496],
      [525,497],[521,494],[517,487],[512,493],[508,497],[505,504],
      [505,511],[497,511],[492,515],[488,518],[490,522],[486,526],
      [487,537],[492,543],[497,549],
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
        title: "松落的花藤",
        kind: "ribbon",
        x: 335,
        y: 438,
        radius: 17,
      },
      {
        id: "stone",
        title: "翘起的苔石",
        kind: "stone",
        x: 325,
        y: 356,
        radius: 18,
      },
      {
        id: "mist",
        title: "溪边薄雾",
        kind: "mist",
        x: 605,
        y: 254,
        radius: 23,
      },
      {
        id: "wind",
        title: "卷叶小风",
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
scenes.garden.spots.push(xiaoyeSpot);
scenes.garden.walls.push(xiaoyeFootprint);
scenes.garden.spots.push(suyanSpot);
scenes.garden.walls.push(suyanFootprint);
for (const {key, scene, spot, footWidth} of anniversaryVisitors) {
  scenes[scene].spots.push(spot);
  const label = "周年来宾 · " + spot.title;
  // The sheep's hooves face across the sloping mine lane. Its fleece hangs
  // over the path, but the player can walk along that edge.
  scenes[scene].walls.push(key === "dianziyang"
    ? polygon(label, [[-6,-3],[-3,-5],[2,-5],[4,-3],[0,-1],[-4,0]].map(([x,y]) => [spot.x+x, spot.y+y]))
    : {label, x: spot.x - footWidth / 2, y: spot.y - 3, w: footWidth, h: 5});
}
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
    yieldsOnArrival: true,
    x: guest.x - 5,
    y: guest.y - 6,
    w: 10,
    h: 9,
  });
}
const appleTree = { x: 705, y: 392, scale: 1 };
const appleBasket = { x: 315, y: 255 };
const treeRoots = [[-4,13],[4,13],[5,18],[10,24],[7,26],[1,24],[-4,25],[-10,23],[-5,19]];
for (const tree of [...challengeTrees, appleTree]) {
  scenes.challenge.walls.push(polygon("花园树根", treeRoots.map(([dx,dy]) =>
    [tree.x + dx * tree.scale, tree.y + dy * tree.scale])));
}
scenes.garden.walls.push(polygon("苹果果篮", [
  [303,250],[327,250],[333,255],[326,259],[305,259],[297,255],
]));
for (const id of ["garden", "challenge"] as const) {
  const outdoor = scenes[id];
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
  if (id === "challenge") {
    outdoor.walls.push(...courageFlowerRoots);
    const bench = { x: 560, y: 430 };
    outdoor.walls.push(polygon("休息长椅", [
      [-27,0],[26,0],[30,6],[28,16],[22,18],[20,13],[-19,13],[-21,18],[-27,16],[-30,7],
    ].map(([dx,dy]) => [bench.x+dx,bench.y+dy])));
    outdoor.spots.push({
      id: "rest",
      title: "在勇气花园里歇一会",
      ...bench,
      approach: { x: 560, y: 457 },
      radius: 50,
      color: "#97c9ce",
    });
  }
  outdoor.spots.push(
    id === "garden" ? {
      id: "apple",
      title: "从果篮拿一颗苹果",
      ...appleBasket,
      approach: { x: appleBasket.x + 18, y: appleBasket.y + 18 },
      radius: 38,
      markerOffset: 20,
      hitAreas: [{ x: appleBasket.x - 23, y: appleBasket.y - 24, w: 46, h: 29 }],
      color: "#e99585",
    } : {
      id: "apple",
      title: "摘一颗苹果",
      x: appleTree.x,
      y: appleTree.y,
      approach: { x: appleTree.x + 30, y: appleTree.y + 31 },
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
      ...(id === "garden" ? { x: 375, y: 285, approach: { x: 385, y: 308 } }
        : { x: 420, y: 305, approach: { x: 420, y: 323 } }),
      radius: 48,
      color: "#e8dd8f",
    },
  );
}

// Route checks also import the unlocked garden. Its ground is now the same lawn.
export const bloomingGarden = scenes.garden;
