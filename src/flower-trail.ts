import flowerAtlas from "./assets/rainbow-flowers-v15.webp";
import { rainbowFlowers, rainbowIds, pickRainbow, meadowOpen, meadowGate } from "./rainbow-flowers";
import { meadowArchCrown } from "./meadow-map";
import type { World, DepthLayer } from "./world";
import { sfx } from "./sound";

const petals = ["#ea9caa","#efa772","#f9da83","#a7d3a4","#9bd5dc","#a7afd8","#d1abd9"];
export class FlowerTrail {
  private art = new Image();
  private time = 0;
  private breeze = 6;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(private world: World, private found: () => string[], private save: () => void, private toast: (text: string) => void) {
    this.art.src = flowerAtlas;
    world.canEnter = scene => scene !== "meadow" || meadowOpen(found());
    const available = world.available, layers = world.getDepthLayers, tick = world.onTick;
    world.available = spot => {
      if (spot.id === meadowGate.id) return meadowOpen(found());
      return available(spot) && !(rainbowIds.includes(spot.id) && found().includes(spot.id));
    };
    world.getDepthLayers = () => [...layers(), ...this.layers()];
    world.onTick = (dt,t) => { tick(dt,t); this.time=t; this.breeze+=dt; };
    const environment = world.onEnvironment;
    world.onEnvironment = (c,t) => {
      environment(c,t);
      if (world.scene === "meadow") this.drift(c);
    };
    this.refresh();
  }
  refresh() {
    const found = this.found(), unlocked = meadowOpen(found);
    const count = document.querySelector<HTMLElement>(".prism-count");
    if (count) count.textContent = found.length + " / 7";
    const hint = document.querySelector<HTMLElement>(".prism-hint");
    if (hint) hint.textContent = unlocked ? "七色已齐。周年庭院西边、气球摊南侧出现了一道花门。" : "沿着线索寻找带彩虹光边的花。每一种只能采一次。";
    const list = document.querySelector<HTMLElement>(".prism-list");
    if (list) {
      list.replaceChildren(...rainbowFlowers.map(f => {
        const li=document.createElement("li"), chip=document.createElement("i");
        chip.style.background = f.color; chip.setAttribute("aria-hidden","true");
        const label=document.createElement("span"), clue=document.createElement("small");
        label.textContent=(found.includes(f.id) ? "✓ " : "◇ ")+f.name; clue.textContent=f.place;
        li.append(chip,label,clue); return li;
      }));
    }
    const button = document.querySelector<HTMLButtonElement>('[data-scene="meadow"]');
    if (button) button.hidden = !unlocked;
    if (unlocked) void this.world.prepareScene("meadow").catch(() => {});
  }
  interact(id: string) {
    if (rainbowIds.includes(id)) {
      const found = this.found(), flower = pickRainbow(found,this.world.scene,id);
      if (flower) {
        this.save(); this.refresh(); sfx(found.length === 7 ? "complete" : "match");
        this.toast(found.length === 7 ? "七色花谱集齐了！周年庭院西边的花门通往花海。" : `拾得${flower.name} · 七色花谱 ${found.length} / 7`);
      }
      return true;
    }
    if (this.world.scene !== "meadow") return false;
    if (id === "meadow-breeze" || id === "meadow-echo") {
      this.breeze = 0;
      sfx(id === "meadow-echo" ? "revive" : "release");
      this.toast(id === "meadow-echo" ? "花间回声轻轻应和：芙芙，直播一周年快乐。晚安，明天见。" : "七色花瓣乘着风来啦 · 芙芙，愿下一年的每个夜晚也有花开。");
      return true;
    }
    if (id.startsWith("meadow-seat-")) {
      const seat=this.world.config.spots.find(s=>s.id===id);
      if (!seat) return false;
      this.world.sit({x:seat.x,y:seat.y-4},seat.approach);
      this.toast("坐在花海里，听一会儿风。"); return true;
    }
    return false;
  }
  private stamp(c: CanvasRenderingContext2D, index: number, x: number, y: number, size: number) {
    if (!this.art.complete || !this.art.naturalWidth) return;
    c.drawImage(this.art,(index%4)*192,Math.floor(index/4)*192,192,192,x-size/2,y-size,size,size);
  }
  private layers(): DepthLayer[] {
    if (this.world.scene === "meadow") {
      const center = this.world.config.spots.find(s=>s.id==="meadow-breeze")!;
      return [
        {y:568, draw:c=>this.world.drawMapFragment(c,meadowArchCrown)},
        {y:center.y+4, draw:c=>{
          const bouquet = [[-12,-1],[-6,-5],[0,-7],[7,-5],[13,-1],[-4,3],[4,4]];
          bouquet.forEach(([dx,dy],i) => {
            const sway = this.reduce.matches || this.breeze>=5 ? 0 : Math.sin(this.time*3+i)*1.3;
            this.stamp(c,i,center.x+dx+sway,center.y+dy,14);
          });
        }},
      ];
    }
    const found=this.found(), layers: DepthLayer[]=[];
    rainbowFlowers.forEach((flower,i) => {
      if (flower.scene !== this.world.scene || found.includes(flower.id)) return;
      layers.push({y:flower.y, draw:c=>{
        this.stamp(c,i,flower.x,flower.y+2,26);
        const sparkle=this.reduce.matches ? 0 : Math.sin(this.time*2+i)*2;
        c.fillStyle="#fff2bc"; c.fillRect(flower.x+10, flower.y-18+sparkle,3,1);
        c.fillRect(flower.x+11,flower.y-19+sparkle,1,3);
      }});
    });
    if (this.world.scene === "garden" && meadowOpen(found)) {
      layers.push({y:meadowGate.y+1,draw:c=>this.stamp(c,7,meadowGate.x,meadowGate.y,70)});
    }
    return layers;
  }
  private drift(c: CanvasRenderingContext2D) {
    if (this.reduce.matches && this.breeze >= 5) return;
    const wave = this.breeze < 5, time=this.reduce.matches ? 1 : this.time;
    const view=this.world.visibleArea;
    c.save();
    for(let i=0;i<(wave ? 65 : 14);i++) {
      const x=view.x+((i*97+time*(wave ? 60 : 8))%view.w);
      const y=view.y+((i*67+time*7+Math.sin(time*.9+i)*8+view.h)%view.h);
      c.globalAlpha=wave ? .68*Math.min(1,(5-this.breeze)*1.7) : .44;
      c.fillStyle=petals[i%petals.length]; c.fillRect(Math.round(x),Math.round(y),3,1.5);
      c.fillRect(Math.round(x+1),Math.round(y-1),2,1);
    }
    c.restore();
  }
}
