export interface FilmDownload {
  state: "loading" | "ready" | "error";
  received: number;
  total: number;
}

/** Download the complete file independently of the browser's media buffer policy. */
export class FilmPreloader {
  progress: FilmDownload = { state: "loading", received: 0, total: 0 };
  private task: Promise<string> | null = null;
  private src: string;
  private update: () => void;
  private request: typeof fetch;
  private lastUpdate = 0;
  private idleTimeoutMs: number;
  constructor(
    src: string,
    update: () => void,
    request: typeof fetch = (...args) => fetch(...args),
    idleTimeoutMs = 60_000,
  ) {
    this.src = src;
    this.update = update;
    this.request = request;
    this.idleTimeoutMs = idleTimeoutMs;
  }
  start(): Promise<string> {
    if (this.task) return this.task;
    this.progress = { state: "loading", received: 0, total: 0 };
    this.update();
    this.task = this.download().catch((error) => {
      this.progress.state = "error";
      this.task = null;
      this.update();
      throw error;
    });
    return this.task;
  }
  private async download() {
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
          signal: abort.signal,
        }),
        timeout,
      ]);
      if (!response.ok || response.status === 206 || !response.body)
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
        if (Date.now() - this.lastUpdate > 100) {
          this.lastUpdate = Date.now();
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

export function downloadLabel(download: FilmDownload) {
  const mb = (bytes: number) => (bytes / 1048576).toFixed(1) + " MB";
  if (download.state === "ready")
    return `完整视频已预载 · ${mb(download.received)}`;
  if (download.state === "error") return "视频预载失败，可以重新加载";
  return download.total
    ? `正在完整预载 ${Math.min(100, Math.floor((download.received / download.total) * 100))}% · ${mb(download.received)} / ${mb(download.total)}`
    : `正在完整预载 · 已接收 ${mb(download.received)}`;
}
