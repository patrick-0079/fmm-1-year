import type { GameId } from "./arcade-engines";
import type { ARCADES } from "./town-data";

/** A small anniversary fair stall, anchored to the same counter/collision base. */
export function drawArcadeStall(
  c: CanvasRenderingContext2D,
  game: (typeof ARCADES)[GameId],
  id: GameId,
) {
  const accent = {
    snake: "#92bda5",
    blocks: "#b69acd",
    hop: "#ddad91",
    flight: "#8dbdcf",
    link: "#cf9db5",
    mines: "#9abb99",
    miner: "#d5b371",
  }[id];
  c.save();
  c.translate(game.x, game.y);
  c.fillStyle = "#514c4930";
  c.beginPath();
  c.ellipse(0, 17, 31, 7, 0, 0, Math.PI * 2);
  c.fill();
  for (const x of [-25, 22]) {
    c.fillStyle = "#7e5c49";
    c.fillRect(x, -43, 4, 60);
    c.fillStyle = "#c29d73";
    c.fillRect(x + 1, -42, 1, 57);
  }
  c.fillStyle = "#795b47";
  c.fillRect(-26, -2, 52, 20);
  c.fillStyle = "#c99d71";
  c.fillRect(-24, -1, 48, 17);
  c.fillStyle = "#e0b68c";
  c.fillRect(-23, 0, 46, 3);
  c.strokeStyle = "#a57a58";
  c.lineWidth = 0.7;
  for (const y of [6, 12]) {
    c.beginPath();
    c.moveTo(-23, y);
    c.lineTo(23, y);
    c.stroke();
  }
  c.fillStyle = "#f0d6a9";
  c.fillRect(-29, -5, 58, 4);
  c.fillStyle = "#9b7556";
  c.fillRect(-29, -1, 58, 2);
  c.fillStyle = "#bd9484";
  c.fillRect(-21, -30, 42, 25);
  c.fillStyle = "#f0d7b6";
  c.fillRect(-20, -29, 40, 24);
  c.fillStyle = "#283f4d";
  c.fillRect(-18, -27, 36, 20);
  c.fillStyle = "#47636c";
  c.fillRect(-17, -26, 34, 2);
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
  c.fillStyle = accent;
  c.beginPath();
  c.moveTo(-30, -47);
  c.lineTo(27, -47);
  c.lineTo(33, -36);
  c.lineTo(-33, -36);
  c.closePath();
  c.fill();
  for (let i = 0; i < 6; i++) {
    c.fillStyle = i % 2 ? "#fff0d4" : accent;
    c.fillRect(-32 + i * 11, -36, 11, 6);
    c.beginPath();
    c.ellipse(-26.5 + i * 11, -30, 5.5, 2, 0, 0, Math.PI);
    c.fill();
  }
  c.strokeStyle = "#8c745c";
  c.lineWidth = 1;
  c.strokeRect(-30, -48, 58, 2);
  c.fillStyle = "#906a59";
  c.fillRect(-27, -59, 54, 10);
  c.fillStyle = "#fff0d1";
  c.fillRect(-26, -58, 52, 8);
  c.fillStyle = "#805d6e";
  c.font = '8px "Microsoft YaHei",sans-serif';
  c.textAlign = "center";
  c.fillText(game.short, 0, -51);
  c.fillStyle = "#f3d28c";
  for (const x of [-23, 23]) {
    c.beginPath();
    c.arc(x, -34, 1.4, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#db9eb3";
  c.fillRect(-10, 3, 6, 4);
  c.fillStyle = "#a6c7bf";
  c.fillRect(4, 3, 6, 4);
  c.fillStyle = "#fff4d7";
  c.fillRect(-19, 5, 38, 9);
  c.fillStyle = "#9b6c7f";
  c.font = '8px "Microsoft YaHei",sans-serif';
  c.fillText("周年游乐", 0, 12);
  c.restore();
}
