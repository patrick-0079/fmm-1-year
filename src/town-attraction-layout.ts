import type { Hotspot } from "./maps.ts";
import { ARCADES } from "./town-data.ts";

type Area = NonNullable<Hotspot["hitAreas"]>[number];
type Box = readonly [x: number, y: number, width: number, height: number];
type Base = readonly [centerX: number, centerY: number, width: number, depth: number];
const area = ([x, y, w, h]: Box): Area => ({ x, y, w, h });

// Y is the front edge of the art. Stone plates and the takeoff marker sit on
// the ground; the platforms and rings are painted in foot-depth order.
export const rabbitPlatforms = [
  { sprite: "stump", x: 430, y: 588 },
  { sprite: "moon", x: 474, y: 577 },
  { sprite: "cloud", x: 516, y: 560 },
] as const;
export const blockBoard = { sprite: "board", x: 1088, y: 499 } as const;
export const flightRings = [
  { sprite: "smallRing", x: 753, y: 427 },
  { sprite: "ring", x: 694, y: 457 },
] as const;
export const flightPad = { sprite: "flightPad", x: 669, y: 476 } as const;
export const wishLawn = { x: 462, y: 276, w: 143, h: 90 } as const;
export const wishPairs = [
  { left: { x: 502, y: 303 }, right: { x: 575, y: 316 } },
  { left: { x: 495, y: 325 }, right: { x: 573, y: 338 } },
  { left: { x: 486, y: 347 }, right: { x: 570, y: 361 } },
] as const;

const layouts = {
  hop: {
    radius: 54, anchor: [26, -15], bounds: [407, 498, 135, 90],
    bases: [[414, 585, 9, 6], [446, 585, 9, 6], [466, 573, 8, 6], [483, 573, 8, 6],
      [507, 556, 8, 6]],
    hits: [[410, 568, 41, 13], [410, 579, 39, 7], [417, 543, 20, 23],
      [453, 553, 41, 12], [482, 538, 12, 22], [459, 563, 30, 5], [462, 568, 8, 8], [479, 568, 9, 8],
      [493, 520, 47, 19], [502, 509, 30, 15], [503, 499, 25, 12], [503, 539, 9, 20], [520, 539, 14, 20]],
  },
  blocks: {
    radius: 66, anchor: [31, -40], bounds: [1012, 397, 152, 102],
    bases: [[1030, 477, 34, 10], [1069, 485, 46, 11], [1126, 493, 68, 11]],
    hits: [[1121, 399, 26, 14], [1067, 408, 76, 21], [1055, 429, 93, 17],
      [1034, 446, 113, 12], [1021, 458, 136, 11], [1014, 469, 145, 15], [1113, 484, 44, 10]],
  },
  flight: {
    radius: 62, anchor: [-41, 13], bounds: [644, 350, 134, 126],
    bases: [[677, 453, 24, 7], [722, 444, 28, 7], [744, 423, 10, 7], [770, 421, 12, 7]],
    // Narrow rim bands leave the opening available for click-to-walk.
    hits: [[650, 464, 37, 11], [677, 351, 32, 9], [666, 359, 18, 16], [708, 362, 16, 16],
      [651, 379, 16, 18], [654, 395, 8, 27], [650, 417, 15, 15], [655, 431, 16, 10],
      [725, 381, 9, 13], [729, 393, 9, 26], [722, 418, 11, 14],
      [717, 430, 17, 14], [665, 444, 70, 12], [707, 442, 30, 10],
      [740, 377, 24, 9], [734, 385, 8, 15], [731, 395, 7, 16], [731, 409, 11, 10],
      [764, 386, 9, 12], [765, 399, 7, 12], [760, 410, 15, 14], [738, 419, 13, 8], [761, 419, 8, 8]],
  },
  link: {
    radius: 50, anchor: [3, -5], bounds: [465, 280, 132, 81], bases: [],
    hits: wishPairs.flatMap(({ left, right }) =>
      [left, right].flatMap(({ x, y }): Box[] => [
        [x - 13, y - 21, 26, 4], [x - 20, y - 17, 40, 12], [x - 14, y - 5, 28, 4],
      ])),
  },
} satisfies Record<"hop" | "blocks" | "flight" | "link", {
  radius: number; anchor: readonly [number, number]; bounds: Box; bases: readonly Base[]; hits: readonly Box[];
}>;

type TownGame = keyof typeof layouts;
const entries = Object.entries(layouts) as [TownGame, (typeof layouts)[TownGame]][];

export const townAttractionSpots: Hotspot[] = entries.map(([id, layout]) => {
  const { x, y, title } = ARCADES[id];
  const bounds = area(layout.bounds);
  return {
    id: "arcade-" + id, title, x, y, approach: { x, y: y + 35 },
    radius: layout.radius, hitAreas: layout.hits.map(area),
    cue: {
      kind: "game", action: "玩" + title, verb: "游玩", natural: true,
      anchor: { x: layout.anchor[0], y: layout.anchor[1] },
      objectBox: { ...bounds, x: bounds.x - x, y: bounds.y - y },
    },
  };
});

export const townAttractionBases = entries.flatMap(([id, { bases }]) =>
  (bases as readonly Base[]).map(([cx, cy, w, h], i) => ({
    label: ARCADES[id].short + " · 底座 " + (i + 1),
    x: cx - w / 2, y: cy - h / 2, w, h,
  })),
);
