import { eggAvailable, phaseNames, untilNextPhase, worldTime } from "./day";
import { sfx } from "./sound";
import type { Activities } from "./activities";
import type { World } from "./world";
import type { Hotspot } from "./maps";
import treeUrl from "./assets/apple-tree.webp";
interface NatureSave {
  picked: Record<string, number>;
  apple: number;
  flower: number;
  star: number;
  wearing: boolean;
}
const NATURE_KEY = "fufu-garden-bag-v1",
  CLOCK_KEY = "fufu-world-clock-v1";
const initial = (): NatureSave => ({
  picked: {},
  apple: 0,
  flower: 0,
  star: 0,
  wearing: false,
});
export class Nature {
  private treeImage = new Image();
  private origin = Date.now();
  private shift = 0;
  private state = initial();
  private lastUi = 0;
  private oldPhase = "";
  private tint = [0, 0, 0, 0];
  constructor(
    private world: World,
    private activities: Activities,
    private toast: (text: string) => void,
  ) {
    this.treeImage.src = treeUrl;
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
    this.world.flowerCrown = this.state.wearing;
    this.world.available = (spot) => this.available(spot);
    this.world.onEnvironment = (c, t) => this.draw(c, t);
    this.world.onLighting = (c) => this.lighting(c);
    const tick = this.world.onTick;
    this.world.onTick = (dt, t) => {
      tick(dt, t);
      this.tick(dt);
    };
    document
      .querySelector(".crown-toggle")!
      .addEventListener("click", () => this.toggleCrown());
    this.tick(0);
  }
  get elapsed() {
    return Math.max(0, (Date.now() - this.origin) / 1000 + this.shift);
  }
  private get clock() {
    return worldTime(this.elapsed);
  }
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
    this.world.flowerCrown = this.state.wearing;
    this.lastUi = 0;
    this.tick(0);
  }
  reset() {
    this.state = initial();
    this.save();
  }
  private available(spot: Hotspot) {
    if (!eggAvailable(spot.id, this.clock.phase)) return false;
    if (["drop", "dew", "sunset", "firefly"].includes(spot.id))
      return this.picked(spot.id) === 0;
    return true;
  }
  interact(id: string) {
    if (
      ![
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
    if (id === "rest") {
      this.activities.menu(
        `花园里的长椅 · 现在是${phaseNames[this.clock.phase]}，十分钟走过一天`,
        [
          { title: "歇到下一个时段", run: () => this.rest() },
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
      sfx("match");
      this.save();
    }
    this.activities.menu(
      remaining > 0
        ? "采到一朵小花 · 给芙芙戴一顶花冠吧"
        : "这片花今天采够啦 · 让剩下的小花继续盛开吧",
      [
        ...(remaining > 1
          ? [{ title: "再采一朵", run: () => this.pickFlower() }]
          : []),
        {
          title: this.state.wearing ? "摘下花冠" : "把花戴在头上",
          run: () => {
            this.toggleCrown();
            this.activities.close();
          },
        },
      ],
    );
  }
  private toggleCrown() {
    if (this.state.flower === 0) {
      this.toast("先到花园采一朵小花，就能给芙芙戴花冠啦。");
      return;
    }
    this.state.wearing = !this.state.wearing;
    this.save();
    sfx("interact");
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
      if (this.oldPhase)
        this.toast(`${phaseNames[clock.phase]}到了 · 花园里的风景悄悄变了`);
      this.oldPhase = clock.phase;
    }
    if (Date.now() - this.lastUi < 350) return;
    this.lastUi = Date.now();
    const time = document.querySelector(".time-pill")!;
    time.textContent = `${{ dawn: "☀", day: "☀", dusk: "◒", night: "☾" }[clock.phase]} ${clock.label} · ${phaseNames[clock.phase]}`;
    time.setAttribute(
      "title",
      `第 ${clock.day} 天 · 现实十分钟为一天；花园长椅可休息到下一时段`,
    );
    document.querySelector(".bag-count")!.textContent =
      `苹果 ${this.state.apple} · 花朵 ${this.state.flower} · 星屑 ${this.state.star}`;
    const crown = document.querySelector<HTMLButtonElement>(".crown-toggle")!;
    crown.textContent = this.state.wearing ? "摘下花冠" : "戴上花冠";
    crown.setAttribute("aria-pressed", String(this.state.wearing));
    document.querySelector(".day-hint")!.textContent =
      `第 ${clock.day} 天 · 十分钟一昼夜 · ${clock.phase === "dawn" ? "晨露花醒来了" : clock.phase === "dusk" ? "溪边漂来一只纸船" : clock.phase === "night" ? "萤火心愿悄悄出现" : "找长椅休息，等一场黄昏和星夜"}`;
  }
  private draw(c: CanvasRenderingContext2D, t: number) {
    if (this.world.scene === "room") {
      // Replace just the window glass so daylight also reaches the indoor scene.
      const phase = this.clock.phase;
      c.fillStyle =
        phase === "night"
          ? "#27355c"
          : phase === "dusk"
            ? "#cf92a6"
            : phase === "dawn"
              ? "#d7b6c4"
              : "#9dcdd7";
      c.fillRect(239, 13, 25, 49);
      c.fillRect(270, 13, 34, 49);
      c.fillRect(310, 13, 45, 49);
      c.fillStyle = phase === "night" ? "#fff4bd" : "#ffedaf";
      c.beginPath();
      c.arc(327, 29, 8, 0, Math.PI * 2);
      c.fill();
      if (phase === "night") {
        c.fillStyle = "#27355c";
        c.beginPath();
        c.arc(331, 26, 7, 0, Math.PI * 2);
        c.fill();
      }
      return;
    }
    const apple = this.world.config.spots.find((s) => s.id === "apple")!,
      flowers = this.world.config.spots.find((s) => s.id === "flowers")!,
      bench = this.world.config.spots.find((s) => s.id === "rest")!;
    const { x, y } = apple;
    c.fillStyle = "#6b896b33";
    c.beginPath();
    c.ellipse(x, y + 24, 28, 9, 0, 0, Math.PI * 2);
    c.fill();
    if (this.treeImage.complete && this.treeImage.naturalWidth) {
      c.drawImage(this.treeImage, x - 36, y - 53, 72, 80);
    } else {
      c.fillStyle = "#987455";
      c.fillRect(x - 7, y - 3, 14, 28);
      c.fillStyle = "#b68d60";
      c.fillRect(x - 4, y - 3, 4, 26);
      const foliage = [
        [-20, -22, 24, 25],
        [-5, -36, 27, 27],
        [13, -22, 21, 23],
        [-8, -16, 26, 25],
        [-27, -11, 25, 17],
      ];
      foliage.forEach(([dx, dy, w, h], i) => {
        c.fillStyle = ["#68ad8b", "#80be8a", "#72a786", "#94c58d", "#5c977f"][
          i
        ];
        c.fillRect(x + dx, y + dy, w, h);
      });
    }
    for (let i = this.picked("apple"); i < 3; i++) {
      const ax = x + [-16, 17, 2][i],
        ay = y + [-14, -10, -28][i];
      c.fillStyle = "#e77d87";
      c.fillRect(ax - 3, ay - 2, 7, 7);
      c.fillStyle = "#fff0bd";
      c.fillRect(ax - 2, ay - 1, 2, 2);
      c.fillStyle = "#4e8466";
      c.fillRect(ax + 1, ay - 4, 4, 2);
    }
    const picked = this.picked("flowers");
    for (let i = picked; i < 8; i++) {
      const fx = flowers.x + (i % 4) * 8 - 12,
        fy = flowers.y + Math.floor(i / 4) * 9 - 4;
      c.fillStyle = "#7eaa74";
      c.fillRect(fx, fy, 2, 8);
      c.fillStyle = ["#f2adbf", "#cdb6ed", "#fff0b4"][i % 3];
      c.fillRect(fx - 3, fy - 3, 7, 3);
      c.fillRect(fx - 1, fy - 5, 3, 7);
      c.fillStyle = "#e6b468";
      c.fillRect(fx - 1, fy - 2, 3, 3);
    }
    c.fillStyle = "#a7a2bb";
    c.fillRect(bench.x - 19, bench.y + 4, 4, 12);
    c.fillRect(bench.x + 15, bench.y + 4, 4, 12);
    c.fillStyle = "#c3b9d9";
    c.fillRect(bench.x - 23, bench.y - 12, 46, 9);
    c.fillStyle = "#eee5e4";
    c.fillRect(bench.x - 23, bench.y - 1, 46, 7);
    for (const spot of this.world.config.spots) {
      if (!this.available(spot)) continue;
      if (spot.id === "drop") {
        c.fillStyle = "#ffe1a3";
        c.fillRect(spot.x - 5, spot.y - 3, 10, 6);
        c.fillRect(spot.x - 2, spot.y - 7, 4, 14);
      }
      if (spot.id === "dew") {
        c.fillStyle = "#c3f3ed";
        c.beginPath();
        c.arc(spot.x, spot.y, 10, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff4be";
        c.fillRect(spot.x - 3, spot.y - 3, 6, 6);
      }
      if (spot.id === "sunset") {
        c.fillStyle = "#f5cf85";
        c.beginPath();
        c.moveTo(spot.x - 11, spot.y);
        c.lineTo(spot.x + 11, spot.y);
        c.lineTo(spot.x + 5, spot.y + 7);
        c.lineTo(spot.x - 5, spot.y + 7);
        c.closePath();
        c.fill();
        c.fillRect(spot.x, spot.y - 10, 1, 10);
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
  private lighting(c: CanvasRenderingContext2D) {
    const [r, g, b, a] = this.tint;
    c.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${this.world.scene === "room" ? a * 0.48 : a})`;
    c.fillRect(0, 0, this.world.config.width, this.world.config.height);
    if (this.clock.phase !== "night" || this.world.scene === "room") return;
    for (const point of this.world.config.checkpoints) {
      const glow = c.createRadialGradient(
        point.x,
        point.y - 7,
        1,
        point.x,
        point.y - 7,
        30,
      );
      glow.addColorStop(0, "#ffe5a64d");
      glow.addColorStop(1, "#ffe5a600");
      c.fillStyle = glow;
      c.fillRect(point.x - 30, point.y - 37, 60, 60);
    }
  }
}
