import type { Point } from "./core.ts";
import { arcadePatios, arcadeConnectors } from "./town-surfaces.ts";

const points = (p: number[][]): Point[] => p.map(([x, y]) => ({ x, y }));
/** Silhouettes trace baked canopies. Only these leaves redraw above a walker. */
export const townCanopies = [
  {
    x: 360,
    y: 440,
    points: points([
      [306, 372],
      [319, 348],
      [351, 335],
      [382, 342],
      [404, 360],
      [422, 382],
      [411, 403],
      [378, 412],
      [347, 405],
      [318, 401],
    ]),
  },
  {
    x: 648,
    y: 354,
    points: points([
      [609, 303],
      [620, 281],
      [643, 266],
      [666, 275],
      [683, 297],
      [694, 325],
      [677, 344],
      [646, 341],
      [621, 336],
      [604, 320],
    ]),
  },
  {
    x: 908,
    y: 381,
    points: points([
      [865, 345],
      [879, 324],
      [899, 320],
      [920, 327],
      [939, 343],
      [945, 363],
      [927, 379],
      [901, 377],
      [878, 372],
    ]),
  },
  {
    x: 1174,
    y: 247,
    points: points([
      [1128, 176],
      [1140, 157],
      [1168, 149],
      [1195, 161],
      [1209, 185],
      [1215, 211],
      [1197, 229],
      [1166, 230],
      [1142, 220],
      [1124, 199],
    ]),
  },
  {
    x: 1303,
    y: 530,
    points: points([
      [1256, 458],
      [1269, 438],
      [1298, 431],
      [1326, 443],
      [1343, 466],
      [1344, 490],
      [1322, 509],
      [1293, 505],
      [1270, 494],
      [1254, 477],
    ]),
  },
  {
    x: 1242,
    y: 537,
    points: points([
      [1200, 480],
      [1215, 460],
      [1244, 456],
      [1270, 471],
      [1284, 493],
      [1277, 513],
      [1257, 527],
      [1228, 520],
      [1205, 510],
    ]),
  },
  {
    x: 600,
    y: 703,
    points: points([
      [565, 678],
      [577, 650],
      [594, 620],
      [611, 648],
      [628, 679],
      [617, 695],
      [584, 698],
    ]),
  },
  {
    x: 1042,
    y: 717,
    points: points([
      [1006, 666],
      [1018, 643],
      [1041, 636],
      [1068, 652],
      [1081, 676],
      [1071, 698],
      [1043, 705],
      [1018, 697],
    ]),
  },
  {
    x: 554,
    y: 884,
    points: points([
      [517, 830],
      [527, 808],
      [551, 800],
      [577, 815],
      [588, 839],
      [578, 860],
      [551, 869],
      [527, 854],
    ]),
  },
  {
    x: 994,
    y: 969,
    points: points([
      [948, 916],
      [963, 893],
      [987, 884],
      [1016, 898],
      [1037, 927],
      [1022, 949],
      [990, 956],
      [964, 947],
    ]),
  },
  {
    x: 212,
    y: 435,
    points: points([
      [167, 366],
      [181, 344],
      [212, 338],
      [242, 351],
      [258, 375],
      [252, 405],
      [222, 423],
      [190, 415],
      [170, 391],
    ]),
  },
];

export const festivalProps = [
  { kind: "arch", x: 450, y: 962 },
  { kind: "cake", x: 759, y: 471 },
  { kind: "balloons", x: 628, y: 415 },
  { kind: "balloons", x: 897, y: 490 },
  { kind: "balloons", x: 1204, y: 449 },
  { kind: "garland", x: 1284, y: 883 },
] as const;

function trace(c: CanvasRenderingContext2D, p: Point[]) {
  c.beginPath();
  p.forEach((v, i) => (i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)));
  c.closePath();
}
export function drawTownPaving(
  c: CanvasRenderingContext2D,
  paint: (c: CanvasRenderingContext2D, p: Point[]) => void,
) {
  c.save();
  for (const p of [...arcadePatios.map((p) => p.points), ...arcadeConnectors]) {
    paint(c, p);
    trace(c, p);
    c.strokeStyle = "#a5a16a88";
    c.lineWidth = 1;
    c.stroke();
  }
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
function balloon(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
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
  cake?: HTMLImageElement,
) {
  const { x, y } = p;
  c.save();
  c.translate(x, y);
  if (p.kind === "arch") {
    for (const side of [-1, 1]) {
      c.fillStyle = "#8f6775";
      c.fillRect(side * 43 - 4, -52, 8, 54);
      c.fillStyle = "#f1d8b6";
      c.fillRect(side * 43 - 2, -50, 4, 51);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? "#e8b6d0" : "#f9deb0";
        c.fillRect(side * 43 - 5, -48 + i * 10, 10, 5);
      }
      balloon(c, side * 43, -63, side < 0 ? "#e9a2c4" : "#a7d5d0");
      c.fillStyle = "#d2ae76";
      c.fillRect(side * 43 - 8, -2, 16, 5);
    }
    c.fillStyle = "#87576e";
    c.fillRect(-46, -61, 92, 17);
    c.fillStyle = "#f7e4bf";
    c.fillRect(-43, -59, 86, 12);
    c.fillStyle = "#af6688";
    c.font = '10px "Microsoft YaHei","PingFang SC",sans-serif';
    c.textAlign = "center";
    c.fillText("芙芙 一周年快乐", 0, -50);
    for (let i = 0; i < 7; i++) {
      c.fillStyle = ["#db89ac", "#a9c6d0", "#e7c171"][i % 3];
      c.fillRect(-35 + i * 11, -39, 7, 7);
    }
  } else if (p.kind === "cake") {
    c.fillStyle = "#927358";
    c.fillRect(-20, -2, 40, 16);
    c.fillStyle = "#bd976b";
    c.fillRect(-24, -5, 48, 9);
    c.fillStyle = "#f7e5c4";
    c.fillRect(-22, -7, 44, 5);
    if (cake?.complete && cake.naturalWidth)
      c.drawImage(cake, -25, -53, 50, 47);
    c.fillStyle = "#775876";
    c.fillRect(-18, 5, 36, 10);
    c.fillStyle = "#fff0c7";
    c.font = '6px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.textAlign = "center";
    c.fillText("FUFU · 1 YEAR", 0, 12);
  } else if (p.kind === "balloons") {
    const sway = Math.sin(time * 1.5 + x) * 1.2;
    balloon(c, -10 + sway, -36, "#db9cc3");
    balloon(c, 10 + sway, -41, "#a7cedd");
    balloon(c, sway, -52, "#edca8b");
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
