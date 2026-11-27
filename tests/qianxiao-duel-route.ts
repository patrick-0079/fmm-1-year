import { readProgress, SAVE_KEY } from "../src/core";
import { playDuelMove, qianxiaoMove, startDuel, type Duel } from "../src/qianxiao-duel";
import type { World } from "../src/world";
import { arriveOnShift, waitForVisit, waitOnBench } from "./resident-visits";

function deckSeed() {
  let seed=74;
  return () => (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
}
function knownDeal(click:()=>void) {
  const previous=Math.random;
  try { Math.random=deckSeed();click(); } finally { Math.random=previous; }
}
const actions=()=>[...document.querySelectorAll<HTMLButtonElement>(".activity-actions button:enabled")];
const label=(part:string)=>actions().find(b=>b.textContent?.includes(part));
function press(selector:string) {
  const control=document.querySelector<HTMLButtonElement>(".duel-panel "+selector+":enabled");
  if(!control)throw Error("浅笑牌桌缺少可操作的 "+selector);
  control.click();
}

/** A known shuffle only fixes the opening order. Resolve every turn through the real board buttons. */
export async function verifyDuelStamp(world:World) {
  const stamp=()=>readProgress(localStorage.getItem(SAVE_KEY)).achievements.earned.includes("qianxiao-duel-win");
  let invitation: HTMLButtonElement | undefined;
  for(let i=0;i<6 && !invitation;i++) {
    await arriveOnShift(world,"town","npc-qianxiao");
    world.interact();
    const intro=label("这张是什么呀");
    if(intro)intro.click();
    invitation=label("与浅笑开一局牌局");
    if(!invitation){
      document.querySelector<HTMLButtonElement>(".activity-close")!.click();
      if(!intro)await waitOnBench(world);
    }
  }
  if(!invitation)throw Error("没有从浅笑的时段对话进入牌局");
  knownDeal(()=>invitation!.click());
  const night=label("开始牌局");if(night)knownDeal(()=>night.click());
  const guide=label("发牌，开始对局");if(guide)knownDeal(()=>guide.click());
  const g=startDuel(deckSeed());
  while(!g.winner) {
    if(g.turn==="qianxiao"){playDuelMove(g,qianxiaoMove(g)!);continue;}
    await waitForVisit(()=>!!document.querySelector(".duel-panel [data-end-turn]:enabled"),"浅笑没有结束回合");
    const visible:Duel={...g,turn:"qianxiao",player:g.qianxiao,qianxiao:g.player};
    const move=qianxiaoMove(visible)!;
    if(move.kind==="end")press("[data-end-turn]");
    else {
      press(move.kind==="attack"?'[data-monster="'+move.monster+'"]':'[data-card="'+move.card+'"]');
      if(move.kind==="spell" || move.kind==="attack"){
        const healing=move.kind==="spell" && g.player.hand.find(c=>c.id===move.card)?.kind==="wish";
        press('[data-side="'+(healing?"player":"qianxiao")+'"][data-target="'+move.target+'"]');
      }
    }
    playDuelMove(g,move);
  }
  await waitForVisit(()=>!!label("回到地图"),"牌局没有进入结算");
  if(g.winner!=="player" || !stamp())throw Error("真实胜利未颁发浅笑首胜章");
  label("回到地图")!.click();
}
