import { collections, type Memory } from "./content";
import { escapeHtml, icon } from "./icons";
import { duckMusic } from "./sound";
import { FilmPreloader, downloadLabel } from "./film-preloader";
import { attachPhotoOriginalViewer, renderPhotoBook } from "./game-photo-album";
import { albumPreviewQueue } from "./album-preload";
import { renderGameMailDesk, renderMailboxList, type LetterList } from "./game-mail-desk";
import { applyStationeryTheme } from "./stationery-themes";
import "./album.css";
import "./mailbox.css";
export interface CollectionSurface {
  readonly inGame?: boolean;
  open(title: string, subtitle: string, label: string): HTMLElement;
  close(): void;
  onCleanup(cleanup: () => void): void;
}

export function openCollection(modal: CollectionSurface, id: string, letters?: LetterList, onPhotoOpen?: () => void) {
  const collection = collections[id];
  if (!collection || (id === "letters" && !letters)) return;
  const items = letters?.items ?? collection.items;
  const body = modal.open(
    collection.title,
    collection.subtitle,
    collection.kind === "image" && items.length ? "FUFU'S LITTLE DAYS · 芙芙的日常" : "A LITTLE MEMORY · 珍藏一份心意",
  );
  const symbols = { text: "mail", image: "book", audio: "sound", video: "tv" };
  const nouns = { text: "留言", image: "图片", audio: "录音", video: "视频" };
  if (modal.inGame && id === "letters" && letters) {
    renderGameMailDesk(body, letters, cleanup => modal.onCleanup(cleanup));
    return;
  }
  if (!items.length) {
    body.innerHTML = `<div class="empty-memory"><div class="empty-icon">${icon(symbols[collection.kind])}<span>${icon("heart")}</span></div><span class="empty-tag">COMING SOON</span><h3>这里，留给未来的一份心意</h3><p>${nouns[collection.kind]}正在慢慢集合。<br>先去吹蜡烛、拆礼物，或者到花园放一朵烟花吧。</p><button class="button secondary">继续小冒险 ${icon("arrow")}</button></div>`;
    body
      .querySelector("button")!
      .addEventListener("click", () => modal.close());
    return;
  }
  if (modal.inGame && id === "album") {
    modal.onCleanup(renderPhotoBook(body, items, onPhotoOpen));
    return;
  }
  body.innerHTML = `<div class="collection-layout"><nav class="collection-list" aria-label="${escapeHtml(collection.title)}列表"></nav><section class="memory-detail" aria-live="polite"></section></div>`;
  const openOriginal = id === "album" ? attachPhotoOriginalViewer(body, cleanup => modal.onCleanup(cleanup), onPhotoOpen) : undefined;
  body.querySelector(".collection-layout")!.classList.toggle("album-layout", collection.kind === "image");
  body.querySelector(".collection-layout")!.classList.toggle("mailbox-layout", collection.kind === "text");
  body.classList.toggle("mailbox-reader-body", collection.kind === "text");
  const list = body.querySelector(".collection-list")!,
    detail = body.querySelector<HTMLElement>(".memory-detail")!;
  if (collection.kind === "text" || collection.kind === "image") {
    body.removeAttribute("tabindex");
    detail.setAttribute("tabindex", "0");
    detail.setAttribute("aria-label", collection.kind === "text" ? "信件正文，可滚动阅读" : "相片与说明，可滚动阅读");
  }
  let media: HTMLMediaElement | null = null;
  let filmUrl: string | undefined;
  const stop = () => {
    if (media) {
      media.pause();
      media.removeAttribute("src");
      media.load();
      media = null;
      duckMusic(false);
    }
    if (filmUrl) { URL.revokeObjectURL(filmUrl); filmUrl = undefined; }
  };
  const select = (item: Memory) => {
    stop();
    body.scrollTop = 0;
    detail.scrollTop = 0;
    list.querySelectorAll("button").forEach(button => {
      const selected = button.dataset.memoryId === item.id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      if (selected) {
        button.querySelector(".collection-item-title")!.textContent = item.title;
        button.classList.remove("unread");
        button.setAttribute("aria-label", item.title);
      }
    });
    detail.innerHTML = `<h3>${escapeHtml(item.title)}</h3>${item.author ? `<p class="memory-author">来自 ${escapeHtml(item.author)}</p>` : ""}<div class="memory-content"></div>`;
    const content = detail.querySelector(".memory-content")!;
    if (collection.kind === "text") {
      // Each letter opens at its salutation, even after reading a long one.
      applyStationeryTheme(detail, item.id);
      body.scrollTop = 0;
      detail.scrollTop = 0;
      const p = document.createElement("p");
      p.className = "letter-text";
      p.textContent = item.text || "这封信的正文还在路上。";
      content.append(p);
      letters?.onRead(item.id);
    } else if (!item.src) {
      content.innerHTML =
        '<p class="media-error">这份素材暂未添加，稍后再来看看吧。</p>';
    } else {
      let element: HTMLImageElement | HTMLMediaElement;
      if (collection.kind === "image") {
        if (id === "album") albumPreviewQueue.prioritize(items, items.indexOf(item));
        element = new Image();
        element.alt = item.alt || item.title;
        element.className = "memory-image";
        element.decoding = "async";
      } else {
        const player = document.createElement(collection.kind);
        player.controls = true;
        player.preload = "metadata";
        player.volume = 0.65;
        if (player instanceof HTMLVideoElement) player.playsInline = true;
        element = player;
        media = player;
        player.addEventListener("play", () => duckMusic(true));
        for (const event of ["pause", "ended"])
          player.addEventListener(event, () => duckMusic(false));
      }
      if (item.originalSrc && openOriginal && element instanceof HTMLImageElement) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "photo-preview-button";
        button.setAttribute("aria-label", `查看原图 · ${item.title}`);
        const label = document.createElement("span");
        label.textContent = "查看原图";
        button.append(element, label);
        button.addEventListener("click", () => openOriginal(item, button));
        content.append(button);
      } else {
        content.append(element);
      }
      const error = document.createElement("div");
      error.className = "media-error";
      error.hidden = true;
      error.innerHTML =
        '<p>这份素材暂时没能打开。</p><button class="button secondary">重新加载</button>';
      element.addEventListener("error", () => {
        error.hidden = false;
      });
      const src = item.src;
      const status = document.createElement("small");
      let download: FilmPreloader | null = null;
      if (element instanceof HTMLVideoElement) {
        try {
          const url = new URL(src, document.baseURI);
          if (/^https?:$/.test(url.protocol)) {
            const film: FilmPreloader = new FilmPreloader(url.href, () => { status.textContent = downloadLabel(film.progress); });
            download = film;
          }
        } catch { /* Native media elements report invalid sources through their error UI. */ }
      }
      if (download) content.append(status);
      const load = () => {
        error.hidden = true;
        if (download && !filmUrl) {
          void download.start().then(url => {
            if (element !== media) { URL.revokeObjectURL(url); return; }
            filmUrl = url;
            element.src = url;
          }).catch(() => {
            if (element !== media) return;
            // Some third-party videos allow native playback but disallow CORS reads.
            status.textContent = "正在使用浏览器播放器载入影片";
            element.src = src;
          });
        } else element.src = filmUrl ?? src;
      };
      error.querySelector("button")!.addEventListener("click", load);
      content.append(error);
      load();
      if (item.text) {
        const caption = document.createElement("p");
        caption.textContent = item.text;
        caption.className = "media-caption";
        content.append(caption);
      }
    }
    // Direct NPC links can select a letter below the phone's visible tab list.
    // Move only that list, never scrollIntoView (which would move the page).
    const active = list.querySelector<HTMLElement>(".selected");
    if (active && list.clientHeight > 0) {
      const viewport = list.getBoundingClientRect(), tab = active.getBoundingClientRect();
      const top = viewport.top + list.clientTop, bottom = top + list.clientHeight;
      if (tab.top < top) list.scrollTop += tab.top - top;
      else if (tab.bottom > bottom) list.scrollTop += tab.bottom - bottom;
    }
  };
  const makeButton = (item: Memory, unread: boolean) => {
    const button = document.createElement("button");
    button.className = "collection-item";
    button.dataset.memoryId = item.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", item.title + (unread ? "，未读" : ""));
    button.classList.toggle("unread", unread);
    if (collection.kind === "image" && item.thumbnail) {
      const thumbnail = new Image();
      thumbnail.loading = "lazy";
      thumbnail.src = item.thumbnail;
      thumbnail.alt = "";
      thumbnail.decoding = "async";
      thumbnail.width = 240;
      thumbnail.height = 160;
      button.append(thumbnail);
    }
    const title = document.createElement("span");
    title.className = "collection-item-title";
    title.textContent = item.title + (unread ? " · 未读" : "");
    button.append(title);
    if (collection.kind === "text") {
      applyStationeryTheme(button, item.id);
      const short = document.createElement("span");
      short.className = "collection-item-short";
      short.setAttribute("aria-hidden", "true");
      short.textContent = item.author || item.title;
      button.append(short);
    }
    button.addEventListener("click", () => select(item));
    return button;
  };
  if (letters) renderMailboxList(list, letters, makeButton, cleanup => modal.onCleanup(cleanup));
  else for (const item of items) list.append(makeButton(item, false));
  const visibility = () => {
    if (document.hidden) media?.pause();
  };
  document.addEventListener("visibilitychange", visibility);
  modal.onCleanup(() => {
    stop();
    document.removeEventListener("visibilitychange", visibility);
  });
  const initial = items.findIndex(item => item.id === letters?.selectedId);
  if (collection.kind === "text" && initial < 0) {
    detail.innerHTML = '<p class="mail-select-prompt">选一封来信，读读写给芙芙的话。</p>';
    list.querySelector("button")?.focus({ preventScroll: true });
  } else {
    select(items[Math.max(0, initial)]);
    if (collection.kind === "text" || collection.kind === "image") (detail as HTMLElement).focus({ preventScroll: true });
  }
}
