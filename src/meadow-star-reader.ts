import "./meadow-star-reader.css";
import { reservedShortcut } from "./input";
import type { World } from "./world";

/** A quiet, persistent paper inside the map. Only the character is paused;
 * the meadow's existing onTick chain continues to animate light and fireflies.
 */
export class MeadowStarReader {
  readonly element = document.createElement("article");
  private readonly title = document.createElement("strong");
  private readonly source = document.createElement("small");
  private readonly body = document.createElement("div");
  private readonly closeButton = document.createElement("button");
  private previousPause = false;

  constructor(private world: World) {
    const root = this.element;
    root.className = "meadow-star-reader";
    root.hidden = true;
    this.title.className = "meadow-star-reader-name";
    this.source.className = "meadow-star-reader-source";
    this.body.className = "meadow-star-reader-body";
    this.body.tabIndex = 0;
    this.body.setAttribute("role", "region");
    this.closeButton.type = "button";
    this.closeButton.className = "meadow-star-reader-close";
    this.closeButton.textContent = "收起 ×";
    this.closeButton.setAttribute("aria-keyshortcuts", "Escape");
    this.closeButton.addEventListener("click", () => this.close());
    const heading = document.createElement("div"), header = document.createElement("header");
    heading.append(this.source, this.title);
    header.append(heading, this.closeButton);
    root.append(header, this.body);
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("click", event => event.stopPropagation());
    root.addEventListener("contextmenu", event => event.preventDefault());
    root.addEventListener("wheel", event => {
      event.stopPropagation();
      const inBody = event.target instanceof Node && this.body.contains(event.target);
      const atTop = this.body.scrollTop <= 0, atBottom = this.body.scrollTop + this.body.clientHeight >= this.body.scrollHeight - 1;
      if (!inBody || (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) event.preventDefault();
    }, { passive: false });
    window.addEventListener("keydown", event => {
      if (!this.opened || world.suspended || reservedShortcut(event)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      }
    }, { capture: true });
    world.canvas.parentElement!.append(root);
  }

  get opened() { return !this.element.hidden; }

  open(name: string, message: string, source = "落星里的留言") {
    if (!message.trim()) { this.close(); return; }
    if (!this.opened) this.previousPause = this.world.paused;
    this.world.clearInput();
    this.world.paused = true;
    this.title.textContent = name;
    this.source.textContent = source;
    this.source.hidden = !source;
    this.body.textContent = message;
    this.body.scrollTop = 0;
    this.body.setAttribute("aria-label", name + "的留言，可滚动阅读");
    this.element.setAttribute("aria-label", name + "的星光留言");
    this.closeButton.setAttribute("aria-label", "收起" + name + "的留言，回到花海");
    this.element.hidden = false;
    this.world.canvas.parentElement!.classList.add("meadow-reading");
    this.body.focus({ preventScroll: true });
  }

  close() {
    if (!this.opened) return;
    this.element.hidden = true;
    this.body.replaceChildren();
    this.world.canvas.parentElement!.classList.remove("meadow-reading");
    this.world.clearInput();
    this.world.paused = this.previousPause;
    this.world.canvas.focus({ preventScroll: true });
  }
}
