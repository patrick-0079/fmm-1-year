import type { Memory } from "./content";
import { reservedShortcut } from "./input";
import "./game-album.css";

/** Use the same on-demand original viewer from the paper album and the webpage. */
export function attachPhotoOriginalViewer(
  body: HTMLElement, onCleanup: (cleanup: () => void) => void,
) {
  let dismiss: ((restoreFocus: boolean) => void) | undefined;
  onCleanup(() => dismiss?.(false));

  return (item: Memory, trigger: HTMLButtonElement) => {
    dismiss?.(false);
    const previous = [...body.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !child.inert);
    const view = document.createElement("section");
    view.className = "photo-original";
    view.setAttribute("aria-label", `查看原图 · ${item.title}`);
    view.innerHTML = `<div class="photo-original-toolbar">
      <button type="button" class="photo-original-back">返回相册</button>
      <strong class="photo-original-title"></strong>
      <button type="button" class="photo-original-zoom" disabled>原始大小</button>
    </div><div class="photo-original-stage" tabindex="0" aria-label="照片"></div>
    <div class="photo-original-feedback"><span role="status"></span>
      <button type="button" class="photo-original-retry" hidden>重新加载原图</button></div>`;
    const title = view.querySelector<HTMLElement>(".photo-original-title")!;
    const stage = view.querySelector<HTMLElement>(".photo-original-stage")!;
    const back = view.querySelector<HTMLButtonElement>(".photo-original-back")!;
    const zoom = view.querySelector<HTMLButtonElement>(".photo-original-zoom")!;
    const retry = view.querySelector<HTMLButtonElement>(".photo-original-retry")!;
    const status = view.querySelector<HTMLElement>('[role="status"]')!;
    const preview = new Image();
    preview.alt = item.alt || item.title;
    preview.draggable = false;
    if (item.src) preview.src = item.src;
    title.textContent = item.title;
    stage.append(preview);
    previous.forEach(child => { child.inert = true; });
    body.classList.add("has-photo-original");
    body.append(view);
    back.focus({ preventScroll: true });

    let request: HTMLImageElement | undefined;
    let zoomed = false;
    let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
    function releaseRequest() {
      if (!request) return;
      request.onload = request.onerror = null;
      request.removeAttribute("src");
      request = undefined;
    }
    dismiss = restoreFocus => {
      releaseRequest();
      view.remove();
      previous.forEach(child => { child.inert = false; });
      body.classList.remove("has-photo-original");
      dismiss = undefined;
      if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
    const close = () => dismiss?.(true);
    back.addEventListener("click", close);
    const load = () => {
      releaseRequest();
      retry.hidden = true;
      status.textContent = "正在载入原图…";
      const original = new Image();
      original.alt = preview.alt;
      original.decoding = "async";
      original.draggable = false;
      request = original;
      original.onload = () => {
        if (request !== original) return;
        stage.replaceChildren(original);
        stage.dataset.ready = "true";
        zoom.disabled = false;
        status.textContent = "";
      };
      original.onerror = () => {
        if (request !== original) return;
        status.textContent = "暂时无法载入原图";
        retry.hidden = false;
      };
      if (item.originalSrc) original.src = item.originalSrc;
      else { status.textContent = "原图暂未提供"; }
    };
    retry.addEventListener("click", () => {
      // The retry button disappears during the next request.
      back.focus({ preventScroll: true });
      load();
    });
    zoom.addEventListener("click", () => {
      zoomed = !zoomed;
      stage.classList.toggle("at-native-size", zoomed);
      zoom.textContent = zoomed ? "适应画面" : "原始大小";
      stage.scrollLeft = zoomed ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
      stage.scrollTop = zoomed ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
    });
    stage.addEventListener("pointerdown", event => {
      if (!zoomed || !event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", event => {
      if (!drag || drag.id !== event.pointerId) return;
      stage.scrollLeft = drag.left + drag.x - event.clientX;
      stage.scrollTop = drag.top + drag.y - event.clientY;
    });
    stage.addEventListener("lostpointercapture", () => {
      drag = undefined;
      stage.classList.remove("is-dragging");
    });
    view.addEventListener("keydown", event => {
      if (reservedShortcut(event)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.target === stage && zoomed && event.key.startsWith("Arrow")) {
        // Native arrow scrolling of the focusable viewport must not reach the map.
        event.stopPropagation();
      }
    });
    load();
  };
}

export function renderPhotoBook(body: HTMLElement, items: readonly Memory[]) {
  const book = document.createElement("section");
  book.className = "photo-book";
  book.setAttribute("aria-label", "回忆相册书页");
  book.innerHTML = `<div class="photo-book-spread"></div>
    <nav class="photo-book-navigation" aria-label="相册翻页">
      <button type="button" class="photo-book-prev" aria-label="上一页">←</button>
      <span class="photo-book-count" aria-live="polite"></span>
      <button type="button" class="photo-book-next" aria-label="下一页">→</button>
    </nav>`;
  const spread = book.querySelector<HTMLElement>(".photo-book-spread")!;
  const count = book.querySelector<HTMLElement>(".photo-book-count")!;
  const prev = book.querySelector<HTMLButtonElement>(".photo-book-prev")!;
  const next = book.querySelector<HTMLButtonElement>(".photo-book-next")!;
  let disposeOriginal: () => void = () => {};
  const openOriginal = attachPhotoOriginalViewer(body, cleanup => { disposeOriginal = cleanup; });
  let page = 0;
  const pages = Math.ceil(items.length / 2);
  const draw = () => {
    spread.replaceChildren();
    for (const photo of items.slice(page * 2, page * 2 + 2)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "photo-book-photo";
      button.dataset.memoryId = photo.id;
      button.setAttribute("aria-label", `查看原图 · ${photo.title}`);
      button.innerHTML = `<span class="photo-book-mount"><span class="photo-book-print"></span></span><span class="photo-book-caption"></span>`;
      const print = button.querySelector<HTMLElement>(".photo-book-print")!;
      const caption = button.querySelector<HTMLElement>(".photo-book-caption")!;
      const image = new Image();
      image.alt = photo.alt || photo.title;
      image.draggable = false;
      image.decoding = "async";
      if (photo.width && photo.height) {
        button.style.setProperty("--print-ratio", String(photo.width / photo.height));
      } else {
        image.onload = () => button.style.setProperty("--print-ratio", String(image.naturalWidth / image.naturalHeight));
      }
      if (photo.src) image.src = photo.src;
      print.append(image);
      caption.textContent = photo.title;
      button.addEventListener("click", () => openOriginal(photo, button));
      spread.append(button);
    }
    count.textContent = `${page + 1} / ${pages}`;
    prev.disabled = page === 0;
    next.disabled = page === pages - 1;
  };
  const turn = (step: number) => {
    const destination = page + step;
    if (destination < 0 || destination >= pages) return;
    const focus = document.activeElement;
    const focusedPhoto = [...spread.children].findIndex(child => child === focus);
    page = destination;
    draw();
    if (focusedPhoto >= 0) {
      (spread.children[Math.min(focusedPhoto, spread.children.length - 1)] as HTMLElement).focus({ preventScroll: true });
    } else if (focus === next && next.disabled) prev.focus({ preventScroll: true });
    else if (focus === prev && prev.disabled) next.focus({ preventScroll: true });
  };
  prev.addEventListener("click", () => turn(-1));
  next.addEventListener("click", () => turn(1));
  book.addEventListener("keydown", event => {
    if (reservedShortcut(event) || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
    event.preventDefault();
    event.stopPropagation();
    turn(event.key === "ArrowRight" ? 1 : -1);
  });
  let touch: { id: number; x: number; y: number } | undefined;
  let swallowClick = false;
  spread.addEventListener("pointerdown", event => {
    swallowClick = false;
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  spread.addEventListener("pointercancel", () => { touch = undefined; });
  spread.addEventListener("pointerup", event => {
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = undefined;
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    swallowClick = true;
    turn(dx < 0 ? 1 : -1);
  });
  spread.addEventListener("click", event => {
    if (swallowClick && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      swallowClick = false;
    }
  }, true);
  body.replaceChildren(book);
  body.removeAttribute("tabindex");
  draw();
  spread.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  return () => { disposeOriginal(); book.remove(); };
}
