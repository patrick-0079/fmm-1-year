import type { Point } from "./core.ts";
import type { Hotspot, Scene } from "./maps.ts";
import { arcadesIn } from "./town-data.ts";
import { rings, lightBoard, mirrorCells, targetCell, type RingId } from "./astrolabe.ts";

// Trace the native 1536 × 1024 stone floor, then project it onto the logical map.
const paving = (pairs: number[][]) => pairs.map(([x,y])=>({x:x*900/1536,y:y*600/1024}));
function stoneBase(label: string, at: Point, outline: number[][]) {
  return { label, points: outline.map(([dx,dy]) => ({ x: at.x + dx, y: at.y + dy })) };
}
export const townQuarry = {x:1160,y:0,width:376,height:244};
export const townEchoGate = {
  id: "echo-gate", title: "废弃山洞 · 回声遗迹", x: 1428, y: 82,
  approach: {x:1424,y:108}, radius: 40, selfMarked: true, markerOffset: 24,
  hitAreas: [{x:1394,y:28,w:70,h:61},{x:1411,y:86,w:32,h:18}], portal: "ruins", portalExit: "ruins-exit",
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
export const southNotebook: Hotspot = {
  id: "star-notebook", title: "南阶 · 查阅寻环线索", x: 475, y: 477,
  approach: {x:463,y:486}, radius: 25, selfMarked: true,
  hitAreas: [{x:461,y:456,w:30,h:26}],
};
export const moonPlate: Hotspot = {
  id: "star-plate", title: "月相星盘", x: 330, y: 258, approach: {x:361,y:267},
  radius: 35, selfMarked: true, hitAreas: [{x:302,y:206,w:56,h:59}],
};
export const ringSpotId = (id: RingId) => "star-ring-"+id;
export const ringSpots: Hotspot[] = rings.map(r => ({
  id:ringSpotId(r.id), title:"拾起"+r.name, x:r.x, y:r.y,
  approach:{x:r.x,y:r.y+13}, radius:22, selfMarked:true,
  hitAreas:[{x:r.x-12,y:r.y-19,w:24,h:25}],
}));
export const mirrorSpots: Hotspot[] = mirrorCells.map((cell, i) => {
  const x=lightBoard.x+cell.x*lightBoard.step, y=lightBoard.y+cell.y*lightBoard.step;
  return {id:"star-mirror-"+i, title:i===0 ? "引光铜镜 · 上镜" : "引光铜镜 · 下镜",
    x,y,approach:{x:x+14,y:y+7},radius:24,selfMarked:true,
    hitAreas:[{x:x-12,y:y-12,w:24,h:24}]};
});
export const lightBrick: Hotspot = {
  id:"star-brick", title:"星纹砖 · 晚安回声胸针", x:lightBoard.x+targetCell.x*lightBoard.step,
  y:lightBoard.y+targetCell.y*lightBoard.step, approach:{x:534,y:341}, radius:23, selfMarked:true,
  hitAreas:[{x:524,y:313,w:20,h:23}],
};
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
    stoneBase("听月泉石沿",echoPool,[[-23,-7],[-17,-11],[-4,-13],[13,-12],[22,-8],[23,-4],[16,1],[2,4],[-15,2],[-22,-2]]),
    stoneBase("月相星盘底座",moonPlate,[[-21,-5],[-16,-10],[15,-10],[21,-5],[20,0],[12,4],[-12,4],[-20,1]]),
    stoneBase("南阶手记书托",southNotebook,[[-9,-3],[-7,-6],[7,-6],[10,-2],[8,3],[-7,3]]),
    ...mirrorSpots.map(spot => stoneBase("铜镜座",spot,[[-7,2],[-5,-2],[0,-3],[5,-2],[7,2],[5,5],[0,7],[-5,5]])),
    ...trials.map(([,g])=>({label:g.short+"石座", x:g.x-12, y:g.y-5, w:24, h:9})),
  ],
  hazards: [],
  spots: [
    ruinsExit, echoAltar, echoPool, southNotebook, moonPlate, lightBrick, ...ringSpots, ...mirrorSpots,
    ...trials.map(([id, g])=>({id:"arcade-"+id, title:g.title, x:g.x,y:g.y,
      approach:{x:g.x,y:g.y+25}, radius:44, selfMarked:true, markerOffset:22,
      hitAreas:[{x:g.x-26,y:g.y-35,w:52,h:54}]})),
  ],
};
