import { arcadesIn } from "./town-data";
import { echoes, melody, playEcho, trialEcho, type Echo, type EchoMemory } from "./echoes";
import { townEchoGate, echoAltar, echoPool, ruinsExit, stairLintel } from "./ruins-map";
import { motif, type PixelMotif, panel } from "./arcade-pixels";
import { sfx } from "./sound";
import type { Activities } from "./activities";
import type { World, DepthLayer } from "./world";
import type { GameId } from "./arcade-engines";
import gateUrl from "./assets/echo-arch.webp";

const symbols: Record<Echo, PixelMotif> = {leaf:"sprout", bell:"bell", star:"star"};
const trials = arcadesIn("ruins");
const options: Echo[] = ["star","leaf","bell"];
const letter = "旧收音机亮起了第 365 盏灯。「芙芙，这一晚，换我们陪你把晚安说完。」";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
export class EchoRuins {
  private gate?: HTMLImageElement;
  private time = 0;
  private broadcastAt = -10;
  constructor(private world: World, private activities: Activities,
    private memory: () => EchoMemory, private save: () => void) {
    const available = world.available, depth = world.getDepthLayers, tick = world.onTick;
    world.available = spot => available(spot) && (spot.id !== echoPool.id || this.solved);
    world.getDepthLayers = () => [...depth(), ...this.layers()];
    world.onTick = (dt,t) => { tick(dt,t); this.time=t; };
  }
  private get solved() { return this.memory().played === melody.length; }
  clearEffect() { this.broadcastAt = -10; }
  discover(id: GameId) {
    if (!Object.hasOwn(trialEcho, id) || this.world.scene !== "ruins") return;
    const rune = trialEcho[id as keyof typeof trialEcho], memory = this.memory();
    if (!memory.found.includes(rune)) {
      memory.found.push(rune);
      this.save();
      sfx(echoes[rune].sound);
      this.world.onToast("抄下「"+echoes[rune].name+"」的石刻 · "+memory.found.length+"/3");
    }
  }
  interact(id: string) {
    if (this.world.scene !== "ruins") return false;
    if (id === echoAltar.id) { this.altar(); return true; }
    if (id === echoPool.id && this.solved) { this.listen(); return true; }
    return false;
  }
  private menu(text: string, actions: {title:string; run:()=>void}[]) {
    this.activities.menu(text, actions);
    document.querySelector<HTMLButtonElement>(".activity-actions button")?.focus({preventScroll:true});
  }
  private altar(feedback = "") {
    const state = this.memory(), prefix = melody.slice(0, state.played).map(n=>echoes[n].name).join(" · ");
    const optionsForNotes = options.map(note => ({title:"轻敲「"+echoes[note].name+"」", run:()=> {
      if (!playEcho(state,note)) { this.altar("石灯轻轻摇头。已经响起的音仍在。"); return; }
      sfx(echoes[note].sound); this.save(); this.altar();
    }}));
    const notebook = () => {
      const notes = options.filter(n => state.found.includes(n)).map(n=>echoes[n].inscription);
      const missing = options.filter(n=>!state.found.includes(n)).map(n=>echoes[n].chamber);
      const lines = [...notes, ...(missing.length ? ["待寻："+missing.join("、")+"。"] : [])];
      this.menu(lines.join("　"), [{title:"回到祭坛",run:()=>this.altar()}]);
    };
    if (this.solved) {
      this.menu("三盏石灯一同亮起。南阶旁的水面浮出了两只小天线，那里似乎还藏着一段声音。",[
        {title:"重读三道铭文",run:notebook}, {title:"去水边看看",run:()=>{this.activities.close();this.world.visit(echoPool.id);}},
      ]); return;
    }
    const ready = state.found.length === melody.length;
    const prompt = ready ? "按碑文提示敲响三枚符号。" : "西、北、东三间石室各有一道铭文，触碰室里的石座即可抄录。";
    this.menu([feedback, "中央祭坛 · 石刻 "+state.found.length+"/3。", prompt, prefix && "已经奏响："+prefix+"。"].filter(Boolean).join(" "), [
      ...(ready ? optionsForNotes : []), {title:"翻阅石刻拓本",run:notebook},
      {title:"继续探索",run:()=>this.activities.close()},
    ]);
  }
  private listen() {
    this.broadcastAt = this.time; sfx("echo-broadcast");
    if (!this.memory().listened) { this.memory().listened = true; this.save(); }
    this.menu(letter, [{title:"再听一遍",run:()=>this.listen()},{title:"把晚安收好",run:()=>this.activities.close()}]);
  }
  private layers(): DepthLayer[] {
    if (this.world.scene === "town") {
      if (!this.gate) { this.gate = new Image(); this.gate.src = gateUrl; }
      return [{y:townEchoGate.y+1,draw:c=>{
        if (this.gate?.naturalWidth) {
          const h=78*this.gate.naturalHeight/this.gate.naturalWidth;
          c.drawImage(this.gate,townEchoGate.x-39,townEchoGate.y+5-h,78,h);
        }
        this.label(c,townEchoGate.x,townEchoGate.y+9,"回声遗迹");
      }}];
    }
    if (this.world.scene !== "ruins") return [];
    const state=this.memory();
    return [
      ...trials.map(([id, game]) => ({y:game.y, draw:(c:CanvasRenderingContext2D)=>{
        const note=trialEcho[id as keyof typeof trialEcho];
        this.carving(c,game.x,game.y,note,state.found.includes(note));
        this.label(c,game.x,game.y+6,game.short);
      }})),
      {y:0,draw:c=>{
        for(const [index,note] of melody.entries()) {
          const x=echoAltar.x+(index-1)*23, y=echoAltar.y-30+(index===1 ? -3 : 0);
          panel(c,x-7,y-7,14,14,"#465c59","#374a4a","#acac87");
          if (state.played>index) this.glow(c,x,y,17,echoes[note].color);
          motif(c,symbols[note],x,y,10);
        }
        this.label(c,echoAltar.x,echoAltar.y-49,"回声祭坛");
        this.label(c,ruinsExit.x,ruinsExit.y-3,"南阶 · 回小镇");
      }},
      {y:499, draw:(c:CanvasRenderingContext2D)=>this.world.drawMapFragment(c,stairLintel)},
      {y:echoPool.y+3,draw:(c:CanvasRenderingContext2D)=>{
        const well=this.world.echoWell;
        if (well?.naturalWidth) {
          const h=50*well.naturalHeight/well.naturalWidth;
          c.drawImage(well,echoPool.x-25,echoPool.y+4-h,50,h);
        }
        if (this.solved) this.receiver(c);
      }},
    ];
  }
  private glow(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string) {
    const gradient=c.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,color+"a0");gradient.addColorStop(1,color+"00");
    c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);
  }
  private carving(c:CanvasRenderingContext2D,x:number,y:number,note:Echo,lit:boolean) {
    panel(c,x-12,y-5,24,9,"#566965","#354843","#a6aca0");
    panel(c,x-9,y-23,18,21,"#344d50","#203d42","#8d9e88");
    if(lit) this.glow(c,x,y-15,18,echoes[note].color);
    motif(c,symbols[note],x,y-13,12);
  }
  private label(c:CanvasRenderingContext2D,x:number,y:number,text:string) {
    c.save();c.font='8px "Microsoft YaHei",sans-serif';c.textAlign="center";
    const w=c.measureText(text).width+10;
    c.fillStyle="#203a3cf0";c.fillRect(x-w/2,y-1,w,12);
    c.fillStyle="#eadfbb";c.fillText(text,x,y+8);c.restore();
  }
  private receiver(c:CanvasRenderingContext2D) {
    const {x,y}=echoPool, age=this.time-this.broadcastAt;
    this.glow(c,x,y-9,24,"#a1eadb");
    c.save();c.translate(x,y);
    c.strokeStyle="#e3cda1";c.lineWidth=1.5;
    c.beginPath();c.moveTo(-2,-18);c.lineTo(-6,-23);c.moveTo(2,-18);c.lineTo(6,-23);c.stroke();
    panel(c,-10,-18,20,14,"#649291","#314c53","#bfe4ce");
    panel(c,-7,-15,14,8,"#263f48","#4f7673","#94c6ae");
    c.fillStyle="#d5ffe3";c.fillRect(-4,-12,2,2);c.fillRect(2,-12,2,2);
    if(age>=0 && age<6) for(let i=0;i<12;i++){
      const p=reduced.matches ? 0.5 : (age*.18+i/12)%1, a=i*2.4;
      c.globalAlpha=1-p;c.fillStyle=i%2?"#b5f8dd":"#ffe2ab";
      c.fillRect(Math.cos(a)*(7+p*26),-13+Math.sin(a)*(4+p*13)-p*14,2,2);
    }
    c.restore();
  }
}
