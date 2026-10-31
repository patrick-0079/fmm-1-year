import roomUrl from "./assets/room-colorful.webp";
import gardenUrl from "./assets/garden-colorful.webp";
import spriteUrl from "./assets/nemu-sprites.webp";
import {
  advancePath,
  findPath,
  fitSprite,
  movePlayer,
  touchingHazard,
  PLAYER_RADIUS,
  type Checkpoint,
  type Hazard,
  type Point,
} from "./core";
import { scenes, type Hotspot, type SceneId } from "./maps";
export { scenes, type SceneId } from "./maps";
export interface RespawnEvent {
  trap: Hazard;
  checkpoint: Checkpoint;
  scene: SceneId;
}
const art = { room: roomUrl, garden: gardenUrl };

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
  private checkpointId: Record<SceneId, string> = {
    room: "room-light",
    garden: "garden-entry",
  };
  private stumble: {
    started: number;
    trap: Hazard;
    checkpoint: Checkpoint;
  } | null = null;
  private immunity = 0;
  private debug =
    import.meta.env.DEV && new URLSearchParams(location.search).has("debug");
  private debugOutput: HTMLOutputElement | null = null;
  paused = true;
  visited: string[] = [];
  onInteract: (id: string) => void = () => {};
  onNearby: (spot: Hotspot | null) => void = () => {};
  onScene: (id: SceneId) => void = () => {};
  onToast: (text: string) => void = () => {};
  onCheckpoint: (point: Checkpoint, activated: boolean) => void = () => {};
  onRespawn: (event: RespawnEvent) => void = () => {};
  private nearbyId = "";
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = 600;
    canvas.height = 400;
    if (this.debug) {
      this.debugOutput = document.createElement("output");
      this.debugOutput.className = "debug-readout";
      canvas.parentElement!.append(this.debugOutput);
    }
    window.addEventListener("keydown", (e) => {
      if (
        this.paused ||
        this.busy ||
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
        if (key === "e" || key === " ") {
          if (!e.repeat) this.interact();
        } else {
          this.keys.add(key);
          this.path = [];
          this.targetEvent = null;
        }
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
      if (this.paused || this.busy) return;
      canvas.focus({ preventScroll: true });
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: ((e.clientX - rect.left) / rect.width) * 600 + this.camera.x,
        y: ((e.clientY - rect.top) / rect.height) * 400 + this.camera.y,
      };
      const spot = this.config.spots
        .map((s) => ({
          s,
          d: Math.hypot(s.x - point.x, this.markerY(s) - point.y),
        }))
        .sort((a, b) => a.d - b.d)
        .find((s) => s.d < 24)?.s;
      const hazard = this.config.hazards.find(
        (h) => Math.hypot(h.x - point.x, h.y - point.y) < h.radius + 10,
      );
      const checkpoint = this.config.checkpoints.find(
        (p) => Math.hypot(p.x - point.x, p.y - point.y) < 18,
      );
      this.goTo(
        spot?.approach ?? checkpoint ?? hazard ?? point,
        spot?.id ?? null,
        spot || checkpoint ? undefined : hazard?.id,
      );
    });
  }
  get config() {
    return scenes[this.scene];
  }
  get busy() {
    return this.stumble !== null;
  }
  get activeCheckpoint() {
    return (
      this.config.checkpoints.find(
        (p) => p.id === this.checkpointId[this.scene],
      ) ?? this.config.checkpoints[0]
    );
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
    if (this.paused || this.busy) return;
    this.touch = { x, y };
    this.path = [];
    this.targetEvent = null;
  }
  switchScene(scene: SceneId) {
    if (this.busy) return;
    this.clearInput();
    this.scene = scene;
    this.player = { ...scenes[scene].spawn };
    this.facing = 0;
    this.nearbyId = "";
    this.checkpointId[scene] = scenes[scene].checkpoints[0].id;
    this.updateCamera();
    this.onNearby(null);
    this.onScene(scene);
    this.onCheckpoint(this.activeCheckpoint, false);
  }
  interact() {
    if (this.paused || this.busy) return;
    const nearby = this.nearest();
    if (nearby) {
      this.clearInput();
      this.onInteract(nearby.id);
    } else this.onToast("走近闪闪发光的物件，再按互动键吧。");
  }
  visit(id: string) {
    if (this.busy) return;
    const spot = this.config.spots.find((s) => s.id === id);
    if (spot) this.goTo(spot.approach, id);
  }
  private goTo(goal: Point, event: string | null, intendedHazard?: string) {
    this.clearInput();
    const avoid = this.config.hazards.filter((h) => h.id !== intendedHazard);
    const path = findPath(this.player, goal, this.config, avoid);
    if (!path) {
      this.onToast("这里有物件挡着，试试旁边的空地。");
      return;
    }
    this.path = path;
    this.targetEvent = event;
  }
  private nearest() {
    return (
      this.config.spots
        .map((s) => ({
          s,
          d: Math.hypot(this.player.x - s.x, this.player.y - s.y),
        }))
        .filter(({ s, d }) => d < (s.radius ?? 48))
        .sort((a, b) => a.d - b.d)[0]?.s ?? null
    );
  }
  private frame = (timestamp: number) => {
    const dt = Math.min((timestamp - (this.last || timestamp)) / 1000, 0.05);
    this.last = timestamp;
    this.time = timestamp / 1000;
    if (!this.paused && !document.hidden) this.update(dt);
    this.updateCamera();
    this.draw();
    this.frameId = requestAnimationFrame(this.frame);
  };
  stop() {
    cancelAnimationFrame(this.frameId);
  }
  private update(dt: number) {
    if (this.stumble) {
      if (
        this.time - this.stumble.started >
        (this.reducedMotion.matches ? 0.12 : 0.45)
      ) {
        const { trap, checkpoint } = this.stumble;
        this.stumble = null;
        this.player = { x: checkpoint.x, y: checkpoint.y };
        this.facing = 0;
        this.immunity = 2;
        this.clearInput();
        this.updateCamera();
        this.nearbyId = "";
        this.onNearby(null);
        this.onRespawn({ trap, checkpoint, scene: this.scene });
      }
      return;
    }
    this.immunity = Math.max(0, this.immunity - dt);
    const before = { ...this.player };
    if (this.path.length) {
      const result = advancePath(this.player, this.path, dt, this.config);
      this.player = result.point;
      this.path = result.remaining;
      if (result.blocked) {
        this.targetEvent = null;
        this.onToast("前面有物件挡着，换个方向走走吧。");
      }
    } else {
      const x =
        this.touch.x +
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
      const y =
        this.touch.y +
        (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
        (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
      this.player = movePlayer(
        this.player,
        { x, y },
        dt,
        this.config.walls,
        this.config.bounds,
        this.config.floor,
      );
    }
    const dx = this.player.x - before.x,
      dy = this.player.y - before.y;
    this.walking = Math.hypot(dx, dy) > 0.01;
    if (this.walking)
      this.facing =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    const checkpoint = this.config.checkpoints.find(
      (p) => Math.hypot(this.player.x - p.x, this.player.y - p.y) < 16,
    );
    if (checkpoint && checkpoint.id !== this.activeCheckpoint.id) {
      this.checkpointId[this.scene] = checkpoint.id;
      this.onCheckpoint(checkpoint, true);
    }
    const trap =
      this.immunity <= 0
        ? touchingHazard(this.player, this.config.hazards)
        : undefined;
    if (trap) {
      this.clearInput();
      this.stumble = {
        trap,
        checkpoint: { ...this.activeCheckpoint },
        started: this.time,
      };
      return;
    }
    if (!this.path.length && this.targetEvent) {
      const id = this.targetEvent;
      this.targetEvent = null;
      const spot = this.config.spots.find((s) => s.id === id);
      if (
        spot &&
        Math.hypot(this.player.x - spot.x, this.player.y - spot.y) <
          (spot.radius ?? 48)
      ) {
        this.onInteract(id);
        return;
      }
    }
    const nearby = this.nearest();
    if ((nearby?.id ?? "") !== this.nearbyId) {
      this.nearbyId = nearby?.id ?? "";
      this.onNearby(nearby);
    }
  }
  private updateCamera() {
    this.camera.x = Math.round(
      Math.max(0, Math.min(this.config.width - 600, this.player.x - 300)),
    );
    this.camera.y = Math.round(
      Math.max(0, Math.min(this.config.height - 400, this.player.y - 200)),
    );
  }
  private markerY(spot: Hotspot) {
    return Math.round(
      spot.y -
        12 +
        (this.reducedMotion.matches ? 0 : Math.sin(this.time * 2 + spot.x) * 2),
    );
  }
  private draw() {
    const c = this.ctx,
      { width, height } = this.config;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#f4dfbc";
    c.fillRect(0, 0, 600, 400);
    const background = this.images.get(art[this.scene]);
    if (background)
      c.drawImage(background, -this.camera.x, -this.camera.y, width, height);
    c.save();
    c.translate(-this.camera.x, -this.camera.y);
    if (this.scene === "room") {
      c.fillStyle = "#8171b0";
      c.fillRect(274, 368, 52, 11);
      c.fillStyle = "#c9b8e5";
      c.fillRect(278, 370, 44, 7);
    }
    this.drawCheckpoints();
    this.drawHazards();
    for (const spot of this.config.spots) {
      const y = this.markerY(spot);
      c.fillStyle = "#fff8ed";
      c.fillRect(spot.x - 6, y - 6, 12, 12);
      c.fillStyle =
        spot.id === this.nearbyId ? "#a25491" : (spot.color ?? "#e87d9e");
      c.fillRect(spot.x - 4, y - 4, 8, 8);
      c.fillStyle = "#fffaf1";
      if (this.visited.includes(spot.id)) {
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
      c.fillStyle = `rgba(255,245,195,${0.22 + Math.sin(t * 2 + i) * 0.18})`;
      c.fillRect(
        Math.round((i * 89 + t * 4) % width),
        Math.round((i * 67 + Math.sin(t + i) * 7) % height),
        2,
        2,
      );
    }
    const sprite = this.images.get(spriteUrl),
      x = Math.round(this.player.x),
      y = Math.round(this.player.y);
    c.fillStyle = "#53496045";
    c.beginPath();
    c.ellipse(x, y, 11, 3.5, 0, 0, Math.PI * 2);
    c.fill();
    if (sprite) {
      const sw = sprite.width / 3,
        sh = sprite.height / 4,
        size = fitSprite(sw, sh),
        col = this.walking ? 1 + (Math.floor(this.time * 7) % 2) : 0;
      c.save();
      c.translate(x, y);
      let scale = 1;
      if (this.stumble) {
        const phase = Math.min(1, (this.time - this.stumble.started) / 0.45);
        scale = 1 - phase * 0.5;
        c.globalAlpha = 1 - phase * 0.7;
        if (!this.reducedMotion.matches)
          c.rotate(Math.sin(phase * Math.PI) * 0.28);
      } else if (this.immunity > 0) c.globalAlpha = 0.82;
      c.scale(scale, scale);
      c.drawImage(
        sprite,
        col * sw,
        this.facing * sh,
        sw,
        sh,
        -size.width / 2,
        -size.height * 0.96,
        size.width,
        size.height,
      );
      c.restore();
    }
    if (this.debug) this.drawDebug();
    c.restore();
  }
  private drawCheckpoints() {
    const c = this.ctx;
    for (const point of this.config.checkpoints) {
      const active = point.id === this.activeCheckpoint.id;
      c.fillStyle = active ? "#f6ce6c66" : "#dcecfb55";
      c.beginPath();
      c.ellipse(point.x, point.y, 15, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = active ? "#fff1a6" : "#9bc6df";
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(point.x, point.y, 15, 8, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = active ? "#efb44f" : "#88acc5";
      c.fillRect(point.x - 5, point.y - 12, 10, 11);
      c.fillStyle = active ? "#fff5b8" : "#d8edff";
      c.fillRect(point.x - 3, point.y - 10, 6, 6);
      c.fillStyle = "#fff8df";
      c.fillRect(point.x - 1, point.y - 16, 2, 5);
      c.fillRect(point.x - 3, point.y - 14, 6, 2);
      if (Math.hypot(this.player.x - point.x, this.player.y - point.y) < 58)
        this.label(
          point.x,
          point.y + 16,
          point.title,
          active ? "#716947" : "#567b94",
        );
    }
  }
  private drawHazards() {
    const c = this.ctx;
    for (const trap of this.config.hazards) {
      const { x, y, radius: r } = trap;
      c.save();
      c.translate(x, y);
      c.strokeStyle = "#d28a6bb3";
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.arc(0, 0, r + 4, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#9a616824";
      c.beginPath();
      c.ellipse(0, 3, r, 7, 0, 0, Math.PI * 2);
      c.fill();
      if (trap.kind === "ribbon") {
        c.fillStyle = "#cd7194";
        c.fillRect(-13, -3, 26, 6);
        c.fillRect(-5, -10, 5, 19);
        c.fillStyle = "#f6bd77";
        c.fillRect(-10, -7, 7, 5);
        c.fillRect(3, -7, 7, 5);
        c.fillStyle = "#f8d5e3";
        c.fillRect(-2, -3, 5, 5);
      }
      if (trap.kind === "stone") {
        c.fillStyle = "#727e9c";
        c.fillRect(-13, -3, 26, 9);
        c.fillRect(-8, -10, 16, 8);
        c.fillStyle = "#acb9ce";
        c.fillRect(-7, -8, 10, 3);
        c.fillStyle = "#f4c682";
        c.fillRect(5, 1, 5, 4);
      }
      if (trap.kind === "mist") {
        for (let i = 0; i < 3; i++) {
          c.fillStyle = ["#c6c8ecb3", "#b9dbf0aa", "#ded1f2ba"][i];
          c.beginPath();
          c.arc((i - 1) * 10, -2 - (i % 2) * 5, 11, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#8c89c4";
        c.fillRect(-7, 0, 3, 3);
        c.fillRect(5, 0, 3, 3);
      }
      if (trap.kind === "wind") {
        c.strokeStyle = "#8d9ac5";
        c.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.ellipse(0, -8 + i * 5, 5 + i * 4, 3, 0, 0.2, Math.PI * 1.85);
          c.stroke();
        }
        c.fillStyle = "#efabbd";
        c.fillRect(10, -12, 4, 4);
        c.fillStyle = "#9fcee3";
        c.fillRect(-15, -1, 4, 4);
      }
      c.fillStyle = "#d88068";
      c.beginPath();
      c.moveTo(0, -r - 7);
      c.lineTo(-4, -r - 1);
      c.lineTo(4, -r - 1);
      c.closePath();
      c.fill();
      c.restore();
      if (Math.hypot(this.player.x - x, this.player.y - y) < 76)
        this.label(x, y + r + 15, trap.title, "#a4675a");
    }
  }
  private label(x: number, y: number, text: string, color: string) {
    const c = this.ctx;
    c.save();
    c.font = '9px "Microsoft YaHei", sans-serif';
    c.textAlign = "center";
    const width = c.measureText(text).width + 10;
    c.fillStyle = "#fffaf0ed";
    c.fillRect(x - width / 2, y - 8, width, 13);
    c.fillStyle = color;
    c.fillText(text, x, y + 1);
    c.restore();
  }
  private drawDebug() {
    const c = this.ctx;
    c.save();
    c.lineWidth = 1;
    if (this.config.floor) {
      c.strokeStyle = "#00def2";
      c.beginPath();
      this.config.floor.forEach((p, i) =>
        i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
      );
      c.closePath();
      c.stroke();
    }
    for (const wall of this.config.walls) {
      c.strokeStyle = "#ee335d";
      c.fillStyle = "#ee335d22";
      c.beginPath();
      if ("points" in wall) {
        wall.points.forEach((p, i) =>
          i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
        );
        c.closePath();
      } else c.rect(wall.x, wall.y, wall.w, wall.h);
      c.fill();
      c.stroke();
    }
    c.strokeStyle = "#14c687";
    c.beginPath();
    c.arc(this.player.x, this.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = "#0d679f";
    c.beginPath();
    c.moveTo(this.player.x, this.player.y);
    for (const p of this.path) c.lineTo(p.x, p.y);
    c.stroke();
    c.restore();
    if (this.debugOutput)
      this.debugOutput.textContent = `${this.scene} · feet ${this.player.x.toFixed(1)},${this.player.y.toFixed(1)} · checkpoint ${this.activeCheckpoint.id} · sprite 48×48 · ${this.busy ? "stumble" : this.paused ? "paused" : "walk"} · path ${this.path.length}`;
  }
}
