import { escapeHtml } from "./icons";
import { reservedShortcut } from "./input";
import type { CollectionSurface } from "./media";
import type { World } from "./world";
import "./page-memory-reader.css";

/** A page-only reading surface. It never starts the adventure or visits a map. */
export class PageMemoryReader implements CollectionSurface {
  private cleanups: (() => void)[] = [];
  private trigger: HTMLElement | null = null;
  private ownsSuspension = false;
  onReturnToGame: () => void = () => {};

  constructor(
    private world: World,
    private root: HTMLElement = document.querySelector<HTMLElement>(".page-memory-reader")!,
  ) {
    if (!root) throw new Error("The page memory reader needs a host element.");
    root.classList.add("page-memory-reader");
    if (!root.id) root.id = "page-memory-reader";
    root.hidden = true;
    root.setAttribute("aria-label", "回忆阅读区");
    root.addEventListener("click", event => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".page-reader-close")) this.close();
      if (event.target.closest(".page-reader-return")) {
        this.close(false);
        this.onReturnToGame();
      }
    });
    root.addEventListener("keydown", event => this.scrollWithKeyboard(event));
    window.addEventListener("keydown", event => {
      if (!this.opened || event.defaultPrevented || reservedShortcut(event) || event.key !== "Escape" ||
          document.querySelector(".debug-panel:not([hidden])") || (event.target instanceof Element && event.target.closest(".photo-original"))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
    }, { capture: true });
  }

  get opened() { return !this.root.hidden; }

  /** Call before openCollection so Close can return to the card that was used. */
  setTrigger(trigger: HTMLElement | null) {
    if (this.trigger !== trigger) this.trigger?.setAttribute("aria-expanded", "false");
    this.trigger = trigger;
    if (trigger) {
      trigger.setAttribute("aria-controls", this.root.id);
      trigger.setAttribute("aria-expanded", String(this.opened));
    }
  }

  open(title: string, subtitle: string, label: string) {
    const wasOpen = this.opened;
    if (!this.trigger?.isConnected && document.activeElement instanceof HTMLElement &&
        !this.root.contains(document.activeElement)) this.setTrigger(document.activeElement);
    this.clearContent();
    this.world.suspend("page-memory", true);
    this.ownsSuspension = true;
    this.root.hidden = false;
    this.root.setAttribute("aria-label", `${title} · 网页阅读`);
    this.trigger?.setAttribute("aria-expanded", "true");
    this.root.innerHTML = `<header class="page-reader-heading"><div><p class="page-reader-eyebrow">${escapeHtml(label)}</p><h3>${escapeHtml(title)}</h3><p class="page-reader-subtitle">${escapeHtml(subtitle)}</p></div><div class="page-reader-tools"><button type="button" class="page-reader-return">回到游戏 ↑</button><button type="button" class="page-reader-close" aria-keyshortcuts="Escape">收起 <span aria-hidden="true">×</span></button></div></header><div class="reader-body" tabindex="0" aria-label="${escapeHtml(title)}内容，可滚动阅读"></div>`;
    const body = this.root.querySelector<HTMLElement>(".reader-body")!;
    body.focus({ preventScroll: true });
    // Changing a letter or switching between the two already-open collections
    // must not move the surrounding page. Only reveal a newly opened surface.
    if (!wasOpen) {
      const rect = this.root.getBoundingClientRect();
      if (rect.top < 12 || rect.bottom > window.innerHeight - 12)
        this.root.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    return body;
  }

  onCleanup(cleanup: () => void) { this.cleanups.push(cleanup); }

  close(restoreFocus = true) {
    const wasOpen = this.opened;
    try {
      this.clearContent();
    } finally {
      this.root.hidden = true;
      this.trigger?.setAttribute("aria-expanded", "false");
      if (this.ownsSuspension) {
        this.ownsSuspension = false;
        this.world.suspend("page-memory", false);
      }
      if (wasOpen && restoreFocus && this.trigger?.isConnected && !this.trigger.closest("[inert]"))
        this.trigger.focus({ preventScroll: true });
    }
  }

  private clearContent() {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.root.replaceChildren();
  }

  private scrollWithKeyboard(event: KeyboardEvent) {
    if (reservedShortcut(event) || !(event.target instanceof Element)) return;
    if (event.defaultPrevented || event.target.closest(".photo-original")) return;
    const target = event.target;
    if (event.key === " " && target.closest("button,a")) return;
    const scroller = target.closest<HTMLElement>(".collection-list,.memory-detail") ??
      this.root.querySelector<HTMLElement>(".memory-detail");
    if (!scroller) return;
    const page = Math.max(48, scroller.clientHeight * .85);
    let next: number | undefined;
    switch (event.key) {
      case "ArrowUp": next = scroller.scrollTop - 40; break;
      case "ArrowDown": next = scroller.scrollTop + 40; break;
      case "ArrowLeft": case "ArrowRight": next = scroller.scrollTop; break;
      case "Home": next = 0; break;
      case "End": next = scroller.scrollHeight; break;
      case "PageUp": next = scroller.scrollTop - page; break;
      case "PageDown": next = scroller.scrollTop + page; break;
      case " ": next = scroller.scrollTop + (event.shiftKey ? -page : page); break;
    }
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    scroller.scrollTop = next;
  }
}
