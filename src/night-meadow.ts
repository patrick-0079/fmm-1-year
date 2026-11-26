import { producers } from "./content";
import type { Point, Progress } from "./core";
import { campfire, campLetterSpot, campSeat, meadowExit, starJar, tentRoof, tentTapeSpot } from "./meadow-map";
import { meadowFlock as flock } from "./meadow-ground";
import { sfx } from "./sound";
import { drawWildSprite } from "./wild-art";
import { drawMapProp } from "./map-prop-frames";
import type { DepthLayer, World } from "./world";
import { drawMoonCircle } from "./moon-circle";
import { drawFirefly, fireflyDrift } from "./firefly-art";
import { MeadowStarReader } from "./meadow-star-reader";
import { StarBottleView } from "./star-bottle";
import { showQuietStarEffect } from "./quiet-star-effect";
import { creditStarTexture } from "./credit-star-art";
import { CampGuest } from "./camp-guest";
import { MeadowJellies } from "./meadow-jellies";
import { drawJelly, drawKettleSteam, prepareJellyBells } from "./meadow-jelly-art";
import { sceneArt } from "./scene-art";
import sceneryOutlines from "./meadow-scenery-outlines.json";
import { prepareMapCovers, visibleMapCovers } from "./map-covers";
import { mapFragment } from "./map-fragment";
import { drawFlexibleCover } from "./scenery-wind";
import type { ResidentStory } from "./resident-story";

type Credit = typeof producers[number];
// These silhouettes sample the night painting itself. The kettle handle and
// the gaps between the boundary branches stay open in front of a walker.
const sceneryCovers = prepareMapCovers(sceneryOutlines);
const sparkColors = ["#ffe6a0", "#f5d4bc", "#cee8cf", "#dae0ef"];
const meadowStarLight = { halo: "#ffda80", glint: "#fff3c5", radius: 22 };
const starLights = {
  cross: meadowStarLight,
  gold: { halo: "#ffd36b", glint: "#fff0b0", radius: 24 },
  "pink-fish": { halo: "#ff9dbf", glint: "#ffdeeb", radius: 22 },
};

function glow(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const light = c.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color + "83");
  light.addColorStop(.44, color + "34");
  light.addColorStop(1, color + "00");
  c.fillStyle = light;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function glint(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x - size), Math.round(y), size * 2 + 1, 1);
  c.fillRect(Math.round(x), Math.round(y - size), 1, size * 2 + 1);
}

function drawTentTape(c: CanvasRenderingContext2D) {
  const { x, y } = tentTapeSpot;
  c.fillStyle = "#372c3c70";
  c.fillRect(x - 8, y - 1, 19, 2);
  c.fillStyle = "#262534";
  c.fillRect(x - 10, y - 9, 20, 9);
  c.fillStyle = "#565161";
  c.fillRect(x - 9, y - 10, 18, 8);
  c.fillStyle = "#b59aab";
  c.fillRect(x - 9, y - 10, 18, 1);
  c.fillStyle = "#353340";
  c.fillRect(x - 8, y - 8, 16, 4);
  c.fillStyle = "#cec0af";
  c.fillRect(x - 7, y - 8, 3, 3);
  c.fillRect(x + 4, y - 8, 3, 3);
  c.fillStyle = "#514650";
  c.fillRect(x - 6, y - 7, 1, 1);
  c.fillRect(x + 5, y - 7, 1, 1);
  c.fillStyle = "#f0ceae";
  c.fillRect(x - 5, y - 4, 10, 2);
  c.fillStyle = "#c47580";
  c.fillRect(x + 2, y - 4, 2, 1);
}

export class NightMeadow {
  private time = 0;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private caption = document.createElement("div");
  private memory?: {origin: Point; age: number; duration: number; burst: boolean};
  private reader: MeadowStarReader;
  private bottle: StarBottleView;
  private campGuest: CampGuest;
  private jellies?: MeadowJellies;
  private jellyArtRequested = false;
  private starSprites = new Map<string, HTMLImageElement>();

  private loadedStarSprite(url: string) {
    let image = this.starSprites.get(url);
    if (!image) {
      image = new Image();
      image.src = url;
      this.starSprites.set(url, image);
    }
    return image.complete && image.naturalWidth > 0 ? image : undefined;
  }

  constructor(private world: World, private found: () => string[], private save: () => void,
    campStory: () => ResidentStory, private collectCampLetter: () => void,
    private getTape: () => Progress["gardenTape"], private collectTape: () => void) {
    this.reader = new MeadowStarReader(world);
    this.bottle = new StarBottleView(world, found);
    this.campGuest = new CampGuest(world, campStory, save);
    this.caption.className = "star-whisper";
    this.caption.hidden = true;
    this.caption.setAttribute("role", "status");
    this.caption.setAttribute("aria-atomic", "true");
    world.canvas.after(this.caption);
    const available = world.available, tick = world.onTick, layers = world.getDepthLayers, effects = world.onEffects, ground = world.onEnvironment;
    world.onEnvironment = (c,t) => {
      ground(c,t);
      if (world.scene === "meadow") {
        const near = Math.max(0,1 - Math.hypot(world.player.x-meadowExit.x,world.player.y-meadowExit.y)/60);
        drawMoonCircle(c,meadowExit.x,meadowExit.y,this.reduced.matches ? 0 : this.time,near);
      }
    };
    world.available = spot => {
      if (!available(spot)) return false;
      if (spot.id === tentTapeSpot.id) return this.getTape() === "missing";
      if (spot.id === campLetterSpot.id) return this.campGuest.letterOnGround;
      return !(world.scene === "meadow" && this.found().includes(spot.id));
    };
    world.onTick = (dt, t) => {
      tick(dt, t);
      if (world.scene !== "meadow") return;
      this.campGuest.tick(dt, t);
      this.time += dt;
      if (!this.jellyArtRequested) {
        prepareJellyBells();
        this.jellyArtRequested = true;
      }
      this.jellies ??= new MeadowJellies(producers);
      this.jellies.setCollected(this.found());
      const covered = world.paused || world.suspended;
      const cue = world.activeCueId && world.config.spots.find(spot => spot.id === world.activeCueId);
      const canMeet = !covered && !world.restState && !world.busy && !(cue && world.inInteractionRange(cue));
      this.jellies.tick(covered ? 0 : dt, world.player, canMeet, this.reduced.matches);
      this.caption.style.setProperty("--quiet-star-play", dt === 0 ? "paused" : "running");
      if (this.memory && (this.memory.age += dt) >= this.memory.duration) this.clearCaption();
    };
    world.getDepthLayers = () => world.scene === "meadow" ? [...layers(), ...this.layers()] : layers();
    world.onEffects = c => {
      effects(c);
      if (world.scene === "meadow") this.drawLights(c);
    };
  }
  leave() {
    this.campGuest.reset();
    this.jellies?.interrupt();
    this.jellyArtRequested = false;
    this.closeBottle();
    this.closeReader();
    this.clearCaption();
  }
  get readerOpen() { return this.reader.opened; }
  closeReader() { this.reader.close(); }
  get bottleOpen() { return this.bottle.opened; }
  closeBottle() { this.bottle.close(); }
  interact(id: string) {
    if (this.world.scene !== "meadow") return false;
    if (id === tentTapeSpot.id) {
      if (this.getTape() === "missing") this.collectTape();
      return true;
    }
    if (id === campLetterSpot.id) {
      if (this.campGuest.letterOnGround) this.collectCampLetter();
      return true;
    }
    if (id === "meadow-camp") {
      const spot = this.world.config.spots.find(s => s.id === id)!;
      this.world.sit(campSeat, spot.approach);
      return true;
    }
    if (id === "meadow-jar") {
      this.closeReader();
      this.clearCaption();
      this.bottle.open();
      return true;
    }
    const person = producers.find(p => p.id === id);
    if (!person) return false;
    const found = this.found();
    if (!found.includes(person.id)) {
      found.push(person.id);
      this.save();
      this.showCredit(person, person, true);
      sfx("starlight");
    }
    return true;
  }
  private showCredit(person: Credit, at: Point, burst: boolean, source = "") {
    this.closeReader();
    // Every star still reveals its name in the soft burst. A letter keeps
    // its own readable surface instead of expiring with that short effect.
    this.whisper(at, person.name, "", burst, source);
    if (person.message.trim()) this.reader.open(person.name, person.message, source || "落星里的留言");
    else showQuietStarEffect(this.caption, person.id, "name");
  }
  private whisper(at: Point, name: string, message: string, burst: boolean, source = "") {
    const by = document.createElement("strong");
    by.textContent = name;
    this.caption.replaceChildren();
    if (source) {
      const small = document.createElement("small");
      small.textContent = source;
      this.caption.append(small);
    }
    this.caption.append(by);
    if (message.trim()) {
      const line = document.createElement("span");
      line.textContent = message;
      this.caption.append(line);
    }
    this.memory = {origin: at, age: 0, duration: Math.max(6, 3 + Array.from(message).length / 4), burst};
    this.positionCaption();
  }
  private clearCaption() {
    this.memory = undefined;
    this.caption.hidden = true;
    this.caption.replaceChildren();
  }
  private positionCaption() {
    if (!this.memory) return;
    const {origin, age, duration} = this.memory;
    const pos = this.world.project(origin);
    this.caption.hidden = pos.x < 0 || pos.x > 600 || pos.y < 0 || pos.y > 400;
    if (this.caption.hidden) return;
    const scale = this.world.canvas.clientHeight / 400;
    this.caption.style.setProperty("--star-x", (pos.x / 6).toFixed(2) + "%");
    const y = Math.max(this.caption.offsetHeight + 5, (pos.y - 54) * scale);
    this.caption.style.top = Math.round(y) + "px";
    this.caption.style.opacity = String(Math.min(1, (duration - age) * 2));
  }
  private layers(): DepthLayer[] {
    const atlas = this.world.meadowSprites, t = this.reduced.matches ? 0 : this.time;
    const sceneryTime = this.world.ambientTime, still = this.reduced.matches;
    const layers: DepthLayer[] = [
      {y: 168, outline: still ? mapFragment(tentRoof).mask : undefined,
        draw: c => drawFlexibleCover(c,this.world,tentRoof,still)},
      {y: 145, draw: c => drawKettleSteam(c, sceneryTime, still)},
      {y: starJar.y, draw: c => drawMapProp(c, sceneArt.smallMapProps, "starJar", starJar.x - 8.5, starJar.y - 17, 17, 17)},
      ...this.campGuest.layers(sceneArt.patrickCamp, this.reduced.matches),
      ...visibleMapCovers(this.world, sceneryCovers),
    ];
    if (this.getTape() === "missing") layers.push({ y: tentTapeSpot.y, draw: drawTentTape });
    const view = this.world.visibleArea;
    this.jellies?.animals.forEach((animal, index) => {
      if (!animal.visible) return;
      const {x,y} = animal.at;
      if (x+18 < view.x || x-18 > view.x+view.w || y+3 < view.y || y-42 > view.y+view.h) return;
      layers.push({y, draw: c => drawJelly(c,index,animal,sceneryTime,still)});
    });
    for (const sheep of flock) {
      const phase = (t + sheep.phase) % 24;
      // Graze in place, raise the head, wander a few steps, then graze again.
      const forward = phase < 12, part = phase % 12;
      const stride = Math.min(1, Math.max(0, (part - 5) / 5));
      const walking = stride > 0 && stride < 1, grazing = part < 4;
      const x = sheep.x + (forward ? stride : 1 - stride) * 18;
      const y = sheep.y + (walking ? Math.sin(stride * Math.PI) * 3 : 0);
      layers.push({y, draw: c => {
        c.fillStyle = "#233e4d70"; c.beginPath();
        c.ellipse(x, y - 1, sheep.size * .39, 3.1, 0, 0, Math.PI * 2); c.fill();
        const bob = walking ? Math.abs(Math.sin(part * 6)) * 1.1 : 0;
        drawWildSprite(c, atlas, grazing ? 1 : 0, x, y - bob, sheep.size, !forward);
      }});
    }
    const collected = new Set(this.found());
    for (const [i, person] of producers.entries()) {
      if (collected.has(person.id)) continue;
      const {x, y, shape} = person;
      const light = shape ? starLights[shape] : meadowStarLight;
      layers.push({y, draw: c => {
        const pulse = (1 + Math.sin(t * 1.5 + i)) / 2;
        const size = 19;
        const foot = y - 1 - pulse;
        c.save();
        // The cross flickers in the grass and is steady once collected.
        if (shape === "cross") c.globalAlpha *= still ? .86 : .58 + .42 * pulse;
        glow(c, x, y - 8, light.radius + pulse * 3, light.halo);
        const custom = person.sprite && this.loadedStarSprite(person.sprite);
        const sprite = custom || (shape && creditStarTexture(shape));
        if (sprite) {
          const scale = size / Math.max(sprite.width, sprite.height);
          const width = sprite.width * scale, height = sprite.height * scale;
          c.drawImage(sprite, Math.round(x - width / 2), Math.round(foot - height), width, height);
        } else drawWildSprite(c, atlas, 2, x, foot, size);
        glint(c, x + 10, y - 15 - pulse * 2, 1.5, light.glint);
        c.restore();
      }});
    }
    return layers;
  }
  private drawLights(c: CanvasRenderingContext2D) {
    const t = this.reduced.matches ? 0 : this.time;
    c.save();
    c.globalCompositeOperation = "screen";
    c.globalAlpha = .35;
    glow(c, campfire.x, campfire.y - 6, 32 + Math.sin(t * 3) * 2, "#ffb45f");
    for (let i = 0; i < 22; i++) {
      const phase = i * 2.41 + 1, drift = fireflyDrift(t, phase, 1.25);
      const x = 64 + i * 167 % 782 + drift.x;
      const y = 65 + i * 129 % 472 + drift.y;
      c.globalAlpha = 1;
      drawFirefly(c, x, y, t, phase, .65 + i % 4 * .13, .55 + i % 3 * .12);
    }
    if (this.memory?.burst && this.memory.age < 2.6) this.drawBurst(c, this.memory.origin, this.memory.age);
    c.restore();
    this.positionCaption();
  }
  private drawBurst(c: CanvasRenderingContext2D, p: Point, age: number) {
    if (this.reduced.matches) {
      c.globalAlpha = .45; glow(c, p.x, p.y - 18, 19, "#f3ddb4");
      return;
    }
    const rise = Math.min(1, age / .35), top = p.y - 10 - rise * 23;
    c.globalAlpha = .8 * (1 - age / 2.6);
    glow(c, p.x, top, 10, "#ffe5a3");
    if (rise < 1) { glint(c, p.x, top, 2, "#fff3bf"); return; }
    const k = (age - .35) / 2.25;
    for (let i = 0; i < 26; i++) {
      const angle = i * 2.4, length = (17 + i % 5 * 6) * (1 - (1 - k) ** 3);
      const x = p.x + Math.cos(angle) * length, y = top + Math.sin(angle) * length * .76 + k * k * 11;
      c.globalAlpha = .86 * (1 - k) ** 1.3;
      if (i % 3 === 0) glow(c, x, y, 4, sparkColors[i % 4]);
      glint(c, x, y, i % 4 === 0 ? 1.5 : .6, sparkColors[i % 4]);
    }
  }
}
