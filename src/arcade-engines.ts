import { LinkGame, MinesGame, MinerGame } from "./arcade-bonus.ts";
export type GameId =
  "snake" | "blocks" | "hop" | "flight" | "link" | "mines" | "miner";
export type GameAction = "left" | "right" | "up" | "down" | "primary" | "drop";
export type GameStatus = "ready" | "playing" | "won" | "lost";
export interface Engine {
  status: GameStatus;
  score: number;
  goal: number;
  achieved: boolean;
  continuePlay(): void;
  cancelInput?(): void;
  pointer?(x: number, y: number): void;
  hint?(): void;
  start(): void;
  input(action: GameAction, pressed: boolean): void;
  update(dt: number): void;
  draw(c: CanvasRenderingContext2D): void;
}
function star(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      k = i % 2 ? r * 0.45 : r;
    i
      ? c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k)
      : c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
  c.fill();
}
function sky(c: CanvasRenderingContext2D, color = "#e9ead7") {
  c.fillStyle = color;
  c.fillRect(0, 0, 240, 160);
  for (let i = 0; i < 18; i++) {
    c.fillStyle = i % 2 ? "#fff7dc88" : "#c7d7b955";
    c.fillRect((i * 43) % 240, (i * 37) % 160, 2, 2);
  }
}
export class SnakeGame implements Engine {
  status: GameStatus = "ready";
  achieved = false;
  continuePlay() {
    if (this.status === "won") this.status = "playing";
  }
  score = 0;
  goal = 6;
  body = [
    { x: 8, y: 7 },
    { x: 7, y: 7 },
    { x: 6, y: 7 },
  ];
  direction = { x: 1, y: 0 };
  next = { x: 1, y: 0 };
  food = { x: 13, y: 7 };
  private clock = 0;
  private random: () => number;
  constructor(random = Math.random) {
    this.random = random;
  }
  start() {
    this.status = "playing";
  }
  input(action: GameAction, pressed: boolean) {
    if (!pressed) return;
    const d = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
    }[action as "left" | "right" | "up" | "down"];
    if (d && !(d.x === -this.direction.x && d.y === -this.direction.y)) {
      this.next = d;
    }
  }
  step() {
    if (this.status !== "playing") return;
    this.direction = { ...this.next };
    const head = {
      x: this.body[0].x + this.direction.x,
      y: this.body[0].y + this.direction.y,
    };
    const eating = head.x === this.food.x && head.y === this.food.y;
    if (
      head.x < 0 ||
      head.x >= 20 ||
      head.y < 0 ||
      head.y >= 14 ||
      this.body
        .slice(0, eating ? undefined : -1)
        .some((p) => p.x === head.x && p.y === head.y)
    ) {
      this.status = "lost";
      return;
    }
    this.body.unshift(head);
    if (eating) {
      this.score++;
      if (this.score >= this.goal && !this.achieved) {
        this.achieved = true;
        this.status = "won";
      }
      const free = [];
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < 20; x++)
          if (!this.body.some((p) => p.x === x && p.y === y))
            free.push({ x, y });
      if (free.length)
        this.food = free[Math.floor(this.random() * free.length)];
      else {
        // A filled board starts another lap without losing the run's score.
        this.body = [
          { x: 8, y: 7 },
          { x: 7, y: 7 },
          { x: 6, y: 7 },
        ];
        this.direction = { x: 1, y: 0 };
        this.next = { x: 1, y: 0 };
        this.food = { x: 13, y: 7 };
      }
    } else this.body.pop();
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    this.clock += dt;
    while (this.clock >= 0.16 && this.status === "playing") {
      this.clock -= 0.16;
      this.step();
    }
  }
  draw(c: CanvasRenderingContext2D) {
    sky(c);
    c.fillStyle = "#c5d3ad";
    c.fillRect(18, 8, 204, 144);
    c.fillStyle = "#f1f1db";
    c.fillRect(20, 10, 200, 140);
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 20; x++)
        if ((x + y) % 2 === 0) {
          c.fillStyle = "#e9ebd4";
          c.fillRect(20 + x * 10, 10 + y * 10, 10, 10);
        }
    star(c, 25 + this.food.x * 10, 15 + this.food.y * 10, 4.5, "#efa94c");
    this.body.forEach((p, i) => {
      c.fillStyle = i === 0 ? "#b9688e" : i % 2 ? "#df94ad" : "#e8b2c1";
      c.fillRect(21 + p.x * 10, 11 + p.y * 10, 8, 8);
      if (!i) {
        c.fillStyle = "#fff2dc";
        c.fillRect(23 + p.x * 10, 12 + p.y * 10, 2, 2);
        c.fillRect(26 + p.x * 10, 12 + p.y * 10, 2, 2);
      }
    });
  }
}
const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
];
const BLOCK_COLORS = [
  "#65becb",
  "#edc66d",
  "#b393d1",
  "#9cbe79",
  "#e59ca9",
  "#7f9fcd",
  "#d9a573",
];
export class BlocksGame implements Engine {
  status: GameStatus = "ready";
  achieved = false;
  continuePlay() {
    if (this.status === "won") this.status = "playing";
  }
  score = 0;
  goal = 4;
  board = Array.from({ length: 16 }, () => Array<number>(10).fill(0));
  piece: number[][] = [];
  x = 3;
  y = 0;
  color = 1;
  nextIndex = 0;
  private clock = 0;
  private soft = false;
  cancelInput() {
    this.soft = false;
  }
  private random: () => number;
  constructor(random = Math.random) {
    this.random = random;
    this.nextIndex = Math.floor(random() * SHAPES.length);
    this.spawn();
  }
  private spawn() {
    const index = this.nextIndex;
    this.piece = SHAPES[index].map((r) => [...r]);
    this.color = index + 1;
    this.nextIndex = Math.floor(this.random() * SHAPES.length);
    this.x = Math.floor((10 - this.piece[0].length) / 2);
    this.y = 0;
    if (!this.fits(this.x, this.y, this.piece)) this.status = "lost";
  }
  start() {
    if (this.status !== "lost") this.status = "playing";
  }
  fits(x: number, y: number, piece = this.piece) {
    return piece.every((row, ry) =>
      row.every(
        (v, rx) =>
          !v ||
          (x + rx >= 0 &&
            x + rx < 10 &&
            y + ry >= 0 &&
            y + ry < 16 &&
            !this.board[y + ry][x + rx]),
      ),
    );
  }
  input(action: GameAction, pressed: boolean) {
    if (action === "down") {
      this.soft = pressed;
      return;
    }
    if (!pressed || this.status !== "playing") return;
    if (action === "left" || action === "right") {
      const x = this.x + (action === "left" ? -1 : 1);
      if (this.fits(x, this.y)) this.x = x;
    }
    if (action === "up") {
      const turn = this.piece[0].map((_, i) =>
        this.piece.map((row) => row[i]).reverse(),
      );
      for (const kick of [0, -1, 1, -2, 2])
        if (this.fits(this.x + kick, this.y, turn)) {
          this.piece = turn;
          this.x += kick;
          break;
        }
    }
    if (action === "primary" || action === "drop") {
      while (this.fits(this.x, this.y + 1)) this.y++;
      this.lock();
    }
  }
  clearLines() {
    const remaining = this.board.filter((row) => row.some((v) => !v));
    const count = 16 - remaining.length;
    while (remaining.length < 16) remaining.unshift(Array(10).fill(0));
    this.board = remaining;
    this.score += count;
    if (this.score >= this.goal && !this.achieved) {
      this.achieved = true;
      this.status = "won";
    }
    return count;
  }
  lock() {
    for (let y = 0; y < this.piece.length; y++)
      for (let x = 0; x < this.piece[y].length; x++)
        if (this.piece[y][x]) this.board[this.y + y][this.x + x] = this.color;
    this.clearLines();
    if (this.status !== "lost") this.spawn();
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    this.clock += dt;
    const interval = this.soft ? 0.07 : 0.65;
    while (this.clock >= interval && this.status === "playing") {
      this.clock -= interval;
      if (this.fits(this.x, this.y + 1)) this.y++;
      else this.lock();
    }
  }
  draw(c: CanvasRenderingContext2D) {
    sky(c, "#e9e3ee");
    c.fillStyle = "#6f6b83";
    c.fillRect(72, 5, 96, 150);
    c.fillStyle = "#f7f0e9";
    c.fillRect(75, 8, 90, 144);
    const cell = (x: number, y: number, v: number) => {
      if (y < 0) return;
      c.fillStyle = BLOCK_COLORS[v - 1];
      c.fillRect(75 + x * 9, 8 + y * 9, 8, 8);
      c.fillStyle = "#ffffff55";
      c.fillRect(76 + x * 9, 9 + y * 9, 6, 1);
    };
    this.board.forEach((r, y) =>
      r.forEach((v, x) => {
        if (v) cell(x, y, v);
      }),
    );
    this.piece.forEach((r, y) =>
      r.forEach((v, x) => {
        if (v) cell(this.x + x, this.y + y, this.color);
      }),
    );
    c.fillStyle = "#82728c";
    c.font = '9px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.fillText("下一个", 180, 25);
    SHAPES[this.nextIndex].forEach((r, y) =>
      r.forEach((v, x) => {
        if (v) {
          c.fillStyle = BLOCK_COLORS[this.nextIndex];
          c.fillRect(182 + x * 8, 35 + y * 8, 7, 7);
        }
      }),
    );
    c.fillText("消除", 17, 55);
    c.font = '18px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.fillText(`${this.score}/4`, 15, 78);
    star(c, 34, 105, 9, "#d4b365");
  }
}
export interface Platform {
  id: number;
  x: number;
  y: number;
  w: number;
}
export class HopGame implements Engine {
  status: GameStatus = "ready";
  achieved = false;
  continuePlay() {
    if (this.status === "won") this.status = "playing";
  }
  score = 0;
  goal = 8;
  x = 45;
  y = 127;
  vx = 0;
  vy = 0;
  charge = 0;
  charging = false;
  cancelInput() {
    this.charging = false;
    this.charge = 0;
  }
  grounded = true;
  platformId = 0;
  platforms: Platform[] = [{ id: 0, x: 45, y: 132, w: 62 }];
  private random: () => number;
  constructor(random = Math.random) {
    this.random = random;
    for (let i = 1; i < 14; i++)
      this.platforms.push({
        id: i,
        x: this.platforms[i - 1].x + 67 + random() * 37,
        y: 116 + random() * 18,
        w: 43 + random() * 9,
      });
  }
  start() {
    this.status = "playing";
  }
  input(action: GameAction, pressed: boolean) {
    if (action !== "primary" || this.status !== "playing" || !this.grounded)
      return;
    if (pressed) {
      this.charging = true;
      this.charge = 0;
    } else if (this.charging) {
      this.charging = false;
      this.grounded = false;
      this.vx = 82 + this.charge * 70;
      this.vy = -175;
      this.charge = 0;
    }
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    if (this.charging) this.charge = Math.min(1.2, this.charge + dt);
    if (this.grounded) return;
    const before = this.y;
    this.x += this.vx * dt;
    this.vy += 440 * dt;
    this.y += this.vy * dt;
    if (this.vy > 0) {
      const p = this.platforms.find(
        (p) =>
          p.id > this.platformId &&
          Math.abs(this.x - p.x) < p.w / 2 - 3 &&
          before <= p.y - 5 &&
          this.y >= p.y - 5,
      );
      if (p) {
        this.y = p.y - 5;
        this.platformId = p.id;
        if (this.platformId + 6 >= this.platforms.length)
          for (let i = 0; i < 10; i++) {
            const last = this.platforms.at(-1)!;
            this.platforms.push({
              id: last.id + 1,
              x: last.x + 70 + this.random() * 28,
              y: 116 + this.random() * 18,
              w: 48,
            });
          }
        this.grounded = true;
        this.vx = 0;
        this.vy = 0;
        this.score++;
        if (this.score >= this.goal && !this.achieved) {
          this.achieved = true;
          this.status = "won";
        }
      }
    }
    if (this.y > 200) this.status = "lost";
  }
  draw(c: CanvasRenderingContext2D) {
    sky(c, "#e1edf0");
    const camera = Math.max(0, this.x - 65);
    c.fillStyle = "#c4d2de";
    c.fillRect(0, 147, 240, 13);
    for (const p of this.platforms) {
      const x = p.x - camera;
      if (x < -40 || x > 280) continue;
      c.fillStyle = "#9a83ad";
      c.fillRect(x - p.w / 2, p.y, p.w, 30);
      c.fillStyle = "#e0bbce";
      c.fillRect(x - p.w / 2, p.y, p.w, 5);
      c.fillStyle = "#fbefde";
      c.fillRect(x - p.w / 2 + 2, p.y, p.w - 4, 2);
      star(c, x, p.y + 16, 4, "#f4d47d");
    }
    const x = this.x - camera;
    c.fillStyle = "#a66f91";
    c.fillRect(x - 5, this.y - 12, 10, 13);
    c.fillStyle = "#f3c6d0";
    c.fillRect(x - 5, this.y - 13, 10, 9);
    c.fillStyle = "#fff1dc";
    c.fillRect(x - 3, this.y - 11, 6, 3);
    c.fillStyle = "#b493d0";
    c.fillRect(x - 4, this.y - 3, 8, 5);
    c.fillStyle = "#eab2c8";
    c.fillRect(x - 4, this.y - 19, 3, 7);
    c.fillRect(x + 1, this.y - 19, 3, 7);
    if (this.charging) {
      c.fillStyle = "#ffffff";
      c.fillRect(x - 13, this.y - 27, 26, 4);
      c.fillStyle = "#c791b4";
      c.fillRect(x - 12, this.y - 26, (24 * this.charge) / 1.2, 2);
    }
    c.fillStyle = "#829bad";
    c.font = '8px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.fillText("短按近跳 · 长按远跳", 62, 16);
  }
}
export interface Gate {
  x: number;
  center: number;
  passed: boolean;
  collected?: boolean;
}
export class FlightGame implements Engine {
  status: GameStatus = "ready";
  achieved = false;
  continuePlay() {
    if (this.status === "won") this.status = "playing";
  }
  score = 0;
  goal = 8;
  y = 75;
  vy = 0;
  gates: Gate[] = [];
  stars = 0;
  private timer = 0;
  private random: () => number;
  constructor(random = Math.random) {
    this.random = random;
    this.gates.push({ x: 250, center: 80, passed: false });
  }
  start() {
    this.status = "playing";
  }
  input(action: GameAction, pressed: boolean) {
    if (
      pressed &&
      (action === "primary" || action === "up") &&
      this.status === "playing"
    )
      this.vy = -83;
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    this.vy += 235 * dt;
    this.y += this.vy * dt;
    this.timer += dt;
    if (this.timer > 1.65) {
      this.timer -= 1.65;
      this.gates.push({
        x: 260,
        center: 54 + this.random() * 51,
        passed: false,
      });
    }
    for (const gate of this.gates) {
      gate.x -= 58 * dt;
      if (
        !gate.collected &&
        Math.hypot(gate.x + 11 - 50, gate.center - 18 - this.y) < 14
      ) {
        gate.collected = true;
        this.stars++;
      }
      if (!gate.passed && gate.x + 22 < 44) {
        gate.passed = true;
        this.score++;
        if (this.score >= this.goal && !this.achieved) {
          this.achieved = true;
          this.status = "won";
        }
      }
      if (
        gate.x < 58 &&
        gate.x + 22 > 42 &&
        Math.abs(this.y - gate.center) > 25
      )
        this.status = "lost";
    }
    this.gates = this.gates.filter((g) => g.x > -30);
    if (this.y < 6 || this.y > 151) this.status = "lost";
  }
  draw(c: CanvasRenderingContext2D) {
    sky(c, "#dfe8ef");
    for (const g of this.gates) {
      c.fillStyle = "#ac9bc4";
      c.fillRect(g.x, 0, 22, g.center - 31);
      c.fillRect(g.x, g.center + 31, 22, 160);
      c.fillStyle = "#dbbfd3";
      c.fillRect(g.x - 2, g.center - 37, 26, 6);
      c.fillRect(g.x - 2, g.center + 31, 26, 6);
      c.fillStyle = "#f9e5ae";
      c.fillRect(g.x + 4, 0, 2, Math.max(0, g.center - 38));
      if (!g.collected) star(c, g.x + 11, g.center - 18, 4, "#e3b65a");
    }
    c.fillStyle = "#c78aa7";
    c.fillRect(43, this.y - 7, 15, 13);
    c.fillStyle = "#f1b0c6";
    c.fillRect(42, this.y - 8, 13, 9);
    c.fillStyle = "#fff0da";
    c.fillRect(50, this.y - 3, 5, 5);
    c.fillStyle = "#726182";
    c.fillRect(53, this.y - 3, 2, 2);
    c.fillStyle = "#e4bd67";
    c.fillRect(57, this.y - 1, 4, 3);
    c.fillStyle = "#c9addc";
    c.fillRect(40, this.y, 8, 5);
    c.fillStyle = "#ec9eb8";
    c.fillRect(44, this.y - 12, 3, 5);
    star(c, 20, 22, 4, "#e9c15e");
    star(c, 211, 140, 3, "#c8a9d7");
  }
}
export function createEngine(id: GameId): Engine {
  if (id === "link") return new LinkGame();
  if (id === "mines") return new MinesGame();
  if (id === "miner") return new MinerGame();
  return id === "snake"
    ? new SnakeGame()
    : id === "blocks"
      ? new BlocksGame()
      : id === "hop"
        ? new HopGame()
        : new FlightGame();
}
