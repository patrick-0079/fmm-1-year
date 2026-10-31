import { collections } from "./content";
import { escapeHtml, icon } from "./icons";
import { Modal } from "./modal";

export function openCollection(modal: Modal, id: string) {
  const collection = collections[id];
  if (!collection) return;
  const body = modal.open(
    collection.title,
    collection.subtitle,
    "A LITTLE MEMORY · 等一份心意",
  );
  const symbols = { text: "mail", image: "book", audio: "sound", video: "tv" };
  const nouns = { text: "留言", image: "图片", audio: "录音", video: "视频" };
  if (!collection.items.length) {
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
  const stop = () => {
    if (media) {
      media.pause();
      media.removeAttribute("src");
      media.load();
      media = null;
    }
  };
  const select = (index: number) => {
    stop();
    const item = collection.items[index];
    list.querySelectorAll("button").forEach((button, i) => {
      button.classList.toggle("selected", i === index);
      button.setAttribute("aria-pressed", String(i === index));
    });
    detail.innerHTML = `<h3>${escapeHtml(item.title)}</h3>${item.author ? `<p class="memory-author">来自 ${escapeHtml(item.author)}</p>` : ""}<div class="memory-content"></div>`;
    const content = detail.querySelector(".memory-content")!;
    if (collection.kind === "text") {
      const p = document.createElement("p");
      p.className = "letter-text";
      p.textContent = item.text || "这封信的正文还在路上。";
      content.append(p);
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
      }
      element.src = item.src;
      content.append(element);
      const error = document.createElement("div");
      error.className = "media-error";
      error.hidden = true;
      error.innerHTML =
        '<p>这份素材暂时没能打开。</p><button class="button secondary">重新加载</button>';
      element.addEventListener("error", () => {
        error.hidden = false;
      });
      error.querySelector("button")!.addEventListener("click", () => {
        error.hidden = true;
        element.src = item.src!;
        if (element instanceof HTMLMediaElement) element.load();
      });
      content.append(error);
      if (item.text) {
        const caption = document.createElement("p");
        caption.textContent = item.text;
        caption.className = "media-caption";
        content.append(caption);
      }
    }
  };
  collection.items.forEach((item, i) => {
    const button = document.createElement("button");
    button.className = "collection-item";
    button.textContent = item.title;
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
  select(0);
}
