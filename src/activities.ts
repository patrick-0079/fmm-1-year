import type { Point } from "./core";
import type { World } from "./world";
import { sfx } from "./sound";
import cakeUrl from "./assets/anniversary-cake.webp";
import { wishAtBurst, wishOpacity } from "./celebration";
import { drawGardenScreen } from "./cinema-screen";

interface Hooks {
  complete: (id: string) => void;
  toast: (text: string) => void;
}
interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  maxLife: number;
  sparkle: number;
}
const colors = ["#f49fbc", "#9ddbe9", "#c1a4ea", "#ffdb80", "#b4e9bc"];
export class Activities {
  private cakeImage = new Image();
  private mode = "";
  private hud: HTMLElement;
  private status: HTMLElement;
  private controls: HTMLElement;
  private speaker: HTMLElement;
  private portrait: HTMLCanvasElement;
  private cakeStage = 0;
  private blow = 0;
  private blowing = false;
  private cutStart: Point | null = null;
  private cutEnd: Point | null = null;
  private cards: number[] = [];
  private flipped: number[] = [];
  private matched = new Set<number>();
  private flipWait = 0;
  private balloon = [0, 0, 0];
  private released = false;
  private rise = 0;
  private bursts = 0;
  private launches = 0;
  private particles: Particle[] = [];
  private rockets: (Point & {
    target: Point;
    color: string;
    pattern: number;
    trail: Point[];
  })[] = [];
  private messages: { text: string; x: number; row: number }[] = [];
  private skyWishes: (Point & {
    text: string;
    life: number;
    maxLife: number;
  })[] = [];
  constructor(
    private world: World,
    private hooks: Hooks,
  ) {
    this.cakeImage.src = cakeUrl;
    this.hud = document.querySelector(".activity-hud")!;
    this.status = this.hud.querySelector(".activity-status")!;
    this.controls = this.hud.querySelector(".activity-actions")!;
    this.speaker = document.createElement("strong");
    this.speaker.className = "dialogue-name";
    this.speaker.hidden = true;
    this.status.before(this.speaker);
    this.portrait = document.createElement("canvas");
    this.portrait.className = "dialogue-portrait";
    this.portrait.width = 48;
    this.portrait.height = 56;
    this.portrait.setAttribute("aria-hidden", "true");
    this.portrait.hidden = true;
    this.hud.prepend(this.portrait);
    this.hud
      .querySelector(".activity-close")!
      .addEventListener("click", () => this.close());
    world.onDraw = (c, t) => this.draw(c, t);
    world.onEffects = (c) => this.drawEffects(c);
    world.onTick = (dt, t) => this.tick(dt, t);
    world.onPointer = (type, p) => this.pointer(type, p);
    const previousAction = world.onAction;
    world.onAction = (pressed) => {
      if (!this.active) return previousAction(pressed);
      if (this.mode === "cake" && this.cakeStage === 0) {
        this.blowing = pressed;
        if (pressed) sfx("blow");
        return true;
      }
      if (!pressed) return true;
      if (this.mode === "fireworks") {
        this.launch();
        return true;
      }
      if (this.mode === "gifts" && this.flipWait > 0) return true;
      const focused = document.activeElement;
      const action =
        focused instanceof HTMLButtonElement &&
        this.hud.contains(focused) &&
        !focused.disabled
          ? focused
          : this.controls.querySelector<HTMLButtonElement>(
              "button:not(:disabled)",
            );
      if (action) action.click();
      else this.close();
      return true;
    };
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.active) this.close();
      if (this.mode === "gifts" && /^[1-8]$/.test(e.key) && !e.repeat) {
        e.preventDefault();
        this.flip(Number(e.key) - 1);
      }
    });
    window.addEventListener("blur", () => {
      this.blowing = false;
      this.cutStart = null;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.blowing = false;
    });
  }
  get active() {
    return !!this.mode;
  }
  close() {
    this.mode = "";
    this.blowing = false;
    this.cutStart = null;
    this.hud.hidden = true;
    this.controls.replaceChildren();
    if (!this.world.restState) this.world.setFocus(null);
    this.world.paused = false;
    this.world.clearInput();
  }
  reset() {
    this.close();
    this.cakeStage = 0;
    this.blow = 0;
    this.balloon = [0, 0, 0];
    this.released = false;
    this.rise = 0;
    this.bursts = 0;
    this.launches = 0;
    this.particles = [];
    this.rockets = [];
    this.messages = [];
    this.skyWishes = [];
  }
  private begin(mode: string, text: string, point?: Point, zoom = 1) {
    this.close();
    this.mode = mode;
    this.hud.dataset.mode = mode;
    this.hud.hidden = false;
    this.speaker.hidden = true;
    this.portrait.hidden = true;
    this.status.textContent = text;
    if (point) {
      this.world.setFocus(point, zoom);
      this.world.paused = true;
    }
  }
  private action(text: string, run: () => void, className = "") {
    const button = document.createElement("button");
    button.className = `map-action ${className}`;
    button.textContent = text;
    button.addEventListener("click", run);
    this.controls.append(button);
    return button;
  }
  cake() {
    if (this.cakeStage === 3) {
      this.cakeStage = 0;
      this.blow = 0;
    }
    this.begin(
      "cake",
      "第一块蛋糕，给芙芙 · 在桌上许个愿吧",
      { x: 300, y: 224 },
      3,
    );
    this.cakeControls();
  }
  private cakeControls() {
    this.controls.replaceChildren();
    if (this.cakeStage === 0) {
      const button = this.action("按住吹蜡烛", () => {});
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.blowing = true;
        sfx("blow");
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(event, () => (this.blowing = false));
      button.addEventListener("keydown", (e) => {
        if ([" ", "Enter"].includes(e.key)) {
          e.preventDefault();
          this.blowing = true;
        }
      });
      button.addEventListener("keyup", () => (this.blowing = false));
      button.addEventListener("blur", () => (this.blowing = false));
    } else if (this.cakeStage === 1) {
      this.status.textContent = "蜡烛吹灭啦！从蛋糕上方向下划一刀";
      this.action("沿虚线切一刀", () => this.cutCake());
    } else if (this.cakeStage === 2) {
      this.status.textContent = "甜蜜已经切开 · 把第一块送给芙芙";
      this.action("分出第一块", () => {
        this.cakeStage = 3;
        this.hooks.complete("cake");
        sfx("match");
        this.status.textContent = "芙芙，一周年快乐！第一口甜甜送给你 ♡";
        this.controls.replaceChildren();
      });
    }
  }
  private cutCake() {
    this.cakeStage = 2;
    this.cutStart = null;
    this.cutEnd = null;
    sfx("slice");
    this.cakeControls();
  }
  gifts() {
    this.begin(
      "gifts",
      "把地毯上的礼物翻开，找到四对相同的小心意",
      { x: 442, y: 320 },
      2.8,
    );
    this.cards = [0, 1, 2, 3, 0, 1, 2, 3].sort(() => Math.random() - 0.5);
    this.flipped = [];
    this.matched.clear();
    this.flipWait = 0;
    this.giftControls();
  }
  private giftControls() {
    this.controls.replaceChildren();
    this.cards.forEach((value, i) => {
      const visible = this.flipped.includes(i) || this.matched.has(i);
      const button = this.action(
        `${i + 1} ${visible ? ["♡", "✦", "☾", "✿"][value] : "礼物"}`,
        () => this.flip(i),
      );
      button.disabled =
        this.matched.has(i) || this.flipped.includes(i) || this.flipWait > 0;
    });
  }
  private flip(index: number) {
    if (
      this.flipWait > 0 ||
      this.matched.has(index) ||
      this.flipped.includes(index)
    )
      return;
    this.flipped.push(index);
    sfx("flip");
    if (this.flipped.length === 2) {
      const [a, b] = this.flipped;
      if (this.cards[a] === this.cards[b]) {
        this.matched.add(a);
        this.matched.add(b);
        this.flipped = [];
        sfx("match");
        this.status.textContent = `找到 ${this.matched.size / 2} / 4 对礼物啦`;
        if (this.matched.size === 8) {
          this.hooks.complete("gifts");
          this.status.textContent = "每一份心意，都找到了好朋友 ♡";
        }
      } else this.flipWait = 0.85;
    }
    this.giftControls();
  }
  balloons() {
    if (this.released) {
      this.balloon = [0, 0, 0];
      this.released = false;
      this.rise = 0;
    }
    this.begin("balloons", "点摊位上的气球充气 · 每只四下，再一起放飞");
    this.balloonControls();
  }
  private balloonControls() {
    this.controls.replaceChildren();
    this.balloon.forEach((amount, i) => {
      const b = this.action(`${["粉", "蓝", "紫"][i]}气球 ${amount}/4`, () =>
        this.inflate(i),
      );
      b.disabled = amount === 4 || this.released;
    });
    if (this.balloon.every((n) => n === 4) && !this.released)
      this.action("一起放飞", () => {
        this.released = true;
        sfx("release");
        this.hooks.complete("balloons");
        this.status.textContent = "愿芙芙的每个小心愿，都能轻轻飞到星星旁";
        this.controls.replaceChildren();
      });
  }
  private inflate(i: number) {
    if (this.balloon[i] < 4 && !this.released) {
      this.balloon[i]++;
      sfx("inflate");
      this.balloonControls();
    }
  }
  fireworks() {
    if (this.mode === "fireworks") {
      this.launch();
      return;
    }
    this.begin("fireworks", "在花园里点亮烟花 · 点击上方天空，或按 E 连续发射");
    this.action("点燃一朵烟花", () => this.launch());
    this.action("♡ 爱心烟花", () => this.launch(undefined, 0));
    this.action("✦ 星星烟花", () => this.launch(undefined, 1));
    this.action("✧ 金色花火", () => this.launch(undefined, 2));
    this.launch();
  }
  private launch(point?: Point, pattern = this.launches++ % 3) {
    if (this.rockets.length > 3) return;
    const origin = { x: 680, y: 450 };
    this.rockets.push({
      ...origin,
      target: point ?? {
        x: 520 + Math.random() * 230,
        y: 290 + Math.random() * 70,
      },
      color: colors[this.bursts % colors.length],
      pattern,
      trail: [],
    });
    sfx("launch");
  }
  danmaku() {
    this.begin("danmaku", "选一句祝福，让它从花园里的小电视上飘过去");
    [
      "芙芙一周年快乐！",
      "今晚也要好梦 ♡",
      "下一个晚安见",
      "干杯！快乐加一",
    ].forEach((text) =>
      this.action(text, () => {
        this.messages.push({ text, x: 777, row: this.messages.length % 3 });
        sfx("interact");
      }),
    );
  }
  note(text: string, link?: string) {
    this.begin("note", text);
    if (link) {
      const anchor = document.createElement("a");
      anchor.className = "map-action";
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "去 B 站见芙芙 ↗";
      this.controls.append(anchor);
    }
  }
  menu(text: string, options: { title: string; run: () => void }[]) {
    this.begin("nature", text);
    for (const option of options) this.action(option.title, option.run);
  }
  dialogue(
    speaker: string,
    text: string,
    options: { title: string; run: () => void }[],
    paint: (c: CanvasRenderingContext2D) => void,
  ) {
    this.begin("dialogue", text);
    this.speaker.textContent = speaker;
    this.speaker.hidden = false;
    this.portrait.hidden = false;
    const c = this.portrait.getContext("2d")!;
    c.clearRect(0, 0, 48, 56);
    c.imageSmoothingEnabled = false;
    paint(c);
    for (const option of options) this.action(option.title, option.run);
  }
  private pointer(type: string, point: Point) {
    if (this.mode === "cake") {
      if (type === "down" && this.cakeStage === 1) {
        this.cutStart = point;
        this.cutEnd = point;
      }
      if (type === "move" && this.cutStart) this.cutEnd = point;
      if (type === "up" && this.cutStart) {
        const a = this.cutStart;
        if (
          a.y < 216 &&
          point.y > 222 &&
          Math.abs(a.x - 300) < 18 &&
          Math.abs(point.x - 300) < 22
        )
          this.cutCake();
        else {
          this.cutStart = null;
          this.cutEnd = null;
          this.status.textContent = "从蛋糕上方，穿过中间向下划一刀试试";
        }
      }
      if (type === "cancel") {
        this.cutStart = null;
        this.cutEnd = null;
      }
      return true;
    }
    if (this.mode === "gifts") {
      if (type === "down") {
        const col = Math.floor((point.x - 397) / 23),
          row = Math.floor((point.y - 272) / 26);
        if (col >= 0 && col < 4 && row >= 0 && row < 2)
          this.flip(row * 4 + col);
      }
      return true;
    }
    if (
      this.mode === "balloons" &&
      type === "down" &&
      point.y < 252 &&
      point.y > 155
    ) {
      const i = Math.round((point.x - 179) / 24);
      if (i >= 0 && i < 3) {
        this.inflate(i);
        return true;
      }
    }
    if (this.mode === "fireworks" && type === "down" && point.y < 390) {
      this.launch(point);
      return true;
    }
    return false;
  }
  private tick(dt: number, _time: number) {
    if (this.blowing && this.cakeStage === 0) {
      this.blow = Math.min(1, this.blow + dt / 1.65);
      this.status.textContent = `轻轻吹一口气… ${Math.round(this.blow * 100)}%`;
      if (this.blow === 1) {
        this.cakeStage = 1;
        this.blowing = false;
        sfx("match");
        this.cakeControls();
      }
    }
    if (this.flipWait > 0) {
      this.flipWait -= dt;
      if (this.flipWait <= 0) {
        this.flipWait = 0;
        this.flipped = [];
        this.giftControls();
      }
    }
    if (this.released) this.rise = Math.min(650, this.rise + dt * 42);
    for (const message of this.messages) message.x -= dt * 33;
    this.messages = this.messages.filter((m) => m.x > 490);
    for (const wish of this.skyWishes) {
      wish.life -= dt;
      wish.y -= dt * 4;
    }
    this.skyWishes = this.skyWishes.filter((w) => w.life > 0);
    for (const rocket of [...this.rockets]) {
      const dx = rocket.target.x - rocket.x,
        dy = rocket.target.y - rocket.y,
        distance = Math.hypot(dx, dy);
      if (distance < dt * 230 + 1) {
        this.rockets.splice(this.rockets.indexOf(rocket), 1);
        this.bursts++;
        const text = wishAtBurst(this.bursts - 1);
        this.skyWishes.push({
          text,
          x: rocket.x,
          y: rocket.y,
          life: 3.4,
          maxLife: 3.4,
        });
        this.skyWishes = this.skyWishes.slice(-4);
        sfx("burst");
        for (let i = 0; i < 144; i++) {
          const angle = (i / 144) * Math.PI * 2;
          const radius =
            rocket.pattern === 1
              ? (Math.cos(angle * 5) * 0.27 + 0.73) * 100
              : 65 + Math.random() * 42;
          const ring = i % 3 === 0 ? 0.65 : 1;
          let vx = Math.cos(angle) * radius * ring,
            vy = Math.sin(angle) * radius * ring;
          if (rocket.pattern === 0) {
            vx = 16 * Math.sin(angle) ** 3 * 5.5 * ring;
            vy =
              -(
                13 * Math.cos(angle) -
                5 * Math.cos(2 * angle) -
                2 * Math.cos(3 * angle) -
                Math.cos(4 * angle)
              ) *
              5.5 *
              ring;
          }
          const life = 2.2 + Math.random() * 0.65;
          this.particles.push({
            x: rocket.x,
            y: rocket.y,
            vx,
            vy,
            life,
            maxLife: life,
            color:
              rocket.pattern === 0
                ? ["#ff478d", "#ffad45", "#d566ff"][i % 3]
                : rocket.pattern === 1
                  ? ["#9e64ff", "#ffc642", "#43d8ee"][i % 3]
                  : ["#ffb63d", "#ff698d", "#43c9b6"][i % 3],
            sparkle: i % 12,
          });
        }
        if (this.bursts >= 3) this.hooks.complete("fireworks");
        if (this.mode === "fireworks")
          this.status.textContent = `${text} · ${this.bursts} 朵烟花已绽放`;
      } else {
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 13) rocket.trail.shift();
        rocket.x += (dx / distance) * dt * 230;
        rocket.y += (dy / distance) * dt * 230;
      }
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * 15;
      p.vx *= Math.max(0, 1 - dt * 0.22);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
  private draw(c: CanvasRenderingContext2D, t: number) {
    c.save();
    if (this.world.scene === "room") {
      this.drawCake(c, t);
      if (this.mode === "gifts") {
        c.fillStyle = "#d6c8e9";
        c.fillRect(393, 268, 100, 59);
        c.strokeStyle = "#fff5df";
        c.strokeRect(395, 270, 96, 55);
        this.cards.forEach((value, i) => {
          const x = 398 + (i % 4) * 23,
            y = 273 + Math.floor(i / 4) * 26,
            visible = this.flipped.includes(i) || this.matched.has(i);
          c.fillStyle = this.matched.has(i)
            ? "#d5eabf"
            : visible
              ? "#fff5db"
              : colors[i % colors.length];
          c.fillRect(x, y, 19, 22);
          c.strokeStyle = "#fff8ea";
          c.strokeRect(x + 1, y + 1, 17, 20);
          c.fillStyle = "#7e5c87";
          c.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif';
          c.textAlign = "center";
          c.fillText(
            visible ? ["♡", "✦", "☾", "✿"][value] : "?",
            x + 9.5,
            y + 15,
          );
        });
      }
    }
    if (this.world.scene === "garden") {
      if (this.mode === "balloons" || this.released)
        this.balloon.forEach((amount, i) => {
          const x = 179 + i * 24 + Math.sin(t * 1.5 + i) * 3,
            y = 211 - this.rise - i * 8,
            r = 7 + amount * 2;
          if (y < -50) return;
          c.strokeStyle = "#fff3df";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(x, y + r);
          c.lineTo(x - 3, y + r + 29);
          c.stroke();
          c.fillStyle = colors[i];
          c.beginPath();
          c.ellipse(x, y, r, r * 1.22, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#fff8eb";
          c.fillRect(x - 5, y - 8, 3, 6);
        });
      if (this.messages.length)
        drawGardenScreen(c, (c) => {
          c.fillStyle = "#fff1bb";
          c.font = '8px "Microsoft YaHei", "PingFang SC", sans-serif';
          for (const m of this.messages)
            c.fillText(m.text, m.x - 667, 12 + m.row * 13);
        });
    }
    c.restore();
  }
  private drawEffects(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "garden") return;
    c.save();
    c.globalCompositeOperation = "source-over";
    for (const rocket of this.rockets) {
      rocket.trail.forEach((p, i) => {
        c.globalAlpha = ((i + 1) / rocket.trail.length) * 0.65;
        c.fillStyle = i % 2 ? "#ffd78a" : "#fff5cb";
        c.fillRect(p.x - 1, p.y - 1, 2, 3);
      });
      c.globalAlpha = 1;
      c.strokeStyle = "#ffd887";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(rocket.x, rocket.y + 16);
      c.lineTo(rocket.x, rocket.y);
      c.stroke();
      c.fillStyle = "#fff7dd";
      c.fillRect(rocket.x - 2, rocket.y - 2, 4, 4);
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const p of this.particles) {
      const age = p.maxLife - p.life;
      c.globalAlpha = Math.max(0, Math.min(reduced ? 0.55 : 1, p.life / 0.9));
      if (p.sparkle === 0 && !reduced) {
        const glow = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        glow.addColorStop(0, p.color + "99");
        glow.addColorStop(1, p.color + "00");
        c.fillStyle = glow;
        c.fillRect(p.x - 7, p.y - 7, 14, 14);
      }
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2.5, 2.5);
      c.strokeStyle = p.color;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x - p.vx * 0.055, p.y - p.vy * 0.055);
      c.stroke();
      if (p.sparkle < 2 && age > 0.35) {
        c.fillStyle = "#fff7dc";
        c.fillRect(p.x - 3, p.y, 7, 1);
        c.fillRect(p.x, p.y - 3, 1, 7);
      }
    }

    const area = this.world.visibleArea;
    c.font = 'bold 13px "Microsoft YaHei","PingFang SC",sans-serif';
    c.textAlign = "center";
    for (const wish of this.skyWishes) {
      c.globalAlpha = wishOpacity(wish.life, wish.maxLife);
      const margin = c.measureText(wish.text).width / 2 + 12;
      const x = Math.max(
        area.x + margin,
        Math.min(area.x + area.w - margin, wish.x),
      );
      const y = Math.max(area.y + 58, wish.y - 9);
      c.lineWidth = 3;
      c.lineJoin = "round";
      c.strokeStyle = "#77516d";
      c.strokeText(wish.text, x, y);
      c.fillStyle = "#fff2bd";
      c.fillText(wish.text, x, y);
      c.fillStyle = "#ffd4e4";
      c.fillRect(x - margin + 3, y - 8, 2, 2);
      c.fillRect(x + margin - 5, y - 4, 2, 2);
    }
    c.restore();
  }
  private drawCake(c: CanvasRenderingContext2D, t: number) {
    const x = 300,
      y = 213,
      split = this.cakeStage >= 2 ? 3 : 0;
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * split, 0);
      c.beginPath();
      c.rect(side < 0 ? x - 35 : x, y - 40, 35, 70);
      c.clip();
      if (this.cakeImage.complete && this.cakeImage.naturalWidth)
        c.drawImage(this.cakeImage, x - 33, y - 36, 66, 62);
      else {
        c.fillStyle = "#f0b3c5";
        c.fillRect(x - 17, y - 8, 34, 20);
        c.fillStyle = "#fff0d6";
        c.fillRect(x - 17, y - 9, 34, 5);
      }
      c.restore();
    }
    if (this.cakeStage === 0) {
      c.fillStyle = "#ffce6d";
      c.beginPath();
      c.ellipse(
        x + 0.5 + Math.sin(t * 9) * (this.blowing ? 2 : 0.3),
        y - 27.5,
        1.8,
        3.5 * (1 - this.blow * 0.6),
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.fillStyle = "#fff3be";
      c.fillRect(x, y - 28, 1, 2);
    }
    if (this.mode === "cake" && this.cakeStage === 1) {
      c.strokeStyle = "#ad7d9b";
      c.lineWidth = 0.7;
      c.setLineDash([2, 2]);
      c.beginPath();
      c.moveTo(x, y - 17);
      c.lineTo(x, y + 17);
      c.stroke();
      c.setLineDash([]);
      if (this.cutStart && this.cutEnd) {
        c.strokeStyle = "#fff7e2";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(this.cutStart.x, this.cutStart.y);
        c.lineTo(this.cutEnd.x, this.cutEnd.y);
        c.stroke();
      }
    }
  }
}
