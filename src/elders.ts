import type { World, DepthLayer } from "./world";
import type { Activities } from "./activities";
import type { Progress } from "./core";
import { elderLines, elderPlaces, guardianGreeting, type ElderPage, type ElderPose } from "./elders-data";
import { sceneArt } from "./scene-art";

type ElderScene = keyof typeof elderPlaces;
type Choice = { title: string; run: () => void };
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

// Each 256 px source cell includes the held props. Anchor the boots, not the
// centre of the image, so raising a staff or extending a hand never shifts feet.
const frames: Record<ElderPose, [index: number, footX: number, footY: number]> = {
  dig: [0, 102, 235], stand: [1, 125, 235], point: [2, 121, 235],
  watch: [3, 123, 239], raiseStaff: [4, 108, 239], bow: [5, 122, 240],
};
function drawSprite(c: CanvasRenderingContext2D, pose: ElderPose, x: number, y: number, size: number, giftingBook = false) {
  const atlas = sceneArt.elders;
  if (!atlas.naturalWidth) return;
  const cell = atlas.naturalWidth / 3;
  const [frame, footX, footY] = frames[pose];
  c.drawImage(atlas, frame % 3 * cell, Math.floor(frame / 3) * cell, cell, cell,
    x - footX / 256 * size, y - footY / 256 * size, size, size);
  if (giftingBook && pose === "bow") {
    // Both the portrait and the depth-sorted map sprite hold the same little cloth book.
    c.save();
    c.translate(x, y);
    const scale = size / 256;
    c.scale(scale, scale);
    c.translate(-footX, -footY);
    c.save();
    c.translate(126, 148);
    c.rotate(-.15);
    c.fillStyle = "#524733"; c.fillRect(-31, -2, 56, 65);
    c.fillStyle = "#d8c599"; c.fillRect(-27, 52, 49, 7);
    c.fillStyle = "#4d705e"; c.fillRect(-29, -1, 50, 56);
    c.fillStyle = "#354e42"; c.fillRect(-29, -1, 6, 56);
    c.strokeStyle = "#c9b17e"; c.lineWidth = 1.5; c.strokeRect(-19, 5, 34, 43);
    c.fillStyle = "#f5da96"; c.beginPath(); c.arc(-2, 25, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#4d705e"; c.beginPath(); c.arc(2, 23, 10, 0, Math.PI * 2); c.fill();
    c.restore();
    // The original clasped fingertips fold over the top edge of the cover.
    c.drawImage(atlas, (2 + 113 / 256) * cell, (1 + 143 / 256) * cell,
      23 / 256 * cell, 14 / 256 * cell, 113, 143, 23, 14);
    c.restore();
  }
}

export class Elders {
  private page: ElderPage | null = null;
  private tending = false;
  private poseAge = 0;
  private giftingBook = false;

  constructor(private world: World, private activities: Activities,
    private progress: () => Pick<Progress, "astrolabe" | "residents">, private save: () => void,
    private openNotebook: () => void) {
    const depth = world.getDepthLayers, tick = world.onTick;
    world.getDepthLayers = () => world.scene === "challenge" || world.scene === "ruins"
      ? [...depth(), this.layer(world.scene)] : depth();
    world.onTick = (dt, time) => {
      tick(dt, time);
      if (this.page) this.poseAge += dt;
      if (world.scene !== "challenge" || this.gardenerDistance() > 65) this.tending = false;
    };
  }

  reset() {
    this.page = null;
    this.tending = false;
    this.poseAge = 0;
    this.giftingBook = false;
  }

  interact(id: string) {
    const scene = this.world.scene;
    if ((scene !== "challenge" && scene !== "ruins") || id !== elderPlaces[scene].id) return false;
    const state = this.progress();
    const page = scene === "challenge" ? "gardenWelcome" : guardianGreeting(state.astrolabe, state.residents.guardianInvited);
    this.say(scene, page);
    return true;
  }

  private say(scene: ElderScene, page: ElderPage) {
    const npc = elderPlaces[scene], line = elderLines[page], choices: Choice[] = [];
    const residents = this.progress().residents;
    const givingBook = !residents.guardianInvited && (page === "blessing" || page === "solved");
    const text = givingBook ? line.text + " 这本《遗迹手记》送给你。路上见过的痕迹，都可以记在里面。" : line.text;
    const reply = line.reply;
    if (reply) choices.push({ title: reply.title, run: () => this.say(scene, reply.next) });
    if (line.showNotebook) choices.push({ title: "翻开遗迹手记", run: this.openNotebook });
    this.activities.dialogue(npc.title, text, choices, c => drawSprite(c, line.pose, 24, 51, 54, givingBook), npc, () => {
      this.page = null;
      this.giftingBook = false;
      if (scene === "challenge") this.tending = true;
    });
    this.page = page;
    this.giftingBook = givingBook;
    this.poseAge = 0;
    if (givingBook) {
      residents.guardianInvited = true;
      this.save();
      this.world.onToast("获得《遗迹手记》 · 已收入背包");
    }
  }

  private gardenerDistance() {
    const gardener = elderPlaces.challenge;
    return Math.hypot(this.world.player.x - gardener.x, this.world.player.y - gardener.y);
  }

  private layer(scene: ElderScene): DepthLayer {
    const npc = elderPlaces[scene];
    const attending = !this.tending && this.gardenerDistance() <= 60;
    const idle = scene === "ruins" ? "watch" : (attending ? "stand" : "dig");
    const pose = this.page ? elderLines[this.page].pose : idle;
    return { y: npc.y, draw: c => {
      c.save();
      c.translate(npc.x, npc.y);
      c.fillStyle = scene === "ruins" ? "#1f273e60" : "#34523740";
      c.beginPath();
      c.ellipse(0, 1, 10, 3, 0, 0, Math.PI * 2);
      c.fill();
      // The garden lane is to the gardener's right; the altar is to the keeper's left.
      if (pose === "point" || pose === "raiseStaff") c.scale(-1, 1);
      if (!reduced.matches && pose === "bow" && this.poseAge < .65) {
        c.rotate(Math.sin(this.poseAge / .65 * Math.PI) * .055);
      }
      drawSprite(c, pose, 0, 0, 48, this.giftingBook);
      c.restore();
    } };
  }
}
