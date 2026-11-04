import type { Point } from "./core";
import type { World } from "./world";
import { sfx } from "./sound";
import { reservedShortcut, readingTarget } from "./input";
import cakeUrl from "./assets/anniversary-cake.webp";
import cakeSliceUrl from "./assets/cake-slice-v11.webp";
import { wishAtBurst, wishOpacity } from "./celebration";
import {
  cakeGuides,
  cakePlates,
  followsCakeGuide,
  drawCakeSlice,
} from "./cake-party";
import { drawPartyProp } from "./party-art";
import type { ItemId } from "./items";

interface Hooks {
  complete: (id: string) => void;
  toast: (text: string) => void;
  reward?: (id: ItemId) => void;
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
  private cakeSliceImage = new Image();
  private mode = "";
  private dialogueEnd?: () => void;
  private dialogueAt?: { scene: World["scene"]; point: Point };
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
  private cutStroke: Point[] = [];
  private cakeCuts = 0;
  private eaten = new Set<number>();
  private eatTime = 0;
  private eating = 0;
  private giftFlips = Array(8).fill(0);
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
    this.cakeSliceImage.src = cakeSliceUrl;
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
    const cancel = world.onInputCancel;
    world.onInputCancel = () => {
      cancel();
      this.blowing = false;
      this.cutStart = null;
      this.cutStroke = [];
    };
    const previousAction = world.onAction;
    world.onAction = (pressed) => {
      if (!this.active) return previousAction(pressed);
      if (world.suspended) return true;
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
      if (reservedShortcut(e) || world.suspended || readingTarget(e.target)) return;
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
  finishEquipmentChoice() {
    // These lightweight conversations intercept E/right click even though the
    // character can walk. Finish the choice so the next input is a map action.
    if (!this.world.restState && ["dialogue", "nature", "note"].includes(this.mode)) this.close();
  }
  private hidePanel() {
    const returnFocus = this.mode==="dialogue" && this.hud.contains(document.activeElement);
    this.dialogueEnd?.();
    this.dialogueEnd = undefined;
    this.dialogueAt = undefined;
    this.mode = "";
    this.hud.hidden = true;
    this.controls.replaceChildren();
    if (returnFocus && !this.world.suspended) this.world.canvas.focus({preventScroll:true});
  }
  private dismissIfOutOfReach() {
    const at = this.dialogueAt;
    if (!at || (at.scene===this.world.scene &&
      Math.hypot(this.world.player.x-at.point.x, this.world.player.y-at.point.y)<=72)) return false;
    // Leaving a speaker must not clear a held key, touch direction or click-to-walk route.
    this.hidePanel();
    return true;
  }
  close() {
    this.hidePanel();
    this.world.actorHidden = false;
    if (this.cakeStage === 4) this.cakeStage = 2;
    this.blowing = false;
    this.cutStart = null;
    this.cutStroke = [];
    this.flipWait = 0;
    this.flipped = [];
    this.giftFlips = this.giftFlips.map(() => 0);
    if (!this.world.restState) this.world.setFocus(null);
    this.world.paused = false;
    this.world.clearInput();
  }
  reset() {
    this.close();
    this.cakeStage = 0;
    this.cakeCuts = 0;
    this.eaten.clear();
    this.eatTime = 0;
    this.blow = 0;
    this.balloon = [0, 0, 0];
    this.released = false;
    this.rise = 0;
    this.bursts = 0;
    this.launches = 0;
    this.particles = [];
    this.rockets = [];
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
      this.cakeCuts = 0;
      this.eaten.clear();
    }
    this.begin(
      "cake",
      "第一块蛋糕，给芙芙 · 在桌上许个愿吧",
      { x: 309, y: 236 },
      2.8,
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
        if (reservedShortcut(e)) return;
        if ([" ", "Enter"].includes(e.key)) {
          e.preventDefault();
          this.blowing = true;
        }
      });
      button.addEventListener("keyup", () => (this.blowing = false));
      button.addEventListener("blur", () => (this.blowing = false));
    } else if (this.cakeStage === 1) {
      this.status.textContent = `沿第 ${this.cakeCuts + 1} 条虚线滑动切开 · 三刀分成六块（${this.cakeCuts}/3）`;
      this.action(`沿第 ${this.cakeCuts + 1} 条线切开 · E`, () =>
        this.cutCake(),
      );
    } else if (this.cakeStage === 2) {
      this.status.textContent = `六份甜甜已经装盘 · 剩 ${6 - this.eaten.size} 块，点盘子选一块给芙芙尝尝`;
      this.action("和芙芙一起吃一块 🍰", () => this.eatSlice());
    } else if (this.cakeStage === 4) {
      this.status.textContent = "芙芙正在尝一口周年蛋糕…";
      this.action("看完这小段 / 跳过", () => this.finishEating());
    }
  }
  private cutCake() {
    this.cakeCuts++;
    this.cakeStage = this.cakeCuts >= 3 ? 2 : 1;
    this.cutStart = null;
    this.cutEnd = null;
    this.cutStroke = [];
    sfx("slice");
    this.cakeControls();
  }
  private eatSlice(index?: number) {
    const next =
      index ??
      Array.from({ length: 6 }, (_, i) => i).find((i) => !this.eaten.has(i));
    if (next === undefined || this.eaten.has(next) || this.cakeStage !== 2)
      return;
    this.eating = next;
    this.eatTime = 0;
    this.cakeStage = 4;
    this.world.actorHidden = true;
    this.cakeControls();
  }
  private finishEating() {
    if (this.cakeStage !== 4) return;
    this.eaten.add(this.eating);
    this.world.actorHidden = false;
    this.cakeStage = this.eaten.size === 6 ? 3 : 2;
    this.hooks.complete("cake");
    this.hooks.reward?.("berryBag");
    sfx("complete");
    this.cakeControls();
    if (this.cakeStage === 3) {
      this.status.textContent = "六块蛋糕都甜甜地分享完啦 · 芙芙，一周年快乐 ♡";
      this.controls.replaceChildren();
      this.action("再准备一份周年蛋糕", () => this.cake());
    }
  }
  gifts() {
    this.begin(
      "gifts",
      "把地毯上的礼物翻开，找到四对相同的小心意",
      { x: 442, y: 320 },
      2.8,
    );
    this.world.actorHidden = true;
    this.cards = [0, 1, 2, 3, 0, 1, 2, 3].sort(() => Math.random() - 0.5);
    this.flipped = [];
    this.matched.clear();
    this.flipWait = 0;
    this.giftFlips.fill(0);
    this.giftControls();
  }
  private giftControls() {
    this.controls.replaceChildren();
    this.cards.forEach((value, i) => {
      const visible = this.flipped.includes(i) || this.matched.has(i);
      const button = this.action(
        `${i + 1} ${visible ? ["草莓心意", "薄荷心意", "星月心意", "奶油心意"][value] : "拆开礼盒"}`,
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
    this.giftFlips[index] = 0.4;
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
          this.hooks.reward?.("ribbonShoes");
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
  menu(text: string, options: { title: string; run: () => void }[], point?: Point, zoom = 1) {
    this.begin("nature", text, point, zoom);
    for (const option of options) this.action(option.title, option.run);
  }
  dialogue(
    speaker: string,
    text: string,
    options: { title: string; run: () => void }[],
    paint: (c: CanvasRenderingContext2D) => void,
    at: Point,
    onClose?: () => void,
  ) {
    const keepFocus = this.hud.contains(document.activeElement);
    this.begin("dialogue", text);
    const encounter = this.dialogueAt = {scene:this.world.scene, point:at};
    this.dialogueEnd = onClose;
    this.speaker.textContent = speaker;
    this.speaker.hidden = false;
    this.portrait.hidden = false;
    const c = this.portrait.getContext("2d")!;
    c.clearRect(0, 0, 48, 56);
    c.imageSmoothingEnabled = false;
    paint(c);
    for (const option of options) this.action(option.title, () => {
      if (this.dialogueAt === encounter && !this.dismissIfOutOfReach()) option.run();
    });
    this.hud.scrollTop = 0;
    if (keepFocus) (this.controls.querySelector<HTMLButtonElement>("button") ??
      this.hud.querySelector<HTMLButtonElement>(".activity-close"))?.focus({preventScroll:true});
  }
  private pointer(type: string, point: Point) {
    if (this.mode === "cake") {
      if (type === "down" && this.cakeStage === 1) {
        this.cutStart = point;
        this.cutEnd = point;
        this.cutStroke = [point];
      }
      if (type === "move" && this.cutStart) {
        this.cutEnd = point;
        this.cutStroke.push(point);
      }
      if (type === "up" && this.cutStart) {
        this.cutStroke.push(point);
        if (followsCakeGuide(this.cutStroke, this.cakeCuts)) this.cutCake();
        else {
          this.cutStart = null;
          this.cutEnd = null;
          this.status.textContent =
            "沿亮起的虚线，从一端滑到另一端试试（也可以按 E 辅助切开）";
        }
      }
      if (type === "down" && this.cakeStage === 2) {
        const index = cakePlates.findIndex(
          (p) => Math.hypot(p.x - point.x, p.y - point.y) < 9,
        );
        if (index >= 0) this.eatSlice(index);
      }
      if (type === "cancel") {
        this.cutStart = null;
        this.cutEnd = null;
      }
      return true;
    }
    if (this.mode === "gifts") {
      if (type === "down") {
        const col = Math.floor((point.x - 392) / 26),
          row = Math.floor((point.y - 275) / 29);
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
      const i = Math.round((point.x - 179) / 26);
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
    this.dismissIfOutOfReach();
    this.giftFlips = this.giftFlips.map((n) => Math.max(0, n - dt));
    if (this.mode === "cake" && this.cakeStage === 4) {
      this.eatTime += dt;
      if (this.eatTime >= 3) this.finishEating();
    }
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
    if (this.mode === "gifts" && this.flipWait > 0) {
      this.flipWait -= dt;
      if (this.flipWait <= 0) {
        this.flipWait = 0;
        this.flipped = [];
        this.giftControls();
      }
    }
    if (this.released) this.rise = Math.min(650, this.rise + dt * 42);
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
        c.fillStyle = "#88665633";
        c.beginPath();
        c.roundRect(387, 261, 113, 76, 5);
        c.fill();
        c.fillStyle = "#c29c7c";
        c.beginPath();
        c.roundRect(387, 259, 113, 76, 5);
        c.fill();
        c.fillStyle = "#fff1db";
        c.beginPath();
        c.roundRect(389, 261, 109, 72, 4);
        c.fill();
        c.fillStyle = "#9b6a86";
        c.font = '7px "Microsoft YaHei",sans-serif';
        c.textAlign = "center";
        c.fillText("心意成双 · 芙芙一周年", 444, 270);
        this.cards.forEach((value, i) => {
          const x = 392 + (i % 4) * 26,
            y = 275 + Math.floor(i / 4) * 29;
          const matched = this.matched.has(i),
            visible =
              (this.flipped.includes(i) || matched) && this.giftFlips[i] < 0.2;
          const scale =
            this.giftFlips[i] > 0
              ? Math.max(
                  0.05,
                  Math.abs(Math.cos((this.giftFlips[i] / 0.4) * Math.PI)),
                )
              : 1;
          c.save();
          c.translate(x + 12, y + 13);
          c.scale(scale, 1);
          c.fillStyle = matched ? "#e7eedb" : "#f7e7d8";
          c.beginPath();
          c.roundRect(-12, -13, 24, 27, 3);
          c.fill();
          c.strokeStyle = matched ? "#b3c398" : "#dbbba7";
          c.lineWidth = 0.5;
          c.stroke();
          drawPartyProp(c, visible ? 4 + value : 4, -10, -11, 20, 23);
          if (matched) {
            c.fillStyle = "#769f83";
            c.font = '6px "Microsoft YaHei",sans-serif';
            c.fillText("✓", 8, -7);
          } else {
            c.fillStyle = "#9c7789";
            c.font = '5px "Microsoft YaHei",sans-serif';
            c.fillText(String(i + 1), -8, -7);
          }
          c.restore();
        });
        this.world.drawAvatarAt(c, 520, 324, 0);
        drawPartyProp(c, 7, 508, 307, 11, 13);
        if (this.matched.size === 8)
          for (let i = 0; i < 9; i++) {
            c.fillStyle = ["#e4b0c5", "#e9ca87", "#a9c8b5"][i % 3];
            c.beginPath();
            c.arc(
              391 + i * 13,
              255 + Math.sin(t * 2 + i) * 4,
              1.1,
              0,
              Math.PI * 2,
            );
            c.fill();
          }
      }
    }
    if (this.world.scene === "garden") {
      if (this.mode === "balloons" || this.released)
        this.balloon.forEach((amount, i) => {
          const height = 38 + amount * 6,
            x = 179 + i * 26 + Math.sin(t * 1.3 + i) * 2,
            y = 228 - this.rise - i * 7;
          if (y < -80) return;
          c.save();
          c.translate(x, y);
          c.rotate(Math.sin(t * 1.1 + i) * 0.035);
          drawPartyProp(
            c,
            [0, 2, 3][i],
            -height * 0.29,
            -height,
            height * 0.58,
            height,
          );
          c.restore();
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
    if (this.cakeImage.complete && this.cakeImage.naturalWidth)
      c.drawImage(this.cakeImage, 267, 177, 66, 62);
    if (this.cakeStage === 0) {
      c.fillStyle = "#ffce6d";
      c.beginPath();
      c.ellipse(
        300.5 + Math.sin(t * 9) * (this.blowing ? 2 : 0.3),
        185.5,
        1.8,
        3.5 * (1 - this.blow * 0.6),
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.fillStyle = "#fff3be";
      c.fillRect(300, 185, 1, 2);
    }
    if (this.cakeCuts > 0) {
      c.save();
      c.beginPath();
      c.ellipse(300, 207, 19, 11, 0, 0, Math.PI * 2);
      c.clip();
      c.strokeStyle = "#b37b87";
      c.lineWidth = 0.65;
      for (const [a, b] of cakeGuides.slice(0, this.cakeCuts)) {
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      c.restore();
    }
    if (this.mode === "cake" && this.cakeStage === 1) {
      const [a, b] = cakeGuides[this.cakeCuts];
      c.strokeStyle = "#b77d9a";
      c.lineWidth = 0.8;
      c.setLineDash([1.7, 1.7]);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.setLineDash([]);
      for (const p of [a, b]) {
        c.fillStyle = "#fff0be";
        c.beginPath();
        c.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
        c.fill();
      }
      if (this.cutStart && this.cutEnd) {
        c.strokeStyle = "#fff7e2";
        c.lineWidth = 1.7;
        c.beginPath();
        this.cutStroke.forEach((p, i) =>
          i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
        );
        c.stroke();
      }
    }
    if (this.cakeCuts === 3 && this.mode === "cake") {
      c.fillStyle = "#8f6a51";
      c.beginPath();
      c.roundRect(227, 204, 44, 58, 3);
      c.fill();
      c.fillStyle = "#d7ad83";
      c.beginPath();
      c.roundRect(228, 203, 42, 57, 3);
      c.fill();
      c.fillStyle = "#f5e2cf";
      c.beginPath();
      c.roundRect(230, 205, 38, 53, 2);
      c.fill();
      c.fillStyle = "#a8798d";
      c.font = '5px "Microsoft YaHei",sans-serif';
      c.textAlign = "center";
      c.fillText("♡ 周年分享台 ♡", 249, 212);
      cakePlates.forEach((p, i) => {
        if (!this.eaten.has(i) && !(this.cakeStage === 4 && this.eating === i))
          drawCakeSlice(c, p.x, p.y, 0.9, this.cakeSliceImage);
        else {
          c.fillStyle = "#fff1da";
          c.beginPath();
          c.ellipse(p.x, p.y + 2, 7, 3.2, 0, 0, Math.PI * 2);
          c.fill();
        }
      });
    }
    if (this.mode === "cake" && this.cakeStage === 4) {
      const time = this.eatTime,
        actor = { x: 339, y: 251 };
      c.save();
      c.translate(actor.x, actor.y);
      c.rotate(
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : Math.sin(time * 9) * 0.025,
      );
      this.world.drawAvatarAt(c, 0, 0, 0);
      c.restore();
      const start = cakePlates[this.eating],
        p = Math.min(1, time / 0.65),
        size = time < 1.3 ? 1 : time < 1.9 ? 0.72 : time < 2.5 ? 0.4 : 0;
      if (size)
        drawCakeSlice(
          c,
          start.x + (actor.x - 5 - start.x) * p,
          start.y + (actor.y - 25 - start.y) * p,
          size,
          this.cakeSliceImage,
        );
      for (let i = 0; i < 3; i++) {
        const phase = (time + i * 0.5) % 2.2;
        c.fillStyle = ["#dc94b1", "#e4bf75", "#bea7cf"][i];
        c.beginPath();
        c.arc(
          actor.x - 12 + i * 12,
          actor.y - 40 - phase * 7,
          1.5 + Math.sin(phase * 2) * 0.5,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.fillStyle = "#92697e";
      c.font = '7px "Microsoft YaHei",sans-serif';
      c.textAlign = "center";
      c.fillText(
        time < 0.7 ? "第一口甜甜，给芙芙" : "好甜呀！一周年快乐 ♡",
        328,
        270,
      );
    }
  }
}
