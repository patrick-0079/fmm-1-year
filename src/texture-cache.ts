let registration: Promise<ServiceWorkerRegistration | undefined> | undefined;

export function registerResourceCache() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  return registration ??= Promise.resolve()
    .then(() => navigator.serviceWorker.register(import.meta.env.BASE_URL + "texture-cache.js", {
      updateViaCache: "none",
    }))
    .catch(() => {
      registration = undefined;
      return undefined;
    });
}

export function scheduleResourcePreload(fallback: () => void) {
  const version = document.querySelector<HTMLMetaElement>('meta[name="fufu-release"]')?.dataset.version;
  const initial = registerResourceCache();
  if (!version || !initial) {
    fallback();
    return;
  }

  const workers = navigator.serviceWorker;
  function warm(retry = false) {
    const worker = workers.controller;
    if (worker && worker.state !== "redundant") worker.postMessage({ type: "warm-assets", version, retry });
  }
  workers.addEventListener("controllerchange", () => warm());
  window.addEventListener("online", () => {
    void registerResourceCache()?.then(() => warm(true));
  });
  void initial.then(result => {
    if (result) warm();
    else fallback();
  });
}
