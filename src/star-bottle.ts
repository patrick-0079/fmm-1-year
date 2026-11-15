import "./star-bottle.css";
import { producers } from "./content";
import { reservedShortcut } from "./input";
import { meadowAtlasUrl } from "./wild-art";
import meadowBackground from "./assets/night-meadow-v16.webp";
import bottleUrl from "./assets/star-bottle-closeup.webp";
import { BOTTLE_COMPACT_WIDTH,bottleEntries,bottleGeometry,bottleScrollTop,type BottleEntry } from "./star-bottle-layout";
import type { World } from "./world";

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
  private readonly pageNumber=document.createElement("span");
  private readonly pickedName=document.createElement("p");
  private known:BottleEntry[]=[];
  private pageIndex=0;
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
    const main=document.createElement("div"),display=document.createElement("section"),glass=new Image();
    main.className="star-bottle-layout";display.className="star-bottle-display";this.art.className="star-bottle-art";this.vessel.className="star-bottle-vessel";
    glass.className="star-bottle-glass";glass.src=bottleUrl;glass.alt="";glass.decoding="async";glass.draggable=false;
    this.stars.className="star-bottle-stars";this.vessel.append(glass,this.stars);this.art.append(this.vessel);
    this.previous.type=this.next.type="button";this.previous.className="star-bottle-previous";this.next.className="star-bottle-next";
    this.previous.textContent="‹";this.next.textContent="›";this.previous.setAttribute("aria-label","上一页星星");this.next.setAttribute("aria-label","下一页星星");
    this.previous.addEventListener("click",()=>this.changePage(-1));this.next.addEventListener("click",()=>this.changePage(1));
    this.pageNumber.className="star-bottle-page-number";this.pageNumber.setAttribute("aria-live","polite");
    this.pickedName.className="star-bottle-chosen-name";this.pickedName.setAttribute("role","status");this.pickedName.hidden=true;
    const empty=document.createElement("p");empty.className="star-bottle-empty";empty.textContent="瓶子还空着。\n去草地上拾起一颗落星，让它在瓶里住下来。";
    display.append(this.art,this.previous,this.next,this.pageNumber,this.pickedName,empty);
    this.detail.className="star-bottle-detail";this.name.className="star-bottle-name";this.name.tabIndex=-1;this.intro.className="star-bottle-intro";
    this.message.className="star-bottle-message";this.message.tabIndex=0;this.message.setAttribute("role","region");
    this.detail.append(this.name,this.intro,this.message);main.append(display,this.detail);root.append(fireflies,heading,main);
    const frame=world.canvas.closest<HTMLElement>(".game-stage-frame");if(!frame)throw new Error("星光瓶需要游戏画框");frame.append(root);
    new ResizeObserver(()=>this.resize()).observe(frame);new ResizeObserver(()=>this.positionStars()).observe(this.art);
    root.addEventListener("pointerdown",event=>event.stopPropagation());root.addEventListener("click",event=>event.stopPropagation());root.addEventListener("contextmenu",event=>event.preventDefault());
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
    window.addEventListener("keydown",event=>{if(!this.opened||event.defaultPrevented||reservedShortcut(event)||event.key!=="Escape"||document.querySelector(".debug-panel:not([hidden])"))return;event.preventDefault();event.stopImmediatePropagation();this.close();},{capture:true});
  }

  get opened(){return !this.element.hidden;}
  open() {
    this.compact=this.element.parentElement!.clientWidth<BOTTLE_COMPACT_WIDTH;this.element.dataset.compact=String(this.compact);this.element.dataset.view="bottle";
    this.known=bottleEntries(producers,this.found(),this.compact);this.pageIndex=0;this.selected="";this.pickedName.hidden=true;this.pickedName.textContent="";this.world.suspend("star-bottle",true);this.element.hidden=false;
    this.count.textContent=`已收藏 ${this.known.length}/${producers.length} 颗星`;
    this.name.textContent=this.known.length?"轻点瓶中的星星":"瓶子还空着";this.intro.textContent=this.known.length?"让旅途中遇见的光，陪你停留一会儿。":"去草地上拾起一颗落星，它就会住进这里。";
    this.intro.hidden=false;this.message.hidden=true;this.message.textContent="";this.detail.dataset.hasMessage="false";this.detail.dataset.selected="false";
    this.element.dataset.empty=String(!this.known.length);this.renderStars();(this.stars.querySelector<HTMLButtonElement>("button")??this.closeButton).focus({preventScroll:true});
  }
  close() {
    if(!this.opened)return;this.element.hidden=true;this.message.replaceChildren();this.world.suspend("star-bottle",false);
    if(!this.world.suspended)this.world.canvas.focus({preventScroll:true});
  }
  private resize() {
    const compact=this.element.parentElement!.clientWidth<BOTTLE_COMPACT_WIDTH;
    if(compact!==this.compact){
      const focusedStar=(document.activeElement as HTMLElement|null)?.closest<HTMLButtonElement>(".star-bottle-star")?.dataset.starId;
      this.compact=compact;this.element.dataset.compact=String(compact);this.known=bottleEntries(producers,this.found(),compact);
      this.pageIndex=this.known.find(person=>person.id===this.selected)?.page??0;this.renderStars();
      if(this.opened&&focusedStar){
        const reading=compact&&this.element.dataset.view==="reading"&&!this.message.hidden;
        (reading?this.message:this.stars.querySelector<HTMLButtonElement>(`[data-star-id="${focusedStar}"]`)??this.stars.querySelector<HTMLButtonElement>("button"))?.focus({preventScroll:true});
      }
    }
    this.positionStars();
  }
  private positionStars() {
    const size=bottleGeometry(this.art.clientWidth,this.art.clientHeight,this.compact);this.vessel.style.width=`${size.width}px`;this.vessel.style.height=`${size.height}px`;
    for(const button of this.stars.querySelectorAll<HTMLButtonElement>("button")){const point=size.slots[Number(button.dataset.slot)];if(point){button.style.left=`${point.x}px`;button.style.top=`${point.y}px`;}}
  }
  private canScrollMessage(target:EventTarget|null,delta:number) {
    if(!(target instanceof Node)||!this.message.contains(target)||this.message.hidden)return false;
    return delta<0?this.message.scrollTop>0:delta>0&&this.message.scrollTop+this.message.clientHeight<this.message.scrollHeight-1;
  }
  private renderStars() {
    this.stars.replaceChildren();
    const selection=this.known.find(person=>person.id===this.selected);
    this.pickedName.hidden=!selection||selection.page!==this.pageIndex||!!selection.message.trim();
    for(const person of this.known.filter(item=>item.page===this.pageIndex)){
      const button=document.createElement("button"),art=document.createElement("span");button.type="button";button.className="star-bottle-star";button.dataset.starId=person.id;button.dataset.slot=String(person.slot);
      button.setAttribute("aria-label",`查看${person.name}的星星`);button.setAttribute("aria-pressed",String(this.selected===person.id));art.className="star-bottle-star-art";art.setAttribute("aria-hidden","true");art.style.setProperty("--star-phase",`${person.slot*-.73}s`);
      button.append(art);button.addEventListener("click",()=>this.select(person));this.stars.append(button);
    }
    const pages=Math.max(1,Math.ceil(this.known.length/(this.compact?2:8)));this.previous.hidden=this.next.hidden=this.pageNumber.hidden=pages<=1;this.previous.disabled=this.pageIndex===0;this.next.disabled=this.pageIndex>=pages-1;this.pageNumber.textContent=`${this.pageIndex+1} / ${pages}`;this.positionStars();
  }
  private changePage(delta:number) {
    const page=this.pageIndex+delta,pages=Math.ceil(this.known.length/(this.compact?2:8));if(page<0||page>=pages)return;
    this.pageIndex=page;this.renderStars();this.stars.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
  }
  private showBottle() {
    this.element.dataset.view="bottle";this.pageIndex=this.known.find(person=>person.id===this.selected)?.page??this.pageIndex;this.renderStars();
    (this.stars.querySelector<HTMLButtonElement>(`[data-star-id="${this.selected}"]`)??this.closeButton).focus({preventScroll:true});
  }
  private select(person:BottleEntry) {
    this.selected=person.id;this.name.textContent=person.name;this.intro.hidden=true;const hasMessage=!!person.message.trim();this.message.hidden=!hasMessage;this.message.textContent=hasMessage?person.message:"";this.message.scrollTop=0;
    this.message.setAttribute("aria-label",`${person.name}的留言，可滚动阅读`);this.detail.dataset.hasMessage=String(hasMessage);this.detail.dataset.selected="true";
    this.element.dataset.view=hasMessage?"reading":"bottle";this.pickedName.textContent=person.name;this.pickedName.hidden=hasMessage;
    for(const button of this.stars.querySelectorAll<HTMLButtonElement>("button"))button.setAttribute("aria-pressed",String(button.dataset.starId===person.id));
    if(this.compact&&hasMessage)this.message.focus({preventScroll:true});
  }
}
