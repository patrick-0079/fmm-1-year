import { ResourceQueue, type Resource } from "./resource-queue.ts";

type Pack = { group: string; file: string; hash: string; size: number; entries: [string, number, number][] };
export type PackIndex = { format: number; base: string; release: string; packs: Pack[] };
type Member = {
  path: string; digest: string; offset: number; size: number; received: number;
  ready?: boolean; result: Promise<boolean>; settle: (ready: boolean) => void;
};

function member(resource: Resource, offset: number, size: number): Member {
  let settle!: (ready: boolean) => void;
  const result = new Promise<boolean>(resolve => { settle = resolve; });
  return { path: resource[0], digest: resource[1], offset, size, received: 0, result, settle };
}

async function valid(bytes: ArrayBuffer, digest: string) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return btoa(String.fromCharCode(...new Uint8Array(hash))) === digest;
}

const mime: Record<string, string> = { webp: "image/webp", png: "image/png", svg: "image/svg+xml",
  jpg: "image/jpeg", jpeg: "image/jpeg", avif: "image/avif", wav: "audio/wav" };

export class PackResources {
  private readonly members = new Map<string, Member>();
  private readonly queue: ResourceQueue;
  private readonly changes = new Set<() => void>();
  private readonly base: URL;
  private readonly cache: Cache;
  private readonly onBytes?: (count: number) => void;
  constructor(index: PackIndex, files: readonly Resource[], base: URL, cache: Cache, onBytes?: (count: number) => void) {
    this.base = base;
    this.cache = cache;
    this.onBytes = onBytes;
    const resources = new Map(files.map(file => [file[0], file]));
    const jobs = new Map<string, { url: URL; size: number; members: Member[] }>();
    const groups: Resource[] = [];
    if (index.format !== 1 || !index.packs.length) throw Error("无法识别资源包索引");
    for (const pack of index.packs) {
      if (!/^[a-z0-9-]+\.pack$/.test(pack.file) || !/^[a-f0-9]{64}$/.test(pack.hash) ||
          !pack.file.endsWith("-" + pack.hash + ".pack") || jobs.has(pack.file)) throw Error("资源包版本无效");
      let end = 0;
      const members = pack.entries.map(([path, offset, size]) => {
        const resource = resources.get(path);
        if (!resource?.[1] || this.members.has(path) || end !== offset || !Number.isSafeInteger(size) || size <= 0)
          throw Error("资源包索引与资源清单不一致");
        end += size;
        const item = member(resource, offset, size);
        this.members.set(path, item);
        return item;
      });
      if (!members.length || end !== pack.size) throw Error("资源包长度无效");
      groups.push([pack.file, pack.hash, resources.get(members[0].path)![2]]);
      jobs.set(pack.file, { url: new URL(pack.file, index.base), size: end, members });
    }
    this.queue = new ResourceQueue(groups, async ([name], priority, _retry, signal) => {
      const job = jobs.get(name)!;
      try {
        for (const item of job.members) {
          signal.throwIfAborted();
          if (item.ready === true) continue;
          const url = new URL(item.path, this.base).href;
          const hit = await this.cache.match(url, { ignoreVary: true });
          if (hit?.status === 200) {
            if (await valid(await hit.arrayBuffer(), item.digest)) this.finish(item, true);
            else await this.cache.delete(url, { ignoreVary: true });
          }
        }
        // Each request spans consecutive missing files. Verified gaps cost zero network bytes.
        for (let i = 0; i < job.members.length;) {
          if (job.members[i].ready === true) { i++; continue; }
          const start = i++;
          while (i < job.members.length && job.members[i].ready !== true) i++;
          await this.download(job.url, job.size, job.members.slice(start, i), priority, signal);
        }
      } catch (error) {
        if (signal.aborted) throw error;
        if (this.onBytes) console.info("[pack] 站内补载", name, error instanceof Error ? error.message : error);
        for (const item of job.members) if (item.ready === undefined) this.finish(item, false);
      }
    }, { active: 2, background: 1 });
  }

  prepare(scene?: string) { return this.queue.prepare(scene); }
  watch(fn: () => void) { this.changes.add(fn); return () => this.changes.delete(fn); }
  private changed() { for (const fn of this.changes) fn(); }
  private finish(item: Member, ready: boolean) {
    item.ready = ready;
    item.received = ready ? item.size : 0;
    item.settle(ready);
    this.changed();
  }

  progress(files: readonly Resource[]) {
    let received = 0, total = 0, fallback = false;
    for (const [path] of files) {
      const item = this.members.get(path);
      if (!item) continue;
      received += item.received;
      total += item.size;
      if (item.ready === false) fallback = true;
    }
    return { received, total, fallback };
  }

  async wait(path: string, signal: AbortSignal) {
    const item = this.members.get(path);
    if (!item) return false;
    signal.throwIfAborted();
    if (item.ready !== undefined) return item.ready;
    return new Promise<boolean>((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      void item.result.then(ready => { signal.removeEventListener("abort", abort); resolve(ready); });
    });
  }

  async imageBlob(url: URL) {
    const path = decodeURI(url.pathname.slice(this.base.pathname.length));
    if (url.origin !== this.base.origin || !this.members.get(path)?.ready) return;
    return (await this.cache.match(url.href, { ignoreVary: true }))?.blob();
  }

  private async download(url: URL, total: number, batch: Member[], priority: "low" | "high", signal: AbortSignal) {
    const start = batch[0].offset, last = batch[batch.length - 1], end = last.offset + last.size;
    const range = start !== 0 || end !== total;
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal.throwIfAborted();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = () => controller.abort(new Error("资源包传输超时"));
    let timer = setTimeout(timeout, 8000);
    let current = 0, filled = 0, buffer = new Uint8Array(batch[0].size);
    try {
      const response = await fetch(url, { mode: "cors", credentials: "omit", priority, signal: controller.signal,
        headers: range ? { Range: "bytes=" + start + "-" + (end - 1) } : {} });
      const length = response.headers.get("Content-Length");
      if (response.status !== (range ? 206 : 200) || !response.body ||
          (length !== null && Number(length) !== end - start) ||
          (range && response.headers.get("Content-Range") !== "bytes " + start + "-" + (end - 1) + "/" + total))
        throw Error("对象存储未返回所需版本的字节区间");
      const reader = response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value.byteLength) continue;
          clearTimeout(timer);
          timer = setTimeout(timeout, 15000);
          this.onBytes?.(value.byteLength);
          for (let pos = 0; pos < value.length;) {
            const item = batch[current];
            if (!item) throw Error("资源包多出未登记的内容");
            const length = Math.min(item.size - filled, value.length - pos);
            buffer.set(value.subarray(pos, pos + length), filled);
            pos += length;
            filled += length;
            item.received = filled;
            if (filled === item.size) {
              if (!await valid(buffer.buffer, item.digest)) throw Error("资源包成员校验失败");
              controller.signal.throwIfAborted();
              const type = mime[item.path.split(".").pop()!];
              await this.cache.put(new URL(item.path, this.base).href, new Response(buffer, { headers: {
                "Content-Type": type, "Content-Length": String(item.size), "Cache-Control": "public, max-age=31536000, immutable",
              } }));
              this.finish(item, true);
              filled = 0;
              if (++current < batch.length) buffer = new Uint8Array(batch[current].size);
            }
          }
          this.changed();
        }
      } finally { reader.releaseLock(); }
      if (current !== batch.length) throw Error("资源包未传完");
    } finally {
      clearTimeout(timer);
      controller.abort();
      signal.removeEventListener("abort", abort);
      if (filled && batch[current]?.ready === undefined) { batch[current].received = 0; this.changed(); }
    }
  }
}
