import type { Memory } from "./content";
import "./game-mail-desk.css";

export interface LetterList {
  items: readonly Memory[];
  selectedId?: string;
  unreadIds?: readonly string[];
  onRead: (id: string) => void;
  subscribe?: (listener: (items: readonly Memory[], unreadIds: readonly string[]) => void) => () => void;
}

/** Deliveries keep the catalogue order. Insert missing envelopes around the existing buttons. */
export function renderMailboxList(
  list: Element,
  letters: LetterList,
  makeButton: (item: Memory, unread: boolean) => HTMLButtonElement,
  onCleanup: (callback: () => void) => void,
) {
  const insertDeliveries = (items: readonly Memory[], unreadIds: readonly string[]) => {
    const scrollTop = list.scrollTop;
    items.forEach((item, index) => {
      const next = list.children.item(index);
      if (next?.getAttribute("data-memory-id") !== item.id)
        list.insertBefore(makeButton(item, unreadIds.includes(item.id)), next);
    });
    list.scrollTop = scrollTop;
  };
  insertDeliveries(letters.items, letters.unreadIds ?? []);
  if (letters.subscribe) onCleanup(letters.subscribe(insertDeliveries));
}

/** Reveal an envelope without scrolling the desk or the surrounding page. */
function revealEnvelope(button: HTMLButtonElement) {
  const list = button.parentElement!;
  const bounds = list.getBoundingClientRect(), card = button.getBoundingClientRect();
  if (card.top < bounds.top) list.scrollTop += card.top - bounds.top;
  else if (card.bottom > bounds.bottom) list.scrollTop += card.bottom - bounds.bottom;
}

const envelopeArt = '<span class="mail-envelope-art" aria-hidden="true"><i class="mail-paper"></i><i class="mail-pocket"></i><i class="mail-flap"></i><i class="mail-seal"></i><span class="envelope-name"></span></span>';

function bayMarkup(group: "unread" | "read", label: string) {
  return `<section class="mail-bay" data-compartment="${group}" aria-label="${label}来信">
    <div class="mail-bay-list collection-list" role="group" aria-label="${label}信封"></div>
    <h4 class="mail-bay-label">${label} · 0</h4>
  </section>`;
}

/** Fit a centered element onto the selected envelope elsewhere on the desk. */
function transformTo(from: DOMRect, to: DOMRect) {
  const dx = to.left + to.width / 2 - from.left - from.width / 2;
  const dy = to.top + to.height / 2 - from.top - from.height / 2;
  return `translate(${dx}px, ${dy}px) scale(${to.width / from.width}, ${to.height / from.height})`;
}

export function renderGameMailDesk(
  body: HTMLElement,
  letters: LetterList,
  onCleanup: (callback: () => void) => void,
) {
  body.classList.add("mail-desk-body");
  body.removeAttribute("tabindex");
  body.dataset.mailState = "box";
  body.innerHTML = `<div class="mail-chest">${bayMarkup("unread", "未读")}${bayMarkup("read", "已读")}</div>
    <div hidden class="mail-flight" aria-hidden="true">${envelopeArt}</div>
    <article class="mail-sheet" hidden>
      <div class="mail-sheet-heading"><h4></h4><button type="button" class="mail-fold">放回信匣</button></div>
      <div tabindex="0" class="memory-detail" role="region" aria-label="信件正文，可滚动阅读">
        <p class="mail-signature"></p><p class="letter-text"></p>
      </div>
    </article>`;
  const chest = body.querySelector<HTMLElement>(".mail-chest")!;
  const bays = [...chest.querySelectorAll<HTMLElement>(".mail-bay")].map(bay => ({
    unread: bay.dataset.compartment === "unread",
    list: bay.querySelector<HTMLElement>(".mail-bay-list")!,
    label: bay.querySelector<HTMLElement>("h4")!,
  }));
  const flight = body.querySelector<HTMLElement>(".mail-flight")!;
  const flightPaper = flight.querySelector<HTMLElement>(".mail-paper")!;
  const sheet = body.querySelector<HTMLElement>(".mail-sheet")!;
  const page = sheet.querySelector<HTMLElement>(".memory-detail")!;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const buttons = new Map<string, HTMLButtonElement>();
  let items = letters.items;
  let unread = new Set(letters.unreadIds);
  let active: Memory | undefined;
  let lifted: HTMLButtonElement | undefined;
  let motion: Animation | undefined;
  let paperMotion: Animation | undefined;

  function lift(button?: HTMLButtonElement) {
    if (lifted === button) return;
    lifted?.classList.remove("is-lifted");
    lifted = button;
    button?.classList.add("is-lifted");
  }

  function makeButton(item: Memory) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mail-envelope";
    button.dataset.memoryId = item.id;
    button.innerHTML = `<span class="mail-slot-mask">${envelopeArt}</span>`;
    button.querySelector(".envelope-name")!.textContent = item.author || item.title;
    button.addEventListener("pointerenter", event => {
      if (event.pointerType !== "touch" && body.dataset.mailState === "box") lift(button);
    });
    button.addEventListener("pointerleave", () => { if (lifted === button) lift(); });
    button.addEventListener("focus", () => { if (button.matches(":focus-visible")) lift(button); });
    button.addEventListener("blur", () => { if (lifted === button) lift(); });
    button.addEventListener("click", () => openEnvelope(item));
    buttons.set(item.id, button);
    return button;
  }

  function arrange() {
    for (const bay of bays) {
      const group = items.filter(item => unread.has(item.id) === bay.unread);
      const scroll = bay.list.scrollTop;
      group.forEach((item, index) => {
        const button = buttons.get(item.id) ?? makeButton(item);
        button.dataset.sealed = String(bay.unread);
        button.setAttribute("aria-label", `${item.title}，${bay.unread ? "未读" : "已读"}`);
        if (button !== bay.list.children[index]) bay.list.insertBefore(button, bay.list.children.item(index));
      });
      bay.list.scrollTop = scroll;
      bay.label.textContent = `${bay.unread ? "未读" : "已读"} · ${group.length}`;
    }
  }

  function clearMotion() {
    if (motion) {
      motion.onfinish = null;
      motion.cancel();
      motion = undefined;
    }
    paperMotion?.cancel();
    paperMotion = undefined;
    flight.hidden = true;
    delete flight.dataset.direction;
    if (active) buttons.get(active.id)?.classList.remove("is-travelling");
  }

  function returnToBox(focus: boolean) {
    clearMotion();
    body.dataset.mailState = "box";
    delete body.dataset.openLetterId;
    delete sheet.dataset.memoryId;
    sheet.hidden = true;
    sheet.inert = false;
    chest.hidden = false;
    chest.inert = false;
    const button = active && buttons.get(active.id);
    active = undefined;
    if (button && focus) {
      revealEnvelope(button);
      button.focus({ preventScroll: true });
    }
  }

  function showLetter(item: Memory) {
    const fromPaper = flight.hidden ? undefined : flightPaper.getBoundingClientRect();
    clearMotion();
    body.dataset.mailState = "reading";
    sheet.querySelector("h4")!.textContent = item.title;
    const signature = sheet.querySelector<HTMLElement>(".mail-signature")!;
    signature.textContent = item.author ? `来自 ${item.author}` : "";
    signature.hidden = !item.author;
    sheet.querySelector(".letter-text")!.textContent = item.text ?? "";
    chest.hidden = true;
    sheet.hidden = false;
    sheet.dataset.memoryId = body.dataset.openLetterId = item.id;
    page.scrollTop = 0;
    if (fromPaper?.width && fromPaper.height && !reducedMotion.matches) {
      paperMotion = sheet.animate([
        { transform: transformTo(sheet.getBoundingClientRect(), fromPaper) }, { transform: "none" },
      ], { duration: 130, easing: "ease-out" });
    }
    page.focus({ preventScroll: true });
    if (unread.delete(item.id)) {
      arrange();
      letters.onRead(item.id);
    }
  }

  function travel(item: Memory, direction: "open" | "return") {
    const opening = direction === "open";
    const button = buttons.get(item.id)!;
    const sealed = button.dataset.sealed === "true";
    const duration = opening ? (sealed ? 800 : 500) : 450;
    chest.hidden = false;
    revealEnvelope(button);
    button.classList.add("is-travelling");
    flight.querySelector(".envelope-name")!.textContent = item.author || item.title;
    flight.style.setProperty("--flight-duration", `${duration}ms`);
    flight.dataset.sealed = String(sealed);
    flight.dataset.direction = direction;
    flight.hidden = false;
    const center = flight.getBoundingClientRect();
    // The box hides most of a full envelope behind the next one or the front rail.
    // Keep its proportions, and uncover that tucked part as it clears the slot.
    const row = button.getBoundingClientRect();
    const art = button.querySelector(".mail-envelope-art")!.getBoundingClientRect();
    const inSlot = transformTo(center, art);
    const liftedSlot = `translateY(-${Math.min(28, row.height * .32)}px) ${inSlot}`;
    const tucked = `inset(0 0 ${100 * Math.max(0, art.bottom - row.bottom) / art.height}% 0)`;
    const clear = "inset(-100% -40% -30%)";
    const path: Keyframe[] = opening
      ? [{ transform: inSlot, clipPath: tucked }, { transform: liftedSlot, clipPath: clear, offset: .15 },
        { transform: "none", clipPath: clear, offset: .48 }, { transform: "none", clipPath: clear }]
      : [{ transform: "none", clipPath: clear }, { transform: "none", clipPath: clear, offset: .42 },
        { transform: liftedSlot, clipPath: clear, offset: .85 }, { transform: inSlot, clipPath: tucked }];
    if (!opening) {
      sheet.inert = true;
      const paper = flightPaper.getBoundingClientRect();
      paperMotion = sheet.animate([
        { transform: "none", opacity: 1 },
        { transform: transformTo(sheet.getBoundingClientRect(), paper), opacity: 0 },
      ], { duration: 185, easing: "ease-in", fill: "forwards" });
    }
    motion = flight.animate(path, { duration, easing: "ease-in-out", fill: "both" });
    motion.onfinish = () => {
      const visible = body.isConnected && !document.hidden && !body.closest("[hidden],[inert]");
      if (opening && visible) showLetter(item);
      else returnToBox(visible);
    };
  }

  function openEnvelope(item: Memory) {
    if (body.dataset.mailState !== "box") return;
    chest.querySelector('[aria-current="true"]')?.removeAttribute("aria-current");
    buttons.get(item.id)!.setAttribute("aria-current", "true");
    active = item;
    body.dataset.mailState = "opening";
    lift();
    chest.inert = true;
    if (reducedMotion.matches) showLetter(item);
    else travel(item, "open");
  }

  sheet.querySelector(".mail-fold")!.addEventListener("click", () => {
    if (!active || body.dataset.mailState !== "reading") return;
    clearMotion();
    body.dataset.mailState = "returning";
    if (reducedMotion.matches) returnToBox(true);
    else travel(active, "return");
  });

  function suspendTransition() {
    if (body.dataset.mailState === "opening" || body.dataset.mailState === "returning") returnToBox(false);
  }
  function visibilityChange() { if (document.hidden) suspendTransition(); }
  function focusOutside(event: FocusEvent) {
    if (event.target instanceof Element && event.target.closest(".inline-help,.debug-panel")) suspendTransition();
  }
  document.addEventListener("visibilitychange", visibilityChange);
  document.addEventListener("focusin", focusOutside);
  onCleanup(() => {
    clearMotion();
    document.removeEventListener("visibilitychange", visibilityChange);
    document.removeEventListener("focusin", focusOutside);
    delete body.dataset.openLetterId;
    delete body.dataset.mailState;
  });
  arrange();
  if (letters.subscribe) onCleanup(letters.subscribe((entries, unreadIds) => {
    items = entries;
    unread = new Set(unreadIds);
    arrange();
  }));

  const selected = items.find(item => item.id === letters.selectedId);
  if (selected) openEnvelope(selected);
  else chest.querySelector("button")?.focus({ preventScroll: true });
}
