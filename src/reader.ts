import { escapeHtml } from "./icons";
import { reservedShortcut } from "./input";
import type { World } from "./world";
// An inline part of the game layout, with no dialog, backdrop, focus trap or input.
// Full letters/media need accessible DOM controls; the object remains on the map.
export class MapReader {
  private cleanups: (() => void)[] = [];
  private root: HTMLElement;
  inGame = false;
  onChangeView: () => void = () => {};
  private ownsPause = false;
  private touchY = 0;
  private readingFocus: HTMLElement | null = null;
  constructor(private world: World) {
    this.root = document.querySelector(".map-reader")!;
    for (const root of document.querySelectorAll<HTMLElement>(
      ".map-reader,.game-letter-reader",
    )) {
      root.addEventListener("focusin", event => {
        if (event.target instanceof HTMLElement) this.readingFocus = event.target;
      });
      root.addEventListener("click", (e) => {
        if ((e.target as Element).closest(".reader-close")) this.close();
        if ((e.target as Element).closest(".reader-change-view"))
          this.onChangeView();
      });
      root.addEventListener("keydown", event => this.scrollReading(event));
      root.addEventListener("wheel", event => {
        if (this.inGame && !this.canScroll(event.target, event.deltaY)) event.preventDefault();
      }, { passive: false });
      root.addEventListener("touchstart", event => { this.touchY = event.touches[0]?.clientY ?? 0; }, { passive: true });
      root.addEventListener("touchmove", event => {
        const y = event.touches[0]?.clientY ?? this.touchY, delta = this.touchY - y;
        this.touchY = y;
        if (this.inGame && !this.canScroll(event.target, delta)) event.preventDefault();
      }, { passive: false });
    }
    const action = world.onAction;
    world.onAction = (pressed) => {
      if (!this.ownsPause) return action(pressed);
      if (pressed) this.close();
      return true;
    };
    window.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || reservedShortcut(e) || this.world.suspended) return;
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
    this.root.classList.toggle("game-album-reader", this.inGame && title === "回忆相册");
    this.root.setAttribute("aria-label", `${title} · ${this.inGame ? "游戏内阅读" : "地图阅读"}`);
    this.root.innerHTML = `<header><div><small>${escapeHtml(label)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div><div class="reader-tools">${title === "晚安信箱" ? `<button class="reader-change-view map-action">${this.inGame ? "页面阅读" : "在游戏中阅读"}</button>` : ""}<button class="reader-close map-action">${this.inGame ? "收起 · Esc" : "收起回地图 · Esc"}</button></div></header><div class="reader-body" tabindex="0" aria-label="${escapeHtml(title)}内容，可滚动阅读"></div>`;
    if (this.inGame) {
      this.ownsPause = true;
      this.world.paused = true;
      this.world.canvas.parentElement!.classList.add("reading-letter");
    }
    if (!this.inGame) this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    this.root
      .querySelector<HTMLElement>(".reader-body")!
      .focus({ preventScroll: true });
    return this.root.querySelector<HTMLElement>(".reader-body")!;
  }
  onCleanup(callback: () => void) {
    this.cleanups.push(callback);
  }
  /** Return from help to the selected photo/letter, not the paused canvas. */
  restoreFocus() {
    if (this.root.hidden) return false;
    const target = this.readingFocus && this.root.contains(this.readingFocus) &&
      !this.readingFocus.closest("[hidden],[inert]") && !this.readingFocus.matches(".reader-body:not([tabindex])")
      ? this.readingFocus
      : this.root.querySelector<HTMLElement>('.mail-chest:not([hidden]) [aria-current="true"]') ??
        this.root.querySelector<HTMLElement>(".memory-detail,.reader-body");
    target?.focus({ preventScroll: true });
    return true;
  }
  private canScroll(target: EventTarget | null, delta: number) {
    const scroller = target instanceof Element ? target.closest<HTMLElement>(".collection-list,.memory-detail,.photo-original-stage") : null;
    if (!scroller || !this.root.contains(scroller)) return false;
    return delta < 0 ? scroller.scrollTop > 0 : delta > 0 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
  }
  private scrollReading(event: KeyboardEvent) {
    if (!this.inGame || reservedShortcut(event) || !(event.target instanceof Element)) return;
    if (event.defaultPrevented || event.target.closest(".photo-book,.photo-original")) return;
    if (event.key === " " && event.target.closest("button,a")) return;
    const scroller = event.target.closest<HTMLElement>(".collection-list,.memory-detail") ??
      (event.target.matches(".reader-body") ? this.root.querySelector<HTMLElement>(".memory-detail") : null);
    if (!scroller) return;
    const page = Math.max(40, scroller.clientHeight * .85);
    const steps: Record<string, number> = { ArrowUp: -40, ArrowDown: 40, ArrowLeft: 0, ArrowRight: 0,
      PageUp: -page, PageDown: page, " ": event.shiftKey ? -page : page };
    const top = event.key === "Home" ? 0 : event.key === "End" ? scroller.scrollHeight :
      Object.hasOwn(steps, event.key) ? scroller.scrollTop + steps[event.key] : null;
    if (top === null) return;
    event.preventDefault(); event.stopPropagation(); scroller.scrollTop = top;
  }
  close() {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.root.hidden = true;
    this.root.replaceChildren();
    this.readingFocus = null;
    if (this.ownsPause) {
      this.ownsPause = false;
      this.world.paused = false;
      this.world.canvas.parentElement!.classList.remove("reading-letter");
      this.world.canvas.focus({ preventScroll: true });
    }
    this.world.clearInput();
  }
}
