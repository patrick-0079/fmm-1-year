import { World } from "../src/world";
import { Activities } from "../src/activities";
import { Inventory } from "../src/inventory";
import { Arcade } from "../src/arcade";
import type { MinesGame } from "../src/arcade-bonus";
import { whenWardrobeReady } from "../src/item-art";
import type { Engine, BlocksGame, HopGame } from "../src/arcade-engines";
import { ARCADES } from "../src/town-data";
import type { GameId } from "../src/arcade-engines";
import { ITEMS, INVENTORY_KEY, type ItemId } from "../src/items";
import { GardenLife } from "../src/garden-life";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const world = new World(canvas);
const saves = new Map<string, string>();
const inventory = new Inventory(world, () => {}, {
  getItem: (id) => saves.get(id) ?? null,
  setItem: (id, value) => { saves.set(id, value); },
}, true);
const activities = new Activities(world, { complete() {}, toast() {} });
inventory.onEquip = () => activities.finishEquipmentChoice();
const arcade = new Arcade(world, activities, inventory);
const gardenMemory = {decoratorMet:false,rabbitIntroduced:false};
const guests = new GardenLife(world, activities, inventory, () => gardenMemory, () => {});
world.scene = "town";
const engine = () => (arcade as unknown as { engine: Engine }).engine;
const status = () => document.querySelector(".arcade-status")?.textContent ?? "";
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const bag = document.querySelector<HTMLElement>(".inventory-panel")!;
function bagButton(selector: string) {
  const button = bag.querySelector<HTMLButtonElement>(selector);
  if (!button || button.disabled) throw new Error("背包里没有可操作的按钮 " + selector);
  return button;
}
const selectItem = (id: ItemId) => bagButton(`[data-select="${id}"]`).click();
const confirmItem = (id: ItemId) => bagButton(`[data-equip="${id}"]`).click();
const key = (key: string, init: KeyboardEventInit = {}, target: Element = canvas) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};
let passed = 0, failed = 0;
async function check(name: string, run: () => void | Promise<void>) {
  const li = document.createElement("li");
  try {
    inventory.close(false);
    arcade.close();
    activities.close();
    await run();
    li.className = "pass";
    li.textContent = `通过 · ${name}`;
    passed++;
  } catch (error) {
    li.className = "fail";
    li.textContent = `失败 · ${name} · ${String(error)}`;
    failed++;
  }
  document.querySelector("#results")!.append(li);
}

await check("默认试穿全部饰品，关闭后恢复真实搭配，试玩时领取的奖励可以存档", () => {
  const switchMode = () => inventory.setFitting(!inventory.fitting);
  inventory.open();
  assert(bag.querySelectorAll("[data-select]:not(.is-locked)").length === Object.keys(ITEMS).length, "默认可试穿的数量有误");
  const before = saves.get(INVENTORY_KEY);
  selectItem("starShoes");
  assert(!world.equipment.shoes && saves.get(INVENTORY_KEY) === before, "挑选配饰就更改了地图或存档");
  key("b", {}, bagButton(".bag-close"));
  key("b", {repeat:true});
  assert(bag.hidden, "按住 B 重复展开衣橱");
  key("b");
  assert(!bag.querySelector("[data-equip]") && !world.equipment.shoes, "收起后残留了未确认的试穿");
  selectItem("starShoes"); confirmItem("starShoes");
  assert(world.equipment.shoes === "starShoes" && !inventory.has("starShoes"), "试穿篡改了收集进度");
  inventory.grant("anniversaryPin");
  switchMode();
  assert(!world.equipment.shoes && bag.querySelectorAll("[data-select]:not(.is-locked)").length === 1, "关闭试穿后未还原");
  selectItem("starShoes");
  assert(bag.querySelector("[data-equip=starShoes]:disabled") && bag.textContent?.includes(ITEMS.starShoes.source), "缺少未收集配饰的来源说明");
  selectItem("anniversaryPin"); confirmItem("anniversaryPin");
  switchMode(); selectItem("petCat"); confirmItem("petCat");
  const saved = JSON.parse(saves.get(INVENTORY_KEY)!);
  assert(saved.owned.length === 1 && saved.equipped.body === "anniversaryPin" && !saved.equipped.pet, "试穿装备写入了正式存档");
  switchMode();
  assert(world.equipment.body === "anniversaryPin" && !world.equipment.pet, "原搭配丢失");
  inventory.reset();
});

await check("打开背包暂停小游戏与方向键；Esc 只收起背包，之后继续原局", () => {
  arcade.open("snake");
  world.onAction(true);
  inventory.open();
  assert(bag.contains(document.activeElement) && !bag.closest("[inert]"), "焦点未进入可操作的背包");
  key("ArrowDown");
  for (let i = 0; i < 40; i++) world.onTick(0.1, i / 10);
  assert(engine().status === "playing" && engine().score === 0, "背包期间游戏仍在运行");
  key("Escape");
  assert(arcade.active && !world.suspended, "Esc 关闭了底下的游戏或没有恢复");
  for (let i = 0; i < 80; i++) world.onTick(0.1, i / 10);
  assert(engine().status === "lost", "收起背包后原局没有继续运行");
});

await check("从放大的星盘互动开包换装，结束互动后衣橱仍开着且地图恢复探索", () => {
  activities.menu("残缺的星盘留着三圈凹槽。", [], {x: 350, y: 280}, 1.55);
  inventory.grant("wreath", false);
  inventory.open();
  assert(world.suspended && world.paused && canvas.inert, "检查星盘时开包未暂存原互动");
  selectItem("wreath"); confirmItem("wreath");
  assert(!activities.active && !world.paused, "确认换装没有结束星盘互动");
  assert(!bag.hidden && !world.suspended && !canvas.inert, "互动结束后背包仍把地图锁定");
  assert(!document.querySelector<HTMLElement>(".touch-controls")?.inert, "手机方向键仍被锁定");
});

await check("试穿的猫仍需正式领取，邀请会保存真实伙伴位，拒绝不会覆盖原有兔子", () => {
  inventory.reset(); inventory.setFitting(true);
  inventory.setCompanion("petBunny",true);
  inventory.toggle("petCat");
  assert(world.equipment.pet==="petCat" && !inventory.has("petCat"),"试穿不应颁发桃桃");
  world.switchScene("garden",{x:304,y:318});
  const select=(title:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent===title)!.click();
  const talk=()=>guests.interact("garden-guest-balloon-friend");
  talk();select("轻轻抚摸奶油猫");select("不带上奶油猫");activities.close();
  assert(inventory.followingPet==="petBunny" && !inventory.has("petCat"),"拒绝覆盖了真实搭配");
  talk();select("轻轻抚摸奶油猫");select("带上奶油猫");
  const stored=JSON.parse(saves.get(INVENTORY_KEY)!);
  assert(stored.equipped.pet==="petCat" && stored.owned.includes("petBunny"),"邀请没有进入真实存档");
  inventory.setFitting(false);
  assert(world.equipment.pet==="petCat","关闭试穿后没有继续同行");
  activities.close();inventory.reset();
});

await check("查看说明时背包入口、B 和 NPC 不会在锁定的地图里打开衣橱", () => {
  world.paused = false;
  world.suspend("help", true);
  inventory.collectBouquet();
  document.querySelector<HTMLButtonElement>(".bag-toggle")!.click();
  key("b"); inventory.openWardrobe(); inventory.openBouquet();
  assert(bag.hidden && world.suspended && !world.paused, "说明打开时衣橱抢占了地图或提前解除暂停");
  world.suspend("help", false);
  inventory.openBouquet();
  assert(!world.suspended && !bag.hidden && bag.querySelector(".bouquet-detail"), "说明收起后无法打开真正收集的花束");
});

await check("全屏和全窗口放映时不在播放器背后开包，返回地图后可正常换装", () => {
  const player = document.createElement("section");
  player.className = "cinema-player";
  document.body.append(player);
  world.paused = true;
  canvas.parentElement!.classList.add("cinema-active");
  try {
    assert(!key("b").defaultPrevented, "全屏播放器的按键被背包抢占");
    inventory.open(); inventory.openBouquet();
    assert(bag.hidden && !world.suspended && !canvas.inert, "在播放器背后开包并冻结了播放");
    player.hidden = true;
    key("b");
    assert(!bag.hidden && world.suspended, "返回地图内观看后无法整理背包");
    key("Escape");
    assert(bag.hidden && !world.suspended && world.paused, "关包后没有恢复原来的影院模式");
  } finally {
    inventory.close(false);
    canvas.parentElement!.classList.remove("cinema-active");
    player.remove();
    world.paused = false;
  }
});

await check("礼盒不配对后立刻打开别的互动，旧计时不会改写新按钮", () => {
  activities.gifts();
  const cards = (activities as unknown as { cards: number[] }).cards;
  const different = cards.findIndex((value) => value !== cards[0]);
  document.querySelector<HTMLButtonElement>(".activity-actions button")!.click();
  document.querySelectorAll<HTMLButtonElement>(".activity-actions button")[different].click();
  activities.menu("新的周年对话", [{ title: "继续看花", run() {} }]);
  world.onTick(1, 1);
  assert(document.querySelector(".activity-actions")!.textContent === "继续看花", "旧礼盒计时覆盖了新对话");
});

await check("Ctrl / Alt / Meta 组合键不触发背包、游戏或数字翻牌", () => {
  activities.gifts();
  const before = document.querySelector(".activity-actions")!.textContent;
  for (const modifier of ["ctrlKey", "altKey", "metaKey"])
    for (const value of ["b", "w", "1", " "])
      assert(!key(value, { [modifier]: true }).defaultPrevented, `${modifier}+${value} 被拦截`);
  assert(!world.suspended, "浏览器快捷键打开了背包");
  assert(document.querySelector(".activity-actions")!.textContent === before, "组合键触发了翻牌");
});

await check("阅读区域保留空格和方向键滚动", () => {
  world.paused = false;
  const reader = document.querySelector(".reader-body")!;
  for (const value of [" ", "ArrowDown", "ArrowUp"])
    assert(!key(value, {}, reader).defaultPrevented, `${value} 被世界移动截获`);
});

await check("扫雷右键只标记指针下的砖，触屏插旗与鼠标翻开相互独立", () => {
  const previousScene = world.scene, previousAction = world.onAction;
  let primaryReleases = 0;
  try {
    world.scene = "ruins";
    arcade.open("mines");
    const game = engine() as MinesGame;
    const pos = {x:325, y:204}; // Centre of column 4, row 3 on the viewport board.
    const origin = world.project({x:0, y:0}), zoom = world.project({x:1, y:0}).x - origin.x;
    const point = {x:(pos.x-origin.x)/zoom, y:(pos.y-origin.y)/zoom}, rect = canvas.getBoundingClientRect();
    const mouse = {button:2, pointerType:"mouse", bubbles:true, cancelable:true,
      clientX:rect.left+rect.width*pos.x/600, clientY:rect.top+rect.height*pos.y/400};
    world.onAction = pressed => {
      if (!pressed) primaryReleases++;
      return previousAction(pressed);
    };
    const rightClick = () => {
      canvas.dispatchEvent(new PointerEvent("pointerdown", mouse));
      canvas.dispatchEvent(new PointerEvent("pointerup", mouse));
    };
    rightClick();
    assert(game.flags.has(15) && game.mines.size === 0 && game.score === 0, "右键翻开了砖或标记了旧光标");
    key("f");
    assert(game.flags.has(15) && primaryReleases === 0, "F 或右键松开触发了别的操作");
    game.flagMode = true;
    world.onPointer("down",point,"mouse");
    assert(game.flags.has(15) && game.score === 0, "鼠标左键改变了旗子");
    key("p"); rightClick();
    assert(game.flags.has(15) && status().includes("暂停"), "暂停时右键恢复游戏或改动了棋盘");
    key("p");
    world.onPointer("down",point,"touch");
    assert(!game.flags.has(15) && game.score === 0, "触屏插旗模式没有拔旗");
    world.onPointer("down",point,"mouse");
    assert(game.revealed.has(15) && game.count(15) === 0, "第一次左键翻砖没有保护邻格");
  } finally {
    world.onAction = previousAction;
    arcade.close();
    world.scene = previousScene;
  }
});

await check("吹蜡烛按钮也保留输入法组合键", () => {
  activities.cake();
  const button = document.querySelector<HTMLButtonElement>(".activity-actions button")!;
  assert(!key(" ", { ctrlKey: true }, button).defaultPrevented, "吹蜡烛按钮拦截了 Ctrl+空格");
  assert(!(activities as unknown as { blowing: boolean }).blowing, "输入法快捷键开始了吹蜡烛");
});

await check("窗口失焦后方块暂停；继续时不会残留按住的加速键", () => {
  arcade.open("blocks");
  world.onAction(true);
  key("ArrowDown");
  window.dispatchEvent(new Event("blur"));
  world.onTick(1, 1);
  assert(status().includes("暂停"), "失焦未暂停");
  const blocks = engine() as BlocksGame;
  assert(blocks.y === 0, "失焦后仍落下");
  key("p");
  world.onTick(0.1, 1.1);
  assert(blocks.y === 0 && !status().includes("暂停"), "恢复后仍加速落下");
});

await check("蓄力手势取消或按钮失焦不会起跳；正常鼠标、右键和 E 松开仍能跳", () => {
  const capture = canvas.setPointerCapture;
  // Synthetic pointers are not registered with the browser's native capture
  // system; keep the real event handlers and stub only that native boundary.
  canvas.setPointerCapture = () => {};
  try {
    for (const mode of ["touch-cancel", "canvas-lostcapture", "button-cancel", "button-lostcapture", "button-blur",
      "right-cancel", "right-lostcapture", "mouse-up", "button-up", "right-up", "key-up"] as const) {
      arcade.open("hop");
      world.onAction(true); world.onAction(false);
      const game = engine() as HopGame;
      const button = document.querySelector<HTMLButtonElement>(".game-primary")!;
      if (mode.startsWith("right"))
        canvas.dispatchEvent(new PointerEvent("pointerdown", {button:2, pointerType:"mouse", bubbles:true, cancelable:true}));
      else if (mode.startsWith("button")) key(" ", {}, button);
      else key("e");
      game.update(0.7);
      assert(game.charging && game.charge > 0, mode + " 未开始蓄力");
      if (mode === "button-blur") button.dispatchEvent(new FocusEvent("blur"));
      else if (mode === "button-cancel") button.dispatchEvent(new PointerEvent("pointercancel"));
      else if (mode === "button-lostcapture") button.dispatchEvent(new PointerEvent("lostpointercapture"));
      else if (mode === "button-up") button.dispatchEvent(new PointerEvent("pointerup"));
      else if (mode === "key-up") canvas.dispatchEvent(new KeyboardEvent("keyup", {key:"e", bubbles:true}));
      else canvas.dispatchEvent(new PointerEvent(mode.includes("lostcapture") ? "lostpointercapture" : mode.endsWith("up") ? "pointerup" : "pointercancel",
        {button:mode.startsWith("right") ? 2 : 0, pointerType:mode.startsWith("touch") ? "touch" : "mouse", bubbles:true}));
      const released = mode.endsWith("up");
      assert(game.grounded !== released && !game.charging && game.charge === 0,
        mode + (released ? " 正常松开没有起跳" : " 取消被误当成松手起跳"));
      // Capture loss commonly follows pointerup. A late release after a
      // cancelled gesture must neither launch nor repeat the completed jump.
      const velocity = game.vx;
      canvas.dispatchEvent(new PointerEvent("lostpointercapture"));
      world.onAction(false);
      assert(game.grounded !== released && game.vx === velocity, mode + " 后续事件重复触发跳跃");
    }
  } finally { canvas.setPointerCapture = capture; }
});

await check("衣橱图集就绪会通知背包重绘", () => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("衣橱图集未就绪")), 10_000);
  whenWardrobeReady(() => { clearTimeout(timer); resolve(); });
}));

await check("小游戏提示按钮更新后保留键盘焦点，不在下一帧再次移除", () => {
  arcade.open("mines");
  world.onAction(true);
  document.querySelectorAll<HTMLButtonElement>(".arcade-extra-actions button")[1].click();
  world.onTick(0.1, 1);
  assert(document.activeElement?.textContent?.includes("安全提示 · 剩余 2"), "提示后的下一帧丢失焦点");
});

await check("奶油猫与垂耳兔佩戴后七种小游戏可启动、暂停、收起背包和返回地图", () => {
  for (const pet of ["petCat", "petBunny"] as const) {
    world.equipment.pet = pet;
    for (const id of Object.keys(ARCADES) as GameId[]) {
      arcade.open(id);
      world.onAction(true);
      world.onTick(0.02, 1);
      assert(engine().status === "playing", `${pet} ${id} 没有正常启动`);
      inventory.open();
      world.onTick(0.5, 2);
      key("Escape");
      assert(arcade.active && !world.suspended, `${pet} ${id} 背包暂停没有恢复`);
      world.onTick(0.02, 3);
      const layer = world.getDepthLayers().at(-1);
      layer?.draw(canvas.getContext("2d")!);
      assert(engine().status === "playing", `${pet} ${id} 佩戴后停止运行`);
      arcade.close();
      assert(!world.paused, `${pet} ${id} 离开摊位后不能移动`);
    }
  }
});

const frames = (count: number) => new Promise<void>((resolve) => {
  const next = () => --count > 0 ? requestAnimationFrame(next) : resolve();
  requestAnimationFrame(next);
});
const equipFromBag = (id: ItemId, close = true) => {
  inventory.open();
  selectItem(id);
  const wearing = world.equipment[ITEMS[id].slot] === id;
  const action = bagButton(`[data-equip="${id}"]`);
  const verb = ITEMS[id].slot === "pet" ? (wearing ? "休息" : "同行") : (wearing ? "脱下" : "佩戴");
  assert(action.textContent?.trim() === verb, id + " 的操作名称有误");
  action.focus(); action.click();
  assert(!bag.hidden && !!bag.querySelector(`[data-select="${id}"].is-worn`) !== wearing, id + " 确认后面板或装备标记有误");
  if (close) {
    key("Escape");
    assert(!world.suspended && document.activeElement === canvas, id + " 收起后焦点未返回游戏");
  }
};
await check("背包保持打开，可连续穿脱全部配饰并用 WASD 移动；收起后能立即点地行走", async () => {
  await world.load();
  try {
    world.switchScene("room"); world.paused = false;
    inventory.grant("berryBag");
    inventory.open();
    const picture = () => bag.querySelector<HTMLCanvasElement>(".bag-avatar")!;
    bagButton('[data-turn="1"]').click();
    const bareSide = picture().toDataURL(), side = picture().dataset.facing;
    const beforePreview = saves.get(INVENTORY_KEY);
    selectItem("berryBag");
    assert(picture().dataset.facing === side && picture().toDataURL() !== bareSide, "侧身预览没有绘出挑选的背包");
    assert(!world.equipment.backpack && beforePreview === saves.get(INVENTORY_KEY), "预览侧身时写入了正式搭配");
    // A fresh wardrobe visit must draw the previously confirmed outfit.
    inventory.close(); inventory.open(); bagButton('[data-turn="1"]').click();
    assert(picture().toDataURL() === bareSide, "关闭再打开后仍然画着未确认的背包");
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      inventory.grant(id);
      for (const equipped of [true, false]) {
        world.player = { x: 300, y: 310 };
        equipFromBag(id, false);
        assert((world.equipment[ITEMS[id].slot] === id) === equipped, `${id} 穿脱未生效`);
        key("d", {}, document.activeElement!); await frames(3);
        document.activeElement!.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }));
        assert(world.player.x > 300, `${id} 穿脱后方向键不能移动`);
      }
    }
    // A visible map click immediately after the equip button must reach the
    // normal pointer handler; its first click shouldn't be spent closing UI.
    world.player = {x: 300, y: 310};
    equipFromBag("berryBag");
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent("pointerdown", {button:0, bubbles:true,
      clientX: r.left + r.width * 350 / 600, clientY: r.top + r.height * 310 / 400}));
    await frames(3);
    assert(world.player.x > 300, "换装后第一次点地面不能行走");
  } finally { world.stop(); }
});

await check("气球客邀请／送别桃桃后可读完回应并收起，衣橱换装也会结束旧对话", () => {
  world.switchScene("garden",{x:304,y:318}); world.paused = false;
  const id = "garden-guest-balloon-friend";
  for (const worn of [true, false]) {
    guests.interact(id);
    const choose=(title:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent===title)!.click();
    choose("轻轻抚摸奶油猫"); choose(worn ? "带上奶油猫" : "让桃桃休息");
    document.querySelector<HTMLButtonElement>(".activity-close")!.click();
    assert(!activities.active && !world.suspended, "伙伴选择后旧对话仍截获右键和 E");
    assert((world.equipment.pet === "petCat") === worn, "伙伴选择未生效");
    assert(!world.onAction(true), "地图交互仍被旧菜单截获");
  }
  guests.interact(id); equipFromBag("wreath");
  assert(!activities.active && !world.onAction(true), "衣橱返回后仍在旧对话");
});

await check("进行中的方块换装后继续原局；手动暂停的局仍保持暂停", () => {
  world.switchScene("town"); arcade.open("blocks"); world.onAction(true);
  const original = engine() as BlocksGame, startX = original.x;
  equipFromBag("petCat"); key("ArrowLeft");
  assert(original === engine() && original.x === startX - 1 && original.status === "playing", "换装后原局不响应左键");
  key("p"); equipFromBag("petCat");
  assert(status().includes("暂停"), "脱下后误解除了手动暂停");
  key("p"); assert(!status().includes("暂停"), "脱下后不能恢复方块");
});
inventory.close(false);
arcade.close();
activities.close();
document.querySelector("#summary")!.textContent = `${passed} 项通过，${failed} 项失败`;
