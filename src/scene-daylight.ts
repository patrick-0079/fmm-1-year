import type { Phase } from "./day.ts";
import type { DaylightMix } from "./daylight-mix.ts";
import { sceneLights } from "./lights.ts";
import { creeks } from "./landscape.ts";

type Scene = "room" | "garden" | "challenge";
type Palette = readonly [sky: string, middle: string, shade: string, lamp: number];

// Source side, middle distance, far side, and the contribution of actual lamps.
// The room keeps the warmth of the wooden floor; the courage garden keeps its cool canopy.
const palettes: Record<Scene, Record<Phase, Palette>> = {
  room: {
    dawn: ["#fff0bd58", "#f9c99c20", "#ad9bc22c", .16],
    day: ["#fff7d310", "#fff4c908", "#dfc9b109", 0],
    dusk: ["#ffbb825f", "#e99d792d", "#7762864b", .72],
    night: ["#5277ac6a", "#47466e68", "#42385876", 1],
  },
  garden: {
    dawn: ["#fff0ba60", "#fbd1c734", "#a896ba34", .12],
    day: ["#ffefbd0e", "#fff5dd05", "#92bdd20a", 0],
    dusk: ["#ffb07878", "#df8d9356", "#7f779c62", .72],
    night: ["#465f987e", "#49558384", "#343e728e", 1],
  },
  challenge: {
    dawn: ["#ebeabc58", "#c2d6c337", "#8da5bc42", .14],
    day: ["#f3ecc60c", "#f4efc806", "#648c830e", 0],
    dusk: ["#e7ad7272", "#b18c884c", "#64708868", .66],
    night: ["#4d6d887c", "#3e5b7189", "#313f668e", 1],
  },
};
const grades = new Map<string, HTMLCanvasElement>();

function radial(c: CanvasRenderingContext2D, x: number, y: number, r: number,
  hot: string, soft: string, edge: string) {
  const glow = c.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, hot);
  glow.addColorStop(.43, soft);
  glow.addColorStop(1, edge);
  c.fillStyle = glow;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function grade(scene: Scene, phase: Phase) {
  const key = scene + "/" + phase;
  const cached = grades.get(key);
  if (cached) return cached;
  const sheet = document.createElement("canvas");
  const w = scene === "room" ? 600 : 900, h = scene === "room" ? 400 : 600;
  sheet.width = w / 2;
  sheet.height = h / 2;
  const c = sheet.getContext("2d")!;
  c.scale(.5, .5);
  const [sky, mid, shade, lamps] = palettes[scene][phase];
  const east = phase === "dawn";
  const field = scene === "room"
    ? c.createLinearGradient(east ? w * .62 : w * .4, 0, east ? w * .2 : w * .78, h)
    : c.createLinearGradient(east ? w : 0, h * .12, east ? 0 : w, h * .86);
  field.addColorStop(0, sky);
  field.addColorStop(.52, mid);
  field.addColorStop(1, shade);
  c.fillStyle = field;
  c.fillRect(0, 0, w, h);

  if (lamps > 0) {
    for (const light of sceneLights[scene]) {
      c.globalCompositeOperation = "destination-out";
      c.globalAlpha = lamps;
      radial(c, light.x, light.y, light.radius, "#000000ef", "#0000009b", "#00000000");
      // Glass supplies its own sky color once the surrounding room shade has been cut away.
      if (light.window) continue;
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = lamps * .57;
      radial(c, light.x, light.y, light.radius * .78, "#ffe6aab5", "#ffbb6b43", "#ffc07900");
    }
  }
  grades.set(key, sheet);
  return sheet;
}

/** Each stop is rasterized once, at half size: only its smooth atmospheric light is cached. */
export function drawSceneDaylight(c: CanvasRenderingContext2D, scene: Scene, light: DaylightMix) {
  const first = grade(scene, light.from);
  const w = first.width * 2, h = first.height * 2;
  c.save();
  c.imageSmoothingEnabled = true;
  const opacity = c.globalAlpha;
  c.globalAlpha = opacity * (1 - light.mix);
  c.drawImage(first, 0, 0, w, h);
  if (light.mix > 0 && light.to !== light.from) {
    c.globalAlpha = opacity * light.mix;
    c.drawImage(grade(scene, light.to), 0, 0, w, h);
  }
  c.restore();
}

const floorPatches: Record<Phase, readonly [offset: number, depth: number, color: string, opacity: number]> = {
  dawn: [-26, 52, "#fff2c0", .24], day: [-3, 52, "#fff2c2", .13],
  dusk: [105, 91, "#ffc388", .32], night: [7, 52, "#d9e7ff", .075],
};
const floorArt = new Map<Phase, HTMLCanvasElement>();

/** The evening panes stretch from the back boards to the floor beside the bedpost. */
function windowOnWood(phase: Phase) {
  const cached = floorArt.get(phase);
  if (cached) return cached;
  const [offset, depth, color, opacity] = floorPatches[phase];
  // This crop ends at world x=427, just clear of the bedspread. The mask feathers its last 12 pixels.
  const tile = document.createElement("canvas");
  tile.width = 203; tile.height = 103;
  const g = tile.getContext("2d")!;
  g.save();
  g.globalAlpha = opacity;
  g.transform(1, .035, offset / depth, 1, 259 - 224, 99 - 94);
  const fade = g.createLinearGradient(0, 0, 0, depth);
  fade.addColorStop(0, color + "00");
  fade.addColorStop(.18, color + "ad");
  fade.addColorStop(.53, color + "d4");
  if (phase === "dusk") fade.addColorStop(.84, color + "b2");
  fade.addColorStop(1, color + "00");
  g.fillStyle = fade;
  for (const [x, width] of [[0, 16], [19, 42], [64, 16]]) g.fillRect(x, 0, width, depth);
  g.restore();
  if (phase === "dusk") {
    g.globalCompositeOperation = "destination-in";
    const edge = g.createLinearGradient(415 - 224, 0, tile.width, 0);
    edge.addColorStop(0, "#ffffff"); edge.addColorStop(1, "#ffffff00");
    g.fillStyle = edge;
    g.fillRect(0, 0, tile.width, tile.height);
  }
  floorArt.set(phase, tile);
  return tile;
}

export function drawWindowLightOnFloor(c: CanvasRenderingContext2D, light: DaylightMix) {
  const alpha = c.globalAlpha;
  c.save();
  c.globalAlpha = alpha * (1 - light.mix);
  c.drawImage(windowOnWood(light.from), 224, 94);
  if (light.mix > 0) {
    c.globalAlpha = alpha * light.mix;
    c.drawImage(windowOnWood(light.to), 224, 94);
  }
  c.restore();
}

const glazes = new Map<string, HTMLCanvasElement>();
function softGlaze(color: string) {
  const cached = glazes.get(color);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const g = tile.getContext("2d")!;
  radial(g, 48, 48, 48, color + "a8", color + "75", color + "00");
  glazes.set(color, tile);
  return tile;
}

/** Grazing sunlight on the wood and actual paving. Ground props and people draw over it. */
export function drawGardenSurfaceLight(c: CanvasRenderingContext2D, scene: "garden" | "challenge", light: DaylightMix) {
  const b = creeks[scene].bridge;
  function paint(phase: Phase, amount: number) {
    if ((phase !== "dawn" && phase !== "dusk") || amount <= 0) return;
    const east = phase === "dawn";
    const sun = softGlaze(east ? "#fff0bc" : "#ffb478");
    const sky = softGlaze(east ? "#c7dfeb" : "#caa9ce");
    c.save();
    c.globalAlpha *= amount;
    c.imageSmoothingEnabled = true;
    c.save();
    c.beginPath();
    c.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 7);
    c.clip();
    c.globalAlpha *= .78;
    // A cooler reflection falls across the opposite end of the deck.
    c.drawImage(sky, b.x + b.w * (east ? -.17 : .45), b.y - b.h * .3, b.w * .72, b.h * 1.6);
    c.drawImage(sun, b.x + b.w * (east ? .17 : -.28), b.y - b.h * .48, b.w * 1.12, b.h * 1.9);
    c.restore();
    c.globalAlpha *= .55;
    if (scene === "garden") {
      // The straight flagstones just north of the heart mosaic.
      c.translate(east ? 449 : 425, east ? 245 : 267);
      c.rotate(east ? -.16 : .17);
      c.drawImage(sun, -21, -42, 42, 84);
    } else {
      // Follow the stone path as it turns southwest, clear of the moss-stone trap.
      c.translate(east ? 407 : 393, east ? 299 : 305);
      c.rotate(-.36);
      c.drawImage(sun, -43, -14, 86, 28);
    }
    c.restore();
  }
  paint(light.from, 1 - light.mix);
  if (light.mix) paint(light.to, light.mix);
}
