import { collections, type Memory } from "./content";
import { escapeHtml, icon } from "./icons";
import { duckMusic } from "./sound";
import { FilmPreloader, downloadLabel } from "./film-preloader";
import { attachPhotoOriginalViewer, renderPhotoBook } from "./game-photo-album";
import { albumPreviewQueue } from "./album-preload";
import "./album.css";
export interface CollectionSurface {
  readonly inGame?: boolean;
  open(title: string, subtitle: string, label: string): HTMLElement;
  close(): void;
  onCleanup(cleanup: () => void): void;
}

export function openCollection(modal: CollectionSurface, id: string, onPhotoOpen?: () => void) {
  const collection = collections[id];
  if (!collection || collection.kind === "text") return;
  const { kind, items } = collection;
  const body = modal.open(
    collection.title,
    collection.subtitle,
    collection.kind === "image" && items.length ? "FUFU'S LITTLE DAYS · 芙芙的日常" : "A LITTLE MEMORY · 珍藏一份心意",
  );
  const symbols = { image: "book", audio: "sound", video: "tv" };
  const nouns = { image: "图片", audio: "录音", video: "视频" };
  if (!items.length) {
    body.innerHTML = `<div class="empty-memory"><div class="empty-icon">${icon(symbols[kind])}<span>${icon("heart")}</span></div><span class="empty-tag">COMING SOON</span><h3>这里，留给未来的一份心意</h3><p>${nouns[kind]}正在慢慢集合。<br>先去吹蜡烛、拆礼物，或者到花园放一朵烟花吧。</p><button class="button secondary">继续小冒险 ${icon("arrow")}</button></div>`;
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
  body.querySelector(".collection-layout")!.classList.toggle("album-layout", kind === "image");
  const list = body.querySelector(".collection-list")!,
    detail = body.querySelector<HTMLElement>(".memory-detail")!;
  if (kind === "image") {
    body.removeAttribute("tabindex");
    detail.setAttribute("tabindex", "0");
    detail.setAttribute("aria-label", "相片与说明，可滚动阅读");
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
    });
    detail.innerHTML = `<h3>${escapeHtml(item.title)}</h3>${item.author ? `<p class="memory-author">来自 ${escapeHtml(item.author)}</p>` : ""}<div class="memory-content"></div>`;
    const content = detail.querySelector(".memory-content")!;
    if (!item.src) {
      content.innerHTML =
        '<p class="media-error">这份素材暂未添加，稍后再来看看吧。</p>';
    } else {
      let element: HTMLImageElement | HTMLMediaElement;
      if (kind === "image") {
        if (id === "album") albumPreviewQueue.prioritize(items, items.indexOf(item));
        element = new Image();
        element.alt = item.alt || item.title;
        element.className = "memory-image";
        element.decoding = "async";
      } else {
        const player = document.createElement(kind);
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
    // Keep the selected thumbnail in view without scrolling the whole page.
    const active = list.querySelector<HTMLElement>(".selected");
    if (active && list.clientHeight > 0) {
      const viewport = list.getBoundingClientRect(), tab = active.getBoundingClientRect();
      const top = viewport.top + list.clientTop, bottom = top + list.clientHeight;
      if (tab.top < top) list.scrollTop += tab.top - top;
      else if (tab.bottom > bottom) list.scrollTop += tab.bottom - bottom;
    }
  };
  const makeButton = (item: Memory) => {
    const button = document.createElement("button");
    button.className = "collection-item";
    button.dataset.memoryId = item.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", item.title);
    if (kind === "image" && item.thumbnail) {
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
    title.textContent = item.title;
    button.append(title);
    button.addEventListener("click", () => select(item));
    return button;
  };
  for (const item of items) list.append(makeButton(item));
  const visibility = () => {
    if (document.hidden) media?.pause();
  };
  document.addEventListener("visibilitychange", visibility);
  modal.onCleanup(() => {
    stop();
    document.removeEventListener("visibilitychange", visibility);
  });
  select(items[0]);
  if (kind === "image") detail.focus({ preventScroll: true });
}
