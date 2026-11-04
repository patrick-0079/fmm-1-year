import roomUrl from "./assets/room-interactive.webp";
import gardenUrl from "./assets/garden-lanes-v18.webp";
import challengeUrl from "./assets/courage-garden.webp";
import spriteUrl from "./assets/nemu-sprites.webp";
import restUrl from "./assets/fufu-rest-poses.webp";
import wreathUrl from "./assets/flower-wreath.webp";
import townUrl from "./assets/anniversary-town-v13.webp";
import townDetailUrl from "./assets/anniversary-town-hd-v13.webp";
import meadowUrl from "./assets/night-meadow-v16.webp";
import ruinsUrl from "./assets/echo-ruins.webp";
import wellUrl from "./assets/echo-well.webp";
import { crossedEchoGate } from "./ruins-map";
import { meadowAtlasUrl, orchardAtlasUrl } from "./wild-art";
import { prepareSceneArt } from "./scene-art";
import trapsUrl from "./assets/garden-traps.webp";
import { rewardsUrl } from "./item-art";
import { emptyInventory, type Equipped } from "./items";
import { bedRest, benchRest, type RestState } from "./rest";
import { drawAvatar } from "./avatar";
import type { Facing } from "./equipment";
import { clickedInteraction } from "./interaction";
import { reservedShortcut, readingTarget } from "./input";
import { connectionLayers } from "./connections";
import { crossedTownGate } from "./gate-layout";
import { enteredMoonCircle } from "./meadow-map";
import {
  advancePath,
  canStand,
  findPath,
  movePlayer,
  touchingHazard,
  PLAYER_RADIUS,
  type Hazard,
  type Point,
} from "./core";
import { bloomingGarden, scenes, type Hotspot, type SceneId } from "./maps";
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
  meadow: meadowUrl,
  ruins: ruinsUrl,
};
const sceneTextures: Record<SceneId, string[]> = {
  room: [roomUrl, spriteUrl, restUrl, wreathUrl, rewardsUrl],
  garden: [gardenUrl, orchardAtlasUrl], challenge: [challengeUrl, orchardAtlasUrl, trapsUrl],
  town: [townUrl], meadow: [meadowUrl, meadowAtlasUrl], ruins: [ruinsUrl, wellUrl],
};
export interface DepthLayer {
  y: number;
  draw: (context: CanvasRenderingContext2D) => void;
}

export class World {
  canvas: HTMLCanvasElement;
  private inputRegion: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  scene: SceneId = "room";
  player: Point = { ...scenes.room.spawn };
  private camera: Point = { x: 0, y: 0 };
  private zoom = 1;
  private focus: { point: Point; zoom: number } | null = null;
  private images = new Map<string, HTMLImageElement>();
  private townDetail: HTMLImageElement | null = null;
  private townDetailPending = false;
  private mapRequests = new Map<SceneId, Promise<void>>();
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
  get collisionOverlay() { return this.debug; }
  showCollisionOverlay(on:boolean) {
    this.debug=on;
    if(on && !this.debugOutput) {
      this.debugOutput=document.createElement("output"); this.debugOutput.className="debug-readout";
      this.canvas.parentElement!.append(this.debugOutput);
    }
    if(this.debugOutput) this.debugOutput.hidden=!on;
  }
  paused = true;
  private suspensions = new Set<string>();
  get suspended() {
    return this.suspensions.size > 0;
  }
  suspend(reason: string, active: boolean) {
    if (active === this.suspensions.has(reason)) return;
    if (active) this.suspensions.add(reason);
    else this.suspensions.delete(reason);
    this.inputRegion.inert = this.suspended;
    this.clearInput();
  }
  onInputCancel: () => void = () => {};
  visited: string[] = [];
  onInteract: (id: string) => void = () => {};
  onNearby: (spot: Hotspot | null) => void = () => {};
  onScene: (id: SceneId) => void = () => {};
  onToast: (text: string) => void = () => {};
  onRestChange: (state: RestState | null) => void = () => {};
  onRespawn: (event: RespawnEvent) => void = () => {};
  onDraw: (context: CanvasRenderingContext2D, time: number) => void = () => {};
  onTick: (dt: number, time: number) => void = () => {};
  onPointer: (type: string, point: Point, pointerType: string) => boolean = () => false;
  onSecondaryPointer: (point: Point) => boolean = () => false;
  onStep: () => void = () => {};
  onEnvironment: (context: CanvasRenderingContext2D, time: number) => void =
    () => {};
  onLighting: (context: CanvasRenderingContext2D) => void = () => {};
  onEffects: (context: CanvasRenderingContext2D) => void = () => {};
  onOverlay: (context: CanvasRenderingContext2D) => void = () => {};
  getDepthLayers: () => DepthLayer[] = () => [];
  available: (spot: Hotspot) => boolean = () => true;
  canEnter: (scene: SceneId) => boolean = scene => scene !== "meadow";
  equipment: Equipped = emptyInventory().equipped;
  private stepDistance = 0;
  private nearbyId = "";
  private secondaryPressed = false;
  onAction: (pressed: boolean) => boolean = () => false;
  actorHidden = false;
  drawAvatarAt(c: CanvasRenderingContext2D, x: number, y: number, frame = 0) {
    c.save();
    c.translate(x, y);
    drawAvatar(c, "standing", 0, frame, this.equipment, {
      sprite: this.images.get(spriteUrl)!,
      rest: this.images.get(restUrl)!,
      wreath: this.images.get(wreathUrl)!,
      rewards: this.images.get(rewardsUrl)!,
    });
    c.restore();
  }
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.inputRegion = canvas.closest<HTMLElement>(".game-stage") ?? canvas.parentElement!;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = 600;
    canvas.height = 400;
    const resize = () => {
      const width = Math.max(1, canvas.getBoundingClientRect().width);
      const pixels = Math.ceil(
        width * Math.min(3, window.devicePixelRatio || 1),
      );
      if (canvas.width !== pixels) {
        canvas.width = pixels;
        canvas.height = Math.round((pixels * 2) / 3);
      }
    };
    new ResizeObserver(resize).observe(canvas);
    window.addEventListener("resize", resize);
    resize();
    if (this.debug) this.showCollisionOverlay(true);
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      const bag = e.target instanceof Element && e.target.closest(".inventory-panel");
      const exploringFromBag = bag && !this.paused && /^(?:arrow(?:up|down|left|right)|[wasde])$/.test(key);
      if (
        reservedShortcut(e) ||
        this.suspended ||
        (readingTarget(e.target) && !exploringFromBag) ||
        this.busy
      )
        return;
      if (key === " " && (e.target as Element).closest("button,a,audio,video"))
        return;
      if (key === "e" || key === " ") {
        e.preventDefault();
        if (e.repeat) return;
        if (this.restState && !this.paused) this.interact();
        else if (this.onAction(true)) {
          e.stopImmediatePropagation();
        } else if (!this.paused) this.interact();
        return;
      }
      if (this.paused) return;
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
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (["e", " "].includes(e.key.toLowerCase()) && this.onAction(false))
        e.stopImmediatePropagation();
    });
    window.addEventListener("blur", () => {
      this.secondaryPressed = false;
      this.clearInput();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearInput();
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (this.suspended) return;
      canvas.focus({ preventScroll: true });
      const point = this.pointerPoint(e);
      if (e.button === 2) {
        e.preventDefault();
        if (this.busy || this.onSecondaryPointer(point)) return;
        this.secondaryPressed = true;
        canvas.setPointerCapture(e.pointerId);
        if (this.restState && !this.paused) {
          this.interact();
          return;
        }
        if (this.onAction(true) || this.paused) return;
        const spot = this.spotAt(point);
        if (spot) this.goTo(spot.approach, spot.id);
        else this.interact();
        return;
      }
      if (e.button !== 0) return;
      if (this.onPointer("down", point, e.pointerType)) {
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (this.paused || this.busy) return;
      const spot = this.spotAt(point);
      const hazard = this.config.hazards.find(
        (h) => Math.hypot(h.x - point.x, h.y - point.y) < h.radius + 10,
      );
      this.goTo(
        spot?.approach ?? hazard ?? point,
        spot?.id ?? null,
        spot ? undefined : hazard?.id,
      );
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerleave",()=>canvas.removeAttribute("data-pointable"));
    const scene = this.inputRegion;
    scene.addEventListener("contextmenu", (e) => e.preventDefault());
    scene.addEventListener("pointerdown", (e) => {
      if (e.button !== 2 || e.defaultPrevented || e.target === canvas) return;
      const button = (e.target as Element).closest<HTMLButtonElement>("button");
      if (button && !button.disabled) {
        e.preventDefault();
        button.click();
      }
    });
    for (const type of ["pointermove", "pointerup", "pointercancel"] as const)
      canvas.addEventListener(type, (e) => {
        if (type === "pointermove" && e.pointerType !== "touch" && !e.buttons)
          canvas.toggleAttribute("data-pointable",!this.paused && !this.suspended && !this.busy && !!this.spotAt(this.pointerPoint(e)));
        if (this.secondaryPressed || e.button === 2) {
          if (type !== "pointermove" && this.secondaryPressed) {
            this.secondaryPressed = false;
            this.onAction(false);
          }
          return;
        }
        if (!this.suspended)
          this.onPointer(type.replace("pointer", ""), this.pointerPoint(e), e.pointerType);
      });
  }
  private spotAt(point: Point) {
    return clickedInteraction(point,this.config.spots.filter(s=>this.available(s)),s=>this.markerY(s));
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
    this.canvas.removeAttribute("data-pointable");
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
  private loadTownDetail() {
    if (this.townDetail || this.townDetailPending) return;
    this.townDetailPending = true;
    const image = new Image();
    image.decoding = "async";
    image.src = townDetailUrl;
    // The lightweight map is already playable. Do not pause the frame loop or
    // replace it with a partially decoded image; a later visit can retry.
    void image.decode().then(() => { this.townDetail = image; })
      .catch(() => {}).finally(() => { this.townDetailPending = false; });
  }
  prepareScene(scene: SceneId): Promise<void> {
    if (!this.canEnter(scene)) return Promise.reject(new Error("尚未集齐七色花"));
    if (this.images.has(art[scene])) return Promise.resolve();
    const pending = this.mapRequests.get(scene);
    if (pending) return pending;
    const textures = sceneTextures[scene].filter(url=>!this.images.has(url)).map(async url => {
        const image = new Image();
        image.fetchPriority = "high";
        image.decoding = "async"; image.src = url;
        await image.decode();
        return [url, image] as const;
      });
    const request = Promise.all([Promise.all(textures), prepareSceneArt(scene)])
        .then(([images]) => { for (const [url, image] of images) this.images.set(url,image); })
        .finally(() => { this.mapRequests.delete(scene); });
    this.mapRequests.set(scene, request);
    return request;
  }
  get meadowSprites() { return this.images.get(meadowAtlasUrl); }
  get echoWell() { return this.images.get(wellUrl); }
  get orchardSprites() { return this.images.get(orchardAtlasUrl); }
  private paintMap(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const background = (this.scene === "town" && this.townDetail) || this.images.get(art[this.scene]);
    if (!background) return;
    const sx = background.naturalWidth / this.config.width,
      sy = background.naturalHeight / this.config.height;
    c.save();
    if (this.scene === "town" && (this.canvas.width / 600) * this.zoom < sx) {
      // When reducing HD art, retain fine leaves and mortar instead of picking
      // a single random source pixel. Never blur enlarged sprites or labels.
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
    }
    c.drawImage(background, x * sx, y * sy, w * sx, h * sy, x, y, w, h);
    c.restore();
  }
  drawMapFragment(c: CanvasRenderingContext2D, points: Point[]) {
    const x = Math.floor(Math.min(...points.map((p) => p.x))),
      y = Math.floor(Math.min(...points.map((p) => p.y))),
      w = Math.ceil(Math.max(...points.map((p) => p.x))) - x,
      h = Math.ceil(Math.max(...points.map((p) => p.y))) - y;
    c.save();
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.clip();
    this.paintMap(c, x, y, w, h);
    c.restore();
  }
  get config() {
    return this.scene === "garden" && this.canEnter("meadow") ? bloomingGarden : scenes[this.scene];
  }
  get visibleArea() {
    return {
      x: this.camera.x,
      y: this.camera.y,
      w: 600 / this.zoom,
      h: 400 / this.zoom,
    };
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
    await this.prepareScene("room");
    this.frameId = requestAnimationFrame(this.frame);
  }
  clearInput() {
    this.onInputCancel();
    this.keys.clear();
    this.touch = { x: 0, y: 0 };
    this.path = [];
    this.targetEvent = null;
    this.walking = false;
  }
  setTouch(x: number, y: number) {
    if (this.paused || this.busy || this.suspended) return;
    if (x || y) this.standUp();
    this.touch = { x, y };
    this.path = [];
    this.targetEvent = null;
  }
  switchScene(scene: SceneId, arrival?: Point, facing: Facing = 0) {
    if (this.busy || !this.canEnter(scene)) return;
    if (!this.images.has(art[scene])) void this.prepareScene(scene).catch(()=>this.onToast("地图图片未能载入，请再试一次。"));
    this.clearInput();
    this.restState = null;
    this.onRestChange(null);
    this.setFocus(null);
    this.scene = scene;
    if (scene === "town") this.loadTownDetail();
    const s = this.config;
    this.player = {
      ...(arrival && canStand(arrival, s.walls, s.bounds, s.floor, s.surfaces)
        ? arrival
        : s.spawn),
    };
    this.facing = facing;
    this.nearbyId = "";
    this.updateCamera();
    this.onNearby(null);
    this.onScene(scene);
  }
  interact() {
    if (this.paused || this.busy || this.suspended) return;
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
    if (spot && this.available(spot)) this.goTo(spot.approach, id);
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
    this.onTick(document.hidden || this.suspended ? 0 : dt, this.time);
    if (!this.paused && !this.suspended && !document.hidden) this.update(dt);
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
    if (this.walking && !this.targetEvent) {
      const crossing = this.scene === "meadow" && enteredMoonCircle(before,this.player)
        ? "meadow-exit" : crossedEchoGate(this.scene,before,this.player) ?? crossedTownGate(this.scene,before,this.player)?.id;
      if (crossing) { this.clearInput(); this.onInteract(crossing); return; }
    }
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
        spot && this.available(spot) &&
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
    this.zoom = this.focus?.zoom ?? (this.scene === "town" ? 0.9 : 1);
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
    if (spot.selfMarked) return spot.y - (spot.markerOffset ?? 10);
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
    // Text renders at the display's native density; bitmap sprites keep nearest
    // neighbour sampling. Logical game and pointer coordinates remain 600 × 400.
    c.setTransform(
      this.canvas.width / 600,
      0,
      0,
      this.canvas.height / 400,
      0,
      0,
    );
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#f4dfbc";
    c.fillRect(0, 0, 600, 400);
    c.save();
    c.scale(this.zoom, this.zoom);
    c.translate(-this.camera.x, -this.camera.y);
    const view = this.visibleArea;
    this.paintMap(c, view.x, view.y, Math.min(view.w, width - view.x), Math.min(view.h, height - view.y));
    this.onEnvironment(c, this.time);
    if (this.scene === "room") {
      c.fillStyle = "#8171b0";
      c.fillRect(274, 368, 52, 11);
      c.fillStyle = "#c9b8e5";
      c.fillRect(278, 370, 44, 7);
    }
    this.drawHazards();
    for (let i = 0; this.scene !== "meadow" && i < 12; i++) {
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
      if (this.actorHidden) return;
      const x = Math.round(this.player.x),
        y = Math.round(this.player.y);
      c.fillStyle = "#53496045";
      c.beginPath();
      c.ellipse(x, y, 11, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.translate(x, y);
      if (this.stumble) {
        const phase = Math.min(1, (this.time - this.stumble.started) / 0.45);
        c.globalAlpha = 1 - phase * 0.7;
        if (!this.reducedMotion.matches)
          c.rotate(Math.sin(phase * Math.PI) * 0.28);
        c.scale(1 - phase * 0.5, 1 - phase * 0.5);
      } else if (this.immunity > 0) c.globalAlpha = 0.82;
      drawAvatar(
        c,
        this.restState?.kind ?? "standing",
        this.facing as Facing,
        this.walking ? 1 + (Math.floor(this.time * 7) % 2) : 0,
        this.equipment,
        {
          sprite: this.images.get(spriteUrl)!,
          rest: this.images.get(restUrl)!,
          wreath: this.images.get(wreathUrl)!,
          rewards: this.images.get(rewardsUrl)!,
        },
      );
      c.restore();
    };
    const layers = [
      ...this.getDepthLayers(),
      ...connectionLayers(this.scene),
      { y: this.player.y, draw: drawPlayer },
    ];
    layers.sort((a, b) => a.y - b.y).forEach((layer) => layer.draw(c));
    for (const spot of this.config.spots) {
      if (spot.selfMarked || !this.available(spot)) continue;
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
    this.onOverlay(c);
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
