import type { World } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { rainbowIds } from "../src/rainbow-flowers";
import { INVENTORY_KEY, readInventory, starterItems } from "../src/items";
import { TOWN_TALKED_KEY } from "../src/town";
import { arriveOnShift } from "./resident-visits";
import { moonPlate } from "../src/ruins-map";

/** Exercise overlapping actions and late save notifications in the isolated QA tab. */
export async function verifyNavigationRaces(world: World, log: (text: string) => void) {
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const expect = (value: unknown, message: string) => { if (!value) throw Error(message); };
  const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const wait = async (check: () => boolean) => {
    const end = performance.now() + 15000;
    while (!check()) {
      if (performance.now() > end) throw Error("导航没有结束");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  const prepare = world.prepareScene.bind(world);
  q(".reset-button").click();
  q(".reset-confirm").click();
  await Promise.all([prepare("town"), prepare("garden"), prepare("ruins")]);
  for (const [first, last, surface] of [
    ["letters", "album", ".photo-book"],
    ["album", "letters", ".mail-stack"],
  ] as const) {
    world.switchScene("room");
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    world.prepareScene = async scene => { await prepare(scene); if (scene === "town") await pending; };
    try {
      q(".debug-trigger").click();
      q<HTMLDetailsElement>('[data-debug="game:blocks"]').closest("details")!.open = true;
      q('[data-debug="game:blocks"]').click();
      expect(world.paused, "调试定位未进入转场");
      q(`[data-memory="${first}"]`).click();
      q(`[data-memory="${last}"]`).click();
      release();
      const reader = q(".game-letter-reader");
      await wait(() => world.scene === "room" && !reader.hidden && !!reader.querySelector(surface));
      await frames();
      expect(world.paused && reader.contains(document.activeElement), "切图后没有保留阅读暂停和焦点");
      expect(q(".arcade-hud").hidden, "过期的调试请求在阅读时打开了小游戏");
      reader.querySelector<HTMLButtonElement>(".reader-close")!.click();
      expect(!world.suspended && !world.paused, "阅读结束后未恢复探索");
      log(`慢切图期间先后点两张首页卡片，按最后一次选择在小屋打开${last === "letters" ? "信箱" : "相册"}。`);
    } finally { release(); world.prepareScene = prepare; }
  }

  // Last explicit navigation wins, including a queued request after load failure.
  for (const fail of [false, true]) {
    world.prepareScene = async scene => {
      if (fail && scene === "garden") throw Error("Deliberately failed map loading");
      await prepare(scene);
    };
    try {
      for (const scene of ["garden", "town", "ruins", "town", "ruins"])
        q(`.scene-nav [data-scene="${scene}"]`).click();
      await wait(() => world.scene === "ruins" && !world.paused);
      expect(!world.suspended && !q(".scene-transition").classList.contains("active"), "连续导航留下了转场或暂停锁");
      log(`${fail ? "首张地图加载失败后" : "正常加载时"}连续切换五次：最后到达遗迹，未残留转场或暂停。`);
    } finally { world.prepareScene = prepare; }
  }
  const remote = readProgress(localStorage.getItem(SAVE_KEY));
  remote.rainbowFlowers = rainbowIds.slice(0, -1);
  remote.arcadeBests.flight = 16;
  remote.gardenTape = "carried";
  localStorage.setItem(SAVE_KEY, JSON.stringify(remote));
  q(".music-toggle").click();
  expect(readProgress(localStorage.getItem(SAVE_KEY)).arcadeBests.flight === 16, "更改设置覆盖了另一标签页的飞行纪录");
  expect(q(".prism-count").textContent === "6 / 7", "保存时合并了花朵，却没有更新花谱");
  const screeningHint = () => q(".cinema-shortcut small").textContent ?? "";
  expect(screeningHint().includes("已拿到录像带"), "保存时合并了另一页的持带状态，首页仍然提示寻带");
  remote.rainbowFlowers = [...rainbowIds];
  remote.gardenTape = "inserted";
  const notify = (key: string, value: unknown) => {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    window.dispatchEvent(new StorageEvent("storage", {key, newValue: raw}));
  };
  remote.astrolabe = {found: ["vine", "star", "brass"], installed: true, turns: [1, 2, 3], mirrors: ["/", "\\"]};
  notify(SAVE_KEY, remote);
  expect(screeningHint().includes("已放入放映机"), "收到插带存档通知时没有立即更新首页");
  remote.astrolabe.turns[1] = 3;
  remote.volume = .25;
  localStorage.setItem(SAVE_KEY, JSON.stringify(remote));
  q(".music-toggle").click();
  const afterToggle = readProgress(localStorage.getItem(SAVE_KEY));
  expect(afterToggle.astrolabe.turns[1] === 3 && afterToggle.volume === .25, "开关音乐覆盖了另一个窗口刚转过的星盘或音量");
  expect(q<HTMLOutputElement>(".volume-value").value === "25%", "两窗口的音量显示不同步");
  world.switchScene("ruins", moonPlate.approach);
  world.onInteract(moonPlate.id);
  remote.astrolabe.turns[2] = 0;
  localStorage.setItem(SAVE_KEY, JSON.stringify(remote));
  const innerRing = [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")]
    .find(button => button.textContent?.includes("转内环"));
  expect(innerRing, "星盘未显示转环选项");
  innerRing!.click();
  expect(readProgress(localStorage.getItem(SAVE_KEY)).astrolabe.turns.join() === "2,3,0", "本窗口转内环时覆盖了另一窗口刚转过的外环");
  q(".activity-close").click();
  log("另一窗口的音量与星盘角度，在当前窗口切换音乐和拨动另一枚环时仍保留");
  notify(SAVE_KEY, remote);
  expect(q(".prism-count").textContent === "7 / 7" && !q('[data-scene="meadow"]').hidden, "另一标签页集齐七色花后导航没有开放");
  log("设置保存与跨标签通知都保留个人最高分，并即时更新花谱和花海入口");
  localStorage.setItem(INVENTORY_KEY, JSON.stringify({owned: ["moonBag"], bouquet: true, equipped: {backpack: "moonBag"}}));
  world.switchScene("garden");
  world.switchScene("garden", world.config.spots.find(spot => spot.id === "wreath")!.approach);
  world.interact();
  const bag = readInventory(localStorage.getItem(INVENTORY_KEY));
  expect(bag.owned.includes("wreath") && bag.owned.includes("moonBag") && bag.bouquet && bag.equipped.backpack === "moonBag",
    "捡起花环覆盖了另一标签页的纪念品或穿搭");
  q(".activity-close").click();
  localStorage.setItem(TOWN_TALKED_KEY, JSON.stringify(["post"]));
  await arriveOnShift(world, "town", "npc-welcome");
  world.interact();
  const talked = JSON.parse(localStorage.getItem(TOWN_TALKED_KEY)!);
  expect(talked.includes("post") && talked.includes("welcome"), "结识迎宾员时覆盖了另一标签页的居民记录");
  q(".activity-close").click();
  notify(INVENTORY_KEY, {owned: ["headphones"], equipped: {head: "headphones"}});
  const synced = readInventory(localStorage.getItem(INVENTORY_KEY));
  expect(synced.owned.includes("wreath") && synced.owned.includes("headphones") && synced.bouquet && synced.equipped.head === "headphones",
    "同时写入的两份背包未保留双方的收藏和最新穿搭");
  notify(TOWN_TALKED_KEY, ["cat"]);
  const visitors = JSON.parse(localStorage.getItem(TOWN_TALKED_KEY)!);
  expect(["post", "welcome", "cat"].every(id => visitors.includes(id)), "同时写入的居民记录没有合并");
  q(".reset-button").click();
  q(".reset-confirm").click();
  await wait(() => world.scene === "room" && q(".reset-confirmation").hidden);
  expect(readInventory(localStorage.getItem(INVENTORY_KEY)).owned.join() === starterItems.join() && JSON.parse(localStorage.getItem(TOWN_TALKED_KEY)!).length === 0 &&
    q('[data-scene="meadow"]').hidden, "清档后恢复了上次冒险的收藏");
  log("两份背包和居民会面记录合并后不丢收藏，重新探索不会复活旧记录");
  expect(screeningHint().includes("小叶子"), "清档后首页未恢复寻带线索");
  q(".reset-button").click();
  q(".reset-confirm").click();
  expect(readInventory(localStorage.getItem(INVENTORY_KEY)).owned.join() === starterItems.join() &&
    !JSON.parse(localStorage.getItem(TOWN_TALKED_KEY)!).length, "重新探索时合并回了旧收藏");
  log("两页的装备、花束与会面记录没有互相覆盖，主动清档仍能从零开始");
}
