import type { Point } from "./core.ts";
export interface GardenTree extends Point {
  scale: number;
  tone: number;
}
export const challengeTrees: GardenTree[] = [
  { x: 153, y: 159, scale: 1.2, tone: -8 },
  { x: 300, y: 150, scale: 1, tone: 4 },
  { x: 665, y: 150, scale: 1.2, tone: 0 },
  { x: 278, y: 435, scale: 1.1, tone: 7 },
  { x: 639, y: 429, scale: 1.1, tone: -5 },
  { x: 745, y: 230, scale: 0.9, tone: 9 },
  { x: 143, y: 363, scale: 0.95, tone: 0 },
  { x: 550, y: 370, scale: 1, tone: -8 },
];
