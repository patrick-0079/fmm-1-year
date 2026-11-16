import type { Point } from "./core.ts";
import { townCanopyOutlines } from "./town-canopy-contours.ts";

const points = (p: number[][]): Point[] => p.map(([x, y]) => ({ x, y }));
/** Stable feet keep depth/collision unchanged; only the visible leaf edges vary. */
export const townCanopies = [
  [339,432],[659,359],[898,401],[1174,247],[1338,495],[1295,511],
  [597,721],[982,681],[975,747],[1076,790],[578,839],[541,899],
  [1033,976],[262,449],
].map(([x,y],index)=>({x,y,points:points(townCanopyOutlines[index])}));

export const festivalProps = [
  { kind: "balloons", x: 628, y: 415 },
  { kind: "balloons", x: 897, y: 490 },
  { kind: "balloons", x: 1204, y: 449 },
  { kind: "garland", x: 1284, y: 883 },
] as const;

export function drawTownSigns(c: CanvasRenderingContext2D) {
  c.save();
  // Small shop-front ribbons make the anniversary present on every street.
  for (const [x, y] of [
    [298, 222],
    [775, 227],
    [1180, 366],
    [220, 592],
    [865, 737],
    [1337, 790],
  ]) {
    c.fillStyle = "#98657c";
    c.fillRect(x - 28, y - 1, 56, 15);
    c.fillStyle = "#f3d6bb";
    c.fillRect(x - 26, y, 52, 12);
    c.fillStyle = "#b85f83";
    c.font = '8px "Microsoft YaHei","PingFang SC",sans-serif';
    c.textAlign = "center";
    c.fillText("芙芙 · 周年限定", x, y + 9);
    c.fillStyle = "#df90b3";
    c.fillRect(x - 31, y + 1, 4, 10);
    c.fillRect(x + 27, y + 1, 4, 10);
  }
  c.restore();
}

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
      c.fillStyle = "#8d715a";
      c.fillRect(dx - 2, -44, 4, 44);
      c.fillStyle = "#f3d28f";
      c.fillRect(dx - 4, -48, 8, 6);
    }
    c.strokeStyle = "#c69b7c";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-42, -40);
    c.lineTo(0, -30);
    c.lineTo(42, -40);
    c.stroke();
    for (let i = 0; i < 7; i++) {
      const dx = -33 + i * 11,
        dy = -38 + Math.sin(((i + 1) * Math.PI) / 8) * 8;
      c.fillStyle = ["#dea3c1", "#a3d0cf", "#eac87b"][i % 3];
      c.fillRect(dx - 3, dy, 7, 7);
      pixelHeart(c, dx - 2, dy + 1, "#fff0c9");
    }
  }
  c.restore();
}
