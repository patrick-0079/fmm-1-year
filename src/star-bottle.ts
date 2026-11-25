import "./star-bottle.css";
import { producers } from "./content";
import { debugTarget, reservedShortcut } from "./input";
import { meadowAtlasUrl } from "./wild-art";
import meadowBackground from "./assets/night-meadow-v16.webp";
import bottleUrl from "./assets/star-bottle-closeup.webp";
import { BOTTLE_COMPACT_WIDTH,bottleEntries,bottleGeometry,bottleScrollTop,nearestBottleStar,type BottleEntry } from "./star-bottle-layout";
import type { World } from "./world";
import { clearQuietStarEffect, showQuietStarEffect } from "./quiet-star-effect";
import { creditStarTexture } from "./credit-star-art";
import { sceneImage } from "./texture-cache";

export class StarBottleView {
  readonly element=document.createElement("section");
  private readonly art=document.createElement("div");
  private readonly vessel=document.createElement("div");
  private readonly stars=document.createElement("div");
  private readonly count=document.createElement("span");
  private readonly detail=document.createElement("section");
  private readonly name=document.createElement("h2");
  private readonly message=document.createElement("div");
  private readonly intro=document.createElement("p");
  private readonly closeButton=document.createElement("button");
  private readonly returnButton=document.createElement("button");
  private readonly previous=document.createElement("button");
  private readonly next=document.createElement("button");
  private readonly readButton=document.createElement("button");
  private readonly pickedName=document.createElement("p");
  private known:BottleEntry[]=[];
  private selected="";
  private compact=false;
  private touchY=0;

  constructor(private world:World,private found:()=>string[]) {
    const root=this.element;
    root.className="star-bottle-page";root.hidden=true;root.setAttribute("aria-label","星光瓶收藏");root.dataset.view="bottle";
    root.style.setProperty("--bottle-scene",`url("${meadowBackground}")`);root.style.setProperty("--bottle-star-atlas",`url("${meadowAtlasUrl}")`);
    const fireflies=document.createElement("div");fireflies.className="star-bottle-fireflies";fireflies.setAttribute("aria-hidden","true");
    for(let i=0;i<7;i++){const light=document.createElement("i");light.style.cssText=`left:${8+i*79%87}%;top:${18+i*37%72}%;--fly-delay:${-i*1.3}s;`;fireflies.append(light);}
    const heading=document.createElement("header"),title=document.createElement("div");title.className="star-bottle-heading";title.innerHTML="<h1>星光瓶</h1>";
    this.count.className="star-bottle-count";title.append(this.count);
    this.closeButton.type="button";this.closeButton.className="star-bottle-return";this.closeButton.textContent="收起";
    this.closeButton.setAttribute("aria-label","收起星光瓶，返回花海");this.closeButton.setAttribute("aria-keyshortcuts","Escape");this.closeButton.addEventListener("click",()=>this.close());
    this.returnButton.type="button";this.returnButton.className="star-bottle-back";this.returnButton.textContent="‹ 返回瓶中";this.returnButton.addEventListener("click",()=>this.showBottle());
    heading.append(title,this.returnButton,this.closeButton);
    const main=document.createElement("div"),display=document.createElement("section"),glass=sceneImage(bottleUrl);
    main.className="star-bottle-layout";display.className="star-bottle-display";this.art.className="star-bottle-art";this.vessel.className="star-bottle-vessel";
    glass.className="star-bottle-glass";glass.alt="";glass.draggable=false;
    this.stars.className="star-bottle-stars";this.vessel.append(glass,this.stars);this.art.append(this.vessel);
    this.previous.type=this.next.type="button";this.previous.className="star-bottle-pick-previous";this.next.className="star-bottle-pick-next";
    this.previous.innerHTML="‹<span>上一颗</span>";this.next.innerHTML="›<span>下一颗</span>";
    this.previous.setAttribute("aria-label","选中上一颗星星，全部星星仍在瓶中");this.next.setAttribute("aria-label","选中下一颗星星，全部星星仍在瓶中");
    this.previous.addEventListener("click",()=>this.chooseAdjacent(-1));this.next.addEventListener("click",()=>this.chooseAdjacent(1));
    this.readButton.type="button";this.readButton.className="star-bottle-read";this.readButton.textContent="阅读寄语";this.readButton.hidden=true;
    this.readButton.addEventListener("click",()=>{const person=this.known.find(p=>p.id===this.selected);if(person)this.select(person);});
    this.pickedName.className="star-bottle-chosen-name";this.pickedName.setAttribute("role","status");this.pickedName.hidden=true;
    const empty=document.createElement("p");empty.className="star-bottle-empty";empty.textContent="瓶子还空着。\n去草地上拾起一颗落星，让它在瓶里住下来。";
    display.append(this.art,this.previous,this.next,this.pickedName,this.readButton,empty);
    this.detail.className="star-bottle-detail";this.name.className="star-bottle-name";this.name.tabIndex=-1;this.intro.className="star-bottle-intro";
    this.message.className="star-bottle-message";this.message.tabIndex=0;this.message.setAttribute("role","region");
    this.detail.append(this.name,this.intro,this.message);main.append(display,this.detail);root.append(fireflies,heading,main);
    const frame=world.canvas.closest<HTMLElement>(".game-stage-frame");if(!frame)throw new Error("星光瓶需要游戏画框");frame.append(root);
    new ResizeObserver(()=>this.resize()).observe(frame);new ResizeObserver(()=>this.positionStars()).observe(this.art);
    root.addEventListener("pointerdown",event=>event.stopPropagation());root.addEventListener("click",event=>event.stopPropagation());root.addEventListener("contextmenu",event=>event.preventDefault());
    this.art.addEventListener("click",event=>{
      // Keyboard activation keeps its exact focused star; pointer/touch can
      // miss a tiny sprite by a few pixels without choosing its DOM neighbour.
      if(!event.detail)return;
      event.preventDefault();event.stopPropagation();
      const rect=this.vessel.getBoundingClientRect(),size=this.geometry();
      const slot=nearestBottleStar(this.known.map(p=>({slot:p.slot,...size.slots[p.slot]})),event.clientX-rect.left,event.clientY-rect.top);
      const person=this.known.find(p=>p.slot===slot);if(person)this.select(person);
    });
    root.addEventListener("wheel",event=>{event.stopPropagation();if(!this.canScrollMessage(event.target,event.deltaY))event.preventDefault();},{passive:false});
    root.addEventListener("touchstart",event=>{this.touchY=event.touches[0]?.clientY??0;},{passive:true});
    root.addEventListener("touchmove",event=>{const y=event.touches[0]?.clientY??this.touchY,delta=this.touchY-y;this.touchY=y;if(!this.canScrollMessage(event.target,delta))event.preventDefault();},{passive:false});
    root.addEventListener("keydown",event=>{
      if(reservedShortcut(event))return;
      if(this.message.contains(event.target as Node)) {
        const top=bottleScrollTop(event.key,event.shiftKey,this.message.scrollTop,this.message.clientHeight,this.message.scrollHeight);
        if(top!==null){event.preventDefault();event.stopPropagation();this.message.scrollTop=top;}
      }else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End","PageUp","PageDown"].includes(event.key)||(event.key===" "&&!(event.target as Element).closest("button")))event.preventDefault();
    });
    window.addEventListener("keydown", event => {
      if (!this.opened || event.defaultPrevented || reservedShortcut(event) || event.key !== "Escape" || debugTarget(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
    }, { capture: true });
  }

  get opened(){return !this.element.hidden;}
  open() {
    this.compact=this.element.parentElement!.clientWidth<BOTTLE_COMPACT_WIDTH;this.element.dataset.compact=String(this.compact);this.element.dataset.view="bottle";
    this.known=bottleEntries(producers,this.found());this.selected="";this.pickedName.hidden=true;this.pickedName.textContent="";this.readButton.hidden=true;this.world.suspend("star-bottle",true);this.element.hidden=false;
    this.count.textContent=`已收藏 ${this.known.length}/${producers.length} 颗星`;
    this.name.textContent=this.known.length?"轻点瓶中的星星":"瓶子还空着";this.intro.textContent=this.known.length?"让旅途中遇见的光，陪你停留一会儿。":"去草地上拾起一颗落星，它就会住进这里。";
    this.intro.hidden=false;this.message.hidden=true;this.message.textContent="";this.detail.dataset.hasMessage="false";this.detail.dataset.selected="false";
    this.element.dataset.empty=String(!this.known.length);this.renderStars();(this.stars.querySelector<HTMLButtonElement>("button")??this.closeButton).focus({preventScroll:true});
  }
  close() {
    if(!this.opened)return;this.element.hidden=true;this.message.replaceChildren();this.world.suspend("star-bottle",false);
    clearQuietStarEffect(this.stars);
    if(!this.world.suspended)this.world.canvas.focus({preventScroll:true});
  }
  private resize() {
    const compact=this.element.parentElement!.clientWidth<BOTTLE_COMPACT_WIDTH;
    if(compact!==this.compact){
      const focusedStar=(document.activeElement as HTMLElement|null)?.closest<HTMLButtonElement>(".star-bottle-star")?.dataset.starId;
      this.compact=compact;this.element.dataset.compact=String(compact);this.renderStars();
      if(this.opened&&focusedStar){
        const reading=compact&&this.element.dataset.view==="reading"&&!this.message.hidden;
        (reading?this.message:this.stars.querySelector<HTMLButtonElement>(`[data-star-id="${focusedStar}"]`)??this.stars.querySelector<HTMLButtonElement>("button"))?.focus({preventScroll:true});
      }
    }
    this.positionStars();
  }
  private positionStars() {
    const size=this.geometry();this.vessel.style.width=`${size.width}px`;this.vessel.style.height=`${size.height}px`;
    for(const button of this.stars.querySelectorAll<HTMLButtonElement>("button")){const point=size.slots[Number(button.dataset.slot)];if(point){button.style.left=`${point.x}px`;button.style.top=`${point.y}px`;button.style.setProperty("--star-size",`${point.size}px`);button.style.setProperty("--star-angle",`${point.angle}deg`);}}
  }
  private geometry() {
    return bottleGeometry(this.art.clientWidth, this.art.clientHeight, this.compact, producers.length, this.known.map(person => person.slot));
  }
  private canScrollMessage(target:EventTarget|null,delta:number) {
    if(!(target instanceof Node)||!this.message.contains(target)||this.message.hidden)return false;
    return delta<0?this.message.scrollTop>0:delta>0&&this.message.scrollTop+this.message.clientHeight<this.message.scrollHeight-1;
  }
  private renderStars() {
    this.stars.replaceChildren();
    for (const person of this.known) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "star-bottle-star";
      button.dataset.starId = person.id;
      button.dataset.slot = String(person.slot);
      button.setAttribute("aria-label", `查看${person.name}的星星`);
      button.setAttribute("aria-pressed", String(this.selected === person.id));

      const art = document.createElement("span");
      art.className = "star-bottle-star-art";
      art.setAttribute("aria-hidden", "true");
      art.style.setProperty("--star-phase", `${person.slot * -.73}s`);
      if (person.shape) {
        art.dataset.shape = person.shape;
        art.style.backgroundImage = `url("${creditStarTexture(person.shape).toDataURL()}")`;
      }
      if (person.sprite) {
        const image = new Image();
        image.alt = "";
        image.draggable = false;
        image.onload = () => {
          art.style.backgroundImage = "none";
          art.append(image);
        };
        image.src = person.sprite;
      }
      button.append(art);
      button.addEventListener("click", event => {
        if (!event.detail) this.select(person);
      });
      this.stars.append(button);
    }
    this.previous.hidden = this.next.hidden = this.known.length < 2;
    this.positionStars();
  }
  private chooseAdjacent(delta:number) {
    if(!this.known.length)return;
    const index=this.known.findIndex(p=>p.id===this.selected);
    const next=index<0?(delta>0?0:this.known.length-1):(index+delta+this.known.length)%this.known.length;
    this.select(this.known[next],false);
  }
  private showBottle() {
    this.element.dataset.view="bottle";this.renderStars();
    (this.stars.querySelector<HTMLButtonElement>(`[data-star-id="${this.selected}"]`)??this.closeButton).focus({preventScroll:true});
  }
  private select(person:BottleEntry,openMessage=true) {
    this.selected=person.id;this.name.textContent=person.name;this.intro.hidden=true;const hasMessage=!!person.message.trim();this.message.hidden=!hasMessage;this.message.textContent=hasMessage?person.message:"";this.message.scrollTop=0;
    this.message.setAttribute("aria-label",`${person.name}的留言，可滚动阅读`);this.detail.dataset.hasMessage=String(hasMessage);this.detail.dataset.selected="true";
    this.element.dataset.view=hasMessage&&openMessage?"reading":"bottle";this.pickedName.textContent=person.name;this.pickedName.hidden=false;this.readButton.hidden=!hasMessage;
    clearQuietStarEffect(this.stars);
    for(const button of this.stars.querySelectorAll<HTMLButtonElement>("button")) {
      const selected=button.dataset.starId===person.id;
      button.setAttribute("aria-pressed",String(selected));
      if(selected&&!hasMessage)showQuietStarEffect(button,person.id,"bottle");
    }
    if(this.compact&&hasMessage&&openMessage)this.message.focus({preventScroll:true});
  }
}
