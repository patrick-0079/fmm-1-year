const scope = self.registration.scope;
const assets = new Map(assetFiles.map(([file, digest]) => [new URL(file, scope).href, digest]));
// Keep existing entries available across upgrades and check them against this build.
const cacheName = "fufu-game-textures-v1:" + new URL(scope).pathname;
const inFlight = new Map();
const backgroundConsumers = new Map();
const refreshFromNetwork = new Set();
let measureDownload;

async function matchesDigest(response, digest) {
  const hash = await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer());
  return btoa(String.fromCharCode(...new Uint8Array(hash))) === digest;
}

async function readAsset(url, priority, signal) {
  const digest = assets.get(url);
  let cache;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url, { ignoreVary: true });
    if (hit?.status === 200 && await matchesDigest(hit, digest)) return { response: hit };
    if (hit) {
      refreshFromNetwork.add(url);
      await cache.delete(url, { ignoreVary: true });
    }
  } catch { /* The browser can still use its HTTP cache or the network. */ }

  let response;
  const timingStart = measureDownload ? performance.now() : undefined;
  try {
    const timeout = AbortSignal.timeout?.(180_000);
    response = await fetch(url, { mode: "same-origin", integrity: "sha256-" + digest, priority,
      signal: timeout && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal,
      cache: refreshFromNetwork.has(url) ? "reload" : "default" });
    if (response.status === 200) refreshFromNetwork.delete(url);
    else refreshFromNetwork.add(url);
  } catch (error) { if (!signal.aborted) refreshFromNetwork.add(url); throw error; }
  const storable = response.status === 200 && !/\bno-store\b/i.test(response.headers.get("Cache-Control") ?? "");
  const stored = cache && storable ? cache.put(url, response.clone()).catch(() => {}) : undefined;
  return { response, stored, timingStart };
}

function requestAsset(url, priority, signal) {
  let task = inFlight.get(url);
  if (!task || task.controller.signal.aborted) {
    const controller = new AbortController();
    const loaded = readAsset(url, priority, controller.signal);
    const finished = loaded.then(({ stored }) => stored, () => {}).finally(() => {
      if (inFlight.get(url) === task) inFlight.delete(url);
    });
    task = { loaded, finished, controller, consumers: new Set() };
    inFlight.set(url, task);
  }
  const release = () => {
    task.consumers.delete(release);
    if (!task.consumers.size) task.controller.abort();
  };
  task.consumers.add(release);
  if (signal.aborted) release();
  else {
    signal.addEventListener("abort", release, { once: true });
    task.finished.then(() => { signal.removeEventListener("abort", release); task.consumers.delete(release); });
  }
  return { loaded: task.loaded, finished: task.finished, release };
}

async function pruneCache() {
  try {
    const cache = await caches.open(cacheName);
    const previous = await cache.keys();
    await Promise.all(previous.filter(key => !assets.has(key.url)).map(key => cache.delete(key, { ignoreVary: true })));
  } catch { /* Cleanup is opportunistic. */ }
}

async function audioRange(response, range) {
  const body = await response.blob();
  const size = body.size;
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
  if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Type": body.type || "audio/wav",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(Promise.all([self.clients.claim(), pruneCache()])));
self.addEventListener("message", event => {
  if (event.data?.type === "yield-preload" && event.source?.id)
    backgroundConsumers.get(event.source.id + ":" + event.data.token)?.();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !assets.has(request.url)) return;
  const header = request.headers.get("Range");
  const range = header?.match(/^bytes=(\d*)-(\d*)$/i);
  if (header !== null && (!request.url.endsWith(".wav") || request.headers.has("If-Range") ||
      !(range?.[1] || range?.[2]))) return;

  const token = request.headers.get("X-Fufu-Preload");
  const { loaded, finished, release } = requestAsset(request.url, token ? "low" : "high", request.signal);
  if (token && event.clientId) {
    const id = event.clientId + ":" + token;
    backgroundConsumers.set(id, release);
    event.waitUntil(finished.finally(() => backgroundConsumers.delete(id)));
  }
  event.waitUntil(finished);
  event.respondWith(loaded.then(asset => {
    const { response } = asset;
    if (range) return response.status === 200 ? audioRange(response.clone(), range) : fetch(request);
    if (measureDownload && request.headers.has("X-Fufu-Net-Debug") && response.status === 200)
      return measureDownload(request.url, asset);
    return response.clone();
  }, error => {
    if (range) return fetch(request);
    throw error;
  }));
});
