import { NATURE_KEY } from "./nature-save";
import type { World } from "./world";
import {
  ITEMS,
  INVENTORY_KEY,
  readInventory,
  mergeInventoryReceipts,
  grantItem,
  equipItem,
  EQUIP_SLOTS,
  slotNames,
  type EquipSlot,
  type ItemId,
  type InventoryState,
} from "./items";
import { drawItem, whenWardrobeReady } from "./item-art";
import { debugTarget, reservedShortcut } from "./input";
import { sfx } from "./sound";
import type { Facing } from "./equipment";
import { whenAvatarLayersReady } from "./avatar";
import bouquetUrl from "./assets/qingya-bouquet.webp";
import envelopeUrl from "./assets/stationery-sealed.webp";
import { renderGameMailDesk, type LetterList } from "./game-mail-desk";
import type { AstrolabeState } from "./astrolabe";
import { bindJournalScrollHint, journalCoverMarkup, journalPageCount, renderRuinJournal } from "./ruin-journal";
import { townInteriorId, townInteriorKeys, type TownInteriorKey } from "./town-interior-id";
import { townInteriors } from "./town-interiors";
import { radioTrackName, townKeepsakeChoice, townKeepsakeInfo, type TownKeepsakes } from "./town-keepsakes";
import { drawTownKeepsake, prepareTownKeepsakeArt, townKeepsakeArtReady } from "./town-keepsake-art";
type BagTab = "wardrobe" | "equipped" | "keepsakes";
type Category = "all" | EquipSlot;
const categories: readonly Category[] = ["all", ...EQUIP_SLOTS];
const itemIds = Object.keys(ITEMS) as ItemId[];
const catalogue = EQUIP_SLOTS.flatMap(slot => itemIds.filter(id => ITEMS[id].slot === slot));
function categoryName(category: Category) { return category === "all" ? "全部" : slotNames[category]; }
const turns: Facing[] = [0, 2, 3, 1];
const facingNames = ["正面", "左侧", "右侧", "背面"];
const slotArt: Record<EquipSlot, ItemId> = {
  head: "wreath", hair: "heartClip", clothes: "roseDress", shoes: "ribbonShoes",
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
  canSave = () => true;
  notebookState: () => { astrolabe: AstrolabeState; listened: boolean } | null = () => null;
  mailbox?: () => LetterList;
  townKeepsakes: () => TownKeepsakes = () => ({ items: [] });
  private mailCleanups: (() => void)[] | null = null;
  private onBagReturn?: () => void;
  private trigger = document.querySelector<HTMLButtonElement>(".bag-toggle")!;
  private root: HTMLElement = document.querySelector(".inventory-panel")!;
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
  private townPage: TownInteriorKey | "list" | null = null;
  private touchY = 0;
  private clearJournalHint: () => void = () => {};
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
      legacy = this.storage?.getItem(NATURE_KEY) ?? null;
    } catch {}
    this.earned = readInventory(raw, legacy);
    whenWardrobeReady(() => this.drawIcons());
    whenAvatarLayersReady(() => this.drawPreview());
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.addEventListener("click", () => this.togglePanel());
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("keydown", (event) => this.handleTabKey(event));
    this.root.addEventListener("wheel", event => {
      if (!event.ctrlKey && !this.canScroll(event.target, event.deltaY)) event.preventDefault();
    }, { passive: false });
    this.root.addEventListener("touchstart", event => {
      this.touchY = event.touches[0]?.clientY ?? 0;
    }, { passive: true });
    this.root.addEventListener("touchmove", event => {
      if (event.touches.length !== 1) return;
      const y = event.touches[0]?.clientY ?? this.touchY, delta = this.touchY - y;
      this.touchY = y;
      if (!this.canScroll(event.target, delta)) event.preventDefault();
    }, { passive: false });
    new ResizeObserver(() => {
      if (!this.root.hidden && this.measureLayout()) this.render();
    }).observe(this.scene);
    window.addEventListener("keydown", (e) => {
      const hotkey = e.key.toLowerCase() === "b" || (e.key === "Escape" && !this.root.hidden);
      if (!hotkey) return;
      if (reservedShortcut(e) || debugTarget(e.target)) return;
      if (this.root.hidden && e.target instanceof Element && e.target.closest("[data-page-ui]")) return;
      if (this.root.hidden && !this.canOpen()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) {
        if (e.key === "Escape" && this.mailCleanups) this.returnMailToBag();
        else this.togglePanel();
      }
    }, { capture: true });
    this.sync();
  }
  get collectedItems(): readonly ItemId[] { return this.earned.owned; }
  has(id: ItemId) {
    // Collection events still check the real save while the fitting room is open.
    return this.earned.owned.includes(id);
  }
  hasBouquet() { return this.earned.bouquet; }
  hasNotebook() { return this.notebookState() !== null; }
  openMail(letterId?: string, onReturn?: () => void) {
    if (!this.mailbox || this.mailCleanups) return;
    const letters = this.mailbox();
    if (letterId && !letters.items.some(item => item.id === letterId)) return;
    if (this.root.hidden) this.open();
    if (this.root.hidden) return;
    if (onReturn) this.onBagReturn = onReturn;
    this.tab = "keepsakes";
    this.journalPage = null;
    this.townPage = null;
    this.bouquetDetail = false;
    this.trying = false;
    this.clearJournalHint();
    const cleanups: (() => void)[] = [];
    this.mailCleanups = cleanups;
    this.updateSuspension();
    this.root.classList.add("game-letter-reader");
    this.root.dataset.tab = "keepsakes";
    this.root.setAttribute("aria-label", "背包里的晚安来信");
    this.root.innerHTML = `<header><h3>晚安来信</h3><div class="reader-tools"><button type="button" class="reader-close" data-mail-back>返回背包</button></div></header>
      <div class="reader-body"></div>`;
    renderGameMailDesk(this.root.querySelector<HTMLElement>(".reader-body")!, { ...letters, selectedId: letterId },
      cleanup => cleanups.push(cleanup));
  }
  private disposeMail() {
    if (!this.mailCleanups) return;
    for (const cleanup of this.mailCleanups) cleanup();
    this.mailCleanups = null;
    this.root.replaceChildren();
    this.root.classList.remove("game-letter-reader");
    this.root.setAttribute("aria-label", "芙芙的背包");
  }
  private returnMailToBag() {
    this.disposeMail();
    this.changeTab("keepsakes");
    this.root.querySelector<HTMLButtonElement>("[data-mail]")?.focus({ preventScroll: true });
  }
  refreshMailCount() {
    if (this.root.hidden) return;
    const label = this.root.querySelector<HTMLElement>("[data-mail] .bag-mail-count");
    if (!label || !this.mailbox) return;
    const { items, unreadIds = [] } = this.mailbox();
    label.textContent = `${items.length} 封 · ${unreadIds.length} 未读`;
  }
  openNotebook() {
    if (!this.hasNotebook()) return;
    if (this.root.hidden) this.open();
    if (this.root.hidden) return;
    this.tab = "keepsakes";
    this.bouquetDetail = false;
    this.townPage = null;
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
    this.townPage = null;
    this.updateSuspension();
    this.trying = false;
    this.render();
    this.root.querySelector<HTMLElement>(".bouquet-detail")?.focus({preventScroll:true});
  }
  openTownKeepsakes(key: TownInteriorKey | "list" = "list") {
    if (key !== "list" && !this.townKeepsakes().items.includes(key)) return;
    if (this.root.hidden) this.open();
    if (this.root.hidden) return;
    this.tab = "keepsakes";
    this.bouquetDetail = false;
    this.journalPage = null;
    this.trying = false;
    this.townPage = key;
    this.updateSuspension();
    this.render();
    this.root.querySelector<HTMLElement>(".bag-town-paper")?.focus({ preventScroll: true });
  }
  refreshTownKeepsakes() {
    if (this.townPage !== null) this.render();
    else {
      const label = this.root.querySelector("[data-town-keepsakes] .bag-mail-count");
      if (label) label.textContent = `${this.townKeepsakes().items.length} / ${townInteriorKeys.length}`;
    }
  }
  openWardrobe() {
    if (this.root.hidden) this.open();
    else this.changeTab("wardrobe");
  }
  get followingPet() { return this.earned.equipped.pet; }
  get wearingWreath() { return this.earned.equipped.head === "wreath"; }
  setCompanion(id: "petCat" | "petBunny", follow: boolean) {
    const first = follow && grantItem(this.earned,id);
    for (const outfit of [this.earned, this.fittingRoom]) {
      if (outfit && (follow || outfit.equipped.pet === id)) outfit.equipped.pet = follow ? id : null;
    }
    this.save("pet");
    if (follow) this.world.onAchievementEvent(id);
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
  private canOpen() {
    // The cinema is outside the map stage, including its non-native fullscreen fallback.
    // Opening the map's wardrobe underneath it would invisibly suspend playback.
    return !this.world.suspended && !this.scene.querySelector(".intro-screen:not(.dismissed)") &&
      !this.scene.querySelector(".game-letter-reader:not([hidden])") &&
      !this.scene.querySelector(".meadow-star-reader:not([hidden])") &&
      !document.querySelector(".cinema-player:not([hidden])");
  }
  open() {
    if (!this.root.hidden || !this.canOpen()) return;
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
    this.root.querySelector<HTMLButtonElement>(".bag-close")!.focus({ preventScroll: true });
  }
  grant(id: ItemId, announce = true) {
    return this.grantItems([id], announce);
  }
  grantItems(ids: readonly ItemId[], announce = true) {
    const added = ids.filter(id => grantItem(this.earned, id));
    if (!added.length) return false;
    this.save();
    this.render();
    if (announce) {
      sfx("match");
      this.toast(`获得纪念品：${added.map(id => ITEMS[id].name).join("、")} · 按 B 打开背包`);
    }
    return true;
  }
  toggle(id: ItemId) {
    if (!equipItem(this.state, id)) {
      this.toast("先收集这件纪念品吧。");
      return;
    }
    if (!this.fittingRoom) {
      this.save(ITEMS[id].slot);
      if (id === "wreath" && this.wearingWreath) this.world.onAchievementEvent("wreath-worn");
    }
    this.trying = false;
    if (this.tab === "equipped" && this.state.equipped[ITEMS[id].slot] !== id) this.selected = null;
    this.sync();
    this.render();
    this.onEquip();
    if (!this.root.hidden) this.updateSuspension();
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
    this.save("reset");
    this.sync();
  }
  private sync() {
    this.world.equipment = { ...this.state.equipped };
  }
  syncSavedInventory(raw: string) {
    // A reset is followed by a new save generation. Never merge old prizes back into that write.
    try {
      const receipt = JSON.parse(raw);
      if (receipt?.reset === true || (!receipt?.owned?.length && receipt?.bouquet !== true)) return;
    } catch { return; }
    const latest = readInventory(raw);
    if (mergeInventoryReceipts(latest, this.earned)) {
      try { this.storage?.setItem(INVENTORY_KEY, JSON.stringify(latest)); } catch {}
    }
    this.earned = latest;
    this.sync();
    if (this.journalPage === null && this.townPage === null) this.render();
  }
  private save(change?: EquipSlot | "reset") {
    if (!this.canSave()) return;
    try {
      const raw = change !== "reset" && this.storage?.getItem(INVENTORY_KEY);
      if (raw) {
        const latest = readInventory(raw);
        mergeInventoryReceipts(this.earned, latest);
        if (change) latest.equipped[change] = this.earned.equipped[change];
        this.earned.equipped = latest.equipped;
        this.sync();
      }
      const receipt = change === "reset" ? {...this.earned, reset:true} : this.earned;
      this.storage?.setItem(INVENTORY_KEY, JSON.stringify(receipt));
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
    const onReturn = this.onBagReturn;
    this.onBagReturn = undefined;
    this.disposeMail();
    this.clearJournalHint();
    this.clearJournalHint = () => {};
    this.root.hidden = true;
    this.journalPage = null;
    this.townPage = null;
    this.trying = false;
    this.bouquetDetail = false;
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-label", "打开纪念背包，快捷键 B");
    this.world.suspend("inventory", false);
    if (!restoreFocus || !wasOpen) return;
    if (this.world.suspended) {
      document.querySelector<HTMLButtonElement>("#game-help[open] .help-close")?.focus({ preventScroll: true });
    } else {
      this.world.canvas.focus({ preventScroll: true });
    }
    onReturn?.();
  }
  private updateSuspension() {
    this.world.suspend("inventory", this.mailCleanups !== null || this.journalPage !== null ||
      this.townPage !== null ||
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
    this.townPage = null;
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
    else if (data.mail !== undefined) this.openMail();
    else if (data.mailBack !== undefined) this.returnMailToBag();
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
    else if (data.townKeepsakes !== undefined) this.openTownKeepsakes();
    else if (data.townItem && townInteriorKeys.some(key => key === data.townItem)) this.openTownKeepsakes(data.townItem as TownInteriorKey);
    else if (data.keepsakes !== undefined) {
      const selector = this.townPage ? "[data-town-keepsakes]" : this.journalPage !== null ? "[data-notebook]" : "[data-bouquet]";
      this.changeTab("keepsakes");
      this.root.querySelector<HTMLButtonElement>(selector)?.focus({preventScroll:true});
    }
  }
  private turnJournalPage(page: number) {
    if (this.journalPage === null || !Number.isInteger(page) || page < 0 || page >= journalPageCount || page === this.journalPage) return;
    this.journalPage = page;
    this.render();
  }
  private canScroll(target: EventTarget | null, delta: number) {
    const paper = target instanceof Element ? target.closest<HTMLElement>(".ruin-journal-paper,.bag-town-paper") : null;
    if (!paper || !this.root.contains(paper)) return false;
    return delta < 0 ? paper.scrollTop > 0 : delta > 0 && paper.scrollTop + paper.clientHeight < paper.scrollHeight - 1;
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
    if (!reservedShortcut(event)) {
      const paper = this.root.querySelector<HTMLElement>(".ruin-journal-paper,.bag-town-paper");
      const nativeSpace = event.key === " " && event.target instanceof Element && event.target.closest("button,summary,a");
      const readingKey = ["Home", "End", "PageUp", "PageDown"].includes(event.key) ||
        (paper && ["ArrowUp", "ArrowDown", " "].includes(event.key));
      if (readingKey && !nativeSpace) {
        event.preventDefault();
        if (paper) {
          const page = Math.max(40, paper.clientHeight * .85);
          const step = event.key === "ArrowUp" ? -40 : event.key === "ArrowDown" ? 40 :
            event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -page : page;
          paper.scrollTop = event.key === "Home" ? 0 : event.key === "End" ? paper.scrollHeight : paper.scrollTop + step;
        }
        return;
      }
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
      const townCount = this.townKeepsakes().items.length;
      const mail = this.mailbox ? `<button type="button" class="bag-keepsake" data-mail data-focus="mail"><img src="${envelopeUrl}" alt=""><span>晚安来信</span><small class="bag-mail-count"></small></button>` : "";
      return `<div class="bag-keepsakes">${mail}<button type="button" class="bag-keepsake ${book ? "" : "is-locked"}" data-notebook data-focus="notebook" ${book ? "" : "disabled"} aria-label="${book ? "翻开遗迹手记" : "遗迹手记，和回声遗迹的守护者交谈后获得"}">${journalCoverMarkup}<span>遗迹手记</span></button>
        <button type="button" class="bag-keepsake ${bouquet ? "" : "is-locked"}" data-bouquet data-focus="bouquet" ${bouquet ? "" : "disabled"} title="${bouquet ? "查看花束与赠语" : "在周年小镇的青芽花店领取"}"><img src="${bouquetUrl}" alt=""><span>青芽的洋桔梗</span></button>
        <button type="button" class="bag-keepsake" data-town-keepsakes data-focus="town-keepsakes"><canvas data-town-icon="hall" width="48" height="52" aria-hidden="true"></canvas><span>小镇小物</span><small class="bag-mail-count">${townCount} / ${townInteriorKeys.length}</small></button></div>`;
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
      text = this.bouquetDetail ? "青芽亲手为你挑选的花束。" : "在周年小镇的七间屋子里，可以亲手做些小物。";
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
  private renderTownKeepsakes(page: NonNullable<Inventory["townPage"]>) {
    const book = this.townKeepsakes(), { items, radioTrack } = book;
    const art = (key: TownInteriorKey) => `<canvas data-town-icon="${key}" width="48" height="52" aria-hidden="true"></canvas>`;
    if (page === "list") return `<section class="bag-town-paper" tabindex="0" aria-label="小镇小物">
      <header><h4>小镇小物 <small>${items.length} / ${townInteriorKeys.length}</small></h4><button type="button" data-keepsakes data-focus="keepsakes-back">返回纪念物</button></header>
      <div class="bag-town-grid">${townInteriorKeys.map(key => `<button type="button" data-town-item="${key}" data-focus="town-${key}" ${items.includes(key) ? "" : "disabled"}>
        ${art(key)}<span>${townKeepsakeInfo[key].name}</span><small>${items.includes(key) ? "已收下" : townInteriors[townInteriorId(key)].scene.title}</small></button>`).join("")}</div></section>`;
    const item = townKeepsakeInfo[page];
    let design = "";
    if (page === "florist") design = townKeepsakeChoice(book, page) === "cream" ? "夹着一片奶白花瓣。" : "夹着一片浅紫花瓣。";
    if (page === "post") design = townKeepsakeChoice(book, page) === "lamps" ? "片面画着池边街灯。" : "片面画着广场彩旗。";
    if (page === "radio" && radioTrack) design = `片头底声为${radioTrackName[radioTrack]}。`;
    return `<article class="bag-town-paper" tabindex="0" aria-label="${item.name}">
      <header><h4>${item.name}</h4><button type="button" data-town-keepsakes data-focus="town-back">返回小镇小物</button></header>
      <div class="bag-town-detail">${art(page)}<p>${item.note}${design}</p></div></article>`;
  }
  private render() {
    if (this.root.hidden || this.mailCleanups) return;
    this.clearJournalHint();
    const focused = document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.dataset.focus;
    const page = this.journalPage;
    const notebook = page !== null ? this.notebookState() : null;
    this.root.dataset.tab = this.tab;
    this.root.dataset.compact = String(this.compact);
    this.root.toggleAttribute("data-town-keepsakes-open", this.townPage !== null);
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
      </header>` + (this.townPage ? this.renderTownKeepsakes(this.townPage) : notebook && page !== null ? renderRuinJournal(notebook.astrolabe, notebook.listened, page) : `
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
    this.refreshMailCount();
    this.clearJournalHint = bindJournalScrollHint(this.root);
    if (focused) {
      const target = focusKey ? this.root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]:not(:disabled)`) : null;
      const fallback = this.townPage ? this.root.querySelector<HTMLElement>(".bag-town-paper")
        : notebook ? this.root.querySelector<HTMLElement>(".ruin-journal-paper")
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
      drawItem(c, canvas.dataset.item as ItemId, 4, 4, 72, 72);
    }
    const townIcons = this.root.querySelectorAll<HTMLCanvasElement>("canvas[data-town-icon]");
    if (townIcons.length && !townKeepsakeArtReady()) {
      void prepareTownKeepsakeArt().then(ok => { if (ok) this.drawIcons(); });
    }
    for (const canvas of townIcons) {
      const c = canvas.getContext("2d");
      if (!c) continue;
      c.clearRect(0, 0, canvas.width, canvas.height);
      const key = canvas.dataset.townIcon as TownInteriorKey;
      drawTownKeepsake(c, key, townKeepsakeChoice(this.townKeepsakes(), key));
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
