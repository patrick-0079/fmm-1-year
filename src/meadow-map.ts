import { producers } from "./content.ts";
import type { Scene } from "./maps.ts";

const points = (pairs: number[][]) => pairs.map(([x, y]) => ({x, y}));
export const campfire = { x: 232, y: 156 };
export const starJar = { x: 198, y: 194 };
export const meadowExit = { x: 58, y: 238 };
export function enteredMoonCircle(before:{x:number;y:number},after:{x:number;y:number}) {
  const distance=(p:{x:number;y:number})=>((p.x-meadowExit.x)/12)**2+((p.y-meadowExit.y)/6.5)**2;
  return distance(before)>1 && distance(after)<=1;
}
export const tentRoof = points([[86,147],[89,141],[117,94],[119,89],[153,87],[154,77],[158,78],
  [161,82],[164,76],[168,78],[164,86],[192,128],[206,140],[205,149],[196,148],[190,155],
  [126,174],[122,178],[120,171],[88,152]]);

export const meadowScene: Scene = {
  title: "花海", width: 900, height: 600,
  bounds: { x: 24, y: 34, w: 852, h: 539 },
  // The whole lawn is walkable, including flowers. Only the edge woods and
  // objects resting on the ground constrain footsteps.
  floor: points([[24,112],[47,90],[71,79],[94,58],[139,47],[168,34],
    [750,34],[798,45],[838,69],[854,75],[876,94],[876,483],
    [854,496],[842,516],[805,533],[780,555],[742,561],[724,573],
    [134,573],[110,554],[75,538],[57,519],[36,515],[24,499]]),
  spawn: { x: 87, y: 239 },
  walls: [
    {label: "帐篷底边", points: points([[89,143],[153,118],[200,139],[194,155],[124,173],[89,152]])},
    {label: "营火石圈", points: points([[211,157],[216,152],[230,151],[242,152],[252,156],[253,161],[246,167],[231,170],[216,167],[210,163]])},
    {label: "水壶", points: points([[244,132],[250,130],[260,131],[263,135],[262,142],[257,145],[247,144],[243,140]])},
    {label: "星光瓶底", points: points([[194,192],[197,190],[202,191],[203,193],[201,195],[195,195]])},
  ],
  hazards: [],
  spots: [
    {id: "meadow-exit", title: "月芽传送阵 · 回庭院", ...meadowExit, portal: "garden", portalExit: "prism-arch",
      approach: {x: 87, y: 239}, radius: 39, markerOffset: 0, selfMarked: true},
    {id: "meadow-camp", title: "在营火边坐坐", ...campfire,
      approach: {x: 247, y: 184}, radius: 40, selfMarked: true},
    {id: "meadow-jar", title: "看看星光瓶", ...starJar,
      approach: {x: 186, y: 210}, radius: 34, selfMarked: true},
    ...producers.map(({id, x, y}) => ({id, x, y, title: "拾起草间的落星",
      approach: {x: x + 17, y: y + 10}, radius: 34, markerOffset: 11, selfMarked: true})),
  ],
};
