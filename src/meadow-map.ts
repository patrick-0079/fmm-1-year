import { producers } from "./content.ts";
import type { Scene } from "./maps.ts";

const points = (pairs: number[][]) => pairs.map(([x, y]) => ({x, y}));
export const campfire = { x: 232, y: 156 };
export const starJar = { x: 198, y: 194 };
export const meadowExit = { x: 58, y: 238 };
export const tentRoof = points([[86,147],[89,141],[117,94],[119,89],[153,87],[154,77],[158,78],
  [161,82],[164,76],[168,78],[164,86],[192,128],[206,140],[205,149],[196,148],[190,155],
  [126,174],[122,178],[120,171],[88,152]]);

export const meadowScene: Scene = {
  title: "花海", width: 900, height: 600,
  bounds: { x: 24, y: 34, w: 852, h: 539 },
  // The whole lawn is walkable, including flowers. Only the edge woods and
  // objects resting on the ground constrain footsteps.
  floor: points([[30,115],[64,81],[141,51],[191,34],[744,34],[814,56],[876,91],
    [876,472],[850,507],[772,560],[720,573],[142,573],[70,529],[24,497]]),
  spawn: { x: 87, y: 239 },
  walls: [
    {label: "帐篷底边", points: points([[89,143],[153,118],[200,139],[194,155],[124,173],[89,152]])},
    {label: "营火石圈", x: 212, y: 154, w: 41, h: 14},
    {label: "水壶", x: 243, y: 132, w: 20, h: 12},
  ],
  hazards: [],
  spots: [
    {id: "meadow-exit", title: "回到庭院", ...meadowExit, portal: "garden", portalExit: "prism-arch",
      approach: {x: 87, y: 239}, radius: 39, selfMarked: true},
    {id: "meadow-camp", title: "在营火边坐坐", ...campfire,
      approach: {x: 247, y: 184}, radius: 40, selfMarked: true},
    {id: "meadow-jar", title: "看看星光瓶", ...starJar,
      approach: {x: 186, y: 210}, radius: 34, selfMarked: true},
    ...producers.map(({id, x, y}) => ({id, x, y, title: "拾起草间的落星",
      approach: {x: x + 17, y: y + 10}, radius: 34, markerOffset: 11, selfMarked: true})),
  ],
};
