import { arriveOnShift, waitForVisit, waitOnBench } from "./resident-visits";
import type { World } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { INVENTORY_KEY, readInventory } from "../src/items";
import type { SceneId } from "../src/maps";

export async function verifyGuests(world:World) {
  const buttons=()=>[...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")];
  const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
  const qStatus=()=>document.querySelector(".activity-status")!.textContent;
  const line=(text:string)=>assert(qStatus()===text,"对白有误："+text);
  const options=(...titles:string[])=>assert(JSON.stringify(buttons().map(b=>b.textContent))===JSON.stringify(titles),"选项有误："+titles.join(" / "));
  const choose=(title:string)=>{const b=buttons().find(b=>b.textContent===title);assert(b,"缺少选项："+title);b!.click();};
  const close=()=>document.querySelector<HTMLButtonElement>(".activity-close")!.click();
  const bag=()=>readInventory(localStorage.getItem(INVENTORY_KEY));
  const book=()=>readProgress(localStorage.getItem(SAVE_KEY)).achievements;
  const talk=async(id:string)=>{
    await arriveOnShift(world,"garden","garden-guest-"+id);
    world.interact();
  };
  world.switchScene("garden");
  const pet="⌈轻轻抚摸奶油猫⌋", invite="⌈带上奶油猫⌋", decline="今天就让桃桃留在你这儿吧。";
  const care="那好吧，我会帮你照顾好它，下次再来找它玩吧。";
  await talk("balloon-friend");line("快看呀，那里有只可爱的奶油猫！它的肚皮看起来软乎乎的。你想摸摸它吗？");
  assert(book().facts.includes("garden-guest-balloon-friend") && !book().facts.includes("petCat"),"初次问候和邀请同行没有分别记录");
  options(pet);choose(pet);line("它看起来很喜欢你！听说奶油猫可以为你带来好运，你要带它一起旅行吗？");
  options(invite,decline);choose(decline);line(care);assert(!bag().owned.includes("petCat"),"拒绝也领取了猫");close();
  await talk("balloon-friend");choose(pet);choose(invite);line("（获得奶油猫桃桃）");
  choose("桃桃，以后我们一起散步吧！");line("（它很喜欢你，开心地围着你蹭蹭）");close();
  assert(bag().equipped.pet==="petCat" && world.equipment.pet==="petCat","桃桃没有真正同行");
  await talk("balloon-friend");choose(pet);
  line("桃桃看起来玩得很开心。要继续一起走，还是让它在我这里歇一会儿？");
  choose("⌈继续一起走⌋");line("去吧，桃桃已经跟好啦。");close();
  await talk("balloon-friend");choose(pet);choose("⌈让桃桃休息⌋");line(care);close();
  await talk("balloon-friend");choose(pet);line("它还记得你呢。今天也要带它一起散步吗？");
  choose(invite);line("（它很喜欢你，开心地围着你蹭蹭）");close();
  assert(bag().owned.filter(id=>id==="petCat").length===1,"重复领取桃桃");
  const intro="呼，可算是弄完啦～希望芙芙会喜欢。诶？！你就是芙眠眠吗？";
  await talk("decorator");line(intro);close();
  assert(!readProgress(localStorage.getItem(SAVE_KEY)).decoratorMet,"收起即完成了初见");
  await talk("decorator");options("对，我就是哦","我不是～");choose("对，我就是哦");
  line("哇，见到本人啦！希望你会喜欢这里，这些是我费了好大劲才布置好的。芙妮宝说要为你准备一个盛大的庆典！");close();
  await talk("decorator");line("你又来啦！这是棉棉，它也想看看我挂好的彩旗。");
  choose("庆典都准备好了吗？");line(intro);choose("我不是～");line("那你见到她记得告诉她，芙妮宝准备的庆典已经可以开始啦！");close();
  await talk("decorator");choose("先让棉棉陪你");line("好呀，那我们在这里等你。逛累了就回来坐坐吧。");close();
  await talk("decorator");choose("棉棉，要跟我一起走吗？");line("那就拜托你啦。棉棉，跟好芙芙哦！\n（获得垂耳兔棉棉）");close();
  assert(bag().equipped.pet==="petBunny" && bag().owned.includes("petCat"),"棉棉覆盖了桃桃的收藏");
  assert(book().earned.includes("companions"),"分别邀请猫和兔后未收录旅伴徽章");
  await talk("decorator");choose("⌈让棉棉歇一会儿⌋");line("回来啦，棉棉。就在我旁边歇一会儿吧。");close();
  await talk("picnic-friend");line("你…你好，芙芙大人…");options("没关系，不用紧张");choose("没关系，不用紧张");
  line("谢…谢谢你。（从一旁的篮子中拿出一个蛋糕）请务必…收下这个。吃甜食会让心情变好！");
  const share="如果可以的话，请和我们一起享用这个蛋糕";options(share);choose(share);
  line("真…真的吗？（眼睛闪过不易察觉的欣喜）我…一定会去的…谢谢你！");options();close();
  await talk("picnic-friend");assert(qStatus() !== "你…你好，芙芙大人…","已一同分享蛋糕，重访却仍作初次见面");choose("晴糖，我还想尝尝你带的蛋糕。");choose(share);close();
  assert(book().facts.filter(id=>id.startsWith("garden-guest-")).length===3,"重复交谈或邀请使花园会面数失真");
  assert(!world.suspended && !world.paused,"收起后不能移动");
}

export async function verifyGardenDiscovery(world: World) {
  const state = () => readProgress(localStorage.getItem(SAVE_KEY));
  const assert = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
  const enter = async (scene: SceneId, id: string) => {
    await world.prepareScene(scene);
    world.switchScene(scene);
    const spot = world.config.spots.find(s => s.id === id)!;
    world.switchScene(scene, spot.approach);
    world.interact();
  };
  const close = () => document.querySelector<HTMLButtonElement>(".activity-close")!.click();
  for (const [scene, id] of [["challenge","elder-gardener"],["ruins","elder-guardian"]] as const) {
    await enter(scene, id);
    assert(state().achievements.facts.includes(id), "长者在说第一句对白时未计入会面：" + id);
    close();
  }
  await enter("garden", "xiaoye-plush");
  const answer = (text:string) => {
    const button=[...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")].find(b=>b.textContent===text);
    if(!button)throw Error("小叶子缺少选项 "+text);
    button.click();
  };
  answer("宝宝你这是玩偶服嘛？");
  close();
  assert(!state().achievements.facts.includes("xiaoye-plush"), "拥抱中断时过早计入小叶子会面");
  await enter("garden", "xiaoye-plush");
  answer("宝宝你这是玩偶服嘛？");
  answer("好温暖的拥抱");
  await waitForVisit(() => state().achievements.facts.includes("xiaoye-plush"), "完整拥抱后没有计入小叶子会面");
  assert([...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")].some(button => button.textContent === "⌈收下信封⌋" && !button.disabled),
    "看完拥抱后应该仍可领取未收的信");
  close();
  for (const [egg,phase] of [["sunset","dusk"],["firefly","night"],["dew","dawn"]] as const) {
    for (let i=0; world.currentPhase!==phase && i<4; i++) await waitOnBench(world);
    await enter("challenge", egg);
    await waitForVisit(() => state().achievements.facts.includes(egg), "时段彩蛋没有计入徽章：" + egg);
    close();
  }
  assert(state().achievements.earned.includes("day-secrets"), "跨天发现三种彩蛋后未获得徽章");
}
