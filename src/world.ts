import roomUrl from "./assets/room-interactive.webp";
import gardenUrl from "./assets/garden-colorful.webp";
import challengeUrl from "./assets/courage-garden.webp";
import spriteUrl from "./assets/nemu-sprites.webp";
import restUrl from "./assets/fufu-rest-poses.webp";
import wreathUrl from "./assets/flower-wreath.webp";
import townUrl from "./assets/anniversary-town-v2.webp";
import trapsUrl from "./assets/garden-traps.webp";
import { drawItem, rewardsUrl } from "./item-art";
import type { EquipSlot, ItemId } from "./items";
import { bedRest, benchRest, type RestState } from "./rest";
import { spriteFrames } from "./sprite-frames";
import {
  advancePath,
  findPath,
  movePlayer,
  touchingHazard,
  PLAYER_RADIUS,
  type Hazard,
  type Point,
} from "./core";
import { scenes, type Hotspot, type SceneId } from "./maps";
export { scenes, type SceneId } from "./maps";
export interface RespawnEvent {
  trap: Hazard;
  scene: SceneId;
}
const art = {
  room: roomUrl,
  garden: gardenUrl,
  challenge: challengeUrl,
  town: townUrl,
};
export interface DepthLayer {
  y: number;
  draw: (context: CanvasRenderingContext2D) => void;
}

export class World {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  scene: SceneId = "room";
  player: Point = { ...scenes.room.spawn };
  private camera: Point = { x: 0, y: 0 };
  private zoom = 1;
  private focus: { point: Point; zoom: number } | null = null;
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
  restState: RestState | null = null;
  private stumble: {
    started: number;
    trap: Hazard;
    scene: SceneId;
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
  onRestChange: (state: RestState | null) => void = () => {};
  onRespawn: (event: RespawnEvent) => void = () => {};
  onDraw: (context: CanvasRenderingContext2D, time: number) => void = () => {};
  onTick: (dt: number, time: number) => void = () => {};
  onPointer: (type: string, point: Point) => boolean = () => false;
  onStep: () => void = () => {};
  onEnvironment: (context: CanvasRenderingContext2D, time: number) => void =
    () => {};
  onLighting: (context: CanvasRenderingContext2D) => void = () => {};
  onEffects: (context: CanvasRenderingContext2D) => void = () => {};
  getDepthLayers: () => DepthLayer[] = () => [];
  available: (spot: Hotspot) => boolean = () => true;
  equipment: Record<EquipSlot, ItemId | null> = { head: null, body: null };
  private stepDistance = 0;
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
      if (key === " " && (e.target as Element).closest("button,a,audio,video"))
        return;
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
          this.standUp();
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
      canvas.focus({ preventScroll: true });
      const point = this.pointerPoint(e);
      if (this.onPointer("down", point)) {
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (this.paused || this.busy) return;
      const spot = this.config.spots
        .filter((s) => this.available(s))
        .map((s) => ({
          s,
          d: Math.hypot(s.x - point.x, this.markerY(s) - point.y),
        }))
        .sort((a, b) => a.d - b.d)
        .find((s) => s.d < 24)?.s;
      const hazard = this.config.hazards.find(
        (h) => Math.hypot(h.x - point.x, h.y - point.y) < h.radius + 10,
      );
      this.goTo(
        spot?.approach ?? hazard ?? point,
        spot?.id ?? null,
        spot ? undefined : hazard?.id,
      );
    });
    for (const type of ["pointermove", "pointerup", "pointercancel"] as const)
      canvas.addEventListener(type, (e) =>
        this.onPointer(type.replace("pointer", ""), this.pointerPoint(e)),
      );
  }
  private pointerPoint(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x:
        (((e.clientX - rect.left) / rect.width) * 600) / this.zoom +
        this.camera.x,
      y:
        (((e.clientY - rect.top) / rect.height) * 400) / this.zoom +
        this.camera.y,
    };
  }
  setFocus(point: Point | null, zoom = 1) {
    this.focus = point ? { point, zoom } : null;
    this.canvas.parentElement!.classList.toggle("inspecting", !!point);
    this.updateCamera();
  }
  project(point: Point): Point {
    return {
      x: (point.x - this.camera.x) * this.zoom,
      y: (point.y - this.camera.y) * this.zoom,
    };
  }
  drawMapFragment(c: CanvasRenderingContext2D, points: Point[]) {
    const background = this.images.get(art[this.scene]);
    if (!background) return;
    const x = Math.floor(Math.min(...points.map((p) => p.x))),
      y = Math.floor(Math.min(...points.map((p) => p.y))),
      w = Math.ceil(Math.max(...points.map((p) => p.x))) - x,
      h = Math.ceil(Math.max(...points.map((p) => p.y))) - y;
    c.save();
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.clip();
    c.drawImage(background, x, y, w, h, x, y, w, h);
    c.restore();
  }
  drawPavingPatch(c: CanvasRenderingContext2D, points: Point[]) {
    const image = this.images.get(townUrl);
    if (!image) return;
    const left = Math.floor(Math.min(...points.map((p) => p.x))),
      top = Math.floor(Math.min(...points.map((p) => p.y)));
    const right = Math.max(...points.map((p) => p.x)),
      bottom = Math.max(...points.map((p) => p.y));
    c.save();
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.clip();
    for (let y = top; y < bottom; y += 32)
      for (let x = left; x < right; x += 32)
        c.drawImage(image, 476, 805, 32, 32, x, y, 32, 32);
    c.restore();
  }
  get config() {
    return scenes[this.scene];
  }
  get busy() {
    return this.stumble !== null;
  }
  sit(anchor: Point, exit: Point) {
    this.clearInput();
    this.restState = benchRest(this.scene, anchor, exit);
    this.player = { ...this.restState.anchor };
    this.facing = 0;
    this.onRestChange(this.restState);
  }
  lieDown() {
    if (this.scene !== "room") this.switchScene("room");
    this.clearInput();
    this.restState = bedRest();
    this.player = { ...this.restState.anchor };
    this.setFocus({ x: 460, y: 138 }, 1.7);
    this.onRestChange(this.restState);
  }
  standUp() {
    if (!this.restState) return;
    this.player = { ...this.restState.exit };
    this.restState = null;
    this.setFocus(null);
    this.clearInput();
    this.onRestChange(null);
  }
  async load() {
    await Promise.all(
      [
        roomUrl,
        gardenUrl,
        challengeUrl,
        spriteUrl,
        restUrl,
        wreathUrl,
        townUrl,
        trapsUrl,
        rewardsUrl,
      ].map(
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
    if (x || y) this.standUp();
    this.touch = { x, y };
    this.path = [];
    this.targetEvent = null;
  }
  switchScene(scene: SceneId) {
    if (this.busy) return;
    this.clearInput();
    this.restState = null;
    this.onRestChange(null);
    this.setFocus(null);
    this.scene = scene;
    this.player = { ...scenes[scene].spawn };
    this.facing = 0;
    this.nearbyId = "";
    this.updateCamera();
    this.onNearby(null);
    this.onScene(scene);
  }
  interact() {
    if (this.paused || this.busy) return;
    if (this.restState) {
      this.standUp();
      return;
    }
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
    this.standUp();
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
        .filter((s) => this.available(s))
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
    this.onTick(document.hidden ? 0 : dt, this.time);
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
        const { trap, scene } = this.stumble;
        this.stumble = null;
        this.switchScene("room");
        this.immunity = 2;
        this.lieDown();
        this.onRespawn({ trap, scene });
      }
      return;
    }
    this.immunity = Math.max(0, this.immunity - dt);
    if (this.restState) return;
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
        this.config.surfaces,
      );
    }
    const dx = this.player.x - before.x,
      dy = this.player.y - before.y;
    this.walking = Math.hypot(dx, dy) > 0.01;
    this.stepDistance += Math.hypot(dx, dy);
    if (this.stepDistance > 22) {
      this.stepDistance = 0;
      this.onStep();
    }
    if (this.walking)
      this.facing =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    const trap =
      this.immunity <= 0
        ? touchingHazard(this.player, this.config.hazards)
        : undefined;
    if (trap) {
      this.clearInput();
      this.stumble = {
        trap,
        scene: this.scene,
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
    this.zoom = this.focus?.zoom ?? 1;
    const center = this.focus?.point ?? this.player;
    this.camera.x = Math.round(
      Math.max(
        0,
        Math.min(
          this.config.width - 600 / this.zoom,
          center.x - 300 / this.zoom,
        ),
      ),
    );
    this.camera.y = Math.round(
      Math.max(
        0,
        Math.min(
          this.config.height - 400 / this.zoom,
          center.y - 200 / this.zoom,
        ),
      ),
    );
  }
  private markerY(spot: Hotspot) {
    const y = Math.round(
      spot.y -
        (spot.markerOffset ?? 12) +
        (this.reducedMotion.matches ? 0 : Math.sin(this.time * 2 + spot.x) * 2),
    );
    if (
      Math.abs(spot.x - this.player.x) < 22 &&
      y > this.player.y - 50 &&
      y < this.player.y + 8
    )
      return Math.round(this.player.y - 57);
    return y;
  }
  private draw() {
    const c = this.ctx,
      { width, height } = this.config;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#f4dfbc";
    c.fillRect(0, 0, 600, 400);
    const background = this.images.get(art[this.scene]);
    c.save();
    c.scale(this.zoom, this.zoom);
    c.translate(-this.camera.x, -this.camera.y);
    if (background) c.drawImage(background, 0, 0, width, height);
    this.onEnvironment(c, this.time);
    if (this.scene === "room") {
      c.fillStyle = "#8171b0";
      c.fillRect(274, 368, 52, 11);
      c.fillStyle = "#c9b8e5";
      c.fillRect(278, 370, 44, 7);
    }
    this.drawHazards();
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
    const drawPlayer = () => {
      const sprite = this.images.get(spriteUrl),
        x = Math.round(this.player.x),
        y = Math.round(this.player.y);
      c.fillStyle = "#53496045";
      c.beginPath();
      c.ellipse(x, y, 11, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      if (this.restState) this.drawRestSprite(c, x, y);
      else if (sprite) {
        const col = this.walking ? 1 + (Math.floor(this.time * 7) % 2) : 0;
        const frame = spriteFrames[this.facing * 3 + col];
        const scaleFactor = 43 / 330;
        const size = {
          width: frame.w * scaleFactor,
          height: frame.h * scaleFactor,
        };
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
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          -size.width / 2,
          -size.height,
          size.width,
          size.height,
        );
        c.restore();
      }
      this.drawEquipment(c, x, y);
    };
    const layers = [
      ...this.getDepthLayers(),
      { y: this.player.y, draw: drawPlayer },
    ];
    layers.sort((a, b) => a.y - b.y).forEach((layer) => layer.draw(c));
    for (const spot of this.config.spots) {
      if (!this.available(spot)) continue;
      if (this.restState && (spot.id === "rest" || spot.id === "bed")) continue;
      if (this.focus) continue;
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
    this.onDraw(c, this.time);
    this.onLighting(c);
    this.onEffects(c);
    if (this.debug) this.drawDebug();
    c.restore();
  }
  private drawRestSprite(c: CanvasRenderingContext2D, x: number, y: number) {
    const image = this.images.get(restUrl);
    if (!image || !this.restState) return;
    const sleeping = this.restState.kind === "lying";
    const frame = sleeping
      ? { x: 754, y: 275, w: 966, h: 520 }
      : { x: 87, y: 88, w: 593, h: 733 };
    const width = sleeping ? 70 : 30,
      height = (width / frame.w) * frame.h;
    c.drawImage(
      image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      x - width / 2,
      y - (sleeping ? height / 2 : height),
      width,
      height,
    );
    if (sleeping) {
      c.fillStyle = "#a999c9";
      c.font = "8px sans-serif";
      c.fillText("z", x + 24, y - 23);
      c.font = "6px sans-serif";
      c.fillText("z", x + 31, y - 30);
    }
  }
  private drawEquipment(c: CanvasRenderingContext2D, x: number, y: number) {
    const wreath = this.images.get(wreathUrl)!,
      rewards = this.images.get(rewardsUrl)!;
    const head = this.equipment.head,
      body = this.equipment.body;
    const sleeping = this.restState?.kind === "lying",
      sitting = this.restState?.kind === "sitting";
    if (body) {
      if (body === "moonBag")
        drawItem(
          c,
          body,
          x +
            (sleeping
              ? 36
              : this.facing === 1
                ? 7
                : this.facing === 2
                  ? -20
                  : -9),
          y + (sleeping ? 16 : sitting ? -23 : -27),
          18,
          21,
          wreath,
          rewards,
        );
      else if (sleeping || sitting || this.facing !== 3)
        drawItem(
          c,
          body,
          x + (sleeping ? 6 : -7),
          y + (sleeping ? 2 : sitting ? -18 : -20),
          9,
          10,
          wreath,
          rewards,
        );
    }
    if (!head) return;
    c.save();
    c.translate(
      x + (sleeping ? -21 : head === "candyClip" ? 8 : 0),
      y +
        (sleeping
          ? -15
          : sitting
            ? head === "headphones"
              ? -28
              : -33
            : head === "headphones"
              ? -33
              : -40),
    );
    if (sleeping) c.rotate(0.45);
    const width =
      head === "candyClip"
        ? 13
        : head === "wreath"
          ? sleeping
            ? 27
            : 32
          : head === "starWings"
            ? 26
            : 29;
    const height =
      head === "wreath"
        ? 22
        : head === "candyClip"
          ? 13
          : head === "starWings"
            ? 19
            : 27;
    drawItem(c, head, -width / 2, -height / 2, width, height, wreath, rewards);
    c.restore();
  }
  private drawHazards() {
    const c = this.ctx,
      image = this.images.get(trapsUrl);
    for (const trap of this.config.hazards) {
      const { x, y, radius: r } = trap;
      c.save();
      c.fillStyle = "#4a604b28";
      c.beginPath();
      c.ellipse(x, y + 3, r + 2, 7, 0, 0, Math.PI * 2);
      c.fill();
      const i = { ribbon: 0, stone: 1, mist: 2, wind: 3 }[trap.kind];
      const frames = [
        { x: 30, y: 110, w: 775, h: 375 },
        { x: 830, y: 50, w: 690, h: 440 },
        { x: 30, y: 520, w: 780, h: 485 },
        { x: 840, y: 515, w: 680, h: 490 },
      ];
      const f = frames[i];
      const floating = trap.kind === "mist" || trap.kind === "wind";
      const bob =
        floating && !this.reducedMotion.matches
          ? Math.sin(this.time * 1.4 + i) * 1.5
          : 0;
      if (image) {
        const width = (r + 7) * 2,
          height = (width / f.w) * f.h;
        c.drawImage(
          image,
          f.x,
          f.y,
          f.w,
          f.h,
          x - width / 2,
          y + 6 - height + bob,
          width,
          height,
        );
      }
      c.restore();
      if (Math.hypot(this.player.x - x, this.player.y - y) < 70)
        this.label(x, y + r + 12, "小挫折 · " + trap.title, "#8e7c69");
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
    c.strokeStyle = "#56d4e5";
    for (const surface of this.config.surfaces ?? []) {
      c.beginPath();
      surface.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.closePath();
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
      this.debugOutput.textContent = `${this.scene} · feet ${this.player.x.toFixed(1)},${this.player.y.toFixed(1)} · respawn home-bed · pose ${this.restState?.kind ?? "standing"} · camera ${this.camera.x},${this.camera.y} ×${this.zoom} · sprite height 43 / exact crop · ${this.busy ? "stumble" : this.paused ? "paused" : "walk"} · path ${this.path.length}`;
  }
}
