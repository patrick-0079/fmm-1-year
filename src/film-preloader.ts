export interface FilmDownload {
  state: "queued" | "checking" | "loading" | "ready" | "error";
  received: number;
  total: number;
  source?: "local" | "unverified";
}

export const FILM_CACHE = "fufu-complete-films-v1";
type FilmCache = Pick<Cache, "match" | "put" | "delete">;
const openFilmCache = async (): Promise<FilmCache | null> =>
  globalThis.caches ? caches.open(FILM_CACHE) : null;
const noStore = (headers: Headers) => /\bno-store\b/i.test(headers.get("Cache-Control") || "");

function sameFilm(stored: Headers, remote: Headers) {
  const before = stored.get("ETag"), after = remote.get("ETag");
  if (before && after) return before === after;
  // R2 may expose Last-Modified but hide ETag from browser JavaScript.
  const date = remote.get("Last-Modified"), length = remote.get("Content-Length");
  return !!date && Number.isFinite(Date.parse(date)) && date === stored.get("Last-Modified") &&
    !!length && Number(length) > 0 && length === stored.get("X-Fufu-Source-Length");
}

/** Download the complete file independently of the browser's media buffer policy. */
export class FilmPreloader {
  onBytes?: (bytes: number) => void;
  progress: FilmDownload = { state: "queued", received: 0, total: 0 };
  private task: Promise<string> | null = null;
  private src: string;
  private update: () => void;
  private request: typeof fetch;
  private lastUpdate = -Infinity;
  private idleTimeoutMs: number;
  private openCache: () => Promise<FilmCache | null>;
  constructor(
    src: string,
    update: () => void,
    request: typeof fetch = (...args) => fetch(...args),
    idleTimeoutMs = 60_000,
    openCache = openFilmCache,
  ) {
    this.src = src;
    this.update = update;
    this.request = request;
    this.idleTimeoutMs = idleTimeoutMs;
    this.openCache = openCache;
  }
  start(replaceUnplayable = false): Promise<string> {
    if (this.task && (!replaceUnplayable || this.progress.state !== "ready")) return this.task;
    this.progress = { state: "loading", received: 0, total: 0 };
    this.update();
    // A second tab can reuse the finished copy instead of downloading another 67 MB.
    this.task = this.loadOnce(replaceUnplayable).catch((error) => {
      this.progress.state = "error";
      this.task = null;
      this.update();
      throw error;
    });
    return this.task;
  }
  private async loadOnce(replaceUnplayable: boolean): Promise<string> {
    let acquired = false;
    try {
      if (globalThis.navigator?.locks)
        return await navigator.locks.request("fufu-film:" + this.src, () => {
          acquired = true;
          return this.load(replaceUnplayable);
        });
    } catch (error) {
      if (acquired) throw error;
      // A browser that blocks Web Locks can still cache complete responses.
    }
    return this.load(replaceUnplayable);
  }
  private async load(replaceUnplayable: boolean) {
    let cache: FilmCache | null = null, stored: Response | undefined;
    try {
      cache = await this.openCache();
      if (!replaceUnplayable) stored = await cache?.match(this.src);
    } catch { /* Storage can be disabled independently of network playback. */ }
    if (stored?.status === 200) {
      this.progress.state = "checking";
      this.update();
      // No custom conditional headers: cross-origin HEAD remains a simple request.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), Math.min(this.idleTimeoutMs, 5000));
      let source: FilmDownload["source"];
      try {
        const head = await this.request(this.src, {
          method: "HEAD", mode: "cors", credentials: "omit", cache: "no-store", priority: "low", signal: abort.signal,
        });
        if (head.status === 200 && noStore(head.headers)) {
          try { await cache?.delete(this.src); } catch { /* Storage may have become unavailable. */ }
          cache = null;
        } else if (head.status === 200 && sameFilm(stored.headers, head.headers)) source = "local";
        else if (head.status >= 500 && head.status !== 501) source = "unverified";
      } catch { source = "unverified"; }
      finally { clearTimeout(timer); }
      if (source) {
        try {
          const blob = await stored.blob();
          if (blob.size > 0 && blob.size === Number(stored.headers.get("Content-Length"))) {
            this.progress = {state: "ready", received: blob.size, total: blob.size, source};
            this.update();
            return URL.createObjectURL(blob);
          }
        } catch { /* A damaged or evicted copy is replaced by a full GET. */ }
      }
    }
    this.progress.state = "loading";
    this.update();
    return this.download(cache);
  }
  private async download(cache: FilmCache | null) {
    const abort = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let rejectTimeout: (error: Error) => void;
    const timeout = new Promise<never>((_, reject) => {
      rejectTimeout = reject;
    });
    const keepAlive = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const error = new Error("Video download stalled; please retry");
        rejectTimeout(error);
        abort.abort(error);
        void reader?.cancel().catch(() => {});
      }, this.idleTimeoutMs);
    };
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    keepAlive();
    try {
      const response = await Promise.race([
        this.request(this.src, {
          mode: "cors",
          credentials: "omit",
          priority: "low",
          cache: "no-store",
          signal: abort.signal,
        }),
        timeout,
      ]);
      if (response.status !== 200 || response.headers.has("Content-Range") || !response.body ||
        /^text\/html\b/i.test(response.headers.get("Content-Type") || ""))
        throw new Error("Video download failed: expected a complete response");
      // Encoded Content-Length measures transferred bytes, not decoded stream bytes.
      const encoding = response.headers.get("Content-Encoding");
      this.progress.total =
        !encoding || encoding === "identity"
          ? Number(response.headers.get("Content-Length")) || 0
          : 0;
      reader = response.body.getReader();
      keepAlive();
      while (true) {
        const { done, value } = await Promise.race([reader.read(), timeout]);
        if (done) break;
        if (!value.byteLength) continue;
        keepAlive();
        chunks.push(new Uint8Array(value));
        this.progress.received += value.byteLength;
        this.onBytes?.(value.byteLength);
        if (performance.now() - this.lastUpdate > 100) {
          this.lastUpdate = performance.now();
          this.update();
        }
      }
      if (
        !this.progress.received ||
        (this.progress.total && this.progress.received !== this.progress.total)
      )
        throw new Error("Incomplete video download");
      const blob = new Blob(chunks, {
        type: response.headers.get("Content-Type") || "video/mp4",
      });
      clearTimeout(timer!);
      if (cache && noStore(response.headers)) {
        try { await cache.delete(this.src); } catch { /* No new copy is written. */ }
      } else if (cache) {
        const headers = new Headers({"Content-Type": blob.type, "Content-Length": String(blob.size)});
        for (const name of ["ETag", "Last-Modified"]) {
          const value = response.headers.get(name);
          if (value) headers.set(name, value);
        }
        const length = response.headers.get("Content-Length");
        if (length) headers.set("X-Fufu-Source-Length", length);
        try {
          await cache.put(this.src, new Response(blob, {headers}));
        } catch { /* A quota limit must not prevent playing the downloaded film. */ }
      }
      const url = URL.createObjectURL(blob);
      this.progress.state = "ready";
      this.update();
      return url;
    } finally {
      clearTimeout(timer!);
      reader?.releaseLock();
    }
  }
}

function filmSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KiB";
  return (bytes / 1048576).toFixed(1) + " MiB";
}
export function filmDownloadAmount(download: FilmDownload) {
  return download.total
    ? `${Math.min(100, Math.floor(download.received / download.total * 100))}% · ${filmSize(download.received)} / ${filmSize(download.total)}`
    : `已接收 ${filmSize(download.received)}`;
}
export function downloadLabel(download: FilmDownload) {
  if (download.state === "queued") return "先准备游戏资源，影片稍后下载";
  if (download.state === "checking") return "正在核对本机影片版本…";
  if (download.state === "ready" && download.source)
    return (download.source === "local" ? "影片未变，已从本机载入" : "暂时无法检查更新，使用上次缓存") + " · " + filmSize(download.received);
  if (download.state === "ready")
    return `完整视频已预载 · ${filmSize(download.received)}`;
  if (download.state === "error") return "视频预载失败，可以重新加载";
  return `正在完整预载${download.total ? " " : " · "}${filmDownloadAmount(download)}`;
}
