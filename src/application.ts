import { anniversary, encouragements } from "./content";
import { EVENT_IDS, GAME_IDS, SAVE_KEY, readProgress } from "./core";
import { icon } from "./icons";
import { World, scenes, type SceneId } from "./world";
import { Activities } from "./activities";
import { BedNote } from "./bed-note";
import { MapReader } from "./reader";
import { Inventory } from "./inventory";
import { Arcade } from "./arcade";
import { Town } from "./town";
import { GardenCinema } from "./cinema";
import { ARCADES } from "./town-data";
import type { GameId } from "./arcade-engines";
import { Nature } from "./nature";
import { openCollection } from "./media";
import {
  chime,
  setSound,
  setMusic,
  setVolume,
  setMusicScene,
  unlockAudio,
  sfx,
} from "./sound";

interface Task {
  id: string;
  title: string;
  scene: string;
}
export function mountGame(tasks: Task[]) {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(SAVE_KEY);
  } catch {
    /* optional local progress */
  }
  let progress = readProgress(saved),
    started = false,
    transitioning = false;
  const world = new World(document.querySelector("#world")!);
  const reader = new MapReader(world);
  const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
  const toastElement = document.querySelector<HTMLElement>(".toast")!;
  document.querySelector(".scene-wrap")!.append(toastElement);
  let toastTimeout: ReturnType<typeof setTimeout>;
  const toast = (text: string) => {
    toastElement.textContent = text;
    toastElement.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(
      () => toastElement.classList.remove("visible"),
      3800,
    );
  };
  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      /* playable without storage */
    }
  };
  function audio() {
    setSound(progress.sound);
    setMusic(progress.bgm);
    setVolume(progress.volume);
  }
  function update() {
    world.visited = progress.visited;
    document.querySelector("#explored")!.textContent = String(
      progress.visited.length,
    );
    document.querySelector(".exploration-count")!.lastChild!.textContent =
      `/${EVENT_IDS.length} 个角落`;
    document.querySelector("#completed")!.textContent =
      `${progress.completed.length} / ${GAME_IDS.length}`;
    document.querySelector<HTMLElement>(".progress-track span")!.style.width =
      `${(progress.completed.length / GAME_IDS.length) * 100}%`;
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
      progress.completed.length === GAME_IDS.length
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
    const music = document.querySelector<HTMLButtonElement>(".music-toggle")!;
    music.setAttribute(
      "aria-label",
      progress.bgm ? "关闭背景音乐" : "开启背景音乐",
    );
    music.setAttribute("aria-pressed", String(progress.bgm));
    music.classList.toggle("muted", !progress.bgm);
    document.querySelector(".volume-value")!.textContent =
      `${Math.round(progress.volume * 100)}%`;
    document.querySelector<HTMLButtonElement>(".volume-down")!.disabled =
      progress.volume <= 0;
    document.querySelector<HTMLButtonElement>(".volume-up")!.disabled =
      progress.volume >= 1;
    audio();
  }
  function complete(id: string) {
    if (!progress.completed.includes(id)) {
      progress.completed.push(id);
      save();
      update();
      chime(true);
    }
  }
  const inventory = new Inventory(world, toast);
  const activities = new Activities(world, { complete, toast });
  const nature = new Nature(world, activities, toast, inventory);
  const arcade = new Arcade(world, activities, inventory);
  const town = new Town(world, activities, inventory, arcade);
  const cinema = new GardenCinema(world, toast, () => activities.danmaku());
  const bedNote = new BedNote(world);
  const previousTick = world.onTick;
  world.onTick = (dt, t) => {
    previousTick(dt, t);
    bedNote.refresh(progress.bedNoteUnlocked);
  };
  function dismissRevive() {
    bedNote.close();
  }
  function transition(scene: SceneId, entrance?: string) {
    if (world.busy || transitioning || !started) return;
    cinema.close();
    arcade.close();
    activities.close();
    reader.close();
    dismissRevive();
    transitioning = true;
    const overlay = document.querySelector(".scene-transition")!;
    overlay.classList.add("active");
    world.paused = true;
    world.clearInput();
    sfx("portal");
    setTimeout(() => {
      const arrival = scenes[scene].spots.find(
        (s) => s.id === entrance,
      )?.approach;
      world.switchScene(scene, arrival);
      world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
      overlay.classList.remove("active");
      world.paused = false;
      transitioning = false;
    }, 180);
  }
  world.onToast = toast;
  world.onStep = () => {
    sfx("step");
    dismissRevive();
  };
  world.onRestChange = (state) => {
    const tools = document.querySelector<HTMLElement>(".rest-tools")!;
    tools.hidden = !state;
    if (state)
      tools.querySelector("span")!.textContent =
        state.kind === "lying" ? "在小屋的床上休息" : "坐在长椅上";
    else {
      bedNote.close();
      activities.close();
    }
    bedNote.refresh(progress.bedNoteUnlocked);
  };
  document
    .querySelector(".stand-up")!
    .addEventListener("click", () => world.standUp());
  let encouragementIndex = 0;
  world.onRespawn = ({ trap }) => {
    cinema.close();
    arcade.close();
    activities.close();
    reader.close();
    sfx("revive");
    if (!progress.bedNoteUnlocked) {
      progress.bedNoteUnlocked = true;
      save();
      bedNote.open();
    } else {
      const entry = encouragements.length
        ? encouragements[encouragementIndex++ % encouragements.length]
        : undefined;
      if (entry) activities.note(entry.message);
      else toast("已经回到小屋的床，休息好再出发吧。");
    }
    world.canvas.setAttribute(
      "aria-description",
      `在「${trap.title}」旁遇到小挫折，已回到小屋的床上休息。`,
    );
    world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  world.onNearby = (spot) => {
    const prompt = document.querySelector<HTMLElement>(".nearby-prompt")!;
    prompt.hidden = !spot || activities.active || cinema.active;
    if (spot) prompt.querySelector("span")!.textContent = spot.title;
  };
  world.onScene = (scene) => {
    document.querySelector("#location-name")!.textContent =
      `${scene === "room" ? "ROOM 01" : scene === "garden" ? "GARDEN 02" : scene === "challenge" ? "GARDEN 03" : "TOWN 04"} · ${scenes[scene].title}`;
    document.querySelector(".map-switch")!.innerHTML =
      `${scene === "room" ? "周年花园" : scene === "garden" ? "勇气花园" : scene === "challenge" ? "周年小镇" : "晚安小屋"} ${icon("arrow")}`;
    document
      .querySelectorAll<HTMLButtonElement>("[data-scene]")
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.scene === scene),
        );
      });
    setMusicScene(scene);
    bedNote.refresh(progress.bedNoteUnlocked);
  };
  world.onInteract = (id) => {
    cinema.close();
    const spot = world.config.spots.find((s) => s.id === id);
    if (spot?.portal) {
      transition(spot.portal, spot.portalExit);
      return;
    }
    reader.close();
    dismissRevive();
    document.querySelector<HTMLElement>(".nearby-prompt")!.hidden = true;
    if (id === "bed") {
      activities.close();
      world.lieDown();
      activities.menu("在自己的小床上躺好啦 · 休息好了再出发", [
        { title: "起床继续冒险", run: () => world.standUp() },
        ...(progress.bedNoteUnlocked
          ? [
              {
                title: "看看小叶子的便签",
                run: () => {
                  activities.close();
                  bedNote.open();
                },
              },
            ]
          : []),
      ]);
      return;
    }
    if (town.interact(id)) return;
    if (nature.interact(id)) return;
    if (EVENT_IDS.includes(id) && !progress.visited.includes(id)) {
      progress.visited.push(id);
      save();
      update();
    }
    document.querySelector<HTMLElement>(".nearby-prompt")!.hidden = true;
    sfx("interact");
    if (id === "cake") activities.cake();
    else if (id === "gifts") activities.gifts();
    else if (id === "balloons") activities.balloons();
    else if (id === "fireworks") activities.fireworks();
    else if (id === "danmaku") {
      activities.close();
      cinema.open();
    } else if (id === "courage") {
      complete("courage");
      activities.note(
        "走过小挫折，摘到了勇气之花 · 愿芙芙一路有光，向阳生长 ♡",
      );
    } else if (id === "bili")
      activities.menu("小电视打卡成功 · 芙芙，直播一周年快乐！", [
        {
          title: "看花园周年放映",
          run: () => {
            activities.close();
            world.visit("danmaku");
          },
        },
        {
          title: "去 B 站见芙芙",
          run: () =>
            activities.note("下一个晚安，也一起 ♡", anniversary.bilibili),
        },
      ]);
    else {
      activities.close();
      openCollection(reader, id);
    }
  };
  function begin() {
    if (enter.disabled || started) return;
    started = true;
    document.querySelector(".intro-screen")!.classList.add("dismissed");
    world.paused = false;
    audio();
    try {
      unlockAudio();
      chime(true);
    } catch {
      toast("声音暂未能开启，仍可继续小冒险。");
    }
    world.canvas.focus({ preventScroll: true });
  }
  enter.addEventListener("click", begin);
  world
    .load()
    .then(() => {
      enter.disabled = false;
      enter.innerHTML = `开始小冒险 ${icon("arrow")}`;
    })
    .catch(() => {
      enter.disabled = false;
      enter.textContent = "图片加载失败，点击刷新";
      enter.addEventListener("click", () => location.reload(), { once: true });
    });
  for (const [selector, key] of [
    [".sound-toggle", "sound"],
    [".music-toggle", "bgm"],
  ] as const)
    document.querySelector(selector)!.addEventListener("click", () => {
      progress[key] = !progress[key];
      update();
      save();
      try {
        unlockAudio();
        chime();
      } catch {
        toast("当前浏览器暂时无法播放声音。");
      }
    });
  for (const [selector, delta] of [
    [".volume-down", -0.1],
    [".volume-up", 0.1],
  ] as const)
    document.querySelector(selector)!.addEventListener("click", () => {
      progress.volume = Math.max(
        0,
        Math.min(1, Math.round((progress.volume + delta) * 100) / 100),
      );
      update();
      save();
    });
  document.querySelector(".help-button")!.addEventListener("click", () => {
    const help = document.querySelector<HTMLElement>(".inline-help")!;
    help.hidden = !help.hidden;
  });
  document.querySelector(".map-switch")!.addEventListener("click", () => {
    begin();
    transition(
      world.scene === "room"
        ? "garden"
        : world.scene === "garden"
          ? "challenge"
          : world.scene === "challenge"
            ? "town"
            : "room",
    );
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-scene]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        begin();
        transition(button.dataset.scene as SceneId);
      }),
    );
  document.querySelector(".garden-link")!.addEventListener("click", () => {
    begin();
    transition("garden");
    world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  const visit = (scene: SceneId, id: string) => {
    if (world.busy || transitioning) return;
    begin();
    if (!started) return;
    cinema.close();
    arcade.close();
    activities.close();
    reader.close();
    dismissRevive();
    if (world.scene !== scene) world.switchScene(scene);
    world.visit(id);
    world.canvas.focus({ preventScroll: true });
    world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document
    .querySelectorAll<HTMLButtonElement>("[data-task]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const task = tasks.find((t) => t.id === button.dataset.task)!;
        visit(task.scene as SceneId, task.id);
      }),
    );
  document.querySelectorAll<HTMLButtonElement>("[data-arcade]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.arcade as GameId;
      if (ARCADES[id]) visit("town", "arcade-" + id);
    }),
  );
  document
    .querySelector(".cinema-shortcut")!
    .addEventListener("click", () => visit("garden", "danmaku"));
  document
    .querySelectorAll<HTMLButtonElement>("[data-town-npc]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        visit("town", "npc-" + b.dataset.townNpc),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-memory]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        visit("room", button.dataset.memory!),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-direction]")
    .forEach((button) => {
      const [x, y] = button.dataset.direction!.split(",").map(Number);
      button.addEventListener("pointerdown", (e) => {
        if (!started) return;
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
    document.querySelector<HTMLElement>(".reset-confirmation")!.hidden = false;
  });
  document.querySelector(".reset-cancel")!.addEventListener("click", () => {
    document.querySelector<HTMLElement>(".reset-confirmation")!.hidden = true;
  });
  document.querySelector(".reset-confirm")!.addEventListener("click", () => {
    progress = {
      ...progress,
      visited: [],
      completed: [],
      bedNoteUnlocked: false,
    };
    cinema.reset();
    activities.reset();
    nature.reset();
    inventory.reset();
    town.reset();
    arcade.close();
    reader.close();
    save();
    update();
    world.switchScene("room");
    world.paused = !started;
    document.querySelector<HTMLElement>(".reset-confirmation")!.hidden = true;
    toast("新的一场小冒险开始啦。");
  });
  update();
  world.onScene("room");
  for (const id of GAME_IDS)
    if (!Object.values(scenes).some((s) => s.spots.some((p) => p.id === id)))
      throw new Error(`Missing activity: ${id}`);
}
