/** Let the first image requests use the worker too; unavailable storage never blocks entry. */
export async function prepareTextureCache() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    const workers = navigator.serviceWorker;
    const registration = workers.register(import.meta.env.BASE_URL + "texture-cache.js");
    if (workers.controller) { void registration.catch(() => {}); return; }
    await new Promise<void>(resolve => {
      const done = () => {
        clearTimeout(timer);
        workers.removeEventListener("controllerchange", done);
        resolve();
      };
      const timer = setTimeout(done, 1000);
      workers.addEventListener("controllerchange", done);
      void registration.then(() => { if (workers.controller) done(); }, done);
    });
  } catch { /* Native HTTP caching remains available. */ }
}
