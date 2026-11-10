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
import type { Facing } from "./equipment";
import { whenAvatarLayersReady } from "./avatar";
import bouquetUrl from "./assets/qingya-bouquet.webp";
import type { AstrolabeState } from "./astrolabe";
import { journalCoverMarkup, journalPageCount, renderRuinJournal } from "./ruin-journal";
type BagTab = "wardrobe" | "equipped" | "keepsakes";
type Category = "all" | EquipSlot;
const categories: readonly Category[] = ["all", ...EQUIP_SLOTS];
const itemIds = Object.keys(ITEMS) as ItemId[];
const catalogue = EQUIP_SLOTS.flatMap(slot => itemIds.filter(id => ITEMS[id].slot === slot));
function categoryName(category: Category) { return category === "all" ? "全部" : slotNames[category]; }
const turns: Facing[] = [0, 2, 3, 1];
const facingNames = ["正面", "左侧", "右侧", "背面"];
const slotArt: Record<EquipSlot, ItemId> = {
  head: "wreath", clothes: "roseDress", shoes: "ribbonShoes",
  backpack: "berryBag", body: "anniversaryPin", pet: "petCat",
};
function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
export class Inventory {
  private earned: InventoryState;
  private fittingRoom: InventoryState | null = null;
  get state() { return this.fittingRoom ?? this.earned; }
  onEquip: () => void = () => {};
  notebookState: () => { astrolabe: AstrolabeState; listened: boolean } | null = () => null;
  private trigger = document.querySelector<HTMLButtonElement>(".bag-toggle")!;
  private root: HTMLElement = document.querySelector(".inventory-panel")!;
  private wreath = new Image();
  private rewards = new Image();
  private tab: BagTab = "wardrobe";
  private category: Category = "all";
  private choosingCategory = false;
  private selected: ItemId | null = null;
  private trying = false;
  private facing: Facing = 0;
  private page = 0;
  private compact = false;
  private bouquetDetail = false;
  private journalPage: number | null = null;
  private readonly scene: HTMLElement;
  constructor(
    private world: World,
    private toast: (text: string) => void,
    private storage: Pick<Storage, "getItem" | "setItem"> | null = browserStorage(),
    private readonly debugAvailable = import.meta.env.VITE_WARDROBE_DEBUG === "true",
  ) {
    this.scene = world.canvas.parentElement!;
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
    whenAvatarLayersReady(() => this.drawPreview());
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.addEventListener("click", () => this.togglePanel());
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("keydown", (event) => this.handleTabKey(event));
    new ResizeObserver(() => {
      if (!this.root.hidden && this.measureLayout()) this.render();
    }).observe(this.scene);
    window.addEventListener("keydown", (e) => {
      const hotkey = e.key.toLowerCase() === "b" || (e.key === "Escape" && !this.root.hidden);
      if (!hotkey) return;
      if (reservedShortcut(e) || document.querySelector(".debug-panel:not([hidden])")) return;
      if (this.root.hidden && (this.world.suspended || this.scene.querySelector(".intro-screen:not(.dismissed)"))) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.togglePanel();
    }, { capture: true });
    this.sync();
  }
  has(id: ItemId) {
    // Collection events still check the real save while the fitting room is open.
    return this.earned.owned.includes(id);
  }
  hasBouquet() { return this.earned.bouquet; }
  hasNotebook() { return this.notebookState() !== null; }
  openNotebook() {
    if (!this.hasNotebook()) return;
    if (this.root.hidden) this.open();
    if (this.root.hidden) return;
    this.tab = "keepsakes";
    this.bouquetDetail = false;
    this.journalPage = 0;
    this.trying = false;
    this.updateSuspension();
    this.render();
    this.root.querySelector<HTMLElement>(".ruin-journal-paper")?.focus({ preventScroll: true });
  }
  collectBouquet() {
    if (this.hasBouquet()) return;
    this.earned.bouquet = true;
    this.save();
    this.render();
    sfx("match");
    this.toast("收到了青芽的洋桔梗");
  }
  openBouquet() {
    if (!this.hasBouquet()) return;
    if (this.root.hidden) this.open();
    if (this.root.hidden) return;
    this.tab = "keepsakes";
    this.bouquetDetail = true;
    this.journalPage = null;
    this.updateSuspension();
    this.trying = false;
    this.render();
    this.root.querySelector<HTMLElement>(".bouquet-detail")?.focus({preventScroll:true});
  }
  openWardrobe() {
    if (this.root.hidden) this.open();
    else this.changeTab("wardrobe");
  }
  get followingPet() { return this.earned.equipped.pet; }
  setCompanion(id: "petCat" | "petBunny", follow: boolean) {
    const first = follow && grantItem(this.earned,id);
    for (const outfit of [this.earned, this.fittingRoom]) {
      if (outfit && (follow || outfit.equipped.pet === id)) outfit.equipped.pet = follow ? id : null;
    }
    this.save();
    this.sync();
    this.render();
    return first;
  }
  private startFitting() {
    this.fittingRoom = { ...this.earned, owned: [...catalogue], equipped: { ...this.earned.equipped } };
  }
  get fitting() { return !!this.fittingRoom; }
  setFitting(active:boolean) {
    if (!this.debugAvailable || active===this.fitting) return;
    if (active) this.startFitting(); else this.fittingRoom=null;
    this.trying = false;
    this.sync(); this.render();
  }
  open() {
    if (!this.root.hidden || this.world.suspended) return;
    this.root.hidden = false;
    this.tab = "wardrobe";
    this.category = "all";
    this.choosingCategory = false;
    this.selected = null;
    this.trying = false;
    this.facing = 0;
    this.page = 0;
    this.bouquetDetail = false;
    this.measureLayout();
    this.trigger.setAttribute("aria-label","收起纪念背包，快捷键 B");
    this.trigger.setAttribute("aria-expanded", "true");
    this.updateSuspension();
    this.render();
    void Promise.allSettled([this.world.prepareScene("room"), prepareProp("relics")]).then(() => this.drawIcons());
    this.root.querySelector<HTMLButtonElement>(".bag-close")!.focus({ preventScroll: true });
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
    this.trying = false;
    if (this.tab === "equipped" && this.state.equipped[ITEMS[id].slot] !== id) this.selected = null;
    this.sync();
    this.render();
    this.onEquip();
    sfx("interact");
    if (this.root.hidden) {
      if (!this.world.suspended) this.world.canvas.focus({ preventScroll: true });
      const wearing = this.state.equipped[ITEMS[id].slot] === id;
      const pet = ITEMS[id].slot === "pet";
      const status = pet ? (wearing ? "已同行" : "已休息") : (wearing ? "已佩戴" : "已脱下");
      this.toast(`${ITEMS[id].name} · ${status}`);
    }
  }
  reset() {
    this.close(false);
    this.tab = "wardrobe";
    this.bouquetDetail = false;
    this.earned = readInventory(null);
    if (this.fittingRoom) this.startFitting();
    this.save();
    this.sync();
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
    this.root.hidden = true;
    this.journalPage = null;
    this.trying = false;
    this.bouquetDetail = false;
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-label", "打开纪念背包，快捷键 B");
    this.world.suspend("inventory", false);
    if (!restoreFocus || !wasOpen) return;
    if (this.world.suspended) {
      document.querySelector<HTMLButtonElement>(".inline-help:not([hidden]) .help-close")?.focus({ preventScroll: true });
    } else {
      this.world.canvas.focus({ preventScroll: true });
    }
  }
  private updateSuspension() {
    this.world.suspend("inventory", this.journalPage !== null ||
      this.scene.matches(".inspecting, .bass-playing, .arcade-active, .cinema-active, .reading-letter"));
  }
  private get pageSize() { return this.compact ? 8 : 15; }
  private get filteredItems() {
    return this.category === "all" ? catalogue : catalogue.filter(id => ITEMS[id].slot === this.category);
  }
  private measureLayout() {
    const compact = this.scene.getBoundingClientRect().width <= 560;
    if (compact === this.compact) return false;
    this.compact = compact;
    this.choosingCategory = false;
    if (!compact && this.tab === "equipped") this.tab = "wardrobe";
    const index = this.selected ? this.filteredItems.indexOf(this.selected) : 0;
    this.page = Math.max(0, Math.floor(index / this.pageSize));
    return true;
  }
  private changeTab(tab: BagTab) {
    this.choosingCategory = false;
    if (tab !== this.tab) {
      this.selected = null;
      this.trying = false;
    }
    this.tab = tab;
    this.bouquetDetail = false;
    this.journalPage = null;
    this.updateSuspension();
    this.render();
  }
  private selectItem(id: ItemId) {
    this.selected = id;
    this.trying = this.state.owned.includes(id) && this.state.equipped[ITEMS[id].slot] !== id;
    if (ITEMS[id].slot === "backpack" && (this.facing === 0 || this.facing === 3)) this.facing = 2;
    this.page = Math.max(0, Math.floor(this.filteredItems.indexOf(id) / this.pageSize));
    this.render();
  }
  private handleClick(event: MouseEvent) {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !this.root.contains(button) || button.disabled) return;
    event.stopPropagation();
    const data = button.dataset;
    if (button.classList.contains("bag-close")) this.close();
    else if (data.tab) this.changeTab(data.tab as BagTab);
    else if (data.chooseCategory !== undefined) {
      this.choosingCategory = !this.choosingCategory;
      this.render();
      if (this.choosingCategory) this.root.querySelector<HTMLButtonElement>(".bag-filters [aria-pressed=true]")?.focus({preventScroll:true});
    } else if (data.category) {
      const category = data.category as Category;
      if (category !== this.category) {
        this.category = category;
        this.selected = null;
        this.trying = false;
        this.page = 0;
      }
      this.choosingCategory = false;
      this.render();
      if (this.compact) this.root.querySelector<HTMLButtonElement>("[data-choose-category]")?.focus({preventScroll:true});
    } else if (data.turn) {
      this.facing = turns[(turns.indexOf(this.facing) + Number(data.turn) + turns.length) % turns.length];
      this.render();
    } else if (data.page) {
      this.page = Math.min(Math.ceil(this.filteredItems.length / this.pageSize) - 1, Math.max(0, this.page + Number(data.page)));
      this.selected = null;
      this.trying = false;
      this.render();
    } else if (data.select) {
      this.selectItem(data.select as ItemId);
      if (event.detail === 0) {
        this.root.querySelector<HTMLButtonElement>(".bag-apply:not(:disabled)")?.focus({ preventScroll: true });
      }
    } else if (data.equip) {
      const id = data.equip as ItemId;
      this.toggle(id);
      if (event.detail === 0) {
        const selector = this.tab === "equipped" ? `.bag-equipped-grid [data-slot="${ITEMS[id].slot}"]` : `[data-select="${id}"]`;
        this.root.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
      }
    } else if (data.slot) {
      const slot = data.slot as EquipSlot;
      const worn = this.state.equipped[slot];
      const id = worn ?? this.state.owned.find(i => ITEMS[i].slot === slot) ?? slotArt[slot];
      this.category = slot;
      this.choosingCategory = false;
      if (!worn || this.tab !== "equipped") this.tab = "wardrobe";
      this.selectItem(id);
      if (this.tab === "wardrobe") {
        this.root.querySelector<HTMLButtonElement>(`[data-select="${id}"]`)?.focus({preventScroll:true});
      } else if (event.detail === 0) {
        this.root.querySelector<HTMLButtonElement>(".bag-apply")?.focus({preventScroll:true});
      }
    } else if (data.notebook !== undefined) this.openNotebook();
    else if (data.journalPage !== undefined) this.turnJournalPage(Number(data.journalPage));
    else if (data.bouquet !== undefined) this.openBouquet();
    else if (data.keepsakes !== undefined) {
      const selector = this.journalPage !== null ? "[data-notebook]" : "[data-bouquet]";
      this.changeTab("keepsakes");
      this.root.querySelector<HTMLButtonElement>(selector)?.focus({preventScroll:true});
    }
  }
  private turnJournalPage(page: number) {
    if (this.journalPage === null || !Number.isInteger(page) || page < 0 || page >= journalPageCount || page === this.journalPage) return;
    this.journalPage = page;
    this.render();
  }
  private handleTabKey(event: KeyboardEvent) {
    if (this.journalPage !== null && !reservedShortcut(event) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      if (event.repeat) return;
      const onBookmark = event.target instanceof Element && event.target.closest("[data-journal-page]");
      this.turnJournalPage(this.journalPage + (event.key === "ArrowRight" ? 1 : -1));
      if (onBookmark) this.root.querySelector<HTMLButtonElement>('[data-journal-page][aria-current="page"]')?.focus({preventScroll:true});
      return;
    }
    if (event.repeat && event.key === "Enter") event.preventDefault();
    if (event.key !== "Tab" || reservedShortcut(event)) return;
    const buttons = [...this.root.querySelectorAll<HTMLElement>('button:not(:disabled), summary, [tabindex="0"]')].filter(b => b.getClientRects().length);
    const edge = event.shiftKey ? buttons[0] : buttons.at(-1);
    if (document.activeElement !== edge) return;
    event.preventDefault();
    (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus({preventScroll:true});
  }
  private itemArt(id: ItemId) {
    return `<canvas class="bag-item-art" data-item="${id}" width="80" height="80" aria-hidden="true"></canvas>`;
  }
  private slotButton(slot: EquipSlot, group: string) {
    const worn = this.state.equipped[slot];
    const name = worn ? ITEMS[worn].name : "空";
    const selected = !!worn && this.selected === worn;
    return `<button type="button" class="bag-slot ${worn ? "is-worn" : "is-empty"} ${selected ? "is-selected" : ""}" data-slot="${slot}" data-focus="${group}-${slot}" aria-pressed="${selected}" aria-label="${slotNames[slot]}，${name}" title="${slotNames[slot]} · ${name}">
      ${this.itemArt(worn ?? slotArt[slot])}<span class="bag-slot-name">${slotNames[slot]}</span></button>`;
  }
  private itemButton(id: ItemId) {
    const item = ITEMS[id];
    const worn = this.state.equipped[item.slot] === id;
    const owned = this.state.owned.includes(id);
    const selected = id === this.selected;
    const mark = worn ? '<span class="bag-check" aria-hidden="true">✓</span>' : "";
    const state = !owned ? "未获得" : worn ? (item.slot === "pet" ? "同行中" : "已佩戴") : "已获得";
    return `<button type="button" class="bag-item ${worn ? "is-worn" : ""} ${selected ? "is-selected" : ""} ${owned ? "" : "is-locked"}" data-select="${id}" data-focus="item-${id}" aria-pressed="${selected}" aria-label="${item.name}，${state}" title="${item.name} · ${state}">${this.itemArt(id)}<span class="bag-item-name">${item.name}</span>${mark}</button>`;
  }
  private filterButtons() {
    const buttons = categories.map(category => {
      const label = categoryName(category);
      return `<button type="button" data-category="${category}" data-focus="category-${category}" aria-label="${label}" aria-pressed="${category === this.category}">${category === "pet" ? "伙伴" : label}</button>`;
    });
    return `<div class="bag-filters" role="group" aria-label="穿戴部位">${buttons.join("")}</div>`;
  }
  private collection() {
    if (this.tab === "equipped") return `<div class="bag-equipped-grid">${EQUIP_SLOTS.map(slot => this.slotButton(slot, "equipped")).join("")}</div>`;
    if (this.tab === "keepsakes") {
      if (this.bouquetDetail && this.hasBouquet()) {
        return `<article class="bouquet-detail" tabindex="-1" aria-label="青芽的洋桔梗"><img src="${bouquetUrl}" alt="奶白和浅紫的重瓣洋桔梗，花茎系着细缎带"><div><h4>青芽的洋桔梗</h4><p>象征着芙妮宝真诚不变的爱。</p><button type="button" data-keepsakes data-focus="keepsakes-back">返回纪念物</button></div></article>`;
      }
      const book = this.hasNotebook();
      const bouquet = this.hasBouquet();
      return `<div class="bag-keepsakes"><button type="button" class="bag-keepsake ${book ? "" : "is-locked"}" data-notebook data-focus="notebook" ${book ? "" : "disabled"} aria-label="${book ? "翻开遗迹手记" : "遗迹手记，和回声遗迹的守护者交谈后获得"}">${journalCoverMarkup}<span>遗迹手记</span></button>
        <button type="button" class="bag-keepsake ${bouquet ? "" : "is-locked"}" data-bouquet data-focus="bouquet" ${bouquet ? "" : "disabled"} title="${bouquet ? "查看花束与赠语" : "在周年小镇的青芽花店领取"}"><img src="${bouquetUrl}" alt=""><span>青芽的洋桔梗</span></button></div>`;
    }
    const start = this.page * this.pageSize;
    const items = this.filteredItems;
    const pages = Math.ceil(items.length / this.pageSize);
    const grid = items.slice(start, start + this.pageSize).map(id => this.itemButton(id));
    // Keep the last page's cells and the footer in the same positions.
    for (let i = grid.length; i < this.pageSize; i++) grid.push('<span class="bag-item is-empty" aria-hidden="true"></span>');
    const cells = `<div class="bag-grid">${grid.join("")}</div>`;
    const pager = pages > 1 && !this.choosingCategory ? `<div class="bag-pages"><button type="button" data-page="-1" data-focus="prev" aria-label="上一页" ${this.page === 0 ? "disabled" : ""}>‹</button><span>${this.page + 1} / ${pages}</span><button type="button" data-page="1" data-focus="next" aria-label="下一页" ${this.page + 1 === pages ? "disabled" : ""}>›</button></div>` : "";
    if (!this.compact) return this.filterButtons() + cells + pager;
    const toggle = `<button type="button" class="bag-category-toggle" data-choose-category data-focus="choose-category" aria-expanded="${this.choosingCategory}" aria-label="按穿戴部位筛选，当前${categoryName(this.category)}">部位 · ${categoryName(this.category)}</button>`;
    return (this.choosingCategory ? this.filterButtons() : cells) + `<div class="bag-collection-tools">${toggle}${pager}</div>`;
  }
  private footer() {
    let title = "选择一件配饰";
    let text = this.fitting ? "调试试穿，搭配仅在本次游玩生效。" : "点选物品试穿，喜欢就佩戴。";
    let action = "";
    if (this.tab === "keepsakes") {
      title = "纪念物";
      text = this.bouquetDetail ? "青芽亲手为你挑选的花束。" : "守护者赠书，青芽的花店赠花。";
    } else if (this.tab === "equipped" && !this.selected) {
      title = "身上的搭配";
      text = "点一个部位，查看或更换配饰。";
      action = '<button type="button" class="bag-apply" data-tab="wardrobe" data-focus="browse">去衣橱</button>';
    } else if (this.selected) {
      const id = this.selected;
      const item = ITEMS[id];
      const owned = this.state.owned.includes(id);
      const worn = this.state.equipped[item.slot] === id;
      const verb = !owned ? "未获得" : item.slot === "pet" ? (worn ? "休息" : "同行") : (worn ? "脱下" : "佩戴");
      title = item.name;
      text = owned ? item.description : item.source;
      action = `<button type="button" class="bag-apply" data-equip="${id}" data-focus="apply" ${owned ? "" : "disabled"}>${verb}</button>`;
    } else {
      action = '<button type="button" class="bag-apply" disabled>佩戴</button>';
    }
    const art = this.tab !== "keepsakes" && this.selected ? this.itemArt(this.selected) : "";
    return `${art}<div class="bag-detail" aria-live="polite"><strong>${title}</strong><small>${text}</small></div>${action}`;
  }
  private render() {
    if (this.root.hidden) return;
    const focused = document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.dataset.focus;
    const page = this.journalPage;
    const notebook = page !== null ? this.notebookState() : null;
    this.root.dataset.tab = this.tab;
    this.root.dataset.compact = String(this.compact);
    const tabs: [BagTab, string][] = [["wardrobe", "衣橱"]];
    if (this.compact) tabs.push(["equipped", "身上"]);
    tabs.push(["keepsakes", "纪念物"]);
    const tabButtons = tabs.map(([tab, name]) => `
      <button type="button" data-tab="${tab}" data-focus="tab-${tab}" aria-pressed="${this.tab === tab}">${name}</button>
    `).join("");
    const sideSlots = (slots: readonly EquipSlot[], side: string) => `
      <div class="bag-slots ${side}">${slots.map(slot => this.slotButton(slot, side)).join("")}</div>`;
    this.root.innerHTML = `
      <header class="bag-heading">
        <h3>芙芙的背包</h3>
        <button type="button" class="bag-close" data-focus="close" aria-label="收起背包" title="收起背包（B / Esc）">×</button>
      </header>` + (notebook && page !== null ? renderRuinJournal(notebook.astrolabe, notebook.listened, page) : `
      <nav class="bag-tabs" aria-label="背包分类">${tabButtons}</nav>
      <div class="bag-dressing">
        ${sideSlots(EQUIP_SLOTS.slice(0, 3), "left")}
        <div class="bag-mirror">
          <canvas class="bag-avatar" width="160" height="144" data-facing="${this.facing}" role="img" aria-label="芙芙的${facingNames[this.facing]}穿搭预览"></canvas>
          <div class="bag-turns">
            <button type="button" data-turn="-1" data-focus="turn-left" aria-label="向左转身">‹</button>
            <span>${facingNames[this.facing]}</span>
            <button type="button" data-turn="1" data-focus="turn-right" aria-label="向右转身">›</button>
          </div>
        </div>
        ${sideSlots(EQUIP_SLOTS.slice(3), "right")}
      </div>
      <div class="bag-collection">${this.collection()}</div>
      <footer class="bag-footer">${this.footer()}</footer>`);
    if (focused) {
      const target = focusKey ? this.root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]:not(:disabled)`) : null;
      const fallback = notebook ? this.root.querySelector<HTMLElement>(".ruin-journal-paper")
        : focusKey === "prev" || focusKey === "next"
        ? this.root.querySelector<HTMLButtonElement>(".bag-pages button:not(:disabled)")
        : this.root.querySelector<HTMLButtonElement>(".bag-tabs [aria-pressed=true]");
      (target?.getClientRects().length ? target : fallback)?.focus({preventScroll:true});
    }
    this.drawIcons();
  }
  private drawIcons() {
    if (this.root.hidden) return;
    for (const canvas of this.root.querySelectorAll<HTMLCanvasElement>("canvas[data-item]")) {
      const c = canvas.getContext("2d");
      if (!c) continue;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      drawItem(c, canvas.dataset.item as ItemId, 4, 4, 72, 72, this.wreath, this.rewards);
    }
    this.drawPreview();
  }
  private drawPreview() {
    if (this.root.hidden) return;
    const canvas = this.root.querySelector<HTMLCanvasElement>(".bag-avatar");
    if (!canvas) return;
    const equipped = {...this.state.equipped};
    if (this.tab === "wardrobe" && this.trying && this.selected && this.state.owned.includes(this.selected)) {
      equipped[ITEMS[this.selected].slot] = this.selected;
    }
    this.world.drawWardrobePreview(canvas, equipped, this.facing);
  }
}
