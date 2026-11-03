// Vite embeds the exact, content-hashed texture paths in textureFiles above.
const scope = self.registration.scope;
const textures = new Set(textureFiles.map(file => new URL(file, scope).href));
const cacheName = "fufu-game-textures-v1:" + new URL(scope).pathname;

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
      if (hit) return hit;
    } catch { /* Browsers with restricted storage can still load every texture. */ }
    const response = await fetch(request);
    if (cache && response.status === 200 && response.headers.get("Content-Type")?.startsWith("image/")) {
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  })());
});
