import type { DepthLayer } from "./world";
import { sceneArt } from "./scene-art";
import {
  blockBoard, flightPad, flightRings, rabbitPlatforms, townAttractionBases, wishLawn,
} from "./town-attraction-layout";

const sprites = {
  stump: 0, moon: 1, cloud: 2, board: 3, ring: 4,
  smallRing: 5, ringCloud: 6, peachRabbit: 7, smallRingCloud: 8, kite: 9, flightPad: 10,
} as const;
type Sprite = keyof typeof sprites;
type Placement = { sprite: Sprite; x: number; y: number };
const raisedProps: readonly Placement[] = [...rabbitPlatforms, ...flightRings];

// At 2× resolution, the bottom-center anchor of every sprite is (158, 216).
const cellWidth = 316, cellHeight = 224, baseline = 216;
function drawSprite(c: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number,
  from = 0, to = cellWidth / 2, earLift = 0) {
  const index = sprites[sprite];
  const sx = (index % 5) * cellWidth + from * 2, sy = Math.floor(index / 5) * cellHeight;
  const dx = Math.round(x) - cellWidth / 4 + from, dy = Math.round(y) - baseline / 2;
  const w = to - from;
  if (earLift > 0) {
    // Only the lilac rabbit's ears move. The cloud and its supports stay fixed.
    const belowEars = 60;
    c.drawImage(sceneArt.attractions, sx, sy, w * 2, belowEars * 2,
      dx, dy - earLift, w, belowEars + earLift);
    c.drawImage(sceneArt.attractions, sx, sy + belowEars * 2, w * 2, cellHeight - belowEars * 2,
      dx, dy + belowEars, w, cellHeight / 2 - belowEars);
    return;
  }
  c.drawImage(sceneArt.attractions, sx, sy, w * 2, cellHeight, dx, dy, w, cellHeight / 2);
}

export function drawAttractionGround(c: CanvasRenderingContext2D, time: number, still: boolean) {
  if (!sceneArt.attractions.naturalWidth) return;
  c.save();
  c.fillStyle = "#523c3142";
  for (const { x, y, w, h } of townAttractionBases) {
    c.beginPath();
    c.ellipse(x + w / 2, y + h / 2 + 2, w / 2 + 2, h / 3, 0, 0, Math.PI * 2);
    c.fill();
  }
  drawSprite(c, flightPad.sprite, flightPad.x, flightPad.y);
  if (sceneArt.wishLawn.naturalWidth) {
    const { x, y, w, h } = wishLawn;
    c.drawImage(sceneArt.wishLawn, x, y, w, h);
    if (!still) {
      const pulse = (time + .5) % 4;
      c.globalAlpha = .32 + .27 * Math.cos(pulse * Math.PI / 2);
      c.fillStyle = "#fff4b8";
      for (const [dx, dy] of [[47.5, 39.0], [96.9, 48.7]]) {
        c.beginPath();
        c.arc(x + dx, y + dy, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  c.restore();
}

function rabbitLayers(time: number, still: boolean): DepthLayer[] {
  const [stump, moon] = rabbitPlatforms;
  const cycle = (time + .42) % 6;
  const returning = !still && cycle >= 3.65;
  const fraction = still ? .57 : Math.min(1, (returning ? cycle - 3.65 : cycle) / 1.05);
  const position = returning ? 1 - fraction : fraction;
  const lift = Math.sin(Math.PI * fraction);
  const peachX = stump.x + 18 + (moon.x - stump.x - 22) * position;
  const peachY = stump.y - 19 + (moon.y - 27 - (stump.y - 19)) * position - 14 * lift;
  return [
    {
      // Keep the jumping rabbit above both platforms during the short arc.
      y: (position > .55 ? moon.y : stump.y) + .2,
      draw: c => {
        c.save();
        if (lift > .25) {
          const trailX = peachX + (returning ? 11 : -17), trailY = peachY + 9;
          const sign = returning ? -1 : 1;
          c.lineCap = "round";
          c.lineWidth = 1.2;
          c.strokeStyle = "#fff1ce";
          c.globalAlpha = .84 * lift;
          for (const offset of [0, 6]) {
            c.beginPath();
            c.moveTo(trailX - offset * sign, trailY + offset / 2);
            c.quadraticCurveTo(trailX + (3 - offset) * sign, trailY - 9 + offset / 2,
              trailX + (10 - offset) * sign, trailY - 9 + offset / 2);
            c.stroke();
          }
          c.globalAlpha = 1;
        }
        c.translate(Math.round(peachX), Math.round(peachY));
        if (returning && !still) c.scale(-1, 1);
        drawSprite(c, "peachRabbit", 0, 0);
        c.restore();
      },
    },
  ];
}

function drawFallingBlock(c: CanvasRenderingContext2D, time: number, still: boolean) {
  const cycle = (time + 2.2) % 6;
  if (still || cycle > 1.7) return;
  const progress = Math.min(1, cycle / .92);
  const lift = (1 - progress) ** 2;
  // The domino passes through the two empty sockets along the top of the slanted board.
  c.save();
  c.globalAlpha = Math.min(1, cycle * 9, (1.7 - cycle) * 4);
  c.translate(blockBoard.x + 17 + lift * 6, blockBoard.y - 82 - lift * 17);
  c.rotate(-Math.PI / 2 * lift);
  c.transform(1, .12, -.31, .88, 0, 0);
  for (const x of [-13, 0]) {
    c.fillStyle = "#4c8577";
    c.fillRect(x, -5, 13, 11);
    c.fillStyle = "#77c6a7";
    c.fillRect(x + 1, -4, 11, 8);
    c.fillStyle = "#d6efd0";
    c.fillRect(x + 1, -4, 11, 1);
    c.fillRect(x + 1, -3, 1, 6);
  }
  c.restore();
}

function kiteLayer(time: number, still: boolean): DepthLayer {
  const turn = time * Math.PI * 2 / 6.4;
  const progress = still ? .3 : (1 - Math.cos(turn)) / 2;
  const [small, large] = flightRings;
  const x = Math.round(large.x - 19 + (small.x - large.x + 20) * progress);
  const y = Math.round(large.y - 37 + progress * 3 + (still ? 0 : Math.sin(turn * 2) * 3));
  return {
    y: Math.min(large.y - .2, large.y - (x - large.x) * .37),
    draw: c => {
      const sway = still ? 0 : Math.sin(turn * 3) * 4;
      c.save();
      c.translate(x, y);
      // Each ribbon has an outer fold and a second, narrower silk highlight.
      c.lineWidth = .7;
      for (const [sign, reach, tipY] of [[-1, 62 - 14 * progress, 15], [1, 77 - 41 * progress, -16]] as const) {
        c.save();
        c.scale(sign, 1);
        c.beginPath();
        c.moveTo(3, -10);
        c.bezierCurveTo(21, 12, reach - 17, tipY - sway, reach, tipY + sway - 4);
        c.lineTo(reach - 5, tipY + sway + 2);
        c.lineTo(reach + 1, tipY + sway + 5);
        c.bezierCurveTo(reach - 23, tipY + 8, 19, 17, 3, -7);
        c.closePath();
        c.fillStyle = "#eb8199";
        c.strokeStyle = "#b25270";
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(4, -9);
        c.bezierCurveTo(20, 15, reach - 23, tipY + 4, reach - 3, tipY + sway + 1);
        c.strokeStyle = "#ffd3c9";
        c.stroke();
        c.restore();
      }
      c.rotate(still ? -.04 : .065 * Math.sin(turn));
      drawSprite(c, "kite", 0, 0);
      c.restore();
    },
  };
}

export function townAttractionLayers(time: number, still: boolean): DepthLayer[] {
  if (!sceneArt.attractions.naturalWidth) return [];
  const earCycle = time % 4.3;
  const earLift = still || earCycle >= .5 ? 0 : 1.4 * Math.sin(Math.PI * earCycle / .5);
  const [small, large] = flightRings;
  return [
    ...raisedProps.map(({ sprite, x, y }) => ({
      y, draw: (c: CanvasRenderingContext2D) => drawSprite(c, sprite, x, y, 0, cellWidth / 2, sprite === "cloud" ? earLift : 0),
    })),
    { y: small.y - 4, draw: c => drawSprite(c, "smallRingCloud", small.x, small.y) },
    { y: large.y - 11, draw: c => drawSprite(c, "ringCloud", large.x, large.y) },
    // The platform slopes toward the street, so its near and far edges have different depths.
    ...[[0, 40, -20], [40, 85, -12], [85, cellWidth / 2, -2]].map(([a, b, depth]) => ({
      y: blockBoard.y + depth,
      draw: (c: CanvasRenderingContext2D) => drawSprite(c, blockBoard.sprite, blockBoard.x, blockBoard.y, a, b),
    })),
    { y: blockBoard.y, draw: c => drawFallingBlock(c, time, still) },
    ...rabbitLayers(time, still),
    kiteLayer(time, still),
  ];
}
