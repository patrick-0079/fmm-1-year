import type { World } from "./world";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import { ARCADES } from "./town-data";
import { ITEMS } from "./items";
import {
  createEngine,
  type Engine,
  type GameId,
  type GameAction,
} from "./arcade-engines";
import { sfx } from "./sound";
export class Arcade {
  private engine: Engine | null = null;
  private id: GameId = "snake";
  private awarded = false;
  private hud: HTMLElement = document.querySelector(".arcade-hud")!;
  private previousStatus = "";
  private previousScore = -1;
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
  ) {
    const effects = world.onEffects,
      tick = world.onTick,
      pointer = world.onPointer,
      action = world.onAction;
    world.onAction = (pressed) => {
      if (!this.active) return action(pressed);
      this.action("primary", pressed);
      return true;
    };
    world.onEffects = (c) => {
      effects(c);
      this.draw(c);
    };
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.tick(dt);
    };
    world.onPointer = (type, p) => {
      if (!this.active) return pointer(type, p);
      if (type === "down") this.action("primary", true);
      if (type === "up" || type === "cancel") this.action("primary", false);
      return true;
    };
    const keyAction: Record<string, GameAction> = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      " ": "primary",
      enter: "primary",
    };
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      if (e.key === "Escape") {
        this.close();
        return;
      }
      const action = keyAction[e.key.toLowerCase()];
      if (!action) return;
      if (
        (e.target as Element).closest("button") &&
        [" ", "Enter"].includes(e.key)
      )
        return;
      e.preventDefault();
      if (e.repeat && ["primary", "up"].includes(action)) return;
      this.action(action, true);
    });
    window.addEventListener("keyup", (e) => {
      const action = keyAction[e.key.toLowerCase()];
      if (this.active && action) this.action(action, false);
    });
  }
  get active() {
    return this.engine !== null;
  }
  open(id: GameId) {
    this.close();
    this.activities.close();
    this.world.standUp();
    this.id = id;
    this.engine = createEngine(id);
    this.awarded = false;
    this.previousStatus = "";
    this.previousScore = -1;
    const g = ARCADES[id];
    this.world.clearInput();
    this.world.setFocus({ x: g.x, y: g.y - 60 }, 1.6);
    this.world.canvas.parentElement!.classList.add("arcade-active");
    this.world.paused = true;
    this.hud.hidden = false;
    this.render();
    this.world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  close() {
    if (!this.active) return;
    this.engine = null;
    this.world.canvas.parentElement!.classList.remove("arcade-active");
    this.hud.hidden = true;
    this.hud.replaceChildren();
    this.world.setFocus(null);
    this.world.paused = false;
    this.world.clearInput();
  }
  private start() {
    if (!this.engine) return;
    this.engine.start();
    this.world.canvas.focus({ preventScroll: true });
    sfx("interact");
    this.render();
  }
  private action(action: GameAction, pressed: boolean) {
    if (!this.engine) return;
    if (this.engine.status === "ready" && pressed) {
      this.start();
      return;
    }
    this.engine.input(action, pressed);
    if (pressed && action === "primary") sfx("flip");
  }
  private tick(dt: number) {
    if (!this.engine) return;
    this.engine.update(dt);
    if (this.engine.status === "won" && !this.awarded) {
      this.awarded = true;
      this.inventory.grant(ARCADES[this.id].reward);
      sfx("complete");
    }
    if (
      this.previousStatus !== this.engine.status ||
      this.previousScore !== this.engine.score
    ) {
      this.previousStatus = this.engine.status;
      this.previousScore = this.engine.score;
      this.render();
    }
  }
  private render() {
    if (!this.engine) return;
    const game = ARCADES[this.id],
      e = this.engine;
    const message =
      e.status === "ready"
        ? `${game.title} · ${game.instructions}`
        : e.status === "playing"
          ? `${game.title} · ${e.score} / ${e.goal}`
          : e.status === "won"
            ? `心愿达成！「${ITEMS[game.reward].name}」已经在背包里啦`
            : `没关系，下一次会更熟练 · 本次 ${e.score} / ${e.goal}`;
    // Rebuild only the status/action row; directional controls keep pointer capture.
    if (!this.hud.querySelector(".arcade-controls")) {
      this.hud.innerHTML = `<div class="arcade-heading"><span class="arcade-status" role="status" aria-live="polite"></span><button class="arcade-close">离开摊位 ×</button></div><div class="arcade-result-actions"></div><div class="arcade-controls"><button data-game-action="left" aria-label="游戏向左">←</button><button data-game-action="up" aria-label="游戏向上或旋转">↑</button><button data-game-action="right" aria-label="游戏向右">→</button><button data-game-action="down" aria-label="游戏向下或加速">↓</button><button class="game-primary" data-game-action="primary"></button></div>`;
      this.hud
        .querySelector(".arcade-close")!
        .addEventListener("click", () => this.close());
      this.hud
        .querySelectorAll<HTMLButtonElement>("[data-game-action]")
        .forEach((b) => {
          const action = b.dataset.gameAction as GameAction;
          b.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            b.setPointerCapture(event.pointerId);
            this.action(action, true);
          });
          b.addEventListener("keydown", (event) => {
            if (![" ", "Enter"].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) this.action(action, true);
          });
          b.addEventListener("keyup", (event) => {
            if (![" ", "Enter"].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            this.action(action, false);
          });
          b.addEventListener("click", (event) => {
            if (event.detail !== 0) return;
            this.action(action, true);
            this.action(action, false);
          });
          b.addEventListener("blur", () => this.action(action, false));
          for (const event of [
            "pointerup",
            "pointercancel",
            "lostpointercapture",
          ])
            b.addEventListener(event, () => this.action(action, false));
        });
    }
    this.hud.querySelector(".arcade-status")!.textContent = message;
    this.hud.querySelector(".game-primary")!.textContent =
      this.id === "hop"
        ? "按住蓄力，松开跳"
        : this.id === "flight"
          ? "轻拍翅膀"
          : this.id === "blocks"
            ? "直接落下"
            : "开始 / 方向键移动";
    const controls = this.hud.querySelector<HTMLElement>(".arcade-controls")!;
    controls.dataset.game = this.id;
    controls.hidden = e.status !== "playing";
    const actions = this.hud.querySelector(".arcade-result-actions")!;
    actions.replaceChildren();
    const button = (title: string, run: () => void) => {
      const b = document.createElement("button");
      b.className = "map-action";
      b.textContent = title;
      b.addEventListener("click", run);
      actions.append(b);
    };
    if (e.status === "ready") button("开始挑战", () => this.start());
    if (e.status === "won" || e.status === "lost") {
      button("再玩一次", () => this.open(this.id));
      button("打开纪念背包", () => this.inventory.open());
    }
  }
  private draw(c: CanvasRenderingContext2D) {
    if (!this.engine || this.world.scene !== "town") return;
    const game = ARCADES[this.id];
    c.save();
    c.translate(game.x - 132, game.y - 166);
    c.fillStyle = "#715346";
    c.fillRect(-5, -18, 274, 196);
    c.fillStyle = "#d6b989";
    c.fillRect(-3, -16, 270, 192);
    c.fillStyle = "#fff2d6";
    c.fillRect(0, -13, 264, 186);
    c.fillStyle = "#8e6c72";
    c.font = '9px "Microsoft YaHei",sans-serif';
    c.textAlign = "center";
    c.fillText("芙芙一周年 · " + game.title, 132, -2);
    c.translate(12, 7);
    c.beginPath();
    c.rect(0, 0, 240, 160);
    c.clip();
    this.engine.draw(c);
    if (this.engine.status === "ready") {
      c.fillStyle = "#fff8e6bb";
      c.fillRect(0, 0, 240, 160);
      c.fillStyle = "#9f7295";
      c.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("把小快乐，变成周年纪念品", 120, 75);
    }
    if (this.engine.status === "won") {
      c.fillStyle = "#fff4dbaa";
      c.fillRect(0, 0, 240, 160);
      c.fillStyle = "#a16c8a";
      c.font = '15px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("♡ 一周年快乐 ♡", 120, 75);
    }
    c.restore();
  }
}
