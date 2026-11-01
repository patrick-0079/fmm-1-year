import { escapeHtml } from "./icons";
import type { World } from "./world";
// An inline part of the game layout, with no dialog, backdrop, focus trap or input.
// Full letters/media need accessible DOM controls; the object remains on the map.
export class MapReader {
  private cleanups: (() => void)[] = [];
  private root: HTMLElement;
  inGame = false;
  onChangeView: () => void = () => {};
  private ownsPause = false;
  constructor(private world: World) {
    this.root = document.querySelector(".map-reader")!;
    for (const root of document.querySelectorAll(
      ".map-reader,.game-letter-reader",
    ))
      root.addEventListener("click", (e) => {
        if ((e.target as Element).closest(".reader-close")) this.close();
        if ((e.target as Element).closest(".reader-change-view"))
          this.onChangeView();
      });
    const action = world.onAction;
    world.onAction = (pressed) => {
      if (!this.ownsPause) return action(pressed);
      if (pressed) this.close();
      return true;
    };
    window.addEventListener("keydown", (e) => {
      if (!this.root.hidden && e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
  }
  open(title: string, subtitle: string, label: string) {
    this.close();
    this.root = document.querySelector(
      this.inGame ? ".game-letter-reader" : ".map-reader",
    )!;
    this.root.hidden = false;
    this.root.innerHTML = `<header><div><small>${escapeHtml(label)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div><div class="reader-tools">${title === "晚安信箱" ? `<button class="reader-change-view map-action">${this.inGame ? "在页面中展开" : "在游戏中阅读"}</button>` : ""}<button class="reader-close map-action">收起回地图 · Esc</button></div></header><div class="reader-body" tabindex="0"></div>`;
    if (this.inGame) {
      this.ownsPause = true;
      this.world.paused = true;
      this.world.canvas.parentElement!.classList.add("reading-letter");
    }
    this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    this.root
      .querySelector<HTMLElement>(".reader-body")!
      .focus({ preventScroll: true });
    return this.root.querySelector<HTMLElement>(".reader-body")!;
  }
  onCleanup(callback: () => void) {
    this.cleanups.push(callback);
  }
  close() {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.root.hidden = true;
    this.root.replaceChildren();
    if (this.ownsPause) {
      this.ownsPause = false;
      this.world.paused = false;
      this.world.canvas.parentElement!.classList.remove("reading-letter");
      this.world.canvas.focus({ preventScroll: true });
    }
    this.world.clearInput();
  }
}
