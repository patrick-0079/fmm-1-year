import { escapeHtml } from "./icons";
import type { World } from "./world";
// An inline part of the game layout, with no dialog, backdrop, focus trap or input.
// Full letters/media need accessible DOM controls; the object remains on the map.
export class MapReader {
  private cleanups: (() => void)[] = [];
  private root: HTMLElement;
  constructor(private world: World) {
    this.root = document.querySelector(".map-reader")!;
    this.root.addEventListener("click", (e) => {
      if ((e.target as Element).closest(".reader-close")) this.close();
    });
  }
  open(title: string, subtitle: string, label: string) {
    this.close();
    this.root.hidden = false;
    this.root.innerHTML = `<header><div><small>${escapeHtml(label)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div><button class="reader-close map-action">收起回地图 ↑</button></header><div class="reader-body"></div>`;
    this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return this.root.querySelector<HTMLElement>(".reader-body")!;
  }
  onCleanup(callback: () => void) {
    this.cleanups.push(callback);
  }
  close() {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.root.hidden = true;
    this.root.replaceChildren();
    this.world.clearInput();
  }
}
