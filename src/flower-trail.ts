import flowerAtlas from "./assets/rainbow-flowers-v15.webp";
import { rainbowFlowers, rainbowIds, pickRainbow, meadowOpen, meadowGate } from "./rainbow-flowers";
import type { World, DepthLayer } from "./world";
import { sfx } from "./sound";

export class FlowerTrail {
  private art = new Image();
  private time = 0;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)");
  private preview = false;
  get previewOpen() { return this.preview; }
  setPreviewOpen(on:boolean) { this.preview=on; this.refresh(); }
  constructor(private world: World, private found: () => string[], private save: () => void, private toast: (text: string) => void) {
    this.art.src = flowerAtlas;
    world.canEnter = scene => scene !== "meadow" || this.preview || meadowOpen(found());
    const available = world.available, layers = world.getDepthLayers, tick = world.onTick;
    world.available = spot => {
      if (spot.id === meadowGate.id) return this.preview || meadowOpen(found());
      return available(spot) && !(rainbowIds.includes(spot.id) && found().includes(spot.id));
    };
    world.getDepthLayers = () => [...layers(), ...this.layers()];
    world.onTick = (dt,t) => { tick(dt,t); this.time=t; };
    this.refresh();
  }
  refresh() {
    const found = this.found(), unlocked = meadowOpen(found) || this.preview;
    const count = document.querySelector<HTMLElement>(".prism-count");
    if (count) count.textContent = found.length + " / 7";
    const hint = document.querySelector<HTMLElement>(".prism-hint");
    if (hint) hint.textContent = this.preview && !meadowOpen(found) ? "花门正在临时开放，你的真实花谱没有改变。" : unlocked ? "七色已齐。周年庭院西边、气球摊南侧出现了一道花门。" : "留意草丛里偶尔闪一下的七色小花。每一种只能采一次。";
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
    return false;
  }
  private stamp(c: CanvasRenderingContext2D, index: number, x: number, y: number, size: number) {
    if (!this.art.complete || !this.art.naturalWidth) return;
    c.drawImage(this.art,(index%4)*192,Math.floor(index/4)*192,192,192,x-size/2,y-size,size,size);
  }
  private layers(): DepthLayer[] {
    const found=this.found(), layers: DepthLayer[]=[];
    rainbowFlowers.forEach((flower,i) => {
      if (flower.scene !== this.world.scene || found.includes(flower.id)) return;
      layers.push({y:flower.y, draw:c=>{
        const size = [15,14,16,14,15,16,14][i];
        c.save();
        c.fillStyle = "#364d422e";
        c.beginPath(); c.ellipse(flower.x,flower.y,4.5,1.6,0,0,Math.PI*2); c.fill();
        c.globalAlpha=.91; this.stamp(c,i,flower.x,flower.y+1,size);
        const near = Math.hypot(this.world.player.x-flower.x,this.world.player.y-flower.y) < 44;
        const flicker = this.reduce.matches ? 0 : Math.max(0, Math.sin(this.time*1.6+i*2.4)) ** 5;
        c.globalAlpha = (near ? .52 : .18) + flicker*.39;
        c.fillStyle="#fff5d3";
        c.fillRect(flower.x+4,flower.y-size+2,3,1); c.fillRect(flower.x+5,flower.y-size+1,1,3);
        c.restore();
      }});
    });
    if (this.world.scene === "garden" && (this.preview || meadowOpen(found))) {
      layers.push({y:meadowGate.y+1,draw:c=>this.stamp(c,7,meadowGate.x,meadowGate.y,70)});
    }
    return layers;
  }
}
