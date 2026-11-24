const scope = self.registration.scope;
const assets = new Map(assetFiles.map(([file, digest]) => [new URL(file, scope).href, digest]));
// Keep existing entries available across upgrades and check them against this build.
const cacheName = "fufu-game-textures-v1:" + new URL(scope).pathname;
const inFlight = new Map();
let warmRun;

async function matchesDigest(response, digest) {
  const hash = await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer());
  return btoa(String.fromCharCode(...new Uint8Array(hash))) === digest;
}

async function readAsset(url, priority) {
  const digest = assets.get(url);
  let cache;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url, { ignoreVary: true });
    if (hit?.status === 200 && await matchesDigest(hit, digest)) return { response: hit };
    if (hit) await cache.delete(url, { ignoreVary: true });
  } catch { /* The browser can still use its HTTP cache or the network. */ }

  const options = { mode: "same-origin", integrity: "sha256-" + digest, priority };
  let response;
  try {
    // First reuse bytes fetched by the page before the worker took control.
    const hit = await fetch(url, { ...options, cache: "only-if-cached" });
    if (hit.status === 200) response = hit;
  } catch { /* A missing or invalid HTTP cache entry needs a fresh download. */ }
  response ??= await fetch(url, { ...options, cache: "reload" });
  const storable = response.status === 200 && !/\bno-store\b/i.test(response.headers.get("Cache-Control") ?? "");
  const stored = cache && storable ? cache.put(url, response.clone()).catch(() => {}) : undefined;
  return { response, stored };
}

function requestAsset(url, priority) {
  const current = inFlight.get(url);
  if (current) return current;
  const loaded = readAsset(url, priority);
  // Foreground responses can be used while the cache write is finishing.
  const finished = loaded.then(({ stored }) => stored, () => {}).finally(() => inFlight.delete(url));
  const task = { loaded, finished };
  inFlight.set(url, task);
  return task;
}

async function pruneCache() {
  try {
    const cache = await caches.open(cacheName);
    const previous = await cache.keys();
    await Promise.all(previous.filter(key => !assets.has(key.url)).map(key => cache.delete(key, { ignoreVary: true })));
  } catch { /* Cleanup is opportunistic. */ }
}

function warmAssets() {
  if (warmRun) return warmRun;
  const remaining = assets.keys();
  const consume = async () => {
    for (const url of remaining) await requestAsset(url, "low").finished;
  };
  warmRun = Promise.all([consume(), consume(), pruneCache()]).finally(() => { warmRun = undefined; });
  return warmRun;
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
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("message", event => {
  const { type, version, retry } = event.data ?? {};
  if (type !== "warm-assets" || version !== assetVersion) return;
  event.waitUntil(retry && warmRun ? warmRun.then(warmAssets) : warmAssets());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !assets.has(request.url)) return;
  const header = request.headers.get("Range");
  const range = header?.match(/^bytes=(\d*)-(\d*)$/i);
  if (header !== null && (!request.url.endsWith(".wav") || request.headers.has("If-Range") ||
      !(range?.[1] || range?.[2]))) return;

  const { loaded, finished } = requestAsset(request.url, "high");
  event.waitUntil(finished);
  event.respondWith(loaded.then(({ response }) => {
    if (range) return response.status === 200 ? audioRange(response.clone(), range) : fetch(request);
    return response.clone();
  }, error => {
    if (range) return fetch(request);
    throw error;
  }));
});
