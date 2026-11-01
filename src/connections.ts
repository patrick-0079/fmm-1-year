import type { Point } from "./core.ts";
import type { SceneId } from "./maps.ts";
export const townGardenTrail: Point[] = [
  // Branch before the rose arch; paving must not cover its flowers or frame.
  { x: 462, y: 451 },
  { x: 493, y: 447 },
  { x: 527, y: 453 },
  { x: 580, y: 479 },
  { x: 637, y: 500 },
  { x: 675, y: 534 },
  { x: 662, y: 545 },
  { x: 625, y: 519 },
  { x: 578, y: 502 },
  { x: 523, y: 477 },
  { x: 494, y: 472 },
  { x: 462, y: 476 },
];
export function drawConnections(
  c: CanvasRenderingContext2D,
  scene: SceneId,
  paint: (c: CanvasRenderingContext2D, p: Point[]) => void,
) {
  c.save();
  if (scene === "garden") {
    paint(c, townGardenTrail);
    const x = 650,
      y = 550;
    for (const side of [-1, 1]) {
      c.fillStyle = "#8d715e";
      c.fillRect(x + side * 32 - 3, y - 55, 6, 58);
      c.fillStyle = "#dfbca1";
      c.fillRect(x + side * 32 - 1, y - 54, 2, 56);
      c.fillStyle = "#edc97b";
      c.fillRect(x + side * 32 - 5, y - 57, 10, 5);
    }
    c.fillStyle = "#835e71";
    c.fillRect(x - 49, y - 66, 98, 18);
    c.fillStyle = "#fff0c8";
    c.fillRect(x - 46, y - 64, 92, 14);
    c.fillStyle = "#a06383";
    c.font = '10px "SimSun",monospace';
    c.textAlign = "center";
    c.fillText("晚安周年小镇 →", x, y - 53);
    for (let i = 0; i < 7; i++) {
      c.fillStyle = ["#d797b7", "#b1cbd5", "#e9cb8f"][i % 3];
      c.fillRect(x - 29 + i * 9, y - 43, 6, 7);
    }
    c.fillStyle = "#927158";
    c.fillRect(513, 439, 5, 22);
    c.fillStyle = "#f4dfb5";
    c.fillRect(488, 430, 55, 15);
    c.fillStyle = "#936779";
    c.font = '8px "SimSun",monospace';
    c.fillText("小镇 · 沿石路走", 516, 440);
  }
  if (scene === "town") {
    c.fillStyle = "#8a6a55";
    c.fillRect(489, 934, 4, 22);
    c.fillStyle = "#f5dfb6";
    c.fillRect(467, 920, 67, 18);
    c.fillStyle = "#96657e";
    c.font = '9px "SimSun",monospace';
    c.textAlign = "center";
    c.fillText("← 周年花园", 500, 932);
  }
  c.restore();
}
