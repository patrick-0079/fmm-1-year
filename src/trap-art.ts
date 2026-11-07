import type { Hazard, Point } from "./core.ts";

const frames = {
  ribbon: { x: 30, y: 110, w: 775, h: 375 },
  stone: { x: 830, y: 50, w: 690, h: 440 },
  mist: { x: 30, y: 520, w: 780, h: 485 },
  wind: { x: 840, y: 515, w: 680, h: 490 },
};

export function trapSprite(trap: Hazard) {
  const frame = frames[trap.kind];
  const w = (trap.radius + 7) * 2, h = w * frame.h / frame.w;
  return { frame, x: trap.x - w / 2, y: trap.y + 6 - h, w, h };
}

// Ground contact in the atlas crop (fractions of width and height).
// Loose petals, the bow loops and the top of the boulder stand above this outline.
const outlines = {
  ribbon: [
    [.04,.71],[.12,.56],[.24,.49],[.36,.43],[.48,.47],[.60,.45],
    [.73,.51],[.84,.49],[.92,.58],[.87,.70],[.93,.83],[.83,.88],
    [.73,.80],[.62,.87],[.54,.82],[.44,.90],[.32,.84],[.21,.88],[.13,.79],
  ],
  stone: [
    [.04,.77],[.14,.69],[.25,.64],[.43,.61],[.64,.63],[.77,.66],
    [.89,.73],[.96,.77],[.91,.84],[.78,.88],[.65,.94],[.49,.92],
    [.36,.96],[.24,.91],[.15,.92],[.09,.85],
  ],
} as const;

const ground = new WeakMap<Hazard, Point[]>();
export function trapFootprint(trap: Hazard): Point[] | undefined {
  if (trap.kind !== "ribbon" && trap.kind !== "stone") return;
  let points = ground.get(trap);
  if (!points) {
    const { x, y, w, h } = trapSprite(trap);
    points = outlines[trap.kind].map(([u,v]) => ({ x: x + u*w, y: y + v*h }));
    ground.set(trap, points);
  }
  return points;
}
