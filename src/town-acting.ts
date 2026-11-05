import type { DepthLayer, World } from "./world";
import { TOWN_FRAMES, type TownNpc } from "./town-data";
import { canTravelBetween, type Point } from "./core";
import { townScene } from "./town-map";
import { drawCakeSlice } from "./cake-party";
import bouquetUrl from "./assets/qingya-bouquet.webp";
import cakeUrl from "./assets/cake-slice-v11.webp";
import gesturesUrl from "./assets/town-gestures.webp";

export interface TownAct {
  npcId: string;
  pageId: string;
  elapsed: number;
}
const pictures = new Map<string, HTMLImageElement>();
function picture(url: string) {
  let image = pictures.get(url);
  if (!image) {
    image = new Image();
    image.src = url;
    pictures.set(url, image);
  }
  return image;
}
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (n: number) => Math.min(1, Math.max(0, n));
function ease(n: number) {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
}
const between = (a: number, b: number, mix: number) => a + (b - a) * mix;

// Both performers leave their marked position briefly. Trace their steps against
// the same street geometry as the player, excluding only their own resting feet.
const walkSpace = (name: string) => ({
  ...townScene,
  walls: townScene.walls.filter((w) => w.label !== "镇民 · " + name),
});
const catStreet = walkSpace("奶糖"),
  rabbitStreet = walkSpace("绒月");
const contactPoints = new Map<string, { target: Point; safe: Point }>();
const catDirections = new WeakMap<TownAct, number>();
function alongside(n: TownNpc, player: Point, fraction: number, gap: number): Point {
  const side = n.x <= player.x ? -1 : 1;
  const target = { x: player.x + side * gap, y: player.y + 1 };
  let contact = contactPoints.get(n.id);
  if (!contact || Math.hypot(target.x - contact.target.x, target.y - contact.target.y) > 1) {
    const geometry = n.id === "cat" ? catStreet : rabbitStreet;
    contact = { target, safe: n };
    for (let step = 5; step > 0; step--) {
      const at = { x: between(n.x, target.x, step / 5), y: between(n.y, target.y, step / 5) };
      if (canTravelBetween(n, at, geometry)) {
        contact.safe = at;
        break;
      }
    }
    contactPoints.set(n.id, contact);
  }
  return { x: between(n.x, contact.safe.x, fraction), y: between(n.y, contact.safe.y, fraction) };
}

const ink = "#664555",
  cream = "#fff4d7",
  rose = "#c76d87",
  gold = "#e7ad64";
type Brush = CanvasRenderingContext2D;
function rect(c: Brush, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function outline(c: Brush, x: number, y: number, w: number, h: number, color: string) {
  rect(c, ink, x, y, w, h);
  rect(c, color, x + 1, y + 1, w - 2, h - 2);
}
function stroke(c: Brush, color: string, coords: number[], width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(coords[0], coords[1]);
  for (let i = 2; i < coords.length; i += 2) c.lineTo(coords[i], coords[i + 1]);
  c.stroke();
}
function disk(c: Brush, color: string, x: number, y: number, rx: number, ry = rx) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function twinkle(c: Brush, x: number, y: number, size = 2) {
  rect(c, "#ffe69e", x - size, y - 0.55, 2 * size, 1.1);
  rect(c, "#fff5cd", x - 0.55, y - size, 1.1, 2 * size);
}
function envelope(c: Brush, x: number, y: number) {
  outline(c, x - 6, y - 3.5, 12, 8, "#f5dab0");
  stroke(c, "#b0806d", [x - 5, y - 2, x, y + 1.5, x + 5, y - 2], 0.9);
  disk(c, rose, x, y + 0.7, 1.55);
  rect(c, "#f7bfbe", x - 0.6, y - 0.2, 1, 0.8);
}
function camera(c: Brush, x: number, y: number, flash: boolean) {
  outline(c, x - 6, y - 4, 12, 8, "#81757c");
  outline(c, x - 3, y - 5.5, 6, 2.5, "#d7c3b1");
  rect(c, "#533f4e", x - 5, y - 0.5, 10, 3);
  disk(c, "#372e41", x + 0.8, y + 0.1, 3.15);
  disk(c, "#98c3bf", x + 0.8, y + 0.1, 2.15);
  disk(c, "#475c70", x + 0.9, y + 0.3, 1.35);
  rect(c, cream, x + 0.1, y - 1.1, 1, 0.9);
  rect(c, "#efcf93", x - 4.5, y - 2.6, 2, 1.6);
  if (flash) twinkle(c, x - 4, y - 3, 3.2);
}
function notebook(c: Brush, x: number, y: number, t: number) {
  outline(c, x - 4, y - 5, 9, 10, "#a4b7ad");
  rect(c, cream, x - 2.8, y - 3.8, 6.3, 7.6);
  rect(c, "#b89889", x - 2, y - 2, 3.6, 0.65);
  rect(c, "#b89889", x - 2, y, 2.8, 0.65);
  const pen = x + 1 + Math.sin(t * 8) * 1.3;
  stroke(c, "#615161", [pen, y + 1, pen + 3.8, y - 3.8], 1.3);
}

function book(c: Brush, x: number, y: number, closed: number) {
  const right = between(5, -4, closed);
  for (const [edge, color] of [
    [-5, "#f2ddba"],
    [right, "#fff0ce"],
  ] as const) {
    c.beginPath();
    c.moveTo(x, y - 3.5);
    c.lineTo(x + edge, y - 5);
    c.lineTo(x + edge, y + 3);
    c.lineTo(x, y + 4);
    c.closePath();
    c.strokeStyle = "#71534b";
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = color;
    c.fill();
    if (Math.abs(edge) > 2)
      for (const row of [-1.9, 0.2, 2]) {
        stroke(c, "#c29f83", [x + edge * 0.24, y + row, x + edge * 0.8, y + row - 0.8], 0.55);
      }
  }
  if (closed > 0.7) {
    outline(c, x - 5, y - 4.5, 5.8, 8.5, "#7faaa0");
    rect(c, "#dfbd77", x - 4, y - 3.4, 3.5, 1);
    rect(c, "#ca8493", x - 1, y + 2, 1, 3);
  }
}

function postbox(c: Brush, slotY: number) {
  const x = 12;
  rect(c, "#77514d", x + 1, slotY + 11, 9, 2);
  outline(c, x, slotY - 2, 12, 14, "#b87470");
  rect(c, "#c8897f", x - 1, slotY - 2, 14, 2);
  rect(c, ink, x + 1, slotY - 0.2, 10, 1.8);
  rect(c, "#9f5963", x + 0.7, slotY + 8, 10.5, 2.8);
  rect(c, cream, x + 3, slotY + 3.4, 6, 3.8);
  stroke(c, "#b78574", [x + 3, slotY + 3.4, x + 6, slotY + 5.3, x + 9, slotY + 3.4], 0.65);
}
function drawWhiteboardInk(c: Brush, page: string, t: number, still: boolean, h: number) {
  // Illustration on the little physical board; all of Lili's writing is also
  // in the dialogue HUD at full text size.
  c.save();
  c.translate(0.085 * h, -0.27 * h);
  c.rotate(0.08);
  const wipe = page === "offer" && !still && t < 0.5;
  if (wipe) {
    rect(c, "#b5c2b3", -4 + ease(t / 0.5) * 5, -1.2, 2.8, 1.6);
  } else if (page === "start") {
    c.strokeStyle = "#626d67";
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-1.5, -0.8);
    c.bezierCurveTo(-1.5, -3, 2.7, -2.6, 1.3, -0.4);
    c.quadraticCurveTo(-0.2, 0.4, -0.2, 1.25);
    c.stroke();
    disk(c, "#626d67", -0.2, 2.1, 0.46);
  } else {
    const written = still ? 1 : ease((t - (page === "offer" ? 0.5 : 0)) / 0.7);
    c.beginPath();
    c.rect(-4, -3, 8 * written, 6);
    c.clip();
    stroke(c, "#768172", [-3, -1.6, -1.5, -1.8, 0.1, -1.1, 1, -1.7, 2.7, -1.4], 0.7);
    stroke(c, "#768172", [-3, 0.3, -1.3, 0.2, 0.1, 0.7, 1.3, 0.1], 0.7);
    stroke(c, "#ba7683", [1.6, 1.2, 2.2, 0.8, 2.8, 1.5, 3.4, 0.9, 3.8, 1.6, 2.8, 2.3, 1.6, 1.2], 0.7);
  }
  c.restore();
}
function actorProps(c: Brush, n: TownNpc, page: string, t: number, still: boolean) {
  const f = TOWN_FRAMES[n.sprite],
    h = (f.h * 43) / 337,
    y = -h * 0.28;
  switch (n.id) {
    case "post": {
      if (page === "letter" || page === "delivered") {
        const drop = page === "delivered" ? (still ? 1 : ease(t / 0.75)) : 0;
        if (drop < 0.98) {
          c.save();
          c.beginPath();
          c.rect(-12, -55, 45, 55 + y - 0.1);
          c.clip();
          envelope(c, 3 + drop * 15, y - 4 + drop * 8);
          c.restore();
        }
        if (page === "delivered") {
          rect(c, ink, 13, y + 1.25, 10, 1);
        }
      }
      break;
    }
    case "baker":
      if (["start", "reserved", "offer"].includes(page)) drawWhiteboardInk(c, page, t, still, h);
      break;
    case "welcome":
      if (page === "pin" || page === "start" || page === "silent") {
        const x = page === "pin" ? 3 : 0,
          top = y - (page === "pin" ? 3 : 0);
        stroke(c, "#b86679", [x - 2, top + 4, x, top, x + 2, top + 4], 1.4);
        disk(c, "#ad7f4c", x, top, 3.2);
        disk(c, "#f3ce75", x, top, 2.4);
        disk(c, rose, x, top, 1.25);
        if (page === "pin" && (still || t < 0.8)) twinkle(c, x + 3, top - 2);
      }
      break;
    case "maker":
      if (page === "fit" || page === "joke") {
        stroke(c, "#80694e", [-6, y + 1, -4, y + 6, 0, y + 7, 4, y + 4, 7, y + 1], 2.6);
        stroke(c, "#f5d29a", [-6, y, -4, y + 5, 0, y + 6, 4, y + 3, 7, y], 1.8);
        for (const [x, dy] of [
          [-5, 2],
          [-3, 5],
          [0, 6],
          [3, 4],
          [6, 1],
        ])
          rect(c, "#9d6e55", x, y + dy, 1, 1);
      }
      break;
    case "walker":
      if (page === "blush" || page === "reveal") {
        disk(c, "#e69a9e", -5, -h * 0.47, 2.2, 1);
        disk(c, "#e69a9e", 5, -h * 0.47, 2.2, 1);
      }
      break;
    case "photo-visitor":
      camera(
        c,
        2,
        page === "start" ? -h * 0.51 : y - 1,
        page === "start" && (still || (t < 1.4 && t % 0.48 < 0.13)),
      );
      break;
    case "radio-host":
      if (page === "notes") notebook(c, 4, y, t);
      break;
    case "books":
      book(c, 1, y - 0.5, page === "blessing" ? (still ? 1 : ease(t / 0.7)) : 0);
      if (page === "start" || page === "marked") {
        const height = page === "marked" ? (1 - ease(t / 0.65)) * 4 + 2 : 5;
        rect(c, "#c07376", 3.2, -h * 0.39 - height, 1.7, height + 2);
        rect(c, gold, 3.2, -h * 0.39 - height, 1.7, 1.4);
      }
      break;
    case "blocks-keeper": {
      const left = still ? 0 : 3 * (1 - ease(t / 0.8));
      for (const [x, dy, hue] of [
        [-2 - left, 0, "#c8879e"],
        [-6 - left, 0, "#c8879e"],
        [-6 - left, -4, "#c8879e"],
        [2 + left, 0, "#8eb2ae"],
        [2 + left, -4, "#8eb2ae"],
      ] as const) {
        outline(c, x, y + dy, 4, 4, hue);
        rect(c, cream, x + 0.7, y + dy + 0.6, 1.2, 0.6);
      }
      break;
    }
    case "hop-keeper":
    case "flight-keeper":
    case "snake-keeper":
    case "florist": {
      if (page !== "start") break;
      const left = n.id === "hop-keeper" || n.id === "flight-keeper" || n.id === "florist";
      const hand = left ? -1 : 1,
        offset = still ? 0 : Math.sin(Math.min(t, 1) * Math.PI) * 1.4;
      const cloth: Record<string, string> = {
        "hop-keeper": "#9bbbd6",
        "flight-keeper": "#b592c9",
        "snake-keeper": "#97c2a5",
        florist: "#f3e4c7",
      };
      stroke(c, ink, [hand * 6, y - 1, hand * 10, y - 2, hand * 12, y - 5 - offset], 3.8);
      stroke(c, cloth[n.id], [hand * 6, y - 1, hand * 9.6, y - 2, hand * 11.5, y - 4.5 - offset], 2.8);
      disk(c, "#f6d1ad", hand * 12, y - 5 - offset, 1.5);
      break;
    }
  }
}

function nameplate(c: Brush, n: TownNpc, at: Point, visited: boolean) {
  c.font = '8px "Microsoft YaHei","PingFang SC",sans-serif';
  c.textAlign = "center";
  const width = c.measureText(n.name).width + 10;
  rect(c, "#fff4dce8", at.x - width / 2, at.y + 5, width, 12);
  c.fillStyle = visited ? "#766e56" : "#885c70";
  c.fillText(n.name, at.x, at.y + 14);
}

function drawBouquet(c: Brush, x: number, y: number) {
  const flowers = picture(bouquetUrl);
  if (flowers.naturalWidth)
    c.drawImage(flowers, x - 8, y - 12, 16, (16 * flowers.naturalHeight) / flowers.naturalWidth);
}
function presentLayer(
  n: TownNpc,
  page: string,
  t: number,
  player: Point,
  still: boolean,
): DepthLayer | undefined {
  const flowers = n.id === "florist" && (page === "show" || page === "receive");
  const pastry = n.id === "baker" && ["hand", "offer", "eat", "covered"].includes(page);
  if (!flowers && !pastry) return;
  const receive = page === "receive" || page === "hand";
  const mix = receive ? (still ? 1 : ease(t / 0.65)) : Number(page === "offer" || page === "eat");
  const foot = { x: between(n.x + 2, player.x + 3, mix), y: between(n.y, player.y, mix) };
  return {
    y: foot.y + 0.2,
    draw(c) {
      const x = foot.x,
        y = foot.y - 13;
      if (flowers) {
        drawBouquet(c, x, y);
        return;
      }
      if (page === "covered") {
        const lid = still ? 0 : (1 - ease(t / 0.65)) * 8;
        disk(c, "#8d7985", x, y + 2, 7.8, 2.6);
        disk(c, "#f4e2d1", x, y + 1.4, 6.9, 1.8);
        c.fillStyle = "#b7cacb";
        c.beginPath();
        c.ellipse(x, y + 1 - lid, 6.7, 6, 0, Math.PI, 2 * Math.PI);
        c.fill();
        disk(c, gold, x, y - 5.2 - lid, 1.4);
        stroke(c, "#f5e9df", [x - 4.5, y - 1.8 - lid, x - 3.4, y - 3.3 - lid], 1);
      } else {
        const bites = page === "eat" ? Number(t >= 1) + Number(t >= 2) : 0;
        const lift =
          page === "eat" && !still
            ? Math.sin(Math.PI * clamp((t - 0.15) / 0.85)) * 4 + Math.sin(Math.PI * clamp(t - 1.1)) * 4
            : 0;
        if (bites === 2) {
          disk(c, "#c19fa7", x, y + 0.8, 5.4, 1.8);
          disk(c, cream, x, y + 0.4, 4.9, 1.2);
        } else drawCakeSlice(c, x, y + 1 - lift, bites === 1 ? 0.72 : 0.94, picture(cakeUrl));
      }
    },
  };
}

const sheetCell = 128;
function gestureCell(c: Brush, frame: number, height: number, reverse = false) {
  const sheet = picture(gesturesUrl);
  if (!sheet.naturalWidth) return false;
  c.save();
  if (reverse) c.scale(-1, 1);
  c.drawImage(
    sheet,
    (frame % 4) * sheetCell,
    Math.floor(frame / 4) * sheetCell,
    sheetCell,
    sheetCell,
    -height / 2,
    -height,
    height,
    height,
  );
  c.restore();
  return true;
}
function bakerPose(page: string) {
  if (["finished", "return"].includes(page)) return 3;
  if (["start", "offer", "reserved"].includes(page)) return 1;
  if (["hand", "eat", "covered"].includes(page)) return 2;
  return 0;
}
export function drawResidentPortrait(c: Brush, npc: TownNpc, sprites: HTMLImageElement, page: string) {
  const special =
    npc.id === "baker"
      ? bakerPose(page)
      : npc.id === "bunny" && page !== "release"
        ? 4
        : npc.id === "cat" && page === "rub"
          ? 5
          : npc.id === "cat" && page === "walk"
            ? 6
            : undefined;
  if (special !== undefined) {
    c.save();
    c.translate(24, 52);
    const drawn = gestureCell(c, special, 47);
    c.restore();
    if (drawn) return;
  }
  if (!sprites.naturalWidth) return;
  const frame = TOWN_FRAMES[npc.sprite],
    width = (47 * frame.w) / frame.h;
  c.drawImage(sprites, frame.x, frame.y, frame.w, frame.h, (48 - width) / 2, 5, width, 47);
}
export function townResidentLayers(
  npc: TownNpc,
  sprites: HTMLImageElement,
  world: World,
  visited: boolean,
  time: number,
  act?: TownAct,
): DepthLayer[] {
  const performance = act?.npcId === npc.id ? act : undefined,
    page = performance?.pageId ?? "",
    t = performance?.elapsed ?? 0;
  const still = motion.matches,
    f = TOWN_FRAMES[npc.sprite];
  const height = (f.h * 43) / 337,
    width = (f.w * 43) / 337;
  let foot: Point = npc,
    cell: number | undefined,
    reverse = false,
    lean = 0;
  if (npc.id === "baker") cell = bakerPose(page);
  if ((npc.id === "bunny" && page) || (npc.id === "cat" && page === "rub")) {
    const near = 1 - ease((Math.hypot(world.player.x - npc.x, world.player.y - npc.y) - 54) / 16);
    const approach = still ? 1 : page === "start" || page === "rub" ? ease(t / 0.45) : 1;
    const release = page === "release" ? 1 - ease((t - 0.65) / 0.7) : 1;
    foot = alongside(npc, world.player, near * approach * release, npc.id === "cat" ? 11 : 13);
    if (release > 0.02) cell = npc.id === "cat" ? 5 : 4;
    reverse = foot.x > world.player.x;
    if (!still && page === "rub") lean = Math.sin(t * 5) * 0.08;
  } else if (npc.id === "cat" && page === "walk" && t < 4 && performance) {
    const direction = catDirections.get(performance) ?? (world.player.x > npc.x ? -1 : 1);
    catDirections.set(performance, direction);
    const progress = still
      ? Number(t > 0.45 && t < 3)
      : ease((t - 0.45) / 0.95) - ease((t - 2.7) / 1.05);
    foot = { x: npc.x + direction * progress * 26, y: npc.y + progress * 5 };
    reverse = t >= 2.45 !== direction < 0;
    cell = 6 + (still ? 0 : Math.floor(progress * 6) % 2);
  } else if (npc.id === "walker" && page) {
    const distance = Math.max(1, Math.hypot(world.player.x - npc.x, world.player.y - npc.y));
    const step = (2 * (page === "start" && !still ? ease(t / 0.32) : 1)) / distance;
    foot = { x: npc.x + step * (world.player.x - npc.x), y: npc.y + step * (world.player.y - npc.y) };
  }
  const bob = still ? 0 : Math.sin(time * 1.7 + npc.sprite) * 0.5;
  if (page === "decline" || page === "silent" || page === "blush" || page === "joke")
    lean += still ? 0.04 : Math.sin(Math.min(t, 1) * Math.PI) * 0.085;
  if (page === "start" && npc.id === "welcome") lean = 0.07;
  if (page === "model" || page === "move") lean = page === "move" ? -0.12 : 0.055;
  const lowered =
    npc.id === "welcome" && (page === "start" || page === "silent" || page === "awake")
      ? 1.8 * (page === "awake" ? (still ? 0 : 1 - ease(t / 0.45)) : 1)
      : npc.id === "walker" && page === "blush"
        ? 1
        : 0;
  const layers: DepthLayer[] = [
    {
      y: foot.y + 0.05,
      draw(c) {
        if (!sprites.naturalWidth) return;
        c.save();
        disk(c, "#3f51432e", foot.x, foot.y, 9, 3);
        c.translate(foot.x, foot.y + bob);
        c.rotate(lean);
        if (cell === undefined || !gestureCell(c, cell, height, reverse)) {
          if (lowered > 0) {
            const head = Math.round(f.h * 0.56),
              ratio = head / f.h;
            c.drawImage(
              sprites,
              f.x,
              f.y + head,
              f.w,
              f.h - head,
              -width / 2,
              -height * (1 - ratio),
              width,
              height * (1 - ratio),
            );
            c.drawImage(
              sprites,
              f.x,
              f.y,
              f.w,
              head,
              -width / 2,
              -height + lowered,
              width,
              height * ratio,
            );
          } else c.drawImage(sprites, f.x, f.y, f.w, f.h, -width / 2, -height, width, height);
        }
        if (npc.id === "post") postbox(c, -height * 0.28);
        if (page) actorProps(c, npc, page, still ? 1 : t, still);
        c.restore();
        if (!page && Math.hypot(world.player.x - foot.x, world.player.y - foot.y) < 100) {
          c.save();
          nameplate(c, npc, foot, visited);
          c.restore();
        }
      },
    },
  ];
  const gift = presentLayer(npc, page, t, world.player, still);
  if (gift) layers.push(gift);
  if (npc.id === "baker" && (page === "finished" || (page === "eat" && t > 2.3)) && world.facing === 0) {
    const { x, y } = world.player;
    layers.push({
      y: y + 0.25,
      draw(c) {
        c.save();
        c.translate(Math.round(x), Math.round(y));
        for (const eye of [-4, 4]) {
          disk(c, "#ffdbca", eye, -24.8, 2.6, 2.15);
          stroke(
            c,
            "#8c545d",
            [eye - 1.7, -24.4, eye - 0.6, -25.25, eye + 0.6, -25.25, eye + 1.65, -24.4],
            0.8,
          );
        }
        c.restore();
      },
    });
  }
  return layers;
}
