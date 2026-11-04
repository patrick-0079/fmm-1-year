import type { Point } from "./core.ts";
import type { Hotspot, Scene } from "./maps.ts";
import { arcadesIn } from "./town-data.ts";

// Trace the native 1536 × 1024 stone floor, then project it onto the logical map.
const paving = (pairs: number[][]) => pairs.map(([x,y])=>({x:x*900/1536,y:y*600/1024}));
export const townEchoGate = {
  id: "echo-gate", title: "石拱门 · 回声遗迹", x: 518, y: 562,
  approach: {x: 518, y: 592}, radius: 46, selfMarked: true, markerOffset: 43,
  hitAreas: [{x: 484, y: 503, w: 68, h: 80}], portal: "ruins", portalExit: "ruins-exit",
} satisfies Hotspot;
export const ruinsExit = {
  id: "ruins-exit", title: "南阶 · 返回周年小镇", x: 450, y: 542,
  approach: {x: 450, y: 519}, radius: 36, selfMarked: true,
  hitAreas: [{x: 423, y: 530, w: 54, h: 25}], portal: "town", portalExit: "echo-gate",
} satisfies Hotspot;
export const echoAltar = {id: "echo-altar", title: "中央祭坛 · 试听回声",
  x: 450, y: 275, approach: {x: 450, y: 298}, radius: 39, selfMarked: true,
  hitAreas: [{x: 411, y: 227, w: 78, h: 69}]};
export const echoPool = {id: "echo-pool", title: "听月泉 · 倾听旧电波", x: 383, y: 394,
  approach: {x: 399, y: 414}, radius: 36, selfMarked: true, hitAreas: [{x: 365, y: 370, w: 36, h: 34}]};
export const stairLintel = paving([[601,821],[629,790],[675,754],[719,729],[749,719],[782,718],[817,727],[856,743],[905,791],[938,815],[934,849],[899,846],[862,807],[823,787],[789,778],[752,781],[715,795],[681,819],[650,848],[616,843]]);

export function crossedEchoGate(scene: string, from: Point, to: Point) {
  if (scene === "town" && Math.abs(to.x - townEchoGate.x) < 17 &&
      from.y > townEchoGate.y && to.y <= townEchoGate.y) return townEchoGate.id;
  if (scene === "ruins" && Math.abs(to.x - ruinsExit.x) < 21 &&
      from.y < ruinsExit.y && to.y >= ruinsExit.y) return ruinsExit.id;
}
const trials = arcadesIn("ruins");
export const ruinsScene: Scene = {
  title: "回声遗迹", width: 900, height: 600,
  bounds: {x: 14, y: 35, w: 872, h: 536},
  spawn: {...ruinsExit.approach},
  surfaces: [
    paving([[72,554],[136,527],[295,515],[322,542],[381,540],[399,491],[403,354],
      [379,303],[463,283],[517,304],[568,302],[597,260],[652,235],[680,199],[850,199],
      [895,235],[943,253],[970,299],[1037,307],[1094,287],[1192,290],
      [1150,344],[1137,393],[1141,496],[1168,540],[1220,540],[1253,513],
      [1413,516],[1455,541],[1462,582],[1403,612],[1331,632],[1240,622],[1182,606],
      [1100,616],[1032,638],[1000,667],[969,716],[912,755],[861,761],[785,747],
      [730,747],[676,761],[609,748],[574,724],[549,668],[515,651],[469,635],[409,620],
      [340,624],[281,610],[205,634],[151,622],[97,607],[65,581]]),
    paving([[695,695],[837,695],[850,770],[850,877],[879,935],[881,963],
      [656,963],[657,931],[686,878],[686,770]]),
  ],
  walls: [
    {label:"听月泉石沿",x:echoPool.x-19,y:echoPool.y-5,w:38,h:8},
    ...trials.map(([,g])=>({label:g.short+"石座", x:g.x-14, y:g.y-7, w:28, h:12})),
  ],
  hazards: [],
  spots: [
    ruinsExit, echoAltar, echoPool,
    ...trials.map(([id, g])=>({id:"arcade-"+id, title:g.title, x:g.x,y:g.y,
      approach:{x:g.x,y:g.y+25}, radius:44, selfMarked:true, markerOffset:22,
      hitAreas:[{x:g.x-26,y:g.y-35,w:52,h:54}]})),
  ],
};
