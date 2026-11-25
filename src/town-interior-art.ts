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

export function paintTownInterior(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix, effect?: RoomEffect) {
  const art = townInteriors[scene].art;
  paint(c, image, art.backgrounds.day, art.scale);
  const frames = art.blind ? (effect?.kind === "blind" ? art.blind.raised : art.blind.lowered) : art.skies;
  paint(c, image, frames[mix?.from ?? phase], art.scale);
  if (mix && mix.mix > 0) {
    c.save(); c.globalAlpha *= mix.mix; paint(c, image, frames[mix.to], art.scale); c.restore();
  }
  if (scene === "town-florist" && effect?.kind === "window") {
    c.save();
    c.fillStyle = "#80684555";
    c.fill(new Path2D("M87 42H125V54L87 59Z"));
    c.fillStyle = "#f7efc243";
    c.fill(new Path2D("M86 41L123 41 127 33 88 35Z"));
    c.strokeStyle = "#6b7351"; c.lineWidth = 1.4;
    c.stroke(new Path2D("M86 41L123 41 127 33 88 35ZM123 41L125 54M106 47v6l-3 3"));
    c.restore();
  }
}

export function paintTownInteriorLight(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix) {
  blended(c, image, townInteriors[scene].art.lights, phase, 1, mix);
}

export function interiorFurniture(
  image: HTMLImageElement, scene: TownInteriorId, phase: Phase, keepsakes: TownKeepsakes, effect: RoomEffect | undefined, time: number,
): DepthLayer[] {
  const art = townInteriors[scene].art;
  return art.props.map(prop => ({
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
