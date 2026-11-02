import { World, scenes } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { rainbowFlowers, meadowGate } from "../src/rainbow-flowers";

// Same application as the homepage; all its saves are private to this QA tab.
const space="fufu-only-exploration-fixture/";
Object.defineProperty(window,"localStorage",{value:{
  getItem:(key:string)=>sessionStorage.getItem(space+key),
  setItem:(key:string,value:string)=>sessionStorage.setItem(space+key,value),
}});
let world!: World;
const originalLoad=World.prototype.load;
World.prototype.load=function() {
  world=this;
  World.prototype.load=originalLoad;
  return originalLoad.call(this);
};
await import("../src/main");
const q=<T extends HTMLElement=HTMLElement>(selector:string) => document.querySelector<T>(selector)!;
const expect=(ok:unknown,label:string)=>{if(!ok) throw new Error(label);};
const log=(label:string)=> {const li=document.createElement("li");li.textContent=label;q("#evidence").append(li);};
const state=()=>readProgress(localStorage.getItem(SAVE_KEY));
const wait=async(check:()=>boolean,ms=8000)=>{
  const until=performance.now()+ms;
  while (!check()) {if(performance.now()>until) throw new Error("等待游戏状态超时"); await new Promise(r=>setTimeout(r,24));}
};
const key=(name:string,down=true,el:Element=world.canvas)=>el.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key:name,bubbles:true,cancelable:true}));
async function start() {
  await wait(()=>!q<HTMLButtonElement>(".enter-button").disabled);
  q(".enter-button").click();
}
async function insideMeadow() {
  await wait(()=>world.scene==="meadow");
  expect(q("#location-name").textContent?.includes("花海"),"新地图标签有误");
  const center=scenes.meadow.spots.find(s=>s.id==="meadow-breeze")!;
  world.switchScene("meadow",center.approach); world.interact();
  expect(q(".toast").textContent?.includes("花瓣"),"花潮没有响应");
}
async function checkAll() {
  await start();
  q(".reset-button").click(); q(".reset-confirm").click();
  q(".bag-toggle").click();
  expect(!world.suspended && !world.canvas.parentElement!.inert,"探索打开背包锁住了画布");
  const x=world.player.x;
  key("ArrowRight",true,q(".bag-close")); await wait(()=>world.player.x>x+4); key("ArrowRight",false);
  const r=world.canvas.getBoundingClientRect(), startX=world.player.x;
  world.canvas.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,clientX:r.x+r.width*369/600,clientY:r.y+r.height*310/400}));
  await wait(()=>world.player.x>startX+4);
  expect(!q(".inventory-panel").hidden,"移动时背包意外关闭");
  world.clearInput(); const y=world.player.y;
  world.setTouch(0,1); await wait(()=>world.player.y>y+3); world.setTouch(0,0);
  log("背包保持展开时，方向键、鼠标寻路和触屏方向均可移动");
  key("Escape");
  expect(q(".inventory-panel").hidden,"Esc 未收起衣橱");
  for(const hazard of scenes.challenge.hazards.slice(0,2)) {
    world.switchScene("challenge",hazard); q(".bag-toggle").click();
    await wait(()=>world.scene==="room" && !q(".bed-note").hidden);
    expect(world.restState?.kind==="lying" && !world.suspended && q(".inventory-panel").hidden,"复活时角色或背包状态不正确");
    expect(q(".bed-note").textContent?.includes("辛苦啦宝宝"),"便签正文未显示");
    expect(q<HTMLImageElement>(".bed-note img").naturalWidth>0,"便签图片未载入");
    q(".note-close").click(); q(".stand-up").click();
  }
  log("两次实际撞到不同陷阱均回到床上并自动展开小叶子图文便签");
  for(const [i,flower] of rainbowFlowers.entries()) {
    expect(q<HTMLButtonElement>('[data-scene="meadow"]').hidden, "提前出现花海导航");
    world.switchScene("meadow"); expect(world.scene!=="meadow","未集齐时可以绕过入口");
    world.switchScene(flower.scene,flower.approach);
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const photo=q<HTMLCanvasElement>("#flowers").getContext("2d")!;
    const pos=world.project({x:flower.x,y:flower.y-14}), scale=world.canvas.width/600;
    photo.drawImage(world.canvas,(pos.x-54)*scale,(pos.y-44)*scale,108*scale,88*scale,i*150,0,150,112);
    photo.fillStyle="#675061"; photo.font="14px sans-serif"; photo.fillText(flower.name,i*150+6,131);
    world.interact();
    expect(state().rainbowFlowers.length===i+1,flower.name+" 的靠近点未能实际采花");
    expect(state().rainbowFlowers.includes(flower.id),"存档缺少 "+flower.name);
    world.onInteract(flower.id);
    expect(state().rainbowFlowers.length===i+1,"同一朵花被重复计算");
  }
  log("三张地图的七处交互均可采集，真实存档去重，前六朵时入口与直达均锁定");
  world.switchScene("garden",meadowGate.approach); world.interact(); await insideMeadow();
  const exit=scenes.meadow.spots.find(s=>s.id==="meadow-exit")!;
  world.switchScene("meadow",exit.approach); world.interact();
  await wait(()=>world.scene==="garden");
  expect(Math.hypot(world.player.x-meadowGate.approach.x,world.player.y-meadowGate.approach.y)<3,"返回落脚点错误");
  world.interact(); await insideMeadow();
  log("采齐后实体花门可往返，花潮可交互");
}
async function run(check:()=>Promise<void>) {
  q<HTMLButtonElement>("#verify").disabled=true; q("#report").textContent="验收中…"; q("#evidence").replaceChildren();
  try {await check();q("#report").textContent="全部通过";} catch(e) {q("#report").textContent="失败 · "+String(e);}
  finally {q<HTMLButtonElement>("#verify").disabled=false;}
}
q("#verify").addEventListener("click",()=>void run(checkAll));
q("#recheck").addEventListener("click",()=>{sessionStorage.setItem(space+"reload","1");location.reload();});
if (sessionStorage.getItem(space+"reload")) {
  sessionStorage.removeItem(space+"reload");
  void run(async()=>{
    await start();
    expect(state().rainbowFlowers.length===7 && !q<HTMLButtonElement>('[data-scene="meadow"]').hidden,"读档未恢复七花入口");
    expect(state().bedNoteUnlocked,"便签解锁没有保存在本机");
    world.switchScene("challenge",scenes.challenge.hazards[2]);
    await wait(()=>world.scene==="room" && !q(".bed-note").hidden);
    log("已解锁便签的旧存档再次触发陷阱，也会自动展信");
    q(".note-close").click(); q(".stand-up").click();
    q('[data-scene="meadow"]').click(); await insideMeadow();
    log("刷新后完整存档可重入，花海底图已就绪");
  });
}
