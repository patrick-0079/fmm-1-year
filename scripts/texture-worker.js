// Verify bytes against this build, including entries created by an older worker.
const scope = self.registration.scope;
const textures = new Map(textureFiles.map(([file, digest]) => [new URL(file, scope).href, digest]));
const cacheName = "fufu-game-textures-v1:" + new URL(scope).pathname;
const verified = new Set();
async function matchesDigest(response, digest) {
  const hash = await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer());
  return btoa(String.fromCharCode(...new Uint8Array(hash))) === digest;
}

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheName);
      const previous = await cache.keys();
      await Promise.all(previous.filter(key => !textures.has(key.url)).map(key => cache.delete(key)));
    } finally {
      await self.clients.claim();
    }
  })().catch(() => {}));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !textures.has(request.url) || request.headers.has("Range")) return;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(cacheName);
      const hit = await cache.match(request);
      if (hit && (verified.has(request.url) || await matchesDigest(hit, textures.get(request.url)))) {
        verified.add(request.url);
        return hit;
      }
      if (hit) await cache.delete(request);
      verified.delete(request.url);
    } catch { /* Browsers with restricted storage can still load every texture. */ }
    const digest = textures.get(request.url);
    const response = await fetch(request, { mode: "same-origin", integrity: "sha256-" + digest, cache: "reload" });
    if (cache && response.status === 200 && response.headers.get("Content-Type")?.startsWith("image/")) {
      event.waitUntil(cache.put(request, response.clone()).then(() => verified.add(request.url)).catch(() => {}));
    }
    return response;
  })());
});
