import roomUrl from "./assets/room.webp";
import gardenUrl from "./assets/garden.webp";
import spriteUrl from "./assets/nemu-sprites.webp";
import { canStand, movePlayer, type Point, type Rect } from "./core";

export type SceneId = "room" | "garden";
export interface Hotspot {
  id: string;
  title: string;
  x: number;
  y: number;
  approach: Point;
  color?: string;
  radius?: number;
}
interface Scene {
  title: string;
  width: number;
  height: number;
  image: string;
  bounds: Rect;
  walls: Rect[];
  spawn: Point;
  spots: Hotspot[];
}
export const scenes: Record<SceneId, Scene> = {
  room: {
    title: "晚安小屋",
    width: 600,
    height: 400,
    image: roomUrl,
    bounds: { x: 14, y: 91, w: 572, h: 287 },
    spawn: { x: 300, y: 310 },
    walls: [
      { x: 43, y: 58, w: 116, h: 55 },
      { x: 18, y: 153, w: 86, h: 95 },
      { x: 428, y: 70, w: 116, h: 117 },
      { x: 548, y: 70, w: 36, h: 51 },
      { x: 264, y: 193, w: 74, h: 54 },
      { x: 492, y: 284, w: 88, h: 88 },
      { x: 20, y: 284, w: 85, h: 88 },
    ],
    spots: [
      {
        id: "cake",
        title: "周年蛋糕",
        x: 300,
        y: 190,
        approach: { x: 300, y: 267 },
        radius: 92,
      },
      {
        id: "gifts",
        title: "拆开礼物",
        x: 536,
        y: 292,
        approach: { x: 466, y: 308 },
        radius: 100,
      },
      {
        id: "letters",
        title: "晚安信箱",
        x: 53,
        y: 164,
        approach: { x: 126, y: 178 },
        radius: 88,
        color: "#e7c482",
      },
      {
        id: "album",
        title: "回忆相册",
        x: 50,
        y: 211,
        approach: { x: 126, y: 226 },
        radius: 88,
        color: "#e7c482",
      },
      {
        id: "radio",
        title: "枕边电台",
        x: 558,
        y: 84,
        approach: { x: 566, y: 151 },
        radius: 80,
        color: "#e7c482",
      },
      {
        id: "tv",
        title: "小小放映室",
        x: 85,
        y: 65,
        approach: { x: 133, y: 135 },
        radius: 90,
        color: "#e7c482",
      },
      {
        id: "door",
        title: "去周年花园",
        x: 300,
        y: 373,
        approach: { x: 300, y: 357 },
        color: "#92d1e0",
      },
    ],
  },
  garden: {
    title: "周年花园",
    width: 900,
    height: 600,
    image: gardenUrl,
    bounds: { x: 36, y: 162, w: 828, h: 406 },
    spawn: { x: 450, y: 240 },
    walls: [
      { x: 300, y: 0, w: 300, h: 184 },
      { x: 120, y: 250, w: 116, h: 70 },
      { x: 651, y: 220, w: 134, h: 75 },
      { x: 125, y: 452, w: 105, h: 79 },
      { x: 668, y: 454, w: 115, h: 70 },
    ],
    spots: [
      {
        id: "door",
        title: "回晚安小屋",
        x: 450,
        y: 185,
        approach: { x: 450, y: 211 },
        color: "#92d1e0",
      },
      {
        id: "balloons",
        title: "放飞心愿气球",
        x: 184,
        y: 257,
        approach: { x: 261, y: 310 },
        radius: 110,
      },
      {
        id: "danmaku",
        title: "弹幕祈愿屏",
        x: 715,
        y: 231,
        approach: { x: 717, y: 323 },
        radius: 110,
        color: "#8bcddc",
      },
      {
        id: "fireworks",
        title: "一周年烟花",
        x: 724,
        y: 466,
        approach: { x: 636, y: 487 },
        radius: 110,
      },
      {
        id: "bili",
        title: "小电视打卡站",
        x: 177,
        y: 464,
        approach: { x: 269, y: 483 },
        radius: 110,
        color: "#8bcddc",
      },
    ],
  },
};

export class World {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  scene: SceneId = "room";
  player: Point = { ...scenes.room.spawn };
  private camera: Point = { x: 0, y: 0 };
  private images = new Map<string, HTMLImageElement>();
  private keys = new Set<string>();
  private touch: Point = { x: 0, y: 0 };
  private path: Point[] = [];
  private targetEvent: string | null = null;
  private facing = 0;
  private walking = false;
  private time = 0;
  private last = 0;
  private frameId = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  paused = true;
  visited: string[] = [];
  onInteract: (id: string) => void = () => {};
  onNearby: (spot: Hotspot | null) => void = () => {};
  onScene: (id: SceneId) => void = () => {};
  onToast: (text: string) => void = () => {};
  private nearbyId = "";
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = 600;
    canvas.height = 400;
    window.addEventListener("keydown", (e) => {
      if (
        this.paused ||
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      )
        return;
      const key = e.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
          " ",
          "e",
        ].includes(key)
      ) {
        e.preventDefault();
        if ((key === "e" || key === " ") && !e.repeat) this.interact();
        else this.keys.add(key);
        this.path = [];
        this.targetEvent = null;
      }
    });
    window.addEventListener("keyup", (e) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => this.clearInput());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearInput();
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (this.paused) return;
      canvas.focus({ preventScroll: true });
      const rect = canvas.getBoundingClientRect();
      const p = {
        x: ((e.clientX - rect.left) / rect.width) * 600 + this.camera.x,
        y: ((e.clientY - rect.top) / rect.height) * 400 + this.camera.y,
      };
      const spot = this.config.spots.find(
        (s) => Math.hypot(s.x - p.x, s.y - p.y) < 27,
      );
      this.goTo(spot ? spot.approach : p, spot?.id ?? null);
    });
  }
  get config() {
    return scenes[this.scene];
  }
  async load() {
    await Promise.all(
      [roomUrl, gardenUrl, spriteUrl].map(
        (url) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              this.images.set(url, image);
              resolve();
            };
            image.onerror = () =>
              reject(new Error("场景图片加载失败，请刷新重试。"));
            image.src = url;
          }),
      ),
    );
    this.frameId = requestAnimationFrame(this.frame);
  }
  clearInput() {
    this.keys.clear();
    this.touch = { x: 0, y: 0 };
    this.path = [];
    this.targetEvent = null;
    this.walking = false;
  }
  setTouch(x: number, y: number) {
    this.touch = { x, y };
    this.path = [];
    this.targetEvent = null;
  }
  switchScene(scene: SceneId) {
    this.clearInput();
    this.scene = scene;
    this.player = { ...scenes[scene].spawn };
    this.facing = 0;
    this.nearbyId = "";
    this.onNearby(null);
    this.onScene(scene);
  }
  interact() {
    if (this.paused) return;
    const nearby = this.nearest();
    if (nearby) {
      this.clearInput();
      this.onInteract(nearby.id);
    } else this.onToast("走近闪闪发光的物件，再按互动键吧。");
  }
  visit(id: string) {
    const spot = this.config.spots.find((s) => s.id === id);
    if (!spot) return;
    this.goTo(spot.approach, id);
  }
  private goTo(goal: Point, event: string | null) {
    this.keys.clear();
    this.touch = { x: 0, y: 0 };
    const step = 12;
    const width = Math.ceil(this.config.width / step);
    const height = Math.ceil(this.config.height / step);
    const valid = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < width &&
      y < height &&
      canStand(
        { x: x * step + 6, y: y * step + 6 },
        this.config.walls,
        this.config.bounds,
      );
    const start = {
      x: Math.floor(this.player.x / step),
      y: Math.floor(this.player.y / step),
    };
    let end = { x: Math.floor(goal.x / step), y: Math.floor(goal.y / step) };
    if (!valid(end.x, end.y)) {
      let best = Infinity;
      for (let y = end.y - 4; y <= end.y + 4; y++)
        for (let x = end.x - 4; x <= end.x + 4; x++) {
          const distance = Math.hypot(
            x * step + 6 - goal.x,
            y * step + 6 - goal.y,
          );
          if (valid(x, y) && distance < best) {
            best = distance;
            end = { x, y };
          }
        }
      if (!Number.isFinite(best)) {
        this.onToast("试试点击空地，或者用方向键走过去。");
        return;
      }
    }
    const key = (x: number, y: number) => y * width + x;
    const queue = [start];
    const seen = new Map<number, number>();
    seen.set(key(start.x, start.y), -1);
    let found = false;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (p.x === end.x && p.y === end.y) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = p.x + dx,
          y = p.y + dy,
          k = key(x, y);
        if (valid(x, y) && !seen.has(k)) {
          seen.set(k, key(p.x, p.y));
          queue.push({ x, y });
        }
      }
    }
    if (!found) {
      this.onToast("那里暂时走不过去，换一块空地试试。");
      return;
    }
    const path: Point[] = [];
    let node = key(end.x, end.y);
    while (node !== -1 && node !== key(start.x, start.y)) {
      path.unshift({
        x: (node % width) * step + 6,
        y: Math.floor(node / width) * step + 6,
      });
      node = seen.get(node) ?? -1;
    }
    this.path = path;
    this.targetEvent = event;
    if (!path.length && event) this.onInteract(event);
  }
  private nearest() {
    let best: Hotspot | null = null,
      distance = Infinity;
    for (const s of this.config.spots) {
      const d = Math.hypot(this.player.x - s.x, this.player.y - s.y);
      if (d < (s.radius ?? 48) && d < distance) {
        best = s;
        distance = d;
      }
    }
    return best;
  }
  private frame = (timestamp: number) => {
    const dt = Math.min((timestamp - (this.last || timestamp)) / 1000, 0.05);
    this.last = timestamp;
    this.time = timestamp / 1000;
    if (!this.paused && !document.hidden) this.update(dt);
    this.draw();
    this.frameId = requestAnimationFrame(this.frame);
  };
  stop() {
    cancelAnimationFrame(this.frameId);
  }
  private update(dt: number) {
    let x =
      this.touch.x +
      (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    let y =
      this.touch.y +
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
      (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    if (this.path.length) {
      const next = this.path[0],
        distance = Math.hypot(next.x - this.player.x, next.y - this.player.y);
      if (distance < 3.5) {
        this.player = next;
        this.path.shift();
        if (!this.path.length && this.targetEvent) {
          const id = this.targetEvent;
          this.targetEvent = null;
          this.onInteract(id);
          return;
        }
      } else {
        x = next.x - this.player.x;
        y = next.y - this.player.y;
      }
    }
    this.walking = Math.abs(x) + Math.abs(y) > 0;
    if (this.walking) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x > 0 ? 2 : 1) : y > 0 ? 0 : 3;
      this.player = movePlayer(
        this.player,
        { x, y },
        dt,
        this.config.walls,
        this.config.bounds,
      );
    }
    const nearby = this.nearest();
    if ((nearby?.id ?? "") !== this.nearbyId) {
      this.nearbyId = nearby?.id ?? "";
      this.onNearby(nearby);
    }
  }
  private draw() {
    const c = this.ctx,
      { width, height } = this.config;
    this.camera.x = Math.max(0, Math.min(width - 600, this.player.x - 300));
    this.camera.y = Math.max(0, Math.min(height - 400, this.player.y - 200));
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#ebbdce";
    c.fillRect(0, 0, 600, 400);
    const background = this.images.get(this.config.image);
    if (background)
      c.drawImage(
        background,
        -Math.round(this.camera.x),
        -Math.round(this.camera.y),
        width,
        height,
      );
    c.save();
    c.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    if (this.scene === "room") {
      c.fillStyle = "#895c78";
      c.fillRect(274, 368, 52, 11);
      c.fillStyle = "#d9b9d1";
      c.fillRect(278, 370, 44, 7);
    }
    for (const spot of this.config.spots) {
      const y = Math.round(
        spot.y -
          12 +
          (this.reducedMotion.matches
            ? 0
            : Math.sin(this.time * 2 + spot.x) * 2),
      );
      const visited = this.visited.includes(spot.id);
      c.fillStyle = "#fff7f4";
      c.fillRect(spot.x - 6, y - 6, 12, 12);
      c.fillStyle =
        spot.id === this.nearbyId ? "#9c5373" : (spot.color ?? "#ed8daa");
      c.fillRect(spot.x - 4, y - 4, 8, 8);
      c.fillStyle = "#fff8f5";
      if (visited) {
        c.fillRect(spot.x - 2, y, 2, 2);
        c.fillRect(spot.x, y - 2, 2, 4);
        c.fillRect(spot.x + 2, y - 4, 2, 4);
      } else {
        c.fillRect(spot.x - 1, y - 3, 2, 4);
        c.fillRect(spot.x - 1, y + 2, 2, 1);
      }
    }
    for (let i = 0; i < 12; i++) {
      const t = this.reducedMotion.matches ? 0 : this.time;
      const x = (i * 89 + t * 4) % width;
      const y = (i * 67 + Math.sin(t + i) * 7) % height;
      c.fillStyle = `rgba(255,249,214,${0.22 + Math.sin(t * 2 + i) * 0.18})`;
      c.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    const sprite = this.images.get(spriteUrl);
    const x = Math.round(this.player.x),
      y = Math.round(this.player.y);
    c.fillStyle = "#69435f3b";
    c.beginPath();
    c.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2);
    c.fill();
    if (sprite) {
      const col = this.walking ? 1 + (Math.floor(this.time * 7) % 2) : 0;
      const sw = sprite.width / 3,
        sh = sprite.height / 4;
      c.drawImage(
        sprite,
        col * sw,
        this.facing * sh,
        sw,
        sh,
        x - 23,
        y - 57,
        46,
        61,
      );
    }
    c.restore();
  }
}
