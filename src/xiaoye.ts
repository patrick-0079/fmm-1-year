import type { Activities } from "./activities";
import type { Phase } from "./day";
import type { World, DepthLayer } from "./world";
import { sceneArt } from "./scene-art";
import { XiaoyeHug, xiaoyeFrame, xiaoyeFrames, xiaoyeHugText, xiaoyeLanternOn,
  xiaoyeLanternPoint, xiaoyeScale, xiaoyeSpot } from "./xiaoye-data";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const HEIGHT = 60;

export class Xiaoye {
  private hug = new XiaoyeHug();
  private time = 0;
  private ownsDialogue = false;
  private portraitPhase: Phase = "day";
  private panels: HTMLElement[];

  constructor(private world: World, private activities: Activities,
    private phase: () => Phase = () => "day") {
    this.panels = Array.from(document.querySelectorAll<HTMLElement>(
      ".inventory-panel,.map-reader,.game-letter-reader,.page-memory-reader,.inline-help",
    ));
    const tick = world.onTick, depth = world.getDepthLayers, effects = world.onEffects;
    world.onTick = (dt, time) => {
      tick(dt, time);
      this.time = time;
      const free = world.scene === "garden" && !world.paused && !world.suspended &&
        !world.busy && !world.restState && !world.actorHidden &&
        this.panels.every(panel => panel.hidden);
      this.hug.tick(dt, world.player, free && this.ownsDialogue);
      if (world.scene !== "garden") this.reset();
    };
    world.getDepthLayers = () => world.scene === "garden" ? [...depth(), ...this.layers()] : depth();
    world.onEffects = c => { effects(c); this.drawLanternGlow(c); };
  }

  reset() {
    this.hug.cancel();
    this.ownsDialogue = false;
  }

  interact(id: string) {
    if (id !== xiaoyeSpot.id || this.world.scene !== "garden") return false;
    if (this.world.paused || this.world.suspended || this.world.busy || this.ownsDialogue || this.hug.active) return true;
    // begin() also rejects repeated or remote activations without restarting an
    // in-progress embrace. The normal interaction path brings clicks here first.
    if (!this.hug.begin(this.world.player)) return true;
    this.portraitPhase = this.phase();
    this.activities.dialogue("小叶子 · 大猫猫玩偶", xiaoyeHugText, [], c => {
      this.drawSprite(c, xiaoyeFrame(this.portraitPhase, true), 24, 53, 54, false, 0);
    }, xiaoyeSpot, () => this.reset());
    this.ownsDialogue = true;
    return true;
  }

  private drawSprite(c: CanvasRenderingContext2D, frame: number, x: number, y: number,
    size: number, mirror: boolean, lean: number, pawOnly = false) {
    const sprites = sceneArt.xiaoye;
    if (!sprites.naturalWidth) return;
    const pose = xiaoyeFrames[frame], scale = xiaoyeScale(frame, size);
    const crop = pawOnly ? pose.paw : pose;
    if (!crop) return;
    c.save(); c.translate(x, y);
    if (mirror) c.scale(-1, 1);
    c.rotate(lean);
    c.drawImage(sprites, crop.x, crop.y, crop.w, crop.h,
      (crop.x - pose.footX) * scale, (crop.y - pose.footY) * scale, crop.w * scale, crop.h * scale);
    c.restore();
  }

  private layers(): DepthLayer[] {
    const layers: DepthLayer[] = [{ y: xiaoyeSpot.y, draw: c => {
      c.save();
      c.fillStyle = "#554c4530"; c.beginPath();
      c.ellipse(xiaoyeSpot.x, xiaoyeSpot.y + 1, 15, 3.8, 0, 0, Math.PI * 2); c.fill();
      const hugging = this.hug.active, lean = this.lean();
      this.drawSprite(c, xiaoyeFrame(this.phase(), hugging), xiaoyeSpot.x, xiaoyeSpot.y,
        HEIGHT, hugging && this.hug.mirrored, lean);
      c.restore();
    } }];
    // Only the reaching paw passes in front of a neighbouring shoulder. The
    // cat's body still uses its own feet, so neither actor erases the other.
    const player = this.world.player;
    if (this.hug.active && Math.abs(player.x - xiaoyeSpot.x) >= 14 &&
      Math.abs(player.y - xiaoyeSpot.y) <= 14) {
      layers.push({ y: Math.max(xiaoyeSpot.y, player.y) + .1, draw: c =>
        this.drawSprite(c, xiaoyeFrame(this.phase(), true), xiaoyeSpot.x, xiaoyeSpot.y,
          HEIGHT, this.hug.mirrored, this.lean(), true) });
    }
    return layers;
  }

  private lean() {
    return motion.matches || !this.hug.active ? 0 : Math.sin(this.hug.progress * Math.PI) * .035;
  }

  private drawLanternGlow(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "garden" || !xiaoyeLanternOn(this.phase()) || !sceneArt.xiaoye.naturalWidth) return;
    const mirror = this.hug.active && this.hug.mirrored;
    const lamp = xiaoyeLanternPoint(xiaoyeFrame(this.phase(), this.hug.active), HEIGHT, mirror, this.lean());
    if (!lamp) return;
    const x = xiaoyeSpot.x + lamp.x, y = xiaoyeSpot.y + lamp.y;
    const breathe = motion.matches ? 1 : 1 + Math.sin(this.time * 1.5) * .025;
    c.save();
    c.globalCompositeOperation = "screen";
    const glow = c.createRadialGradient(x, y, 1, x, y, 35 * breathe);
    glow.addColorStop(0, "#ffe6a568");
    glow.addColorStop(.25, "#efbb5e2b");
    glow.addColorStop(1, "#e6a85500");
    c.fillStyle = glow; c.fillRect(x - 37, y - 37, 74, 74);
    c.restore();
  }
}
