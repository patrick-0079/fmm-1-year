import { arriveOnShift, scheduledResident, waitOnBench } from "./resident-visits";
import { SAVE_KEY, readProgress } from "../src/core";
import { INVENTORY_KEY, readInventory } from "../src/items";
import { rainbowFlowers, meadowGate } from "../src/rainbow-flowers";
import { campLetterSpot } from "../src/meadow-ground";
import { mailboxLetters } from "../src/resident-story";
import { scenes, type SceneId, type World } from "../src/world";

/** Real deliveries, first reading and seven normal flower pickups on a new save.
 * Travel to the interaction approach is shortened. */
export async function verifyLetterAndMeadowStamps(world: World, log: (line: string) => void) {
  const q = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
  const state = () => readProgress(localStorage.getItem(SAVE_KEY));
  const has = (id: string) => state().achievements.earned.includes(id);
  const letterCount = () => mailboxLetters(state().residents).length;
  const assert = (ok: unknown,msg: string) => { if (!ok) throw Error(msg); };
  const wait = async (condition: () => boolean, label: string) => {
    const until = performance.now()+15000;
    while (!condition()) {
      if (performance.now()>until) throw Error(label);
      await new Promise(resolve=>setTimeout(resolve,20));
    }
  };
  const actions = () => [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")];
  const choose = (name: string) => {
    const action=actions().find(button => button.textContent?.startsWith(name));
    if (!action) throw Error("找不到「"+name+"」，当前选项 "+actions().map(b=>b.textContent).join("、"));
    action.click();
  };
  const flowerClue = "小叶子，你知道去花海的路怎么走吗？";
  const clueIsAbsent = () => assert(!actions().some(button => button.textContent === flowerClue), "小叶子在后续轮次仍然显示花海线索选项");
  const askAboutTape = () => {
    const previousStage = state().gardenTape;
    const opening = q(".activity-status").textContent;
    choose(flowerClue);
    clueIsAbsent();
    const clue = q(".activity-status").textContent ?? "";
    for (const place of ["手绘地图", "周年花园两朵", "勇气花园两朵", "周年小镇三朵", "我左下方的草坪上会出现一个传送阵", "篝火左边", "大屏幕前的放映机"])
      assert(clue.includes(place), "小叶子的录像带线索缺少" + place);
    assert(readInventory(localStorage.getItem(INVENTORY_KEY)).flowerMap, "绒爪递来的地图没有收进背包");
    choose("我们接着聊吧！");
    assert(q(".activity-status").textContent === opening, "打听线索后未回到开场对白");
    clueIsAbsent();
    assert(state().gardenTape === previousStage, "打听线索时录像带状态变了");
  };
  const close = () => { if (!q(".activity-hud").hidden) q(".activity-close").click(); };
  const approach = async(scene: SceneId, id: string) => {
    close();
    await world.prepareScene(scene);
    if (scheduledResident(id)) return arriveOnShift(world, scene, id);
    const cfg=scene==="town"?world.townMap:scenes[scene];
    const spot=cfg.spots.find(s=>s.id===id)!;
    world.switchScene(scene,spot.approach);
    return spot;
  };
  const visit = async(scene: SceneId,id: string) => {
    await approach(scene,id);
    world.setCueInput("keyboard");
    world.interact();
  };
  const followSheepIntroduction = (side: number) => {
    const author = "dianziyang";
    const buttons = actions();
    assert(buttons.length === 2 && buttons[0].textContent !== buttons[1].textContent, author+" 的初遇没有两种独立回答");
    const count = letterCount();
    buttons[side].click();
    const answer = q(".activity-status").textContent;
    for (let page = 0; page < 6; page++) {
      const current = actions();
      assert(letterCount() === count && !current.some(b => b.textContent === "⌈现在读信⌋"), author+" 未收下就发信");
      if (current.some(b => b.textContent === "⌈收下信⌋")) {
        assert(q(".activity-status").textContent === "咩。走累了就在路边歇一歇。我给你带了一封信。", author+" 没有接回原来递信的完整台词");
        return answer;
      }
      assert(current.length === 1, author+" 初遇分支缺少跟进选项");
      current[0].click();
    }
    throw Error(author+" 初遇分支未能走到交信");
  };
  assert(letterCount()===2 && !state().achievements.earned.some(id=>id.startsWith("letter-")), "请从仅有两封信的新档开始来信路线");
  await visit("room","letters");
  for (const author of ["kerry","xiaoaimen"]) {
    const id=author+"-anniversary-letter";
    const envelope=()=>q<HTMLButtonElement>(".game-letter-reader .mail-stack button.mail-envelope");
    for (let i=0; i<3 && envelope()?.dataset.memoryId!==id; i++) q(".mail-stack-next").click();
    assert(envelope()?.dataset.memoryId===id && !has("letter-"+author), "拆封前的来信或徽章不正确 "+author);
    envelope().click();
    await wait(()=>has("letter-"+author), "正文展开时没有盖章 "+author);
    q(".mail-fold").click();
    await wait(()=>Boolean(q('[data-mail-state="box"]')), "没有回到信堆");
  }
  q(".game-letter-reader .reader-close").click();
  log("开局两封信逐封拆开，正文出现时各自盖章");
  const routes: Array<[SceneId,string,string,string[]]>=[
    ["garden","garden-guest-suyan","suyan",["对哦超超可爱的","咦？","⌈奖励一个小巴掌⌋","⌈奖励一个大巴掌⌋"]],
    ["garden","xiaoye-plush","xiaoye",[]],
    ["town","npc-radio-host","yeshenhua",["因为你梦想成为主持？"]],
    ["town","npc-xiaoyou","xiaoyou",["⌈收下橘子⌋","⌈尝一瓣⌋"]],
    ["town","npc-guli","guli",["因为故里喜欢吃甜品？"]],
    ["town","npc-post","post",["不是哦"]],
    ["town","visitor-zhenghao","zhenghao",[]],
    ["challenge","visitor-rabe","rabe",["没事哦"]],
    ["town","visitor-dianziyang","dianziyang",[]],
    ["garden","visitor-pigeon","pigeon",["咕？","咕？你说什么？"]],
  ];
  for (const [scene,id,author,steps] of routes) {
    const count = letterCount();
    await visit(scene,id);
    if (author === "zhenghao") {
      const promise = "对了老大，我还给你写了一封信。平时说不出口的话，都放在里面啦。";
      choose("⌈摸摸正号猫⌋");
      assert(q(".activity-status").textContent === "呜～舒服…（手松开后）（正号猫赶紧又继续贴上去）\n" + promise, "摸猫后没有接上递信台词");
      const oldOffer = actions().find(button => button.textContent === "⌈收下信封⌋");
      if (!oldOffer) throw Error("摸猫后没有收信入口");
      world.player = { x: world.player.x - 90, y: world.player.y };
      await wait(() => q(".activity-hud").hidden, "离开正号后递信对白没有收起");
      oldOffer.click();
      assert(letterCount() === count && !has("letter-zhenghao"), "走开后的旧选项仍可领取正号的信");
      await visit(scene, id);
      choose("我也想你了哦小正号");
      assert(q(".activity-status").textContent === "（蹭蹭芙芙的脚边）想我了记得多来看看我，好么老大qwq。\n" + promise, "回应想念后没有接上递信台词");
    }
    if (author === "dianziyang") {
      const first = followSheepIntroduction(0);
      const stale = actions().find(b => b.textContent === "⌈收下信⌋")!;
      world.onInteract(id);
      assert(actions().includes(stale), author+" 重复点地图上的同一人会重开谈话");
      const speaker = world.config.spots.find(spot => spot.id === id)!;
      const away = world.player.x < speaker.x ? -1 : 1;
      world.player = {x: world.player.x + away * 90, y: world.player.y};
      await wait(() => q(".activity-hud").hidden, author+" 离开 72 像素后对白仍未结束");
      stale.click();
      assert(letterCount() === count && !has("letter-"+author), author+" 过期的递信按钮仍入箱或盖章");
      await visit(scene,id);
      const second = followSheepIntroduction(1);
      assert(first !== second, author+" 的两项分别进入了相同回答");
      log(author+" · 两种初遇回答都接回原来的递信台词，第一趟走远未领取");
    }
    for (const step of steps) choose(step);
    if (author === "xiaoyou") {
      assert(q(".activity-status").textContent?.includes("忘在家里"), "小佑初遇没有说明清晨再来");
      assert(letterCount() === count, "小佑初遇提前发信");
      close();
      for (let i = 0; world.currentPhase !== "dawn" && i < 4; i++) await waitOnBench(world);
      await visit(scene,id);
      choose("谢谢宝宝");
      close();
      await visit(scene,id);
      choose("谢谢宝宝");
    }
    if (author === "xiaoye") {
      askAboutTape();
      choose("宝宝你这是玩偶服嘛？");
      clueIsAbsent();
      choose("好热的拥抱");
      clueIsAbsent();
      assert(q(".activity-status").textContent?.includes("热也得抱"), "热的拥抱进入了错误回答");
      const firstOffer = actions().find(button => button.textContent==="⌈收下信封⌋");
      if (!firstOffer || firstOffer.disabled) throw Error("选完好热的拥抱后，收下信封必须能立即点击");
      world.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      try {
        await wait(() => q(".activity-hud").hidden, "拥抱中走开后对白没有收起");
      } finally {
        world.canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
      }
      firstOffer.click();
      assert(letterCount() === count && !has("letter-xiaoye"), "中途离开后旧按钮仍能收信");
      await visit(scene, id);
      assert(actions().some(button => button.textContent === flowerClue), "重新交谈时没有恢复打听线索的选项");
      choose("宝宝你这是玩偶服嘛？");
      clueIsAbsent();
      choose("好温暖的拥抱");
      assert(q(".activity-status").textContent?.includes("温暖的话就多抱会吧"), "温暖的拥抱进入了错误回答");
      assert(actions().some(b=>b.textContent==="⌈收下信封⌋" && !b.disabled), "选完好温暖的拥抱后，收下信封必须能立即点击");
      clueIsAbsent();
    }
    const final = author === "post" ? "你说的缘分，会是什么呀？" :
      actions().find(b => /^⌈收下信(?:封)?⌋$/.test(b.textContent ?? ""))?.textContent;
    if (!final) throw Error(author + " 没有收信入口");
    assert(letterCount()===count && !has("letter-"+author),author+" 在实际领取前提前盖章");
    const takeAgain = author === "zhenghao" && actions().find(button => button.textContent === final);
    choose(final);
    if (["yeshenhua", "guli", "xiaoyou"].includes(author)) {
      assert(q(".activity-status").textContent === "（芙芙收好信封。）" &&
        actions().some(button => button.textContent === "⌈现在读信⌋"), "小镇收信后的提示或当场读信入口错误：" + author);
    }
    if (takeAgain) {
      takeAgain.click();
      assert(letterCount() === count + 1 && has("letter-zhenghao"), "正号的递信重复入箱或尚未盖章");
      assert(q(".activity-status").textContent === "（芙芙收好信封，正号又贴过来蹭了蹭。）" &&
        actions().some(button => button.textContent === "⌈现在读信⌋"), "正号收信后没有当场读信入口");
      await visit(scene, id);
      assert(actions().some(button => button.textContent === "⌈摸摸正号猫⌋") &&
        !actions().some(button => button.textContent === "我也想你了哦小正号"), "正号的信还未拆开，重逢却再次进入初遇");
      choose("⌈摸摸正号猫⌋");
      assert(!actions().length && letterCount() === count + 1, "日常摸猫又触发了递信");
    }
    if (author === "xiaoye") {
      assert(world.getActorPresentation(), "即时收信时拥抱应继续播放");
      assert(actions().some(button => button.textContent === "⌈现在读信⌋"), "收信后读信入口消失");
      clueIsAbsent();
      await visit(scene, id);
      askAboutTape();
      choose("⌈抱抱⌋");
      clueIsAbsent();
    }
    await wait(()=>letterCount()===count+1,author+" 实际收信后信箱数量未增加");
    if (author==="rabe") {
      assert(!has("letter-rabe"),"Rabe 的信尚未拆开就已盖章");
      choose("⌈现在读信⌋");
      await wait(()=>has("letter-rabe") && q(".inventory-panel .mail-sheet")?.hidden === false,"Rabe 的信从背包展开后没有盖章");
      window.dispatchEvent(new KeyboardEvent("keydown",{key:"b",bubbles:true,cancelable:true}));
      assert(q(".inventory-panel").hidden && world.scene === scene,"合上背包后没有停在 Rabe 身边");
    } else {
      await wait(()=>has("letter-"+author),author+" 实际收信后没有盖章");
    }
    close();
    log(author+" · 亲手推进递信流程，收到第 "+letterCount()+" 封信");
  }
  for (const [i,flower] of rainbowFlowers.entries()) {
    await visit(flower.scene,flower.id);
    assert(state().rainbowFlowers.length===i+1 && has("rainbow")===(i===6),"七色花计数或徽章时机错误 "+flower.name);
  }
  log("七种特殊花按三张地图亲手采集，前六朵没有提前解锁，第七朵盖章");
  await visit("garden",meadowGate.id);
  await wait(()=>world.scene==="meadow" && !world.paused,"传送阵未通往花海");
  await visit("meadow","meadow-camp");
  assert(world.restState?.kind==="sitting","未坐到营火边");
  // Keep the real rest identity and animation callbacks; advance only the world clock.
  const t=performance.now()/1000;
  world.onTick(.016,t);
  world.onTick(.016,t+29);
  assert(!has("camp") && !world.available(campLetterSpot),"营火提前盖章或掉信");
  world.onTick(.016,t+30.05);
  assert(has("camp") && !has("letter-patrick") && !world.available(campLetterSpot),"到访、落信与拾信应为三个独立时刻");
  for (let i=1;i<=23;i++) world.onTick(.1,t+30.05+i*.1);
  assert(world.available(campLetterSpot) && !has("letter-patrick") && letterCount()===12,"放下信时已有拾信章或信件消失");
  world.standUp();
  await visit("meadow",campLetterSpot.id);
  assert(has("letter-patrick") && letterCount()===13 && !world.available(campLetterSpot),"拾起派大星的信没有收录");
  assert(state().achievements.earned.filter(id=>id.startsWith("letter-")).length===13,"十三封信与十三枚来信章没有对应");
  log("营火满 30 秒只盖到访章，落在草地时仍有 12 封，亲手拾起后 13 封来信、13 枚印章");
}
