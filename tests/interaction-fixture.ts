import { World } from "../src/world";
import { Activities } from "../src/activities";
import { Inventory } from "../src/inventory";
import { Arcade } from "../src/arcade";
import { whenWardrobeReady } from "../src/item-art";
import type { Engine, BlocksGame } from "../src/arcade-engines";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const world = new World(canvas);
const inventory = new Inventory(world, () => {});
const activities = new Activities(world, { complete() {}, toast() {} });
const arcade = new Arcade(world, activities, inventory);
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
inventory.close(false);
arcade.close();
activities.close();
document.querySelector("#summary")!.textContent = `${passed} 项通过，${failed} 项失败`;
