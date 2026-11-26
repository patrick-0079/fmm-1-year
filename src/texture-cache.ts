import { ResourceQueue, type LoadProgress, type Resource } from "./resource-queue";
import { traffic, recordTransfer } from "./network-debug";
import { fetchVerifiedAsset } from "./resource-stream.js";
import { PackResources, type PackIndex } from "./pack-resources";

const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const version = document.querySelector<HTMLMetaElement>('meta[name="fufu-release"]')?.dataset.version ??
  (import.meta.env.DEV ? "dev-full" : "");
const workerUrl = new URL("texture-cache.js?v=" + version, base);
let registration: Promise<unknown> | undefined;
let catalogue: Promise<ResourceQueue> | undefined;
let packs: PackResources | undefined;

async function loadPackIndex() {
  if (!import.meta.env.PROD || !globalThis.caches || !globalThis.crypto?.subtle) return;
  try {
    const [response, cache] = await Promise.all([
      fetch(new URL(`game-packs-${version}.json`, base), { mode: "same-origin", signal: AbortSignal.timeout(8000) }),
      caches.open("fufu-game-textures-v1:" + base.pathname),
    ]);
    if (!response.ok) return;
    const index: PackIndex = await response.json();
    if (index.release === version) return { index, cache };
  } catch { /* A missing index or disabled storage uses the existing file queue. */ }
}

export function registerResourceCache() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  return registration ??= navigator.serviceWorker.register(workerUrl, { updateViaCache: "none" }).catch(() => undefined);
}

async function readResource([path, digest]: Resource, priority: "high" | "low", retry: boolean, signal: AbortSignal) {
  const url = new URL(path, base).href;
  const worker = navigator.serviceWorker?.controller;
  const controlled = worker?.scriptURL === workerUrl.href;
  let cache: Cache | undefined;
  if (digest && !controlled && globalThis.caches) {
    try {
      cache = await caches.open("fufu-game-textures-v1:" + base.pathname);
      const hit = await cache.match(url, { ignoreVary: true });
      if (hit?.status === 200) {
        const hash = await crypto.subtle.digest("SHA-256", await hit.arrayBuffer());
        if (btoa(String.fromCharCode(...new Uint8Array(hash))) === digest) { if (traffic) recordTransfer(0, 0); return; }
        retry = true;
        await cache.delete(url, { ignoreVary: true });
      }
    } catch { /* Storage is optional. */ }
  }
  const headers: Record<string, string> = {};
  const token = controlled && priority === "low" ? crypto.randomUUID() : undefined;
  const yieldTransfer = () => { if (token) worker?.postMessage({ type: "yield-preload", token }); };
  if (token) headers["X-Fufu-Preload"] = token;
  const transfer = traffic ? crypto.randomUUID?.() ?? String(Math.random()) : undefined;
  const rate = traffic?.assets;
  const onBytes = transfer && rate ? (bytes: number) => rate.add(bytes, performance.now(), 0, transfer) : undefined;
  const onMessage = (event: MessageEvent) => {
    if (event.source === worker && event.data?.type === "asset-bytes" && event.data.id === transfer) onBytes?.(event.data.bytes);
  };
  if (controlled && transfer) headers["X-Fufu-Net-Debug"] = transfer;
  const start = traffic ? performance.now() : 0;
  signal.throwIfAborted();
  if (controlled && transfer) navigator.serviceWorker.addEventListener("message", onMessage);
  if (token) signal.addEventListener("abort", yieldTransfer, { once: true });
  try {
    const options: RequestInit & { signal: AbortSignal } = {
      mode: "same-origin", priority, cache: retry ? "reload" : "default", headers, signal,
    };
    const response = controlled ? await fetch(url, options) : await fetchVerifiedAsset(url, digest, options, onBytes);
    if (response.status !== 200) throw new Error("游戏资源未能载入：" + path);
    const store = cache && !/\bno-store\b/i.test(response.headers.get("Cache-Control") ?? "")
      ? cache.put(url, response.clone()).catch(() => {}) : undefined;
    await Promise.all([response.arrayBuffer(), store]);
    if (traffic) {
      const sample = response.headers.get("X-Fufu-Transfer");
      if (sample) {
        const [bytes, duration] = sample.split(",").map(Number);
        recordTransfer(bytes, duration, transfer);
      } else {
        const entry = (performance.getEntriesByName(url) as PerformanceResourceTiming[])
          .reverse().find(timing => timing.initiatorType === "fetch" && timing.startTime >= start - 1 && !timing.workerStart);
        recordTransfer(entry ? Math.max(0, entry.transferSize - 300) : -1, entry?.duration ?? 0, transfer);
      }
    }
  } finally {
    if (controlled && transfer) navigator.serviceWorker.removeEventListener("message", onMessage);
    if (token) signal.removeEventListener("abort", yieldTransfer);
  }
}

function getQueue() {
  return catalogue ??= Promise.all([fetch(new URL(`game-assets-${version}.json`, base),
    { mode: "same-origin", signal: AbortSignal.timeout?.(60_000) }), loadPackIndex()])
    .then(async ([response, packIndex]) => {
      if (!response.ok) throw new Error("无法读取游戏资源清单");
      const files: Resource[] = await response.json();
      if (!Array.isArray(files) || !files.length) throw new Error("游戏资源清单为空");
      const metrics = traffic;
      if (packIndex) {
        try { packs = new PackResources(packIndex.index, files, base, packIndex.cache,
          metrics ? bytes => metrics.assets.add(bytes, performance.now()) : undefined); }
        catch { /* The file manifest remains authoritative when the pack index is incompatible. */ }
      }
      if (metrics) metrics.total = files.length;
      return new ResourceQueue(files, async (...args) => {
        if (metrics) metrics.active++;
        try {
          if (!await packs?.wait(args[0][0], args[3])) await readResource(...args);
          if (metrics) metrics.completed++;
        } finally { if (metrics) metrics.active--; }
      });
    }).catch(error => { catalogue = undefined; throw error; });
}

async function prepareResources(scene?: string, report?: LoadProgress, finish?: (file: Resource) => Promise<void>) {
  const queue = await getQueue();
  const selected = scene ? queue.files.filter(([, , s]) => s.includes("*") || s.includes(scene)) : queue.files;
  let loaded = 0, done = false;
  const update = () => {
    if (!report) return;
    const transfer = packs?.progress(selected);
    if (transfer?.total && !transfer.fallback) {
      report(done ? transfer.total : Math.min(transfer.received, transfer.total * .999), transfer.total);
    } else report(loaded, selected.length, true);
  };
  const unsubscribe = report && packs?.watch(update);
  try {
    await Promise.all([packs?.prepare(scene), queue.prepare(scene, report && (n => { loaded = n; update(); }), finish)]);
    done = true;
    update();
  } finally { unsubscribe?.(); }
}

export function prepareGameResources(scene?: string, report?: LoadProgress) {
  return prepareResources(scene, report);
}

const registered = new Map<string, HTMLImageElement>();
let currentArt = new Map<string, HTMLImageElement>();
let interrupted: { scene: string; art: Map<string, HTMLImageElement> } | undefined;
const decoded = new WeakMap<HTMLImageElement, Promise<void>>();
const imageKey = (url: string) => new URL(url, document.baseURI).href.replace(/\?no-inline$/, "");

export function sceneImage(url: string) {
  const key = imageKey(url);
  const image = registered.get(key) ?? currentArt.get(key) ?? new Image();
  if (url.startsWith("data:") && !image.src) image.src = url;
  registered.set(key, image);
  return image;
}

function decodeImage(image: HTMLImageElement, url: string, priority: "high" | "low" = "high") {
  let task = decoded.get(image);
  if (!task) {
    image.decoding = "async";
    image.fetchPriority = priority;
    task = (async () => {
      // An uncontrolled tab cannot resolve the original image URL through Cache Storage yet.
      const blob = packs && !url.startsWith("data:") && navigator.serviceWorker?.controller?.scriptURL !== workerUrl.href
        ? await packs.imageBlob(new URL(url, document.baseURI)).catch(() => undefined) : undefined;
      const objectUrl = blob && URL.createObjectURL(blob);
      image.src = objectUrl || url;
      try { await image.decode(); }
      finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
    })().catch(error => { decoded.delete(image); throw error; });
    decoded.set(image, task);
  }
  return task;
}

export async function loadSceneImage(url: string, priority: "high" | "low" = "high") {
  const image = sceneImage(url);
  await decodeImage(image, url, priority);
  return image;
}

export async function prepareMapArt(scene: string, report?: LoadProgress) {
  const next = interrupted?.scene === scene ? interrupted.art : new Map<string, HTMLImageElement>();
  const waiting: (() => void)[] = [];
  let decoding = 0;
  await prepareResources(scene, report, async ([path]) => {
    if (!/\.(?:webp|png|jpe?g|avif|svg)(?:\?|$)/i.test(path)) return;
    if (decoding < 4) decoding++;
    else await new Promise<void>(resume => waiting.push(resume));
    try {
      const url = new URL(path, base).href, key = imageKey(url);
      const image = registered.get(key) ?? next.get(key) ?? currentArt.get(key) ?? new Image();
      next.set(key, image);
      await decodeImage(image, url);
    } finally {
      const resume = waiting.shift();
      if (resume) resume();
      else decoding--;
    }
  }).catch(error => { interrupted = { scene, art: next }; throw error; });
  interrupted = undefined;
  currentArt = next;
}
