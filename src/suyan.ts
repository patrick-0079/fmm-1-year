import type { Activities } from "./activities";
import type { World, DepthLayer } from "./world";
import { collections } from "./content";
import { sceneArt } from "./scene-art";
import { drawSuyan } from "./suyan-art";
import { suyanSpot, SUYAN_LETTER_ID } from "./suyan-data";

/** A quiet garden visitor; conversation and letter share one authored message. */
export class Suyan {
  private greeting = false;

  constructor(private world: World, private activities: Activities,
    private readLetter: () => void) {
    const layers = world.getDepthLayers;
    world.getDepthLayers = () => world.scene === "garden" ? [...layers(), this.layer()] : layers();
  }

  interact(id: string) {
    if (id !== suyanSpot.id || this.world.scene !== "garden") return false;
    if (this.world.busy || this.world.paused || this.world.suspended) return true;
    const letter = collections.letters.items.find(item => item.id === SUYAN_LETTER_ID);
    this.activities.dialogue(suyanSpot.title, letter?.text ?? "", [
      { title: "阅读苏颜的来信", run: () => {
        this.activities.close();
        this.readLetter();
      } },
    ], c => { drawSuyan(c, sceneArt.suyan, 24, 52, 47, 1); }, suyanSpot,
    () => { this.greeting = false; });
    this.greeting = true;
    return true;
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
