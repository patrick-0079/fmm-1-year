import type { World } from "./world";
import {
  ITEMS,
  INVENTORY_KEY,
  readInventory,
  grantItem,
  equipItem,
  EQUIP_SLOTS,
  slotNames,
  type EquipSlot,
  type ItemId,
  type InventoryState,
} from "./items";
import { drawItem, wreathUrl, rewardsUrl, whenWardrobeReady } from "./item-art";
import { reservedShortcut } from "./input";
import { sfx } from "./sound";
import { prepareProp } from "./scene-art";
function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
export class Inventory {
  private earned: InventoryState;
  private fittingRoom: InventoryState | null = null;
  get state() { return this.fittingRoom ?? this.earned; }
  onEquip: () => void = () => {};
  private trigger = document.querySelector<HTMLButtonElement>(".bag-toggle")!;
  private root: HTMLElement = document.querySelector(".inventory-panel")!;
  private wreath = new Image();
  private rewards = new Image();
  private filter: EquipSlot | "all" = "all";
  private returnScrollY: number | null = null;
  constructor(
    private world: World,
    private toast: (text: string) => void,
    private storage: Pick<Storage, "getItem" | "setItem"> | null = browserStorage(),
    private readonly debugAvailable = import.meta.env.VITE_WARDROBE_DEBUG === "true",
  ) {
    let raw = null,
      legacy = null;
    try {
      raw = this.storage?.getItem(INVENTORY_KEY) ?? null;
      legacy = this.storage?.getItem("fufu-garden-bag-v1") ?? null;
    } catch {}
    this.earned = readInventory(raw, legacy);
    if (this.debugAvailable) this.startFitting();
    this.wreath.onload = () => this.drawIcons();
    this.rewards.onload = () => this.drawIcons();
    this.wreath.src = wreathUrl;
    this.rewards.src = rewardsUrl;
    whenWardrobeReady(() => this.drawIcons());
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.addEventListener("click", () => this.togglePanel());
    window.addEventListener("keydown", (e) => {
      if (reservedShortcut(e) || document.querySelector(".debug-panel:not([hidden])")) return;
      if ((e.key.toLowerCase() === "b" || (e.key === "Escape" && !this.root.hidden)) && !e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.togglePanel();
      }
    }, { capture: true });
    this.sync();
    this.render();
  }
  has(id: ItemId) {
    // Collection events still check the real save while the fitting room is open.
    return this.earned.owned.includes(id);
  }
  private startFitting() {
    this.fittingRoom = { owned: Object.keys(ITEMS) as ItemId[], equipped: { ...this.earned.equipped } };
  }
  get fitting() { return !!this.fittingRoom; }
  setFitting(active:boolean) {
    if (!this.debugAvailable || active===this.fitting) return;
    if (active) this.startFitting(); else this.fittingRoom=null;
    this.sync(); this.render();
  }
  open() {
    if (!this.root.hidden) return;
    this.root.hidden = false;
    this.trigger.setAttribute("aria-label","收起纪念背包，快捷键 B");
    this.trigger.setAttribute("aria-expanded", "true");
    // Keep free exploration live while pausing time-sensitive activities.
    const scene = this.world.canvas.parentElement!;
    this.world.suspend("inventory", scene.matches(".inspecting, .bass-playing, .arcade-active, .cinema-active, .reading-letter"));
    this.render();
    void prepareProp("relics").then(() => this.drawIcons()).catch(() => {});
    this.root.querySelector<HTMLButtonElement>(".bag-close")!.focus({ preventScroll: true });
    // Reveal the first row only when it is off screen. Leave some of the map
    // in view and return to the player's original viewport when they close it.
    const top = this.root.getBoundingClientRect().top;
    const firstRow = this.root.querySelector(".inventory-item")!.getBoundingClientRect();
    const offset = top < 0 ? top : Math.max(0, Math.min(top, firstRow.bottom + 8 - innerHeight));
    if (Math.abs(offset) > 1) {
      this.returnScrollY = window.scrollY;
      window.scrollBy({ top: offset, behavior: "instant" });
    }
  }
  grant(id: ItemId, announce = true) {
    if (!grantItem(this.earned, id)) return false;
    this.save();
    this.render();
    if (announce) {
      sfx("match");
      this.toast(`获得纪念品：${ITEMS[id].name} · 按 B 打开背包`);
    }
    return true;
  }
  toggle(id: ItemId) {
    if (!equipItem(this.state, id)) {
      this.toast("先收集这件纪念品吧。");
      return;
    }
    if (!this.fittingRoom) this.save();
    this.sync();
    this.render();
    this.onEquip();
    sfx("interact");
    // A wardrobe action completes the visit. Return to the canvas immediately
    // instead of leaving the scene inert below an off-screen, focused button.
    // Quick-equip / NPC actions must never focus controls inside a hidden bag.
    if (!this.root.hidden) this.close();
    else if (!this.world.suspended)
      this.world.canvas.focus({ preventScroll: true });
    this.toast(`${ITEMS[id].name} · ${this.state.equipped[ITEMS[id].slot] === id ? "已佩戴" : "已脱下"}`);
  }
  reset() {
    this.close(false);
    this.filter = "all";
    this.earned = readInventory(null);
    if (this.fittingRoom) this.startFitting();
    this.save();
    this.sync();
    this.render();
    this.root.hidden = true;
  }
  private sync() {
    this.world.equipment = { ...this.state.equipped };
  }
  private save() {
    try {
      this.storage?.setItem(INVENTORY_KEY, JSON.stringify(this.earned));
    } catch {}
  }
  private togglePanel() {
    if (!this.root.hidden) {
      this.close();
      return;
    }
    this.open();
  }
  close(restoreFocus = true) {
    const wasOpen = !this.root.hidden;
    const returnScrollY = this.returnScrollY;
    this.returnScrollY = null;
    this.root.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-label","打开纪念背包，快捷键 B");
    this.world.suspend("inventory", false);
    if (!restoreFocus || !wasOpen) return;
    if (this.world.suspended) {
      const help = document.querySelector<HTMLElement>(".inline-help:not([hidden])");
      help?.querySelector<HTMLButtonElement>(".help-close")?.focus({ preventScroll: true });
      help?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    this.world.canvas.focus({ preventScroll: true });
    if (returnScrollY !== null) window.scrollTo({ top: returnScrollY, behavior: "instant" });
  }
  private render() {
    const worn = (slot: EquipSlot) =>
      this.state.equipped[slot]
        ? ITEMS[this.state.equipped[slot]!].name
        : "暂未佩戴";
    this.root.innerHTML = `<header><div><small>ONE YEAR · LITTLE TREASURES</small><h3>芙芙的周年衣橱 <span>${this.state.owned.length} / ${Object.keys(ITEMS).length}</span></h3><p class="equipment-summary">${EQUIP_SLOTS.map((slot) => `<span>${slotNames[slot]}：${worn(slot)}</span>`).join("")}</p></div><button class="map-action bag-close">收起 <kbd>B</kbd></button></header><nav class="inventory-tabs" aria-label="配饰类别"><button data-category="all" aria-pressed="${this.filter === "all"}">全部</button>${EQUIP_SLOTS.map((slot) => `<button data-category="${slot}" aria-pressed="${this.filter === slot}">${slotNames[slot]}</button>`).join("")}</nav><div class="inventory-grid">${Object.entries(
      ITEMS,
    )
      .filter(([, item]) => this.filter === "all" || item.slot === this.filter)
      .map(([id, item]) => {
        const own = this.state.owned.includes(id as ItemId),
          worn = this.state.equipped[item.slot] === id;
        return `<article class="inventory-item ${own ? "owned" : "locked"}"><canvas width="48" height="48" data-item="${id}" role="img" aria-label="${item.name}"></canvas><div><h4>${item.name}${worn ? " <em>佩戴中</em>" : ""}</h4><p>${own ? item.description : item.source}</p></div><button class="map-action" data-equip="${id}" ${own ? "" : "disabled"}>${own ? (worn ? "脱下" : "佩戴") : "未获得"}</button></article>`;
      })
      .join(
        "",
      )}</div><p class="bag-footnote">背包在地图下方展开。探索时仍可走动；选好饰品后自动收起，也可按 B / Esc 返回。</p>`;
    this.root
      .querySelector(".bag-close")!
      .addEventListener("click", () => this.close());
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-category]")
      .forEach((b) =>
        b.addEventListener("click", () => {
          this.filter = b.dataset.category as EquipSlot | "all";
          this.render();
          this.root
            .querySelector<HTMLButtonElement>(
              `[data-category="${this.filter}"]`,
            )!
            .focus({ preventScroll: true });
        }),
      );
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-equip]")
      .forEach((b) =>
        b.addEventListener("click", () =>
          this.toggle(b.dataset.equip as ItemId),
        ),
      );
    this.drawIcons();
  }
  private drawIcons() {
    for (const canvas of this.root.querySelectorAll<HTMLCanvasElement>(
      "canvas[data-item]",
    )) {
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, 48, 48);
      c.imageSmoothingEnabled = false;
      drawItem(
        c,
        canvas.dataset.item as ItemId,
        3,
        3,
        42,
        42,
        this.wreath,
        this.rewards,
      );
    }
  }
}
