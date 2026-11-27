import type { AchievementEvent } from "./achievement-events";
import type { Phase } from "./day";
import { ResidentChats } from "./resident-chats";
import roomUrl from "./assets/room-interactive.webp";
import gardenUrl from "./assets/anniversary-garden-tree-free.webp";
import appleBasketUrl from "./assets/apple-basket.webp";
import challengeUrl from "./assets/courage-garden.webp";
import creekPropsUrl from "./assets/garden-creek-props.webp";
import townUrl from "./assets/anniversary-town-v13.webp";
import townDetailUrl from "./assets/anniversary-town-hd-v13.webp";
import { mapFragment } from "./map-fragment";
import { LayerOutlines, type LayerOutline } from "./layer-outlines";
import { dockOpening } from "./town-terraces";
import meadowUrl from "./assets/night-meadow-v16.webp";
import ruinsUrl from "./assets/echo-ruins.webp";
import wellUrl from "./assets/echo-well.webp";
import { crossedEchoGate, townQuarry } from "./ruins-map";
import { meadowAtlasUrl, orchardAtlasUrl } from "./wild-art";
import { prepareSceneArt, sceneArt } from "./scene-art";
import { prepareMapArt, loadSceneImage } from "./texture-cache";
import type { LoadProgress } from "./resource-queue";
import trapsUrl from "./assets/courage-path-props-v35.webp";
import { drawItem } from "./item-art";
import { emptyInventory, type Equipped } from "./items";
import { bedRest, benchRest, type RestState } from "./rest";
import { avatarPose } from "./costume-frames";
import { avatarUrls, drawAvatar } from "./avatar";
import type { CampAvatarPose } from "./camp-costumes";
import type { Facing } from "./equipment";
import { clickedInteraction, nearbyInteraction } from "./interaction";
import { drawInteractionGlints } from "./interaction-glints";
import { reservedShortcut, readingTarget } from "./input";
import { connectionLayers } from "./connections";
import { crossedTownGate } from "./gate-layout";
import { enteredTravelCircle, meadowExit } from "./meadow-map";
import { meadowGate } from "./rainbow-flowers";
import { surfaceOutline } from "./collision";
import { trapFootprint } from "./trap-art";
import { drawGardenHazard } from "./garden-hazards";
import { courageFlowerLayers, courageFlowerUrl } from "./courage-flower-art";
import { drawDoorRug } from "./door-rug";
import {
  advancePath,
  canArriveAt,
  advancePathDistance,
  facingFromMovement,
  findPath,
  movePlayer,
  crossedHazard,
  touchingHazard,
  PLAYER_RADIUS,
  type Hazard,
  type Point,
} from "./core";
import { scenes, type BaseSceneId, type Hotspot, type Scene, type SceneId } from "./maps";
import { isTownInterior, type TownInteriorId } from "./town-interior-id";
import { crossedInteriorDoor } from "./town-interiors";
import { interiorWindowLayers, paintTownInterior, paintTownInteriorLight, townInteriorArt } from "./town-interior-art";
import type { RoomEffect } from "./town-interior-activities";
import type { DaylightMix } from "./daylight-mix";
export { scenes, type SceneId } from "./maps";
export interface RespawnEvent {
  trap: Hazard;
  scene: SceneId;
}
const art = {
  ...townInteriorArt,
  room: roomUrl,
  garden: gardenUrl,
  challenge: challengeUrl,
  town: townUrl,
  meadow: meadowUrl,
  ruins: ruinsUrl,
};
const sceneTextures: Record<BaseSceneId, string[]> = {
  room: [roomUrl],
  garden: [gardenUrl, appleBasketUrl, orchardAtlasUrl, creekPropsUrl],
  challenge: [challengeUrl, orchardAtlasUrl, trapsUrl, courageFlowerUrl, creekPropsUrl],
  town: [townUrl, townDetailUrl], meadow: [meadowUrl, meadowAtlasUrl], ruins: [ruinsUrl, wellUrl],
};
export interface DepthLayer {
  y: number;
  draw: (context: CanvasRenderingContext2D) => void;
  outline?: LayerOutline;
}

/** Temporary visual pose only; feet, movement and equipped layers stay intact. */
export interface ActorPresentation {
  facing?: Facing;
  lean?: number;
}

const avatarWalkCycle = [1, 0, 2, 0] as const;
const avatarStepLength = 22;
const avatarStride = avatarStepLength * 2;

export class World {
  canvas: HTMLCanvasElement;
  private inputRegion: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  scene: SceneId = "room";
  townMap = scenes.town;
  readonly townInteriorMaps = new Map<TownInteriorId, Scene>();
  gardenMapFor: (base: Scene) => Scene = base => base;
  currentPhase: Phase = "day";
  currentDay = 1;
  currentHours = 8;
  townInteriorEffect: () => RoomEffect | undefined = () => undefined;
  lightMix: DaylightMix = { from: "day", to: "day", mix: 0 };
  readonly chats: ResidentChats;
  isPresentingDialogue: () => boolean = () => false;
  player: Point = { ...scenes.room.spawn };
  private camera: Point = { x: 0, y: 0 };
  private zoom = 1;
  private focus: { point: Point; zoom: number } | null = null;
  private images = new Map<string, HTMLImageElement>();
  private mapRequests = new Map<SceneId, Promise<void>>();
  private keys = new Set<string>();
  private touch: Point = { x: 0, y: 0 };
  private path: Point[] = [];
  private exitWalk?: (now: number) => void;
  private targetEvent: string | null = null;
  get pendingInteractionId() { return this.targetEvent; }
  cancelUnavailableTarget() {
    if (this.targetEvent && !this.config.spots.some(s => s.id === this.targetEvent && this.available(s))) {
      this.path = [];
      this.targetEvent = null;
      this.walking = false;
    }
  }
  facing: Facing = 0;
  private walking = false;
  private time = 0;
  private scenerySeconds: Partial<Record<SceneId, number>> = {};
  /** Local time for scenery. Leaving the map or covering it holds its pose. */
  get ambientTime() { return this.scenerySeconds[this.scene] ?? 0; }
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
  private layerOutlines?: LayerOutlines;
  get layerOverlay() { return !!this.layerOutlines; }
  showLayerOverlay(on: boolean) {
    this.layerOutlines = on ? this.layerOutlines ?? new LayerOutlines() : undefined;
  }
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
    // Help and debug take over the whole stage. A paused activity still needs
    // the wardrobe and its close button to receive pointer and keyboard input.
    this.inputRegion.inert = [...this.suspensions].some(source => source !== "inventory");
    if (reason === "inventory") {
      const scene = this.canvas.parentElement!;
      for (const child of Array.from(scene.children)) {
        if (child instanceof HTMLElement && !child.matches(".bag-toggle, .inventory-panel")) child.inert = active;
      }
      if (scene !== this.inputRegion) {
        for (const child of Array.from(this.inputRegion.children)) {
          if (child instanceof HTMLElement && child !== scene) child.inert = active;
        }
      }
    }
    this.clearInput();
  }
  onInputCancel: () => void = () => {};
  visited: string[] = [];
  onInteract: (id: string) => void = () => {};
  onAchievementEvent: (event: AchievementEvent) => void = () => {};
  onNearby: (spot: Hotspot | null) => void = () => {};
  canShowInteractionCues: () => boolean = () => true;
  retainCueHover: (point: Point) => boolean = () => false;
  onInteractionCue: (spot: Hotspot | null) => void = () => {};
  cueInputMode: "keyboard" | "pointer" | "touch" = "keyboard";
  activeCueId = "";
  private hoveredSpotId = "";
  onScene: (id: SceneId) => void = () => {};
  onToast: (text: string) => void = () => {};
  onRestChange: (state: RestState | null) => void = () => {};
  onRespawn: (event: RespawnEvent) => void = () => {};
  onReturnHome: (arrive: () => void) => void = arrive => { void this.prepareScene("room").then(arrive); };
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
  getActorPresentation: () => ActorPresentation | null = () => null;
  getCampPose: () => CampAvatarPose | undefined = () => undefined;
  available: (spot: Hotspot) => boolean = () => true;
  canEnter: (scene: SceneId) => boolean = scene => scene !== "meadow";
  equipment: Equipped = emptyInventory().equipped;
  private stepDistance = 0;
  private nearbyId = "";
  private secondaryPressed = false;
  onAction: (pressed: boolean) => boolean = () => false;
  actorHidden = false;
  drawPlayerSprite(c: CanvasRenderingContext2D) {
    // Read after movement so a walking frame releases any idle presentation immediately.
    const presentation = !this.restState && !this.busy && !this.paused &&
      !this.suspended && !this.stumble && !this.walking
      ? this.getActorPresentation() : null;
    const lean = presentation?.lean;
    c.save();
    c.translate(Math.round(this.player.x), Math.round(this.player.y));
    if (typeof lean === "number" && Number.isFinite(lean))
      c.rotate(Math.max(-0.12, Math.min(0.12, lean)));
    if (this.stumble) {
      const phase = Math.min(1, (this.time - this.stumble.started) / 0.45);
      c.globalAlpha = 1 - phase * 0.7;
      if (!this.reducedMotion.matches)
        c.rotate(Math.sin(phase * Math.PI) * 0.28);
      c.scale(1 - phase * 0.5, 1 - phase * 0.5);
    } else if (this.immunity > 0) c.globalAlpha = 0.82;
    drawAvatar(
      c,
      avatarPose(this.restState),
      presentation?.facing ?? this.facing,
      this.walking ? avatarWalkCycle[Math.floor(this.stepDistance * 4 / avatarStride)] : 0,
      this.equipment,
      this.restState?.scene === "meadow" ? this.getCampPose() : undefined,
    );
    c.restore();
  }
  drawAvatarAt(c: CanvasRenderingContext2D, x: number, y: number, frame = 0) {
    c.save();
    c.translate(x, y);
    drawAvatar(c, "standing", 0, frame, this.equipment);
    c.restore();
  }
  drawWardrobePreview(canvas: HTMLCanvasElement, equipped: Equipped, facing: Facing) {
    const c = canvas.getContext("2d");
    if (!c) return;
    const pet = equipped.pet;
    const scale = Math.min(canvas.height / (equipped.head === "witchHat" ? 53 : 50), canvas.width / (pet ? 62 : 40));
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(Math.round(canvas.width * (pet ? 0.40 : 0.50)), Math.round(canvas.height * 0.93));
    c.scale(scale, scale);
    c.fillStyle = "#856a5940";
    c.beginPath();
    c.ellipse(0, 0, 11, 2, 0, 0, Math.PI * 2);
    c.fill();
    drawAvatar(c, "standing", facing, 0, equipped);
    if (pet) drawItem(c, pet, 13, -16, 18, 17);
    c.restore();
  }
  constructor(canvas: HTMLCanvasElement, chats = new ResidentChats()) {
    this.chats = chats;
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
      const exploringFromBag = bag && !this.paused && /^(?:arrow(?:up|down|left|right)|[wasd])$/.test(key);
      if (
        reservedShortcut(e) ||
        this.suspended ||
        (readingTarget(e.target) && !exploringFromBag) ||
        this.busy
      )
        return;
      if (key === " " && (e.target as Element).closest("button,a,audio,video"))
        return;
      if (/^(?:arrow(?:up|down|left|right)|[wasde]| )$/.test(key)) this.setCueInput("keyboard");
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
      if (!this.suspended && !readingTarget(e.target) && ["e", " "].includes(e.key.toLowerCase()) && this.onAction(false))
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
      this.setCueInput(e.pointerType === "touch" ? "touch" : "pointer");
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
      const hazard = touchingHazard(point, this.config.hazards);
      this.goTo(
        spot?.approach ?? hazard ?? point,
        spot?.id ?? null,
        spot ? undefined : hazard?.id,
      );
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerleave", e => {
      canvas.removeAttribute("data-pointable");
      if (!(e.relatedTarget instanceof Element && e.relatedTarget.closest(".interaction-prompt"))) this.hoveredSpotId = "";
    });
    const scene = this.inputRegion;
    scene.addEventListener("pointerdown", e => {
      this.setCueInput(e.pointerType === "touch" ? "touch" : "pointer");
    }, { capture: true });
    scene.addEventListener("pointerleave", () => { this.hoveredSpotId = ""; });
    scene.addEventListener("pointermove", e => {
      if (e.target !== canvas && !(e.target instanceof Element && e.target.closest(".interaction-prompt"))) this.hoveredSpotId = "";
    });
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
        if (type === "pointermove" && e.pointerType !== "touch" && !e.buttons) {
          this.setCueInput("pointer");
          const point = this.pointerPoint(e);
          const spot = !this.paused && !this.suspended && !this.busy ? this.spotAt(point) : null;
          if (spot) this.hoveredSpotId = spot.id;
          else if (!this.hoveredSpotId || !this.retainCueHover(point)) this.hoveredSpotId = "";
          canvas.toggleAttribute("data-pointable", !!spot);
        }
        if (this.secondaryPressed || e.button === 2) {
          if (type !== "pointermove" && this.secondaryPressed) {
            this.secondaryPressed = false;
            if (type === "pointercancel") this.onInputCancel();
            else this.onAction(false);
          }
          return;
        }
        if (!this.suspended)
          this.onPointer(type.replace("pointer", ""), this.pointerPoint(e), e.pointerType);
      });
    canvas.addEventListener("lostpointercapture", () => {
      this.secondaryPressed = false;
      this.onInputCancel();
    });
  }
  private spotAt(point: Point) {
    return clickedInteraction(point,this.config.spots.filter(s=>this.available(s)));
  }
  setCueInput(mode: "keyboard" | "pointer" | "touch") {
    this.cueInputMode = mode;
    if (mode !== "pointer") this.hoveredSpotId = "";
  }
  inInteractionRange(spot: Hotspot) {
    return Math.hypot(this.player.x - spot.x, this.player.y - spot.y) < (spot.radius ?? 48);
  }
  activateCue(id: string) {
    if (!this.cuesVisible) return;
    const spot = this.config.spots.find(s => s.id === id && this.available(s));
    if (!spot) return;
    this.canvas.focus({ preventScroll: true });
    if (this.inInteractionRange(spot)) {
      this.clearInput();
      this.onInteract(id);
    } else this.visit(id);
  }
  get cuesVisible() {
    return !this.paused && !this.suspended && !this.busy && !this.focus && !this.restState && this.canShowInteractionCues();
  }
  private refreshInteractionCue() {
    if (!this.cuesVisible) {
      this.hoveredSpotId = "";
      this.activeCueId = "";
      this.onInteractionCue(null);
      return;
    }
    const nearest = this.nearest();
    this.nearbyId = nearest?.id ?? "";
    const hovered = this.cueInputMode === "pointer"
      ? this.config.spots.find(s => s.id === this.hoveredSpotId && this.available(s)) : null;
    const spot = hovered ?? nearest;
    this.activeCueId = spot?.id ?? "";
    this.onInteractionCue(spot);
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
  prepareScene(scene: SceneId, report?: LoadProgress): Promise<void> {
    if (!this.canEnter(scene)) return Promise.reject(new Error("尚未集齐七色花"));
    const pending = this.mapRequests.get(scene);
    if (pending) return pending;
    const urls = [...avatarUrls, ...(isTownInterior(scene) ? [art[scene]] : sceneTextures[scene])];
    let total = 0, fallback = false;
    const loading: LoadProgress | undefined = report && ((loaded, count, fromSite = false) => {
      total = count;
      fallback = fromSite;
      report(Math.min(loaded, count * .999), count, fromSite);
    });
    const request = prepareMapArt(scene, loading).then(async () => {
      const [images] = await Promise.all([Promise.all(urls.map(url => loadSceneImage(url))), prepareSceneArt(scene)]);
      urls.forEach((url, index) => this.images.set(url, images[index]));
      if (total) report?.(total, total, fallback);
    }).finally(() => { this.mapRequests.delete(scene); });
    this.mapRequests.set(scene, request);
    return request;
  }
  get meadowSprites() { return this.images.get(meadowAtlasUrl); }
  get echoWell() { return this.images.get(wellUrl); }
  get orchardSprites() { return this.images.get(orchardAtlasUrl); }
  get appleBasket() { return this.images.get(appleBasketUrl); }
  get creekProps() { return this.images.get(creekPropsUrl); }
  private paintMap(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const background = this.sceneryArtwork;
    if (!background) return;
    if (isTownInterior(this.scene)) {
      paintTownInterior(c, background, this.scene, this.currentPhase, this.reducedMotion.matches ? undefined : this.lightMix, this.townInteriorEffect());
      return;
    }
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
    if (this.scene === "town" && x < 903 && x+w > 889 && y < 927 && y+h > 888) {
      c.save();
      c.beginPath();
      c.rect(x, y, w, h);
      c.clip();
      c.beginPath();
      c.moveTo(dockOpening[0].x, dockOpening[0].y);
      for (const point of dockOpening.slice(1)) c.lineTo(point.x, point.y);
      c.closePath();
      c.clip();
      // Sample across one plank at its native scale, following the deck's perspective.
      c.drawImage(background, 871*sx, 885*sy, 14*sx, 39*sy, 889, 888, 14, 39);
      c.restore();
    }
    if (this.scene==="town" && sceneArt.quarry.naturalWidth && x+w>townQuarry.x && y<townQuarry.height) {
      c.beginPath(); c.rect(x,y,w,h); c.clip();
      c.drawImage(sceneArt.quarry,townQuarry.x,townQuarry.y,townQuarry.width,townQuarry.height);
    }
    c.restore();
  }
  drawMapFragment(c: CanvasRenderingContext2D, points: Point[]) {
    const fragment = mapFragment(points);
    this.drawMapCover(c, fragment, fragment.mask);
  }
  drawMapCover(c: CanvasRenderingContext2D, { x, y, w, h }: { x: number; y: number; w: number; h: number }, mask: Path2D) {
    c.save();
    c.clip(mask);
    this.paintMap(c, x, y, w, h);
    c.restore();
  }
  get sceneryArtwork() {
    return this.images.get(this.scene === "town" ? townDetailUrl : art[this.scene]);
  }
  get config() {
    if (this.scene === "town") return this.townMap;
    if (isTownInterior(this.scene)) return this.townInteriorMaps.get(this.scene) ?? scenes[this.scene];
    if (this.scene === "garden") return this.gardenMapFor(scenes.garden);
    return scenes[this.scene];
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
    if (this.scene !== "room") return;
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
  async load(scene: SceneId = "room", arrival?: Point) {
    await this.prepareScene(scene);
    this.switchScene(scene, arrival);
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
    this.setCueInput("touch");
    if (x || y) this.standUp();
    this.touch = { x, y };
    this.path = [];
    this.targetEvent = null;
  }
  switchScene(scene: SceneId, arrival?: Point, facing: Facing = 0) {
    if (this.busy || !this.canEnter(scene)) return;
    if (!this.images.has(art[scene])) return;
    this.clearInput();
    this.restState = null;
    this.onRestChange(null);
    this.setFocus(null);
    this.scene = scene;
    const s = this.config;
    const landing = arrival && canArriveAt(arrival, s) ? arrival : s.spawn;
    this.player = { x: landing.x, y: landing.y };
    this.facing = facing;
    this.nearbyId = "";
    this.hoveredSpotId = "";
    this.activeCueId = "";
    this.onInteractionCue(null);
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
  /** The crossing owns input while the player and fox meet at the door. */
  async walkToDoorstep(goal: Point) {
    const room = this.config;
    const route = findPath(this.player, goal, room);
    if (route?.length && !this.reducedMotion.matches && !document.hidden) {
      let previous = this.player;
      let distance = 0;
      for (const point of route) {
        distance += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      // Keep map shortcuts brisk even when starting at the other end of the room.
      const duration = Math.min(1750, distance * 7);
      if (duration > 0) {
        let remaining = route, covered = 0;
        const started = performance.now();
        this.exitWalk = now => {
          if (this.config !== room) return;
          const travelled = Math.min(1, Math.max(0, (now - started) / duration)) * distance;
          const step = advancePathDistance(this.player, remaining, travelled - covered, room);
          const dx = step.point.x - this.player.x, dy = step.point.y - this.player.y;
          this.advanceFeet(dx,dy,false);
          this.player = step.point;
          remaining = step.remaining;
          covered = travelled;
        };
        await new Promise<void>(done => setTimeout(done, duration));
        this.exitWalk = undefined;
      }
    }
    if (this.config === room) {
      this.player = { ...goal };
      this.walking = false;
      this.facing = 0;
    }
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
    return nearbyInteraction(this.player, this.config.spots.filter(s => this.available(s)), this.nearbyId);
  }
  private frame = (timestamp: number) => {
    const dt = Math.min((timestamp - (this.last || timestamp)) / 1000, 0.05);
    this.last = timestamp;
    this.time = timestamp / 1000;
    const foregroundDt = document.hidden || this.suspended ? 0 : dt;
    if (!this.paused) this.scenerySeconds[this.scene] = this.ambientTime + foregroundDt;
    this.onTick(foregroundDt, this.time);
    if (this.exitWalk) this.exitWalk(timestamp);
    else if (!this.paused && !this.suspended && !document.hidden) this.update(dt);
    this.updateCamera();
    this.refreshInteractionCue();
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
        this.immunity = 2;
        this.onReturnHome(() => {
          this.switchScene("room");
          this.lieDown();
          this.onRespawn({ trap, scene });
        });
      }
      return;
    }
    this.immunity = Math.max(0, this.immunity - dt);
    if (this.restState) return;
    this.cancelUnavailableTarget();
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
    this.advanceFeet(dx,dy,true);
    if (this.walking && !this.targetEvent) {
      const gate = this.scene === "town" || isTownInterior(this.scene)
        ? crossedInteriorDoor(this.config.spots, before, this.player) : undefined;
      const circle = this.scene === "meadow" ? meadowExit : this.scene === "garden" ? meadowGate : undefined;
      const crossing = circle && enteredTravelCircle(circle,before,this.player) && this.available(circle)
        ? circle.id
        : crossedEchoGate(this.scene,before,this.player) ?? crossedTownGate(this.scene,before,this.player)?.id ?? gate?.id;
      if (crossing) { this.clearInput(); this.onInteract(crossing); return; }
    }
    const trap =
      this.immunity <= 0
        ? crossedHazard(before, this.player, this.config.hazards)
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
  private advanceFeet(dx: number, dy: number, audible: boolean) {
    const distance = Math.hypot(dx, dy);
    this.walking = distance > .01;
    if (!this.walking) return;
    this.facing = facingFromMovement(this.facing, dx, dy);
    const next = this.stepDistance + distance;
    if (audible && Math.floor(next / avatarStepLength) !== Math.floor(this.stepDistance / avatarStepLength))
      this.onStep();
    this.stepDistance = next % avatarStride;
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
    if (this.scene === "room") drawDoorRug(c);
    this.drawHazards();
    const drawPlayer = (c: CanvasRenderingContext2D) => {
      if (this.actorHidden) return;
      const x = Math.round(this.player.x),
        y = Math.round(this.player.y);
      c.fillStyle = "#53496045";
      c.beginPath();
      c.ellipse(x, y, 11, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      this.drawPlayerSprite(c);
    };
    const layers: DepthLayer[] = [
      ...this.getDepthLayers(),
      ...(this.scene === "challenge" ? courageFlowerLayers(this.images.get(courageFlowerUrl)) : []),
      ...connectionLayers(this.scene),
    ];
    const actor = { y: this.player.y, draw: drawPlayer };
    const outlines = this.layerOutlines ? layers.slice() : undefined;
    layers.push(actor);
    layers.sort((a, b) => a.y - b.y).forEach(layer => layer.draw(c));
    this.onDraw(c, this.time);
    this.onLighting(c);
    if (isTownInterior(this.scene) && this.sceneryArtwork)
      paintTownInteriorLight(c, this.sceneryArtwork, this.scene, this.currentPhase, this.reducedMotion.matches ? undefined : this.lightMix);
    if (this.cuesVisible) drawInteractionGlints(c, this.config.spots.filter(s => this.available(s)), this.scene, this.time, this.reducedMotion.matches, this.activeCueId);
    this.onEffects(c);
    if (this.layerOutlines && outlines) {
      if (isTownInterior(this.scene) && this.sceneryArtwork)
        outlines.push(...interiorWindowLayers(this.sceneryArtwork, this.scene, this.currentPhase, this.townInteriorEffect()));
      this.layerOutlines.draw(c, this.scene, view, outlines, actor,
        { x: this.player.x - 62, y: this.player.y - 75, w: 124, h: 104 });
    }
    if (this.debug) this.drawDebug();
    c.restore();
    this.drawHazardHint();
    this.onOverlay(c);
  }
  private drawHazards() {
    const c = this.ctx,
      image = this.images.get(trapsUrl);
    for (const trap of this.config.hazards) {
      drawGardenHazard(c, image, trap, this.time, this.reducedMotion.matches);
    }
  }
  private drawHazardHint() {
    const trap = this.config.hazards.reduce<Hazard | undefined>((near, candidate) => {
      const distance = Math.hypot(this.player.x-candidate.x,this.player.y-candidate.y);
      return distance < 70 && (!near || distance < Math.hypot(this.player.x-near.x,this.player.y-near.y))
        ? candidate : near;
    },undefined);
    if (!trap) return;
    // Screen-space type remains readable on phones and sits above actors,
    // on the far side of the trap from the approaching player.
    const top = this.player.y >= trap.y;
    const point = this.project({x:trap.x,y:trap.y+(top ? -trap.radius-14 : trap.radius+16)});
    const size = Math.max(9,11/(this.canvas.clientWidth/600 || 1));
    const c = this.ctx;
    c.save();
    c.font = `${size}px "Microsoft YaHei", sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const text = "小挫折 · " + trap.title;
    const width = c.measureText(text).width + 10;
    const height = size+8;
    const x = Math.max(width/2+4,Math.min(596-width/2,point.x));
    const y = Math.max(height/2+4,Math.min(396-height/2,point.y));
    c.fillStyle = "#fffaf0ed";
    c.fillRect(x-width/2,y-height/2,width,height);
    c.fillStyle = "#73624e";
    c.fillText(text,x,y);
    c.restore();
  }
  private drawDebug() {
    const c = this.ctx;
    c.save();
    c.lineWidth = 1;
    const bounds = this.config.bounds;
    c.strokeStyle = "#00def2";
    c.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
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
    if (this.config.surfaces) {
      c.beginPath();
      for (const { a, b } of surfaceOutline(this.config.surfaces)) {
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
      }
      c.stroke();
    }
    c.strokeStyle = "#e18d22";
    for (const trap of this.config.hazards) {
      c.beginPath();
      const footprint = trapFootprint(trap);
      if (footprint) {
        footprint.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
        c.closePath();
      } else c.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
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
