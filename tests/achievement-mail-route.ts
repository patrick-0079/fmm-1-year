import { arriveOnShift, scheduledResident } from "./resident-visits";
import { SAVE_KEY, readProgress } from "../src/core";
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
    ["garden","garden-guest-suyan","suyan",["你在等我吗？"]],
    ["garden","xiaoye-plush","xiaoye",[]],
    ["town","npc-radio-host","yeshenhua",["你的小牛角好可爱","看看节目单"]],
    ["town","npc-xiaoyou","xiaoyou",["收下橘子","尝一瓣","看看果篮"]],
    ["town","npc-guli","guli",["看看小鱼","你手里的是什么？"]],
    ["town","npc-post","post",["不是哦"]],
    ["challenge","visitor-rabe","rabe",[]],
    ["town","visitor-dianziyang","dianziyang",[]],
    ["garden","visitor-pigeon","pigeon",[]],
  ];
  for (const [scene,id,author,steps] of routes) {
    const count = letterCount();
    await visit(scene,id);
    for (const step of steps) choose(step);
    const final=author==="post"?"继续":"收下信";
    if (author==="xiaoye") await wait(()=>actions().some(b=>b.textContent?.startsWith(final)), "拥抱结束后没有递出信封");
    assert(letterCount()===count && !has("letter-"+author),author+" 在实际领取前提前盖章");
    choose(final);
    await wait(()=>letterCount()===count+1,author+" 实际收信后信箱数量未增加");
    if (author==="rabe") {
      assert(!has("letter-rabe"),"Rabe 的信尚未拆开就已盖章");
      choose("现在读信");
      await wait(()=>has("letter-rabe") && !q(".game-letter-reader .mail-sheet").hidden,"Rabe 的信正文出现后没有盖章");
      q(".game-letter-reader .reader-close").click();
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
  await wait(()=>world.scene==="meadow" && !world.paused,"花门未通往花海");
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
  assert(world.available(campLetterSpot) && !has("letter-patrick") && letterCount()===11,"放下信时已有拾信章或信件消失");
  world.standUp();
  await visit("meadow",campLetterSpot.id);
  assert(has("letter-patrick") && letterCount()===12 && !world.available(campLetterSpot),"拾起派大星的信没有收录");
  assert(state().achievements.earned.filter(id=>id.startsWith("letter-")).length===12,"十二封信与十二枚来信章没有对应");
  log("营火满 30 秒只盖到访章，落在草地时仍有 11 封，亲手拾起后 12 封来信、12 枚印章");
}
