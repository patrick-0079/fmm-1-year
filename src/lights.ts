import type { SceneId } from "./maps";
import { townGates, southStreetLamp } from "./gate-layout.ts";
export interface Light {
  x: number;
  y: number;
  radius: number;
  color: string;
}
const warm = (x: number, y: number, radius = 48): Light => ({
  x,
  y,
  radius,
  color: "#ffc36b",
});
export const sceneLights: Record<SceneId, Light[]> = {
  meadow: [], // Moonlight is painted into the map; the campfire has its own glow.
  room: [
    warm(558, 76, 70),
    warm(45, 158, 72),
    { x: 300, y: 40, radius: 95, color: "#9ab9ef" },
  ],
  garden: [
    [351, 142],
    [538, 142],
    [387, 253],
    [514, 253],
    [384, 391],
    [515, 391],
    [360, 510],
    [541, 510],
    [205, 415],
    [658, 442],
    [749, 461],
    [648, 306],
    [768, 315],
    [189, 250],
    [144, 231],
    [414, 83],
    [477, 83],
  ].map(([x, y]) => warm(x, y, 52)),
  challenge: [
    [450, 52],
    [375, 510],
    [517, 510],
    [110, 200],
    [785, 340],
    [200, 95],
  ].map(([x, y]) => warm(x, y, 55)),
  town: [
    [450, 222],
    [522, 272],
    [580, 359],
    [700, 332],
    [883, 268],
    [936, 316],
    [974, 490],
    [1170, 476],
    [1126, 576],
    [583, 514],
    [470, 660],
    [445, 758],
    [585, 892],
    [977, 887],
    [1275, 222],
    [1398, 230],
    [1343, 850],
    [1267, 745],
    [777, 209],
    [310, 191],
    [1177, 347],
    [221, 545],
    [861, 709],
    [1333, 771],
    [625, 565],
  ]
    .map(([x, y]) => warm(x, y, 90))
    .concat([
      warm(794, 428, 125),
      warm(628, 375, 70),
      warm(897, 450, 70),
      warm(1204, 409, 70),
      warm(1284, 845, 85),
    ]),
};
for (const g of townGates) {
  if (g.kind==="wicket")
    sceneLights[g.scene].push(g.scene==="town" ? warm(southStreetLamp.x,southStreetLamp.lightY,40) : warm(g.x-g.width*.305,g.y-g.width*.17,32));
  if (g.kind==="bridge") sceneLights.garden.push(warm(795,39,35),warm(869,49,32));
}
