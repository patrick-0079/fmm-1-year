import type { Engine, GameStatus, GameAction } from "./arcade-engines.ts";
type Cell = { x: number; y: number };
import { illustrated, motif, panel, scenery, wishTokens, type Backdrop } from "./arcade-pixels.ts";
const numbers = ["#326b78", "#416d48", "#975567", "#71518c", "#90513e", "#4c677e", "#744b67", "#4d575e"];
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
  abstract draw(c: CanvasRenderingContext2D, art?: Backdrop): void;
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#ecdcbd");
    for (let i = 0; i < 16; i++) {
      const x = 42 + (i % 4) * 40, y = 26 + Math.floor(i / 4) * 30;
      if (this.board[i]) {
        const selected = this.selected === i, hinted = this.suggested.includes(i);
        panel(c, x, y, 35, 25, selected ? "#f9d5d9" : hinted ? "#fff0b2" : "#fff2d9", selected ? "#a44e76" : hinted ? "#aa8541" : "#b38c7c");
        c.fillStyle = "#d9b697"; c.fillRect(x + 3, y + 19, 2, 2); c.fillRect(x + 30, y + 4, 2, 2);
        motif(c, wishTokens[this.board[i] - 1], x + 17, y + 12, 19, 19);
      }
      if (this.cursor === i) {
        c.strokeStyle = "#765068"; c.lineWidth = 1;
        c.strokeRect(x - 1.5, y - 1.5, 38, 28);
        c.fillStyle = "#fff4bc"; c.fillRect(x - 2, y - 2, 3, 3);
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
      const first = !this.flags.has(this.cursor)
        ? this.cursor
        : Array.from({ length: 30 }, (_, i) => i).find(
            (i) => !this.flags.has(i),
          );
      if (first === undefined) return;
      this.hints--;
      this.cursor = first;
      this.reveal(first);
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
  pointer(x: number, y: number, mark = this.flagMode) {
    const col = Math.floor((x - 36) / 28),
      row = Math.floor((y - 12) / 28);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    if (this.status === "ready") this.start();
    if (this.status !== "playing") return false;
    this.cursor = row * this.cols + col;
    this.input(mark ? "drop" : "primary", true);
    return true;
  }
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#464861");
    for (let i = 0; i < 30; i++) {
      const x = 38 + (i % 6) * 28, y = 14 + Math.floor(i / 6) * 28;
      const open = this.revealed.has(i);
      panel(c, x, y, 24, 24, open ? "#ece2cf" : "#555a78", open ? "#a99d88" : "#34394c", open ? "#ffefd5" : "#a7a5c3");
      if (this.status === "lost" && this.mines.has(i)) {
        c.strokeStyle="#733f53"; c.lineWidth=2; c.beginPath();
        c.moveTo(x+6,y+3); c.lineTo(x+13,y+10); c.lineTo(x+9,y+14); c.lineTo(x+17,y+21); c.stroke();
      } else if (open) {
        const n = this.count(i);
        if (n) {
          c.fillStyle = numbers[n - 1]; c.font = 'bold 13px "Microsoft YaHei",sans-serif';
          c.textAlign = "center"; c.fillText(String(n), x + 12, y + 17);
        }
      } else if (this.flags.has(i)) {
        motif(c, "flag", x + 12, y + 12, 18);
      } else {
        motif(c, "star", x+12, y+12, 11);
      }
      if (i === this.cursor) {
        c.strokeStyle = "#ffe1a5"; c.lineWidth = 1.5;
        c.strokeRect(x - 1.5, y - 1.5, 27, 27);
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
// Angle is measured from the downward vertical. The jaws and collected ore
// share the same tip that checks for treasure, even at the ends of a swing.
export function minerHook(angle:number,length:number) {
  const dx=Math.sin(angle), dy=Math.cos(angle);
  return {x:120+dx*length,y:22+dy*length,tipX:120+dx*(length+5),tipY:22+dy*(length+5),rotation:-angle};
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
    const p=minerHook(this.angle,this.length);
    if (this.phase === "out") {
      const found = this.treasures.find(
        (t) => Math.hypot(t.x - p.tipX, t.y - p.tipY) < t.r + 3,
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
  draw(c: CanvasRenderingContext2D, art?: Backdrop) {
    scenery(c, art, "#535e62");
    // Keep the chamber visible in the distance while the playable ore stays bright.
    c.fillStyle = "rgba(66, 76, 82, 0.62)";
    c.fillRect(0, 0, 240, 160);
    // A bronze pulley sits over the opening in the amber chamber.
    for (const x of [105, 132]) {
      c.fillStyle = "#785560"; c.fillRect(x, 24, 4, 17);
      c.fillStyle = "#c59473"; c.fillRect(x + 1, 25, 1, 15);
    }
    for (const x of [102, 123]) {
      c.fillStyle = "#77525a"; c.fillRect(x, 23, 15, 4);
      c.fillStyle = "#dfb18b"; c.fillRect(x, 23, 15, 1);
    }
    for (const t of this.treasures) this.drawOre(c, t.x, t.y, t.r, t.kind, art);
    const {x,y,tipX,tipY,rotation}=minerHook(this.angle,this.length);
    c.strokeStyle = "#624c67"; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(120, 22); c.lineTo(x, y); c.stroke();
    c.strokeStyle = "#e9c791"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(120, 22); c.lineTo(x, y); c.stroke();
    if (this.held) this.drawOre(c,tipX,tipY,this.held.r,this.held.kind,art);
    c.save(); c.translate(x,y); c.rotate(rotation); c.lineJoin="round";
    const gap=this.held?2:4;
    c.beginPath(); c.moveTo(0,-2); c.lineTo(0,1);
    for(const side of [-1,1]) { c.moveTo(0,0); c.lineTo(side*5,3); c.lineTo(side*gap,8); c.lineTo(side*(gap-1.5),7); }
    c.strokeStyle="#654b59"; c.lineWidth=3.5; c.stroke();
    c.strokeStyle="#ffe1ac"; c.lineWidth=1.7; c.stroke(); c.restore();
    panel(c,108,14,24,12,"#936b55","#483e48","#eac48c");
    c.beginPath(); c.arc(120,14,8,0,Math.PI*2); c.fillStyle="#dcb173"; c.fill();
    c.strokeStyle="#53444a"; c.lineWidth=2; c.stroke();
    c.beginPath(); c.moveTo(114,14); c.lineTo(126,14); c.moveTo(120,8); c.lineTo(120,20); c.stroke();
  }
  private drawOre(c: CanvasRenderingContext2D, x: number, y: number, r: number, kind: number, art?: Backdrop) {
    if (kind === 0 && illustrated(c, art, "gold", x-r, y-r, r*2, r*2)) return;
    const token = (["star", "gem", "bell"] as const)[kind];
    motif(c, token, x, y, Math.round(r * 2), Math.round(r * 2));
  }
}
