import data from "./town-interiors.generated.json" with { type: "json" };
import type { Obstacle, Point } from "./core.ts";
import type { Phase } from "./day.ts";
import type { Hotspot, Scene } from "./maps.ts";
import type { ChatBook } from "./resident-chats.ts";
import { TOWN_NPCS } from "./town-data.ts";
import type { TownResidentId } from "./town-dialogue.ts";
import { townInteriorId, townInteriorKeys, type TownInteriorId, type TownInteriorKey } from "./town-interior-id.ts";

type Coordinates = [number, number];
// Source rectangles are in atlas pixels. The destination origin is in scene units.
type Frame = [x: number, y: number, w: number, h: number, left: number, top: number];
interface Station {
  foot: Point;
  approach: Point;
}
interface RoomData {
  title: string;
  plan: {
    floor: Coordinates[];
    spawn: Coordinates;
    exit: Coordinates;
    street: { arrival: Coordinates; threshold: Coordinates; halfWidth: number };
    actions: { anchor: Coordinates; approach: Coordinates }[];
    resident: TownResidentId;
    shifts: Partial<Record<Phase, { foot: Coordinates; approach: Coordinates }>>;
  };
  walls: { label: string; points: Coordinates[] }[];
  chat: ChatBook;
  art: {
    scale: number;
    backgrounds: Record<Phase, Frame>;
    skies: Record<Phase, Frame>;
    lights: Record<Phase, Frame>;
    blind?: { raised: Record<Phase, Frame>; lowered: Record<Phase, Frame> };
    collection?: Record<TownInteriorKey, [x: number, y: number, width: number, height: number]>;
    props: { name: string; depth: number; variants: Record<Phase, Frame> }[];
  };
}
const rooms = data as unknown as Record<TownInteriorKey, RoomData>;
const point = ([x, y]: Coordinates): Point => ({ x, y });

const actions = {
  florist: ["制作窗光花签", "推开温室气窗"],
  baker: ["烤草莓小饼", "翻看手绘白板"],
  maker: ["转动试光台铜片", "查看黄铜材料柜"],
  post: ["盖下月牙邮戳", "翻看分信格"],
  books: ["装帧池畔折页", "卷起后窗竹帘"],
  radio: ["录一段晚安片头", "坐下试听"],
  hall: ["摇动手摇影箱", "查看小镇纪念品展柜"],
} as const;

// Trace the painted objects above their feet, including handles that project past the base.
const objectBounds: Record<TownInteriorKey, [[number, number, number, number], [number, number, number, number]]> = {
  florist: [[-69, -78, 136, 81], [-66, -104, 138, 96]],
  baker: [[-38, -50, 116, 51], [-32, -85, 64, 79]],
  maker: [[-52, -85, 126, 87], [-52, -68, 119, 69]],
  post: [[-38, -64, 83, 65], [-49, -67, 110, 68]],
  books: [[-76, -57, 144, 59], [-41, -67, 83, 52]],
  radio: [[-82, -65, 155, 67], [-23, -44, 48, 45]],
  hall: [[-47, -96, 118, 98], [-109, -90, 212, 93]],
};

// Face areas are traced on the existing town painting. The gate stays at
// foot height on the outdoor paving, so neither path nor collision needs to
// enter the painted facade.
const doorFaces: Record<TownInteriorKey, [number, number, number, number]> = {
  florist: [246, 177, 27, 61],
  baker: [698, 173, 23, 65],
  maker: [1206, 330, 33, 66],
  post: [239, 552, 25, 56],
  books: [847, 709, 31, 43],
  radio: [1324, 762, 29, 53],
  hall: [1165, 21, 27, 32],
};
const doorColors: Record<TownInteriorKey, string> = {
  florist: "#91b6a1", baker: "#f0b68d", maker: "#c7a8da", post: "#dd9397",
  books: "#9ccac0", radio: "#a4bde2", hall: "#e8c18a",
};

export const hallCollectionSlots = [
  ["florist", "花店", 229, 129], ["baker", "烘焙屋", 276, 129],
  ["hall", "纪念馆", 323, 129], ["maker", "工坊", 368, 129],
  ["post", "邮局", 243, 154], ["books", "书屋", 300, 154], ["radio", "电台", 359, 154],
] as const satisfies readonly [TownInteriorKey, string, number, number][];

export type TownArea = "town" | TownInteriorId;
export interface TownInterior {
  key: TownInteriorKey;
  scene: Scene;
  exterior: Hotspot;
  exit: Hotspot;
  resident: TownResidentId;
  shifts: Partial<Record<Phase, Station>>;
  chat: ChatBook;
  art: RoomData["art"];
}

function portal(
  id: string, title: string, p: Point, approach: Point, target: Hotspot["portal"],
  opposite: string, face: [number, number, number, number], color: string,
  crossing?: Hotspot["crossing"],
): Hotspot {
  const [x, y, w, h] = face;
  const objectBox = { x: x - p.x, y: y - p.y, w, h };
  return {
    id, title, ...p, approach, radius: 33, portal: target, portalExit: opposite, color,
    crossing, selfMarked: true, markerOffset: Math.max(0, p.y - y - h / 2),
    hitAreas: [{ x, y, w, h }],
    cue: { kind: "exit", action: title, verb: "前往", natural: true, objectBox,
      anchor: { x: objectBox.x + w * .5, y: objectBox.y + h * .65 } },
  };
}

function activitySpot(key: TownInteriorKey, index: number, station: RoomData["plan"]["actions"][number]): Hotspot {
  const at = point(station.anchor);
  const [x, y, w, h] = objectBounds[key][index];
  const title = actions[key][index];
  const hitAreas = [{ x: at.x + x, y: at.y + y, w, h }];
  // The handle on the left stays clear of Hongjian's morning workstation.
  const cueX = key === "post" && index === 1 ? .32 : .56;
  return {
    id: townInteriorId(key) + (index === 0 ? "-main" : "-extra"),
    title, ...at, approach: point(station.approach), color: doorColors[key], radius: 48,
    markerOffset: -y / 2, hitAreas,
    cue: { kind: "mechanism", action: title, verb: "查看", natural: false, objectBox: { x, y, w, h },
      anchor: key === "books" && index === 1 ? { x: 35, y: -40 }
        : key === "florist" && index === 1 ? { x: 9, y: -84 }
        : { x: x + w * cueX, y: y + h * .5 } },
  };
}

export function residentFeet(npc: typeof TOWN_NPCS[number], foot: Point): Obstacle {
  return { label: "镇民 · " + npc.name, yieldsOnArrival: true, x: foot.x - 5, y: foot.y - 6, w: 10, h: 9 };
}

export function residentSpot(npc: typeof TOWN_NPCS[number], foot: Point, approach: Point): Hotspot {
  return {
    id: "npc-" + npc.id, title: npc.name + " · " + npc.role, ...foot, approach, radius: 56,
    markerOffset: npc.id === "guli" ? 34 : npc.appearance === "guest" || npc.id === "hop-keeper" ? 44 : 53,
    color: "#ceab63",
  };
}

function room(key: TownInteriorKey): TownInterior {
  const { title, plan, walls, chat, art } = rooms[key];
  const id = townInteriorId(key);
  const outsideId = id + "-door", insideId = id + "-exit";
  const exterior = portal(outsideId, "前往" + title, point(plan.street.threshold), point(plan.street.arrival), id,
    insideId, doorFaces[key], doorColors[key], plan.street.halfWidth ? { sign: -1, halfWidth: plan.street.halfWidth } : undefined);
  const exit = portal(insideId, "前往小镇街道", point(plan.exit), point(plan.spawn), "town", outsideId,
    [plan.exit[0] - 27, 344, 54, 18], doorColors[key], { sign: 1, halfWidth: 22 });
  const shifts = Object.fromEntries(Object.entries(plan.shifts).filter(([phase]) => key !== "radio" || phase === "night").map(([phase, station]) =>
    [phase, { foot: point(station.foot), approach: point(station.approach) }]));
  const scene: Scene = {
    title, width: 600, height: 400, bounds: { x: 0, y: 0, w: 600, h: 400 },
    floor: plan.floor.map(point), spawn: point(plan.spawn), hazards: [],
    walls: walls.map(w => ({ label: w.label, points: w.points.map(point) })),
    spots: [exit, ...plan.actions.map((station, i) => activitySpot(key, i, station))],
  };
  return { key, scene, exterior, exit, resident: plan.resident, shifts, chat, art };
}

export const townInteriors = Object.fromEntries(townInteriorKeys.map(key => [townInteriorId(key), room(key)])) as Record<TownInteriorId, TownInterior>;
export const townInteriorScenes = Object.fromEntries(Object.entries(townInteriors).map(([id, interior]) =>
  [id, interior.scene])) as Record<TownInteriorId, Scene>;
export const interiorForResident = new Map(Object.values(townInteriors).map(interior => [interior.resident, interior]));

/** Walking across the line in the marked direction uses the same portal as E and tap. */
export function crossedInteriorDoor(spots: readonly Hotspot[], before: Point, after: Point) {
  return spots.find(spot => {
    if (!spot.crossing) return false;
    const { sign, halfWidth } = spot.crossing;
    const start = (before.y - spot.y) * sign, end = (after.y - spot.y) * sign;
    if (start >= 0 || end < 0) return false;
    const x = before.x + (after.x - before.x) * -start / (end - start);
    return Math.abs(x - spot.x) <= halfWidth;
  });
}
