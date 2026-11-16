import { readProgress, SAVE_KEY } from "../src/core";
import { producers } from "../src/content";
import { rainbowFlowers } from "../src/rainbow-flowers";
import { suyanSpot } from "../src/suyan-data";
import type { Point } from "../src/core";
import type { SceneId } from "../src/maps";

// The shared fixture replaces localStorage with this sessionStorage namespace.
// Starting here never reads, grants to, or resets a real player's progress.
const progress = readProgress(null);
progress.rainbowFlowers = rainbowFlowers.map(flower => flower.id);
progress.creditStars = producers.filter(person => person.id !== "star-zhenghao").map(person => person.id);
sessionStorage.setItem("fufu-interaction-cues-fixture/" + SAVE_KEY, JSON.stringify(progress));
await import("./interaction-cues-fixture");
interface CueQA {
  setRecordOnly(value: boolean): void;
  visit(scene: SceneId, id?: string, position?: Point): Promise<unknown>;
  movePlayer(point: Point): Promise<void>;
}
const qa = (window as unknown as {cueQA:CueQA}).cueQA;
qa.setRecordOnly(false);
const report = document.querySelector<HTMLElement>("#cue-report")!;
const enter = () => {
  if (!document.querySelector(".intro-screen")!.classList.contains("dismissed"))
    document.querySelector<HTMLButtonElement>(".enter-button")!.click();
};
const ready = (id: string, action: () => Promise<unknown>) => {
  const button = document.querySelector<HTMLButtonElement>(id)!;
  button.disabled = false;
  button.onclick = async () => {
    try {
      enter();
      await action();
      document.querySelector<HTMLCanvasElement>("#world")!.focus({preventScroll:true});
      report.textContent = "已到位，请实际操作互动";
    } catch (error) { report.textContent = "失败：" + String(error); }
  };
};
ready("#visit-suyan", () => qa.visit("garden", suyanSpot.id));
ready("#leave-suyan", () => qa.movePlayer({x:735,y:205}));
ready("#visit-cross-star", () => qa.visit("meadow", "star-zhenghao"));
ready("#visit-star-bottle", () => qa.visit("meadow", "meadow-jar"));
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preview-width]")) {
  button.onclick = () => {
    const app = document.querySelector<HTMLElement>("#app")!;
    app.style.width = button.dataset.previewWidth ? button.dataset.previewWidth + "px" : "";
    app.style.maxWidth = "100%";
    app.style.marginInline = "auto";
  };
}
