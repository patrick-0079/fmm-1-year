import "./star-bottle.css";
import { producers } from "./content";
import { reservedShortcut } from "./input";
import type { World } from "./world";

const positions = [
  [77, 164], [151, 160], [225, 168], [111, 246],
  [194, 248], [77, 330], [151, 335], [225, 327],
] as const;
type BottleCredit = typeof producers[number] & { page: number; slot: number };
let serial = 0;

function glassArt(id: string) {
  return `<svg class="star-bottle-glass" viewBox="0 0 300 410" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}-glass" x1="0" x2="1"><stop stop-color="#a9d7d3" stop-opacity=".32"/><stop offset=".28" stop-color="#9bd1d4" stop-opacity=".08"/><stop offset=".72" stop-color="#c2e3db" stop-opacity=".13"/><stop offset="1" stop-color="#badbd0" stop-opacity=".37"/></linearGradient>
      <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3ead0"/><stop offset=".4" stop-color="#b3cfcb"/><stop offset=".75" stop-color="#5f9298"/><stop offset="1" stop-color="#d9dec1"/></linearGradient>
      <linearGradient id="${id}-cork" x1="0" x2="1"><stop stop-color="#866442"/><stop offset=".22" stop-color="#c29c69"/><stop offset=".54" stop-color="#e4c18b"/><stop offset="1" stop-color="#967246"/></linearGradient>
      <linearGradient id="${id}-base" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b4ddd0" stop-opacity=".02"/><stop offset="1" stop-color="#d3e4cc" stop-opacity=".32"/></linearGradient>
    </defs>
    <ellipse cx="150" cy="395" rx="113" ry="11" fill="#081e2a" opacity=".52"/>
    <path d="M112 68h76v28c0 16 14 24 35 33 27 12 42 33 42 66v143c0 31-27 45-115 45S35 369 35 338V195c0-33 15-54 42-66 21-9 35-17 35-33z" fill="url(#${id}-glass)" stroke="url(#${id}-rim)" stroke-width="3"/>
    <path d="M121 79h58v20c0 20 16 30 39 40 24 11 36 28 36 58v139c0 23-22 35-104 35S46 359 46 336V197c0-30 12-47 36-58 23-10 39-20 39-40z" fill="none" stroke="#d5e7d5" stroke-opacity=".22" stroke-width="1.3"/>
    <path d="M40 326c18 22 203 22 220 0v12c0 28-26 42-110 42S40 366 40 338z" fill="url(#${id}-base)"/>
    <path d="M56 326v-130c0-23 8-38 23-48" fill="none" stroke="#d7f1e3" stroke-width="5" stroke-opacity=".36" stroke-linecap="round"/>
    <path d="M68 178c-4 14-5 35-5 64" fill="none" stroke="#f3f7e4" stroke-width="10" stroke-opacity=".09" stroke-linecap="round"/>
    <path d="M244 197v104m-4 28v11" fill="none" stroke="#d5e3cb" stroke-opacity=".26" stroke-width="3" stroke-linecap="round"/>
    <path d="M77 364c35 10 111 10 147 0" fill="none" stroke="#dfe8ce" stroke-opacity=".43" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="150" cy="76" rx="40" ry="9" fill="#547a80" stroke="#c6d7be" stroke-width="2"/>
    <path d="M108 45q42-13 84 0l-5 36q-37 13-74 0z" fill="url(#${id}-cork)" stroke="#a18156" stroke-width="1.5"/>
    <ellipse cx="150" cy="44" rx="42" ry="10" fill="#d5b781" stroke="#e7cd9c" stroke-width="1.5"/>
    <ellipse cx="150" cy="44" rx="33" ry="6" fill="none" stroke="#aa885b" stroke-opacity=".6"/>
    <path d="M119 54l-1 9m12-10 1 7m13-4-1 12m13-15v7m16-6-2 13m11-12v8M119 73h8m14 2h5m18-1h8" stroke="#77583c" stroke-opacity=".38" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M111 89q40 10 78 0m-77 5q38 10 77 0" fill="none" stroke="#705c44" stroke-width="5" stroke-linecap="round"/>
    <path d="M111 88q40 10 78 0m-77 5q38 10 77 0" fill="none" stroke="#d9c094" stroke-width="2" stroke-linecap="round"/>
    <path d="M188 94c-15-22-33-14-20-4 5 4 13 5 20 4 6-19 23-23 19-10-2 7-10 11-19 10m0 0 6 30m-6-30-9 28" fill="none" stroke="#e8cf9b" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="189" cy="94" r="3.6" fill="#a88758" stroke="#e8cf9b"/>
    <g transform="translate(197 117) rotate(13)"><path d="M0 0h24l4 5v28H0z" fill="#e4d6b4" stroke="#baa276"/><circle cx="13" cy="6" r="2" fill="#75664f"/><path d="m14 13 2 5 5 .4-4 3.2 1.3 5-4.3-2.7-4.2 2.7 1.2-5-4-3.2 5-.4z" fill="#b1915e"/></g>
  </svg>`;
}

function starArt(id: string) {
  return `<svg viewBox="0 0 50 50" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff6c9"/><stop offset=".48" stop-color="#f5d885"/><stop offset="1" stop-color="#c79444"/></linearGradient></defs><path d="m25 3 6.3 14.6 15.8 1.7-11.8 10.6 3.1 15.6L25 37.3l-13.4 8.2 3.1-15.6L2.9 19.3l15.8-1.7z" fill="url(#${id})" stroke="#fff0b4" stroke-width="1.2" stroke-linejoin="round"/><path d="M25 7v18L7 20.4l14.2-1.6z" fill="#fffbe1" opacity=".58"/><path d="m25 25 10.9 17-3-13L43 20z" fill="#b78c45" opacity=".32"/><path d="m25 25-10.2 16 3-12.5-9.9-7.1z" fill="#e5b663" opacity=".45"/><path d="M22 12v4m-2-2h4" stroke="#fffdf1" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

export class StarBottleView {
  readonly element = document.createElement("section");
  private readonly vessel = document.createElement("div");
  private readonly stars = document.createElement("div");
  private readonly count = document.createElement("span");
  private readonly detail = document.createElement("section");
  private readonly name = document.createElement("h2");
  private readonly message = document.createElement("div");
  private readonly intro = document.createElement("p");
  private readonly back = document.createElement("button");
  private readonly pager = document.createElement("div");
  private readonly previous = document.createElement("button");
  private readonly next = document.createElement("button");
  private readonly pageNumber = document.createElement("span");
  private readonly background = document.getElementById("app");
  private backgroundInert = false;
  private known: BottleCredit[] = [];
  private pages: number[] = [];
  private pageIndex = 0;
  private selected = "";
  private touchY = 0;
  private readonly artId = `star-bottle-${++serial}`;

  constructor(private world: World, private found: () => string[]) {
    const root = this.element;
    root.className = "star-bottle-page";
    root.hidden = true;
    root.setAttribute("aria-label", "星光瓶收藏页面");
    const heading = document.createElement("header"), title = document.createElement("div");
    title.innerHTML = '<span class="star-bottle-eyebrow">花海 · 星光收藏</span><h1>星光瓶</h1>';
    this.back.type = "button"; this.back.className = "star-bottle-return";
    this.back.textContent = "← 返回花海"; this.back.setAttribute("aria-keyshortcuts", "Escape");
    this.back.addEventListener("click", () => this.close());
    heading.append(title, this.back);
    const main = document.createElement("div"), display = document.createElement("section"), art = document.createElement("div"), caption = document.createElement("div");
    main.className = "star-bottle-layout"; display.className = "star-bottle-display";
    art.className = "star-bottle-art";
    this.vessel.className = "star-bottle-vessel";
    this.vessel.innerHTML = glassArt(this.artId);
    this.stars.className = "star-bottle-stars";
    this.vessel.append(this.stars); art.append(this.vessel);
    caption.className = "star-bottle-caption";
    this.count.className = "star-bottle-count";
    const instruction = document.createElement("p"); instruction.textContent = "轻点瓶中的星星，看看是谁留下的光。";
    caption.append(this.count, instruction);
    this.pager.className = "star-bottle-pager";
    this.previous.type = this.next.type = "button";
    this.previous.textContent = "‹"; this.next.textContent = "›";
    this.previous.setAttribute("aria-label", "上一瓶星星"); this.next.setAttribute("aria-label", "下一瓶星星");
    this.previous.addEventListener("click", () => this.changePage(-1));
    this.next.addEventListener("click", () => this.changePage(1));
    this.pager.append(this.previous, this.pageNumber, this.next);
    display.append(art, caption, this.pager);
    // The illustrated glass and HTML star targets share the same 300:410
    // rectangle. A max-height constraint must not letterbox just the SVG.
    new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      if (!rect.width || !rect.height) return;
      const width = Math.min(rect.width, rect.height * 300 / 410, 380);
      this.vessel.style.width = `${width}px`;
      this.vessel.style.height = `${width * 410 / 300}px`;
    }).observe(art);
    this.detail.className = "star-bottle-detail";
    this.name.className = "star-bottle-name";
    this.intro.className = "star-bottle-intro";
    this.message.className = "star-bottle-message";
    this.message.tabIndex = 0; this.message.setAttribute("role", "region");
    this.detail.append(this.name, this.intro, this.message);
    main.append(display, this.detail);
    root.append(heading, main);
    document.body.append(root);
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("click", event => event.stopPropagation());
    root.addEventListener("contextmenu", event => event.preventDefault());
    root.addEventListener("wheel", event => {
      event.stopPropagation();
      if (!this.canScrollMessage(event.target, event.deltaY)) event.preventDefault();
    }, { passive: false });
    root.addEventListener("touchstart", event => { this.touchY = event.touches[0]?.clientY ?? 0; }, { passive: true });
    root.addEventListener("touchmove", event => {
      const y = event.touches[0]?.clientY ?? this.touchY, delta = this.touchY - y;
      this.touchY = y;
      if (!this.canScrollMessage(event.target, delta)) event.preventDefault();
    }, { passive: false });
    root.addEventListener("keydown", event => {
      if (reservedShortcut(event)) return;
      if (this.message.contains(event.target as Node)) {
        const page = Math.max(40, this.message.clientHeight * .9);
        const current = this.message.scrollTop;
        let next: number | undefined;
        switch (event.key) {
          case "ArrowUp": next = current - 40; break;
          case "ArrowDown": next = current + 40; break;
          case "ArrowLeft": case "ArrowRight": next = current; break;
          case "Home": next = 0; break;
          case "End": next = this.message.scrollHeight; break;
          case "PageUp": next = current - page; break;
          case "PageDown": next = current + page; break;
          case " ": next = current + (event.shiftKey ? -page : page); break;
        }
        if (next !== undefined) {
          // Consume scroll keys even for a short letter or a reached edge;
          // native keyboard scrolling otherwise falls through to the webpage.
          event.preventDefault(); event.stopPropagation();
          this.message.scrollTop = next;
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key) ||
        (event.key === " " && !(event.target as Element).closest("button"))) event.preventDefault();
    });
    window.addEventListener("keydown", event => {
      if (!this.opened || reservedShortcut(event) || event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation(); this.close();
    }, { capture: true });
  }

  get opened() { return !this.element.hidden; }

  open() {
    const found = new Set(this.found());
    this.known = producers.map((person, index) => ({ ...person, page: Math.floor(index / positions.length), slot: index % positions.length }))
      .filter(person => found.has(person.id));
    this.pages = [...new Set(this.known.map(person => person.page))];
    this.pageIndex = 0; this.selected = "";
    if (!this.opened) this.backgroundInert = this.background?.inert ?? false;
    this.world.suspend("star-bottle", true);
    if (this.background) this.background.inert = true;
    this.element.hidden = false;
    this.count.textContent = `已收藏 ${this.known.length} / ${producers.length} 颗星`;
    this.name.textContent = this.known.length ? "轻点一颗星星" : "星光瓶还在等你";
    this.intro.textContent = this.known.length ? "把旅途中的相遇，轻轻收藏。" : "去草地上拾起一颗星星，让它在瓶里住下来。";
    this.intro.hidden = false; this.message.hidden = true; this.message.textContent = "";
    this.detail.dataset.hasMessage = "false";
    this.detail.dataset.selected = "false";
    this.renderStars();
    (this.stars.querySelector<HTMLButtonElement>("button") ?? this.back).focus({ preventScroll: true });
  }

  close() {
    if (!this.opened) return;
    this.element.hidden = true;
    this.message.replaceChildren();
    if (this.background) this.background.inert = this.backgroundInert;
    this.world.suspend("star-bottle", false);
    if (!this.world.suspended && !this.background?.inert) this.world.canvas.focus({ preventScroll: true });
  }

  private canScrollMessage(target: EventTarget | null, delta: number) {
    if (!(target instanceof Node) || !this.message.contains(target) || this.message.hidden) return false;
    return delta < 0 ? this.message.scrollTop > 0
      : delta > 0 && this.message.scrollTop + this.message.clientHeight < this.message.scrollHeight - 1;
  }

  private renderStars() {
    this.stars.replaceChildren();
    for (const person of this.known.filter(item => item.page === this.pages[this.pageIndex])) {
      const button = document.createElement("button"), [x, y] = positions[person.slot];
      button.type = "button"; button.className = "star-bottle-star";
      button.dataset.starId = person.id;
      button.setAttribute("aria-label", `查看${person.name}的星星`);
      button.setAttribute("aria-pressed", String(this.selected === person.id));
      button.style.left = `${x / 3}%`; button.style.top = `${y / 4.1}%`;
      button.style.setProperty("--star-phase", `${person.slot * -.73}s`);
      button.innerHTML = starArt(`${this.artId}-star-${person.slot}`);
      button.addEventListener("click", () => this.select(person));
      this.stars.append(button);
    }
    this.pager.hidden = this.pages.length <= 1;
    this.pageNumber.textContent = `${this.pageIndex + 1} / ${this.pages.length}`;
    this.previous.disabled = this.pageIndex <= 0;
    this.next.disabled = this.pageIndex >= this.pages.length - 1;
  }

  private changePage(change: number) {
    const next = this.pageIndex + change;
    if (next < 0 || next >= this.pages.length) return;
    this.pageIndex = next; this.renderStars();
    this.stars.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }

  private select(person: BottleCredit) {
    this.selected = person.id;
    this.name.textContent = person.name;
    this.intro.hidden = true;
    const hasMessage = !!person.message.trim();
    this.message.hidden = !hasMessage;
    this.message.textContent = hasMessage ? person.message : "";
    this.message.scrollTop = 0;
    this.message.setAttribute("aria-label", `${person.name}的留言，可滚动阅读`);
    this.detail.dataset.hasMessage = String(hasMessage);
    this.detail.dataset.selected = "true";
    for (const button of this.stars.querySelectorAll<HTMLButtonElement>("button"))
      button.setAttribute("aria-pressed", String(button.dataset.starId === person.id));
  }
}
