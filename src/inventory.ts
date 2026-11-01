import type { World } from "./world";
import {
  ITEMS,
  INVENTORY_KEY,
  readInventory,
  grantItem,
  equipItem,
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
      if (e.key.toLowerCase() === "b" && !e.repeat && !this.world.paused) {
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
    this.root.hidden = !this.root.hidden;
    if (!this.root.hidden) {
      this.render();
      this.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  private render() {
    const worn = (slot: "head" | "body") =>
      this.state.equipped[slot]
        ? ITEMS[this.state.equipped[slot]!].name
        : "暂未佩戴";
    this.root.innerHTML = `<header><div><small>ONE YEAR · LITTLE TREASURES</small><h3>芙芙的纪念背包 <span>${this.state.owned.length} / ${Object.keys(ITEMS).length}</span></h3><p>头饰：${worn("head")}　随身饰品：${worn("body")}</p></div><button class="map-action bag-close">收起 <kbd>B</kbd></button></header><div class="inventory-grid">${Object.entries(
      ITEMS,
    )
      .map(([id, item]) => {
        const own = this.has(id as ItemId),
          worn = this.state.equipped[item.slot] === id;
        return `<article class="inventory-item ${own ? "owned" : "locked"}"><canvas width="48" height="48" data-item="${id}" role="img" aria-label="${item.name}"></canvas><div><h4>${item.name}${worn ? " <em>佩戴中</em>" : ""}</h4><p>${own ? item.description : item.source}</p></div><button class="map-action" data-equip="${id}" ${own ? "" : "disabled"}>${own ? (worn ? "脱下" : "佩戴") : "未获得"}</button></article>`;
      })
      .join(
        "",
      )}</div><p class="bag-footnote">纪念品与佩戴选择保存在当前浏览器。小游戏奖励可重复游玩，每件只领取一次。</p>`;
    this.root
      .querySelector(".bag-close")!
      .addEventListener("click", () => (this.root.hidden = true));
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
