import type { Point } from "./core.ts";
import { southEdgeCanopyOutlines, townCanopyOutlines } from "./town-canopy-contours.ts";
import { pennantLift } from "./town-idle-motion.ts";

const points = (p: number[][]): Point[] => p.map(([x, y]) => ({ x, y }));
/** Stable feet keep depth/collision unchanged; only the visible leaf edges vary. */
export const townCanopies = [
  [339,432],[659,359],[898,401],[1174,247],[1338,495],[1295,511],
  [597,721],[982,681],[975,747],[1076,790],[578,839],[541,899],
  [1033,976],[262,449],
].map(([x,y],index)=>({x,y,points:points(townCanopyOutlines[index])}));

// These crowns hang over the south street from beyond the picture. Only the
// grounded trees above contribute trunks to the map's collision geometry.
export const southEdgeCanopies = southEdgeCanopyOutlines.map((outline, index) => ({
  x: [543, 758][index], y: 1025, points: points(outline),
}));

export const festivalProps = [
  { kind: "balloons", x: 628, y: 415 },
  { kind: "balloons", x: 897, y: 490 },
  { kind: "balloons", x: 1204, y: 449 },
  { kind: "garland", x: 1284, y: 883 },
] as const;

function pixelHeart(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  c.fillStyle = color;
  [
    [0, 1, 2, 2],
    [3, 1, 2, 2],
    [1, 3, 3, 1],
    [2, 4, 1, 1],
  ].forEach(([a, b, w, h]) =>
    c.fillRect(x + a * scale, y + b * scale, w * scale, h * scale),
  );
}
type BalloonArt = (x: number, y: number, color: string) => void;
const flagFabrics = [
  ["#f1bdce", "#d48fa9", "#aa6b85"],
  ["#b7dfd5", "#8cbfbb", "#648f91"],
  ["#f4d596", "#deb575", "#af8754"],
] as const;

function drawPennant(c: CanvasRenderingContext2D, index: number, time: number, wind: number) {
  const x = -33 + index * 11, slope = x < 0 ? 10 / 42 : -10 / 42;
  const y = -30 - Math.abs(x) * 10 / 42;
  const lift = wind*pennantLift(time, index), lean = lift * 4.4;
  const [light, fabric, fold] = flagFabrics[index % 3];
  c.save();
  c.translate(x, y);
  // Bunting is stitched along its top edge. Map the embroidered heart through
  // the same cloth transform so it folds into the cloth instead of sliding.
  c.transform(1, slope, lean / 8, 1 - lift * .48, 0, 0);
  const pennant = new Path2D();
  pennant.moveTo(-3.9, 0); pennant.lineTo(3.9, 0);
  pennant.lineTo(3.3 - lift, 6.9); pennant.lineTo(.6 - lift * 1.4, 9.1);
  pennant.lineTo(-3.3, 7.3); pennant.closePath();
  c.fillStyle = fabric; c.fill(pennant);
  c.strokeStyle = fold; c.lineWidth = .8; c.stroke(pennant);
  c.fillStyle = light; c.fillRect(-3.4, .5, 6.8, 1);
  c.save();
  c.translate(-.3 - .6 * lift, .15);
  c.scale(1 - lift * .48, 1);
  pixelHeart(c, -2.1, 2, "#fff0ce", .85);
  c.restore();
  // Slightly darker reverse edge rolls into view at the crest of the gust.
  c.fillStyle = fold;
  c.beginPath(); c.moveTo(3.5, 1);
  c.lineTo(3 - lift, 6.8); c.lineTo(.6 - lift * 1.4, 8.7);
  c.lineTo(2.8 - lift * 2.8, 6.1); c.closePath(); c.fill();
  c.restore();
}

function balloon(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  art?: BalloonArt,
) {
  if (art) {
    art(x, y, color);
    return;
  }
  c.fillStyle = "#80516e";
  c.fillRect(x - 6, y - 11, 12, 20);
  c.fillRect(x - 8, y - 7, 16, 12);
  c.fillStyle = color;
  c.fillRect(x - 5, y - 10, 10, 18);
  c.fillRect(x - 7, y - 6, 14, 10);
  c.fillStyle = "#fff1d2";
  c.fillRect(x - 3, y - 7, 2, 5);
  c.fillStyle = "#8b746a";
  c.fillRect(x, y + 8, 1, 25);
}
export function drawFestivalProp(
  c: CanvasRenderingContext2D,
  p: (typeof festivalProps)[number],
  time: number,
  balloonArt?: BalloonArt,
) {
  const { x, y } = p;
  c.save();
  c.translate(x, y);
  if (p.kind === "balloons") {
    const sway = Math.sin(time * 1.5 + x) * 1.2;
    balloon(c, -10 + sway, -36, "#db9cc3", balloonArt);
    balloon(c, 10 + sway, -41, "#a7cedd", balloonArt);
    balloon(c, sway, -52, "#edca8b", balloonArt);
    c.fillStyle = "#8c6d5a";
    c.fillRect(-10, -7, 20, 10);
    c.fillStyle = "#c59a77";
    c.fillRect(-8, -6, 16, 8);
    pixelHeart(c, -3, -6, "#f5c9cb");
  } else {
    for (const dx of [-42, 42]) {
      c.fillStyle = "#6d574859";
      c.beginPath(); c.ellipse(dx + 1.4, .4, 4.2, 1.2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#79523b"; c.fillRect(dx - 2, -43, 4, 43);
      c.fillStyle = "#be8b58"; c.fillRect(dx - 1.3, -42, 2.15, 41.8);
      c.fillStyle = "#dbab71"; c.fillRect(dx - 1.3, -36, .6, 24);
      c.fillStyle = "#9e6a43"; c.fillRect(dx - .15, -22, .5, 13);
      c.fillStyle = "#765036"; c.fillRect(dx - 2.8, -1.8, 5.6, 2);
      c.beginPath(); c.ellipse(dx, -45, 3.25, 3.6, 0, 0, Math.PI * 2);
      c.fillStyle = "#d2a65a"; c.fill(); c.strokeStyle = "#865e37"; c.lineWidth = .8; c.stroke();
      c.fillStyle = "#fff0b0"; c.fillRect(dx - 1.7, -47, 1.7, 1.25);
    }
  }
  c.restore();
}

export function drawFestivalGarland(
  c: CanvasRenderingContext2D,
  origin: Point,
  time: number,
  wind = 1,
) {
  c.save();
  c.translate(origin.x, origin.y);
  c.beginPath();
  c.moveTo(-42, -40);
  c.lineTo(0, -30);
  c.lineTo(42, -40);
  c.strokeStyle = "#86694f"; c.lineWidth = 1.75; c.stroke();
  c.strokeStyle = "#edd1a0"; c.lineWidth = .65; c.stroke();
  for (let i = 0; i < 7; i++) drawPennant(c, i, time, wind);
  for (const dx of [-42, 42]) {
    c.fillStyle = "#ad865a"; c.fillRect(dx-2.4, -40.5, 4.8, 2.5);
    c.fillStyle = "#f5d39d"; c.fillRect(dx-2.3, -40, 4.5, .8);
  }
  c.restore();
}
