import { World } from "../src/world";
import { Activities } from "../src/activities";
import { Inventory } from "../src/inventory";
import { Arcade } from "../src/arcade";
import type { LinkGame, MinesGame } from "../src/arcade-bonus";
import type { AchievementEvent } from "../src/achievement-events";
import { whenWardrobeReady } from "../src/item-art";
import type { Engine, BlocksGame, HopGame } from "../src/arcade-engines";
import { ARCADES } from "../src/town-data";
import type { GameId } from "../src/arcade-engines";
import { ITEMS, INVENTORY_KEY, starterItems, type ItemId } from "../src/items";
import { GardenLife } from "../src/garden-life";
import type { GiftUnwrapping } from "../src/gift-unwrapping";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const world = new World(canvas);
const actions: AchievementEvent[] = [];
world.onAchievementEvent = event => { actions.push(event); };
const saves = new Map<string, string>();
const inventory = new Inventory(world, () => {}, {
  getItem: (id) => saves.get(id) ?? null,
  setItem: (id, value) => { saves.set(id, value); },
}, true);
const completedActivities = new Set<string>(), giftRewards: ItemId[] = [];
let giftCompletions = 0;
const activities = new Activities(world, {
  complete(id) { completedActivities.add(id); if(id === "gifts") giftCompletions++; },
  toast() {}, reward(id) { giftRewards.push(id); },
  isComplete: id => completedActivities.has(id),
});
inventory.onEquip = () => activities.finishEquipmentChoice();
const bests = new Map<GameId, number>();
const arcade = new Arcade(world, activities, inventory, (id, score) => {
  const best = Math.max(bests.get(id) ?? 0, score);
  bests.set(id, best);
  return best;
});
const gardenMemory = {decoratorMet:false,rabbitIntroduced:false};
const guests = new GardenLife(world, activities, inventory, () => gardenMemory, () => {});
await world.prepareScene("town");
world.switchScene("town");
const engine = () => (arcade as unknown as { engine: Engine }).engine;
const status = () => document.querySelector(".arcade-status")?.textContent ?? "";
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const bag = document.querySelector<HTMLElement>(".inventory-panel")!;
function bagButton(selector: string) {
  const button = bag.querySelector<HTMLButtonElement>(selector);
  if (!button || button.disabled) throw new Error("背包里没有可操作的按钮 " + selector);
  return button;
}
function selectItem(id: ItemId) {
  if (!bag.querySelector(`[data-select="${id}"]`)) {
    bag.querySelector<HTMLButtonElement>("[data-choose-category]")?.click();
    bagButton(`[data-category="${ITEMS[id].slot}"]`).click();
  }
  bagButton(`[data-select="${id}"]`).click();
}
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

await check("纪念物只展示已取得的收藏，地图可回看，小镇小物逐件出现", () => {
  inventory.open();
  bagButton('[data-tab="keepsakes"]').click();
  assert(bag.querySelector(".bag-keepsakes-empty") && !bag.querySelector(".bag-keepsake"), "空背包展示了未取得的收藏");
  inventory.collectFlowerMap();
  inventory.collectFlowerMap();
  assert(bag.querySelectorAll(".bag-keepsake").length === 1 && JSON.parse(saves.get(INVENTORY_KEY)!).flowerMap === true, "重复打听线索没有保存唯一的地图");
  bagButton("[data-flower-map]").click();
  assert(bag.querySelector(".xiaoye-map-paper") && world.suspended, "展开地图时无法专心阅读");
  const chart = bag.querySelector<HTMLCanvasElement>(".xiaoye-treasure-chart")!;
  const ink = chart.getContext("2d")!.getImageData(0, 0, chart.width, chart.height).data;
  let crossPixels = 0;
  for (let i = Math.floor(chart.height / 2) * chart.width * 4; i < ink.length; i += 4)
    if (ink[i] === 187 && ink[i + 1] === 81 && ink[i + 2] === 77 && ink[i + 3] > 200) crossPixels++;
  assert(crossPixels > 80, "地图下半部的营地旁没有画出宝藏红叉");
  const places = bag.querySelector<HTMLDetailsElement>(".xiaoye-map-key")!;
  assert(!places.open, "文字清单遮住了藏宝路线");
  places.querySelector("summary")!.click();
  assert(places.open && places.querySelectorAll("li").length === 7, "展开对照清单没有七朵花");
  bagButton("[data-keepsakes]").click();
  assert(document.activeElement === bagButton("[data-flower-map]") && !world.suspended, "收起地图后未返回地图卡片");
  inventory.townKeepsakes = () => ({items:["books"]});
  inventory.refreshTownKeepsakes();
  bagButton("[data-town-keepsakes]").click();
  assert(bag.querySelectorAll("[data-town-item]").length === 1 && bag.querySelector('[data-town-item="books"]'), "小镇小物展示了尚未领取的纪念品");
  inventory.townKeepsakes = () => ({items:[]});
});

await check("默认展示真实收藏，手动试穿后可以恢复真实搭配并保存试玩时领取的奖励", () => {
  const switchMode = () => inventory.setFitting(!inventory.fitting);
  inventory.open();
  assert(!inventory.fitting && !!bag.querySelector(".bag-item.is-locked"), "首次打开衣橱应只显示真实收藏可用");
  switchMode();
  assert(inventory.state.owned.length === Object.keys(ITEMS).length && !bag.querySelector(".bag-item.is-locked"), "手动开启后可试穿的数量有误");
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
  assert(!world.equipment.shoes && inventory.state.owned.length === starterItems.length + 1, "关闭试穿后未还原");
  selectItem("starShoes");
  assert(bag.querySelector("[data-equip=starShoes]:disabled") && bag.textContent?.includes(ITEMS.starShoes.source), "缺少未收集配饰的来源说明");
  selectItem("anniversaryPin"); confirmItem("anniversaryPin");
  switchMode(); selectItem("petCat"); confirmItem("petCat");
  const saved = JSON.parse(saves.get(INVENTORY_KEY)!);
  assert(saved.owned.length === starterItems.length + 1 && saved.equipped.body === "anniversaryPin" && !saved.equipped.pet, "试穿装备写入了正式存档");
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

await check("小游戏里翻背包来信时继续暂停，返回纪念物后可回到原局", () => {
  let subscriptions = 0, returns = 0;
  const letter = { id: "kerry", title: "Kerry 的来信", text: "晚安。" };
  inventory.mailbox = () => ({
    items: [letter], unreadIds: [letter.id], onRead() {},
    subscribe() { subscriptions++; return () => { subscriptions--; }; },
  });
  try {
    arcade.open("snake");
    world.onAction(true);
    inventory.openMail(undefined, () => { returns++; });
    assert(!bag.hidden && !bag.inert && canvas.inert && world.suspended, "信摞未接管操作");
    assert(subscriptions === 1 && bagButton(".mail-envelope").dataset.memoryId === letter.id, "背包没有显示来信");
    for (let i = 0; i < 80; i++) world.onTick(.1, i / 10);
    assert(engine().status === "playing", "翻信时小游戏仍在推进");
    key("Escape", {}, bagButton(".mail-envelope"));
    assert(!bag.hidden && document.activeElement === bagButton("[data-mail]") && subscriptions === 0,
      "返回时焦点、订阅或背包状态不正确");
    assert(returns === 0 && world.suspended, "仅放回信摞就续接了游戏");
    bagButton("[data-mail]").click();
    key("b", {}, bagButton(".mail-envelope"));
    assert(returns === 1 && !world.suspended && bag.hidden && arcade.active, "合包后没有正确回到原局");
    inventory.openMail(undefined, () => { returns++; });
    inventory.close(false);
    assert(subscriptions === 0 && returns === 1, "系统收起背包时错误地继续了旧对话");
  } finally {
    inventory.close(false);
    inventory.mailbox = undefined;
  }
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

await check("试穿的猫仍需正式领取，邀请会保存真实伙伴位，拒绝不会覆盖原有兔子", async () => {
  inventory.reset(); inventory.setFitting(true);
  actions.length = 0;
  inventory.setCompanion("petBunny",true);
  inventory.toggle("petCat");
  assert(world.equipment.pet==="petCat" && !inventory.has("petCat"),"试穿不应颁发桃桃");
  await world.prepareScene("garden");
  world.switchScene("garden",{x:304,y:318});
  const select=(title:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent===title)!.click();
  const talk=()=>guests.interact("garden-guest-balloon-friend");
  talk();select("⌈轻轻抚摸奶油猫⌋");select("今天就让桃桃留在你这儿吧。");activities.close();
  assert(inventory.followingPet==="petBunny" && !inventory.has("petCat"),"拒绝覆盖了真实搭配");
  assert(actions.includes("garden-guest-balloon-friend") && !actions.includes("petCat"),"来宾与同行徽章把试穿或拒绝算作邀请");
  talk();select("⌈轻轻抚摸奶油猫⌋");select("⌈带上奶油猫⌋");
  const stored=JSON.parse(saves.get(INVENTORY_KEY)!);
  assert(stored.equipped.pet==="petCat" && stored.owned.includes("petBunny"),"邀请没有进入真实存档");
  assert(actions.includes("petCat") && actions.includes("petBunny"), "正式同行没有登记");
  inventory.setFitting(false);
  assert(world.equipment.pet==="petCat","关闭试穿后没有继续同行");
  activities.close(); talk(); select("桃桃还记得我吗？");
  assert(document.querySelector(".activity-status")?.textContent === "桃桃认出你啦！你想再摸摸它吗？", "星星没有认出已获得的桃桃");
  select("⌈轻轻抚摸奶油猫⌋"); select("⌈让桃桃休息⌋");
  activities.close(); talk(); select("桃桃还记得我吗？"); select("⌈轻轻抚摸奶油猫⌋"); select("⌈带上奶油猫⌋");
  assert(inventory.followingPet === "petCat", "休息后不能通过星星的问候再次邀请桃桃");
  activities.close();inventory.reset();
});

await check("花环只有正式戴上才记入徽章，脱下或调试试穿均不算", () => {
  actions.length = 0;
  inventory.grant("wreath", false);
  inventory.setFitting(true);
  inventory.toggle("wreath");
  assert(!inventory.wearingWreath && actions.length === 0, "试穿盖了花环章");
  inventory.setFitting(false);
  inventory.toggle("wreath");
  inventory.toggle("wreath");
  assert(!inventory.wearingWreath && actions.join() === "wreath-worn", "真实佩戴、脱下没有正确区分");
  inventory.reset();
});

await check("连连看键盘完成最后一对后立即离开，最高分和奖励仍然登记", () => {
  arcade.open("link"); world.onAction(true);
  const game = engine() as LinkGame;
  for (let pair = 0; pair < 8; pair++) {
    game.hint();
    const [a, b] = game.suggested;
    assert(a !== undefined && b !== undefined, "帮助未给出可连的图案");
    game.cursor = a; world.onAction(true);
    game.cursor = b; world.onAction(true);
  }
  arcade.close();
  assert(bests.get("link") === 8 && inventory.has(ARCADES.link.reward), "同帧离开时丢失了分数或奖励");
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

const giftState = () => (activities as unknown as { gift: GiftUnwrapping }).gift;
const giftAction = () => document.querySelector<HTMLButtonElement>(".activity-actions button")!.click();
const unwrapGift = () => {
  giftAction(); giftAction(); world.onTick(.6,1); giftAction(); world.onTick(1,2);
};
await check("礼盒每次 E 独立解开一端，打开后不领奖；收下才完成且重看不重发", () => {
  activities.reset(); completedActivities.delete("gifts"); giftCompletions=0; giftRewards.length=0;
  world.scene="room"; activities.gifts();
  key("e"); key("e", {repeat:true});
  assert(giftState().ribbons.filter(Boolean).length===1, "按住 E 连续解开两端");
  key("e"); assert(giftState().stage==="untying", "第二次 E 未解开另一端");
  key("e"); assert(activities.active, "动画中 E 误关了互动");
  world.onTick(.6,1); key("e"); world.onTick(1,2);
  assert(giftState().stage==="revealed" && giftCompletions===0 && giftRewards.length===0,"只看到礼物就发奖");
  key("e"); key("e",{repeat:true});
  assert(giftCompletions===1 && giftRewards.join() === "ribbonShoes", "领取没有恰好记一次完成和奖励");
  activities.gifts(); unwrapGift(); giftAction();
  assert(giftCompletions===1 && giftRewards.length===1,"重看礼盒重复发奖");
  key("Escape");
  assert(!activities.active && !world.paused && !world.actorHidden,"离开礼盒后人物没有恢复");
});

await check("礼盒鼠标可先拉右端，触屏可点左端；取消拖动不拆开缎带", () => {
  activities.gifts();
  world.onPointer("down",{x:435,y:295},"touch"); world.onInputCancel();
  world.onPointer("up",{x:435,y:295},"touch");
  assert(!giftState().ribbons.some(Boolean),"取消手势却拆开缎带");
  world.onPointer("down",{x:461,y:295},"mouse");
  world.onPointer("move",{x:471,y:295},"mouse");
  world.onPointer("up",{x:471,y:295},"mouse");
  assert(giftState().ribbons[1]&&!giftState().ribbons[0],"右端拖动没有单独生效");
  world.onPointer("down",{x:435,y:295},"touch");world.onPointer("up",{x:435,y:295},"touch");
  world.onTick(.6,1);
  world.onPointer("down",{x:448,y:265},"touch");world.onPointer("up",{x:448,y:265},"touch");
  world.onTick(1,2);
  assert(giftState().stage==="revealed","鼠标／触屏没走完拆盒步骤");
});

await check("礼盒 1 解左、2 解右，焦点在按钮时可逆序操作；已解侧和长按不跳步", () => {
  activities.gifts();
  const buttons = document.querySelectorAll<HTMLButtonElement>(".activity-actions button");
  assert(buttons[0].textContent === "解开左边缎带 · 1" && buttons[1].textContent === "解开右边缎带 · 2",
    "左右缎带没有各自的快捷键标签");
  buttons[1].focus(); key("2",{},buttons[1]);
  assert(giftState().ribbons[1]&&!giftState().ribbons[0],"按 2 没有只解开右边");
  const remaining = document.querySelector<HTMLButtonElement>(".activity-actions button")!;
  assert(document.activeElement===remaining && remaining.textContent?.includes("· 1"), "右端解开后焦点未移到左端按钮");
  key("2",{repeat:true},remaining); key("2",{},remaining); key("1",{repeat:true},remaining);
  assert(!giftState().ribbons[0]&&giftState().stage==="tied", "已解侧或长按误解开另一端");
  key("1",{},remaining);
  assert(giftState().stage==="untying", "新按 1 没有解开左边");
  world.onTick(.6,1); key("1"); key("2");
  assert(giftState().stage==="ready", "数字快捷键误打开盒盖");
  key("e"); assert(giftState().stage==="opening", "后续盒盖不能用 E 打开");
});

await check("礼盒数字快捷键不抢占暂停、阅读和输入法操作", () => {
  activities.gifts();
  world.suspend("gift-key-check",true);
  key("1"); key("2");
  world.suspend("gift-key-check",false);
  const reader=document.querySelector(".reader-body")!;
  key("1",{},reader); key("2",{},reader); key("1",{isComposing:true});
  assert(!giftState().ribbons.some(Boolean), "暂停、阅读或输入法中触发了解缎带");
});

await check("掀盖时收起立即恢复探索，旧动画不会覆盖新对话，中途退出不完成任务", () => {
  activities.reset(); completedActivities.delete("gifts"); giftCompletions=0; giftRewards.length=0;
  activities.gifts();
  giftAction(); giftAction(); world.onTick(.6,1); giftAction();
  activities.close();
  assert(!world.paused&&!world.actorHidden&&!world.onAction(true),"退出掀盖后地图仍被锁住");
  activities.menu("新的周年对话", [{ title: "继续看花", run() {} }]);
  world.onTick(1, 1);
  assert(document.querySelector(".activity-actions")!.textContent === "⌈继续看花⌋", "旧礼盒动画覆盖了新对话");
  assert(giftCompletions===0&&giftRewards.length===0,"中途退出礼盒却完成任务");
});

await check("已完成的旧存档重拆礼盒不会重复发奖，清档后可以重新领取", () => {
  activities.reset(); completedActivities.add("gifts"); giftRewards.length=0; giftCompletions=0;
  activities.gifts(); unwrapGift(); giftAction();
  assert(giftCompletions===0&&giftRewards.length===0,"旧存档重发了奖励");
  activities.reset(); completedActivities.delete("gifts");
  activities.gifts(); unwrapGift(); giftAction();
  assert(giftCompletions===1&&giftRewards.length===1,"清档后不能重新领取");
});

await check("Ctrl / Alt / Meta 组合键不触发背包、游戏或拆礼盒", () => {
  activities.gifts();
  const before = document.querySelector(".activity-actions")!.textContent;
  for (const modifier of ["ctrlKey", "altKey", "metaKey"])
    for (const value of ["b", "w", "1", "2", " "])
      assert(!key(value, { [modifier]: true }).defaultPrevented, `${modifier}+${value} 被拦截`);
  assert(!world.suspended, "浏览器快捷键打开了背包");
  assert(document.querySelector(".activity-actions")!.textContent === before, "组合键触发了拆礼盒");
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
  // A random first reveal can legitimately clear all 26 safe cells and remove
  // the hint button. Use a known unfinished board for the focus-retention case.
  (engine() as MinesGame).mines = new Set([8,10,20,22]);
  document.querySelectorAll<HTMLButtonElement>(".arcade-extra-actions button")[1].click();
  world.onTick(0.1, 1);
  assert(document.activeElement?.textContent?.includes("安全提示 · 剩余 2"), "提示后的下一帧丢失焦点");
  arcade.open("mines"); world.onAction(true);
  (engine() as MinesGame).mines = new Set([4,5,10,11]);
  document.querySelectorAll<HTMLButtonElement>(".arcade-extra-actions button")[1].click();
  world.onTick(.1,1);
  assert(engine().status === "won" && engine().score === 26, "安全提示通关布局未触发获胜");
  assert(!document.querySelector(".arcade-extra-actions button") && document.activeElement === canvas,
    "提示直接通关后没有移除旧按钮并把焦点交回画布");
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
      assert(!world.paused, `${pet} ${id} 退出游戏后不能移动`);
    }
  }
});

await check("小游戏退出后焦点回到画布，不跳页，也不会抢走画面外已有的焦点", () => {
  for (const id of Object.keys(ARCADES) as GameId[]) {
    arcade.open(id); world.onAction(true);
    const close = document.querySelector<HTMLButtonElement>(".arcade-close")!;
    close.focus({preventScroll:true});
    const top = window.scrollY;
    close.click();
    assert(document.activeElement === canvas, `${id} 退出后键盘焦点丢失`);
    assert(window.scrollY === top && !world.paused, `${id} 退出时跳页或无法探索`);
  }
  arcade.open("blocks");
  const outside = document.createElement("button"); document.body.append(outside);
  outside.focus({preventScroll:true}); arcade.close();
  assert(document.activeElement === outside, "切换页面内容时小游戏抢走了外部焦点");
  outside.remove();
});

await check("夜空替我说只计算一次互动内成功发出的烟花", () => {
  const settle = () => { for (let frame = 0; frame < 60; frame++) world.onTick(1 / 30, frame / 30); };
  for (let visit = 0; visit < 3; visit++) {
    activities.fireworks();
    activities.close();
    settle();
  }
  assert(!completedActivities.has("fireworks"), "分三次点燃的烟花被合并计数");
  activities.fireworks();
  key("e");
  assert(!completedActivities.has("fireworks"), "只发了两朵就发章");
  key("e");
  activities.close();
  assert(completedActivities.has("fireworks"), "三朵已发出，收起后仍未发章");
  settle();
});

await check("三只心愿气球起初系在摊前，放飞后留空，重新互动才补下一组", async () => {
  await world.prepareScene("garden");
  world.switchScene("garden");
  const sample = document.createElement("canvas");
  sample.width = 270; sample.height = 282;
  const paint = sample.getContext("2d", {willReadFrequently:true})!;
  const centers = [179,205,231];
  const visible = () => {
    paint.clearRect(0,0,sample.width,sample.height);
    activities.drawTiedBalloons(paint);
    return centers.filter(x=>paint.getImageData(x-5,215,10,45).data.some((v,i)=>i%4===3 && v>128)).length;
  };
  assert(visible()===3, "首次打开摊位前没有展示三只气球");
  activities.balloons();
  for (const x of centers) world.onPointer("down",{x,y:237},"touch");
  const buttons = [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")];
  assert(buttons.length===3 && buttons.every(b=>b.textContent?.includes("1/4")), "点击球面没给对应气球充气");
  for (const x of centers) for (let i=0;i<3;i++) world.onPointer("down",{x,y:237},"touch");
  [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")].find(b=>b.textContent==="一起放飞")!.click();
  assert(completedActivities.has("balloons") && visible()===0,"放飞后系点还有气球");
  activities.close();
  world.switchScene("town"); world.switchScene("garden");
  assert(visible()===0,"重新进入花园自动补了气球");
  activities.balloons();
  assert(visible()===3 && document.querySelector(".activity-actions")!.textContent?.includes("紫气球 0/4"),"再次互动没有重新装好气球");
});

await check("蛋糕、礼盒、气球和烟花收起后，键盘焦点与操作立即返回地图", () => {
  for (const activity of ["cake", "gifts", "balloons", "fireworks"] as const) {
    activities[activity]();
    const close = document.querySelector<HTMLButtonElement>(".activity-close")!;
    close.focus({preventScroll:true});
    const top = window.scrollY;
    key("Escape", {}, close);
    assert(!activities.active && !world.paused && !world.actorHidden, activity + " 没有恢复探索");
    assert(document.activeElement === canvas && window.scrollY === top, activity + " 收起后失去焦点或跳页");
    assert(!world.onAction(true), activity + " 收起后仍拦截地图互动");
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
      const initiallyWorn = world.equipment[ITEMS[id].slot] === id;
      for (const equipped of [!initiallyWorn, initiallyWorn]) {
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

await check("气球客邀请／送别桃桃后可读完回应并收起，衣橱换装也会结束旧对话", async () => {
  await world.prepareScene("garden");
  world.switchScene("garden",{x:304,y:318}); world.paused = false;
  const id = "garden-guest-balloon-friend";
  for (const worn of [true, false]) {
    guests.interact(id);
    const choose=(title:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent===title)!.click();
    choose("⌈轻轻抚摸奶油猫⌋"); choose(worn ? "⌈带上奶油猫⌋" : "⌈让桃桃休息⌋");
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
