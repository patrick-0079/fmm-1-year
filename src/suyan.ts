import type { Activities } from "./activities";
import type { World, DepthLayer } from "./world";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story";
import { sceneArt } from "./scene-art";
import { drawSuyan } from "./suyan-art";
import { suyanSpot } from "./suyan-data";

export class Suyan {
  private greeting = false;

  constructor(private world: World, private activities: Activities,
    private mail: LetterHandoff) {
    const layers = world.getDepthLayers;
    world.getDepthLayers = () => world.scene === "garden" ? [...layers(), this.layer()] : layers();
  }

  interact(id: string) {
    if (id !== suyanSpot.id || this.world.scene !== "garden") return false;
    if (this.world.busy || this.world.paused || this.world.suspended) return true;
    this.dialogue("刚才一阵风把信封吹到了脚边，我赶紧用帽子压住了。芙芙，你来得正好。", [
      { title: "你在等我吗？", run: () => this.offerLetter() },
    ]);
    return true;
  }

  private offerLetter() {
    this.dialogue("嗯，这封是给你的。你看，封口的小花是我自己画的。", [
      letterChoice(this.mail, handedLetters.suyan, () => this.offerLetter()),
    ]);
  }

  private dialogue(text: string, options: { title: string; run: () => void }[]) {
    this.activities.dialogue(suyanSpot.title, text, options,
      c => { drawSuyan(c, sceneArt.suyan, 24, 52, 47, 1); }, suyanSpot,
    () => { this.greeting = false; });
    this.greeting = true;
  }

  private layer(): DepthLayer {
    return { y: suyanSpot.y, draw: c => {
      c.save();
      c.fillStyle = "#554c4528";
      c.beginPath(); c.ellipse(suyanSpot.x, suyanSpot.y + 1, 9, 2.5, 0, 0, Math.PI * 2); c.fill();
      drawSuyan(c, sceneArt.suyan, suyanSpot.x, suyanSpot.y, 43, this.greeting ? 1 : 0);
      c.restore();
    } };
  }
}
