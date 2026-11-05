import { rings, directions, seals, earnedSeals, collectRing, installRings, turnRing, tiltMirror,
  plateAligned, starLit, traceMoonlight, type SealId, type AstrolabeState } from "./astrolabe";
import { southNotebook, moonPlate, lightBrick, mirrorSpots, ringSpotId } from "./ruins-map";
import { drawGroundRing, drawMoonPlate, drawLightBoard, drawSouthNotebook } from "./astrolabe-drawing";
import { relicsUrl } from "./scene-art";
import { sfx } from "./sound";
import type { World, DepthLayer } from "./world";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import type { Point } from "./core";

type Choice = {title:string; run:()=>void};
const leave = "继续探索";

export class AstrolabeQuest {
  private book = document.querySelector<HTMLDetailsElement>(".ruin-notebook")!;
  private flash = document.querySelector<HTMLElement>(".ruin-stamp-flash")!;
  private known = new Set<SealId>();
  private flashTimer?: ReturnType<typeof setTimeout>;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(private world:World, private activities:Activities, private inventory:Inventory,
    private memory:()=>AstrolabeState, private listened:()=>boolean, private save:()=>void) {
    this.book.style.setProperty("--relic-sheet",'url("'+relicsUrl+'")');
    const available=world.available, depth=world.getDepthLayers;
    world.available=spot=>{
      if (!available(spot)) return false;
      if (spot.id===lightBrick.id) return starLit(this.memory());
      const relic=rings.find(r=>ringSpotId(r.id)===spot.id);
      return !relic || !this.memory().found.includes(relic.id);
    };
    world.getDepthLayers=()=>[...depth(), ...this.layers()];
    this.refresh(false);
  }
  refresh(announce=true) {
    const state=this.memory(), earned=earnedSeals(state,this.listened());
    const fresh=earned.filter(id=>!this.known.has(id));
    this.known=new Set(earned);
    // Reconcile both local records, including a reload between the puzzle save and the grant.
    if (starLit(state) && !this.inventory.has("echoBrooch")) this.inventory.grant("echoBrooch",false);
    this.book.querySelector(".ruin-book-count")!.textContent=state.found.length+" / 3 拓印 · "+earned.length+" / 5 印章";
    this.book.querySelector(".ruin-book-pages")!.innerHTML=`
      <p class="ruin-objective">${this.objective(state)}</p>
      <ul class="ruin-rubbings">${rings.map(r=>{
        const found=state.found.includes(r.id);
        return '<li data-found="'+found+'"><i class="ruin-relic relic-'+r.id+'" aria-hidden="true"></i><div><b>'+r.name+'</b><small>'+(found?"✓ 已拓印":r.clue)+'</small></div></li>';
      }).join("")}</ul>
      <h4>盖在旅途上的印章</h4><ul class="ruin-seals">${seals.map(s=>
        '<li data-seal="'+s.id+'" data-earned="'+earned.includes(s.id)+'"><i aria-hidden="true">'+s.mark+'</i><div><b>'+s.name+'</b><small>'+(earned.includes(s.id)?"已盖章 · ":"待发现 · ")+s.hint+'</small></div></li>').join("")}</ul>`;
    if (announce && fresh.length && this.world.scene==="ruins") {
      const stamp=seals.find(s=>s.id===fresh[fresh.length-1])!;
      clearTimeout(this.flashTimer);
      this.flash.hidden=false;
      this.flash.innerHTML='<i aria-hidden="true">'+stamp.mark+'</i><span><small>遗迹手记 · 新印章</small><strong>'+stamp.name+'</strong></span>';
      this.flashTimer=setTimeout(()=>{ this.flash.hidden=true; },2600);
    }
  }
  clearFlash() { clearTimeout(this.flashTimer); this.flash.hidden=true; }
  reset() {
    this.clearFlash();
    this.book.open=false;
    this.book.querySelectorAll("details").forEach(page => { page.open=false; });
    this.refresh(false);
  }
  private objective(s:AstrolabeState) {
    if(s.found.length<3) return "南阶的笔记：三枚盘环散落在西、北、东三间石室，留意脚边的微光。";
    if(!s.installed) return "三枚盘环都在这里了。去中央祭坛西侧，把它们装进月相星盘。";
    if(!plateAligned(s)) return "盘沿的刻字：让月光从盘心流向北面的月牙。";
    if(!starLit(s)) return "沿地上的光纹往东走。转动两面铜镜，把光送到左下角的星纹砖。";
    return "星纹砖亮着，芙芙收到了你的月光。晚安回声胸针已收入背包。";
  }
  private commit() { this.save(); this.refresh(); }
  private exit = () => {
    this.activities.close(); this.world.canvas.focus({preventScroll:true});
  };
  private menu(text:string, choices:Choice[], focusIndex=0, point?:Point) {
    this.activities.menu(text,choices,point,point ? 1.55 : 1);
    const buttons=document.querySelectorAll<HTMLButtonElement>(".activity-actions button");
    buttons[focusIndex]?.focus({preventScroll:true});
  }
  openNotebook() {
    this.exit();
    this.book.open=true;
    this.book.querySelector("summary")!.focus({preventScroll:true});
    this.book.scrollIntoView({block:"nearest",behavior:"instant"});
  }
  private notebook() {
    const missing=rings.filter(r=>!this.memory().found.includes(r.id));
    const hint=missing.length ? missing.map(r=>r.clue).join("　") : this.objective(this.memory());
    this.menu("南阶的手记 · "+hint,[
      {title:"翻开地图下方的手记",run:()=>this.openNotebook()},
      {title:leave,run:this.exit},
    ]);
  }
  interact(id:string) {
    if(this.world.scene!=="ruins") return false;
    const relic=rings.find(r=>ringSpotId(r.id)===id);
    if(relic) {
      this.exit();
      if(collectRing(this.memory(),relic.id)) {
        this.commit();sfx("match");this.world.onToast("拾起"+relic.name+" · 拓印 "+this.memory().found.length+"/3");
      }
    } else if(id===southNotebook.id) this.notebook();
    else if(id===moonPlate.id) this.plate();
    else if(id===mirrorSpots[0].id) this.mirrors(0);
    else if(id===mirrorSpots[1].id) this.mirrors(1);
    else if(id===lightBrick.id && starLit(this.memory())) this.mirrors(0);
    else return false;
    return true;
  }
  private plate(focusIndex=0) {
    const state=this.memory(), view={x:moonPlate.x,y:moonPlate.y+40};
    if(plateAligned(state)) {
      this.menu("三道缺口向北相连。月牙满了，地上的光纹一路流向东边的铜镜。",[
        {title:"沿光纹去铜镜",run:()=>{this.exit();this.world.visit(mirrorSpots[0].id);}},
        {title:leave,run:this.exit},
      ],0,view);return;
    }
    if(!state.installed) {
      const full=state.found.length===3;
      this.menu(full?"三枚环的刻纹与盘心的凹槽吻合。":"残缺的星盘留着三圈凹槽。你已找到 "+state.found.length+" / 3 枚环。",[
        full ? {title:"装入三枚星盘环",run:()=>{if(installRings(state)) this.commit();this.plate();}} :
          {title:"读寻物线索",run:()=>this.notebook()},
        {title:leave,run:this.exit},
      ],0,view);return;
    }
    this.menu("盘沿刻着「让月光从盘心流向北面的月牙」。每拨一次，缺口顺时针转动四分之一圈。",[
      ...rings.map((r,i)=>({title:"转"+r.band+" · 朝"+directions[state.turns[i]],run:()=>{
        if(turnRing(state,r.id)) {this.commit();sfx(plateAligned(state)?"echo-star":"flip");}
        this.plate(i);
      }})), {title:leave,run:this.exit},
    ],focusIndex,view);
  }
  private mirrors(focusIndex:0|1) {
    const state=this.memory(), view={x:556,y:343};
    if(!plateAligned(state)) {
      this.menu("两面旧铜镜映着天光，月灯却是暗的。先去西边的月相星盘看看。",[{title:leave,run:this.exit}],0,view);return;
    }
    if(starLit(state)) {
      this.menu("星纹砖亮起，一弯铜月托着粉色的小星浮出石面。晚安回声胸针已收进你的背包。",[
        {title:"查看胸针",run:()=>{this.exit();this.inventory.open();}}, {title:leave,run:this.exit},
      ],0,view);return;
    }
    const end=traceMoonlight(state.mirrors).points.at(-1)!;
    this.menu(end.y<0?"月灯向右照进上镜，光从北边射出了。目标在左下角。":"光经过两面镜子，落在右边。左下角的星纹砖还没有亮。",[
      ...([0,1] as const).map(i=>({title:"转"+(i===0?"上镜":"下镜")+" · 右端"+(state.mirrors[i]==="/"?"高":"低"),run:()=>{
        if(tiltMirror(state,i)) {this.commit();sfx(starLit(state)?"complete":"echo-bell");}
        this.mirrors(i);
      }})), {title:leave,run:this.exit},
    ],focusIndex,view);
  }
  private layers(): DepthLayer[] {
    if(this.world.scene!=="ruins") return [];
    const state=this.memory(), t=this.reduced.matches?0:performance.now()/1000;
    return [
      {y:0,draw:c=>drawLightBoard(c,state,t)},
      {y:moonPlate.y,draw:c=>drawMoonPlate(c,state)},
      {y:southNotebook.y,draw:drawSouthNotebook},
      ...rings.filter(r=>!state.found.includes(r.id)).map(r=>({
        y:r.y, draw:(c:CanvasRenderingContext2D)=>drawGroundRing(c,r.id,r.x,r.y,Math.hypot(this.world.player.x-r.x,this.world.player.y-r.y)<76,t),
      })),
    ];
  }
}
