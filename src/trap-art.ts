import type { Hazard, Point } from "./core.ts";

const frames = {
  ribbon: { x: 0, y: 0, w: 256, h: 96 },
  stone: { x: 256, y: 0, w: 256, h: 96 },
};

export function trapSprite(trap: Hazard & {kind: "ribbon" | "stone"}) {
  const frame = frames[trap.kind];
  const w = (trap.radius + 7) * 2, h = w * frame.h / frame.w;
  return { frame, x: trap.x - w / 2, y: trap.y + 4 - h, w, h };
}

// Ground contact in the atlas crop (fractions of width and height).
// Leaves and the lifted stone edge stand above this outline.
const outlines = {
  ribbon: [
    [.04,.74],[.12,.61],[.25,.56],[.38,.63],[.51,.63],[.62,.60],
    [.77,.67],[.91,.67],[.97,.78],[.96,.87],[.77,.90],[.65,.88],
    [.54,.91],[.42,.86],[.29,.91],[.16,.88],[.08,.84],
  ],
  stone: [
    [.04,.65],[.14,.59],[.29,.62],[.44,.68],[.61,.65],[.77,.59],
    [.90,.65],[.97,.78],[.92,.88],[.77,.91],[.62,.93],[.46,.91],
    [.31,.91],[.19,.85],[.08,.79],
  ],
} as const;

const ground = new WeakMap<Hazard, Point[]>();
export function trapFootprint(trap: Hazard): Point[] | undefined {
  if (trap.kind !== "ribbon" && trap.kind !== "stone") return;
  let points = ground.get(trap);
  if (!points) {
    const { x, y, w, h } = trapSprite({...trap, kind: trap.kind});
    points = outlines[trap.kind].map(([u,v]) => ({ x: x + u*w, y: y + v*h }));
    ground.set(trap, points);
  }
  return points;
}
