import type { DepthLayer, World } from "./world";
import { TOWN_FRAMES,TOWN_NPCS, type TownNpc } from "./town-data";
import { drawTownWork } from "./town-work-art";
import { paintedBounds } from "./town-work-bounds";
import { drawResidentWalk } from "./resident-walk";
import type { ResidentMotion } from "./town-routines";
import { canTravelBetween, facingFromMovement, type Point } from "./core";
import type { Facing } from "./equipment";
import { townScene } from "./town-map";
import { drawCakeSlice } from "./cake-party";
import bouquetUrl from "./assets/qingya-bouquet.webp";
import cakeUrl from "./assets/cake-slice-v11.webp";
import gesturesUrl from "./assets/town-gestures.webp";
import { sceneArt } from "./scene-art";
import { drawYeshenhua, yeshenhuaPose } from "./yeshenhua-art";
import { drawTownGuest, townGuestPose } from "./town-guest-art";
import { pageTurn } from "./town-idle-motion.ts";

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
const contactPoints = new Map<string, { target: Point; origin:Point; safe: Point }>();
const catWalks = new WeakMap<TownAct, Point>();
function safeGestureTarget(from: Point, target: Point, geometry: typeof catStreet) {
  for (let step = 5; step > 0; step--) {
    const at = { x: between(from.x, target.x, step / 5), y: between(from.y, target.y, step / 5) };
    if (canTravelBetween(from, at, geometry)) return at;
  }
  return from;
}
function alongside(n: TownNpc, player: Point, fraction: number, gap: number): Point {
  const side = n.x <= player.x ? -1 : 1;
  const target = { x: player.x + side * gap, y: player.y + 1 };
  let contact = contactPoints.get(n.id);
  if (!contact || Math.hypot(n.x-contact.origin.x,n.y-contact.origin.y)>1 ||
    Math.hypot(target.x - contact.target.x, target.y - contact.target.y) > 1) {
    const geometry = n.id === "cat" ? catStreet : rabbitStreet;
    contact = { target, origin:n, safe:safeGestureTarget(n,target,geometry) };
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

function book(c: Brush, x: number, y: number, closed: number, turning: number) {
  // The atlas depicts a closed green book against Motao's pinafore. Repaint
  // just that footprint inside her sleeves before drawing the open spread.
  c.fillStyle = "#574a3d";
  c.beginPath(); c.moveTo(x - 2.8, y - 4.8); c.lineTo(x + 4.2, y - 4.8);
  c.lineTo(x + 5.5, y - 2.6); c.lineTo(x + 4.6, y + 2.6);
  c.lineTo(x - 3.1, y + 2.8); c.lineTo(x - 4.1, y); c.closePath(); c.fill();
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
  if (turning > 0 && turning < 1) {
    const angle = Math.PI * turning;
    const edge = 5 * Math.cos(angle), lift = 3.2 * Math.sin(angle);
    c.beginPath();
    c.moveTo(x, y + 3.8);
    c.quadraticCurveTo(x + edge * .45, y + 3.4 - lift * .6, x + edge, y + 2.6 - lift);
    c.quadraticCurveTo(x + edge + .7 * lift, y - 1.4 - lift, x + edge, y - 4.6 - lift);
    c.quadraticCurveTo(x + edge * .5, y - 3.7 - lift * .5, x, y - 3.4);
    c.closePath(); c.fillStyle = turning < .5 ? "#fff4d8" : "#e8d5ad"; c.fill();
    c.strokeStyle = "#ac9477"; c.lineWidth = .5; c.stroke();
    if (Math.abs(edge) > 1.8) {
      for (const offset of [-1, .7])
        stroke(c, "#c4ab8c", [x + edge * .23, y + offset - lift * .25,
          x + edge * .78, y + offset - .8 - lift * .8], .45);
    }
  }
  if (closed > 0.7) {
    outline(c, x - 5, y - 4.5, 5.8, 8.5, "#7faaa0");
    rect(c, "#dfbd77", x - 4, y - 3.4, 3.5, 1);
    rect(c, "#ca8493", x - 1, y + 2, 1, 3);
  }
  // Fingers wrap the outer margins: the page-turning hand travels with the
  // corner then presses the left page down before returning to the margin.
  disk(c, "#b8826b", x - 4.9, y + 2.6, 1.6, 1.2);
  disk(c, "#f8d8bc", x - 4.9, y + 2.2, 1.35, 1.05);
  const reach = turning ? Math.sin(Math.PI * turning) : 0;
  const fingerX = x + between(4.1, -.6, closed) - 4.6 * reach;
  const fingerY = y + 2.2 - reach * 4.5;
  disk(c, "#c18d76", fingerX, fingerY, 1.55, 1.25);
  disk(c, "#ffdec2", fingerX, fingerY - .35, 1.33, 1.07);
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
    h = n.appearance === "yeshenhua" ? 43 : (f.h * 43) / 337,
    y = -h * 0.28;
  switch (n.id) {
    case "post": {
      if (page === "letter" || page === "delivered") {
        const home=TOWN_NPCS.find(person=>person.id==="post")!;
        const inboxX=home.x-n.x, inboxY=home.y-n.y;
        const drop = page === "delivered" ? (still ? 1 : ease(t / 0.75)) : 0;
        if (drop < 0.98) {
          c.save();
          c.beginPath();
          c.rect(-40, -65, 100, 65 + y + inboxY - 0.1);
          c.clip();
          envelope(c, 3 + drop * (15+inboxX), y - 4 + drop * (8+inboxY));
          c.restore();
        }
        if (page === "delivered") {
          rect(c, ink, 13 + inboxX, y + 1.25 + inboxY, 10, 1);
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
    case "books": {
      const bookX = 1.8, bookY = -h * .35;
      const turning = page || still ? 0 : pageTurn(t);
      book(c, bookX, bookY, page === "blessing" ? (still ? 1 : ease(t / 0.7)) : 0, turning);
      if (page === "start" || page === "marked") {
        const height = page === "marked" ? (1 - ease(t / 0.65)) * 4 + 2 : 5;
        rect(c, "#c07376", bookX + 1.2, bookY - 2.2 - height, 1.4, height + 2);
        rect(c, gold, bookX + 1.2, bookY - 2.2 - height, 1.4, 1);
      }
      break;
    }
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

const orangeOfferSeconds = 0.42;
function orangeLayer(npc: TownNpc, page: string, t: number, world: World, still: boolean, reverse: boolean): DepthLayer | undefined {
  const tasting = page === "taste-orange";
  const receiving = page === "receive-orange";
  if (!tasting && !receiving) return;
  if (receiving && !still && t < orangeOfferSeconds) return;
  if (tasting && t >= 1.2) return;

  const progress = receiving && !still ? ease((t - orangeOfferSeconds) / 0.32) : 1;
  if (progress === 1 && world.facing === 3) return;
  const lift = tasting ? (still ? 7 : 7 * ease(t / 0.65)) : 0;
  const leftHand = world.facing === 1 || (world.facing === 0 && reverse);
  const palm = { x: world.player.x + (leftHand ? -7 : 7), y: world.player.y - 14 - lift };
  const x = between(npc.x + (reverse ? 11 : -11), palm.x, progress);
  const y = between(npc.y - 20, palm.y, progress);
  return {
    y: between(npc.y, world.player.y, progress) + 0.2,
    draw(c) {
      c.save();
      if (tasting && !still) c.globalAlpha *= 1 - ease((t - 0.82) / 0.38);
      if (progress === 1) {
        disk(c, "#ae7e80", x + 1.2, y + 3.5, 2.4, 1.6);
        disk(c, "#ffe0c8", x + 1.2, y + 3.2, 1.9, 1.2);
      }
      if (tasting) {
        c.fillStyle = "#b5663e";
        c.beginPath();
        c.arc(x, y, 3.8, 0, Math.PI);
        c.fill();
        c.fillStyle = "#ffbe68";
        c.beginPath();
        c.arc(x, y, 2.9, 0, Math.PI);
        c.fill();
        rect(c, "#fff0ab", x - 2.8, y - 0.2, 5.6, 0.7);
        rect(c, "#ffe1a0", x - 0.4, y, 0.8, 2.1);
      } else {
        disk(c, "#a75938", x, y, 4, 3.6);
        disk(c, "#f3a24b", x, y - 0.25, 3.35, 2.95);
        rect(c, "#ffd07a", x - 1.9, y - 1.6, 1.6, 0.9);
        stroke(c, "#72824b", [x - 0.9, y - 3.2, x, y - 4.1, x + 1.9, y - 4.5], 1.1);
      }
      c.restore();
    },
  };
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
  if (npc.appearance === "yeshenhua") {
    drawYeshenhua(c,sceneArt.yeshenhua,24,52,47,yeshenhuaPose(page));
    return;
  }
  if (npc.appearance === "guest") {
    drawTownGuest(c, sceneArt.townGuests, npc.sprite, 24, 52, 47, townGuestPose(page));
    return;
  }
  const special =
    npc.id === "baker"
      ? bakerPose(page)
      : npc.id === "bunny" && page && page !== "release"
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
export function residentPlacement(npc: TownNpc, player: Point, act?: TownAct) {
  const performance = act?.npcId === npc.id ? act : undefined,
    page = performance?.pageId ?? "",
    t = performance?.elapsed ?? 0,
    still = motion.matches;
  let foot: Point = npc,
    cell: number | undefined,
      walk: { facing: Facing; distance: number } | undefined,
    reverse = npc.id === "xiaoyou" && !!page && player.x > npc.x,
    lean = 0;
  if (npc.id === "baker") cell = bakerPose(page);
  if ((npc.id === "bunny" && page) || (npc.id === "cat" && page === "rub")) {
    const near = 1 - ease((Math.hypot(player.x - npc.x, player.y - npc.y) - 54) / 16);
    const approach = still ? 1 : page === "start" || page === "rub" ? ease(t / 0.45) : 1;
    const release = page === "release" ? 1 - ease((t - 0.65) / 0.7) : 1;
    foot = alongside(npc, player, near * approach * release, npc.id === "cat" ? 11 : 13);
    if (release > 0.02) cell = npc.id === "cat" ? 5 : 4;
    reverse = foot.x > player.x;
    if (!still && page === "rub") lean = Math.sin(t * 5) * 0.08;
  } else if (npc.id === "cat" && page === "walk" && t < 4 && performance) {
    let target = catWalks.get(performance);
    if (!target) {
      const direction = player.x > npc.x ? -1 : 1;
      // The memorial street slopes northeast. A conversation can begin halfway
      // along the patrol, so shorten this walk wherever a wall cuts it off.
      target = safeGestureTarget(npc, { x:npc.x + direction * 26, y:npc.y - direction * 12 }, catStreet);
      catWalks.set(performance, target);
    }
    const progress = still
      ? Number(t > 0.45 && t < 3)
      : ease((t - 0.45) / 0.95) - ease((t - 2.7) / 1.05);
    foot = { x: between(npc.x,target.x,progress), y: between(npc.y,target.y,progress) };
    reverse = t >= 2.45 !== target.x < npc.x;
    cell = 6;
    if (!still && progress > 0 && progress < 1) {
      const dx=target.x-npc.x, dy=target.y-npc.y, returning=t>=2.7;
      walk = {
        facing: facingFromMovement(0,returning ? -dx : dx,returning ? -dy : dy),
        distance: Math.hypot(dx,dy) * (returning ? 2-progress : progress),
      };
    }
  } else if (npc.id === "walker" && page) {
    const distance = Math.max(1, Math.hypot(player.x - npc.x, player.y - npc.y));
    const step = (2 * (page === "start" && !still ? ease(t / 0.32) : 1)) / distance;
    foot = { x: npc.x + step * (player.x - npc.x), y: npc.y + step * (player.y - npc.y) };
  }
  return { foot, cell, reverse, lean, walk };
}

export function townResidentLayers(
  npc: TownNpc,
  sprites: HTMLImageElement,
  world: World,
  visited: boolean,
  time: number,
  act?: TownAct,
  placement = residentPlacement(npc, world.player, act),
  routine?: ResidentMotion,
  pinGiven=false,
): DepthLayer[] {
  const performance = act?.npcId === npc.id ? act : undefined,
    page = performance?.pageId ?? "",
    t = performance?.elapsed ?? 0;
  const still = motion.matches,
    f = TOWN_FRAMES[npc.sprite];
  const guest = npc.appearance === "guest";
  const height = npc.appearance === "yeshenhua" ? 43 : (f.h * 43) / 337,
    width = (f.w * 43) / 337;
  const { foot, cell, reverse } = placement;
  let lean = placement.lean;
  const bob = still || guest || routine ? 0 : Math.sin(time * 1.7 + npc.sprite) * 0.5;
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
        const sheet = guest ? sceneArt.townGuests : npc.appearance === "yeshenhua" ? sceneArt.yeshenhua : sprites;
        if (!sheet.naturalWidth) return;
        c.save();
        c.globalAlpha *= routine?.opacity ?? 1;
        disk(c, "#3f51432e", foot.x, foot.y, 9, 3);
        c.translate(foot.x, foot.y + bob);
        c.rotate(lean);
        const walk = placement.walk ?? (!page && routine?.walking && !still
          ? {facing:routine.facing,distance:routine.odometer} : undefined);
        const lifePose = walk
          ? drawResidentWalk(c,npc.id,{x:0,y:0},walk.facing,walk.distance,paintedBounds[npc.id][3] / 2)
          : !page && routine && drawTownWork(c,npc,routine.workTime,still,pinGiven);
        if (!lifePose && guest) {
          const pose = townGuestPose(page) &&
            (page !== "receive-orange" || (!still && t < orangeOfferSeconds));
          if (reverse) c.scale(-1, 1);
          drawTownGuest(c, sheet, npc.sprite, 0, 0, 44, pose);
          if (page === "show-star-card" && (still || t < 0.9)) {
            c.globalAlpha *= still ? 0.85 : 1 - ease(t / 0.9);
            twinkle(c, -11, -22.5, 2.2);
          }
        } else if (!lifePose && npc.appearance === "yeshenhua") {
          drawYeshenhua(c,sceneArt.yeshenhua,0,0,height,yeshenhuaPose(page));
        } else if (!lifePose && (cell === undefined || !gestureCell(c, cell, height, reverse))) {
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
        if (page && !guest) actorProps(c, npc, page, still ? 1 : t, still);
        else if (npc.id === "books" && !routine?.walking) actorProps(c, npc, "", time, still);
        c.restore();
        if (!page && (!routine || routine.status==="present") && world.activeCueId !== "npc-" + npc.id && Math.hypot(world.player.x - foot.x, world.player.y - foot.y) < 100) {
          c.save();
          nameplate(c, npc, foot, visited);
          c.restore();
        }
      },
    },
  ];
  if (npc.id==="post") {
    const home=TOWN_NPCS.find(person=>person.id==="post")!;
    layers.push({y:home.y-.1,draw(c){
      c.save();c.translate(home.x,home.y);postbox(c,-height*.28);c.restore();
    }});
  }
  const gift = npc.id === "xiaoyou"
    ? orangeLayer(npc, page, t, world, still, reverse)
    : presentLayer(npc, page, t, world.player, still);
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
