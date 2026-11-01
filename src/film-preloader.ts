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
  constructor(
    src: string,
    update: () => void,
    request: typeof fetch = (...args) => fetch(...args),
  ) {
    this.src = src;
    this.update = update;
    this.request = request;
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
    const response = await this.request(this.src, {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok || !response.body)
      throw new Error("Video download failed");
    this.progress.total = Number(response.headers.get("Content-Length")) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new Uint8Array(value));
        this.progress.received += value.byteLength;
        if (Date.now() - this.lastUpdate > 100) {
          this.lastUpdate = Date.now();
          this.update();
        }
      }
    } finally {
      reader.releaseLock();
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
