import type { Point } from "./core.ts";
import type { SceneId } from "./maps.ts";
export interface GardenTree extends Point {
  scale: number;
  tone: number;
}
export const gardenTrees: Record<Exclude<SceneId, "room">, GardenTree[]> = {
  garden: [
    { x: 260, y: 350, scale: 1.05, tone: -6 },
    { x: 555, y: 280, scale: 1.15, tone: 6 },
    { x: 550, y: 178, scale: 0.95, tone: 0 },
    { x: 770, y: 370, scale: 0.9, tone: 10 },
    { x: 360, y: 495, scale: 1.1, tone: -4 },
    { x: 565, y: 505, scale: 1.05, tone: 4 },
  ],
  challenge: [
    { x: 210, y: 150, scale: 1.2, tone: -8 },
    { x: 300, y: 150, scale: 1, tone: 4 },
    { x: 665, y: 150, scale: 1.2, tone: 0 },
    { x: 280, y: 470, scale: 1.1, tone: 7 },
    { x: 650, y: 480, scale: 1.1, tone: -5 },
    { x: 745, y: 230, scale: 0.9, tone: 9 },
    { x: 315, y: 305, scale: 0.95, tone: 0 },
    { x: 550, y: 370, scale: 1, tone: -8 },
  ],
};
export interface Creek {
  upper: Point[];
  lower: Point[];
  bridge: { x: number; y: number; w: number; h: number };
}
export const creeks: Record<Exclude<SceneId, "room">, Creek> = {
  garden: {
    upper: [
      [575, 160],
      [597, 160],
      [607, 195],
      [596, 230],
      [600, 245],
      [574, 245],
      [570, 230],
      [580, 197],
    ].map(([x, y]) => ({ x, y })),
    lower: [
      [574, 273],
      [600, 273],
      [613, 300],
      [607, 330],
      [598, 353],
      [574, 353],
      [582, 327],
      [585, 304],
    ].map(([x, y]) => ({ x, y })),
    bridge: { x: 557, y: 245, w: 70, h: 28 },
  },
  challenge: {
    upper: [
      [135, 115],
      [160, 115],
      [159, 172],
      [145, 210],
      [151, 258],
      [171, 295],
      [170, 306],
      [143, 306],
      [143, 296],
      [127, 263],
      [121, 210],
      [135, 168],
    ].map(([x, y]) => ({ x: x + 85, y })),
    lower: [
      [143, 334],
      [170, 334],
      [165, 372],
      [145, 409],
      [151, 449],
      [140, 502],
      [115, 502],
      [126, 448],
      [120, 406],
      [142, 367],
    ].map(([x, y]) => ({ x: x + 85, y })),
    bridge: { x: 202, y: 305, w: 80, h: 30 },
  },
};
