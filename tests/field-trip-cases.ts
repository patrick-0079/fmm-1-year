import type { World } from "../src/world";
import { scenes } from "../src/maps";
import { townEchoGate, ruinsExit } from "../src/ruins-map";
import { sceneArt } from "../src/scene-art";
import { readInventory, INVENTORY_KEY } from "../src/items";

export async function verifyFieldTrip(world:World, log:(text:string)=>void) {
  const canvas=world.canvas, hud=document.querySelector<HTMLElement>(".activity-hud")!;
  const assert=(v:unknown,message:string)=>{if(!v)throw Error(message);};
  const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
  const wait=async(check:()=>boolean,label:string)=>{
    const until=performance.now()+75000;
    while(!check()){if(performance.now()>until)throw Error(label);await pause(25);}
  };
  const key=(value:string,pressed:boolean)=>canvas.dispatchEvent(new KeyboardEvent(pressed?"keydown":"keyup",{key:value,bubbles:true,cancelable:true}));
  const press=(name:string)=>Array.from(hud.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent===name)!.click();
  const walk=async(name:string,arrived:()=>boolean)=>{
    key(name,true);try{await wait(arrived,"行走受阻 "+name);}finally{key(name,false);}
  };
  await world.prepareScene("town");
  world.switchScene("town",scenes.town.spawn);
  world.visit(townEchoGate.id);
  await wait(()=>world.scene==="ruins" && !world.paused,"从广场到不了东北山洞");
  world.visit(ruinsExit.id);await wait(()=>world.scene==="town" && !world.paused,"南阶没有送回矿场");
  assert(Math.hypot(world.player.x-townEchoGate.approach.x,world.player.y-townEchoGate.approach.y)<2,"返回点偏离洞口");
  log("从广场沿东北街自动寻路入洞，遗迹南阶返回废轨前");
  const florist=scenes.town.spots.find(s=>s.id==="npc-florist")!;
  world.switchScene("town",florist.approach);world.interact();assert(!hud.hidden,"镇民没有开口");
  await walk("ArrowRight",()=>hud.hidden && world.player.x>florist.x+85);
  log("持续按方向键走远后小镇对白自动收起，移动仍在继续");
  await world.prepareScene("garden");
  const star=scenes.garden.spots.find(s=>s.id==="garden-guest-balloon-friend")!;
  world.switchScene("garden",star.approach);world.interact();press("轻轻抚摸奶油猫");
  const stale=Array.from(hud.querySelectorAll<HTMLButtonElement>(".activity-actions button")).find(b=>b.textContent==="带上奶油猫")!;
  const dest={x:390,y:323}, pos=world.project(dest), r=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,pointerType:"mouse",clientX:r.left+r.width*pos.x/600,clientY:r.top+r.height*pos.y/400}));
  await wait(()=>hud.hidden,"离开星星后仍在对话");stale.click();
  await wait(()=>Math.hypot(world.player.x-dest.x,world.player.y-dest.y)<2,"关闭对话截断了点击寻路");
  assert(!readInventory(localStorage.getItem(INVENTORY_KEY)).owned.includes("petCat"),"旧选项误发了桃桃");
  world.switchScene("garden",star.approach);world.interact();press("轻轻抚摸奶油猫");press("带上奶油猫");press("继续");
  hud.querySelector<HTMLButtonElement>(".activity-close")!.click();
  log("花园离开时清掉旧选项，回去能重新邀请桃桃");
  world.switchScene("room",{x:205,y:290});
  const ctx=canvas.getContext("2d")!, draw=ctx.drawImage, frames=new Set<string>();
  ctx.drawImage=function(...args:Parameters<typeof draw>){
    if(args[0]===sceneArt.peachWalk){
      const cell=sceneArt.peachWalk.width/4;
      frames.add((ctx.getTransform().a<0?"mirror":"base")+":"+args[2]/cell+":"+args[1]/cell);
    }
    draw.apply(ctx,args);
  } as typeof draw;
  try {
    await walk("ArrowRight",()=>world.player.x>=292);await walk("ArrowDown",()=>world.player.y>=365);
    await walk("ArrowLeft",()=>world.player.x<=201);await walk("ArrowUp",()=>world.player.y<=284);
    const phases=matchMedia("(prefers-reduced-motion: reduce)").matches?[0,2]:[0,1,2,3];
    for(const dir of ["base:0","mirror:0","base:1","base:2"])
      for(const i of phases)assert(frames.has(dir+":"+i),"缺失实际步态 "+dir+":"+i);
    await pause(750);frames.clear();await pause(320);
    assert(frames.size===1 && [...frames][0].endsWith(":1"),"停下后桃桃仍在滑步");
  } finally {ctx.drawImage=draw;}
  log("实测桃桃东西南北跟随、四拍换脚与停步");
}
