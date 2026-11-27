import flowerAtlas from "./assets/rainbow-flowers-v15.webp";
import { sceneImage } from "./texture-cache";
import { drawPrismCircle } from "./prism-circle";
import { rainbowFlowers, rainbowIds, pickRainbow, meadowOpen, meadowGate, rainbowReminderStrength } from "./rainbow-flowers";
import type { World, DepthLayer } from "./world";
import { sfx } from "./sound";

export class FlowerTrail {
  private art = sceneImage(flowerAtlas);
  private time = 0;
  private firstExplorationTime?: number;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)");
  private preview = false;
  get previewOpen() { return this.preview; }
  setPreviewOpen(on:boolean) { this.preview=on; this.refresh(); }
  reset() {
    this.firstExplorationTime = undefined;
    this.setPreviewOpen(false);
  }
  constructor(private world: World, private found: () => string[], private save: () => void, private toast: (text: string) => void) {
    world.canEnter = scene => scene !== "meadow" || this.preview || meadowOpen(found());
    const available = world.available, layers = world.getDepthLayers, tick = world.onTick;
    world.available = spot => {
      if (spot.id === meadowGate.id) return this.preview || meadowOpen(found());
      return available(spot) && !(rainbowIds.includes(spot.id) && found().includes(spot.id));
    };
    world.getDepthLayers = () => [...layers(), ...this.layers()];
    const ground = world.onEnvironment;
    world.onEnvironment = (c, t) => {
      ground(c, t);
      if (world.scene === "garden" && world.canEnter("meadow")) {
        const near = Math.max(0, 1 - Math.hypot(world.player.x-meadowGate.x, world.player.y-meadowGate.y) / 60);
        drawPrismCircle(c, meadowGate.x, meadowGate.y, this.reduce.matches ? 0 : t, near);
      }
    };
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.time = t;
      if (this.firstExplorationTime === undefined && world.cuesVisible) this.firstExplorationTime = t;
    };
    this.refresh();
  }
  refresh() {
    const found = this.found(), unlocked = meadowOpen(found) || this.preview;
    const count = document.querySelector<HTMLElement>(".prism-count");
    if (count) count.textContent = found.length + " / 7";
    const hint = document.querySelector<HTMLElement>(".prism-hint");
    if (hint) hint.textContent = this.preview && !meadowOpen(found) ? "七色传送阵已临时点亮，可在小叶子身旁体验。" : unlocked ? "七色已齐。去周年庭院西边，在小叶子身旁踏入七色传送阵，就能到达花海。" : "留意草丛里的七色小花。每隔 30 秒，未采过的花会短暂亮起。";
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
  }
  interact(id: string) {
    if (rainbowIds.includes(id)) {
      const found = this.found(), flower = pickRainbow(found,this.world.scene,id);
      if (flower) {
        this.save(); this.refresh(); sfx(found.length === 7 ? "complete" : "match");
        this.toast(found.length === 7 ? "七色花谱集齐了！小叶子身旁的七色传送阵亮起来了，走进阵心就能到花海。" : `拾得${flower.name} · 七色花谱 ${found.length} / 7`);
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
    const reminder = this.world.cuesVisible && this.firstExplorationTime !== undefined
      ? rainbowReminderStrength(this.time - this.firstExplorationTime, this.reduce.matches)
      : 0;
    rainbowFlowers.forEach((flower,i) => {
      if (flower.scene !== this.world.scene || found.includes(flower.id)) return;
      layers.push({y:flower.y, draw:c=>{
        const size = [15,14,16,14,15,16,14][i];
        c.save();
        c.fillStyle = "#364d422e";
        c.beginPath(); c.ellipse(flower.x,flower.y,4.5,1.6,0,0,Math.PI*2); c.fill();
        if (reminder > 0) {
          const centerY = flower.y - size * .55, reach = 17;
          const glow = c.createRadialGradient(flower.x, centerY, 1, flower.x, centerY, reach);
          glow.addColorStop(0, "#fff4b4ed");
          glow.addColorStop(.45, "#ffe18b8c");
          glow.addColorStop(1, "#ffe18b00");
          c.globalAlpha = reminder;
          c.fillStyle = glow;
          c.fillRect(flower.x - reach, centerY - reach, reach * 2, reach * 2);
        }
        c.globalAlpha = .91 + .09 * reminder;
        this.stamp(c,i,flower.x,flower.y+1,size);
        const near = Math.hypot(this.world.player.x-flower.x,this.world.player.y-flower.y) < 44;
        const flicker = this.reduce.matches ? 0 : Math.max(0, Math.sin(this.time*1.6+i*2.4)) ** 5;
        c.globalAlpha = Math.max((near ? .52 : .18) + flicker*.39, reminder);
        c.fillStyle="#fff5d3";
        const sparkle = reminder > 0 ? 2 : 1;
        c.fillRect(flower.x + 5 - sparkle, flower.y - size + 2, sparkle * 2 + 1, 1);
        c.fillRect(flower.x + 5, flower.y - size + 2 - sparkle, 1, sparkle * 2 + 1);
        c.restore();
      }});
    });
    return layers;
  }
}
