import type { Point } from "./core.ts";

const points = (p: number[][]): Point[] => p.map(([x, y]) => ({ x, y }));
/** Silhouettes trace baked canopies. Only these leaves redraw above a walker. */
function canopy(x: number, y: number, rim: number[][]) {
  return { x, y, points: points(rim) };
}
export const townCanopies = [
  canopy(339,432, [[290,389],[299,365],[313,348],[312,335],[326,326],[346,321],
    [363,332],[370,353],[382,375],[377,398],[352,402],[338,410],[313,401]]),
  canopy(659,359, [[607,315],[614,297],[626,290],[628,274],[642,260],[662,255],
    [679,267],[676,285],[687,296],[694,319],[688,333],[666,336],[659,342],[631,334]]),
  canopy(898,401, [[857,366],[864,348],[876,337],[879,316],[887,307],[903,314],
    [915,329],[922,349],[933,363],[926,377],[908,382],[891,387],[867,382]]),
  canopy(1174,247, [[1128,176],[1140,157],[1168,149],[1195,161],[1209,185],[1215,211],
    [1197,229],[1166,230],[1142,220],[1124,199]]),
  canopy(1338,495, [[1314,460],[1322,447],[1335,440],[1346,444],[1357,456],[1357,477],
    [1348,486],[1333,485],[1320,481]]),
  canopy(1295,511, [[1248,487],[1256,469],[1263,447],[1277,437],[1286,423],[1303,426],
    [1312,442],[1322,457],[1322,477],[1312,490],[1294,496],[1281,499],[1264,495]]),
  canopy(597,721, [[572,693],[580,675],[586,668],[583,662],[591,657],[597,644],
    [604,661],[610,672],[612,681],[621,694],[619,704],[595,708],[574,705]]),
  canopy(982,681, [[948,639],[957,619],[962,607],[970,588],[978,573],[988,588],
    [996,607],[1003,623],[1013,640],[1010,657],[986,663],[969,665],[948,657]]),
  canopy(975,747, [[947,706],[954,693],[966,686],[979,679],[988,688],[999,695],
    [1003,709],[996,723],[981,725],[969,729],[950,720]]),
  canopy(1076,790, [[1038,764],[1048,745],[1054,731],[1052,724],[1064,711],[1075,684],
    [1081,708],[1091,716],[1087,724],[1102,742],[1110,765],[1081,772],[1058,773]]),
  canopy(578,839, [[529,799],[535,782],[541,761],[557,752],[574,741],[592,746],
    [600,761],[615,770],[628,787],[630,806],[611,813],[593,810],[569,816],[546,808]]),
  canopy(541,899, [[515,884],[525,862],[527,849],[535,844],[541,830],[547,845],
    [554,849],[555,859],[565,874],[566,884],[548,889],[531,891]]),
  canopy(1033,976, [[970,946],[977,926],[991,921],[988,908],[1007,897],[1011,879],
    [1027,867],[1047,872],[1057,889],[1073,897],[1072,917],[1084,941],[1070,953],
    [1046,958],[1021,957],[996,951]]),
  canopy(262,449, [[236,424],[243,413],[246,399],[251,390],[260,374],[264,383],
    [266,391],[276,398],[275,406],[287,422],[279,432],[257,436],[240,431]]),
];

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
