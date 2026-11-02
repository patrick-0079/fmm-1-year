import type { GameId } from "./arcade-engines";
import type { ARCADES } from "./town-data";
import { sceneArt, stallFrames } from "./scene-art";

/** Detailed timber stalls share the town's material, scale and collision baseline. */
export function drawArcadeStall(c: CanvasRenderingContext2D, game: (typeof ARCADES)[GameId], id: GameId) {
  const variant = { snake: 0, blocks: 1, hop: 2, flight: 0, link: 2, mines: 0, miner: 1 }[id];
  const image = sceneArt.stalls;
  if (!image.complete || !image.naturalWidth) return;
  const f = stallFrames[variant], width = 78, height = width * f.h / f.w;
  c.save();
  c.translate(game.x, game.y);
  c.fillStyle = "#514c4928";
  c.beginPath();
  c.ellipse(0, 17, 37, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.drawImage(image, f.x, f.y, f.w, f.h, -width / 2, 18 - height, width, height);
  c.fillStyle = "#66434f";
  c.font = '7px "Microsoft YaHei","PingFang SC",sans-serif';
  c.textAlign = "center";
  c.fillText(game.short, 0, -61, 38);
  c.save();
  c.translate(0, -8);
  c.scale(0.7, 0.7);
  // Tiny game illustrations replace the old unreadable screen label.
  if (id === "snake") {
    c.fillStyle = "#b1dbc0";
    for (const [x, y] of [
      [-9, -17],
      [-5, -17],
      [-1, -17],
      [-1, -21],
      [3, -21],
    ])
      c.fillRect(x, y, 4, 4);
    c.fillStyle = "#f1baad";
    c.fillRect(8, -16, 4, 4);
  } else if (id === "blocks") {
    for (const [x, y, color] of [
      [-11, -13, "#db9cbd"],
      [-7, -13, "#db9cbd"],
      [-7, -17, "#db9cbd"],
      [-3, -13, "#e8c47e"],
      [1, -13, "#e8c47e"],
      [1, -17, "#e8c47e"],
      [5, -17, "#9ccab4"],
      [5, -21, "#9ccab4"],
    ] as [number, number, string][]) {
      c.fillStyle = color;
      c.fillRect(x, y, 3, 3);
    }
  } else if (id === "hop") {
    c.fillStyle = "#d8bd8b";
    c.fillRect(-12, -12, 10, 2);
    c.fillRect(4, -20, 10, 2);
    c.fillStyle = "#fff0cd";
    c.fillRect(-6, -20, 5, 6);
    c.fillRect(-6, -23, 1, 4);
    c.fillRect(-3, -23, 1, 4);
  } else if (id === "link") {
    c.strokeStyle = "#e9cfa1";
    c.lineWidth = 1;
    c.strokeRect(-11, -23, 7, 10);
    c.strokeRect(4, -23, 7, 10);
    c.fillStyle = "#df9db4";
    for (const x of [-8, 7]) {
      c.beginPath();
      c.arc(x, -18, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.moveTo(-8, -11);
    c.lineTo(-8, -9);
    c.lineTo(7, -9);
    c.lineTo(7, -11);
    c.stroke();
  } else if (id === "mines") {
    for (let i = 0; i < 9; i++) {
      c.fillStyle = i === 4 ? "#e8d49c" : "#a9c8ad";
      c.fillRect(-10 + (i % 3) * 7, -24 + Math.floor(i / 3) * 5, 5, 4);
    }
    c.fillStyle = "#db99ac";
    c.fillRect(-1, -22, 1, 9);
    c.fillRect(0, -22, 5, 3);
  } else if (id === "miner") {
    c.strokeStyle = "#c9bca2";
    c.beginPath();
    c.moveTo(0, -25);
    c.lineTo(-4, -16);
    c.arc(-3, -16, 2, 0, Math.PI);
    c.stroke();
    c.fillStyle = "#e6c37e";
    c.beginPath();
    c.ellipse(-7, -11, 4, 3, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#c5a3d1";
    c.fillRect(6, -14, 5, 5);
  } else {
    c.fillStyle = "#9dcbbd";
    c.fillRect(-12, -25, 4, 10);
    c.fillRect(9, -17, 4, 9);
    c.fillStyle = "#f1ce8a";
    c.fillRect(-3, -20, 7, 6);
    c.fillStyle = "#f6e7cd";
    c.fillRect(-5, -18, 4, 3);
    c.fillStyle = "#e1a1a7";
    c.fillRect(4, -18, 3, 2);
  }
  c.restore();
  c.fillStyle = "#9b6c7f";
  c.font = '6px "Microsoft YaHei","PingFang SC",sans-serif';
  c.fillText("一周年游乐会", 0, 5, 29);
  c.restore();
}
