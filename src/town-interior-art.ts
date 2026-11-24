import florist from "./assets/town-interiors/florist.webp";
import baker from "./assets/town-interiors/baker.webp";
import maker from "./assets/town-interiors/maker.webp";
import post from "./assets/town-interiors/post.webp";
import books from "./assets/town-interiors/books.webp";
import radio from "./assets/town-interiors/radio.webp";
import hall from "./assets/town-interiors/hall.webp";
import type { Phase } from "./day";
import type { DaylightMix } from "./daylight-mix";
import type { TownInteriorId, TownInteriorKey } from "./town-interior-id";
import type { RoomEffect } from "./town-interior-activities";
import { townInteriors } from "./town-interiors";
import type { DepthLayer } from "./world";
import { anniversary } from "./launch/anniversary";

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

export function paintTownInterior(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix, effect?: RoomEffect) {
  const { backgrounds: frames, scale, sign } = townInteriors[scene].art;
  paint(c, image, frames[mix?.from ?? phase], scale);
  if (mix && mix.mix > 0) {
    c.save(); c.globalAlpha *= mix.mix; paint(c, image, frames[mix.to], scale); c.restore();
  }
  if (scene === "town-florist" && effect?.kind === "window") {
    const [x, y] = frames.dawn;
    paint(c, image, [x + 43 * scale, y + 55 * scale, 90 * scale, 29 * scale, 43, 55], scale);
  }
  const { x, y, w, h, title, size, detail, date } = sign;
  // Use the game's CJK font at canvas resolution so the painted lettering stays
  // legible on high-density screens independently of the atlas builder's fonts.
  c.save();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#ffead0";
  c.font = `700 ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  c.fillText(title, x + w / 2, y + h * .38, w - 14);
  c.fillStyle = "#f6c68f";
  c.font = `${date ? 9 : 7.5}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  c.fillText(date ? `${anniversary.start} — ${anniversary.end}` : detail ?? "", x + w / 2, y + h * .73, w - 14);
  c.restore();
}

export function paintTownInteriorLight(c: CanvasRenderingContext2D, image: HTMLImageElement, scene: TownInteriorId, phase: Phase, mix?: DaylightMix) {
  const frames = townInteriors[scene].art.lights;
  c.save();
  c.globalAlpha = 1 - (mix?.mix ?? 0);
  paint(c, image, frames[mix?.from ?? phase]);
  if (mix && mix.mix > 0) {
    c.globalAlpha = mix.mix;
    paint(c, image, frames[mix.to]);
  }
  c.restore();
}

export function interiorFurniture(
  image: HTMLImageElement, scene: TownInteriorId, phase: Phase, keepsakes: readonly TownInteriorKey[], effect: RoomEffect | undefined, time: number,
): DepthLayer[] {
  const { props, models, scale } = townInteriors[scene].art;
  return props.map(prop => ({ y: prop.depth, draw: c => {
    const override = effect?.kind === "oven" && prop.name === "砖炉和炉膛" ? "dawn"
      : effect?.kind === "board" && prop.name === "手绘白板脚" ? (phase === "dawn" ? "dusk" : "dawn")
      : effect?.kind === "blind" && prop.name === "临池侧窗木座" ? "day"
      : effect?.kind === "sort" && prop.name === "分信格柜底" ? "day"
      : phase;
    paint(c, image, prop.variants[override], scale);
    if (prop.name === "七屋纪念展柜") {
      for (const key of keepsakes) {
        const lit = models[key];
        if (lit) paint(c, image, lit, scale);
      }
    }
    if (effect) paintWork(c, prop.name, effect, time);
  } }));
}

function paintWork(c: CanvasRenderingContext2D, name: string, effect: RoomEffect, time: number) {
  if (effect.kind === "drawer" && name === "材料抽屉柜") {
    c.fillStyle = "#58434b";
    c.fillRect(76, 113, 50, 13);
    c.fillStyle = "#ccaa84";
    c.fillRect(76, 124, 50, 5);
    c.fillStyle = "#b98d56";
    c.fillRect(81, 116, 12, 5);
    c.fillStyle = "#f2d89b";
    c.fillRect(102, 116, 16, 5);
    c.fillStyle = "#f9e3a9";
    for (let i = 0; i < 3; i++) c.fillRect(83 + i * 3, 117 + i % 2, 1, 1);
  } else if (effect.kind === "shadow" && name === "中央试光台") {
    c.save();
    c.fillStyle = "#514854";
    c.fillRect(290, 179, 29, 19);
    c.strokeStyle = "#dfc18a";
    c.beginPath(); c.arc(302, 188, 7, .4, 4.7); c.stroke();
    c.translate(302 + (effect.frame - 1) * 12, 189);
    c.fillStyle = effect.frame === 1 ? "#ffe39b" : "#d8bb7f";
    c.fill(star);
    c.restore();
  } else if (effect.kind === "radio" && name === "调音台") {
    const elapsed = Math.max(0, time - effect.start);
    c.fillStyle = "#2c4548";
    c.fillRect(67, 128, 36, 10);
    c.strokeStyle = "#f3d490";
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const y = 133 + Math.sin(i * 2.16 - elapsed * 14) * (i % 4 + .6);
      if (i === 0) c.moveTo(68, y); else c.lineTo(68 + 2.2 * i, y);
    }
    c.stroke();
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      c.fillStyle = i < 4 + 2 * Math.sin(elapsed * 10 + row) ? "#e3bd72" : "#696a76";
      c.fillRect(106 + i * 4, 128 + row * 5, 2.5, 2);
    }
    c.fillStyle = "#e37f71";
    c.fillRect(196, 127, 7, 4);
  } else if (effect.kind === "reel" && name === "手摇影箱柜") {
    c.save();
    c.fillStyle = "#54414a";
    c.fillRect(448, 97, 56, 25);
    c.fillStyle = "#d3a781";
    c.fillRect(451, 99, 50, 21);
    c.fillStyle = "#a58778";
    c.fill(new Path2D("M451 113L464 107H488L501 113V120H451Z"));
    c.strokeStyle = "#694f59";
    c.stroke(new Path2D("M455 113V105L460 102L465 105V111M487 111V106L492 103L497 106V113"));
    if (effect.frame >= 2) {
      c.stroke(new Path2D("M463 105Q475 112 491 104"));
      c.fillStyle = "#a65560";
      c.fill(new Path2D("M467 107L472 108L469 112ZM475 108L481 108L478 112ZM483 107L488 105L487 110Z"));
    }
    if (effect.frame === 3) {
      c.fillStyle = "#fae0a0";
      c.fill(new Path2D("M481 110A3 3 0 1 1 475 110A3 3 0 1 1 481 110Z"));
      c.stroke(new Path2D("M478 111V118"));
      c.fillRect(500, 125, 8, 3);
    }
    c.restore();
  }
}

const star = new Path2D("M0 -5L1.6 -1.8L5 -1.2L2.6 1.2L3.2 4.7L0 3L-3.2 4.7L-2.6 1.2L-5 -1.2L-1.6 -1.8Z");

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
