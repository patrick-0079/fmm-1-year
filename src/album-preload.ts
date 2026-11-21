import type { Memory } from "./content.ts";

type Preview = Pick<Memory, "src" | "thumbnail">;
type ReadImage = (url: string, priority: "high" | "low") => Promise<HTMLImageElement>;

function readImage(url: string, priority: "high" | "low"): Promise<HTMLImageElement> {
  const image = new Image();
  image.fetchPriority = priority;
  image.decoding = "async";
  return new Promise((resolve, reject) => {
    image.onerror = () => reject(new Error("相册预览未能加载"));
    image.onload = () => resolve(image);
    image.src = url;
  });
}

/** The browser/texture cache holds the catalogue; only nearby pages need decoded pixels. */
export class AlbumPreviewQueue {
  private pending = new Set<string>();
  private active = new Set<string>();
  private fetched = new Map<string, WeakRef<HTMLImageElement>>();
  private nearby = new Set<string>();
  private decoded = new Map<string, HTMLImageElement>();

  private readonly read: ReadImage;

  constructor(read: ReadImage = readImage) { this.read = read; }

  warm(photos: readonly Preview[]) {
    if (!this.nearby.size) this.prioritize(photos, 0, 2);
    for (const photo of photos) {
      for (const url of [photo.src, photo.thumbnail]) {
        if (url && !this.active.has(url) && !this.fetched.has(url)) this.pending.add(url);
      }
    }
    this.pump();
  }

  prioritize(photos: readonly Preview[], first: number, pageSize = 1) {
    const urls: string[] = [];
    // Prepare the selected page first, then the forward and backward turns.
    for (const start of [first, first + pageSize, first - pageSize]) {
      if (start < 0 || start >= photos.length) continue;
      for (const {src} of photos.slice(start, start + pageSize)) if (src) urls.push(src);
    }
    this.nearby = new Set(urls);
    for (const url of this.decoded.keys()) if (!this.nearby.has(url)) this.decoded.delete(url);
    const priority = urls.filter(url => !this.decoded.has(url) && !this.active.has(url));
    this.pending = new Set([...priority, ...this.pending]);
    this.pump();
  }

  private pump() {
    for (const url of this.pending) {
      if (this.active.size >= 2) break;
      this.pending.delete(url);
      this.active.add(url);
      void this.prepare(url);
    }
  }

  private async prepare(url: string) {
    try {
      const image = this.fetched.get(url)?.deref() ?? await this.read(url, this.nearby.has(url) ? "high" : "low");
      if (this.nearby.has(url)) {
        await image.decode?.();
        if (this.nearby.has(url)) this.decoded.set(url, image);
      }
      this.fetched.set(url, new WeakRef(image));
    } catch {
      // A later visit or an online event can retry this URL.
      this.fetched.delete(url);
    } finally {
      this.active.delete(url);
      this.pump();
    }
  }
}

export const albumPreviewQueue = new AlbumPreviewQueue();

export function scheduleAlbumPreviews(photos: readonly Preview[]) {
  const warm = () => albumPreviewQueue.warm(photos);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warm, {timeout: 1500});
  } else {
    window.setTimeout(warm, 200);
  }
  window.addEventListener("online", warm);
}
