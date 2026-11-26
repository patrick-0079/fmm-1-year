import { arriveOnShift, scheduledResident } from "./resident-visits";
import { achievementDefinitions } from "../src/achievements";
import { producers } from "../src/star-catalog";
import { bassScore } from "../src/bass-score";
import { SAVE_KEY, readProgress } from "../src/core";
import { echoAltar, echoPool, ringSpots, moonPlate, mirrorSpots } from "../src/ruins-map";
import { TOWN_NPCS } from "../src/town-data";
import { TOWN_TALKED_KEY } from "../src/town";
import { townInteriorId, townInteriorKeys } from "../src/town-interior-id";
import { townKeepsakeBadge } from "../src/town-keepsakes";
import { pressDuration, workbenchSteps } from "../src/town-workbench-steps";
import { scenes, type SceneId, type World } from "../src/world";
import { verifyArcadeStamps } from "./achievement-arcade-route";
import { verifyLetterAndMeadowStamps } from "./achievement-mail-route";
import { verifyGuests, verifyGardenDiscovery } from "./guest-cases";

// Keep one save from the first visit through the final stamp. Travel between distant
// locations is shortened, but pickups, conversations, scores and rewards use the game.
export async function verifyFullBadgeRoute(world: World, log: (line: string) => void, collectStars: () => Promise<void>) {
  const state = () => readProgress(localStorage.getItem(SAVE_KEY));
  const earned = (id: string) => state().achievements.earned.includes(id);
  function expect(ok: unknown, label: string) {
    if (!ok) throw Error(label);
  }
  function el(selector: string) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw Error("没有找到界面元素 " + selector);
    return element;
  }
  async function wait(test: () => boolean, label: string) {
    const until = performance.now() + 30000;
    while (!test()) {
      if (performance.now() > until) throw Error(label);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
  function closeActivity() {
    if (!el(".activity-hud").hidden) el(".activity-close").click();
  }
  async function interactAt(scene: SceneId, id: string) {
    closeActivity();
    await world.prepareScene(scene);
    if (scheduledResident(id)) {
      await arriveOnShift(world, scene, id);
      key(world.canvas, "e"); key(world.canvas, "e", false);
      return;
    }
    const config = scene === "town" ? world.townMap : scenes[scene];
    const spot = config.spots.find(s => s.id === id);
    if (!spot) throw Error("没有找到 " + id);
    world.switchScene(scene, spot.approach);
    key(world.canvas, "e");
    key(world.canvas, "e", false);
  }
  function key(target: Element, value: string, down = true) {
    target.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value, bubbles: true, cancelable: true }));
  }
  const action = (prefix: string) => Array.from(document.querySelectorAll<HTMLButtonElement>(".activity-actions button"))
    .find(button => !button.disabled && button.textContent?.startsWith(prefix));
  async function choose(prefix: string) {
    await wait(() => !!action(prefix), "没有出现「" + prefix + "」，当前互动 " + el(".activity-hud").textContent);
    action(prefix)!.click();
  }
  async function navigation(scene: "room" | "garden") {
    el('.scene-nav [data-scene="' + scene + '"]').click();
    await wait(() => world.scene === scene && !world.paused, "地图导航没有抵达 " + scene);
  }

  expect(state().achievements.earned.length === 0, "请在独立的新标签页从零枚徽章开始");
  if (document.querySelector(".debug-trigger")) {
    el(".debug-trigger").click();
    const preview = el('[data-debug="wardrobe"]');
    if (preview.getAttribute("aria-pressed") === "true") preview.click();
    el(".debug-close").click();
  }
  await navigation("garden");
  for (let i = 0; i < 2; i++) {
    await navigation("room");
    await navigation("garden");
  }
  await world.prepareScene("challenge");
  world.switchScene("challenge", scenes.challenge.hazards[0]);
  await wait(() => world.scene === "room" && !el(".bed-note").hidden, "陷阱未送回床边");
  expect(earned("bed-note"), "看见便签时没有盖章");
  el(".note-close").click();
  await navigation("garden");
  await navigation("room");
  world.visit("room-fox");
  await wait(() => state().roomFox.rebuffed, "连续三次漏摸后没有拒摸");
  expect(!earned("fox-peace") && !earned("fox"), "拒摸时提前盖章");
  key(world.canvas, "e");
  key(world.canvas, "e", false);
  expect(earned("fox-peace") && earned("fox"), "第二次安抚后未和好");
  log("三次漏摸含陷阱复活，第四次回家独立摸两次，便签、抚摸与和好三枚徽章均已取得");

  await interactAt("room", "cake");
  const candle = action("按住吹蜡烛")!;
  key(candle, " ");
  await wait(() => !!action("沿第"), "长按未能吹灭蜡烛");
  key(candle, " ", false);
  for (let i = 0; i < 3; i++) await choose("沿第");
  await choose("和芙芙一起吃一块");
  expect(!earned("cake"), "吃完前提前获得蛋糕徽章");
  await wait(() => earned("cake"), "吃完蛋糕未盖章");
  await interactAt("room", "gifts");
  await choose("解开左边");
  await choose("解开右边");
  await choose("轻轻掀开");
  await choose("收下这份心意");
  expect(earned("gifts"), "拆礼物后未盖章");
  await interactAt("room", "white-bass");
  for (const [i, note] of bassScore.entries()) {
    el('[data-string="' + note.string + '"]').click();
    expect(earned("bass") === (i === 15), "贝斯未在第 16 音盖章");
  }
  el(".bass-leave").click();
  await interactAt("room", "album");
  el(".photo-book-photo").click();
  el(".photo-original-back").click();
  el(".game-album-reader .reader-close").click();
  expect(!earned("memories"), "只看单张照片就盖章");
  await interactAt("garden", "danmaku");
  expect(el(".cinema-hud").hidden && !earned("memories") && !state().visited.includes("danmaku"),
    "查看周年海报提前解锁了放映");
  expect(el(".activity-status").textContent?.includes("小叶子"), "海报未提示找小叶子");
  closeActivity();
  log("实测蛋糕三刀、吃完、收礼、16 音；看过照片后，单看周年海报仍未取得回忆徽章");

  await interactAt("garden", "balloons");
  for (const color of ["粉","蓝","紫"]) for (let i = 0; i < 4; i++) await choose(color + "气球");
  expect(!earned("balloons"), "充气后、放飞前提前盖章");
  await choose("一起放飞");
  await interactAt("garden", "fireworks");
  await choose("点燃一朵烟花");
  await choose("点燃一朵烟花");
  await wait(() => earned("fireworks"), "三朵烟花未盖章");
  await interactAt("garden", "wreath");
  closeActivity();
  expect(!earned("wreath"), "捡到花环后、戴上前提前盖章");
  key(world.canvas, "h");
  key(world.canvas, "h", false);
  expect(earned("wreath"), "正式佩戴花环未盖章");
  await interactAt("challenge", "courage");
  expect(earned("courage"), "亲手摘勇气花后未盖章");
  closeActivity();
  await world.prepareScene("garden");
  await verifyGuests(world);
  await verifyGardenDiscovery(world);
  log("放飞三色气球、同场烟花、采勇气花、戴花环、邀请两位旅伴、跨日发现三个彩蛋");

  await verifyLetterAndMeadowStamps(world, log);
  closeActivity();
  await interactAt("meadow", "meadow-garden-tape");
  expect(state().gardenTape === "carried" && earned("garden-tape"), "帐篷拾取录像带未立即盖章");
  await interactAt("garden", "danmaku");
  await choose("先去逛逛");
  expect(state().gardenTape === "carried" && !earned("memories"), "离开放映机时意外插带");
  await interactAt("garden", "danmaku");
  await choose("放入录像带");
  expect(state().gardenTape === "inserted" && !el(".cinema-hud").hidden && earned("memories"),
    "插带打开放映时没有保存到访或补齐回忆徽章");
  el(".cinema-leave").click();
  log("花海帐篷拾带获章，插带前可以离开，真正放映时补齐回忆徽章");
  await collectStars();
  log(`${producers.length} 颗落星逐一按键拾起，署名与寄语核对，重复互动未增加收藏`);
  for (const npc of TOWN_NPCS) {
    await interactAt("town", "npc-" + npc.id);
    expect(JSON.parse(localStorage.getItem(TOWN_TALKED_KEY) ?? "[]").includes(npc.id), "没有记下与 " + npc.name + " 的会面");
  }
  closeActivity();
  expect(earned("friends"), "见过 25 位角色后未盖章");
  await verifyArcadeStamps(world, log);
  for (const spot of ringSpots) await interactAt("ruins", spot.id);
  await interactAt("ruins", moonPlate.id);
  await choose("装入");
  for (const [name, count] of [["内",3],["中",2],["外",1]] as const) {
    for (let i = 0; i < count; i++) await choose("转" + name);
  }
  await interactAt("ruins", mirrorSpots[0].id);
  await choose("转上镜");
  await choose("转下镜");
  expect(earned("ruin-light"), "星纹砖已亮却未盖章");
  await interactAt("ruins", echoAltar.id);
  for (const name of ["叶","铃","星"]) await choose("轻敲「" + name + "」");
  await interactAt("ruins", echoPool.id);
  closeActivity();

  for (const room of townInteriorKeys) {
    const scene = townInteriorId(room), badge = townKeepsakeBadge(room);
    await interactAt(scene, scene + "-main");
    for (const stage of workbenchSteps[room]) {
      await wait(() => document.querySelector(".town-workbench")?.getAttribute("data-step") === stage.id,
        "没有进入手作步骤 " + stage.id);
      if (stage.kind === "wait") continue;
      const tool = stage.tools[0];
      const button = el(`.town-workbench-tool[data-tool="${tool.id}"]`);
      button.focus();
      if (stage.kind === "hold") {
        key(button, " ");
        await new Promise(resolve => setTimeout(resolve, pressDuration + 60));
        key(button, " ", false);
      } else {
        if (stage.kind === "place" || stage.kind === "slide") {
          const dx = stage.target.x - tool.at.x, dy = stage.target.y - tool.at.y;
          for (let i = 0; i < Math.round(Math.abs(dx) / 12); i++) key(button, dx < 0 ? "ArrowLeft" : "ArrowRight");
          for (let i = 0; i < Math.round(Math.abs(dy) / 12); i++) key(button, dy < 0 ? "ArrowUp" : "ArrowDown");
        } else {
          for (let i = 0; i < (stage.kind === "dial" ? 5 : 12); i++) key(button, "ArrowRight");
        }
        key(button, "Enter");
      }
    }
    expect(!earned(badge) && !state().townKeepsakes.items.includes(room), "手作结束时提前发放纪念品");
    await choose("收下");
    expect(earned(badge) && state().townKeepsakes.items.includes(room), "领取时缺少纪念品或徽章 " + room);
    closeActivity();
  }
  log("七件小镇纪念品均在亲手完成并收下后盖章");

  expect(!earned("town-miko"), "集齐小物时提前颁发了绯袴留影徽章");
  await interactAt("town-hall","npc-photo-visitor");
  await choose("收下巫女服");
  expect(earned("town-miko"), "从暖栗手中收下巫女服后未颁发绯袴留影徽章");
  closeActivity();

  const ordinary = achievementDefinitions.filter(d => !d.id.startsWith("days-"));
  const missing = ordinary.filter(d => !earned(d.id));
  expect(missing.length === 0, "尚未获得 " + missing.map(d => d.name).join("、"));
  log(`同一份新档累计已取得全部 ${ordinary.length} 枚非计时徽章，小游戏、收信、花海与两条独立遗迹支线可并存`);
}
