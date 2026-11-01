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
import { drawItem, wreathUrl, rewardsUrl } from "./item-art";
import { sfx } from "./sound";
export class Inventory {
  state: InventoryState;
  private root: HTMLElement = document.querySelector(".inventory-panel")!;
  private wreath = new Image();
  private rewards = new Image();
  private filter: EquipSlot | "all" = "all";
  constructor(
    private world: World,
    private toast: (text: string) => void,
  ) {
    let raw = null,
      legacy = null;
    try {
      raw = localStorage.getItem(INVENTORY_KEY);
      legacy = localStorage.getItem("fufu-garden-bag-v1");
    } catch {}
    this.state = readInventory(raw, legacy);
    this.wreath.onload = () => this.drawIcons();
    this.rewards.onload = () => this.drawIcons();
    this.wreath.src = wreathUrl;
    this.rewards.src = rewardsUrl;
    document
      .querySelector(".bag-toggle")!
      .addEventListener("click", () => this.togglePanel());
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "b" && !e.repeat) {
        e.preventDefault();
        this.togglePanel();
      }
    });
    this.sync();
    this.render();
  }
  has(id: ItemId) {
    return this.state.owned.includes(id);
  }
  open() {
    this.root.hidden = false;
    this.render();
    this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  grant(id: ItemId) {
    if (!grantItem(this.state, id)) return false;
    this.save();
    this.render();
    sfx("match");
    this.toast(`获得纪念品：${ITEMS[id].name} · 按 B 打开背包`);
    return true;
  }
  toggle(id: ItemId) {
    if (!equipItem(this.state, id)) {
      this.toast("先收集这件纪念品吧。");
      return;
    }
    this.save();
    this.sync();
    this.render();
    sfx("interact");
    this.root
      .querySelector<HTMLButtonElement>(`[data-equip="${id}"]`)
      ?.focus({ preventScroll: true });
  }
  reset() {
    this.state = readInventory(null);
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
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(this.state));
    } catch {}
  }
  private togglePanel() {
    if (!this.root.hidden) {
      this.close();
      return;
    }
    this.root.hidden = !this.root.hidden;
    if (!this.root.hidden) {
      this.render();
      this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  private close() {
    this.root.hidden = true;
    this.world.canvas.focus({ preventScroll: true });
    if (this.world.canvas.parentElement!.classList.contains("arcade-active"))
      this.world.canvas.parentElement!.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    else
      this.world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
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
        const own = this.has(id as ItemId),
          worn = this.state.equipped[item.slot] === id;
        return `<article class="inventory-item ${own ? "owned" : "locked"}"><canvas width="48" height="48" data-item="${id}" role="img" aria-label="${item.name}"></canvas><div><h4>${item.name}${worn ? " <em>佩戴中</em>" : ""}</h4><p>${own ? item.description : item.source}</p></div><button class="map-action" data-equip="${id}" ${own ? "" : "disabled"}>${own ? (worn ? "脱下" : "佩戴") : "未获得"}</button></article>`;
      })
      .join(
        "",
      )}</div><p class="bag-footnote">六个部位可以独立搭配。同行伙伴会跟随散步；睡觉时隐藏穿戴和伙伴。纪念品与佩戴选择仅保存在本机。</p>`;
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
