import type { Activities } from "./activities";
import type { Phase } from "./day";
import type { World, DepthLayer } from "./world";
import { canTravelBetween, type Point } from "./core";
import { sceneArt } from "./scene-art";
import { scenes } from "./maps";
import { XiaoyeHug, xiaoyeFrame, xiaoyeFrames, xiaoyeHugText, xiaoyeLanternOn,
  xiaoyeLanternPoint, xiaoyeScale, xiaoyeSpot } from "./xiaoye-data";
import { embracePose, boundedEmbraceFoot } from "./xiaoye-embrace";
import { embraceFrames, EMBRACE_ART_SCALE } from "./xiaoye-embrace-art";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const HEIGHT = 60;
const space = { ...scenes.garden, walls: scenes.garden.walls.filter(w => w.label !== "来宾 · 小叶子") };
const ease = (n: number) => { const t=Math.max(0,Math.min(1,n)); return t*t*(3-2*t); };

export class Xiaoye {
  private hug = new XiaoyeHug();
  private time = 0;
  private ownsDialogue = false;
  private idleMirrored = false;
  private lampStart: Point = {x:0,y:0};
  private contactFoot: Point = { x:xiaoyeSpot.x, y:xiaoyeSpot.y };
  private panels: HTMLElement[];

  constructor(private world: World, private activities: Activities,
    private phase: () => Phase = () => "day") {
    this.panels = Array.from(document.querySelectorAll<HTMLElement>(
      ".inventory-panel,.map-reader,.game-letter-reader,.page-memory-reader,.inline-help",
    ));
    const tick = world.onTick, depth = world.getDepthLayers, effects = world.onEffects,
      presentation = world.getActorPresentation;
    world.onTick = (dt, time) => {
      tick(dt, time);
      this.time = time;
      const wasHugging=this.hug.active, mirrored=this.hug.mirrored;
      this.hug.tick(dt, world.player, this.available() && this.ownsDialogue);
      if(wasHugging && !this.hug.active)this.idleMirrored=mirrored;
      if (world.scene !== "garden") this.reset();
    };
    world.getActorPresentation = () => {
      if (!this.hug.active || !this.available()) return presentation();
      const pose = embracePose(this.hug.progress, motion.matches);
      return { facing: this.hug.mirrored ? 2 : 1, lean: pose.playerLean * (this.hug.mirrored ? -1 : 1) };
    };
    world.getDepthLayers = () => world.scene === "garden" ? [...depth(), ...this.layers()] : depth();
    world.onEffects = c => { effects(c); this.drawLanternGlow(c); this.drawComfort(c); };
  }

  private available() {
    const w=this.world;
    return w.scene === "garden" && !w.paused && !w.suspended && !w.busy && !w.restState &&
      !w.actorHidden && this.panels.every(panel => panel.hidden);
  }

  reset() {
    if(this.hug.active)this.idleMirrored=this.hug.mirrored;
    this.hug.cancel();
    this.ownsDialogue = false;
    this.contactFoot = { x:xiaoyeSpot.x, y:xiaoyeSpot.y };
  }

  interact(id: string) {
    if (id !== xiaoyeSpot.id || this.world.scene !== "garden") return false;
    if (!this.available() || this.ownsDialogue || this.hug.active) return true;
    const lampStart=this.lampPoint();
    if (!this.hug.begin(this.world.player)) return true;
    this.lampStart=lampStart;
    // The plush takes a small, validated step. Never move the player's real feet.
    const side=this.hug.mirrored ? -1 : 1, player=this.world.player;
    const contact=boundedEmbraceFoot(xiaoyeSpot,{x:player.x-side*15,y:player.y-3});
    this.contactFoot=canTravelBetween(xiaoyeSpot,contact,space) ? contact : {...xiaoyeSpot};
    this.activities.dialogue("小叶子 · 大猫猫玩偶", xiaoyeHugText, [], c => {
      this.drawEmbrace(c,2,{x:24,y:53},false,0,false,54/HEIGHT);
    }, xiaoyeSpot, () => this.reset());
    this.ownsDialogue = true;
    return true;
  }

  private visual() {
    const active=this.hug.active && this.available();
    const pose=embracePose(active ? this.hug.progress : 0,motion.matches);
    const contact=active ? pose.contact : 0;
    return {active,pose,mirror:active && this.hug.mirrored,
      foot:{x:xiaoyeSpot.x+(this.contactFoot.x-xiaoyeSpot.x)*contact,
        y:xiaoyeSpot.y+(this.contactFoot.y-xiaoyeSpot.y)*contact}};
  }

  private drawIdle(c: CanvasRenderingContext2D) {
    if (!sceneArt.xiaoye.naturalWidth) return;
    const frame=xiaoyeFrame(this.phase(),false),f=xiaoyeFrames[frame],s=xiaoyeScale(frame,HEIGHT);
    c.save();c.translate(xiaoyeSpot.x,xiaoyeSpot.y);if(this.idleMirrored)c.scale(-1,1);
    c.drawImage(sceneArt.xiaoye,f.x,f.y,f.w,f.h,
      (f.x-f.footX)*s,(f.y-f.footY)*s,f.w*s,f.h*s);
    c.restore();
  }

  private drawEmbrace(c: CanvasRenderingContext2D, frame:number, foot:Point,
    mirror:boolean, lean:number, pawOnly=false, scale=1) {
    const image=sceneArt.xiaoyeEmbrace;
    if (!image.naturalWidth) return;
    const f=embraceFrames[frame],crop=pawOnly ? f.paw : f,s=EMBRACE_ART_SCALE*scale;
    c.save();c.translate(foot.x,foot.y);if(mirror)c.scale(-1,1);c.rotate(lean);
    c.drawImage(image,crop.x,crop.y,crop.w,crop.h,
      (crop.x-f.footX)*s,(crop.y-f.footY)*s,crop.w*s,crop.h*s);
    c.restore();
  }

  private layers(): DepthLayer[] {
    const v=this.visual();
    const layers:DepthLayer[]=[{y:v.foot.y,draw:c=>{
      c.save();c.fillStyle="#554c4530";c.beginPath();
      c.ellipse(v.foot.x,v.foot.y+1,15,3.8,0,0,Math.PI*2);c.fill();
      if(v.active)this.drawEmbrace(c,v.pose.frame,v.foot,v.mirror,v.pose.lean);
      else this.drawIdle(c);
      c.restore();
    }}];
    // The forearm alone wraps over Fufu's shoulder. Neither head/body is pasted
    // on top of the player, and the arm retreats with the rest of the animation.
    if(v.active && v.pose.contact>.2 && Math.abs(this.world.player.x-v.foot.x)>=8 &&
      Math.abs(this.world.player.y-v.foot.y)<18)
      layers.push({y:Math.max(v.foot.y,this.world.player.y)+.1,draw:c=>
        this.drawEmbrace(c,v.pose.frame,v.foot,v.mirror,v.pose.lean,true)});
    if(v.active && xiaoyeLanternOn(this.phase())) {
      const lamp=this.lampPoint();
      layers.push({y:xiaoyeSpot.y+3,draw:c=>this.drawParkedLantern(c,lamp)});
    }
    return layers;
  }

  private lampPoint(): Point {
    const idle=xiaoyeLanternPoint(2,HEIGHT,this.idleMirrored,0)!;
    if(!this.hug.active)return {x:xiaoyeSpot.x+idle.x,y:xiaoyeSpot.y+idle.y};
    const p=this.hug.progress;
    const held=xiaoyeLanternPoint(2,HEIGHT,this.hug.mirrored,0)!;
    const ground={x:xiaoyeSpot.x+(this.hug.mirrored ? 26 : -26),y:xiaoyeSpot.y+held.y+10};
    if(motion.matches)return ground;
    const from=p<.16 ? this.lampStart : ground;
    const to=p<.16 ? ground : {x:xiaoyeSpot.x+held.x,y:xiaoyeSpot.y+held.y};
    const mix=p<.16 ? ease(p/.16) : p>.84 ? ease((p-.84)/.16) : 0;
    return {x:from.x+(to.x-from.x)*mix,y:from.y+(to.y-from.y)*mix};
  }

  private drawParkedLantern(c:CanvasRenderingContext2D,lamp:Point) {
    if(!sceneArt.xiaoye.naturalWidth)return;
    const scale=HEIGHT/(976-540),x=lamp.x-(327-294)*scale,y=lamp.y-(875-783)*scale;
    c.save();c.translate(x,y);c.scale(scale,scale);
    // Keep the brass handle, trim only the neighbouring resting paw from the atlas.
    c.beginPath();c.moveTo(13,0);c.lineTo(51,0);c.lineTo(63,14);c.lineTo(65,36);
    c.lineTo(74,46);c.lineTo(74,145);c.lineTo(0,145);c.lineTo(0,44);c.lineTo(4,14);c.closePath();c.clip();
    c.drawImage(sceneArt.xiaoye,294,783,74,145,0,0,74,145);c.restore();
  }

  private drawLanternGlow(c: CanvasRenderingContext2D) {
    if(this.world.scene!=="garden" || !xiaoyeLanternOn(this.phase()) || !sceneArt.xiaoye.naturalWidth)return;
    const {x,y}=this.lampPoint(),breathe=motion.matches ? 1 : 1+Math.sin(this.time*1.5)*.025;
    c.save();c.globalCompositeOperation="screen";
    const glow=c.createRadialGradient(x,y,1,x,y,35*breathe);
    glow.addColorStop(0,"#ffe6a568");glow.addColorStop(.25,"#efbb5e2b");glow.addColorStop(1,"#e6a85500");
    c.fillStyle=glow;c.fillRect(x-37,y-37,74,74);c.restore();
  }

  private drawComfort(c:CanvasRenderingContext2D) {
    const v=this.visual();if(!v.active || v.pose.contact<.4)return;
    const p=this.hug.progress,side=v.mirror ? -1 : 1;
    const pattern=["0110110","1111111","1111111","0111110","0011100","0001000"];
    for(const [i,start] of [.34,.55].entries()) {
      const age=motion.matches ? .3 : (p-start)/.32;if(age<0||age>1)continue;
      const opacity=motion.matches ? .55 : Math.sin(age*Math.PI)*.75;
      const x=Math.round(v.foot.x+side*(18+i*7)),y=Math.round(v.foot.y-48-age*9-i*3);
      c.save();c.globalAlpha=opacity;c.fillStyle=i ? "#f6d8a4" : "#f3bac6";
      pattern.forEach((row,dy)=>[...row].forEach((ink,dx)=>{if(ink==="1")c.fillRect(x+dx*.65,y+dy*.65,.65,.65)}));
      c.restore();
    }
  }
}
