import type { Activities } from "./activities";
import type { World, DepthLayer } from "./world";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story";
import { sceneArt } from "./scene-art";
import { drawSuyan } from "./suyan-art";
import { suyanSpot } from "./suyan-data";
import type { GardenResidents } from "./garden-residents";
import { drawGardenGesture } from "./garden-gesture-art";
import { drawResidentWalk } from "./resident-walk";
const motion=matchMedia("(prefers-reduced-motion: reduce)");

export class Suyan {
  private greeting = false;

  constructor(private world: World, private activities: Activities,
    private mail: LetterHandoff,private residents:GardenResidents) {
    const layers = world.getDepthLayers;
    world.getDepthLayers = () => world.scene === "garden" && residents.visible("suyan") ? [...layers(), this.layer()] : layers();
  }

  interact(id: string) {
    if (id !== suyanSpot.id || this.world.scene !== "garden" || !this.residents.interactable("suyan")) return false;
    if (this.world.busy || this.world.paused || this.world.suspended) return true;
    this.dialogue("刚才一阵风把信封吹到了脚边，我赶紧用帽子压住了。芙芙，你来得正好。", [
      { title: "你在等我吗？", run: () => this.offerLetter() },
    ]);
    this.world.onAchievementEvent("garden-guest-suyan");
    return true;
  }

  private offerLetter() {
    this.dialogue("嗯，这封是给你的。你看，封口的小花是我自己画的。", [
      letterChoice(this.mail, handedLetters.suyan, () => this.offerLetter()),
    ]);
  }

  private dialogue(text: string, options: { title: string; run: () => void }[]) {
    this.activities.dialogue(suyanSpot.title, text, options,
      c => { drawSuyan(c, sceneArt.suyan, 24, 52, 47, 1); }, this.residents.anchor("suyan"),
    () => { this.greeting = false;this.residents.talking("suyan",false); });
    this.residents.talking("suyan",true);
    this.greeting = true;
  }

  private layer(): DepthLayer {
    const actor=this.residents.get("suyan"), {x,y}=actor.foot;
    return { y, draw: c => {
      c.save();
      c.fillStyle = "#554c4528";
      c.beginPath(); c.ellipse(x,y+1,9,2.5,0,0,Math.PI*2);c.fill();
      const walk = actor.moving && !motion.matches && !this.greeting &&
        drawResidentWalk(c,"suyan",actor.foot,actor.facing,actor.step,43);
      if (!walk && (this.greeting || !drawGardenGesture(c,"suyan",actor,this.world.ambientTime,motion.matches,43)))
        drawSuyan(c, sceneArt.suyan,x,y,43,this.greeting ? 1 : 0);
      c.restore();
    } };
  }
}
