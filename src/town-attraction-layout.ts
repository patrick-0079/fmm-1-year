import type { Hotspot } from "./maps.ts";
import { ARCADES } from "./town-data.ts";

type Area = NonNullable<Hotspot["hitAreas"]>[number];
type Box = readonly [x: number, y: number, width: number, height: number];
type Base = readonly [centerX: number, centerY: number, width: number, depth: number];
const area = ([x, y, w, h]: Box): Area => ({ x, y, w, h });

// The map baker uses the same anchors as the character-relative effects.
// Y is the front edge of the art. Stone plates and the takeoff marker are flat.
export const rabbitPlatforms = [
  { sprite: "stump", x: 443, y: 588 },
  { sprite: "moon", x: 482, y: 577 },
  { sprite: "cloud", x: 521, y: 560 },
] as const;
export const blockBoard = { sprite: "board", x: 1088, y: 499 } as const;
export const flightRings = [
  { sprite: "smallRing", x: 753, y: 427 },
  { sprite: "ring", x: 694, y: 457 },
] as const;
export const flightPad = { sprite: "flightPad", x: 679, y: 470 } as const;
export const wishLawn = { x: 462, y: 276, w: 143, h: 90 } as const;
export const wishPairs = [
  { left: { x: 502, y: 303 }, right: { x: 575, y: 316 } },
  { left: { x: 495, y: 325 }, right: { x: 573, y: 338 } },
  { left: { x: 486, y: 347 }, right: { x: 570, y: 361 } },
] as const;

const layouts = {
  hop: {
    radius: 54, anchor: [34, -15], bounds: [420, 498, 127, 90],
    bases: [[427, 585, 9, 6], [459, 585, 9, 6], [474, 573, 8, 6], [491, 573, 8, 6],
      [512, 556, 8, 6]],
    hits: [[423, 568, 41, 13], [423, 579, 39, 7], [430, 543, 20, 23],
      [461, 553, 41, 12], [490, 538, 12, 22], [467, 563, 30, 5], [470, 568, 8, 8], [487, 568, 9, 8],
      [498, 520, 47, 19], [507, 509, 30, 15], [508, 499, 25, 12], [508, 539, 9, 20], [525, 539, 14, 20]],
  },
  blocks: {
    radius: 66, anchor: [31, -40], bounds: [1012, 397, 152, 102],
    bases: [[1030, 477, 34, 10], [1069, 485, 46, 11], [1126, 493, 68, 11]],
    hits: [[1121, 399, 26, 14], [1067, 408, 76, 21], [1055, 429, 93, 17],
      [1034, 446, 113, 12], [1021, 458, 136, 11], [1014, 469, 145, 15], [1113, 484, 44, 10]],
  },
  flight: {
    radius: 62, anchor: [-31, 8], bounds: [644, 350, 134, 120],
    bases: [[677, 453, 24, 7], [722, 444, 28, 7], [744, 423, 10, 7], [770, 421, 12, 7]],
    // Narrow rim bands leave the opening available for click-to-walk.
    hits: [[663, 455, 34, 15], [677, 351, 32, 9], [666, 359, 18, 16], [708, 362, 16, 16],
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
