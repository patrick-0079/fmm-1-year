import type { Point } from "./core.ts";

/** World pixels, aligned to the painted fence openings, bridge deck and north stair. */
export const townGates = [
  { scene: "garden", id: "town-gate", exit: "town-return", target: "town", kind: "wicket",
    x: 576, y: 564, width: 38, title: "周年小镇南街", sign: "南街", signHeight: 13, approach: {x:573,y:526} },
  { scene: "garden", id: "north-town-gate", exit: "town-north-return", target: "town", kind: "bridge",
    x: 816, y: 56, width: 58, title: "木桥 · 小镇北街", sign: "北街", signHeight: 20, approach: {x:786,y:66} },
  { scene: "town", id: "town-return", exit: "town-gate", target: "garden", kind: "wicket",
    x: 447, y: 986, width: 38, title: "周年花园南门", sign: "花园", signHeight: 26, approach: {x:451,y:956} },
  { scene: "town", id: "town-north-return", exit: "north-town-gate", target: "garden", kind: "stairs",
    x: 562, y: 80, width: 44, title: "北街 · 花园木桥", sign: "木桥", signHeight: 20, approach: {x:562,y:108} },
] as const;
export type TownGate = typeof townGates[number];
export const southStreetLamp = {x:405, y:997, lightY:924};
export function gateSignFoot(g: TownGate) {
  if (g.id === "town-return") return {x:southStreetLamp.x+4, y:southStreetLamp.y};
  if (g.id === "town-gate") return {x:536, y:566};
  if (g.kind === "bridge") return {x:g.x+4,y:g.y-10};
  return {x:g.x+22,y:g.y+3};
}
export const gateSpot = (g: TownGate) => {
  const sign = gateSignFoot(g);
  const signReach = g.kind === "wicket" ? {x:sign.x-12,y:sign.y-g.signHeight-9,w:24,h:18} :
    {x:sign.x-16,y:sign.y-33,w:32,h:34};
  const passage = g.kind === "wicket" ? {x:g.x-g.width/2, y:g.y-25, w:g.width,h:33} :
    g.kind === "bridge" ? {x:g.x-25,y:g.y-10,w:54,h:22} : {x:g.x-17,y:g.y-12,w:34,h:25};
  return {id:g.id, title:"前往"+g.title, x:g.x, y:g.y, portal:g.target, portalExit:g.exit,
    approach:{...g.approach}, radius:g.id === "town-gate" ? 53 : 44, selfMarked:true, markerOffset:8, hitAreas:[passage,signReach]};
};
export function gatePosts(g: TownGate) {
  const label = g.title+"门柱";
  if (g.kind === "wicket") {
    // The waymark shares the painted street lamp's base at the curb.
    if (g.scene === "town") return [
      {label:"南街原有路灯",x:southStreetLamp.x-6,y:southStreetLamp.y-13,w:12,h:14},
    ];
    // The stone path passes between the white fence finials painted into the garden.
    return [g.x-g.width/2-7, g.x+g.width/2].map(x=>({label,x,y:g.y-4,w:7,h:6}));
  }
  const sign=gateSignFoot(g);
  const post={label,x:sign.x-3,y:sign.y-3,w:6,h:5};
  return g.kind === "stairs" ? [post] : [post,
    {label:"木桥后栏杆",x:g.x-14,y:g.y-14,w:40,h:4},
    {label:"木桥前栏杆",x:g.x-13,y:g.y+11,w:40,h:4}];
}

/** Cross the opening in its outward direction. Arriving, walking past, or standing still never bounces back. */
export function crossedTownGate(scene: string, before: Point, after: Point) {
  return townGates.find(g => {
    if (scene!==g.scene) return false;
    const axis=g.kind==="bridge" ? "x" : "y", across=axis==="x" ? "y" : "x";
    const sign=g.kind==="stairs" ? -1 : 1;
    const from=(before[axis]-g[axis])*sign, to=(after[axis]-g[axis])*sign;
    if (from>=0 || to<0) return false;
    const offset=before[across]+(after[across]-before[across])*(-from/(to-from))-g[across];
    return Math.abs(offset) <= (g.kind==="wicket" ? g.width/2 : g.kind==="bridge" ? 7 : 14);
  });
}
