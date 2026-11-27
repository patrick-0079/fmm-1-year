import florist from "./assets/town-interiors/florist.webp";
import baker from "./assets/town-interiors/baker.webp";
import maker from "./assets/town-interiors/maker.webp";
import post from "./assets/town-interiors/post.webp";
import books from "./assets/town-interiors/books.webp";
import radio from "./assets/town-interiors/radio.webp";
import hall from "./assets/town-interiors/hall.webp";
import type { Phase } from "./day";
import type { DaylightMix } from "./daylight-mix";
import type { TownInteriorId } from "./town-interior-id";
import { drawShelfKeepsake } from "./town-keepsake-art";
import { townKeepsakeChoice, type TownKeepsakes } from "./town-keepsakes";
import type { RoomEffect } from "./town-interior-activities";
import { hallCollectionSlots, townInteriors } from "./town-interiors";
import type { DepthLayer } from "./world";

export const townInteriorArt: Record<TownInteriorId, string> = {
  "town-florist": florist, "town-baker": baker, "town-maker": maker, "town-post": post,
  "town-books": books, "town-radio": radio, "town-hall": hall,
};
type Frame = typeof townInteriors["town-hall"]["art"]["backgrounds"][Phase];

function paint(c: CanvasRenderingContext2D, image: HTMLImageElement, [x, y, w, h, left, top]: Frame, scale = 1) {
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(image, x, y, w, h, left, top, w / scale, h / scale);
  c.restore();
}

function blended(c: CanvasRenderingContext2D, image: HTMLImageElement, frames: Record<Phase, Frame>, phase: Phase, scale: number, mix?: DaylightMix) {
  c.save();
  c.globalAlpha *= 1 - (mix?.mix ?? 0);
  paint(c, image, frames[mix?.from ?? phase], scale);
  c.restore();
  if (mix && mix.mix > 0) {
    c.save(); c.globalAlpha *= mix.mix; paint(c, image, frames[mix.to], scale); c.restore();
  }
}

// Paint the top-hung sash inside the third greenhouse pane. Both hinges stay
// on its existing header while the bottom rail swings out towards the street.
function paintOpenVent(c: CanvasRenderingContext2D, image: HTMLImageElement, [sx, sy]: Frame) {
  c.save();
  c.scale(.5, .5); // coordinates in the original 1200 × 800 painting
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.beginPath();
  c.rect(170.5, 78, 83, 64);
  c.clip();

  const glass = new Path2D("M172.4 79.6H251.8L245.3 122.7H178.9Z");
  const sheen = c.createLinearGradient(173, 80, 248, 123);
  sheen.addColorStop(0, "#ecfff222");
  sheen.addColorStop(.49, "#fffae009");
  sheen.addColorStop(1, "#94b9a51a");
  c.fillStyle = sheen;
  c.fill(glass);
  c.fillStyle = "#fff8df20";
  c.fill(new Path2D("M234 82L237.6 82 229 95.8 227 96.7Z"));

  // Each stay joins the jamb to the moving rail, below the glass.
  const stays = new Path2D("M172.4 134.4L179.3 122.1M251.7 134.4L244.6 122.1");
  c.lineCap = "round";
  c.strokeStyle = "#726044";
  c.lineWidth = 1.65;
  c.stroke(stays);
  c.strokeStyle = "#d8bb80";
  c.lineWidth = .65;
  c.stroke(stays);

  // Reuse the green glazing bars and their painted bevels from this window.
  for (const [hingeX, offset, woodX] of [[171.1, 6.5, 167], [249.8, -6.5, 251.3]]) {
    c.save();
    c.transform(1, 0, offset / 43, 1, hingeX, 79.3);
    c.drawImage(image, sx + woodX, sy + 84, 5.9, 50, 0, 0, 3.2, 43);
    c.restore();
  }
  c.drawImage(image, sx + 174, sy + 139.3, 74, 6.2, 177.5, 120.4, 69.1, 3.6);
  c.restore();
}

function windowFrames(art: typeof townInteriors[TownInteriorId]["art"], effect?: RoomEffect) {
  return art.blind ? (effect?.kind === "blind" ? art.blind.raised : art.blind.lowered) : art.skies;
}

export function interiorWindowLayers(image: HTMLImageElement, scene: TownInteriorId, phase: Phase, effect?: RoomEffect): DepthLayer[] {
  const art = townInteriors[scene].art, frame = windowFrames(art, effect)[phase];
  const layers: DepthLayer[] = [{ y: 0, outline: { image, frame, scale: art.scale }, draw: c => paint(c, image, frame, art.scale) }];
  if (scene === "town-florist" && effect?.kind === "window")
    layers.push({ y: 0, draw: c => paintOpenVent(c, image, art.backgrounds.day) });
  return layers;
}

export function paintTownInterior(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix, effect?: RoomEffect) {
  const art = townInteriors[scene].art;
  paint(c, image, art.backgrounds.day, art.scale);
  const frames = windowFrames(art, effect);
  paint(c, image, frames[mix?.from ?? phase], art.scale);
  if (mix && mix.mix > 0) {
    c.save(); c.globalAlpha *= mix.mix; paint(c, image, frames[mix.to], art.scale); c.restore();
  }
  if (scene === "town-florist" && effect?.kind === "window") {
    paintOpenVent(c, image, art.backgrounds.day);
  }
}

export function paintTownInteriorLight(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix) {
  blended(c, image, townInteriors[scene].art.lights, phase, 1, mix);
}

export function interiorFurniture(
  image: HTMLImageElement, scene: TownInteriorId, phase: Phase, keepsakes: TownKeepsakes, effect: RoomEffect | undefined, time: number,
  showOutlines = false,
): DepthLayer[] {
  const art = townInteriors[scene].art;
  return art.props.map(prop => ({
    outline: showOutlines ? { image, frame: prop.variants.day, scale: art.scale } : undefined,
    y: prop.depth, draw: c => {
      paint(c, image, prop.variants[phase], art.scale);
      if (prop.name === "手绘白板脚") {
        const side = effect?.kind === "board" ? (phase === "dawn" ? "dusk" : "dawn") : phase;
        if (side !== "day") paintRecipe(c, image, art.backgrounds.day, side);
      }
      if (prop.name === "砖炉和炉膛" && phase === "night" && effect?.kind !== "oven") {
        c.save(); c.fillStyle = "#392b3980";
        c.fill(new Path2D("M44 131V111Q45 90 75 90Q104 90 108 110V131Z")); c.restore();
      }
      if (prop.name === "七屋纪念展柜" && art.collection) {
        for (const key of keepsakes.items) drawShelfKeepsake(c, key, townKeepsakeChoice(keepsakes, key), art.collection[key]);
        c.save();
        c.fillStyle = "#795337"; c.fillRect(287, 167.7, 24, 5.7);
        c.fillStyle = "#ffe8ae"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = 'bold 5.4px Georgia, serif';
        c.fillText(keepsakes.items.length + " / " + hallCollectionSlots.length, 299, 170.8);
        c.restore();
      }
      if (effect) paintWork(c, image, art.backgrounds.day, prop.name, effect, time);
    }
  }));
}

function paintRecipe(c: CanvasRenderingContext2D, image: HTMLImageElement, [sx, sy]: Frame, side: "dawn" | "dusk" | "night") {
  c.save();
  // Sample the blank margin of the same parchment under the ink.
  c.drawImage(image, sx + 451 * 2, sy + 87 * 2, 14 * 2, 10 * 2, 452, 89, 55, 43);
  c.lineWidth = 1.2; c.strokeStyle = "#b17251"; c.fillStyle = "#eac18c";
  if (side === "night") {
    c.stroke(new Path2D("M460 103H494L498 117H457ZM459 120H496"));
    c.fillStyle = "#c09a57"; c.translate(488, 97); c.fill(star);
  } else {
    for (const [i, x] of [462, 476, 491].entries()) {
      const radius = side === "dawn" ? 2.3 + i * 1.4 : 5;
      c.beginPath(); c.ellipse(x, 109, radius, radius * .9, i * .2, 0, 2 * Math.PI); c.fill(); c.stroke();
      if (side === "dusk") {
        c.fillStyle = "#bb6b56"; c.beginPath(); c.arc(x, 109, 2.2, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#eac18c";
      }
    }
    c.stroke(new Path2D(side === "dawn" ? "M462 120Q478 119 491 117L488 115M491 117l-2 3" : "M460 120q12 1 26 0m3-1 3 2 5-6"));
  }
  c.restore();
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  c.save(); c.translate(x, y); c.scale(rx, ry);
  const light = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  light.addColorStop(0, color); light.addColorStop(1, "rgba(255,195,95,0)");
  c.fillStyle = light; c.fillRect(-1, -1, 2, 2); c.restore();
}

function paintWork(c: CanvasRenderingContext2D, image: HTMLImageElement, [sx, sy]: Frame, name: string, effect: RoomEffect, time: number) {
  c.save();
  c.lineCap = "round";
  if (effect.kind === "oven" && name === "砖炉和炉膛") {
    glow(c, 76, 124, 27, 13, "rgba(255,177,58,.85)");
  } else if (effect.kind === "drawer" && name === "材料抽屉柜") {
    c.fillStyle = "#513729"; c.fillRect(76, 115, 24, 12);
    c.drawImage(image, sx + 76 * 2, sy + 117 * 2, 48, 20, 76, 123, 24, 10);
    c.fillStyle = "#d5af65";
    for (const x of [81, 87, 93]) { c.beginPath(); c.ellipse(x, 120.5, 2.3, 1.1, -.2, 0, 2 * Math.PI); c.fill(); }
  } else if (effect.kind === "sort" && name === "分信格柜底") {
    c.translate(66, 114); c.rotate(-.14);
    c.drawImage(image, sx + 77 * 2, sy + 100 * 2, 17 * 2, 10 * 2, -10, -6, 20, 12);
    c.fillStyle = "#b7634b"; c.beginPath(); c.arc(1, 0, 1.7, 0, 2 * Math.PI); c.fill();
  } else if (effect.kind === "shadow" && name === "中央试光台") {
    const x = 304 + (effect.frame - 1) * 8;
    glow(c, x, 186, 15, 8, "rgba(255,223,141,.74)");
    c.translate(x, 186); c.fillStyle = "#fff1b2"; c.fill(star);
  } else if (effect.kind === "radio" && name === "调音台") {
    const elapsed = Math.max(0, time - effect.start);
    for (const x of [158, 172]) {
      glow(c, x, 132, 8, 4, "rgba(255,211,123,.64)");
      c.strokeStyle = "#715336"; c.lineWidth = .8;
      c.beginPath(); c.moveTo(x, 134.5); c.lineTo(x + 3 * Math.sin(elapsed * 9 + x), 130); c.stroke();
    }
    glow(c, 205, 150, 4, 2.6, "#ffb585");
  } else if (effect.kind === "reel" && name === "手摇影箱柜") {
    for (let i = 0; i < 3; i++) {
      const x = 452 + i * 18;
      if (i < effect.frame) glow(c, x + 7, 100, 9, 13, "rgba(255,224,152,.36)");
      else { c.fillStyle = "rgba(54,36,46,.83)"; c.fillRect(x, 91, 14, 19); }
    }
  }
  c.restore();
}

const star = new Path2D("M0 -4L1.3 -1.2L4.2 -.7L2 1.2L2.6 4L0 2.5L-2.6 4L-2 1.2L-4.2 -.7L-1.3 -1.2Z");

export function paintHallSideSign(c: CanvasRenderingContext2D, x: number, y: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "#55424f55";
  c.fillRect(-9, -1, 18, 3);
  c.fillStyle = "#795e55";
  c.fillRect(-7, -15, 2, 16);
  c.fillRect(6, -15, 2, 16);
  c.fillStyle = "#f2d2a0";
  c.strokeStyle = "#775752";
  c.fillRect(-13, -23, 27, 16);
  c.strokeRect(-13, -23, 27, 16);
  c.fillStyle = "#704d51";
  c.font = '7px "Microsoft YaHei", sans-serif';
  c.textAlign = "center";
  c.fillText("纪念馆", 0, -13);
  c.stroke(new Path2D("M-5 -10H5M2 -12L5 -10L2 -8"));
  c.restore();
}
