import type { Memory } from "./content";
import { escapeHtml } from "./icons";
import "./game-mail-desk.css";

interface DeskLetters {
  items: Memory[];
  selectedId?: string;
  unreadIds?: readonly string[];
  onRead: (id: string) => void;
}

/** The desk itself never opens the first envelope or creates a read receipt. */
export function renderGameMailDesk(
  body: HTMLElement,
  letters: DeskLetters,
  onCleanup: (callback: () => void) => void,
) {
  body.classList.add("mail-desk-body");
  body.removeAttribute("tabindex");
  body.innerHTML = `<div class="mail-desk-pile collection-list" role="group" aria-label="桌上的信封"></div>
    <article class="mail-sheet" hidden>
      <div class="mail-sheet-heading"><h4></h4><button type="button" class="mail-fold">放回信封</button></div>
      <div tabindex="0" class="memory-detail" role="region" aria-label="信件正文，可滚动阅读">
        <p class="mail-signature"></p><p class="letter-text"></p>
      </div>
    </article>`;
  const pile = body.querySelector<HTMLElement>(".mail-desk-pile")!;
  const sheet = body.querySelector<HTMLElement>(".mail-sheet")!;
  const page = sheet.querySelector<HTMLElement>(".memory-detail")!;
  const title = sheet.querySelector("h4")!;
  const signature = sheet.querySelector<HTMLElement>(".mail-signature")!;
  const text = sheet.querySelector<HTMLElement>(".letter-text")!;
  const unread = new Set(letters.unreadIds);
  pile.dataset.count = String(letters.items.length);
  let activeButton: HTMLButtonElement | undefined;
  let opening: HTMLButtonElement | undefined;
  let timer: number | undefined;

  function cancelOpening() {
    window.clearTimeout(timer);
    opening?.classList.remove("opening");
    opening = undefined;
  }
  function showSheet(item: Memory, button: HTMLButtonElement) {
    cancelOpening();
    activeButton = button;
    title.textContent = item.title;
    signature.textContent = item.author ? `来自 ${item.author}` : "";
    signature.hidden = !item.author;
    text.textContent = item.text ?? "";
    pile.hidden = true;
    sheet.hidden = false;
    sheet.dataset.memoryId = item.id;
    body.dataset.openLetterId = item.id;
    page.scrollTop = 0;
    page.focus({ preventScroll: true });
    unread.delete(item.id);
    button.dataset.sealed = "false";
    button.setAttribute("aria-label", `${item.title}，已读`);
    letters.onRead(item.id);
  }
  sheet.querySelector("button")!.addEventListener("click", () => {
    sheet.hidden = true;
    delete sheet.dataset.memoryId;
    delete body.dataset.openLetterId;
    pile.hidden = false;
    if (activeButton) {
      activeButton.focus({ preventScroll: true });
      // NPC shortcuts can jump straight to an envelope below the fold.
      const card = activeButton.getBoundingClientRect(), bounds = pile.getBoundingClientRect();
      if (card.top < bounds.top) pile.scrollTop += card.top - bounds.top;
      else if (card.bottom > bounds.bottom) pile.scrollTop += card.bottom - bounds.bottom;
    }
  });
  let direct: { item: Memory; button: HTMLButtonElement } | undefined;
  for (const item of letters.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mail-envelope";
    button.dataset.memoryId = item.id;
    const sealed = unread.has(item.id);
    button.dataset.sealed = String(sealed);
    button.setAttribute("aria-label", `${item.title}，${sealed ? "未读" : "已读"}`);
    const sender = item.author || item.title;
    button.innerHTML = `<span class="mail-envelope-art" aria-hidden="true"><i class="mail-lifted-flap"></i></span><span class="envelope-name">${escapeHtml(sender)}</span>`;
    button.addEventListener("click", () => {
      if (opening === button) return;
      cancelOpening();
      if (unread.has(item.id) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        opening = button;
        button.classList.add("opening");
        timer = window.setTimeout(() => {
          if (!body.isConnected || body.closest("[hidden], [inert]")) cancelOpening();
          else showSheet(item, button);
        }, 280);
      } else showSheet(item, button);
    });
    pile.append(button);
    if (letters.selectedId === item.id) direct = { item, button };
  }
  onCleanup(() => {
    cancelOpening();
    delete body.dataset.openLetterId;
  });
  if (direct) showSheet(direct.item, direct.button);
  else pile.querySelector("button")?.focus({ preventScroll: true });
}
