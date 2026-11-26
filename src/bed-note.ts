import noteImage from "./assets/xiaoye-note.webp";
import { sceneImage } from "./texture-cache";
import type { World } from "./world";
import { HOME_BED } from "./rest";
export class BedNote {
  private root: HTMLElement = document.querySelector(".bed-note")!;
  private pin: HTMLButtonElement = document.querySelector(".bed-note-pin")!;
  get isOpen() { return !this.root.hidden; }
  constructor(private world: World) {
    this.root.innerHTML = `<span class="note-tape" aria-hidden="true"></span><header><span>小叶子的床边便签</span><button class="note-close" aria-label="收起小叶子的便签">×</button></header><div class="bed-note-content"><p>小叶子让你休息一下再重新出发，<br><strong>辛苦啦宝宝</strong><span>♡ 小叶子</span></p></div><small>休息好了，按 E 或点「起身」继续出发</small>`;
    const illustration = sceneImage(noteImage);
    illustration.alt = "小叶子送来的芙芙四格插画";
    illustration.draggable = false;
    this.root.querySelector(".bed-note-content")!.prepend(illustration);
    this.root
      .querySelector(".note-close")!
      .addEventListener("click", () => this.close());
    this.pin.addEventListener("click", () => this.open());
  }
  open(message = "") {
    if (this.world.scene !== "room") return;
    this.root.querySelector(".note-extra")?.remove();
    if (message) {
      const extra = document.createElement("p");
      extra.className = "note-extra";
      extra.textContent = message;
      this.root.querySelector("small")!.before(extra);
    }
    this.root.hidden = false;
    this.root.parentElement!.classList.add("note-open");
  }
  close() {
    this.root.hidden = true;
    this.root.parentElement!.classList.remove("note-open");
  }
  refresh(unlocked: boolean) {
    const nearby =
      this.world.scene === "room" &&
      Math.hypot(
        this.world.player.x - HOME_BED.anchor.x,
        this.world.player.y - HOME_BED.anchor.y,
      ) < 140;
    this.pin.hidden = !unlocked || !nearby || !this.root.hidden;
    if (!nearby) this.close();
  }
}
