import { ResourceQueue, type LoadProgress, type Resource } from "./resource-queue";
import { traffic, recordTransfer } from "./network-debug";

const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const version = document.querySelector<HTMLMetaElement>('meta[name="fufu-release"]')?.dataset.version ??
  (import.meta.env.DEV ? "dev-full" : "");
const workerUrl = new URL("texture-cache.js?v=" + version, base);
let registration: Promise<unknown> | undefined;
let catalogue: Promise<ResourceQueue> | undefined;

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
  if (controlled && traffic) headers["X-Fufu-Net-Debug"] = "1";
  const start = traffic ? performance.now() : 0;
  const timeout = AbortSignal.timeout?.(180_000);
  signal.throwIfAborted();
  if (token) signal.addEventListener("abort", yieldTransfer, { once: true });
  try {
    const response = await fetch(url, {
      mode: "same-origin", integrity: digest ? "sha256-" + digest : undefined,
      priority, cache: retry ? "reload" : "default", headers,
      signal: timeout && AbortSignal.any ? AbortSignal.any([timeout, signal]) : signal,
    });
    if (response.status !== 200) throw new Error("游戏资源未能载入：" + path);
    const store = cache && !/\bno-store\b/i.test(response.headers.get("Cache-Control") ?? "")
      ? cache.put(url, response.clone()).catch(() => {}) : undefined;
    await Promise.all([response.arrayBuffer(), store]);
    if (traffic) {
      const sample = response.headers.get("X-Fufu-Transfer");
      if (sample) {
        const [bytes, duration] = sample.split(",").map(Number);
        recordTransfer(bytes, duration);
      } else {
        const entry = (performance.getEntriesByName(url) as PerformanceResourceTiming[])
          .reverse().find(timing => timing.initiatorType === "fetch" && timing.startTime >= start - 1 && !timing.workerStart);
        recordTransfer(entry ? Math.max(0, entry.transferSize - 300) : -1, entry?.duration ?? 0);
      }
    }
  } finally {
    if (token) signal.removeEventListener("abort", yieldTransfer);
  }
}

function getQueue() {
  return catalogue ??= fetch(new URL(`game-assets-${version}.json`, base), { mode: "same-origin", signal: AbortSignal.timeout?.(60_000) })
    .then(async response => {
      if (!response.ok) throw new Error("无法读取游戏资源清单");
      const files: Resource[] = await response.json();
      if (!Array.isArray(files) || !files.length) throw new Error("游戏资源清单为空");
      const metrics = traffic;
      if (!metrics) return new ResourceQueue(files, readResource);
      metrics.total = files.length;
      return new ResourceQueue(files, async (...args) => {
        metrics.active++;
        try { await readResource(...args); metrics.completed++; }
        finally { metrics.active--; }
      });
    }).catch(error => { catalogue = undefined; throw error; });
}

export async function prepareGameResources(scene?: string, report?: LoadProgress) {
  await (await getQueue()).prepare(scene, report);
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
    image.src = url;
    task = image.decode().catch(error => { decoded.delete(image); throw error; });
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
  const queue = await getQueue();
  const next = interrupted?.scene === scene ? interrupted.art : new Map<string, HTMLImageElement>();
  const waiting: (() => void)[] = [];
  let decoding = 0;
  await queue.prepare(scene, report, async ([path]) => {
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
