import type { Memory } from "./content";
import { mountMailPages } from "./mail-letter-pages";
import { applyStationeryTheme } from "./stationery-themes";
import "./game-mail-desk.css";

export interface LetterList {
  items: readonly Memory[];
  selectedId?: string;
  unreadIds?: readonly string[];
  onRead: (id: string) => void;
  subscribe?: (listener: (items: readonly Memory[], unreadIds: readonly string[]) => void) => () => void;
}

const envelopeArt = `<span class="mail-envelope-art" aria-hidden="true"><span class="mail-envelope-object">
  <i class="mail-paper"></i><i class="mail-pocket"></i><i class="mail-flap"></i><i class="mail-seal"></i>
</span></span>`;

/** The ink stays on the paper it was printed on as the flap turns or the sheet slides out. */
function inscribe(envelope: HTMLElement, item: Memory, sealed: boolean) {
  applyStationeryTheme(envelope, item.id);
  const ink = envelope.querySelector<HTMLElement>(".mail-sender") ?? document.createElement("span");
  ink.className = "mail-sender";
  ink.textContent = item.author || item.title;
  const surface = envelope.querySelector(sealed ? ".mail-flap" : ".mail-pocket")!;
  if (ink.parentElement !== surface) surface.append(ink);
}

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
  body.setAttribute("aria-label", "晚安信箱，可用左右键挑信和翻页");
  const heading = body.parentElement?.querySelector<HTMLElement>(":scope > header h3");
  if (heading) applyStationeryTheme(heading);
  body.dataset.mailState = "box";
  body.innerHTML = `<section class="mail-stack" aria-label="桌上的来信">
      <button class="mail-stack-prev" type="button" aria-label="上一封" title="上一封 · ←"></button>
      <div class="mail-deck">
        <div class="mail-deck-back" aria-hidden="true" hidden>${envelopeArt}</div>
        <div class="mail-deck-back" aria-hidden="true" hidden>${envelopeArt}</div>
        <button type="button" class="mail-envelope">${envelopeArt}</button>
        <div class="mail-deck-leaf" aria-hidden="true" hidden>${envelopeArt}</div>
      </div>
      <button class="mail-stack-next" type="button" aria-label="下一封" title="下一封 · →"></button>
      <div class="mail-stack-caption" aria-live="polite" aria-atomic="true">
        <span class="mail-stack-position"></span>
      </div>
      <p class="mail-stack-empty" tabindex="-1" hidden>桌上还没有来信。</p>
    </section>
    <div hidden class="mail-flight" aria-hidden="true">${envelopeArt}</div>
    <article class="mail-sheet" hidden>
      <div class="mail-sheet-heading"><div class="mail-sheet-caption"><h4></h4><p class="mail-signature"></p></div>
        <button type="button" class="mail-fold">放回信摞</button></div>
      <div tabindex="0" class="memory-detail" role="region" aria-label="信件正文"><p class="letter-text"></p></div>
    </article>`;
  const stack = body.querySelector<HTMLElement>(".mail-stack")!;
  const deck = stack.querySelector<HTMLElement>(".mail-deck")!;
  const button = deck.querySelector<HTMLButtonElement>(".mail-envelope")!;
  const backs = deck.querySelectorAll<HTMLElement>(".mail-deck-back");
  const leaf = deck.querySelector<HTMLElement>(".mail-deck-leaf")!;
  const previous = stack.querySelector<HTMLButtonElement>(".mail-stack-prev")!;
  const next = stack.querySelector<HTMLButtonElement>(".mail-stack-next")!;
  const caption = stack.querySelector<HTMLElement>(".mail-stack-caption")!;
  const position = caption.querySelector<HTMLElement>(".mail-stack-position")!;
  const empty = stack.querySelector<HTMLElement>(".mail-stack-empty")!;
  const flight = body.querySelector<HTMLElement>(".mail-flight")!;
  const flightPaper = flight.querySelector<HTMLElement>(".mail-paper")!;
  const sheet = body.querySelector<HTMLElement>(".mail-sheet")!;
  const page = sheet.querySelector<HTMLElement>(".memory-detail")!;
  const pages = mountMailPages(sheet);
  onCleanup(pages.dispose);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let items: readonly Memory[] = [];
  let index = 0;
  let unread = new Set<string>();
  // Preserve this pickup's ordering while seals are opened. Picking up the stack anew
  // creates a new snapshot of unread letters; incoming mail gets its own initial status.
  const initiallyUnread = new Set<string>();
  let active: Memory | undefined;
  let motion: Animation | undefined;
  let paperMotion: Animation | undefined;
  let turnMotion: Animation | undefined;

  function showFront() {
    const item = items[index];
    button.hidden = deck.hidden = caption.hidden = !item;
    previous.hidden = next.hidden = items.length <= 1;
    empty.hidden = Boolean(item);
    if (!item) return;
    backs.forEach((back, offset) => {
      back.hidden = offset + 1 >= items.length;
      if (back.hidden) return;
      const behind = items[(index + offset + 1) % items.length];
      back.dataset.sealed = String(unread.has(behind.id));
      applyStationeryTheme(back, behind.id);
    });
    button.dataset.memoryId = item.id;
    button.dataset.sealed = String(unread.has(item.id));
    button.setAttribute("aria-label", `${item.title}，${unread.has(item.id) ? "未读" : "已读"}，打开来信`);
    inscribe(button, item, unread.has(item.id));
    position.textContent = `${index + 1} / ${items.length}`;
    position.setAttribute("aria-label", `${item.author || item.title}，第 ${index + 1} 封，共 ${items.length} 封`);
  }

  function arrange(entries: readonly Memory[], unreadIds: readonly string[]) {
    const selectedId = items[index]?.id;
    const previousIds = new Set(items.map(item => item.id));
    unread = new Set(unreadIds);
    for (const item of entries) {
      if (!previousIds.has(item.id)) {
        if (unread.has(item.id)) initiallyUnread.add(item.id);
        else initiallyUnread.delete(item.id);
      }
    }
    items = [...entries.filter(item => initiallyUnread.has(item.id)), ...entries.filter(item => !initiallyUnread.has(item.id))];
    index = Math.max(0, items.findIndex(item => item.id === selectedId));
    showFront();
  }

  function clearTurn() {
    if (turnMotion) {
      turnMotion.onfinish = null;
      turnMotion.cancel();
      turnMotion = undefined;
    }
    leaf.hidden = true;
  }

  function turn(to: number, direction: number) {
    if (body.dataset.mailState !== "box" || items.length < 2) return;
    const newIndex = (to + items.length) % items.length;
    if (index === newIndex) return;
    clearTurn();
    leaf.dataset.sealed = button.dataset.sealed;
    inscribe(leaf, items[index], unread.has(items[index].id));
    index = newIndex;
    showFront();
    if (reducedMotion.matches) return;
    leaf.hidden = false;
    turnMotion = leaf.animate([
      { transform: "none", zIndex: 1 },
      { transform: `translate(${direction * 24}%, -7%) rotate(${direction * 6}deg)`, zIndex: 1, offset: .46 },
      { transform: `translate(${direction * 24}%, -7%) rotate(${direction * 6}deg)`, zIndex: -1, offset: .47 },
      { transform: `translate(${direction * 2}%, 2%) rotate(${direction * 3}deg)`, zIndex: -1 },
    ], { duration: 235, easing: "ease-out" });
    turnMotion.onfinish = clearTurn;
  }

  previous.addEventListener("click", () => turn(index - 1, -1));
  next.addEventListener("click", () => turn(index + 1, 1));
  stack.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    switch (event.key) {
      case "ArrowLeft": turn(index - 1, -1); break;
      case "ArrowRight": turn(index + 1, 1); break;
      case "Home": turn(0, -1); break;
      case "End": turn(items.length - 1, 1); break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

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
    button.classList.remove("is-travelling");
  }

  function returnToStack(focus: boolean) {
    clearMotion();
    body.dataset.mailState = "box";
    delete body.dataset.openLetterId;
    delete sheet.dataset.memoryId;
    sheet.hidden = true;
    sheet.inert = false;
    stack.hidden = false;
    stack.inert = false;
    active = undefined;
    if (focus && items.length) button.focus({ preventScroll: true });
  }

  function showLetter(item: Memory) {
    const fromPaper = flight.hidden ? undefined : flightPaper.getBoundingClientRect();
    clearMotion();
    body.dataset.mailState = "reading";
    applyStationeryTheme(sheet, item.id);
    sheet.querySelector("h4")!.textContent = item.title;
    const signature = sheet.querySelector<HTMLElement>(".mail-signature")!;
    signature.textContent = item.author ? `来自 ${item.author}` : "";
    signature.hidden = !item.author;
    stack.hidden = true;
    sheet.hidden = false;
    sheet.dataset.memoryId = body.dataset.openLetterId = item.id;
    pages.open(item.text ?? "");
    if (fromPaper?.width && fromPaper.height && !reducedMotion.matches) {
      paperMotion = sheet.animate([
        { transform: transformTo(sheet.getBoundingClientRect(), fromPaper) }, { transform: "none" },
      ], { duration: 130, easing: "ease-out" });
    }
    page.focus({ preventScroll: true });
    if (unread.delete(item.id)) {
      showFront();
      letters.onRead(item.id);
    }
  }

  function travel(item: Memory, direction: "open" | "return") {
    const opening = direction === "open";
    const sealed = button.dataset.sealed === "true";
    const duration = opening ? (sealed ? 800 : 500) : 450;
    // Restore the desk toolbar before measuring the landing point on phones.
    const readingRect = opening ? undefined : sheet.getBoundingClientRect();
    if (readingRect) sheet.inert = true;
    stack.hidden = false;
    button.classList.add("is-travelling");
    flight.style.setProperty("--flight-duration", `${duration}ms`);
    flight.dataset.sealed = String(sealed);
    inscribe(flight, item, sealed);
    flight.dataset.direction = direction;
    flight.hidden = false;
    const center = flight.getBoundingClientRect();
    const art = button.querySelector(".mail-envelope-art")!.getBoundingClientRect();
    const resting = transformTo(center, art);
    const lift = `translateY(-${Math.min(18, art.height * .07)}px) ${resting}`;
    const path: Keyframe[] = opening
      ? [{ transform: resting }, { transform: lift, offset: .15 }, { transform: "none", offset: .48 }, { transform: "none" }]
      : [{ transform: "none" }, { transform: "none", offset: .42 }, { transform: lift, offset: .85 }, { transform: resting }];
    if (readingRect) {
      const sheetRect = sheet.getBoundingClientRect();
      paperMotion = sheet.animate([
        { transform: transformTo(sheetRect, readingRect), opacity: 1 },
        { transform: transformTo(sheetRect, flightPaper.getBoundingClientRect()), opacity: 0 },
      ], { duration: 185, easing: "ease-in", fill: "forwards" });
    }
    motion = flight.animate(path, { duration, easing: "ease-in-out", fill: "both" });
    motion.onfinish = () => {
      const visible = body.isConnected && !document.hidden && !body.closest("[hidden],[inert]");
      if (opening && visible) showLetter(item);
      else returnToStack(visible);
    };
  }

  function openEnvelope() {
    const item = items[index];
    if (!item || body.dataset.mailState !== "box") return;
    clearTurn();
    active = item;
    body.dataset.mailState = "opening";
    stack.inert = true;
    if (reducedMotion.matches) showLetter(item);
    else travel(item, "open");
  }
  button.addEventListener("click", openEnvelope);
  sheet.querySelector(".mail-fold")!.addEventListener("click", () => {
    if (!active || body.dataset.mailState !== "reading") return;
    clearMotion();
    body.dataset.mailState = "returning";
    if (reducedMotion.matches) returnToStack(true);
    else travel(active, "return");
  });

  function suspendTransition() {
    if (body.dataset.mailState === "opening" || body.dataset.mailState === "returning") returnToStack(false);
  }
  function visibilityChange() { if (document.hidden) suspendTransition(); }
  function focusOutside(event: FocusEvent) {
    if (event.target instanceof Element && event.target.closest(".inline-help,.debug-panel")) suspendTransition();
  }
  document.addEventListener("visibilitychange", visibilityChange);
  document.addEventListener("focusin", focusOutside);
  onCleanup(() => {
    clearTurn();
    clearMotion();
    document.removeEventListener("visibilitychange", visibilityChange);
    document.removeEventListener("focusin", focusOutside);
    delete body.dataset.openLetterId;
    delete body.dataset.mailState;
  });
  arrange(letters.items, letters.unreadIds ?? []);
  if (letters.subscribe) onCleanup(letters.subscribe(arrange));
  const selected = items.findIndex(item => item.id === letters.selectedId);
  if (selected >= 0) {
    index = selected;
    showFront();
    openEnvelope();
  } else (items.length ? button : empty).focus({ preventScroll: true });
}
