import { World, type DepthLayer } from "../src/world";
import type { Point } from "../src/core";
import type { SceneId } from "../src/maps";
import { gardenForeground } from "../src/garden-foreground";
import { townForeground } from "../src/town-foreground";

// This standalone page uses the complete game but never writes its real saves.
const prefix="fufu-depth-fixture/";
Object.defineProperty(window,"localStorage",{value:{
  getItem:(key:string)=>sessionStorage.getItem(prefix+key),
  setItem:(key:string,value:string)=>sessionStorage.setItem(prefix+key,value),
  removeItem:(key:string)=>sessionStorage.removeItem(prefix+key),
}});
let world!:World;
const originalLoad=World.prototype.load;
World.prototype.load=function(){world=this;World.prototype.load=originalLoad;return originalLoad.call(this);};
await import("../src/main");

interface DepthCase {
  id:string;
  scene:SceneId;
  depth:number;
  solid:Point[];
  clear:Point[];
  // Other scenery can legitimately cover a doorway in the complete scene.
  // Those holes are still checked using the real fragment renderer below.
  occludedClear?:number[];
  // The old lamp's right handle aperture is less than two device pixels wide
  // at DPR 1 on a 390 px screen; permit edge antialiasing, never an opaque fill.
  subpixelClear?:number[];
  actor?:{x:number;positions:number[]};
  existingOutline?:Point[];
}
// Pixel landmarks are authored independently of the masks. Deriving them from
// those polygons would let an accidentally filled doorway pass its own test.
const gardenScale=900/1536;
const gp=(x:number,y:number):Point=>({x:x*gardenScale,y:y*gardenScale});
const cases:DepthCase[]=[
  {id:"south-rose-arch",scene:"garden",depth:976*gardenScale,solid:[gp(750,830)],clear:[gp(750,900),gp(750,984)],actor:{x:750*gardenScale,positions:[860,950,980].map(y=>y*gardenScale)}},
  {id:"west-rose-crown",scene:"garden",depth:760*gardenScale,solid:[gp(218,676)],clear:[gp(211,725),gp(211,782)],actor:{x:210*gardenScale,positions:[714,750,790].map(y=>y*gardenScale)}},
  {id:"west-alcove-arch",scene:"garden",depth:606*gardenScale,solid:[gp(198,510)],clear:[gp(204,564),gp(204,614)],occludedClear:[0,1]},
  {id:"northeast-bench-arbour",scene:"garden",depth:184*gardenScale,solid:[gp(1100,114)],clear:[gp(1100,138),gp(1100,192)]},
  {id:"garden-gate-lamp",scene:"garden",depth:984*gardenScale,solid:[gp(625,874)],clear:[gp(616,854),gp(635,856),gp(625,991)],subpixelClear:[1],existingOutline:[gp(605,841),gp(644,991)]},
  {id:"northwest-path-lamp",scene:"garden",depth:418*gardenScale,solid:[gp(670,345)],clear:[gp(710,365),gp(670,433)]},
  {id:"northeast-path-lamp",scene:"garden",depth:418*gardenScale,solid:[gp(832,345)],clear:[gp(795,365),gp(832,433)]},
  {id:"southwest-square-lamp",scene:"garden",depth:735*gardenScale,solid:[gp(659,695)],clear:[gp(700,705),gp(659,750)]},
  {id:"southeast-square-lamp",scene:"garden",depth:735*gardenScale,solid:[gp(843,695)],clear:[gp(800,705),gp(843,750)]},
  {id:"flower-arch",scene:"town",depth:328,solid:[{x:236,y:262}],clear:[{x:234,y:295},{x:233,y:338}]},
  {id:"pond-arch",scene:"town",depth:909,solid:[{x:928,y:834}],clear:[{x:929,y:878},{x:926,y:916}]},
  {id:"quarry-lintel",scene:"town",depth:91,solid:[{x:1428,y:31}],clear:[{x:1428,y:65},{x:1428,y:99}]},
  {id:"north-stair-pennants",scene:"town",depth:272,solid:[{x:525,y:200}],clear:[{x:536,y:209},{x:536,y:280}]},
  {id:"bakery-stair-pennants",scene:"town",depth:362,solid:[{x:742,y:337}],clear:[{x:750,y:348},{x:750,y:370}]},
];
const run=document.querySelector<HTMLButtonElement>("#depth-run")!;
const summary=document.querySelector<HTMLElement>("#depth-summary")!;
const results=document.querySelector<HTMLElement>("#depth-results")!;
const gallery=document.querySelector<HTMLElement>("#depth-gallery")!;
const wait=async(check:()=>boolean)=>{const until=performance.now()+20000;while(!check()){if(performance.now()>until)throw Error("地图加载超时");await new Promise(done=>setTimeout(done,20));}};
const assert=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
const rgb=[255,0,255];
type Sample={point:Point;rgb:number[]};
type Evidence={id:string;scene:SceneId;depth:number;behind:Sample[];front:Sample[];mask?:Sample[];occludedClear?:number[];status:string};
const evidence:Evidence[]=[];
function drawNow(){(world as unknown as {draw:()=>void}).draw();}
function sample(point:Point):Sample {
  const p=world.project(point),canvas=world.canvas;
  const x=Math.floor(p.x*canvas.width/600),y=Math.floor(p.y*canvas.height/400);
  assert(x>=0&&y>=0&&x<canvas.width&&y<canvas.height,"采样点超出当前视口");
  return {point,rgb:[...canvas.getContext("2d")!.getImageData(x,y,1,1).data].slice(0,3)};
}
const pink=(value:Sample,tolerance=3)=>value.rgb.every((v,i)=>Math.abs(v-rgb[i])<=tolerance);
function capture(points:Point[]) {
  const projected=points.map(p=>world.project(p));
  const left=Math.max(0,Math.floor(Math.min(...projected.map(p=>p.x))-25));
  const top=Math.max(0,Math.floor(Math.min(...projected.map(p=>p.y))-25));
  const right=Math.min(600,Math.ceil(Math.max(...projected.map(p=>p.x))+25));
  const bottom=Math.min(400,Math.ceil(Math.max(...projected.map(p=>p.y))+30));
  const image=document.createElement("canvas");image.width=(right-left)*2;image.height=(bottom-top)*2;
  const c=image.getContext("2d")!;c.imageSmoothingEnabled=false;
  c.drawImage(world.canvas,left*world.canvas.width/600,top*world.canvas.height/400,
    (right-left)*world.canvas.width/600,(bottom-top)*world.canvas.height/400,0,0,image.width,image.height);
  return image.toDataURL();
}
async function verify(test:DepthCase){
  const foreground=test.scene==="town"?townForeground:gardenForeground;
  const target=test.existingOutline?{id:test.id,y:test.depth,points:test.existingOutline}:foreground.find(f=>f.id===test.id);
  assert(target,"缺少前景定义 "+test.id);
  assert(Math.abs(target!.y-test.depth)<.5,"前景深度偏离实景柱脚："+target!.y+" / "+test.depth);
  await world.prepareScene(test.scene);world.switchScene(test.scene);
  const center={x:(Math.min(...target!.points.map(p=>p.x))+Math.max(...target!.points.map(p=>p.x)))/2,y:test.depth-30};
  const saved={layers:world.getDepthLayers,hidden:world.actorHidden,paused:world.paused,
    light:world.onLighting,effects:world.onEffects,overlay:world.onOverlay,draw:world.onDraw,player:{...world.player}};
  const section=document.createElement("section"),heading=document.createElement("h2"),images=document.createElement("div");
  heading.textContent=test.scene+" · "+test.id;images.className="depth-images";section.append(heading,images);gallery.append(section);
  const bounds=[...target!.points,...test.solid,...test.clear,{x:center.x,y:test.depth+15}];
  const photo=(title:string)=>{const figure=document.createElement("figure"),img=document.createElement("img"),caption=document.createElement("figcaption");img.src=capture(bounds);img.alt=title;caption.textContent=title;figure.append(img,caption);images.append(figure);};
  const points=[...test.solid,...test.clear];
  const probe=(depth:number):DepthLayer=>({y:depth,draw(c){c.fillStyle="#ff00ff";for(const p of points)c.fillRect(p.x-4,p.y-4,8,8);}});
  const record:Evidence={id:test.id,scene:test.scene,depth:test.depth,behind:[],front:[],occludedClear:test.occludedClear,status:"检查中"};evidence.push(record);
  try{
    world.clearInput();world.paused=true;world.actorHidden=true;
    world.onLighting=()=>{};world.onEffects=()=>{};world.onOverlay=()=>{};world.onDraw=()=>{};
    world.setFocus(center,1.3);
    drawNow();photo("原景（不含人物）");
    world.getDepthLayers=()=>[...saved.layers(),probe(test.depth-1)];drawNow();
    record.behind=points.map(sample);photo("脚底在柱后：拱顶遮挡；门洞保留（其他前景树仍会遮挡）");
    world.getDepthLayers=()=>[...saved.layers(),probe(test.depth+1)];drawNow();
    record.front=points.map(sample);photo("脚底在柱前：拱门不再遮挡；其他前景保留");
    if(!test.existingOutline){
      // Use World.draw and drawMapFragment, never a duplicate polygon renderer.
      // Removing unrelated foliage only for this extra mask check lets a tree
      // in front of the west alcove coexist with a genuinely transparent arch.
      world.getDepthLayers=()=>[{y:target!.y,draw:c=>world.drawMapFragment(c,target!.points)},probe(test.depth-1)];
      drawNow();record.mask=points.map(sample);
    }
    world.getDepthLayers=saved.layers;world.actorHidden=false;
    const positions=test.actor?.positions??[test.solid[0].y+24,test.depth-18,test.depth+15];
    for(const [index,label]of ["人物经过上方背后","人物位于门洞／支柱中段","人物站在门前／柱前"].entries()){world.player={x:test.actor?.x??center.x,y:positions[index]};drawNow();photo(label);}
    assert(record.behind.slice(0,test.solid.length).every(p=>!pink(p)),"柱后人物压在实体拱顶上");
    assert(record.behind.slice(test.solid.length).every((p,i)=>test.occludedClear?.includes(i)?!pink(p):pink(p,test.subpixelClear?.includes(i)?40:3)),"完整场景门洞/地面遮挡不符合实景");
    assert(record.front.every((p,i)=>i>=test.solid.length&&test.occludedClear?.includes(i-test.solid.length)?!pink(p):pink(p)),"柱前人物遮挡不符合实景");
    if(record.mask){
      assert(record.mask.slice(0,test.solid.length).every(p=>!pink(p)),"单片拱顶遮罩未覆盖实体");
      assert(record.mask.slice(test.solid.length).every(p=>pink(p)),"门洞/地面被单片前景贴图擦除");
    }
    record.status="通过";
  }catch(error){record.status=String(error);throw error;}
  finally{
    const report=document.createElement("pre");report.textContent=JSON.stringify(record,null,2);section.append(report);
    world.getDepthLayers=saved.layers;world.actorHidden=saved.hidden;world.paused=saved.paused;
    world.onLighting=saved.light;world.onEffects=saved.effects;world.onOverlay=saved.overlay;world.onDraw=saved.draw;
    world.player=saved.player;world.setFocus(null);drawNow();
  }
}
async function verifyAll(){
  run.disabled=true;results.replaceChildren();gallery.replaceChildren();evidence.length=0;summary.textContent="检查中…";
  if(!document.querySelector(".intro-screen")!.classList.contains("dismissed"))document.querySelector<HTMLButtonElement>(".enter-button")!.click();
  let passed=0,failed=0;
  for(const test of cases){const li=document.createElement("li");try{await verify(test);passed++;li.className="pass";li.textContent="通过 · "+test.id;}catch(e){failed++;li.className="fail";li.textContent="失败 · "+test.id+" · "+String(e);}results.append(li);}
  summary.textContent=`${passed} 项通过，${failed} 项失败`;run.disabled=false;
}
run.addEventListener("click",()=>void verifyAll());
await wait(()=>!!world&&!document.querySelector<HTMLButtonElement>(".enter-button")!.disabled);
summary.textContent="可以开始";run.disabled=false;
Object.assign(window,{depthQA:{run:verifyAll,evidence:()=>evidence,cases:()=>cases}});
