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
import { GardenLife, Companion } from "./garden-life";
import { ARCADES } from "./town-data";
import { reservedShortcut } from "./input";
import type { GameId } from "./arcade-engines";
import { Nature } from "./nature";
import { FlowerTrail } from "./flower-trail";
import { NightMeadow } from "./night-meadow";
import { JOURNEY_KEY, readJourney, type Journey } from "./journey";
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
  let journey: Journey | null = null;
  try { journey = readJourney(localStorage.getItem(JOURNEY_KEY), progress.rainbowFlowers); } catch { /* optional storage */ }
  let worldReady = false, resetInProgress = false, lastPositionCheck = 0;
  // The guide stays clickable during the brief gate fade. Honor its latest
  // destination as soon as the current crossing has finished.
  let afterCrossing: (() => void) | undefined;
  const world = new World(document.querySelector("#world")!);
  const reader = new MapReader(world);
  const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
  const saveNow = document.querySelector<HTMLButtonElement>(".save-now")!;
  const saveStatus = document.querySelector<HTMLElement>(".save-status")!;
  const showJourney = () => {
    if (!journey) { saveStatus.textContent = "开始冒险后自动保存"; saveStatus.removeAttribute("title"); return; }
    const date = new Date(journey.savedAt);
    const when = date.toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"});
    saveStatus.textContent = `本机已保存 · ${scenes[journey.scene].title} ${when}`;
    saveStatus.title = date.toLocaleString("zh-CN");
  };
  const saveLocation = (manual = false) => {
    if (!started || !worldReady || resetInProgress || world.busy) return;
    const {x,y} = world.restState?.exit ?? world.player;
    if (!manual && journey?.scene === world.scene && journey.x === x && journey.y === y) return;
    const next = {scene: world.scene, x, y, savedAt: Date.now()};
    try {
      localStorage.setItem(JOURNEY_KEY, JSON.stringify(next));
      journey = next;
      showJourney();
    } catch { saveStatus.textContent = "浏览器未能保存本次进度"; }
  };
  showJourney();
  window.addEventListener("pagehide", () => saveLocation());
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveLocation(); });
  saveNow.addEventListener("click", () => { saveLocation(true); world.canvas.focus({preventScroll:true}); });
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
  const help = document.querySelector<HTMLElement>(".inline-help")!;
  const setHelp = (open: boolean) => {
    help.hidden = !open;
    world.suspend("help", open);
    document.querySelector(".help-button")!.setAttribute("aria-expanded", String(open));
    if (open) {
      help.scrollIntoView({ behavior: "smooth", block: "nearest" });
      help.querySelector<HTMLButtonElement>(".help-close")!.focus({ preventScroll: true });
    }
  };
  const closePanels = () => {
    inventory.close(false);
    if (!help.hidden) setHelp(false);
  };
  const returnFromHelp = () => {
    setHelp(false);
    if (world.suspended) return;
    world.canvas.focus({ preventScroll: true });
    world.canvas.parentElement!.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  help.querySelector(".help-close")!.addEventListener("click", returnFromHelp);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !help.hidden && !e.defaultPrevented && !reservedShortcut(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      returnFromHelp();
    }
  }, { capture: true });
  const activities = new Activities(world, {
    complete,
    toast,
    reward: (id) => inventory.grant(id),
  });
  inventory.onEquip = () => activities.finishEquipmentChoice();
  const nature = new Nature(world, activities, toast, inventory);
  const arcade = new Arcade(world, activities, inventory, (id, score) => {
    const best = progress.arcadeBests[id] ?? 0;
    if (score <= best) return best;
    progress.arcadeBests[id] = score;
    save();
    return score;
  });
  const town = new Town(world, activities, inventory, arcade);
  const gardenLife = new GardenLife(world, activities, inventory);
  new Companion(world);
  const flowerTrail = new FlowerTrail(world, () => progress.rainbowFlowers, save, toast);
  const meadow = new NightMeadow(world, () => progress.creditStars, save);
  const cinema = new GardenCinema(world, toast);
  const bedNote = new BedNote(world);
  const previousTick = world.onTick;
  world.onTick = (dt, t) => {
    previousTick(dt, t);
    bedNote.refresh(progress.bedNoteUnlocked);
    if (t - lastPositionCheck > 2) {
      lastPositionCheck = t;
      saveLocation();
    }
  };
  function dismissRevive() {
    bedNote.close();
  }
  function transition(scene: SceneId, entrance?: string) {
    if (world.busy || !started) return;
    if (!world.canEnter(scene)) { toast("还需要集齐七种彩虹花。"); return; }
    if (transitioning) {
      afterCrossing = () => {
        if (world.scene !== scene || entrance) transition(scene, entrance);
      };
      return;
    }
    closePanels();
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
    void Promise.all([new Promise<void>(done => setTimeout(done,180)),world.prepareScene(scene)]).then(() => {
      const arrival = scenes[scene].spots.find(
        (s) => s.id === entrance,
      )?.approach;
      world.switchScene(scene, arrival);
      world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(() => {
      toast("花径还没准备好，请稍后再穿一次花门。");
    }).finally(() => {
      overlay.classList.remove("active");
      world.paused = false;
      transitioning = false;
      const next = afterCrossing;
      afterCrossing = undefined;
      next?.();
    });
  }
  world.onToast = toast;
  world.onStep = () => {
    sfx("step");
    dismissRevive();
  };
  world.onRestChange = (state) => {
    if (state) saveLocation();
    const tools = document.querySelector<HTMLElement>(".rest-tools")!;
    tools.hidden = !state;
    if (state)
      tools.querySelector("span")!.textContent =
        state.kind === "lying" ? "在小屋的床上休息" : state.scene === "meadow" ? "在营火边歇脚" : "坐在长椅上";
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
    closePanels();
    cinema.close();
    arcade.close();
    activities.close();
    reader.close();
    sfx("revive");
    const first = !progress.bedNoteUnlocked;
    if (first) {
      progress.bedNoteUnlocked = true;
      save();
    }
    const entry = !first && encouragements.length ? encouragements[encouragementIndex++ % encouragements.length] : undefined;
    bedNote.open(entry?.message);
    world.canvas.focus({ preventScroll: true });
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
    saveLocation();
    if (scene !== "meadow") meadow.leave();
    nature.refreshClock();
    document.querySelector("#location-name")!.textContent =
      `${({room:"ROOM 01",garden:"GARDEN 02",challenge:"GARDEN 03",town:"TOWN 04",meadow:"SECRET 05"})[scene]} · ${scenes[scene].title}`;
    document.querySelector(".map-switch")!.innerHTML =
      `${scene === "room" || scene === "meadow" ? "周年花园" : scene === "garden" ? "勇气花园" : scene === "challenge" ? "周年小镇" : "晚安小屋"} ${icon("arrow")}`;
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
    const spot = world.config.spots.find((s) => s.id === id);
    if (!spot || !world.available(spot)) return;
    inventory.close(false);
    cinema.close();
    if (spot?.portal) {
      transition(spot.portal, spot.portalExit);
      return;
    }
    reader.close();
    dismissRevive();
    document.querySelector<HTMLElement>(".nearby-prompt")!.hidden = true;
    if (flowerTrail.interact(id) || meadow.interact(id)) return;
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
    if (gardenLife.interact(id)) return;
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
      reader.inGame = id === "letters";
      openCollection(reader, id);
    }
  };
  function begin() {
    if (!worldReady || enter.disabled || started) return;
    started = true;
    saveNow.disabled = false;
    saveLocation();
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
    .then(async () => {
      const resume = journey;
      if (resume) {
        try {
          await world.prepareScene(resume.scene);
          if (journey === resume) world.switchScene(resume.scene, resume);
        } catch {
          if (journey === resume) {
            world.switchScene("garden");
            toast("花海暂未载入，先回庭院歇一会儿。");
          }
        }
      }
      // Switching a scene dismisses activities and normally resumes walking.
      // A restored adventure must still wait for the player's Continue gesture.
      world.paused = !started;
      worldReady = true;
      enter.disabled = false;
      enter.innerHTML = `${journey ? "继续上次的冒险" : "开始小冒险"} ${icon("arrow")}`;
      if (journey) document.querySelector(".intro-screen small")!.textContent =
        `本机存档 · ${scenes[world.scene].title} · 点击继续`;
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
    if (help.hidden) setHelp(true);
    else returnFromHelp();
  });
  document.querySelector(".map-switch")!.addEventListener("click", () => {
    begin();
    transition(
      world.scene === "room" || world.scene === "meadow"
        ? "garden"
        : world.scene === "garden"
          ? "challenge"
          : world.scene === "challenge"
            ? "town"
            : "room",
      world.scene === "meadow" ? "prism-arch" : undefined,
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
    if (world.busy || !world.canEnter(scene)) return;
    if (transitioning) {
      afterCrossing = () => visit(scene, id);
      return;
    }
    closePanels();
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
      button.addEventListener("click", () => {
        if (button.dataset.memory === "letters") {
          closePanels();
          cinema.close();
          arcade.close();
          activities.close();
          world.paused = !started;
          reader.inGame = false;
          openCollection(reader, "letters");
        } else visit("room", button.dataset.memory!);
      }),
    );
  reader.onChangeView = () => {
    if (reader.inGame) {
      reader.inGame = false;
      openCollection(reader, "letters");
    } else visit("room", "letters");
  };
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
    if (world.busy || transitioning) {
      toast("正在回到安全的位置，请稍等一下再重新开始。");
      return;
    }
    closePanels();
    resetInProgress = true;
    journey = null;
    try { localStorage.removeItem(JOURNEY_KEY); } catch { /* optional storage */ }
    progress = {
      ...progress,
      visited: [],
      completed: [],
      bedNoteUnlocked: false,
      rainbowFlowers: [],
      creditStars: [],
      arcadeBests: {},
    };
    cinema.reset();
    activities.reset();
    nature.reset();
    inventory.reset();
    flowerTrail.refresh();
    town.reset();
    arcade.close();
    reader.close();
    save();
    update();
    world.switchScene("room");
    resetInProgress = false;
    if (started) saveLocation(true);
    else {
      showJourney();
      enter.innerHTML = `开始小冒险 ${icon("arrow")}`;
      document.querySelector(".intro-screen small")!.textContent = "点击开始会播放轻柔音乐 · 可随时关闭 ♡";
    }
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
