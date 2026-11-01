import type { Engine, GameStatus, GameAction } from "./arcade-engines.ts";
type Cell = { x: number; y: number };
const palette = [
  "#cf82a6",
  "#87b5c0",
  "#b09acb",
  "#d6ac67",
  "#84ad85",
  "#d39282",
  "#8f9ec7",
  "#bd90a4",
];
function tile(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.fillStyle = "#72576c22";
  c.beginPath();
  c.roundRect(x + 1, y + 2, w, h, 4);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, 4);
  c.fill();
  c.strokeStyle = "#ffffffaa";
  c.lineWidth = 1;
  c.stroke();
}
function background(c: CanvasRenderingContext2D) {
  c.fillStyle = "#fbf2e4";
  c.fillRect(0, 0, 240, 160);
}
function sparkle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      k = i % 2 ? r * 0.45 : r;
    i
      ? c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k)
      : c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
  c.fill();
}
function icon(c: CanvasRenderingContext2D, n: number, x: number, y: number) {
  const color = palette[(n - 1) % palette.length];
  c.fillStyle = color;
  if (n % 4 === 1) sparkle(c, x, y, 7, color);
  else if (n % 4 === 2) {
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff6e7";
    c.beginPath();
    c.arc(x + 3, y - 3, 6, 0, Math.PI * 2);
    c.fill();
  } else if (n % 4 === 3) {
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(
        x + Math.cos(i * 1.256) * 4,
        y + Math.sin(i * 1.256) * 4,
        3.8,
        3,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.fillStyle = "#ffe6a2";
    c.beginPath();
    c.arc(x, y, 2, 0, Math.PI * 2);
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(x, y + 7);
    c.bezierCurveTo(x - 15, y - 3, x - 5, y - 12, x, y - 4);
    c.bezierCurveTo(x + 5, y - 12, x + 15, y - 3, x, y + 7);
    c.fill();
  }
  if (n > 4) {
    c.strokeStyle = "#76576f";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.stroke();
  }
}
abstract class BonusGame implements Engine {
  status: GameStatus = "ready";
  score = 0;
  goal = 1;
  achieved = false;
  round = 1;
  start() {
    this.status = "playing";
  }
  continuePlay() {
    if (this.status === "won") this.status = "playing";
  }
  protected milestone() {
    if (this.score >= this.goal && !this.achieved) {
      this.achieved = true;
      this.status = "won";
    }
  }
  abstract input(action: GameAction, pressed: boolean): void;
  update(_dt: number) {}
  abstract draw(c: CanvasRenderingContext2D): void;
}

/** Empty outside border is part of the classic maximum-two-turn link rule. */
export function linkPath(
  board: number[],
  a: number,
  b: number,
  cols = 4,
  rows = 4,
): Cell[] | null {
  if (a === b || !board[a] || board[a] !== board[b]) return null;
  const start = { x: a % cols, y: Math.floor(a / cols) },
    end = { x: b % cols, y: Math.floor(b / cols) };
  const queue: { p: Cell; dir: number; turns: number; path: Cell[] }[] = [
    { p: start, dir: -1, turns: 0, path: [start] },
  ];
  const visited = new Map<string, number>();
  while (queue.length) {
    const node = queue.shift()!;
    for (const [dir, [dx, dy]] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].entries()) {
      const p = { x: node.p.x + dx, y: node.p.y + dy },
        turns = node.turns + (node.dir !== -1 && node.dir !== dir ? 1 : 0);
      if (turns > 2 || p.x < -1 || p.x > cols || p.y < -1 || p.y > rows)
        continue;
      if (p.x === end.x && p.y === end.y) return [...node.path, p];
      if (
        p.x >= 0 &&
        p.x < cols &&
        p.y >= 0 &&
        p.y < rows &&
        board[p.y * cols + p.x]
      )
        continue;
      const key = `${p.x},${p.y},${dir}`;
      if ((visited.get(key) ?? 3) <= turns) continue;
      visited.set(key, turns);
      queue.push({ p, dir, turns, path: [...node.path, p] });
    }
  }
  return null;
}
export class LinkGame extends BonusGame {
  goal = 8;
  board: number[] = [];
  cursor = 0;
  selected: number | null = null;
  suggested: number[] = [];
  path: Cell[] = [];
  private flash = 0;
  private random: () => number;
  constructor(random = Math.random) {
    super();
    this.random = random;
    this.deal();
  }
  private deal() {
    this.board = Array.from({ length: 16 }, (_, i) => Math.floor(i / 2) + 1);
    this.shuffle();
    this.selected = null;
  }
  shuffle() {
    for (let i = this.board.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.board[i], this.board[j]] = [this.board[j], this.board[i]];
    }
    this.selected = null;
    this.suggested = [];
    if (!this.findPair()) {
      const occupied = this.board
        .map((n, i) => (n ? i : -1))
        .filter((i) => i >= 0);
      if (occupied.length) {
        const a = occupied[0],
          b = occupied.find((i) => i !== a && this.board[i] === this.board[a])!;
        const near = occupied[1];
        [this.board[b], this.board[near]] = [this.board[near], this.board[b]];
      }
    }
  }
  findPair() {
    for (let a = 0; a < 16; a++)
      for (let b = a + 1; b < 16; b++)
        if (linkPath(this.board, a, b)) return [a, b];
    return null;
  }
  hint() {
    this.suggested = this.findPair() ?? [];
  }
  choose(i: number) {
    if (this.status !== "playing" || !this.board[i]) return;
    this.cursor = i;
    this.suggested = [];
    if (this.selected === null) {
      this.selected = i;
      return;
    }
    const path = linkPath(this.board, this.selected, i);
    if (path) {
      this.path = path;
      this.flash = 0.65;
      this.board[this.selected] = 0;
      this.board[i] = 0;
      this.score++;
      this.selected = null;
      this.milestone();
      if (this.status === "playing" && !this.board.some(Boolean)) {
        this.round++;
        this.deal();
      } else if (this.board.some(Boolean) && !this.findPair()) this.shuffle();
    } else this.selected = i;
  }
  continuePlay() {
    super.continuePlay();
    if (!this.board.some(Boolean)) {
      this.round++;
      this.deal();
    }
  }
  input(a: GameAction, p: boolean) {
    if (!p || this.status !== "playing") return;
    if (a === "left") this.cursor = (this.cursor + 15) % 16;
    if (a === "right") this.cursor = (this.cursor + 1) % 16;
    if (a === "up") this.cursor = (this.cursor + 12) % 16;
    if (a === "down") this.cursor = (this.cursor + 4) % 16;
    if (a === "primary") this.choose(this.cursor);
  }
  pointer(x: number, y: number) {
    const col = Math.floor((x - 40) / 40),
      row = Math.floor((y - 24) / 30);
    if (col >= 0 && col < 4 && row >= 0 && row < 4) this.choose(row * 4 + col);
  }
  update(dt: number) {
    this.flash = Math.max(0, this.flash - dt);
  }
  draw(c: CanvasRenderingContext2D) {
    background(c);
    for (let i = 0; i < 16; i++) {
      if (!this.board[i]) continue;
      const x = 42 + (i % 4) * 40,
        y = 26 + Math.floor(i / 4) * 30;
      tile(c, x, y, 35, 25, "#fffaf0");
      icon(c, this.board[i], x + 17.5, y + 12);
      if (
        this.selected === i ||
        this.cursor === i ||
        this.suggested.includes(i)
      ) {
        c.strokeStyle = this.selected === i ? "#bf6e99" : "#d8ae65";
        c.lineWidth = 1.7;
        c.strokeRect(x - 1, y - 1, 37, 27);
      }
    }
    if (this.flash && this.path.length) {
      c.strokeStyle = "#9dc6b5";
      c.lineWidth = 2;
      c.beginPath();
      this.path.forEach((p, i) =>
        i
          ? c.lineTo(60 + p.x * 40, 39 + p.y * 30)
          : c.moveTo(60 + p.x * 40, 39 + p.y * 30),
      );
      c.stroke();
    }
  }
}

export class MinesGame extends BonusGame {
  goal = 26;
  cols = 6;
  rows = 5;
  cursor = 0;
  flagMode = false;
  mines = new Set<number>();
  revealed = new Set<number>();
  flags = new Set<number>();
  hints = 3;
  private random: () => number;
  constructor(random = Math.random) {
    super();
    this.random = random;
  }
  private seed(first: number) {
    const allowed = Array.from({ length: 30 }, (_, i) => i).filter(
      (i) =>
        Math.abs((i % 6) - (first % 6)) > 1 ||
        Math.abs(Math.floor(i / 6) - Math.floor(first / 6)) > 1,
    );
    for (let i = allowed.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
    }
    this.mines = new Set(allowed.slice(0, 4));
  }
  count(i: number) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = (i % 6) + dx,
          y = Math.floor(i / 6) + dy;
        if (x >= 0 && x < 6 && y >= 0 && y < 5 && this.mines.has(y * 6 + x))
          n++;
      }
    return n;
  }
  reveal(i: number) {
    if (this.status !== "playing" || this.flags.has(i) || this.revealed.has(i))
      return;
    if (!this.mines.size) this.seed(i);
    if (this.mines.has(i)) {
      this.status = "lost";
      return;
    }
    const queue = [i];
    while (queue.length) {
      const k = queue.pop()!;
      if (this.revealed.has(k) || this.mines.has(k) || this.flags.has(k))
        continue;
      this.revealed.add(k);
      this.score++;
      if (!this.count(k))
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const x = (k % 6) + dx,
              y = Math.floor(k / 6) + dy;
            if (x >= 0 && x < 6 && y >= 0 && y < 5) queue.push(y * 6 + x);
          }
    }
    this.milestone();
    if (this.revealed.size === 26 && this.achieved && this.status === "playing")
      this.nextRound();
  }
  private nextRound() {
    this.round++;
    this.mines.clear();
    this.revealed.clear();
    this.flags.clear();
    this.hints = 3;
  }
  continuePlay() {
    super.continuePlay();
    if (this.revealed.size === 26) this.nextRound();
  }
  hint() {
    if (this.hints <= 0 || this.status !== "playing") return;
    if (!this.mines.size) {
      this.hints--;
      this.reveal(this.cursor);
      return;
    }
    const i = Array.from({ length: 30 }, (_, i) => i).find(
      (i) => !this.mines.has(i) && !this.revealed.has(i) && !this.flags.has(i),
    );
    if (i !== undefined) {
      this.hints--;
      this.reveal(i);
    }
  }
  input(a: GameAction, p: boolean) {
    if (!p || this.status !== "playing") return;
    if (a === "left") this.cursor = (this.cursor + 29) % 30;
    if (a === "right") this.cursor = (this.cursor + 1) % 30;
    if (a === "up") this.cursor = (this.cursor + 24) % 30;
    if (a === "down") this.cursor = (this.cursor + 6) % 30;
    if (a === "drop" && !this.revealed.has(this.cursor)) {
      this.flags.has(this.cursor)
        ? this.flags.delete(this.cursor)
        : this.flags.add(this.cursor);
    }
    if (a === "primary") this.reveal(this.cursor);
  }
  pointer(x: number, y: number) {
    const col = Math.floor((x - 36) / 28),
      row = Math.floor((y - 12) / 28);
    if (col >= 0 && col < 6 && row >= 0 && row < 5) {
      this.cursor = row * 6 + col;
      if (this.flagMode) this.input("drop", true);
      else this.reveal(this.cursor);
    }
  }
  draw(c: CanvasRenderingContext2D) {
    background(c);
    for (let i = 0; i < 30; i++) {
      const x = 38 + (i % 6) * 28,
        y = 14 + Math.floor(i / 6) * 28;
      tile(c, x, y, 24, 24, this.revealed.has(i) ? "#e6eddd" : "#eed7df");
      if (this.status === "lost" && this.mines.has(i))
        sparkle(c, x + 12, y + 12, 6, "#b07692");
      else if (this.revealed.has(i)) {
        const n = this.count(i);
        if (n) {
          c.fillStyle = palette[n - 1];
          c.font = 'bold 13px "Microsoft YaHei",sans-serif';
          c.textAlign = "center";
          c.fillText(String(n), x + 12, y + 17);
        }
      } else if (this.flags.has(i)) {
        c.fillStyle = "#bf789d";
        c.fillRect(x + 8, y + 5, 2, 15);
        c.beginPath();
        c.moveTo(x + 10, y + 5);
        c.lineTo(x + 20, y + 9);
        c.lineTo(x + 10, y + 12);
        c.fill();
      }
      if (i === this.cursor) {
        c.strokeStyle = "#a97b9b";
        c.lineWidth = 1.5;
        c.strokeRect(x - 1, y - 1, 26, 26);
      }
    }
  }
}

export interface Treasure {
  x: number;
  y: number;
  r: number;
  value: number;
  kind: number;
}
export class MinerGame extends BonusGame {
  goal = 160;
  angle = 0;
  length = 12;
  phase: "swing" | "out" | "back" = "swing";
  treasures: Treasure[] = [];
  held: Treasure | null = null;
  private time = 0;
  private random: () => number;
  constructor(random = Math.random) {
    super();
    this.random = random;
    this.fill();
  }
  private fill() {
    this.treasures = Array.from({ length: 7 }, (_, i) => ({
      x: 27 + (i % 4) * 59 + (this.random() - 0.5) * 8,
      y: 82 + Math.floor(i / 4) * 48 + (i % 2) * 9,
      r: i % 3 === 0 ? 12 : 9,
      value: i % 3 === 0 ? 60 : 40,
      kind: i % 3,
    }));
  }
  input(a: GameAction, p: boolean) {
    if (!p || this.status !== "playing") return;
    if (a === "left" && this.phase === "swing") this.time -= 0.18;
    if (a === "right" && this.phase === "swing") this.time += 0.18;
    if (a === "primary" && this.phase === "swing") this.phase = "out";
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    this.time += dt;
    if (this.phase === "swing") {
      this.angle = Math.sin(this.time * 0.8) * 1.08;
      return;
    }
    this.length += dt * (this.phase === "out" ? 105 : -100);
    const p = {
      x: 120 + Math.sin(this.angle) * this.length,
      y: 22 + Math.cos(this.angle) * this.length,
    };
    if (this.phase === "out") {
      const found = this.treasures.find(
        (t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + 4,
      );
      if (found) {
        this.held = found;
        this.treasures = this.treasures.filter((t) => t !== found);
        this.phase = "back";
      } else if (p.y > 153 || p.x < 8 || p.x > 232) this.phase = "back";
    }
    if (this.phase === "back" && this.length <= 12) {
      this.length = 12;
      this.phase = "swing";
      if (this.held) {
        this.score += this.held.value;
        this.held = null;
        this.milestone();
      }
      if (!this.treasures.length) {
        this.round++;
        this.fill();
      }
    }
  }
  draw(c: CanvasRenderingContext2D) {
    background(c);
    c.fillStyle = "#e9d3b4";
    c.fillRect(0, 42, 240, 118);
    c.fillStyle = "#b8cdb0";
    c.fillRect(0, 39, 240, 5);
    for (let i = 0; i < 22; i++) {
      c.fillStyle = "#d5b99a";
      c.fillRect((i * 71) % 240, 54 + ((i * 29) % 104), 3, 2);
    }
    for (const t of this.treasures) this.drawOre(c, t.x, t.y, t.r, t.kind);
    const x = 120 + Math.sin(this.angle) * this.length,
      y = 22 + Math.cos(this.angle) * this.length;
    c.strokeStyle = "#8a7465";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(120, 22);
    c.lineTo(x, y);
    c.stroke();
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI);
    c.stroke();
    if (this.held) this.drawOre(c, x, y + 5, this.held.r, this.held.kind);
    c.fillStyle = "#9e7494";
    c.fillRect(110, 9, 20, 13);
    c.fillStyle = "#f2c5d1";
    c.fillRect(111, 5, 18, 9);
    c.fillStyle = "#fff0d0";
    c.fillRect(115, 6, 10, 4);
    sparkle(c, 134, 11, 4, "#d8b971");
  }
  private drawOre(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    kind: number,
  ) {
    if (kind === 1) {
      c.fillStyle = "#bf9cc7";
      c.beginPath();
      c.moveTo(x, y - r);
      c.lineTo(x + r, y);
      c.lineTo(x, y + r);
      c.lineTo(x - r, y);
      c.closePath();
      c.fill();
      c.strokeStyle = "#f4e4f5";
      c.stroke();
    } else if (kind === 2) {
      tile(c, x - r, y - r, r * 2, r * 2, "#dba8ba");
      c.fillStyle = "#fff1d3";
      c.fillRect(x - 1, y - r, 2, r * 2);
      c.fillRect(x - r, y - 1, r * 2, 2);
    } else {
      c.fillStyle = "#bd944c";
      c.beginPath();
      c.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
      sparkle(c, x, y, r * 0.7, "#ffe2a0");
    }
  }
}
