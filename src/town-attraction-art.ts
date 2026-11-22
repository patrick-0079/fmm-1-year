import type { DepthLayer, World } from "./world";
import { sceneArt } from "./scene-art";
import {
  blockBoard, flightRings, rabbitPlatforms, wishLawn,
} from "./town-attraction-layout";
import masks from "./town-playground-masks.generated.json";

const covers = masks.map(({ path, ...region }) => ({ ...region, mask: new Path2D(path) }));
export function townPlaygroundCovers(world: World): DepthLayer[] {
  const view = world.visibleArea;
  return covers.filter(({ x, y, w, h }) => x < view.x + view.w && x + w > view.x && y < view.y + view.h && y + h > view.y)
    .map(cover => ({ y: cover.depth, draw: c => world.drawMapCover(c, cover, cover.mask) }));
}

function drawSprite(c: CanvasRenderingContext2D, frame: 0 | 1) {
  c.drawImage(sceneArt.playgroundAnimations, 108 * frame, 0, 108, 74, -27, -36, 54, 37);
}

export function drawWishLights(c: CanvasRenderingContext2D, time: number, still: boolean) {
  if (still) return;
  const { x, y } = wishLawn;
  const pulse = (time + .5) % 4;
  c.save();
  c.globalAlpha = .32 + .27 * Math.cos(pulse * Math.PI / 2);
  c.fillStyle = "#fff4b8";
  for (const [dx, dy] of [[47.5, 39], [96.9, 48.7]]) {
    c.beginPath();
    c.arc(x + dx, y + dy, 1.6, 0, Math.PI * 2);
    c.fill();
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
        drawSprite(c, 0);
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
      drawSprite(c, 1);
      c.restore();
    },
  };
}

export function townAttractionLayers(time: number, still: boolean): DepthLayer[] {
  const actors = sceneArt.playgroundAnimations.naturalWidth ? [...rabbitLayers(time, still), kiteLayer(time, still)] : [];
  return [
    { y: blockBoard.y, draw: c => drawFallingBlock(c, time, still) },
    ...actors,
  ];
}
