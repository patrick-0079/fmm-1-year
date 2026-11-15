// Only registered by bass-audio-fixture.html, under /tests/. Never shipped or
// registered by the game. Exercise actual media errors rather than rejecting play().
let fault = "none";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("message", event => {
  fault = event.data.fault;
  event.ports[0]?.postMessage("ready");
});
self.addEventListener("fetch", event => {
  if (event.request.destination !== "audio" || !new URL(event.request.url).pathname.endsWith(".wav")) return;
  if (fault === "network") event.respondWith(Response.error());
  else if (fault === "decode") event.respondWith(new Response("invalid wave data", {headers:{"Content-Type":"audio/wav","Cache-Control":"no-store"}}));
});
