import { LinkGame, MinesGame, MinerGame } from "./arcade-bonus.ts";
import { illustrated, motif, panel, scenery, type Backdrop } from "./arcade-pixels.ts";
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop): void;
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#b9d5ab");
    c.strokeStyle = "#829574"; c.lineWidth = 2;
    c.strokeRect(19, 9, 202, 142);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) {
      c.fillStyle = (x + y) % 2 ? "#fbf2d367" : "#bed2a869";
      c.fillRect(20 + x * 10, 10 + y * 10, 10, 10);
    }
    const candyX = 25 + this.food.x * 10, candyY = 15 + this.food.y * 10;
    if (!illustrated(c, art, "sweet", candyX - 6, candyY - 4, 12, 8)) motif(c, "star", candyX, candyY, 10);
    for (let i = this.body.length - 1; i >= 0; i--) {
      const p = this.body[i], x = 20 + p.x * 10, y = 10 + p.y * 10;
      if (i) {
        panel(c, x, y, 10, 10, i % 2 ? "#daa0b6" : "#f0b6bb", "#945b79", "#ffe2c4");
        c.fillStyle = "#fbdac0";
        c.fillRect(x + 4, y + 4, 2, 2);
      } else {
        c.save();
        c.translate(x + 5, y + 5);
        if (this.direction.x === -1) c.scale(-1, 1);
        else c.rotate(Math.atan2(this.direction.y, this.direction.x));
        if (!illustrated(c, art, "snakeHead", -6, -6, 13, 12)) {
          panel(c, -5, -5, 10, 10, "#f0b6bb", "#945b79", "#ffe2c4");
          c.fillStyle = "#563f55"; c.fillRect(1, -3, 2, 2); c.fillRect(1, 1, 2, 2);
        }
        c.restore();
      }
    }
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#dbc7cd");
    panel(c, 71, 4, 98, 152, "#514c63", "#725468", "#ebc194");
    c.fillStyle = "#655d72";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++)
      c.fillRect(75 + x * 9, 8 + y * 9, 1, 1);
    const cube = (x: number, y: number, v: number, size = 9) => {
      c.fillStyle = "#544858"; c.fillRect(x, y, size, size);
      c.fillStyle = BLOCK_COLORS[v - 1]; c.fillRect(x + 1, y + 1, size - 2, size - 2);
      c.fillStyle = "#ffefc9b5"; c.fillRect(x + 2, y + 1, size - 4, 1); c.fillRect(x + 1, y + 2, 1, 2);
      c.fillStyle = "#67495a48"; c.fillRect(x + 2, y + size - 3, size - 4, 1);
    };
    this.board.forEach((r, y) => r.forEach((v, x) => {
      if (v) cube(75 + x * 9, 8 + y * 9, v);
    }));
    let landing = this.y;
    while (this.fits(this.x, landing + 1)) landing++;
    this.piece.forEach((r, y) => r.forEach((v, x) => {
      if (!v) return;
      const left = 75 + (this.x + x) * 9;
      if (landing > this.y) {
        c.fillStyle = "#b7acc061"; c.fillRect(left + 1, 8 + (landing + y) * 9 + 1, 7, 7);
      }
      cube(left, 8 + (this.y + y) * 9, this.color);
    }));
    panel(c, 178, 34, 51, 46, "#f9ead3", "#976f73");
    c.fillStyle = "#6f5362"; c.textAlign = "center";
    c.font = '8px "Microsoft YaHei",sans-serif'; c.fillText("下一块", 204, 46);
    const next = SHAPES[this.nextIndex], startX = Math.floor(203 - next[0].length * 3.5);
    next.forEach((r, y) => r.forEach((v, x) => {
      if (v) cube(startX + x * 7, 53 + y * 7, this.nextIndex + 1, 7);
    }));
    panel(c, 12, 74, 46, 40, "#faecd5", "#956e79");
    motif(c, "gift", 35, 74, 16);
    c.fillStyle = "#6d4d61"; c.font = 'bold 10px "Microsoft YaHei",sans-serif';
    c.fillText(this.score + " 行", 35, 99);
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#dce8ed");
    const camera = Math.max(0, this.x - 65);
    const creams = ["#eaa2b1", "#a5c8ae", "#c4add4"];
    for (const p of this.platforms) {
      const x = Math.round(p.x - camera), y = Math.round(p.y), w = Math.round(p.w);
      if (x < -40 || x > 280) continue;
      const left = Math.round(x - w / 2);
      if (illustrated(c, art, p.id % 2 ? "mintCake" : "roseCake", left, y, w, Math.round(w / 3.1))) continue;
      panel(c, left, y, w, 28, "#c38b75", "#946c70", "#fff0ce");
      c.fillStyle = "#ebc394"; c.fillRect(left + 3, y + 9, w - 6, 7);
      c.fillStyle = "#bd7889"; c.fillRect(left + 3, y + 16, w - 6, 3);
      c.fillStyle = creams[p.id % 3]; c.fillRect(left + 1, y + 2, w - 2, 5);
      for (let i = 2; i < w - 3; i += 7) {
        c.fillRect(left + i, y + 6, 4, 3);
        c.fillStyle = "#fff1d9"; c.fillRect(left + i, y + 1, 4, 1);
        c.fillStyle = creams[p.id % 3];
      }
    }
    const x = this.x - camera, squash = this.charging ? Math.round(this.charge * 3) : 0;
    const h = 23 - squash;
    if (!illustrated(c, art, "hare", x - 10, this.y + 5 - h, 20 + squash, h))
      motif(c, "hopper", x, this.y + 5 - h / 2, 18 + squash, h);
    if (this.charging) {
      panel(c, Math.round(x) - 15, Math.round(this.y) - 26, 30, 7, "#74647d", "#73526c");
      c.fillStyle = "#f4c46f"; c.fillRect(Math.round(x) - 12, Math.round(this.y) - 23, Math.round(24 * this.charge / 1.2), 2);
    }
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#4d527a");
    for (const gate of this.gates) {
      const x = Math.round(gate.x), top = Math.round(gate.center - 31), bottom = Math.round(gate.center + 31);
      for (const [y, h] of [[-4, top + 4], [bottom, 164 - bottom]]) {
        panel(c, x, y, 22, h, "#827292", "#5a496e", "#f5cc97");
        c.fillStyle = "#bc94a3"; c.fillRect(x + 4, y + 2, 3, h - 4);
        c.fillStyle = "#655675"; c.fillRect(x + 16, y + 2, 3, h - 4);
        for (let band = y + 13; band < y + h - 6; band += 17) {
          c.fillStyle = "#d9ae8b"; c.fillRect(x + 2, band, 18, 2);
        }
      }
      for (const y of [top - 8, bottom]) {
        panel(c, x - 2, y, 26, 8, "#d79caa", "#76566f", "#ffe8ad");
        c.fillStyle = "#ffe39b"; c.fillRect(x + 9, y + 2, 4, 3);
      }
      if (!gate.collected) motif(c, "star", x + 11, gate.center - 18, 10);
    }
    const flutter = this.vy < 0 ? -1 : 1;
    if (!illustrated(c, art, "flyer", 37, this.y - 10, 25, 20 + flutter))
      motif(c, "bird", 50, this.y, 20, 16);
    if (this.stars) {
      panel(c, 6, 6, 34, 14, "#544966", "#806678");
      motif(c, "star", 13, 13, 8);
      c.fillStyle = "#fff0c1"; c.textAlign = "left"; c.font = 'bold 8px sans-serif'; c.fillText(String(this.stars), 20, 16);
    }
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
