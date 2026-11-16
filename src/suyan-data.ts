import type { Obstacle } from "./core.ts";
import type { Hotspot } from "./maps.ts";

/** North of the screening lawn, clear of the creek, paths and existing guests. */
export const suyanSpot: Hotspot = {
  id: "garden-guest-suyan",
  title: "苏颜 · 花园来宾",
  x: 650,
  y: 181,
  approach: { x: 650, y: 205 },
  radius: 36,
  selfMarked: true,
  hitAreas: [{ x: 632, y: 137, w: 36, h: 47 }],
  cue: {
    kind: "talk", action: "与苏颜交谈", verb: "交谈", natural: false,
    anchor: { x: 14, y: -38 },
    objectBox: { x: -18, y: -44, w: 36, h: 47 },
  },
};

export const suyanFootprint: Obstacle = {
  label: "来宾 · 苏颜", x: suyanSpot.x - 5, y: suyanSpot.y - 5, w: 10, h: 8,
};
export const SUYAN_LETTER_ID = "suyan-anniversary-letter";
