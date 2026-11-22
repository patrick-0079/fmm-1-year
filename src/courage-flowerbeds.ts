import type { Point, Obstacle } from "./core.ts";

type Flower = "bells" | "daisies" | "cosmos";
export interface CourageFlowerbed extends Point {
  flower: Flower;
  height: number;
  turned?: boolean;
}

/** Each position marks the roots on the lawn. The tops can overlap a passing player. */
export const courageFlowerbeds: readonly CourageFlowerbed[] = [
  { flower: "cosmos", x: 350, y: 138, height: 37 },
  { flower: "bells", x: 688, y: 278, height: 53 },
  { flower: "daisies", x: 295, y: 291, height: 34, turned: true },
  { flower: "cosmos", x: 422, y: 390, height: 42, turned: true },
  { flower: "bells", x: 158, y: 425, height: 44, turned: true },
  { flower: "daisies", x: 619, y: 473, height: 44 },
];

export const courageFlowerRoots: Obstacle[] = courageFlowerbeds.map(({ x, y, height, flower }) => {
  const half = height * (flower === "bells" ? .18 : .22);
  return {
    label: "高花丛根部",
    points: [[-half,-2], [-half * .48,-4], [half * .50,-4], [half,-1], [half * .60,2], [-half * .58,2]]
      .map(([dx,dy]) => ({ x: x + dx, y: y + dy })),
  };
});
