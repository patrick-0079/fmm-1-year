import { motif, type PixelMotif } from "./arcade-pixels";
import { applyStationeryTheme } from "./stationery-themes";
import { townInteriorKeys } from "./town-interior-id";
import { drawTownKeepsake, prepareTownKeepsakeArt, townKeepsakeArtReady } from "./town-keepsake-art";
import { townKeepsakeBadge } from "./town-keepsakes";

type Ink = CanvasRenderingContext2D;
type Point = [number, number];
const ink = "#674755",
  cream = "#ffefd2",
  gold = "#ddac59",
  rose = "#d97d99";
const leaf = "#6b9671",
  blue = "#70a4ad",
  lilac = "#9982b4";

function rect(c: Ink, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function polygon(c: Ink, color: string, ...corners: Point[]) {
  c.beginPath();
  c.moveTo(...corners[0]);
  for (const [x, y] of corners.slice(1)) c.lineTo(x, y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function line(c: Ink, color: string, ...points: Point[]) {
  // One-pixel stair steps keep even fine strings and rays clear at stamp size.
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1],
      [bx, by] = points[i];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let t = 0; t <= steps; t++) {
      rect(c, Math.round(ax + ((bx - ax) * t) / steps), Math.round(ay + ((by - ay) * t) / steps), 1, 1, color);
    }
  }
}
function oval(c: Ink, x: number, y: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    rect(c, x - half, y + dy, half * 2 + 1, 1, color);
  }
}
function ring(c: Ink, x: number, y: number, r: number, tint: string, gap = false) {
  const arc = (radius: number, color: string) => {
    for (let a = 0; a < 360; a += 3) {
      if (gap && (a < 20 || a > 336)) continue;
      const radians = (a * Math.PI) / 180;
      rect(c, Math.round(x + Math.sin(radians) * radius), Math.round(y - Math.cos(radians) * radius), 1, 1, color);
    }
  };
  arc(r, ink);
  arc(r - 1, tint);
  arc(r - 2, tint);
  arc(r - 3, "#f2ce8f");
}
function spark(c: Ink, x: number, y: number, color: string) {
  rect(c, x - 2, y, 5, 1, color);
  rect(c, x, y - 2, 1, 5, color);
}
function flower(c: Ink, x: number, y: number, color: string) {
  rect(c, x - 1, y - 3, 3, 7, color);
  rect(c, x - 3, y - 1, 7, 3, color);
  rect(c, x - 1, y - 1, 2, 2, gold);
}
function heart(c: Ink, x: number, y: number, color: string) {
  rect(c, x + 1, y, 2, 1, color);
  rect(c, x + 4, y, 2, 1, color);
  rect(c, x, y + 1, 7, 2, color);
  rect(c, x + 1, y + 3, 5, 1, color);
  rect(c, x + 2, y + 4, 3, 1, color);
  rect(c, x + 3, y + 5, 1, 1, color);
}
function token(c: Ink, kind: PixelMotif, x: number, y: number, size: number) {
  motif(c, kind, x, y, size, size);
}
function windowFrame(c: Ink, sky: string) {
  rect(c, 4, 7, 24, 19, ink);
  rect(c, 6, 9, 20, 14, sky);
  rect(c, 5, 24, 22, 1, gold);
  rect(c, 3, 26, 26, 2, "#a77263");
}
function balloon(c: Ink, x: number, y: number, tint: string) {
  oval(c, x, y, 4, 5, ink);
  oval(c, x, y - 1, 3, 4, tint);
  rect(c, x - 1, y - 3, 1, 2, cream);
  rect(c, x, y + 5, 1, 2, tint);
}
function fox(c: Ink) {
  polygon(c, ink, [3, 5], [11, 9], [21, 9], [28, 5], [27, 20], [23, 24], [16, 27], [8, 24], [4, 19]);
  polygon(c, "#e993a9", [5, 8], [10, 11], [21, 11], [26, 8], [24, 19], [19, 24], [13, 24], [6, 19]);
  polygon(c, "#ffe4db", [6, 17], [12, 19], [16, 22], [20, 19], [25, 17], [22, 23], [16, 25], [9, 22]);
  line(c, ink, [8, 16], [10, 17], [12, 15]);
  line(c, ink, [19, 15], [21, 17], [23, 16]);
  rect(c, 15, 20, 2, 1, ink);
  heart(c, 19, 7, rose);
}
function gate(c: Ink, x: number, y: number, size: number) {
  ring(c, x, y, size, "#e7bb6c");
  spark(c, x + size - 2, y - size + 2, cream);
}
function hook(c: Ink, x: number, y: number) {
  line(
    c,
    ink,
    [x, 2],
    [x, y - 2],
    [x - 4, y + 2],
    [x - 4, y + 5],
    [x - 2, y + 7],
    [x + 3, y + 7],
    [x + 5, y + 4],
    [x + 5, y + 2],
  );
  line(c, "#e5b368", [x + 1, 3], [x + 1, y - 1], [x - 3, y + 3], [x - 3, y + 5], [x - 1, y + 6], [x + 3, y + 6]);
}
function camp(c: Ink) {
  for (const x of [4, 22]) {
    oval(c, x + 1, 16, 2, 3, "#846677");
    rect(c, x, 19, 4, 5, "#866979");
    rect(c, x - 2, 24, 8, 2, ink);
  }
  polygon(c, rose, [10, 24], [10, 18], [13, 19], [14, 13], [17, 8], [17, 15], [20, 13], [22, 20], [20, 24]);
  polygon(c, "#ffcf77", [12, 23], [14, 18], [16, 20], [18, 15], [19, 21], [18, 24]);
  line(c, ink, [10, 26], [21, 24]);
  line(c, "#ae7b55", [11, 24], [20, 27]);
  spark(c, 8, 9, gold);
}
function ticket(c: Ink, x: number, y: number, w: number, h: number) {
  rect(c, x + 2, y, w - 4, h, ink);
  rect(c, x, y + 2, w, h - 4, ink);
  rect(c, x + 2, y + 2, w - 4, h - 4, "#e6b570");
  rect(c, x + 3, y + 3, w - 6, h - 6, "#fff0c4");
}
const art: Record<string, (c: Ink, choice?: string) => void> = {
  "qianxiao-duel-win"(c) {
    polygon(c, ink, [3,6],[15,3],[21,23],[9,27]);
    polygon(c, lilac, [5,7],[14,5],[19,22],[10,25]);
    rect(c,12,7,16,22,ink); rect(c,13,8,14,20,gold); rect(c,15,10,10,16,"#615575");
    polygon(c,cream,[20,12],[22,16],[25,17],[22,20],[22,23],[19,21],[16,22],[17,18],[15,16],[19,16]);
    spark(c,26,5,gold);
  },
  "town-miko"(c) {
    polygon(c, ink, [2,14],[7,7],[12,4],[20,4],[25,7],[30,14],[26,19],[22,17],[26,28],[6,28],[10,17],[6,19]);
    polygon(c, "#fffbef", [4,14],[8,8],[13,5],[19,5],[24,8],[28,14],[26,17],[21,14],[11,14],[6,17]);
    line(c, "#a78b91", [12,5],[16,10]);
    line(c, ink, [20,5],[12,14]);
    polygon(c, "#ce514c", [11,15],[21,15],[24,26],[8,26]);
    line(c, "#993d49", [13,18],[11,26]);
    line(c, "#993d49", [18,18],[20,26]);
    rect(c, 11, 14, 10, 2, "#933946");
    line(c, "#f69172", [13,17],[16,15],[19,18]);
  },
  cake(c) {
    oval(c, 16, 24, 13, 3, "#9baab1");
    oval(c, 16, 23, 12, 2, cream);
    polygon(c, ink, [5, 13], [16, 8], [27, 14], [23, 18], [23, 22], [7, 22]);
    polygon(c, "#dc8b8a", [7, 15], [23, 17], [21, 20], [8, 20]);
    line(c, cream, [8, 18], [21, 19]);
    polygon(c, "#fff2d5", [6, 13], [16, 9], [26, 14], [21, 15], [19, 17], [8, 15]);
    token(c, "berry", 15, 9, 9);
    rect(c, 25, 22, 2, 1, gold);
  },
  gifts(c) {
    rect(c, 6, 16, 19, 10, ink);
    rect(c, 7, 17, 17, 8, "#cb91ac");
    rect(c, 14, 17, 3, 9, cream);
    polygon(c, ink, [3, 13], [21, 6], [25, 9], [7, 16]);
    polygon(c, "#edb9c6", [5, 13], [21, 7], [23, 9], [7, 15]);
    line(c, rose, [17, 9], [14, 4], [10, 4], [11, 7], [17, 9], [19, 3], [22, 4], [21, 6], [18, 8]);
    line(c, "#c26c80", [23, 10], [27, 12], [26, 17], [28, 20]);
    spark(c, 26, 5, gold);
  },
  balloons(c) {
    line(c, ink, [8, 14], [13, 22], [16, 27], [22, 23], [25, 14]);
    line(c, ink, [17, 10], [17, 24], [15, 28]);
    balloon(c, 8, 10, rose);
    balloon(c, 17, 7, blue);
    balloon(c, 24, 12, lilac);
    rect(c, 15, 26, 3, 2, gold);
  },
  fireworks(c) {
    heart(c, 11, 11, "#d76288");
    heart(c, 13, 10, rose);
    for (const [x, y, u, v] of [
      [12, 7, 9, 3],
      [21, 9, 24, 5],
      [21, 17, 26, 20],
      [11, 20, 8, 25],
      [8, 13, 3, 13],
      [16, 23, 15, 28],
    ])
      line(c, gold, [x, y], [u, v]);
    spark(c, 25, 11, "#e3aa55");
    spark(c, 5, 21, rose);
  },
  courage(c) {
    polygon(c, "#85918c", [3, 24], [7, 19], [15, 18], [23, 20], [29, 26], [5, 27]);
    line(c, leaf, [10, 23], [12, 13], [16, 8]);
    line(c, leaf, [15, 23], [18, 15], [22, 12]);
    line(c, leaf, [14, 20], [7, 16]);
    flower(c, 15, 8, cream);
    flower(c, 22, 12, "#ffefcd");
    flower(c, 7, 15, "#fff9e7");
    rect(c, 19, 22, 5, 2, leaf);
  },
  wreath(c) {
    polygon(
      c,
      "#b76a82",
      [6, 17],
      [9, 10],
      [16, 7],
      [23, 10],
      [26, 16],
      [25, 25],
      [21, 22],
      [18, 27],
      [15, 22],
      [13, 27],
      [7, 23],
    );
    polygon(c, "#f4b2c0", [9, 14], [16, 9], [22, 13], [24, 20], [21, 18], [19, 23], [16, 18], [13, 23], [10, 19]);
    line(c, leaf, [5, 18], [9, 12], [16, 9], [24, 12], [27, 16]);
    flower(c, 7, 15, cream);
    flower(c, 14, 10, "#eb9db2");
    flower(c, 22, 11, cream);
    flower(c, 26, 15, "#e8a3b1");
  },
  bass(c) {
    line(c, ink, [13, 19], [24, 5], [26, 5], [16, 21]);
    line(c, "#c19765", [14, 19], [25, 5]);
    polygon(c, ink, [5, 20], [9, 16], [12, 17], [17, 13], [15, 19], [19, 21], [17, 26], [10, 28], [4, 25]);
    polygon(c, cream, [6, 21], [9, 18], [12, 19], [15, 17], [13, 21], [16, 22], [15, 25], [9, 26], [6, 24]);
    rect(c, 10, 22, 3, 2, "#826673");
    rect(c, 24, 3, 3, 4, cream);
    token(c, "moon", 8, 8, 9);
  },
  memories(c) {
    ticket(c, 12, 6, 16, 12);
    rect(c, 23, 9, 1, 7, rose);
    rect(c, 3, 11, 21, 16, ink);
    rect(c, 4, 12, 19, 14, cream);
    rect(c, 6, 14, 15, 9, "#9dc4bd");
    polygon(c, leaf, [6, 22], [11, 17], [15, 21], [18, 18], [21, 22]);
    rect(c, 17, 15, 2, 2, gold);
  },
  "garden-tape"(c) {
    polygon(c, ink, [3, 7], [29, 7], [30, 8], [30, 24], [28, 26], [4, 26], [2, 24], [2, 8]);
    rect(c, 3, 8, 26, 16, "#837587");
    rect(c, 4, 9, 24, 2, lilac);
    rect(c, 5, 12, 22, 8, ink);
    for (const x of [9, 23]) {
      oval(c, x, 16, 3, 3, cream);
      rect(c, x - 1, 15, 2, 2, ink);
    }
    rect(c, 13, 12, 6, 8, "#f6cccd");
    rect(c, 15, 14, 2, 4, ink);
    rect(c, 14, 15, 1, 1, ink);
    rect(c, 14, 18, 4, 1, ink);
    rect(c, 5, 22, 22, 1, ink);
  },
  fox,
  "fox-peace"(c) {
    polygon(
      c,
      ink,
      [5, 23],
      [6, 17],
      [11, 14],
      [18, 15],
      [21, 12],
      [23, 6],
      [27, 9],
      [28, 17],
      [25, 22],
      [18, 26],
      [10, 27],
    );
    polygon(
      c,
      "#e59aaa",
      [7, 23],
      [8, 18],
      [12, 16],
      [19, 17],
      [23, 12],
      [25, 11],
      [26, 16],
      [23, 21],
      [17, 24],
      [10, 25],
    );
    polygon(c, cream, [20, 16], [21, 11], [23, 6], [26, 10], [27, 15], [25, 14], [23, 17], [23, 13]);
    heart(c, 5, 6, rose);
  },
  companions(c) {
    oval(c, 10, 20, 5, 4, "#be876d");
    for (const [x, y] of [
      [4, 16],
      [8, 12],
      [12, 12],
      [15, 16],
    ])
      oval(c, x, y, 1, 2, "#ba866f");
    for (const [x, y] of [
      [21, 15],
      [26, 18],
    ]) {
      oval(c, x, y, 2, 5, lilac);
      rect(c, x, y - 3, 1, 3, cream);
    }
    spark(c, 20, 6, gold);
  },
  friends(c) {
    polygon(c, ink, [3, 8], [11, 6], [20, 9], [29, 6], [27, 24], [19, 27], [11, 24], [2, 26]);
    polygon(c, "#f4deb2", [4, 10], [11, 8], [19, 11], [27, 9], [26, 22], [19, 25], [11, 22], [4, 24]);
    line(c, "#9fb290", [7, 19], [12, 16], [16, 18], [23, 13]);
    line(c, "#c6a786", [12, 10], [11, 21]);
    for (const [x, y, color] of [
      [3, 5, rose],
      [23, 4, blue],
      [5, 23, leaf],
      [23, 22, lilac],
    ] as const) {
      rect(c, x, y, 6, 4, color);
      rect(c, x + 1, y + 4, 2, 1, color);
    }
  },
  "bed-note"(c) {
    rect(c, 3, 9, 24, 16, "#8b7799");
    rect(c, 5, 10, 21, 13, "#cabcd9");
    rect(c, 7, 12, 16, 9, "#e0d1e4");
    polygon(c, ink, [12, 15], [25, 12], [28, 22], [14, 26]);
    polygon(c, cream, [14, 16], [24, 14], [26, 21], [15, 24]);
    token(c, "sprout", 20, 19, 8);
  },
  "game-snake"(c) {
    line(c, ink, [25, 23], [18, 25], [10, 23], [6, 18], [7, 12], [13, 9], [19, 11]);
    line(c, leaf, [25, 22], [18, 23], [11, 21], [8, 17], [9, 13], [14, 11], [19, 12]);
    line(c, "#a5c697", [23, 22], [18, 22], [12, 20], [9, 16], [11, 13], [16, 12]);
    oval(c, 19, 12, 4, 3, leaf);
    rect(c, 21, 11, 1, 1, ink);
    token(c, "sprout", 26, 9, 9);
  },
  "game-blocks"(c) {
    const shades = [rose, blue, leaf, lilac, gold];
    for (const [col, row, shade] of [
      [0, 2, 2],
      [1, 2, 1],
      [2, 2, 4],
      [3, 2, 0],
      [0, 1, 2],
      [2, 1, 4],
      [3, 1, 0],
      [1, 0, 3],
    ]) {
      const x = 3 + col * 6,
        y = 7 + row * 6;
      rect(c, x, y, 6, 6, ink);
      rect(c, x + 1, y + 1, 4, 4, shades[shade]);
      rect(c, x + 1, y + 1, 2, 1, cream);
    }
    spark(c, 25, 8, gold);
    line(c, "#e5ad70", [5, 27], [26, 27]);
  },
  "game-hop"(c) {
    token(c, "bunny", 17, 13, 17);
    token(c, "moon", 7, 23, 9);
    token(c, "moon", 25, 20, 9);
    rect(c, 11, 22, 2, 1, rose);
    rect(c, 14, 20, 2, 1, rose);
  },
  "game-flight"(c) {
    gate(c, 21, 15, 8);
    token(c, "bird", 10, 16, 16);
    spark(c, 26, 5, gold);
  },
  "game-link"(c) {
    line(c, "#bc7e93", [7, 11], [7, 23], [25, 23], [25, 17]);
    token(c, "letter", 9, 10, 13);
    token(c, "letter", 24, 16, 12);
    spark(c, 17, 24, gold);
  },
  "game-mines"(c) {
    polygon(c, ink, [3, 21], [15, 16], [28, 20], [17, 27], [4, 25]);
    polygon(c, "#83989c", [4, 21], [15, 17], [26, 20], [16, 24]);
    token(c, "flag", 19, 11, 15);
    token(c, "star", 10, 20, 8);
  },
  "game-miner"(c) {
    hook(c, 17, 10);
    token(c, "gem", 16, 23, 14);
    polygon(c, "#d69346", [10, 22], [14, 18], [20, 18], [22, 22], [16, 28]);
    line(c, "#fff0a9", [12, 21], [15, 19], [18, 19]);
  },
  rainbow(c) {
    polygon(
      c,
      "#806766",
      [4, 27],
      [4, 15],
      [9, 8],
      [16, 5],
      [24, 8],
      [28, 15],
      [28, 27],
      [24, 27],
      [24, 17],
      [20, 12],
      [16, 10],
      [11, 12],
      [8, 17],
      [8, 27],
    );
    const arc: Point[] = [
      [6, 22],
      [7, 15],
      [10, 10],
      [16, 8],
      [22, 10],
      [25, 15],
      [26, 22],
    ];
    ["#de8994", "#e9a763", "#e7c768", "#9bbe85", "#83b9bb", "#8ba4cd", "#b299c2"].forEach((color, i) =>
      flower(c, ...arc[i], color),
    );
  },
  "day-secrets"(c) {
    oval(c, 9, 10, 3, 4, blue);
    rect(c, 9, 5, 1, 3, blue);
    rect(c, 8, 9, 1, 2, cream);
    polygon(c, "#d4a565", [5, 19], [13, 23], [20, 20], [17, 25], [11, 26]);
    polygon(c, cream, [10, 21], [14, 16], [16, 22]);
    oval(c, 23, 13, 3, 3, gold);
    spark(c, 23, 13, cream);
    rect(c, 20, 10, 2, 1, leaf);
  },
  "star-bottle"(c) {
    polygon(c, ink, [12, 3], [20, 3], [20, 10], [27, 24], [26, 28], [6, 28], [5, 24], [12, 10]);
    polygon(c, "#a3c9bd", [14, 7], [18, 7], [18, 11], [25, 24], [24, 26], [8, 26], [7, 24], [14, 11]);
    rect(c, 12, 4, 8, 3, "#ba8b5c");
    line(c, cream, [14, 12], [10, 21]);
    token(c, "star", 17, 20, 8);
    spark(c, 12, 23, cream);
    oval(c, 22, 23, 2, 1, rose);
    rect(c, 19, 22, 1, 3, rose);
  },
  camp,
  "ruin-first"(c) {
    ring(c, 15, 14, 8, leaf, true);
    line(c, "#c48e7b", [5, 26], [10, 22], [15, 23], [19, 21], [25, 17]);
    spark(c, 24, 6, gold);
  },
  "ruin-set"(c) {
    ring(c, 11, 13, 7, leaf);
    ring(c, 21, 13, 7, lilac);
    ring(c, 16, 20, 8, gold);
  },
  "ruin-plate"(c) {
    ring(c, 16, 16, 12, gold);
    ring(c, 16, 16, 8, "#9aaa91");
    token(c, "moon", 16, 16, 9);
    rect(c, 15, 3, 2, 4, cream);
  },
  "ruin-light"(c) {
    line(c, "#d79654", [2, 7], [23, 7], [23, 22], [9, 22]);
    line(c, "#ffeaba", [2, 8], [24, 8], [24, 23], [9, 23]);
    line(c, blue, [20, 4], [26, 10]);
    line(c, blue, [26, 19], [20, 25]);
    token(c, "star", 7, 22, 9);
  },
  "ruin-radio"(c) {
    oval(c, 16, 22, 12, 3, blue);
    oval(c, 15, 22, 9, 2, cream);
    oval(c, 16, 21, 6, 1, blue);
    token(c, "moon", 13, 12, 15);
    spark(c, 22, 9, lilac);
  },
  "all-games"(c) {
    ticket(c, 3, 7, 26, 18);
    for (const [x, y] of [
      [8, 12],
      [14, 12],
      [20, 12],
      [26, 12],
      [10, 19],
      [16, 19],
      [22, 19],
    ])
      oval(c, x, y, 1, 1, "#a26e67");
    line(c, rose, [5, 15], [26, 15]);
  },
  "flight-16"(c) {
    gate(c, 11, 19, 7);
    gate(c, 21, 11, 8);
    line(c, blue, [2, 26], [9, 21], [13, 18], [17, 15], [26, 7]);
    spark(c, 26, 7, cream);
  },
  "miner-320"(c) {
    hook(c, 10, 8);
    hook(c, 21, 11);
    token(c, "gem", 10, 20, 11);
    polygon(c, gold, [14, 22], [19, 18], [24, 19], [27, 23], [21, 29]);
    spark(c, 22, 21, cream);
  },
  "days-1"(c) {
    windowFrame(c, "#b4d1cf");
    rect(c, 16, 9, 10, 14, "#727895");
    oval(c, 11, 19, 3, 3, gold);
    token(c, "moon", 21, 15, 8);
    rect(c, 15, 8, 2, 16, "#ad826b");
  },
  "days-3"(c) {
    windowFrame(c, "#b5d8ce");
    oval(c, 22, 13, 3, 3, "#f4cb77");
    for (const [x, y, color] of [
      [8, 18, rose],
      [15, 16, cream],
      [22, 18, lilac],
    ] as const) {
      rect(c, x, y + 2, 1, 5, leaf);
      flower(c, x, y, color);
    }
  },
  "days-7"(c) {
    polygon(c, ink, [5, 22], [15, 12], [27, 22], [25, 22], [25, 29], [7, 29], [7, 22]);
    rect(c, 8, 21, 16, 7, "#dbb886");
    polygon(c, "#b77482", [5, 21], [15, 12], [26, 21]);
    rect(c, 16, 22, 5, 4, "#fff3aa");
    rect(c, 10, 23, 4, 5, "#916a62");
    for (const [x, y] of [
      [3, 11],
      [7, 7],
      [12, 5],
      [16, 7],
      [21, 4],
      [25, 9],
      [29, 12],
    ])
      spark(c, x, y, gold);
  },
  "sealed-letter"(c) {
    token(c, "letter", 16, 16, 22);
  },
  "letter-dianziyang"(c) {
    // A fluffy fringe over two round ears, with a little star on the collar.
    oval(c, 6, 14, 4, 3, ink);
    oval(c, 26, 14, 4, 3, ink);
    oval(c, 6, 14, 3, 2, "#d8ada2");
    oval(c, 26, 14, 3, 2, "#d8ada2");
    oval(c, 16, 15, 9, 10, ink);
    oval(c, 16, 16, 8, 8, "#d9b9a2");
    const curls = [[9, 10], [12, 7], [17, 6], [21, 8], [24, 11]];
    for (const [x, y] of curls) {
      oval(c, x, y, 4, 4, ink);
    }
    for (const [x, y] of curls) {
      oval(c, x, y, 3, 3, cream);
    }
    rect(c, 11, 16, 2, 2, ink);
    rect(c, 20, 16, 2, 2, ink);
    line(c, ink, [14, 20], [16, 21], [18, 20]);
    line(c, leaf, [10, 23], [16, 25], [22, 23]);
    spark(c, 16, 27, gold);
    rect(c, 16, 26, 1, 2, cream);
  },
};

for (const key of townInteriorKeys) art[townKeepsakeBadge(key)] = (c, choice) => drawTownKeepsake(c, key, choice, 1, 0, 30);

export const hasDrawnStamp = (id: string) => Object.hasOwn(art, id);

export function paintAchievementArt(root: HTMLElement) {
  if (!townKeepsakeArtReady() && root.querySelector('[data-stamp-art^="town-keepsake-"]')) {
    void prepareTownKeepsakeArt().then(ok => { if (ok && root.isConnected) paintAchievementArt(root); });
  }
  for (const canvas of root.querySelectorAll<HTMLCanvasElement>("canvas[data-stamp-art]")) {
    const c = canvas.getContext("2d");
    if (!c) continue;
    c.clearRect(0, 0, 32, 32);
    c.imageSmoothingEnabled = false;
    art[canvas.dataset.stampArt!]?.(c, canvas.dataset.stampChoice);
    if (canvas.hasAttribute("data-stamp-veiled")) {
      c.globalCompositeOperation = "source-in";
      rect(c, 0, 0, 32, 32, "#a6999e");
      c.globalCompositeOperation = "source-over";
    }
  }
  for (const seal of root.querySelectorAll<HTMLElement>("[data-stamp-letter]")) {
    applyStationeryTheme(seal, seal.dataset.stampLetter);
  }
}
