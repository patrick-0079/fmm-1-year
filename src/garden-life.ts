import type { World, DepthLayer } from "./world";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import { gardenGuests, peachSpot, type GardenGuest } from "./garden-guests";
import { TOWN_FRAMES } from "./town-data";
import npcUrl from "./assets/town-npcs.webp";
import cakeUrl from "./assets/cake-slice-v11.webp";
import { drawCakeSlice } from "./cake-party";
import { drawItem } from "./item-art";
import { prepareProp, sceneArt } from "./scene-art";
import { CompanionMotion } from "./companion-motion";
import { canTravelBetween, type Point, type Progress } from "./core";
import { PeachGait } from "./peach-gait";

type Choice = {title: string; run: () => void};
type Pose = "idle" | "cat-look" | "cat-pet" | "shy" | "offer" | "smile";
const catRest = "那好吧，我会帮你照顾好它，下次再来找它玩吧。";
const catNuzzle = "（它很喜欢你，开心地围着你蹭蹭）";
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => motionPreference.matches;

export class GardenLife {
  private npcs = new Image();
  private cake = new Image();
  private age = 0;
  private time = 0;
  private pose: Pose = "idle";
  private companion: Companion;
  constructor(private world: World, private activities: Activities, private inventory: Inventory,
    private memory: () => Pick<Progress,"decoratorMet"|"rabbitIntroduced">, private save: () => void) {
    this.npcs.src = npcUrl;
    this.cake.src = cakeUrl;
    this.companion = new Companion(world);
    const tick = world.onTick, layers = world.getDepthLayers;
    world.onTick = (dt,t) => { tick(dt,t); this.age += dt; this.time = t; };
    world.getDepthLayers = () => world.scene === "garden" ? [...layers(),...this.layers()] : layers();
  }
  interact(id: string) {
    const npc = gardenGuests.find(n => id === "garden-guest-"+n.id);
    if (!npc || this.world.scene !== "garden") return false;
    if (npc.id === "balloon-friend") this.cat(npc);
    if (npc.id === "decorator") this.decorator(npc);
    if (npc.id === "picnic-friend") this.picnic(npc);
    return true;
  }
  private say(npc: GardenGuest, text: string, choices: Choice[] = [], pose: Pose = "idle") {
    this.activities.dialogue(npc.name+" · "+npc.role,text,choices,c=>{
      if (!this.npcs.naturalWidth) return;
      const f=TOWN_FRAMES[npc.sprite], w=46*f.w/f.h;
      c.drawImage(this.npcs,f.x,f.y,f.w,f.h,(48-w)/2,5,w,46);
    },npc,()=>{ this.pose="idle"; this.companion.catPetted=false; });
    this.pose=pose;
    this.age=0;
    this.companion.catPetted=pose==="cat-pet";
  }
  private cat(n: GardenGuest) {
    const owns = this.inventory.has("petCat");
    this.say(n,owns ? "桃桃认出你啦！你想再摸摸它吗？" :
      "快看呀，那里有只可爱的奶油猫！它的肚皮看起来软乎乎的。你想摸摸它吗？",[
      {title:"轻轻抚摸奶油猫",run:()=>{
        if (owns && this.inventory.followingPet === "petCat") {
          this.say(n,"桃桃看起来玩得很开心。要继续一起走，还是让它在我这里歇一会儿？",[
            {title:"继续一起走",run:()=>{ this.inventory.setCompanion("petCat",true); this.say(n,"去吧，桃桃已经跟好啦。"); }},
            {title:"让桃桃休息",run:()=>{ this.inventory.setCompanion("petCat",false); this.say(n,catRest); }},
          ],"cat-pet");
          return;
        }
        this.say(n,owns ? "它还记得你呢。今天也要带它一起散步吗？" :
          "它看起来很喜欢你！听说奶油猫可以为你带来好运，你要带它一起旅行吗？",[
          {title:"带上奶油猫",run:()=>{
            const first=this.inventory.setCompanion("petCat",true);
            this.companion.greet(peachSpot);
            if (first) this.say(n,"（获得奶油猫桃桃）",[{title:"继续",run:()=>this.say(n,catNuzzle)}]);
            else this.say(n,catNuzzle);
          }},
          {title:"不带上奶油猫",run:()=>this.say(n,catRest)},
        ],"cat-pet");
      }},
    ],"cat-look");
  }
  private intro(n: GardenGuest) {
    const answer=(text:string)=>{
      this.say(n,text);
      this.memory().decoratorMet=true;
      this.save();
    };
    this.say(n,"呼，可算是弄完啦～希望芙芙会喜欢。诶？！你就是芙眠眠吗？",[
      {title:"对，我就是哦",run:()=>answer("哇，见到本人啦！希望你会喜欢这里，这些是我费了好大劲才布置好的。芙妮宝说要为你准备一个盛大的庆典！")},
      {title:"我不是～",run:()=>answer("那你见到她记得告诉她，芙妮宝准备的庆典已经可以开始啦！")},
    ]);
  }
  private decorator(n: GardenGuest) {
    if (!this.memory().decoratorMet) { this.intro(n); return; }
    if (!this.memory().rabbitIntroduced) { this.memory().rabbitIntroduced=true; this.save(); }
    const options: Choice[] = [];
    if (this.inventory.followingPet==="petBunny") {
      options.push({title:"让棉棉歇一会儿",run:()=>{
        this.inventory.setCompanion("petBunny",false);
        this.say(n,"回来啦，棉棉。就在我旁边歇一会儿吧。");
      }});
    } else {
      options.push({title:"邀请棉棉同行",run:()=>{
        const first=this.inventory.setCompanion("petBunny",true);
        this.say(n,"那就拜托你啦。棉棉，跟好芙芙哦！"+(first?"\n（获得垂耳兔棉棉）":""));
      }},{title:"先让棉棉陪你",run:()=>this.say(n,"好呀，那我们在这里等你。逛累了就回来坐坐吧。")});
    }
    options.push({title:"再聊聊庆典",run:()=>this.intro(n)});
    this.say(n,"你又来啦！这是棉棉，它也想看看我挂好的彩旗。",options);
  }
  private picnic(n: GardenGuest) {
    this.say(n,"你…你好，芙芙大人…",[{title:"没关系，不用紧张",run:()=>{
      this.say(n,"谢…谢谢你。（从一旁的篮子中拿出一个蛋糕）请务必…收下这个。吃甜食会让心情变好！",[
        {title:"如果可以的话，请和我们一起享用这个蛋糕",run:()=>
          this.say(n,"真…真的吗？（眼睛闪过不易察觉的欣喜）我…一定会去的…谢谢你！",[],"smile")},
      ],"offer");
    }}],"shy");
  }
  private layers(): DepthLayer[] {
    const layers: DepthLayer[]=gardenGuests.map(n=>({y:n.y,draw:c=>{
      if (!this.npcs.naturalWidth) return;
      const f=TOWN_FRAMES[n.sprite], s=43/337;
      shadow(c,n.x,n.y,8);
      const acting=n.id==="picnic-friend" && ["shy","offer","smile"].includes(this.pose);
      if (acting && !(this.pose==="shy" && this.age<.18 && !reduced())) {
        const frame=this.pose==="shy"?0:this.pose==="offer" && this.age<.52 && !reduced()?1:2;
        const lift=this.pose==="smile" && !reduced() ? Math.sin(Math.min(1,this.age/.55)*Math.PI)*1.2 : 0;
        picnicSprite(c,frame,n.x,n.y-lift,44);
        if(this.pose==="smile" && this.age<.9 && !reduced()) {
          c.save(); c.globalAlpha=Math.sin(this.age/.9*Math.PI);
          c.fillStyle="#fff8c7"; c.fillRect(n.x-4,n.y-22-lift,1.2,1.2);
          c.fillRect(n.x+2,n.y-22-lift,1.2,1.2); c.restore();
        }
      } else {
        const bob=reduced()?0:Math.sin(this.time*.8+n.x)*.4;
        c.drawImage(this.npcs,f.x,f.y,f.w,f.h,n.x-f.w*s/2,n.y-f.h*s+bob,f.w*s,f.h*s);
      }
    }}));
    const [host,,sugar]=gardenGuests;
    if (this.world.equipment.pet!=="petCat") layers.push({y:peachSpot.y,draw:c=>
      drawPet(c,"petCat",peachSpot.x,peachSpot.y,this.pose==="cat-pet",this.pose==="cat-look"?.085:0)});
    if (this.memory().rabbitIntroduced && this.world.equipment.pet!=="petBunny") {
      layers.push({y:host.y+4,draw:c=>drawPet(c,"petBunny",host.x-17,host.y+4,false)});
    }
    layers.push({y:sugar.y+3,draw:c=>picnicSprite(c,3,sugar.x-20,sugar.y+3,20)});
    if (this.pose==="offer" || this.pose==="smile") {
      const t=this.pose==="smile" || reduced() ? 1 : Math.min(1,this.age/.64);
      layers.push({y:sugar.y+4,draw:c=>
        drawCakeSlice(c,sugar.x-20+20*t,sugar.y-1-14*t-Math.sin(t*Math.PI)*4,.93,this.cake)});
    }
    return layers;
  }
}

function picnicSprite(c:CanvasRenderingContext2D, index:number, x:number,y:number,size:number) {
  const sheet=sceneArt.picnic;
  if (!sheet.naturalWidth) return;
  const cell=sheet.width/2;
  c.drawImage(sheet,index%2*cell,Math.floor(index/2)*cell,cell,cell,x-size/2,y-size,size,size);
}
function shadow(c:CanvasRenderingContext2D,x:number,y:number,r:number) {
  c.fillStyle="#5e63462b"; c.beginPath(); c.ellipse(x,y,r,2.6,0,0,Math.PI*2); c.fill();
}
function drawPet(c:CanvasRenderingContext2D,id:"petCat"|"petBunny",x:number,y:number,pet:boolean,tilt=0,mirror=false,gait?:PeachGait) {
  shadow(c,x,y,7);
  if (gait && !pet && sceneArt.peachWalk.naturalWidth) {
    const sheet=sceneArt.peachWalk, cell=sheet.width/4;
    const row=gait.facing==="front"?1:gait.facing==="back"?2:0;
    const col=reduced() && gait.walking ? Math.floor(gait.frame/2)*2 : gait.frame;
    c.save(); c.translate(x,y); if(gait.facing==="right")c.scale(-1,1);
    c.drawImage(sheet,col*cell,row*cell,cell,cell,-15,-30,30,30); c.restore();
    return;
  }
  c.save(); c.translate(x,y); if(mirror)c.scale(-1,1);
  c.rotate(tilt); drawItem(c,id,-11,-21,22,21);
  if(pet && id==="petCat") {
    for(const [ex,ey] of [[-7,-13],[-3,-11.5]]) {
      c.fillStyle="#f5daca"; c.beginPath(); c.ellipse(ex,ey,1.55,1.65,0,0,Math.PI*2); c.fill();
      c.strokeStyle="#725266"; c.lineWidth=.75; c.beginPath(); c.moveTo(ex-1.25,ey);
      c.quadraticCurveTo(ex,ey+1.2,ex+1.2,ey-.1); c.stroke();
    }
  }
  c.restore();
}

export class Companion {
  private scene = "";
  private id: "petBunny" | "petCat" | null = null;
  private motion = new CompanionMotion();
  private gait = new PeachGait();
  private time = 0;
  private welcome: {from:Point; age:number} | null = null;
  catPetted = false;
  constructor(private world: World) {
    const tick = world.onTick, layers = world.getDepthLayers;
    world.onTick = (dt,t) => { tick(dt,t); this.time=t; this.update(dt); };
    world.getDepthLayers = () => [...layers(),...this.layers()];
  }
  greet(from:Point) {
    this.welcome = reduced() ? null : {from,age:0};
  }
  private update(dt:number) {
    const id=this.world.equipment.pet;
    if(id!=="petBunny" && id!=="petCat"){ this.id=null; this.welcome=null; return; }
    if(this.scene!==this.world.scene || this.id!==id) {
      this.scene=this.world.scene; this.id=id; this.motion.reset(this.world.player);
      this.gait.reset();
      if(id==="petCat" && !sceneArt.peachWalk.naturalWidth) void prepareProp("peachWalk").catch(()=>{});
    }
    const before=this.motion.position;
    if (this.welcome && (id!=="petCat" || this.scene!=="garden")) this.welcome=null;
    if (this.welcome) {
      const greeting=this.welcome; greeting.age+=dt;
      const t=Math.min(1,greeting.age/1.25), p=this.world.player, angle=t*Math.PI*1.65;
      const next={x:greeting.from.x*(1-t)+(p.x+Math.cos(angle)*9)*t,
        y:greeting.from.y*(1-t)+(p.y+Math.sin(angle)*5+3)*t};
      if(canTravelBetween(this.motion.position,next,this.world.config)) {
        this.motion.reset(next);
        this.motion.mirrored=p.x>next.x;
      }
      if(t===1)this.welcome=null;
    } else {
      this.motion.update(this.world.player,this.world.config,dt,
        !this.world.paused && !this.world.suspended && !this.world.busy && !this.world.restState);
    }
    if(id==="petCat")this.gait.move(before,this.motion.position);
  }
  private layers():DepthLayer[] {
    const id=this.id;
    if (!id || id!==this.world.equipment.pet || this.world.restState?.kind==="lying" || this.world.actorHidden) return [];
    const p=this.motion.position, bob=id==="petCat" || reduced() || this.world.paused ? 0 : Math.sin(this.time*6)*.4;
    return [{y:p.y+1,draw:c=>drawPet(c,id,p.x,p.y+bob,this.catPetted,0,this.motion.mirrored,id==="petCat"?this.gait:undefined)}];
  }
}
