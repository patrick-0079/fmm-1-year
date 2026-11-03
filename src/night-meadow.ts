import { producers } from "./content";
import type { Point } from "./core";
import { campfire, meadowExit, starJar, tentRoof } from "./meadow-map";
import { sfx } from "./sound";
import { drawWildSprite } from "./wild-art";
import type { DepthLayer, World } from "./world";
import { drawMoonCircle } from "./moon-circle";

type Credit = typeof producers[number];
const flock = [
  {x: 296, y: 235, size: 32, phase: 1},
  {x: 362, y: 269, size: 26, phase: 8},
  {x: 590, y: 312, size: 33, phase: 15},
];
const sparkColors = ["#ffe6a0", "#f5d4bc", "#cee8cf", "#dae0ef"];

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

export class NightMeadow {
  private time = 0;
  private jarPage = 0;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private caption = document.createElement("div");
  private memory?: {origin: Point; age: number; duration: number; burst: boolean};

  constructor(private world: World, private found: () => string[], private save: () => void) {
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
    world.available = spot => available(spot) && !(world.scene === "meadow" && this.found().includes(spot.id));
    world.onTick = (dt, t) => {
      tick(dt, t);
      if (world.scene !== "meadow") return;
      this.time += dt;
      if (this.memory && (this.memory.age += dt) >= this.memory.duration) this.clearCaption();
    };
    world.getDepthLayers = () => world.scene === "meadow" ? [...layers(), ...this.layers()] : layers();
    world.onEffects = c => {
      effects(c);
      if (world.scene === "meadow") this.drawLights(c);
    };
  }
  leave() {
    this.jarPage = 0;
    this.clearCaption();
  }
  interact(id: string) {
    if (this.world.scene !== "meadow") return false;
    if (id === "meadow-camp") {
      const spot = this.world.config.spots.find(s => s.id === id)!;
      this.world.sit({x: 252, y: 167}, spot.approach);
      return true;
    }
    if (id === "meadow-jar") {
      const known = producers.filter(person => this.found().includes(person.id));
      if (!known.length) {
        this.whisper(starJar, "星光瓶", "瓶子还空着。草地上有几颗很亮的星星。", false);
      } else {
        const i = this.jarPage++ % known.length;
        this.showCredit(known[i], starJar, false, `星光瓶 ${i + 1} / ${known.length}`);
      }
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
  private showCredit(person: Credit, at: Point, burst: boolean, source = "落星里的署名") {
    this.whisper(at, person.name, person.message, burst, source);
  }
  private whisper(at: Point, name: string, message: string, burst: boolean, source = "") {
    const by = document.createElement("strong"), line = document.createElement("span");
    by.textContent = name;
    line.textContent = message;
    this.caption.replaceChildren();
    if (source) {
      const small = document.createElement("small");
      small.textContent = source;
      this.caption.append(small);
    }
    this.caption.append(by, line);
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
    const layers: DepthLayer[] = [
      {y: 168, draw: c => this.world.drawMapFragment(c, tentRoof)},
      {y: starJar.y, draw: c => drawWildSprite(c, atlas, 3, starJar.x, starJar.y, 17)},
    ];
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
    for (const [i, person] of producers.entries()) {
      if (this.found().includes(person.id)) continue;
      const {x, y} = person;
      layers.push({y, draw: c => {
        const pulse = (1 + Math.sin(t * 1.5 + i)) / 2;
        glow(c, x, y - 8, 22 + pulse * 3, "#ffda80");
        drawWildSprite(c, atlas, 2, x, y - 1 - pulse, 19);
        glint(c, x + 10, y - 15 - pulse * 2, 1.5, "#fff3c5");
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
    for (let i = 0; i < 27; i++) {
      const x = 64 + i * 167 % 782 + Math.sin(t * .45 + i) * 8;
      const y = 65 + i * 129 % 472 + Math.cos(t * .6 + i * 2) * 4;
      c.globalAlpha = .18 + (1 + Math.sin(t * .9 + i * 3)) * .22;
      glow(c, x, y, 5, "#e9e9a0");
      c.fillStyle = "#eff2b5"; c.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
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
