import "./style.css";
import { anniversary, collections } from "./content";
import { GAME_IDS, SAVE_KEY, readProgress } from "./core";
import { icon } from "./icons";
import { Modal } from "./modal";
import { World, scenes, type SceneId } from "./world";
import { Activities } from "./activities";
import { openCollection } from "./media";
import { chime, setSound } from "./sound";
import spriteUrl from "./assets/nemu-sprites.webp";

let saved: string | null = null;
try {
  saved = localStorage.getItem(SAVE_KEY);
} catch {
  /* A private browser can still play without persistence. */
}
let progress = readProgress(saved);
let started = false;
const tasks = [
  {
    id: "cake",
    title: "分一口甜甜",
    subtitle: "吹蜡烛 · 切蛋糕",
    icon: "cake",
    scene: "room",
  },
  {
    id: "gifts",
    title: "拆一份心意",
    subtitle: "找到礼物的好朋友",
    icon: "gift",
    scene: "room",
  },
  {
    id: "balloons",
    title: "放飞小心愿",
    subtitle: "让气球装满快乐",
    icon: "balloon",
    scene: "garden",
  },
  {
    id: "fireworks",
    title: "点亮这片夜空",
    subtitle: "送眠眠三朵烟花",
    icon: "star",
    scene: "garden",
  },
];
const memories = [
  { id: "letters", icon: "mail", empty: "待寄达", unit: "封来信" },
  { id: "album", icon: "book", empty: "待收集", unit: "张回忆" },
  { id: "radio", icon: "sound", empty: "待开播", unit: "段录音" },
  { id: "tv", icon: "tv", empty: "待放映", unit: "段视频" },
];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="芙眠眠一周年首页"><span class="brand-mark">${icon("heart")}</span><span>眠眠的晚安小世界<small>NEMU’S LITTLE WORLD</small></span></a>
      <div class="header-right"><span class="anniversary-tag">${icon("star")} 1st Anniversary</span><a class="bili-link" href="${anniversary.bilibili}" target="_blank" rel="noopener noreferrer">${icon("tv")} 去见眠眠 <span>↗</span></a></div>
    </header>
    <main>
      <section class="page-intro">
        <div><p class="eyebrow">A LITTLE ADVENTURE, A WHOLE YEAR OF GOOD NIGHTS</p><h1>把一整年的晚安，<span>变成一场小冒险。</span></h1><p class="intro-copy">欢迎来到芙眠眠的周年小世界。慢慢走，快乐藏在每个小角落。</p></div>
        <div class="date-stamp"><span>和眠眠一起</span><strong>ONE LOVELY YEAR</strong><small>${anniversary.start} — ${anniversary.end}</small><i>${icon("heart")}</i></div>
      </section>
      <div class="adventure-layout">
        <section class="game-window" aria-label="眠眠的像素小世界">
          <div class="window-bar"><div class="window-dots"><i></i><i></i><i></i></div><span>nemu’s little world / 周年特别篇</span><div class="window-tools"><button class="icon-button sound-toggle" aria-label="开启游戏音效" title="游戏音效">${icon("mute")}</button><button class="icon-button help-button" aria-label="查看操作说明" title="操作说明">?</button></div></div>
          <div class="scene-wrap">
            <canvas id="world" tabindex="0" aria-label="像素探索场景。使用 WASD 或方向键移动，E 或空格互动；也可点击地面行走，点击发光标记互动。">浏览器需要支持 Canvas 才能游玩。</canvas>
            <div class="scene-top"><span class="location-pill">${icon("moon")} <span id="location-name">ROOM 01 · 晚安小屋</span></span><button class="map-switch" title="切换到另一个场景">周年花园 ${icon("arrow")}</button></div>
            <div class="nearby-prompt" hidden><span></span><kbd>E</kbd><span class="prompt-verb">互动</span></div>
            <div class="intro-screen"><div class="intro-stars">✧ <span>✦</span> ✧</div><span class="intro-pill">芙眠眠 · 直播一周年纪念</span><h2>今晚的快乐，<br>等你来发现。</h2><p>一间温暖小屋，一座星光花园。<br>还有藏在角落里的，一点点喜欢。</p><button class="button primary enter-button" disabled>正在点亮小世界…</button><small>没有倒计时，慢慢探索就好 ♡</small></div>
            <div class="scene-transition" aria-hidden="true"></div>
          </div>
          <div class="game-bottom"><div class="desktop-instructions"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>E</kbd> 互动</span><i></i><span>也可以点地面走动、点标记探索</span></div><span class="exploration-count">${icon("star")} <span id="explored">0</span>/10 个角落</span></div>
          <div class="touch-controls"><div class="dpad" aria-label="移动方向键"><button data-direction="0,-1" class="dpad-up" aria-label="向上移动">↑</button><button data-direction="-1,0" class="dpad-left" aria-label="向左移动">←</button><span>${icon("heart")}</span><button data-direction="1,0" class="dpad-right" aria-label="向右移动">→</button><button data-direction="0,1" class="dpad-down" aria-label="向下移动">↓</button></div><div class="touch-hint">走近发光的小物件<br><span>或者直接点标记</span></div><button class="touch-interact">${icon("star")}<span>互动</span></button></div>
        </section>
        <aside class="journal" aria-label="庆典手账">
          <div class="journal-heading"><span class="eyebrow">TONIGHT’S LITTLE WISHES</span><h2>今晚的小心愿 ${icon("heart")}</h2><p>做一点小事，收集一点快乐。</p></div>
          <div class="task-list">${tasks.map((task, i) => `<button class="task" data-task="${task.id}"><span class="task-icon task-color-${i}">${icon(task.icon)}</span><span class="task-label"><strong>${task.title}</strong><small>${task.subtitle}</small></span><span class="task-check" aria-hidden="true"></span></button>`).join("")}</div>
          <div class="journal-progress"><div><span>庆典心愿</span><strong id="completed">0 / 4</strong></div><div class="progress-track"><span></span></div><p id="progress-note">第一份快乐，会藏在哪里呢？</p></div>
          <div class="journal-divider"><span>✧</span></div>
          <div class="memory-heading-small"><h3>留一格，给回忆</h3><span>慢慢收集，慢慢珍藏</span></div>
          <div class="memory-shortcuts">${memories.map((memory) => `<button data-memory="${memory.id}">${icon(memory.icon)}<span>${collections[memory.id].title}</span><small>${collections[memory.id].items.length ? `${collections[memory.id].items.length} ${memory.unit}` : memory.empty}</small></button>`).join("")}</div>
          <div class="journal-note">${icon("moon")}<p>今晚不用着急。<br>每一份晚安，都值得被珍惜。</p></div>
        </aside>
      </div>
      <section class="world-note"><span>${icon("tv")} 小电视也来庆祝啦</span><p>穿过小屋的门，到花园发一条弹幕、放飞一只气球，<br class="desktop-break">再为这场相遇，点亮一片小小的星空。</p><button class="text-button garden-link">去花园看看 ${icon("arrow")}</button></section>
    </main>
    <footer><span>MADE WITH ${icon("heart")} FOR 芙眠眠</span><p>粉丝制作的一周年纪念礼物 · 愿下一个晚安，依然有你。</p><button class="text-button reset-button">重新探索</button></footer>
  </div><div class="toast" role="status" aria-live="polite"></div><div class="confetti-layer" aria-hidden="true"></div>`;

const modal = new Modal();
const world = new World(document.querySelector("#world")!);
let toastTimeout: ReturnType<typeof setTimeout>;
function toast(text: string) {
  const element = document.querySelector(".toast")!;
  element.textContent = text;
  element.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove("visible"), 3200);
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    /* Saving is optional. */
  }
}
function updateProgress() {
  world.visited = progress.visited;
  document.querySelector("#explored")!.textContent = String(
    progress.visited.length,
  );
  document.querySelector("#completed")!.textContent =
    `${progress.completed.length} / 4`;
  document.querySelector<HTMLElement>(".progress-track span")!.style.width =
    `${(progress.completed.length / 4) * 100}%`;
  for (const task of tasks) {
    const button = document.querySelector<HTMLButtonElement>(
      `[data-task="${task.id}"]`,
    )!;
    const done = progress.completed.includes(task.id);
    button.classList.toggle("done", done);
    button.setAttribute(
      "aria-label",
      `${task.title}${done ? "，已完成，可以重玩" : "，前往探索"}`,
    );
  }
  document.querySelector("#progress-note")!.textContent =
    progress.completed.length === 4
      ? "心愿集齐啦！愿往后的每一天都甜甜的。"
      : progress.completed.length
        ? "快乐正在一点点装满。继续去冒险吧。"
        : "第一份快乐，会藏在哪里呢？";
  const sound = document.querySelector<HTMLButtonElement>(".sound-toggle")!;
  sound.innerHTML = icon(progress.sound ? "sound" : "mute");
  sound.setAttribute(
    "aria-label",
    progress.sound ? "关闭游戏音效" : "开启游戏音效",
  );
  sound.setAttribute("aria-pressed", String(progress.sound));
}
function celebrate() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.querySelector(".confetti-layer")!;
  for (let i = 0; i < 32; i++) {
    const bit = document.createElement("i");
    bit.style.cssText = `--x:${Math.random() * 100}vw;--delay:${Math.random() * 0.35}s;--rotation:${Math.random() * 360}deg;background:${["#e98daf", "#c5b5e1", "#e7c179", "#9bcdd3"][i % 4]}`;
    layer.append(bit);
    bit.addEventListener("animationend", () => bit.remove());
  }
}
const activities = new Activities(modal, {
  complete(id) {
    if (!progress.completed.includes(id)) {
      progress.completed.push(id);
      save();
      updateProgress();
      chime(true);
    }
  },
  celebrate,
});
modal.onChange = (open) => {
  world.paused = open || !started;
  world.clearInput();
};
world.onToast = toast;
world.onNearby = (spot) => {
  const prompt = document.querySelector<HTMLElement>(".nearby-prompt")!;
  prompt.hidden = !spot;
  if (spot) prompt.querySelector("span")!.textContent = spot.title;
};
world.onScene = (scene) => {
  document.querySelector("#location-name")!.textContent =
    scene === "room" ? "ROOM 01 · 晚安小屋" : "GARDEN 02 · 周年花园";
  document.querySelector(".map-switch")!.innerHTML =
    `${scene === "room" ? "周年花园" : "晚安小屋"} ${icon("arrow")}`;
};
function transition(scene: SceneId) {
  const overlay = document.querySelector(".scene-transition")!;
  overlay.classList.add("active");
  world.paused = true;
  world.clearInput();
  setTimeout(() => {
    world.switchScene(scene);
    overlay.classList.remove("active");
    world.paused = modal.isOpen || !started;
  }, 200);
}
function interact(id: string) {
  if (id === "door") {
    transition(world.scene === "room" ? "garden" : "room");
    return;
  }
  if (!progress.visited.includes(id)) {
    progress.visited.push(id);
    save();
    updateProgress();
  }
  chime();
  if (id === "cake") activities.cake();
  else if (id === "gifts") activities.gifts();
  else if (id === "balloons") activities.balloons();
  else if (id === "fireworks") activities.fireworks();
  else if (id === "danmaku") activities.danmaku();
  else if (id === "bili") {
    const body = modal.open(
      "叮！抵达小电视打卡站",
      "从一个晚安开始，走到属于眠眠的一周年。",
      "BILIBILI INSPIRED · FAN CELEBRATION",
    );
    body.innerHTML = `<div class="bili-postcard"><span class="postcard-stamp">${icon("tv")}</span><div class="portrait-sprite" style="background-image:url('${spriteUrl}')"></div><span class="postcard-date">${anniversary.start} — ${anniversary.end}</span><h3>这里，有你的一份晚安。</h3><p>芙眠眠，直播一周年快乐！</p></div><div class="quest-actions"><a class="button primary" href="${anniversary.bilibili}" target="_blank" rel="noopener noreferrer">${icon("tv")} 去 B 站见眠眠 ↗</a></div><p class="small-note">粉丝制作的纪念小站，与哔哩哔哩官方无关</p>`;
  } else openCollection(modal, id);
}
world.onInteract = interact;
const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
function begin() {
  if (enter.disabled) return;
  started = true;
  document.querySelector(".intro-screen")!.classList.add("dismissed");
  world.paused = false;
  if (progress.sound) {
    try {
      setSound(true);
    } catch {
      progress.sound = false;
      updateProgress();
    }
  }
  world.canvas.focus({ preventScroll: true });
  chime(true);
}
enter.addEventListener("click", begin);
world
  .load()
  .then(() => {
    enter.disabled = false;
    enter.innerHTML = `开始小冒险 ${icon("arrow")}`;
  })
  .catch((error) => {
    enter.textContent = "加载失败，点击刷新";
    enter.disabled = false;
    enter.addEventListener("click", () => location.reload(), { once: true });
    toast(String(error));
  });

document.querySelector(".sound-toggle")!.addEventListener("click", () => {
  try {
    setSound(!progress.sound);
    progress.sound = !progress.sound;
    chime();
    save();
    updateProgress();
  } catch {
    toast("当前浏览器暂时无法播放音效，仍可继续探索。");
  }
});
function help() {
  const body = modal.open(
    "慢慢走，快乐就在附近",
    "这是一个没有时间限制的小冒险。",
    "HOW TO PLAY",
  );
  body.innerHTML = `<div class="help-grid"><div><span>${icon("heart")}</span><h3>成为小小的眠眠</h3><p>电脑用 WASD 或方向键移动，手机用下方方向键。也可以直接点地面，让眠眠走过去。</p></div><div><span>${icon("star")}</span><h3>找到发光的角落</h3><p>靠近物件后按 E、空格或手机的互动键。直接点发光标记，也会自动走过去探索。</p></div><div><span>${icon("cake")}</span><h3>庆祝，不需要素材</h3><p>吹蜡烛、切蛋糕、礼物配对、气球和烟花都能直接玩。完成后会点亮右侧手账。</p></div><div><span>${icon("tv")}</span><h3>去花园逛一逛</h3><p>走到小屋下方的门口，或点场景右上角切换。花园有弹幕屏、小电视，还有一片夜空。</p></div></div><p class="help-footnote">探索记录只保存在这个浏览器。留言、录音、图片和视频的位置已预留，后续会慢慢加入。</p>`;
}
document.querySelector(".help-button")!.addEventListener("click", help);
document.querySelector(".map-switch")!.addEventListener("click", () => {
  if (!started) begin();
  transition(world.scene === "room" ? "garden" : "room");
});
document.querySelector(".garden-link")!.addEventListener("click", () => {
  if (!started) begin();
  transition("garden");
  world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelectorAll<HTMLButtonElement>("[data-task]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!started) begin();
    if (!started) return;
    const task = tasks.find((task) => task.id === button.dataset.task)!;
    const scene = task.scene as SceneId;
    if (scene !== world.scene) world.switchScene(scene);
    world.visit(task.id);
    world.canvas.focus({ preventScroll: true });
  }),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-memory]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      if (!started) begin();
      if (!started) return;
      if (world.scene !== "room") world.switchScene("room");
      world.visit(button.dataset.memory!);
    }),
  );
document
  .querySelectorAll<HTMLButtonElement>("[data-direction]")
  .forEach((button) => {
    const [x, y] = button.dataset.direction!.split(",").map(Number);
    button.addEventListener("pointerdown", (e) => {
      if (!started || modal.isOpen) return;
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      button.classList.add("pressed");
      world.setTouch(x, y);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(event, () => {
        button.classList.remove("pressed");
        world.setTouch(0, 0);
      });
  });
document
  .querySelector(".touch-interact")!
  .addEventListener("click", () => world.interact());
document.querySelector(".reset-button")!.addEventListener("click", () => {
  const body = modal.open(
    "重新打开这份礼物？",
    "会清除当前浏览器的探索和心愿记录，所有小游戏都可以重新开始。",
    "A FRESH LITTLE ADVENTURE",
  );
  body.innerHTML = `<div class="quest-actions"><button class="button secondary keep-progress">继续这次冒险</button><button class="button primary reset-confirm">重新探索</button></div>`;
  body
    .querySelector(".keep-progress")!
    .addEventListener("click", () => modal.close());
  body.querySelector(".reset-confirm")!.addEventListener("click", () => {
    progress = { visited: [], completed: [], sound: progress.sound };
    save();
    updateProgress();
    world.switchScene("room");
    modal.close();
    toast("新的小冒险开始啦。");
  });
});
document.addEventListener("visibilitychange", () => {
  world.clearInput();
});
updateProgress();
// Keep the discoverable scene definitions imported at compile time so content and world stay in sync.
for (const id of GAME_IDS)
  if (
    !Object.values(scenes).some((scene) =>
      scene.spots.some((spot) => spot.id === id),
    )
  )
    throw new Error(`Missing activity: ${id}`);
