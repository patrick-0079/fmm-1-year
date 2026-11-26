export type Resource = readonly [path: string, digest: string, scenes: readonly string[]];
export type LoadProgress = (loaded: number, total: number, fallback?: boolean) => void;
type Priority = "high" | "low";
type Read = (file: Resource, priority: Priority, retry: boolean, signal: AbortSignal) => Promise<void>;
type Task = { file: Resource; promise: Promise<void>; run: () => void; priority: Priority; controller?: AbortController };

export class ResourceQueue {
  private ready = new Set<Resource>();
  private failed = new Set<Resource>();
  private tasks = new Map<Resource, Task>();
  private pending = new Set<Task>();
  private running = new Set<Task>();
  private foreground = 0;

  readonly files: readonly Resource[];
  private readonly read: Read;

  constructor(files: readonly Resource[], read: Read) { this.files = files; this.read = read; }

  async prepare(scene?: string, report?: LoadProgress, finish?: (file: Resource) => Promise<void>) {
    const files = scene ? this.files.filter(file => file[2].includes("*") || file[2].includes(scene)) : this.files;
    const missing = files.filter(file => !this.ready.has(file));
    let loaded = finish ? 0 : files.length - missing.length;
    report?.(loaded, files.length);
    if (scene) {
      this.foreground++;
      const required = new Set(files);
      for (const task of this.running) {
        if (required.has(task.file)) task.priority = "high";
        else if (missing.length && task.priority === "low") task.controller?.abort();
      }
    }
    try {
      const results = await Promise.allSettled((finish ? files : missing).map(async file => {
        if (!this.ready.has(file)) await this.acquire(file, scene ? "high" : "low");
        if (finish) await finish(file);
        report?.(++loaded, files.length);
      }));
      const failure = results.find(result => result.status === "rejected");
      if (failure?.status === "rejected" && (finish || files.some(file => !this.ready.has(file)))) throw failure.reason;
    } finally {
      if (scene) this.foreground--;
      this.pump();
    }
  }

  private acquire(file: Resource, priority: Priority) {
    const existing = this.tasks.get(file);
    if (existing) {
      if (priority === "high") { existing.priority = priority; this.pump(); }
      return existing.promise;
    }
    let run!: () => void;
    const promise = new Promise<void>((resolve, reject) => {
      run = () => {
        const controller = new AbortController();
        task.controller = controller;
        void this.read(file, task.priority, this.failed.has(file), controller.signal).then(() => {
          this.ready.add(file);
          this.failed.delete(file);
          this.tasks.delete(file);
          resolve();
        }, error => {
          if (controller.signal.aborted) this.pending.add(task);
          else { this.tasks.delete(file); this.failed.add(file); reject(error); }
        }).finally(() => {
          this.running.delete(task);
          this.pump();
        });
      };
    });
    const task: Task = { file, promise, run, priority };
    this.tasks.set(file, task);
    this.pending.add(task);
    this.pump();
    return promise;
  }

  private pump() {
    for (const task of this.pending) {
      if (this.running.size >= 4) return;
      if (this.running.has(task)) continue;
      if (task.priority === "low" && (this.foreground || this.running.size >= 2)) continue;
      this.pending.delete(task);
      this.running.add(task);
      task.run();
    }
  }
}
