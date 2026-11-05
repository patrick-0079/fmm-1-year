import { collections, type Memory } from "./content";
import { escapeHtml, icon } from "./icons";
import { duckMusic } from "./sound";
import { FilmPreloader, downloadLabel } from "./film-preloader";
export interface CollectionSurface {
  open(title: string, subtitle: string, label: string): HTMLElement;
  close(): void;
  onCleanup(cleanup: () => void): void;
}

interface LetterList {
  items: Memory[];
  selectedId?: string;
  unreadId?: string;
  onRead: (id: string) => void;
}
export function openCollection(modal: CollectionSurface, id: string, letters?: LetterList) {
  const collection = collections[id];
  if (!collection) return;
  const items = letters?.items ?? collection.items;
  const body = modal.open(
    collection.title,
    collection.subtitle,
    "A LITTLE MEMORY · 等一份心意",
  );
  const symbols = { text: "mail", image: "book", audio: "sound", video: "tv" };
  const nouns = { text: "留言", image: "图片", audio: "录音", video: "视频" };
  if (!items.length) {
    body.innerHTML = `<div class="empty-memory"><div class="empty-icon">${icon(symbols[collection.kind])}<span>${icon("heart")}</span></div><span class="empty-tag">COMING SOON</span><h3>这里，留给未来的一份心意</h3><p>${nouns[collection.kind]}正在慢慢集合。<br>先去吹蜡烛、拆礼物，或者到花园放一朵烟花吧。</p><button class="button secondary">继续小冒险 ${icon("arrow")}</button></div>`;
    body
      .querySelector("button")!
      .addEventListener("click", () => modal.close());
    return;
  }
  body.innerHTML = `<div class="collection-layout"><nav class="collection-list" aria-label="${escapeHtml(collection.title)}列表"></nav><section class="memory-detail" aria-live="polite"></section></div>`;
  const list = body.querySelector(".collection-list")!,
    detail = body.querySelector(".memory-detail")!;
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
  const select = (index: number) => {
    stop();
    const item = items[index];
    list.querySelectorAll("button").forEach((button, i) => {
      button.classList.toggle("selected", i === index);
      button.setAttribute("aria-pressed", String(i === index));
      if (i === index) button.textContent = item.title;
    });
    detail.innerHTML = `<h3>${escapeHtml(item.title)}</h3>${item.author ? `<p class="memory-author">来自 ${escapeHtml(item.author)}</p>` : ""}<div class="memory-content"></div>`;
    const content = detail.querySelector(".memory-content")!;
    if (collection.kind === "text") {
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
        element = new Image();
        element.alt = item.alt || item.title;
        element.className = "memory-image";
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
      content.append(element);
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
  };
  items.forEach((item, i) => {
    const button = document.createElement("button");
    button.className = "collection-item";
    button.dataset.memoryId = item.id;
    button.textContent = item.title + (letters?.unreadId === item.id ? " · 未读" : "");
    button.addEventListener("click", () => select(i));
    list.append(button);
  });
  const visibility = () => {
    if (document.hidden) media?.pause();
  };
  document.addEventListener("visibilitychange", visibility);
  modal.onCleanup(() => {
    stop();
    document.removeEventListener("visibilitychange", visibility);
  });
  select(Math.max(0, items.findIndex(item => item.id === letters?.selectedId)));
}
