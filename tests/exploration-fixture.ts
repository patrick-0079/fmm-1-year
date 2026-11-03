import { World, scenes } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { rainbowFlowers, meadowGate } from "../src/rainbow-flowers";
import { producers } from "../src/content";
import { JOURNEY_KEY, readJourney } from "../src/journey";
import { townGates, gateSignFoot } from "../src/gate-layout";
import { bassStand } from "../src/room-props";
import { bassScore } from "../src/bass-score";

// Same application as the homepage; all its saves are private to this QA tab.
const space="fufu-only-exploration-fixture/";
Object.defineProperty(window,"localStorage",{value:{
  getItem:(key:string)=>sessionStorage.getItem(space+key),
  setItem:(key:string,value:string)=>sessionStorage.setItem(space+key,value),
  removeItem:(key:string)=>sessionStorage.removeItem(space+key),
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
const landing=()=>readJourney(localStorage.getItem(JOURNEY_KEY),state().rainbowFlowers);
// A background preview can draw only once a second. The game deliberately caps
// movement per frame, so judge arrival by state, with time for those slow frames.
const wait=async(check:()=>boolean,ms=30000)=>{
  const until=performance.now()+ms;
  while (!check()) {if(performance.now()>until) throw new Error("等待游戏状态超时"); await new Promise(r=>setTimeout(r,24));}
};
const key=(name:string,down=true,el:Element=world.canvas)=>el.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key:name,bubbles:true,cancelable:true}));
async function start() {
  await wait(()=>!q<HTMLButtonElement>(".enter-button").disabled);
  q(".enter-button").click();
}
async function insideMeadow() {
  await wait(()=>world.scene==="meadow" && !world.paused);
  expect(q("#location-name").textContent?.includes("花海"),"新地图标签有误");
  expect(q(".time-pill").textContent?.includes("静夜"),"花海错误地显示普通地图的时间");
  expect(world.meadowSprites?.naturalWidth,"花海可互动时小羊与落星尚未就绪");
}
const meadowSpot = (id: string) => scenes.meadow.spots.find(s => s.id === id)!;
async function collectStar(person: typeof producers[number], pointer = false) {
  const spot = meadowSpot(person.id), count = state().creditStars.length;
  world.switchScene("meadow", pointer ? {x: spot.x - 39, y: spot.y + 12} : spot.approach);
  if (pointer) {
    const r = world.canvas.getBoundingClientRect(), pos = world.project({x: spot.x, y: spot.y - 10});
    world.canvas.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true, button:0,
      clientX:r.left + pos.x * r.width / 600, clientY:r.top + pos.y * r.height / 400}));
  } else { key("e"); key("e",false); }
  await wait(()=>state().creditStars.includes(person.id));
  expect(q(".star-whisper strong").textContent === person.name && q(".star-whisper span").textContent === person.message,
    "署名或寄语没有在地图中显示");
  expect(!q(".star-whisper").hidden && !world.available(spot) && !world.paused, "落星重复出现或阻挡探索");
  world.onInteract(spot.id);
  expect(state().creditStars.length===count+1, "落星被重复收集");
}
function checkHarvest() {
  const apple = scenes.garden.spots.find(s=>s.id==="apple")!;
  world.switchScene("garden", apple.approach);
  for (let i = 1; i <= 3; i++) {
    world.interact();
    expect(q(".bag-count").textContent?.includes("苹果 "+i),"苹果没有入袋");
    expect(q(".activity-status").textContent?.includes("还剩 "+(3-i)+" 颗"),"剩余的树果数量不正确");
    q(".activity-close").click();
  }
  world.interact(); expect(q(".activity-status").textContent?.includes("摘完"),"同一天能收第四颗苹果");
  q(".activity-close").click();
  const flowers = scenes.garden.spots.find(s=>s.id==="flowers")!;
  world.switchScene("garden", flowers.approach);
  for (let i = 1; i <= 3; i++) {
    world.interact();
    expect(q(".bag-count").textContent?.includes("花朵 "+i),"花朵没有入袋");
    q(".activity-close").click();
  }
  world.interact(); expect(q(".activity-status").textContent?.includes("今天采完"),"同一天能收第四丛花");
  q(".activity-close").click();
  log("摘三颗苹果、采三丛花后当日采空，背包数量与树果剩余数相符");
}
async function checkAll() {
  await start();
  q(".reset-button").click(); q(".reset-confirm").click();
  expect(!state().creditStars.length && !state().rainbowFlowers.length, "重置没有清空花谱和落星");
  expect(!producers.some(p=>q(".credits").textContent?.includes(p.name)),"页尾提前公开了名单");
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
    expect(landing()?.scene==="room" && landing()?.x===world.restState?.exit.x && landing()?.y===world.restState?.exit.y,"复活没存到床边的安全位置");
    expect(q(".bed-note").textContent?.includes("辛苦啦宝宝"),"便签正文未显示");
    expect(q<HTMLImageElement>(".bed-note img").naturalWidth>0,"便签图片未载入");
    q(".note-close").click(); q(".stand-up").click();
  }
  log("两次实际撞到不同陷阱均回到床上并自动展开小叶子图文便签");
  world.switchScene("town",scenes.town.spots.find(s=>s.id==="arcade-mines")!.approach);
  world.onInteract("arcade-mines");
  world.onAction(true); world.onAction(false); world.onAction(true); world.onAction(false);
  await wait(()=>(state().arcadeBests.mines ?? 0)>0);
  expect(q(".arcade-score span").textContent?.includes("最高 "+state().arcadeBests.mines),"翻开花田未记录实得的最高分");
  key("Escape"); key("Escape",false);
  checkHarvest();
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
  const jar = meadowSpot("meadow-jar"), fire = meadowSpot("meadow-camp");
  world.switchScene("meadow", jar.approach); world.interact();
  expect(q(".star-whisper").textContent?.includes("瓶子还空着"), "空瓶泄露了未发现的署名");
  world.switchScene("meadow",fire.approach); world.interact();
  expect(world.restState?.kind==="sitting" && q(".rest-tools").textContent?.includes("营火"),"营火旁不能坐下");
  world.interact();
  for (const [i, person] of producers.slice(0,-1).entries()) await collectStar(person,i===0);
  world.switchScene("meadow",jar.approach); world.interact();
  expect(q(".star-whisper strong").textContent===producers[0].name,"星光瓶未能重读署名");
  const exit=scenes.meadow.spots.find(s=>s.id==="meadow-exit")!;
  world.switchScene("meadow",exit.approach); world.interact();
  await wait(()=>world.scene==="garden");
  expect(q(".star-whisper").hidden && !q(".time-pill").textContent?.includes("静夜"),"花海特效或时钟泄漏到庭院");
  expect(Math.hypot(world.player.x-meadowGate.approach.x,world.player.y-meadowGate.approach.y)<3,"返回落脚点错误");
  world.interact(); await insideMeadow();
  log("实体花门可往返，营火可坐，鼠标寻路和 E 均能拾星，已拾署名可在瓶中重读");
  const initialX=world.player.x;
  key("ArrowRight"); await wait(()=>world.player.x>initialX+10); key("ArrowRight",false);
  await wait(()=>landing()?.x===world.player.x && landing()?.y===world.player.y);
  const initialY=world.player.y;
  key("ArrowDown"); await wait(()=>world.player.y>initialY+10); key("ArrowDown",false);
  q(".save-now").click();
  expect(landing()?.x===world.player.x && landing()?.y===world.player.y && q(".save-status").textContent?.includes("本机已保存 · 花海"),"手动保存没有记住地图上的实际落脚点");
  sessionStorage.setItem(space+"expected",JSON.stringify({x:world.player.x,y:world.player.y}));
  log("移动时自动存下草地上的实际位置；手账的保存按钮立即记录新位置并显示地图名");
}
async function run(check:()=>Promise<void>) {
  q<HTMLButtonElement>("#verify").disabled=true; q("#report").textContent="验收中…"; q("#evidence").replaceChildren();
  try {await check();q("#report").textContent="全部通过";} catch(e) {q("#report").textContent="失败 · "+String(e);}
  finally {q<HTMLButtonElement>("#verify").disabled=false;}
}
q("#verify").addEventListener("click",()=>void run(checkAll));
q("#check-lanes").addEventListener("click",()=>void run(async()=>{
  if(!q(".intro-screen").classList.contains("dismissed")) await start();
  q(".reset-button").click(); q(".reset-confirm").click(); // This fixture owns an isolated save.
  const photos=q("#lane-photos");
  photos.innerHTML="<h2>芙芙的小世界 · 场景实拍</h2><div class=\"tiles\"></div>";
  const capture=async(title:string,cx:number,cy:number,w:number)=>{
    await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const pos=world.project({x:cx,y:cy}), zoom=world.project({x:cx+1,y:cy}).x-pos.x;
    const ratio=world.canvas.width/600, h=w*108/176;
    const sx=Math.max(0,Math.min(600-w*zoom,pos.x-w*zoom/2)), sy=Math.max(0,Math.min(400-h*zoom,pos.y-h*zoom/2));
    const el=document.createElement("figure"),canvas=document.createElement("canvas"),cap=document.createElement("figcaption");
    canvas.width=352; canvas.height=216;
    canvas.getContext("2d")!.drawImage(world.canvas,sx*ratio,sy*ratio,w*zoom*ratio,h*zoom*ratio,0,0,352,216);
    cap.textContent=title; el.append(canvas,cap); photos.querySelector(".tiles")!.append(el);
  };
  const clickAt=(x:number,y:number)=>{
    const p=world.project({x,y}), b=world.canvas.getBoundingClientRect();
    world.canvas.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,clientX:b.left+p.x*b.width/600,clientY:b.top+p.y*b.height/400}));
  };
  world.switchScene("room",bassStand.spot.approach);
  clickAt(bassStand.x,bassStand.y-29);
  await wait(()=>!q(".bass-hud").hidden);
  q<HTMLButtonElement>('[data-string="0"]').click(); key("2");key("2",false);
  expect(q(".bass-count").textContent==="已弹 2 / 16","乐谱没有收到鼠标和键盘拨弦");
  key("Escape"); key("Escape",false);
  await capture("晚安小屋 · 窗边的白色贝斯",403,92,146);
  log("点琴身打开周年琴谱，鼠标和键盘都能跟弹，Esc 返回原地");
  const flower=rainbowFlowers[0];
  world.switchScene("garden",flower.approach);
  await capture("周年庭院 · 茶桌旁的七色小花",flower.x+6,flower.y-13,115);
  clickAt(flower.x,flower.y-8); await wait(()=>state().rainbowFlowers.includes(flower.id));
  const [south,bridge,townSouth,stairs]=townGates;
  world.switchScene("garden",south.approach);
  await capture("花园南门 · 从石径走进小镇",south.x-29,south.y-29,191);
  const reached=async(g: typeof townGates[number])=>{
    try { await wait(()=>world.scene===g.scene && !world.paused); } catch {
      throw new Error("未抵达 "+g.id+"；当前 "+world.scene+" "+world.player.x+","+world.player.y+"；"+q(".toast").textContent);
    }
    expect(Math.hypot(world.player.x-g.approach.x,world.player.y-g.approach.y)<1,"入口两端没有配对到相应落脚点："+g.id);
  };
  const walkUntil=async(direction:string, arrived:()=>Promise<void>)=>{
    key(direction); try { await arrived(); } finally { key(direction,false); }
  };
  await walkUntil("ArrowDown",()=>reached(townSouth));
  await capture("小镇南街 · 池塘边的回程门",townSouth.x,townSouth.y-22,180);
  world.interact(); await reached(south);
  world.switchScene("garden",bridge.approach);
  await capture("东北木桥 · 沿溪去北街",bridge.x-34,bridge.y+12,180);
  const sign=gateSignFoot(bridge);
  clickAt(sign.x,sign.y-20); await reached(stairs);
  await walkUntil("ArrowUp",()=>reached(bridge));
  log("南门步行进入、互动返回；北桥路牌可点，从镇北石阶步行可原路返回");
  for(const f of rainbowFlowers) if(!state().rainbowFlowers.includes(f.id)) {
    world.switchScene(f.scene,f.approach); world.interact();
  }
  world.switchScene("garden",meadowGate.approach); world.interact(); await insideMeadow();
  await capture("夜间花海 · 月芽传送阵",83,224,146);
  await walkUntil("ArrowLeft",()=>wait(()=>world.scene==="garden" && !world.paused));
  expect(Math.hypot(world.player.x-meadowGate.approach.x,world.player.y-meadowGate.approach.y)<1,"踏入阵心没有回到七色花门");
  log("月芽传送阵不会在落地时触发；走入阵心才返回庭院七色花门");
}));
q("#check-bass").addEventListener("click",()=>void run(async()=>{
  if(!q(".intro-screen").classList.contains("dismissed")) await start();
  q(".reset-button").click(); q(".reset-confirm").click();
  world.switchScene("room",bassStand.spot.approach);
  const pos=world.project({x:bassStand.x,y:bassStand.y-28}), rect=world.canvas.getBoundingClientRect();
  const pointer={bubbles:true,pointerType:"mouse",clientX:rect.left+pos.x*rect.width/600,clientY:rect.top+pos.y*rect.height/400};
  world.canvas.dispatchEvent(new PointerEvent("pointermove",pointer));
  expect(world.canvas.hasAttribute("data-pointable"),"琴身没有显示互动指针");
  world.canvas.dispatchEvent(new PointerEvent("pointerdown",{...pointer,button:0})); await wait(()=>!q(".bass-hud").hidden);
  q<HTMLButtonElement>('[data-string="3"]').click(); expect(q(".bass-count").textContent==="已弹 0 / 16","弹错不该推进");
  q(".bass-listen").click(); expect(q(".bass-hud").dataset.mode==="demo","示范没有开始");
  q(".bag-toggle").click(); expect(!q(".inventory-panel").hidden && world.suspended && q(".bass-hud").dataset.mode==="practice","背包未暂停示范");
  key("Escape"); expect(!world.suspended && !q(".bass-hud").hidden,"合上背包后曲谱没有恢复");
  for(const n of bassScore) q<HTMLButtonElement>('[data-string="'+n.string+'"]').click();
  expect(state().bassSongPlayed && q(".bass-hud").dataset.mode==="complete","鼠标演奏没有赠曲");
  q(".bass-again").click();
  for(const n of bassScore) {const k=String(n.string+1); key(k);key(k,false);}
  expect(q(".bass-count").textContent==="已弹 16 / 16","纯键盘未能完成");
  key("Escape");key("Escape",false); expect(q(".bass-hud").hidden && !world.paused,"收谱后仍然锁住地图");
  log("点琴身、错弦、示范、打开背包再返回、全鼠标与全键盘各弹完 16 音、赠曲本机记录均正常");
  const dbg=(cmd:string)=>q<HTMLButtonElement>('[data-debug="'+cmd+'"]');
  q(".debug-trigger").click(); dbg("wardrobe").click(); expect(dbg("wardrobe").getAttribute("aria-pressed")==="false","试穿开关没有切换");
  dbg("wardrobe").click(); dbg("flower-door").click();expect(world.canEnter("meadow") && state().rainbowFlowers.length===0,"临时花门污染了花谱");
  dbg("flower-door").click(); expect(!world.canEnter("meadow"),"临时花门没有关闭");
  dbg("map:town").click(); await wait(()=>world.scene==="town" && !world.suspended);
  const photos=q("#town-samples");photos.replaceChildren();
  for(const [phase,label] of [["dawn","清晨"],["day","白昼"],["dusk","黄昏"],["night","星夜"]]) {
    q(".debug-trigger").click();dbg("time:"+phase).click();q(".debug-close").click();
    await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const cell=document.createElement("figure"), picture=document.createElement("canvas"), cap=document.createElement("figcaption");
    picture.width=300;picture.height=200;picture.getContext("2d")!.drawImage(world.canvas,0,0,300,200);
    cap.textContent=label;cell.append(picture,cap);photos.append(cell);
    expect(q(".time-pill").dataset.phase===phase,"小镇时段错误");
  }
  q(".debug-trigger").click();dbg("time:auto").click();q(".debug-close").click();
  const board=world.canvas.parentElement!; board.scrollIntoView({block:"center",behavior:"instant"});
  const sy=scrollY;
  world.switchScene("town",scenes.town.spots.find(s=>s.id==="arcade-hop")!.approach);
  world.interact();world.onAction(true);world.onAction(false);
  await new Promise(r=>setTimeout(r,450));
  expect(Math.abs(scrollY-sy)<3,"打开或开始小游戏后页面被滚动："+sy+" → "+scrollY);
  const sy2=scrollY;q(".bag-toggle").click();const b=q(".inventory-panel").getBoundingClientRect();
  expect(!q(".inventory-panel").hidden && b.top>=0 && b.bottom<=innerHeight+1 && Math.abs(scrollY-sy2)<3,"背包没有在当前视口打开");
  key("Escape"); expect(!q(".arcade-hud").hidden && !world.suspended,"背包关闭后小游戏未恢复");
  key("Escape");
  log("调试试穿、花门预览与真实存档相互独立；小镇四时段、跳台开局不滚动、小游戏内打开背包均通过");
}));
q("#camp-preview").addEventListener("click",()=>void run(async()=>{
  if (!q(".intro-screen").hidden && world.paused) await start();
  for (const flower of rainbowFlowers) {
    if (state().rainbowFlowers.includes(flower.id)) continue;
    world.switchScene(flower.scene,flower.approach);
    world.interact();
  }
  q('[data-scene="meadow"]').click(); await insideMeadow();
  world.switchScene("meadow",{x:232,y:227});
  world.canvas.scrollIntoView({block:"center"});
  world.canvas.focus({preventScroll:true});
  log("营地实景，可直接点草地上的星星、营火或星光瓶");
}));
// Meter the game's own media elements. The graph stays entirely inside this QA page.
let meterContext: AudioContext | undefined;
const meters=new WeakMap<HTMLAudioElement,AnalyserNode>();
q("#check-sound").addEventListener("click",()=>void run(async()=>{
  meterContext ??= new AudioContext();
  await meterContext.resume();
  if(!q(".intro-screen").classList.contains("dismissed")) await start();
  const saved=state();
  if(saved.bgm) q(".music-toggle").click();
  if(saved.sound) q(".sound-toggle").click();
  world.switchScene("room",bassStand.spot.approach); world.interact();
  if(!state().bassSound || state().volume===0) q(".bass-voice").click();
  const lower=q<HTMLButtonElement>(".volume-down");
  for(let step=0;step<11 && !lower.disabled;step++) lower.click();
  expect(!q(".bass-muted-tip").hidden && q(".bass-muted-tip").textContent?.includes("总音量为零"),"琴谱没有解释总音量为零");
  q(".bass-voice").click();
  expect(q(".bass-muted-tip").hidden && state().volume===.45,"一键恢复总音量失败");
  const measure=async(audio:HTMLAudioElement,trigger:()=>void,label:string)=>{
    let meter=meters.get(audio);
    if(!meter) {
      meter=meterContext!.createAnalyser(); meter.fftSize=4096;
      meterContext!.createMediaElementSource(audio).connect(meter).connect(meterContext!.destination);
      meters.set(audio,meter);
    }
    const wave=new Float32Array(meter.fftSize); let peak=0;
    trigger();
    await wait(()=>{meter.getFloatTimeDomainData(wave);for(const s of wave) peak=Math.max(peak,Math.abs(s));
      return !audio.muted && audio.currentTime>0 && peak>.008;},10000);
    log(label+"：媒体实际前进，输出峰值 "+peak.toFixed(3));
  };
  for(const [index,pitch] of [31,35,38,43].entries()) {
    const audio=q<HTMLAudioElement>('[data-bass-note="'+pitch+'"]');
    await measure(audio,()=>{if(index%2) {key(String(index+1));key(String(index+1),false);}
      else q<HTMLButtonElement>('[data-string="'+index+'"]').click();},["E 弦","A 弦","D 弦","G 弦"][index]);
  }
  const demo=q<HTMLAudioElement>("[data-bass-demo]");
  await measure(demo,()=>q(".bass-listen").click(),"完整周年示范");
  await wait(()=>demo.currentTime>1.6 && q(".bass-phrase .current strong").textContent!=="窗");
  q(".bass-voice").click(); expect(demo.muted && !q(".bass-muted-tip").hidden,"示范没有响应琴声静音");
  q(".bass-voice").click(); expect(!demo.muted,"示范没有恢复声音");
  q(".bass-leave").click(); expect(demo.paused,"离开琴谱后仍然播放");
  log("背景音乐和游戏音效关闭时仍可弹琴，示范随音轨走谱；静音、恢复和离开均正常");
}));
q("#check-market").addEventListener("click",()=>void run(async()=>{
  if(!q(".intro-screen").classList.contains("dismissed")) await start();
  q(".reset-button").click(); q(".reset-confirm").click();
  world.switchScene("town",{x:572,y:644});
  key("ArrowLeft");try{await wait(()=>world.player.x<=518);}finally{key("ArrowLeft",false);}
  expect(world.player.y===644,"没有跨过南侧路沿");
  const counter=scenes.town.spots.find(s=>s.id==="arcade-hop")!;
  const rect=world.canvas.getBoundingClientRect(),pos=world.project({x:counter.x,y:counter.y-24});
  world.canvas.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,
    clientX:rect.left+pos.x*rect.width/600,clientY:rect.top+pos.y*rect.height/400}));
  await wait(()=>!q(".arcade-hud").hidden);
  expect(q(".arcade-title").textContent==="月兔跳一跳","未能从主街进入月兔台");
  q(".arcade-close").click(); log("方向键从主街跨过路沿，点击月兔台可从摊位正面进入跳一跳");
  const orange=rainbowFlowers[1];world.switchScene(orange.scene,orange.approach);world.interact();
  expect(state().rainbowFlowers.includes("prism-calendula"),"橙色金盏菊没有正常采集");
  const wreath=scenes.garden.spots.find(s=>s.id==="wreath")!;
  world.switchScene("garden",wreath.approach);world.interact();q(".activity-close").click();
  const prefs=state(), bag=localStorage.getItem("fufu-souvenirs-v1");
  expect(bag?.includes("wreath") && !!landing(),"清档验收缺少真实收藏或位置存档");
  const debug=(cmd:string)=>q<HTMLButtonElement>('[data-debug="'+cmd+'"]');
  q(".debug-trigger").click(); q<HTMLDetailsElement>(".debug-storage").open=true;
  debug("erase").click();debug("keep").click();
  expect(localStorage.getItem("fufu-souvenirs-v1")===bag && state().rainbowFlowers.includes(orange.id),"取消也清空了存档");
  debug("erase").click();debug("confirm-erase").click();
  expect(!landing() && !state().rainbowFlowers.length && !localStorage.getItem("fufu-souvenirs-v1"),"清档仍有收藏或旧位置");
  expect(world.scene==="room" && world.paused && !q(".intro-screen").classList.contains("dismissed"),"清档没有回到开始页");
  const empty=state(); expect(empty.volume===prefs.volume && empty.bgm===prefs.bgm && empty.sound===prefs.sound && empty.bassSound===prefs.bassSound,"清档丢失声音设置");
  log("取消保留金盏菊和背包；确认清空后开始页、收集、位置及音量设置均正确");
}));
q("#recheck").addEventListener("click",()=>{sessionStorage.setItem(space+"reload","1");location.reload();});
if (sessionStorage.getItem(space+"reload")) {
  sessionStorage.removeItem(space+"reload");
  void run(async()=>{
    await wait(()=>!q<HTMLButtonElement>(".enter-button").disabled);
    const p=JSON.parse(sessionStorage.getItem(space+"expected") || "null");
    expect(world.paused && q(".enter-button").textContent?.includes("继续上次的冒险") && q(".intro-screen small").textContent?.includes("花海"),"读档前没有在开始页等候点击继续");
    await start();
    await insideMeadow();
    expect(p && world.player.x===p.x && world.player.y===p.y,"继续冒险后没有回到原来站立的草地");
    log("刷新后从「继续上次的冒险」进入花海，精确恢复上次站立位置");
    expect(state().rainbowFlowers.length===7 && !q<HTMLButtonElement>('[data-scene="meadow"]').hidden,"读档未恢复七花入口");
    expect(state().bedNoteUnlocked,"便签解锁没有保存在本机");
    world.switchScene("challenge",scenes.challenge.hazards[2]);
    await wait(()=>world.scene==="room" && !q(".bed-note").hidden);
    log("已解锁便签的旧存档再次触发陷阱，也会自动展信");
    q(".note-close").click(); q(".stand-up").click();
    world.switchScene("town",scenes.town.spots.find(s=>s.id==="arcade-mines")!.approach);
    world.onInteract("arcade-mines");
    expect((state().arcadeBests.mines ?? 0)>0 && q(".arcade-score strong").textContent==="0" &&
      q(".arcade-score span").textContent?.includes("最高 "+state().arcadeBests.mines),"新一局没有保留之前实际打出的最高分");
    log("新一局扫雷从零开始，分数牌仍显示刷新前打出的个人最高分");
    key("Escape"); key("Escape",false);
    q('[data-scene="meadow"]').click(); await insideMeadow();
    expect(state().creditStars.length>=producers.length-1,"刷新后落星进度丢失");
    for (const p of producers.filter(p=>state().creditStars.includes(p.id)))
      expect(!world.available(meadowSpot(p.id)), "读档后星星重新出现");
    const last=producers.at(-1)!;
    if (!state().creditStars.includes(last.id)) await collectStar(last);
    const jar=meadowSpot("meadow-jar");
    world.switchScene("meadow",jar.approach);
    for(const p of producers) {
      world.interact();
      expect(q(".star-whisper strong").textContent===p.name,"星光瓶回看漏掉 "+p.name);
    }
    log("刷新后继续拾齐全部落星，星光瓶能够依次重读每一位制作人的寄语");
  });
}
