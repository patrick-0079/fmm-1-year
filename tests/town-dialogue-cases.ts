import { arriveOnShift } from "./resident-visits";
import type { World } from "../src/world";
import { scenes } from "../src/maps";
import { TOWN_NPCS, ARCADES } from "../src/town-data";
import { canStand } from "../src/core";
import { INVENTORY_KEY, readInventory } from "../src/items";
import type { TownResidentId } from "../src/town-dialogue";
import { townChatTopics } from "../src/town-chat-topics";

/** Interactions run in the normal game, using this fixture's isolated browser save. */
export async function verifyTownResidents(world: World, log: (line: string) => void) {
  const hud = document.querySelector<HTMLElement>(".activity-hud")!;
  const status = () => hud.querySelector(".activity-status")!.textContent!;
  const assert = (ok: unknown, label: string) => { if (!ok) throw Error(label); };
  const button = (title: string) => {
    const found = [...hud.querySelectorAll<HTMLButtonElement>(".activity-actions button")].find(b => b.textContent === title);
    if (!found) throw Error("缺少选项「" + title + "」：" + status());
    return found;
  };
  const choose = (title: string) => button(title).click();
  const daily = (id: TownResidentId) => {
    const book = townChatTopics[id];
    return [...Object.values(book.phases), ...book.familiar].some(topic =>
      (typeof topic === "string" ? topic : topic.text) === status());
  };
  const close = () => hud.querySelector<HTMLButtonElement>(".activity-close")!.click();
  const wait = async (condition: () => boolean, message: string) => {
    const deadline = performance.now() + 75000;
    while (!condition()) {
      if (performance.now() > deadline) throw Error(message);
      await new Promise(r => setTimeout(r, 25));
    }
  };
  const key = (value: string, down: boolean, repeat = false) =>
    world.canvas.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, key: value, repeat }));
  const talk = async (id: TownResidentId) => {
    if (!hud.hidden) close();
    await arriveOnShift(world, "town", "npc-" + id);
    world.interact();
    const npc = TOWN_NPCS.find(n => n.id === id)!;
    assert(!hud.hidden && hud.querySelector(".dialogue-name")!.textContent === npc.name + " · " + npc.role, "没有遇见" + npc.name);
  };

  await world.prepareScene("town");
  await talk("post"); choose("不是哦，我只是凑巧走到这的"); close();
  await talk("post"); choose("不是哦，我只是凑巧走到这的"); choose("继续");
  assert(status().includes("属于你的缘分到了"), "邮差少了最后的叮嘱");
  choose("一会儿再看"); assert(status().includes("那封信已经到了"), "邮差当次投递少了未读叮嘱");
  await talk("post"); assert(daily("post"), "已投递后重访邮差没有进入日常");
  await talk("welcome"); key("e", true); key("e", true, true);
  assert(status() === "......" && button("你好？？"), "按住 E 跳过了第二次呼喊");
  key("e", false); key("e", true); key("e", false); choose("你在这里干什么呀？");
  assert(readInventory(localStorage.getItem(INVENTORY_KEY)).owned.includes("anniversaryPin"), "纪念胸针没有进入真实背包");
  await talk("welcome"); assert(daily("welcome"), "迎宾员重访重复赠礼");
  log("红笺可中途离开，确认投递后记得信件；银铃需要两次独立呼喊，最后才赠送胸针");

  await talk("florist"); choose("继续"); close();
  await talk("florist"); choose("继续"); choose("收下洋桔梗");
  await talk("florist"); choose("看看那束花");
  const bag = document.querySelector<HTMLElement>(".inventory-panel")!;
  assert(!bag.hidden && bag.dataset.tab==="keepsakes" && bag.querySelector(".bouquet-detail")?.textContent?.includes("真诚不变的爱"), "背包没有显示洋桔梗的赠语");
  bag.querySelector<HTMLButtonElement>(".bag-close")!.click();
  for (const [index, question] of ["是什么呀？", "是脑子吗...阿巴阿巴（bushi）"].entries()) {
    await talk("maker");
    if (index) { assert(daily("maker"), "紫凌应进入日常"); choose("聊聊你的手艺"); }
    choose("谢谢，但是你为什么要说英文？"); choose(question);
    assert(status().includes("可以打开背包"), "缺少实际换装指引"); choose("打开背包");
    assert(hud.hidden && !bag.hidden && bag.dataset.tab==="wardrobe" && bag.querySelector("[data-select]"), "工匠没有打开配饰列表"); bag.querySelector<HTMLButtonElement>(".bag-close")!.click();
    assert(!world.suspended && !world.paused, "收起背包后无法行动");
  }
  await talk("baker"); choose("是我哦。"); choose("这是给我的吗？"); choose("帮我留一下");
  await talk("baker"); assert(status().includes("给你留的第一块"), "栗栗没有留住蛋糕");
  choose("现在尝一口"); close(); await talk("baker"); choose("现在尝一口"); choose("跳过演出");
  await talk("baker"); assert(daily("baker"), "栗栗没有记住吃过的蛋糕");
  log("青芽花束进入纪念物页；紫凌两条分支都能开包、关包后恢复操作；栗栗保管蛋糕并支持跳过演出");

  await talk("walker"); choose("我没见过哦"); assert(!hud.querySelector(".activity-actions button"), "蓝莓第一个答案还有第二问");
  for (const answer of ["没关系哦，你很可爱呢", "有关系！（逗她）"]) {
    await talk("walker"); choose("聊聊庆典那天"); choose("我就是哦~"); choose(answer);
    assert(status().includes(answer.startsWith("没") ? "脸红" : "姐姐我错啦"), "蓝莓答错分支");
  }
  await talk("bunny"); choose("你是哪家的宝宝？");
  const stale = button("继续");
  key("ArrowRight", true);
  try { await wait(() => hud.hidden, "绒月未在走远后松手"); }
  finally { key("ArrowRight", false); }
  stale.click(); world.onTick(2, performance.now() / 1000);
  assert(hud.hidden, "绒月的延迟对白或旧按钮重新弹出");
  await talk("bunny"); choose("什么情况呀？");
  await wait(() => status().startsWith("ww"), "绒月没有自动开口");
  choose("我收到啦，你的怀抱很温暖。"); assert(status().includes("好一会才放开"), "绒月的末句缺失");
  await talk("photo-visitor"); choose("（乖乖不动）"); choose("没事，能帮到你我很开心");
  assert(status() === "请你以后也常来做我的模特！", "摄影师第一条分支有误");
  await talk("photo-visitor"); choose("再拍一次"); choose("（就动就动）"); choose("好吧，那我不动了"); assert(status().startsWith("嗐，"), "摄影师第二条分支有误");
  await talk("radio-host"); choose("用很多的真心和爱去认真对待听众就好啦"); assert(status() === "我记下了，我会努力的！", "电台回应有误");
  await talk("radio-host"); choose("其实我没有什么经验，我很幸运遇到了一群爱我的人。");
  assert(hud.querySelector(".dialogue-name")!.textContent === "作者的话" && status().endsWith("芙芙值得被爱。"), "署名或作者全文丢失");
  await talk("books"); choose("我路过看到这间书屋，便来瞧瞧看。"); choose("是什么书呀？"); assert(status().endsWith("安然度过这一年。"), "书屋结尾丢失");
  await talk("cat"); choose("尝试着摸摸它"); assert(status().includes("主动蹭蹭你"), "巡街小猫的抚摸回应有误");
  await talk("cat"); choose("还是不要打扰它了，可能比较高冷"); assert(status() === "（看了你一会，离开了）", "巡街小猫离开分支有误");
  const catHome = scenes.town.spots.find(s => s.id === "npc-cat")!;
  const cat = world.config.spots.find(s => s.id === "npc-cat")!;
  await wait(() => Math.abs(cat.x - catHome.x) > 22, "奶糖的互动点没有随它走开");
  const street = world.config;
  assert(canStand(catHome,street.walls,street.bounds,street.floor,street.surfaces), "奶糖离开后原处仍挡路");
  assert(!canStand(cat,street.walls,street.bounds,street.floor,street.surfaces), "奶糖的足迹没有随它移动");
  await wait(() => Math.abs(cat.x - catHome.x) < 0.01, "奶糖没有回到原位");
  log("蓝莓、摄影师、夜弦、墨桃、奶糖完整分支通过；走出绒月身旁后迟到的自我介绍和旧按钮均无效");

  await talk("snake-keeper"); choose("谢谢你哦，我还想到处逛逛。"); assert(world.scene === "town" && hud.hidden, "谢绝青团后被送进遗迹");
  for (const [resident, game, action] of [
    ["hop-keeper", "hop", "去玩月兔跳一跳"], ["flight-keeper", "flight", "去玩芙芙晚安飞行"],
    ["blocks-keeper", "blocks", "去玩晚安方块"], ["snake-keeper", "snake", "去看看，去玩苔纹贪吃蛇"],
  ] as const) {
    await talk(resident); choose(action);
    const arcade = document.querySelector<HTMLElement>(".arcade-hud")!;
    await wait(() => !arcade.hidden && arcade.dataset.game === game, "未抵达：" + action);
    assert(world.scene === ARCADES[game].scene && arcade.querySelector(".arcade-title")?.textContent === ARCADES[game].title, "打开了错误的游戏");
    arcade.querySelector<HTMLButtonElement>(".arcade-close")!.click();
  }
  const book = document.querySelector<HTMLElement>(".achievement-book")!;
  book.querySelector<HTMLButtonElement>('[data-book-toggle][aria-expanded="false"]')?.click();
  book.querySelector<HTMLButtonElement>('[data-book-chapter="daily"]')!.click();
  book.querySelector<HTMLButtonElement>('[data-book-pick="friends"]')!.click();
  const townProgress = () => [...book.querySelectorAll(".achievement-detail li")]
    .find(row => row.textContent?.startsWith("小镇 "))?.textContent;
  assert(townProgress()?.startsWith("小镇 15/18 ·"), "原 15 位居民的计数有误");
  log("四位引路人打开各自的小游戏准备画面，青团成功跨图抵达西廊，镇民计数 15 / 18");

  const belongings = localStorage.getItem(INVENTORY_KEY);
  for (let attempt = 0; attempt < 2; attempt++) {
    await talk("xiaoyou");
    assert(status() === "芙芙姐姐！小佑挑了篮子里最甜的一颗橘子，想送给你。", "橘子来宾开场对白有误");
    choose("收下橘子");
    assert(status() === "（小佑把橘子递到芙芙手里。）", "缺少递橘子的旁白");
    choose("尝一瓣");
    assert(status() === "甜吗？我挑了好久呢！", "品尝对白有误");
    close();
    assert(townProgress()?.startsWith("小镇 16/18 ·"), "重访同一来宾时重复计数");
  }
  assert(localStorage.getItem(INVENTORY_KEY) === belongings, "橘子演出改变了背包");
  await talk("guli"); choose("看看小鱼");
  assert(status() === "花海也落着一颗这样的小鱼星。哪天去散步，看看能不能认出它呀。", "故里的小鱼线索有误");
  await talk("qianxiao"); choose("翻开星星牌");
  assert(status() === "这张叫『晚安星』。愿下次见面时，我们还有好多好事可以讲给彼此听。", "浅笑的晚安星对白有误");
  await world.prepareScene("garden");
  world.switchScene("garden");
  await wait(() => hud.hidden, "切图后仍显示浅笑的对白");
  assert(townProgress() === "小镇 18/18 · 已见齐", "三位来宾没有记入居民计数");
  book.querySelector<HTMLButtonElement>("[data-book-toggle]")!.click();
  log("三位来宾的对白、重访品尝、切图清理和 18 / 18 计数通过");
}
