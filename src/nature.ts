import { eggAvailable, phaseNames, untilNextPhase, worldTime } from "./day";
import type { Phase } from "./day";
import { drawTownLight } from "./town-light";
import { sfx } from "./sound";
import { reservedShortcut, readingTarget } from "./input";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import { sceneLights } from "./lights";
import type { World } from "./world";
import type { Hotspot } from "./maps";
import { gardenTrees, creeks } from "./landscape";
import { drawCreek, drawGardenTree } from "./landscape-renderer";
import benchUrl from "./assets/garden-bench.webp";
import wreathUrl from "./assets/flower-wreath.webp";
import treeUrl from "./assets/apple-tree.webp";
import dewUrl from "./assets/morning-dew-flower.webp";
import roomArtUrl from "./assets/room-interactive.webp";
import { drawRoomWindow } from "./window-sky";
import { drawKeepsake } from "./scene-art";
import { drawWildSprite } from "./wild-art";
interface NatureSave {
  picked: Record<string, number>;
  apple: number;
  flower: number;
  star: number;
  wearing: boolean;
  wreath: boolean;
}
const NATURE_KEY = "fufu-garden-bag-v1",
  CLOCK_KEY = "fufu-world-clock-v1";
const initial = (): NatureSave => ({
  picked: {},
  apple: 0,
  flower: 0,
  star: 0,
  wearing: false,
  wreath: false,
});
export class Nature {
  private treeImage = new Image();
  private benchImage = new Image();
  private dewImage = new Image();
  private windowImage = new Image();
  private origin = Date.now();
  private shift = 0;
  private state = initial();
  private lastUi = 0;
  private oldPhase = "";
  private tint = [0, 0, 0, 0];
  private previewPhase: Phase | null = null;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)");
  private lightMap = document.createElement("canvas");
  constructor(
    private world: World,
    private activities: Activities,
    private toast: (text: string) => void,
    private inventory: Inventory,
  ) {
    this.treeImage.src = treeUrl;
    this.dewImage.src = dewUrl;
    this.windowImage.src = roomArtUrl;
    this.benchImage.src = benchUrl;
    try {
      const clock = JSON.parse(localStorage.getItem(CLOCK_KEY) || "null");
      if (
        clock &&
        Number.isFinite(clock.origin) &&
        clock.origin > 0 &&
        clock.origin <= Date.now() &&
        Number.isFinite(clock.shift) &&
        clock.shift >= 0
      ) {
        this.origin = clock.origin;
        this.shift = clock.shift;
      }
      const data = JSON.parse(localStorage.getItem(NATURE_KEY) || "null");
      if (data && typeof data === "object") {
        for (const field of ["apple", "flower", "star"] as const)
          if (Number.isInteger(data[field]) && data[field] >= 0)
            this.state[field] = Math.min(data[field], 9999);
        this.state.wearing = data.wearing === true;
        this.state.wreath =
          data.wreath === true ||
          data.wearing === true ||
          (Number.isInteger(data.flower) && data.flower > 0);
        if (
          data.picked &&
          typeof data.picked === "object" &&
          !Array.isArray(data.picked)
        ) {
          for (const [key, count] of Object.entries(data.picked))
            if (
              /^\d+:(garden|challenge):[a-z]+$/.test(key) &&
              typeof count === "number" &&
              count >= 0 &&
              count <= 3
            )
              this.state.picked[key] = Math.floor(count);
        }
      }
    } catch {
      /* read-only play remains available */
    }
    this.saveClock();
    this.world.available = (spot) => this.available(spot);
    this.world.onEnvironment = (c, t) => this.draw(c, t);
    this.world.onLighting = (c) => this.lighting(c);
    this.world.getDepthLayers = () => this.depthLayers();
    const tick = this.world.onTick;
    this.world.onTick = (dt, t) => {
      tick(dt, t);
      this.tick(dt);
    };
    document
      .querySelector(".crown-toggle")!
      .addEventListener("click", () => this.toggleCrown());
    window.addEventListener("keydown", (e) => {
      if (reservedShortcut(e) || this.world.suspended || readingTarget(e.target)) return;
      if (
        e.key.toLowerCase() === "h" &&
        !e.repeat &&
        !this.world.paused &&
        !this.world.busy &&
        !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        this.toggleCrown();
      }
    });
    this.tick(0);
  }
  get elapsed() {
    return Math.max(0, (Date.now() - this.origin) / 1000 + this.shift);
  }
  private get clock() {
    const time=worldTime(this.elapsed), phase=this.previewPhase;
    if(!phase) return time;
    const hours={dawn:6,day:12,dusk:18,night:22}[phase];
    return {...time,hours,phase,label:String(hours).padStart(2,"0")+":00"};
  }
  setPreviewPhase(phase:Phase|null) { this.previewPhase=phase; this.refreshClock(); }
  get timePreview() { return this.previewPhase; }
  private key(id: string) {
    return `${this.clock.day}:${this.world.scene}:${id}`;
  }
  private picked(id: string) {
    return this.state.picked[this.key(id)] ?? 0;
  }
  private mark(id: string) {
    this.state.picked[this.key(id)] = this.picked(id) + 1;
  }
  private saveClock() {
    try {
      localStorage.setItem(
        CLOCK_KEY,
        JSON.stringify({ origin: this.origin, shift: this.shift }),
      );
    } catch {}
  }
  private save() {
    // Only today's and yesterday's scenery state is needed; the bag is cumulative.
    for (const key of Object.keys(this.state.picked))
      if (Number(key.split(":")[0]) < this.clock.day - 1)
        delete this.state.picked[key];
    try {
      localStorage.setItem(NATURE_KEY, JSON.stringify(this.state));
    } catch {}
    this.lastUi = 0;
    this.tick(0);
  }
  reset() {
    this.state = initial();
    this.origin = Date.now();
    this.shift = 0;
    this.previewPhase=null;
    this.oldPhase = "";
    this.lastUi = 0;
    this.saveClock();
    this.save();
    this.tick(0);
  }
  private available(spot: Hotspot) {
    if (spot.id === "wreath") return !this.inventory.has("wreath");
    if (!eggAvailable(spot.id, this.clock.phase)) return false;
    if (["drop", "dew", "sunset", "firefly"].includes(spot.id))
      return this.picked(spot.id) === 0;
    return true;
  }
  interact(id: string) {
    if (
      ![
        "wreath",
        "apple",
        "flowers",
        "drop",
        "rest",
        "dew",
        "sunset",
        "firefly",
      ].includes(id)
    )
      return false;
    if (id === "wreath") {
      this.state.wreath = true;
      this.inventory.grant("wreath");
      this.save();
      sfx("match");
      this.activities.note(
        "捡到一顶花环 · 按 H 或点击场景右侧的「戴上花环」，给芙芙戴上吧",
      );
      return true;
    }
    if (id === "rest") {
      const bench = this.world.config.spots.find((s) => s.id === "rest")!;
      this.world.sit(bench, bench.approach);
      this.activities.menu(
        `在长椅上坐下了 · 现在是${phaseNames[this.clock.phase]}，歇一会再走吧`,
        [
          {
            title: "起身继续走",
            run: () => {
              this.world.standUp();
              this.activities.close();
            },
          },
          { title: "坐着等到下一时段", run: () => this.rest() },
          {
            title: "看看时段彩蛋",
            run: () =>
              this.activities.note(
                "清晨 05–08 点找晨露花 · 黄昏 17–20 点找小纸船 · 夜晚 20–05 点找萤火心愿",
              ),
          },
        ],
      );
      return true;
    }
    if (id === "apple") {
      this.pickApple();
      return true;
    }
    if (id === "flowers") {
      this.pickFlower();
      return true;
    }
    const spot = this.world.config.spots.find((s) => s.id === id)!;
    if (!this.available(spot)) {
      this.toast("这份小惊喜正在等另一个时刻。坐坐长椅，也许会有新发现。");
      return true;
    }
    this.mark(id);
    this.state.star++;
    this.save();
    sfx("match");
    const words: Record<string, string> = {
      drop: "捡到了一颗掉落的星屑 · 地上的闪光已经收进小口袋啦",
      dew: "清晨的晨露花，只为早起的小冒险家绽放 · 星屑 +1",
      sunset: "拾起一只金色小纸船 · 愿芙芙一路顺风，黄昏也有光 · 星屑 +1",
      firefly: "萤火虫绕着你画了一个爱心，又飞回树梢 · 星夜心愿已收好，星屑 +1",
    };
    this.activities.note(words[id]);
    return true;
  }
  private pickApple() {
    const remaining = 3 - this.picked("apple");
    if (remaining > 0) {
      this.mark("apple");
      this.state.apple++;
      sfx("flip");
      this.save();
    }
    this.activities.menu(
      remaining > 0
        ? `摘到一颗甜苹果！树上的苹果还剩 ${Math.max(0, remaining - 1)} 颗`
        : "今天树上的苹果摘完啦 · 明天会重新长出来",
      remaining > 1 ? [{ title: "再摘一颗", run: () => this.pickApple() }] : [],
    );
  }
  private pickFlower() {
    const remaining = 3 - this.picked("flowers");
    if (remaining > 0) {
      this.mark("flowers");
      this.state.flower++;
      this.inventory.grant("wreath");
      this.state.wreath = true;
      sfx("match");
      this.save();
    }
    this.activities.menu(
      remaining > 0
        ? "采到小花，编进花环里 · 按 H 或点游戏里的花环按钮佩戴"
        : "这片花今天采完啦，明天再来看看。",
      [
        ...(remaining > 1
          ? [{ title: "再采一朵", run: () => this.pickFlower() }]
          : []),
      ],
    );
  }
  private toggleCrown() {
    if (!this.inventory.has("wreath") && this.inventory.state.equipped.head !== "wreath") return;
    this.inventory.toggle("wreath");
    this.state.wearing = this.inventory.has("wreath") && this.inventory.state.equipped.head === "wreath";
    this.save();
  }
  private rest() {
    this.shift += untilNextPhase(this.elapsed);
    this.saveClock();
    this.tick(0);
    this.activities.note(
      `伸个懒腰，现在是${phaseNames[this.clock.phase]}啦 · 去看看花园里新出现的小惊喜吧`,
    );
    sfx("portal");
  }
  private tick(dt: number) {
    const clock = this.clock;
    const meadow = this.world.scene === "meadow";
    const target: Record<string, number[]> = {
      dawn: [242, 184, 171, 0.11],
      day: [255, 234, 167, 0.03],
      dusk: [223, 126, 155, 0.2],
      night: [42, 54, 115, 0.35],
    };
    const amount = Math.min(1, dt * 1.4);
    if (this.oldPhase === "") this.tint = [...target[clock.phase]];
    for (let i = 0; i < 4; i++)
      this.tint[i] += (target[clock.phase][i] - this.tint[i]) * amount;
    if (this.oldPhase !== clock.phase) {
      if (this.oldPhase && !meadow)
        this.toast(`${phaseNames[clock.phase]}到了 · ${this.world.scene==="town"?"小镇换了光景":"花园里的风景悄悄变了"}`);
      this.oldPhase = clock.phase;
    }
    if (Date.now() - this.lastUi < 350) return;
    this.lastUi = Date.now();
    const time = document.querySelector(".time-pill")!;
    this.world.canvas.parentElement!.dataset.lightScene=this.world.scene;
    (time as HTMLElement).dataset.phase=clock.phase;
    time.textContent = meadow ? "☾ 花海 · 静夜" : `${{ dawn: "☀", day: "☀", dusk: "◒", night: "☾" }[clock.phase]} ${clock.label} · ${phaseNames[clock.phase]}`;
    time.setAttribute(
      "title",
      meadow ? "花海长夜，庭院的时钟仍在走动" : `第 ${clock.day} 天 · 现实十分钟为一天；花园长椅可休息到下一时段`,
    );
    document.querySelector(".bag-count")!.textContent =
      `苹果 ${this.state.apple} · 花朵 ${this.state.flower} · 星屑 ${this.state.star}`;
    const crown = document.querySelector<HTMLButtonElement>(".crown-toggle")!;
    const wearing = this.inventory.state.equipped.head === "wreath";
    crown.hidden = !this.inventory.has("wreath") && !wearing;
    this.state.wearing = this.inventory.has("wreath") && wearing;
    crown.innerHTML = `<img src="${wreathUrl}" alt=""><span>${wearing ? "摘下花环" : "戴上花环"}</span><kbd>H</kbd>`;
    crown.setAttribute(
      "aria-label",
      wearing ? "摘下花环，快捷键 H" : "戴上花环，快捷键 H",
    );
    crown.setAttribute("aria-pressed", String(wearing));
    document.querySelector(".day-hint")!.textContent = meadow ? "草间有落星，营火旁有一只收着星光的玻璃瓶。" :
      `第 ${clock.day} 天 · 十分钟一昼夜 · ${clock.phase === "dawn" ? "晨露花醒来了" : clock.phase === "dusk" ? "溪边漂来一只纸船" : clock.phase === "night" ? "萤火心愿悄悄出现" : "找长椅休息，等一场黄昏和星夜"}`;
  }
  refreshClock() {
    this.lastUi = 0;
    this.tick(0);
  }
  private draw(c: CanvasRenderingContext2D, t: number) {
    if (this.world.scene === "room") {
      drawRoomWindow(c, this.clock.phase, this.windowImage);
      return;
    }
    if (this.world.scene === "town" || this.world.scene === "meadow") return;
    drawCreek(c, creeks[this.world.scene], t);
    const atlas = this.world.orchardSprites;
    if (this.world.scene === "challenge") {
      drawWildSprite(c, atlas, 2, 450, 110, 25);
    }
    const flowers = this.world.config.spots.find((s) => s.id === "flowers")!;
    const picked = this.picked("flowers");
    const tufts = [[9, -2, 15], [-11, 4, 17], [3, 7, 19]];
    for (let i = 0; i < tufts.length - picked; i++) {
      const [dx, dy, size] = tufts[i];
      drawWildSprite(c, atlas, 1, flowers.x + dx, flowers.y + dy, size, i === 1);
    }
    for (const spot of this.world.config.spots) {
      if (!this.available(spot)) continue;
      if (spot.id === "wreath")
        drawKeepsake(c, "wreath", spot.x, spot.y, 31);
      if (spot.id === "drop") {
        drawKeepsake(c, "star", spot.x, spot.y, 29);
      }
      if (spot.id === "dew") {
        if (this.dewImage.complete && this.dewImage.naturalWidth)
          c.drawImage(this.dewImage, spot.x - 16, spot.y - 30, 32, 40);
      }
      if (spot.id === "sunset") {
        drawWildSprite(c, atlas, 3, spot.x, spot.y + 7, 31);
      }
      if (spot.id === "firefly")
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + t * 0.5,
            fx = spot.x + Math.cos(angle) * 21,
            fy = spot.y + Math.sin(angle * 2) * 13;
          c.fillStyle = "#fff3a977";
          c.fillRect(fx - 2, fy - 2, 6, 6);
          c.fillStyle = "#fff5bd";
          c.fillRect(fx, fy, 2, 2);
        }
    }
    // Visible little ripples on the perimeter stream, never on walkable grass.
    c.strokeStyle = this.clock.phase === "night" ? "#a8d5f2aa" : "#e0f6eaaa";
    c.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const sx = this.world.scene === "garden" ? 850 : 65,
        sy = 140 + i * 46 + Math.sin(t + i) * 3;
      c.beginPath();
      c.moveTo(sx - 7, sy);
      c.lineTo(sx + 7, sy);
      c.stroke();
    }
  }
  private depthLayers() {
    if (this.world.scene !== "garden" && this.world.scene !== "challenge")
      return [];
    const scene = this.world.scene,
      apple = this.world.config.spots.find((s) => s.id === "apple")!,
      bench = this.world.config.spots.find((s) => s.id === "rest")!;
    return [
      ...gardenTrees[scene].map((tree) => ({
        y: tree.y + 23 * tree.scale,
        draw: (c: CanvasRenderingContext2D) =>
          drawGardenTree(c, this.treeImage, tree),
      })),
      {
        y: apple.y + 23,
        draw: (c: CanvasRenderingContext2D) => {
          drawGardenTree(c, this.treeImage, {
            x: apple.x,
            y: apple.y,
            scale: 1,
            tone: 0,
          });
          for (let i = this.picked("apple"); i < 3; i++) {
            const x = apple.x + [-19, 17, -1][i], y = apple.y + [-3, -8, -23][i];
            drawWildSprite(c, this.world.orchardSprites, 0, x, y, [14, 15, 13][i], i === 1);
          }
        },
      },
      {
        y: bench.y - 4,
        draw: (c: CanvasRenderingContext2D) => {
          if (this.benchImage.complete && this.benchImage.naturalWidth)
            c.drawImage(this.benchImage, bench.x - 38, bench.y - 25, 76, 46);
        },
      },
    ];
  }
  private lighting(c: CanvasRenderingContext2D) {
    if (this.world.scene === "meadow") return;
    if (this.world.scene === "town") {
      drawTownLight(c,this.clock.hours,performance.now()/1000,this.reduce.matches); return;
    }
    const shade = Math.max(0, Math.min(1, (this.tint[3] - 0.07) / 0.28));
    if (shade <= 0) return;
    const { width, height } = this.world.config;
    const map = this.lightMap;
    if (map.width !== width || map.height !== height) {
      map.width = width;
      map.height = height;
    }
    const g = map.getContext("2d")!;
    g.clearRect(0, 0, width, height);
    g.globalCompositeOperation = "source-over";
    // Cut the complete night tint out around each light, keeping the flowers and
    // paving warm and saturated there rather than leaving a global grey filter.
    const nightOpacity =
      this.world.scene === "room"
          ? 0.18
          : 0.24;
    g.fillStyle = `rgba(24,36,70,${shade * nightOpacity})`;
    g.fillRect(0, 0, width, height);
    g.globalCompositeOperation = "destination-out";
    for (const light of sceneLights[this.world.scene]) {
      const glow = g.createRadialGradient(
        light.x,
        light.y,
        2,
        light.x,
        light.y,
        light.radius,
      );
      glow.addColorStop(0, "#000000f2");
      glow.addColorStop(0.35, "#000000bd");
      glow.addColorStop(1, "#00000000");
      g.fillStyle = glow;
      g.fillRect(
        light.x - light.radius,
        light.y - light.radius,
        light.radius * 2,
        light.radius * 2,
      );
    }
    g.globalCompositeOperation = "source-over";
    c.drawImage(map, 0, 0);
    c.save();
    c.globalCompositeOperation = "screen";
    c.globalAlpha = shade * 0.36;
    for (const light of sceneLights[this.world.scene]) {
      const glow = c.createRadialGradient(
        light.x,
        light.y,
        1,
        light.x,
        light.y,
        light.radius * 0.9,
      );
      glow.addColorStop(0, light.color + "bb");
      glow.addColorStop(0.3, light.color + "66");
      glow.addColorStop(1, light.color + "00");
      c.fillStyle = glow;
      c.fillRect(
        light.x - light.radius,
        light.y - light.radius,
        light.radius * 2,
        light.radius * 2,
      );
    }
    c.restore();
  }
}
