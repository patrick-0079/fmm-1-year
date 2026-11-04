import { World } from "../src/world";
import { Activities } from "../src/activities";
import { Inventory } from "../src/inventory";
import { Arcade } from "../src/arcade";
import type { MinesGame } from "../src/arcade-bonus";
import { whenWardrobeReady } from "../src/item-art";
import type { Engine, BlocksGame } from "../src/arcade-engines";
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
  assert(document.querySelectorAll("[data-equip]:enabled").length === Object.keys(ITEMS).length, "默认可试穿的数量有误");
  inventory.toggle("starShoes");
  assert(world.equipment.shoes === "starShoes" && !inventory.has("starShoes"), "试穿篡改了收集进度");
  inventory.grant("anniversaryPin");
  inventory.open(); switchMode();
  assert(!world.equipment.shoes && document.querySelectorAll("[data-equip]:enabled").length === 1, "关闭试穿后未还原");
  inventory.toggle("anniversaryPin");
  inventory.open(); switchMode(); inventory.toggle("petCat");
  const saved = JSON.parse(saves.get(INVENTORY_KEY)!);
  assert(saved.owned.length === 1 && saved.equipped.body === "anniversaryPin" && !saved.equipped.pet, "试穿装备写入了正式存档");
  inventory.open(); switchMode();
  assert(world.equipment.body === "anniversaryPin" && !world.equipment.pet, "原搭配丢失");
  inventory.reset();
});

await check("打开背包暂停小游戏与方向键；Esc 只收起背包，之后继续原局", () => {
  arcade.open("snake");
  world.onAction(true);
  inventory.open();
  assert(document.activeElement?.classList.contains("bag-close"), "焦点未进入背包");
  key("ArrowDown");
  for (let i = 0; i < 40; i++) world.onTick(0.1, i / 10);
  assert(engine().status === "playing" && engine().score === 0, "背包期间游戏仍在运行");
  key("Escape");
  assert(arcade.active && !world.suspended, "Esc 关闭了底下的游戏或没有恢复");
  for (let i = 0; i < 80; i++) world.onTick(0.1, i / 10);
  assert(engine().status === "lost", "收起背包后原局没有继续运行");
});

await check("试穿的猫仍需正式领取，邀请会保存真实伙伴位，拒绝不会覆盖原有兔子", () => {
  inventory.reset(); inventory.setFitting(true);
  inventory.setCompanion("petBunny",true);
  inventory.toggle("petCat");
  assert(world.equipment.pet==="petCat" && !inventory.has("petCat"),"试穿不应颁发桃桃");
  world.switchScene("garden");
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

await check("整理背包与查看说明的暂停互不覆盖", () => {
  world.paused = false;
  world.suspend("help", true);
  inventory.open();
  inventory.close(false);
  assert(world.suspended && !world.paused, "背包关闭提前释放了说明的暂停");
  world.suspend("help", false);
  assert(!world.suspended && !world.paused, "说明关闭未恢复原来的移动状态");
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
const equipFromBag = (id: ItemId) => {
  inventory.open();
  const button = document.querySelector<HTMLButtonElement>(`[data-equip="${id}"]`)!;
  button.focus(); button.click();
  assert(!world.suspended && !canvas.parentElement!.inert, `${id} 未解除场景暂停`);
  assert(document.activeElement === canvas, `${id} 焦点未返回游戏`);
};
await check("全部纪念品经背包按钮逐一穿脱后，下一帧可用方向键行走", async () => {
  await world.load();
  try {
    world.switchScene("room"); world.paused = false;
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      inventory.grant(id);
      for (const equipped of [true, false]) {
        world.player = { x: 300, y: 310 };
        equipFromBag(id);
        assert((world.equipment[ITEMS[id].slot] === id) === equipped, `${id} 穿脱未生效`);
        key("ArrowRight"); await frames(3);
        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
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
  world.switchScene("garden"); world.paused = false;
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
