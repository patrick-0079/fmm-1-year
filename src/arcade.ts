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
import { LinkGame, MinesGame } from "./arcade-bonus";
import { reservedShortcut, readingTarget } from "./input";
export class Arcade {
  private engine: Engine | null = null;
  private id: GameId = "snake";
  private awarded = false;
  private hud: HTMLElement = document.querySelector(".arcade-hud")!;
  private previousStatus = "";
  private previousScore = -1;
  private paused = false;
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
  ) {
    const effects = world.onEffects,
      tick = world.onTick,
      pointer = world.onPointer,
      action = world.onAction;
    const cancel = world.onInputCancel;
    world.onInputCancel = () => {
      cancel();
      this.engine?.cancelInput?.();
    };
    window.addEventListener("blur", () => this.setPaused(true, false));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.setPaused(true, false);
    });
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
      if (world.suspended || this.paused) return true;
      if (type === "down" && this.engine?.pointer) {
        if (this.engine.status === "ready") this.start();
        const g = ARCADES[this.id];
        this.engine.pointer(p.x - (g.x - 120), p.y - (g.y - 159));
        this.render();
        return true;
      }
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
      f: "drop",
    };
    window.addEventListener("keydown", (e) => {
      if (!this.active || world.suspended || reservedShortcut(e) || readingTarget(e.target)) return;
      if (e.key.toLowerCase() === "p" && !e.repeat) {
        e.preventDefault();
        this.setPaused(!this.paused);
        return;
      }
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
    this.hud.dataset.game = id;
    this.engine = createEngine(id);
    this.awarded = false;
    this.paused = false;
    this.previousStatus = "";
    this.previousScore = -1;
    const g = ARCADES[id];
    this.world.clearInput();
    this.world.setFocus({ x: g.x, y: g.y - 82 }, 1.8);
    this.world.canvas.parentElement!.classList.add("arcade-active");
    this.world.paused = true;
    this.hud.hidden = false;
    this.render();
    this.showBoard();
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
    this.showBoard();
  }
  private action(action: GameAction, pressed: boolean) {
    if (!this.engine || this.world.suspended) return;
    if (this.paused) {
      if (pressed && action === "primary") this.setPaused(false);
      return;
    }
    if (this.engine.status === "ready" && pressed) {
      this.start();
      return;
    }
    if (this.engine.status === "won" && pressed) {
      this.continue();
      return;
    }
    this.engine.input(action, pressed);
    if (pressed && action === "primary") sfx("flip");
  }
  private tick(dt: number) {
    if (!this.engine || this.world.suspended || this.paused) return;
    this.engine.update(dt);
    if (this.engine.achieved && !this.awarded) {
      this.awarded = true;
      this.inventory.grant(ARCADES[this.id].reward);
      sfx("complete");
    }
    if (
      this.engine.achieved &&
      this.engine.score >= this.engine.goal * 2 &&
      !this.inventory.has("rabbitSatchel")
    )
      this.inventory.grant("rabbitSatchel");
    if (
      this.previousStatus !== this.engine.status ||
      this.previousScore !== this.engine.score
    ) {
      this.previousStatus = this.engine.status;
      this.previousScore = this.engine.score;
      this.render();
    }
  }
  private continue() {
    this.engine?.continuePlay();
    this.world.clearInput();
    this.world.canvas.focus({ preventScroll: true });
    this.render();
    this.showBoard();
  }
  private setPaused(paused: boolean, reveal = true) {
    if (!this.engine || this.engine.status !== "playing" || this.paused === paused) return;
    this.paused = paused;
    this.engine.cancelInput?.();
    this.world.clearInput();
    this.render();
    if (!reveal) return;
    if (!paused) this.world.canvas.focus({ preventScroll: true });
    else this.hud.querySelector<HTMLButtonElement>(".arcade-result-actions button")?.focus({ preventScroll: true });
    this.showBoard();
  }
  private showBoard() {
    this.world.canvas.parentElement!.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  private render() {
    if (!this.engine) return;
    this.previousStatus = this.engine.status;
    this.previousScore = this.engine.score;
    const game = ARCADES[this.id],
      e = this.engine;
    const message = this.paused
      ? "暂停休息中 · 按 P / E 或点击「继续挑战」回到这一局"
      : e.status === "ready"
        ? `${game.title} · ${game.instructions}`
        : e.status === "playing"
          ? e.achieved
            ? "纪念奖励已收好 · 继续创造自己的小纪录吧"
            : game.instructions
          : e.status === "won"
            ? `心愿达成！「${ITEMS[game.reward].name}」已经在背包里啦`
            : `没关系，下一次会更熟练 · 本次 ${e.score} / ${e.goal}`;
    // Rebuild only the status/action row; directional controls keep pointer capture.
    if (!this.hud.querySelector(".arcade-controls")) {
      this.hud.innerHTML = `<div class="arcade-heading"><div><small>FUFU’S 1st ANNIVERSARY · 小小游乐会</small><h3 class="arcade-title"></h3></div><div class="arcade-score"><strong></strong><span></span></div><button class="arcade-close">离开摊位 ×</button></div><div class="arcade-reward-track"><progress></progress><span></span></div><p class="arcade-status" role="status" aria-live="polite"></p><div class="arcade-result-actions"></div><div class="arcade-controls"><button data-game-action="left" aria-label="游戏向左">←</button><button data-game-action="up" aria-label="游戏向上或旋转">↑</button><button data-game-action="right" aria-label="游戏向右">→</button><button data-game-action="down" aria-label="游戏向下或加速">↓</button><button class="game-primary" data-game-action="primary"></button></div><div class="arcade-extra-actions"></div>`;
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
            if (reservedShortcut(event)) return;
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
    this.hud.querySelector(".arcade-title")!.textContent = game.title;
    this.hud.querySelector(".arcade-score strong")!.textContent = String(
      e.score,
    );
    this.hud.querySelector(".arcade-score span")!.textContent = e.achieved
      ? "挑战纪录"
      : `目标 ${e.goal}`;
    const track = this.hud.querySelector<HTMLProgressElement>("progress")!;
    track.max = e.goal;
    track.value = Math.min(e.goal, e.score);
    this.hud.querySelector(".arcade-reward-track span")!.textContent =
      e.achieved
        ? "✓ 周年纪念已领取 · 这场小冒险还可以继续"
        : `达成目标可获得：${ITEMS[game.reward].name}`;
    this.hud.querySelector(".arcade-status")!.textContent = message;
    this.hud.querySelector(".game-primary")!.textContent =
      this.id === "link"
        ? "选择图案 / 确认"
        : this.id === "mines"
          ? "翻开所选格"
          : this.id === "miner"
            ? "放下星光钩"
            : this.id === "hop"
              ? "按住蓄力，松开跳"
              : this.id === "flight"
                ? "轻拍翅膀"
                : this.id === "blocks"
                  ? "直接落下"
                  : "开始 / 方向键移动";
    const controls = this.hud.querySelector<HTMLElement>(".arcade-controls")!;
    controls.dataset.game = this.id;
    controls.hidden = e.status !== "playing" || this.paused;
    const extra = this.hud.querySelector(".arcade-extra-actions")!;
    extra.replaceChildren();
    const extraButton = (text: string, run: () => void, disabled = false) => {
      const b = document.createElement("button");
      b.className = "map-action";
      b.textContent = text;
      b.disabled = disabled;
      b.addEventListener("click", () => {
        const index = Array.from(extra.children).indexOf(b);
        run();
        this.render();
        const next = extra.children[index] as HTMLButtonElement | undefined;
        if (next && !next.disabled) next.focus({ preventScroll: true });
        else this.world.canvas.focus({ preventScroll: true });
        this.showBoard();
      });
      extra.append(b);
      return b;
    };
    if (e.status === "playing" && !this.paused && e instanceof LinkGame) {
      extraButton("提示一对", () => e.hint());
      extraButton("重新洗牌", () => e.shuffle());
    }
    if (e.status === "playing" && !this.paused && e instanceof MinesGame) {
      extraButton(
        e.flagMode ? "标旗模式：开（点格子标旗）" : "标旗模式：关",
        () => {
          e.flagMode = !e.flagMode;
        },
      ).setAttribute("aria-pressed", String(e.flagMode));
      extraButton(`安全提示 · 剩余 ${e.hints}`, () => e.hint(), e.hints === 0);
      extraButton("标记所选格 F", () => e.input("drop", true));
    }
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
    if (e.status === "playing")
      button(this.paused ? "继续挑战 P" : "暂停休息 P", () => this.setPaused(!this.paused));
    if (e.status === "won") button("继续游玩 →", () => this.continue());
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
    c.fillStyle = "#7d5b772e";
    c.beginPath();
    c.roundRect(-8, -21, 280, 202, 12);
    c.fill();
    const paper = c.createLinearGradient(0, -18, 0, 176);
    paper.addColorStop(0, "#fff8e9");
    paper.addColorStop(1, "#f3dce7");
    c.fillStyle = paper;
    c.beginPath();
    c.roundRect(-5, -18, 274, 196, 10);
    c.fill();
    c.strokeStyle = "#c99bb4";
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = "#e2c08c";
    c.lineWidth = 0.7;
    c.strokeRect(3, -10, 258, 180);
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
      c.fillText("为芙芙收集一份周年小快乐", 120, 75);
    }
    if (this.engine.status === "won") {
      c.fillStyle = "#fff4dbaa";
      c.fillRect(0, 0, 240, 160);
      c.fillStyle = "#a16c8a";
      c.font = '15px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("♡ 一周年快乐 ♡", 120, 67);
      c.font = '10px "Microsoft YaHei",sans-serif';
      c.fillText("已领到纪念品 · 按 E 或点继续游玩", 120, 88);
    }
    if (this.paused || this.world.suspended) {
      c.fillStyle = "#fff8e6dd";
      c.fillRect(0, 56, 240, 48);
      c.fillStyle = "#765c80";
      c.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText("先休息一下 ♡", 120, 76);
      c.font = '9px "Microsoft YaHei", "PingFang SC", sans-serif';
      c.fillText(this.world.suspended ? "收起面板，回到这场小冒险" : "按 P / E 或点「继续挑战」", 120, 94);
    }
    c.restore();
  }
}
