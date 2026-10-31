import { Modal } from "./modal";
import { icon } from "./icons";
import { isCakeCut, type Point } from "./core";
import { chime } from "./sound";

interface Hooks {
  complete: (id: string) => void;
  celebrate: () => void;
}

export class Activities {
  constructor(
    private modal: Modal,
    private hooks: Hooks,
  ) {}

  cake() {
    const body = this.modal.open(
      "第一块蛋糕，给眠眠",
      "许一个软软的愿望，再一起把甜蜜分开。",
      "ANNIVERSARY QUEST · 01",
    );
    body.innerHTML = `<div class="quest-steps"><span class="active">01 吹蜡烛</span><i></i><span>02 切蛋糕</span><i></i><span>03 分享甜蜜</span></div><div class="cake-stage"><canvas width="480" height="300" class="cake-canvas" aria-label="周年蛋糕，吹灭蜡烛后沿中线从上往下划开"></canvas><span class="cake-spark s1">✦</span><span class="cake-spark s2">✧</span></div><p class="game-message" role="status">闭上眼睛，许个愿吧。准备好就长按下面的按钮。</p><div class="blow-meter"><div></div></div><div class="quest-actions"><button class="button primary blow-button">呼—— 长按吹蜡烛</button></div><p class="small-note">按住按钮或聚焦按钮后按住空格 · 不需要麦克风</p>`;
    const canvas = body.querySelector("canvas")!,
      ctx = canvas.getContext("2d")!;
    const message = body.querySelector(".game-message")!;
    const actions = body.querySelector(".quest-actions")!;
    const meter = body.querySelector<HTMLElement>(".blow-meter > div")!;
    let stage: "wish" | "cut" | "serve" | "done" = "wish";
    let holding = false,
      power = 0,
      last = 0,
      frame = 0;
    let cutStart: Point | null = null,
      cutEnd: Point | null = null;
    const setStep = (step: number) =>
      body
        .querySelectorAll(".quest-steps span")
        .forEach((s, i) => s.classList.toggle("active", i <= step));
    const sliced = () => {
      if (stage !== "cut") return;
      stage = "serve";
      setStep(2);
      chime();
      message.textContent = "切好啦！把第一块甜甜的蛋糕，递给今天的主角。";
      actions.innerHTML = `<button class="button primary serve-button">${icon("heart")} 第一块，给眠眠</button>`;
      actions.querySelector("button")!.addEventListener("click", () => {
        stage = "done";
        this.hooks.complete("cake");
        this.hooks.celebrate();
        message.textContent = "一周年快乐，眠眠。以后的晚安，也一起收集吧。";
        actions.innerHTML = `<span class="success-note">${icon("star")} 已收集「一口甜甜」</span><button class="button secondary">再庆祝一次</button>`;
        actions
          .querySelector("button")!
          .addEventListener("click", () => this.cake());
      });
    };
    const extinguish = () => {
      stage = "cut";
      holding = false;
      power = 1;
      chime();
      setStep(1);
      message.textContent = "愿望收到！沿虚线从蛋糕上方向下划，切出第一块。";
      actions.innerHTML =
        '<button class="button secondary">帮我切下一块</button>';
      actions.querySelector("button")!.addEventListener("click", sliced);
      body.querySelector(".small-note")!.textContent =
        "拖动鼠标或手指切蛋糕，也可以点击按钮完成";
    };
    const blow = body.querySelector<HTMLButtonElement>(".blow-button")!;
    blow.addEventListener("pointerdown", (e) => {
      if (stage === "wish") {
        e.preventDefault();
        holding = true;
        blow.setPointerCapture(e.pointerId);
      }
    });
    blow.addEventListener("pointerup", () => (holding = false));
    blow.addEventListener("pointercancel", () => (holding = false));
    blow.addEventListener("lostpointercapture", () => (holding = false));
    blow.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (stage === "wish") holding = true;
      }
    });
    blow.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        holding = false;
      }
    });
    blow.addEventListener("blur", () => (holding = false));
    const stopHolding = () => {
      holding = false;
      cutStart = null;
      cutEnd = null;
    };
    window.addEventListener("blur", stopHolding);
    document.addEventListener("visibilitychange", stopHolding);
    const point = (e: PointerEvent): Point => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
      };
    };
    canvas.addEventListener("pointerdown", (e) => {
      if (stage === "cut") {
        e.preventDefault();
        cutStart = point(e);
        cutEnd = cutStart;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (cutStart && stage === "cut") cutEnd = point(e);
    });
    canvas.addEventListener("pointerup", (e) => {
      if (cutStart && stage === "cut") {
        if (isCakeCut(cutStart, point(e))) sliced();
        else
          message.textContent =
            "差一点点，从虚线上端开始，一直划到蛋糕下方试试。";
      }
      cutStart = null;
      cutEnd = null;
    });
    canvas.addEventListener("pointercancel", () => {
      cutStart = null;
      cutEnd = null;
    });
    const rect = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    const draw = (timestamp: number) => {
      const dt = Math.min((timestamp - (last || timestamp)) / 1000, 0.05);
      last = timestamp;
      if (stage === "wish") {
        power = Math.max(0, Math.min(1, power + dt * (holding ? 0.58 : -0.2)));
        meter.style.width = `${power * 100}%`;
        if (power >= 1) extinguish();
      }
      ctx.clearRect(0, 0, 480, 300);
      const offset = stage === "serve" || stage === "done" ? -28 : 0;
      ctx.save();
      ctx.translate(offset, 0);
      rect(106, 246, 268, 8, "#e9c5d3");
      rect(91, 232, 298, 14, "#f5dce5");
      rect(112, 130, 256, 96, "#b96d8e");
      rect(104, 133, 272, 81, "#d88ba6");
      rect(112, 160, 256, 15, "#f6b6ce");
      rect(112, 183, 256, 15, "#fff3e8");
      rect(112, 209, 256, 16, "#f0a4bc");
      rect(120, 225, 240, 8, "#b96d8e");
      rect(112, 111, 256, 34, "#fff3e8");
      rect(127, 99, 226, 12, "#fff3e8");
      for (let i = 0; i < 9; i++)
        rect(116 + i * 28, 141, 16, i % 2 ? 18 : 11, "#fff3e8");
      for (const [x, y] of [
        [143, 105],
        [185, 100],
        [294, 101],
        [333, 109],
      ]) {
        rect(x, y, 16, 14, "#db6884");
        rect(x + 3, y - 4, 10, 5, "#93b297");
        rect(x + 4, y + 4, 3, 3, "#ffe5c3");
      }
      rect(233, 60, 14, 47, "#eb9dbd");
      rect(226, 68, 7, 7, "#eb9dbd");
      rect(227, 101, 26, 7, "#eb9dbd");
      rect(236, 61, 5, 43, "#ffe9f0");
      if (stage === "wish") {
        const wind = holding ? Math.sin(timestamp / 60) * 4 : 0;
        rect(235 + wind, 37, 10, 19, "#f4bc75");
        rect(239 + wind, 31, 5, 14, "#f7d991");
        rect(238 + wind, 45, 5, 11, "#fff1c0");
        if (holding) {
          rect(300, 52, 45, 3, "#d8c7e8");
          rect(320, 63, 48, 3, "#d8c7e8");
          rect(302, 75, 28, 3, "#d8c7e8");
        }
      } else if (stage === "cut") {
        for (let y = 88; y < 251; y += 12) rect(239, y, 3, 6, "#ae6588");
        if (cutStart && cutEnd) {
          ctx.strokeStyle = "#855273";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cutStart.x * 480, cutStart.y * 300);
          ctx.lineTo(cutEnd.x * 480, cutEnd.y * 300);
          ctx.stroke();
        }
      } else {
        rect(236, 109, 10, 117, "#ae6588");
        rect(365, 190, 65, 49, "#d88ba6");
        rect(365, 206, 65, 8, "#fff3e8");
        ctx.fillStyle = "#fff3e8";
        ctx.beginPath();
        ctx.moveTo(365, 190);
        ctx.lineTo(430, 190);
        ctx.lineTo(395, 156);
        ctx.closePath();
        ctx.fill();
        rect(392, 161, 12, 10, "#db6884");
        rect(360, 240, 78, 7, "#e9c5d3");
      }
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    this.modal.onCleanup(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", stopHolding);
      document.removeEventListener("visibilitychange", stopHolding);
    });
  }

  gifts() {
    const body = this.modal.open(
      "拆开一份小欢喜",
      "翻开礼物，找出四对藏在包装纸里的心意。",
      "ANNIVERSARY QUEST · 02",
    );
    body.innerHTML = `<div class="memory-heading"><span>找到 <strong id="pair-count">0</strong> / 4 对</span><span id="turn-count">翻牌 0 次</span></div><div class="memory-grid"></div><p class="game-message" role="status">每份礼物都有一个好朋友，帮它们找到彼此吧。</p><div class="quest-actions"><button class="button secondary">重新洗牌</button></div>`;
    const values = [0, 0, 1, 1, 2, 2, 3, 3];
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    const names = ["星星", "月亮", "蛋糕", "爱心"];
    const icons = ["star", "moon", "cake", "heart"];
    const grid = body.querySelector(".memory-grid")!;
    const cards = values.map((value, index) => {
      const b = document.createElement("button");
      b.className = "memory-card";
      b.setAttribute("aria-label", `翻开第 ${index + 1} 份礼物`);
      b.innerHTML = `<span class="card-back">${icon("gift")}</span><span class="card-front">${icon(icons[value])}<small>${names[value]}</small></span>`;
      grid.append(b);
      return b;
    });
    let first: number | null = null,
      locked = false,
      matches = 0,
      turns = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    cards.forEach((card, index) =>
      card.addEventListener("click", () => {
        if (locked || card.disabled || first === index) return;
        card.classList.add("flipped");
        card.setAttribute("aria-label", names[values[index]]);
        chime();
        if (first === null) {
          first = index;
          return;
        }
        turns++;
        body.querySelector("#turn-count")!.textContent = `翻牌 ${turns} 次`;
        const previous = first;
        first = null;
        if (values[previous] === values[index]) {
          cards[previous].classList.add("matched");
          card.classList.add("matched");
          cards[previous].disabled = true;
          card.disabled = true;
          matches++;
          body.querySelector("#pair-count")!.textContent = String(matches);
          if (matches === 4) {
            body.querySelector(".game-message")!.textContent =
              "每一份心意都有了归处。收下这份属于你的周年小幸运！";
            this.hooks.complete("gifts");
            this.hooks.celebrate();
          }
        } else {
          locked = true;
          timer = setTimeout(() => {
            for (const i of [previous, index]) {
              cards[i].classList.remove("flipped");
              cards[i].setAttribute("aria-label", `翻开第 ${i + 1} 份礼物`);
            }
            locked = false;
          }, 850);
        }
      }),
    );
    body
      .querySelector(".quest-actions button")!
      .addEventListener("click", () => this.gifts());
    this.modal.onCleanup(() => clearTimeout(timer));
  }

  balloons() {
    const body = this.modal.open(
      "让心愿，轻轻起飞",
      "给三只小气球充满快乐，再把它们送上夜空。",
      "ANNIVERSARY QUEST · 03",
    );
    body.innerHTML = `<div class="balloon-sky"><span class="sky-cloud cloud-one"></span><span class="sky-cloud cloud-two"></span>${["粉色", "紫色", "蓝色"].map((name, i) => `<button class="balloon-pump balloon-${i}" data-balloon="${i}" aria-label="给${name}气球充气"><span class="balloon-shape">${icon(["heart", "star", "moon"][i])}</span><span class="balloon-string"></span><span class="pump-label">点我充气 · 0/4</span></button>`).join("")}</div><p class="game-message" role="status">一下一下，把小小的心愿装满。</p><div class="quest-actions"><button class="button primary release-balloons" disabled>等气球准备好</button></div>`;
    const counts = [0, 0, 0];
    let released = false;
    const release = body.querySelector<HTMLButtonElement>(".release-balloons")!;
    body
      .querySelectorAll<HTMLButtonElement>(".balloon-pump")
      .forEach((button, i) =>
        button.addEventListener("click", () => {
          if (counts[i] >= 4 || released) return;
          counts[i]++;
          chime();
          button.style.setProperty(
            "--inflation",
            String(0.45 + counts[i] * 0.1375),
          );
          button.querySelector(".pump-label")!.textContent =
            counts[i] === 4 ? "心愿装满啦 ✓" : `点我充气 · ${counts[i]}/4`;
          if (counts[i] === 4) {
            button.classList.add("ready");
            button.setAttribute("aria-label", "气球已充满");
          }
          if (counts.every((n) => n === 4)) {
            release.disabled = false;
            release.textContent = "一起放飞心愿";
            body.querySelector(".game-message")!.textContent =
              "三份快乐准备好了。一起放飞吧！";
          }
        }),
      );
    release.addEventListener("click", () => {
      if (released) {
        this.balloons();
        return;
      }
      released = true;
      body.querySelector(".balloon-sky")!.classList.add("released");
      body.querySelector(".game-message")!.textContent =
        "愿眠眠的每一天，都像气球一样轻盈。";
      release.textContent = "再放飞一次";
      this.hooks.complete("balloons");
      this.hooks.celebrate();
    });
  }

  fireworks() {
    const body = this.modal.open(
      "今晚，星星为你亮起",
      "点一下夜空，把这一年的喜欢变成烟花。",
      "ANNIVERSARY QUEST · 04",
    );
    body.innerHTML = `<div class="firework-stage"><canvas width="600" height="340" class="firework-canvas" aria-label="烟花夜空，点击任意位置放烟花"></canvas><span class="firework-caption">一周年快乐 · 芙眠眠</span></div><p class="game-message" role="status">点亮三朵烟花，收集今晚的最后一份小心愿。</p><div class="quest-actions"><button class="button primary">${icon("star")} 为眠眠放烟花</button><span class="burst-count">0 / 3 朵</span></div>`;
    const canvas = body.querySelector("canvas")!,
      c = canvas.getContext("2d")!;
    const colors = ["#f7abc8", "#e6c7ff", "#f8d792", "#a6e0ed", "#fff4d9"];
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }
    let particles: Particle[] = [],
      bursts = 0,
      done = false,
      frame = 0,
      last = 0;
    const burst = (x: number, y: number) => {
      const color = colors[bursts % colors.length];
      bursts++;
      chime();
      for (let i = 0; i < 58; i++) {
        const a = (Math.PI * 2 * i) / 58,
          speed = 35 + Math.random() * 80;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1.1 + Math.random() * 0.7,
          color,
        });
      }
      body.querySelector(".burst-count")!.textContent =
        `${Math.min(bursts, 3)} / 3 朵`;
      if (bursts >= 3 && !done) {
        done = true;
        this.hooks.complete("fireworks");
        body.querySelector(".game-message")!.textContent =
          "愿接下来的每一个夜晚，都有温柔的光。还可以继续放烟花哦。";
      }
    };
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      burst(
        ((e.clientX - r.left) / r.width) * 600,
        Math.min(270, ((e.clientY - r.top) / r.height) * 340),
      );
    });
    body
      .querySelector(".quest-actions button")!
      .addEventListener("click", () =>
        burst(130 + Math.random() * 340, 65 + Math.random() * 140),
      );
    const draw = (time: number) => {
      const dt = Math.min((time - (last || time)) / 1000, 0.05);
      last = time;
      c.fillStyle = "#30263f";
      c.fillRect(0, 0, 600, 340);
      for (let i = 0; i < 45; i++) {
        c.fillStyle = i % 3 === 0 ? "#f8d792" : "#c7b0d4";
        c.fillRect((i * 137) % 600, (i * 73) % 264, 2, 2);
      }
      c.fillStyle = "#f8dfb9";
      c.fillRect(482, 35, 25, 25);
      c.fillStyle = "#30263f";
      c.fillRect(474, 29, 23, 23);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? "#51405b" : "#47354f";
        c.fillRect(i * 53, 295 - (i % 3) * 12, 49, 60);
        c.fillStyle = "#d09aaf";
        c.fillRect(i * 53 + 15, 305 - (i % 3) * 12, 6, 7);
      }
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 48 * dt;
        p.life -= dt;
        c.globalAlpha = Math.min(1, p.life * 1.4);
        c.fillStyle = p.color;
        c.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
      }
      c.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    this.modal.onCleanup(() => cancelAnimationFrame(frame));
  }

  danmaku() {
    const body = this.modal.open(
      "让喜欢，飘过夜空",
      "选一句祝福，发射一条只属于此刻的周年弹幕。",
      "BILIBILI INSPIRED · FAN CELEBRATION",
    );
    const phrases = [
      "芙眠眠，一周年快乐！",
      "今晚也要做个好梦 ♡",
      "下一个晚安，也一起！",
      "把温柔装满小电视",
      "干杯！庆祝每一次相遇",
    ];
    body.innerHTML = `<div class="danmaku-tv"><div class="tv-antenna"></div><div class="danmaku-screen"><div class="screen-heart">${icon("heart")}</div><span class="screen-note">SEND A LITTLE LOVE</span></div><div class="tv-feet"></div></div><div class="phrase-buttons">${phrases.map((p, i) => `<button class="button secondary" data-phrase="${i}">${p}</button>`).join("")}</div><p class="small-note">游戏内的预设祝福 · 仅在当前画面展示</p>`;
    const screen = body.querySelector(".danmaku-screen")!;
    body
      .querySelectorAll<HTMLButtonElement>("[data-phrase]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          const span = document.createElement("span");
          span.className = "flying-danmaku";
          span.textContent = phrases[Number(button.dataset.phrase)];
          span.style.top = `${10 + Math.random() * 65}%`;
          span.style.color = ["#ffe7ad", "#ffbbd6", "#bfe6fa"][
            Math.floor(Math.random() * 3)
          ];
          screen.append(span);
          span.addEventListener("animationend", () => span.remove());
          chime();
        }),
      );
  }
}
