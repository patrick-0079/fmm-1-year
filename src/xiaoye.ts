import type { Activities } from "./activities";
import type { Phase } from "./day";
import type { World, DepthLayer } from "./world";
import { canTravelBetween, type Point } from "./core";
import { sceneArt } from "./scene-art";
import { lampLift, plushIdleFrame, plushIdleMotion, plushWaveFrame } from "./plush-idle";
import { XiaoyeHug, xiaoyeFrame, xiaoyeFrames, xiaoyeLanternOn,
  xiaoyeLanternPoint, xiaoyeScale, xiaoyeSpot } from "./xiaoye-data";
import { embracePose, boundedEmbraceFoot, isEmbraceApproach, EMBRACE_BODY_GAP, EMBRACE_SHOULDER_Y } from "./xiaoye-embrace";
import { embraceFrames, EMBRACE_ART_SCALE } from "./xiaoye-embrace-art";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story";
import { flowerClueChoice, flowerClueText, letterPauseSeconds, xiaoyeDailyPage, xiaoyePages, type XiaoyePage } from "./xiaoye-dialogue";
import { drawEnvelope } from "./visitor-gesture-art";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const HEIGHT = 60;
const ease = (n: number) => { const t=Math.max(0,Math.min(1,n)); return t*t*(3-2*t); };

export class Xiaoye {
  private hug = new XiaoyeHug();
  private time = 0;
  private ownsDialogue = false;
  private page: XiaoyePage = "hello";
  private clueOpen = false;
  private clueStarted = 0;
  private pageStarted = 0;
  private replySeconds = 0;
  private origin: Point = {...xiaoyeSpot.approach};
  private lastHugTime = 0;
  private idleMirrored = false;
  private lampStart: Point = {x:0,y:0};
  private contactFoot: Point = { x:xiaoyeSpot.x, y:xiaoyeSpot.y };
  private panels: HTMLElement[];

  constructor(private world: World, private activities: Activities,
    private mail: LetterHandoff, private phase: () => Phase, private collectFlowerMap: () => void) {
    this.panels = Array.from(document.querySelectorAll<HTMLElement>(
      ".inventory-panel,.map-reader,.game-letter-reader",
    ));
    document.addEventListener("visibilitychange", () => {
      this.lastHugTime = performance.now() / 1000;
    });
    const tick = world.onTick, depth = world.getDepthLayers, effects = world.onEffects,
      presentation = world.getActorPresentation;
    world.onTick = (dt, time) => {
      tick(dt, time);
      this.time = world.ambientTime;
      // Movement caps dt on slow frames. The hug uses actual foreground seconds.
      const elapsed = dt > 0 ? time - this.lastHugTime : 0;
      this.lastHugTime = time;
      if (!this.ownsDialogue) return;
      if (!this.available() || Math.hypot(world.player.x-this.origin.x,world.player.y-this.origin.y)>7) {
        this.activities.dismissDialogue(xiaoyeSpot);
        return;
      }
      if (this.hug.tick(elapsed,world.player,true)) world.onAchievementEvent("xiaoye-plush");
      if (!this.clueOpen && (this.page === "hot" || this.page === "warm")) {
        this.replySeconds += Math.max(0,elapsed);
        if (this.replySeconds >= letterPauseSeconds && !this.hug.active) this.show("offer");
      }
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
    this.clueOpen = false;
    this.replySeconds = 0;
    this.contactFoot = { x:xiaoyeSpot.x, y:xiaoyeSpot.y };
  }

  interact(id: string) {
    if (id !== xiaoyeSpot.id || this.world.scene !== "garden") return false;
    if (!this.available() || this.ownsDialogue || this.hug.active) return true;
    if(!this.prepareApproach()) {
      this.world.visit(xiaoyeSpot.id);
      return true;
    }
    this.origin = {...this.world.player};
    this.lastHugTime = performance.now() / 1000;
    this.idleMirrored = this.origin.x < xiaoyeSpot.x;
    if (this.mail.received(handedLetters.xiaoye)) {
      const phase = this.phase();
      const visit = this.world.chats.visitShift(id,phase,this.world.currentDay,this.world.currentHours);
      this.show(xiaoyeDailyPage(phase,visit));
    } else this.show("hello");
    return true;
  }

  private prepareApproach() {
    // The plush takes a short collision-checked step. Fufu keeps her actual footing,
    // including when she shuffles closer while reading the question.
    const player=this.world.player;
    if(!isEmbraceApproach(player,xiaoyeSpot) || Math.hypot(player.x-xiaoyeSpot.x,player.y-xiaoyeSpot.y)>xiaoyeSpot.radius!)return false;
    const side=player.x<xiaoyeSpot.x ? -1 : 1;
    const contact=boundedEmbraceFoot(xiaoyeSpot,{x:player.x-side*EMBRACE_BODY_GAP,y:player.y-4});
    const map=this.world.config, space={...map,walls:map.walls.filter(w=>w.label!=="来宾 · 小叶子")};
    if(!canTravelBetween(xiaoyeSpot,contact,space) || Math.abs(player.x-contact.x)<EMBRACE_BODY_GAP-.1)return false;
    this.contactFoot=contact;
    return true;
  }

  private show(page: XiaoyePage) {
    if (xiaoyePages[page].hug) {
      if (!this.prepareApproach()) {
        this.activities.dismissDialogue(xiaoyeSpot);
        this.world.visit(xiaoyeSpot.id);
        return;
      }
      this.lampStart = this.lampPoint();
      this.hug.begin(this.world.player);
    }
    this.page = page;
    this.pageStarted = this.time;
    this.replySeconds = 0;
    this.lastHugTime = performance.now() / 1000;
    this.present();
  }

  private present() {
    if (this.clueOpen) {
      this.dialogue(flowerClueText,[{title:"继续刚才的话题",run:()=>{
        this.clueOpen = false;
        this.lastHugTime = performance.now() / 1000;
        this.present();
      }}]);
      return;
    }
    const page = xiaoyePages[this.page];
    const choices = this.page === "offer" || this.page === "received"
      ? [letterChoice(this.mail,handedLetters.xiaoye,()=>this.show("received"),"（收下信封）")]
      : (page.choices ?? []).map(([title,destination])=>({title,run:()=>this.show(destination)}));
    choices.push({title:flowerClueChoice,run:()=>{
      this.clueOpen = true;
      this.clueStarted = this.time;
      this.collectFlowerMap();
      this.present();
    }});
    this.dialogue(page.text,choices);
  }

  private dialogue(text: string, options: { title: string; run: () => void }[]) {
    // Replacing our own page invokes its close callback before installing the next.
    this.ownsDialogue = false;
    this.activities.dialogue(xiaoyeSpot.title, text, options, c => {
      if (!this.clueOpen && this.hug.active) this.drawEmbrace(c,2,{x:24,y:53},false,0,false,54/HEIGHT);
      else this.drawPlush(c,24,53,53,false,true);
    }, xiaoyeSpot, () => { if (this.ownsDialogue) this.reset(); });
    this.ownsDialogue = true;
  }

  private visual() {
    const active=this.hug.active && this.available();
    const pose=embracePose(active ? this.hug.progress : 0,motion.matches);
    const contact=active ? pose.contact : 0;
    return {active,pose,mirror:active && this.hug.mirrored,
      foot:{x:xiaoyeSpot.x+(this.contactFoot.x-xiaoyeSpot.x)*contact,
        y:xiaoyeSpot.y+(this.contactFoot.y-xiaoyeSpot.y)*contact}};
  }

  private showPaws() {
    return this.clueOpen || this.page === "hello" || this.page === "offer" ||
      this.page === "fluffy" || this.page === "received";
  }

  private drawPlush(c: CanvasRenderingContext2D, x:number, y:number, height:number, mirror:boolean, talking:boolean) {
    if (!sceneArt.xiaoye.naturalWidth) return;
    const raised = talking && this.showPaws();
    const frame=xiaoyeFrame(this.phase(),raised),f=xiaoyeFrames[frame],s=xiaoyeScale(frame,height);
    c.save();c.translate(x,y);if(mirror)c.scale(-1,1);
    const age = Math.max(0,this.time-this.pageStarted);
    let posed: HTMLCanvasElement | undefined;
    if (raised) {
      if (!this.clueOpen && this.page === "hello") {
        const step = motion.matches ? 3 : age < 1.4 ? Math.round(3*(1-Math.cos(age*Math.PI*3))) : 0;
        posed=plushWaveFrame(sceneArt.xiaoye,xiaoyeLanternOn(this.phase()),step);
        // After waving, open both paws and turn slightly to show the plush coat.
        if (!motion.matches && age>1.4 && age<2.7) c.rotate(.06*Math.sin((age-1.4)*Math.PI*2/1.3));
      }
    } else posed=plushIdleFrame(sceneArt.xiaoye,frame===2,plushIdleMotion(this.time,frame===2,motion.matches || talking));
    if(posed)c.drawImage(posed,(f.x-f.footX)*s,(f.y-f.footY)*s,f.w*s,f.h*s);
    else c.drawImage(sceneArt.xiaoye,f.x,f.y,f.w,f.h,(f.x-f.footX)*s,(f.y-f.footY)*s,f.w*s,f.h*s);
    c.restore();
  }

  private drawEmbrace(c: CanvasRenderingContext2D, frame:number, foot:Point,
    mirror:boolean, lean:number, pawOnly=false, scale=1) {
    const image=sceneArt.xiaoyeEmbrace;
    if (!image.naturalWidth) return;
    const f=embraceFrames[frame],crop=pawOnly ? f.paw : f,s=EMBRACE_ART_SCALE*scale;
    if(pawOnly && !f.foreground.length)return;
    c.save();c.translate(foot.x,foot.y);if(mirror)c.scale(-1,1);c.rotate(lean);
    if(pawOnly) {
      c.beginPath();
      f.foreground.forEach(([x,y],i)=>i ? c.lineTo((x-f.footX)*s,(y-f.footY)*s) : c.moveTo((x-f.footX)*s,(y-f.footY)*s));
      c.closePath();c.clip();
    }
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
      else this.drawPlush(c,xiaoyeSpot.x,xiaoyeSpot.y,HEIGHT,this.idleMirrored,this.ownsDialogue);
      c.restore();
    }}];
    // The forearm alone wraps over Fufu's shoulder. Neither head/body is pasted
    // on top of the player, and the arm retreats with the rest of the animation.
    if(v.active && v.pose.contact>.2 && Math.abs(this.world.player.x-v.foot.x)>=22 &&
      Math.abs(this.world.player.y-v.foot.y)<18)
      layers.push({y:Math.max(v.foot.y,this.world.player.y)+.1,draw:c=>{
        c.save();c.beginPath();
        // The raised upper arm stays behind Fufu's head/hair. Only the lower paw
        // crosses in front at the shoulder, so it cannot emerge through her face.
        c.rect(this.world.player.x-45,this.world.player.y+EMBRACE_SHOULDER_Y,90,35);c.clip();
        this.drawEmbrace(c,v.pose.frame,v.foot,v.mirror,v.pose.lean,true);c.restore();
      }});
    if(v.active && xiaoyeLanternOn(this.phase())) {
      const lamp=this.lampPoint();
      layers.push({y:xiaoyeSpot.y+3,draw:c=>this.drawParkedLantern(c,lamp)});
    }
    if(this.ownsDialogue && (this.clueOpen || this.page==="offer" || this.page==="received")) {
      const age = this.time - (this.clueOpen ? this.clueStarted : this.pageStarted);
      const collected = !this.clueOpen && this.page === "received";
      if (!collected || age < .6) {
        const direction = this.idleMirrored ? -1 : 1;
        const reach = collected ? ease(age/.6) : this.clueOpen ? .45*(motion.matches ? 1 : ease(age/.5)) : 0;
        const pawX=v.foot.x+direction*22, pawY=v.foot.y-(v.active ? 19 : 27);
        const x=pawX+(this.world.player.x-pawX)*reach, y=pawY+(this.world.player.y-18-pawY)*reach;
        layers.push({y:Math.max(v.foot.y,this.world.player.y)+.2,draw:c=>{
          if(!this.clueOpen) {drawEnvelope(c,x,y,-direction*.15); return;}
          c.save(); c.translate(x,y); c.rotate(-direction*.17);
          c.fillStyle="#fff0c9"; c.strokeStyle="#926a51"; c.lineWidth=.7;
          c.fillRect(-5,-3.8,10,7.6); c.strokeRect(-5,-3.8,10,7.6);
          c.strokeStyle="#c2a578"; c.beginPath(); c.moveTo(-1.6,-3.4);c.lineTo(-1.6,3.4);c.stroke();
          c.strokeStyle="#798a61";c.setLineDash([1,.7]);c.beginPath();c.moveTo(-4,2);c.quadraticCurveTo(-2,-1,.1,1);c.lineTo(2.3,-1.3);c.stroke();
          c.setLineDash([]);c.strokeStyle="#bd584e";c.lineWidth=1;c.beginPath();c.moveTo(1.5,-2.8);c.lineTo(3.6,-.7);c.moveTo(3.6,-2.7);c.lineTo(1.5,-.6);c.stroke();c.restore();
        }});
      }
    }
    return layers;
  }

  private lampPoint(): Point {
    const idle=xiaoyeLanternPoint(this.ownsDialogue && this.showPaws() ? 3 : 2,HEIGHT,this.idleMirrored,0)!;
    if(!this.hug.active){
      const lift=lampLift(plushIdleMotion(this.time,true,motion.matches || this.ownsDialogue),HEIGHT,this.idleMirrored);
      return {x:xiaoyeSpot.x+idle.x+lift.x,y:xiaoyeSpot.y+idle.y+lift.y};
    }
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
