import { OPEN_AT, countdownParts, getDeadline, setDebugDeadline } from "./time";
import type { createCountdownView } from "./view";

const debug = import.meta.env.VITE_WARDROBE_DEBUG === "true";
const gameTitle = "芙眠眠一周年 · 晚安小屋";
const retryInterval = 30_000;

export async function startLaunch(loadGame?: () => Promise<unknown>) {
  const root = document.querySelector<HTMLElement>("#app")!;
  let deadline = getDeadline(debug);
  let view: ReturnType<typeof createCountdownView> | undefined;
  let disposeDebug: (() => void) | undefined;
  let timer: number | undefined;
  let request: AbortController | undefined;
  let stopped = false;
  let nextCheck = 0;
  let waitingFor: number | undefined;

  function stop() {
    stopped = true;
    window.clearTimeout(timer);
    request?.abort();
    window.removeEventListener("online", wake);
    window.removeEventListener("pageshow", wake);
    document.removeEventListener("visibilitychange", wake);
    disposeDebug?.();
    view?.destroy();
  }

  function showRetry(message: string) {
    const retry = document.createElement("button");
    retry.textContent = message;
    retry.onclick = () => location.reload();
    root.replaceChildren(retry);
  }

  async function enterGame() {
    stop();
    document.title = gameTitle;
    try {
      await loadGame!();
    } catch {
      showRetry("小屋未能载入，点击重试");
    }
  }

  async function checkRelease() {
    if (request || !navigator.onLine || document.hidden) return;
    nextCheck = Date.now() + retryInterval;
    const controller = new AbortController();
    request = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const options: RequestInit = { cache: "no-store", signal: controller.signal };
      const response = await fetch(import.meta.env.BASE_URL + "release.json", options);
      if (!response.ok) return;
      const info = await response.json();
      if (controller.signal.aborted || Date.now() < deadline || info?.mode !== "full" ||
          typeof info.version !== "string" || !info.version) return;
      // Cloudflare may briefly serve release.json and the navigation from
      // different versions. Verify the actual page before leaving this one.
      const previous = history.state?.fufuLaunchReload;
      const elapsed = Date.now() - previous?.at;
      if (previous?.version === info.version && elapsed >= 0 && elapsed < retryInterval) return;
      const homepage = await fetch(location.href, options);
      if (!homepage.ok) return;
      const html = new DOMParser().parseFromString(await homepage.text(), "text/html");
      const tag = html.querySelector<HTMLMetaElement>('meta[name="fufu-release"]');
      if (tag?.content !== "full" || tag.dataset.version !== info.version ||
          controller.signal.aborted || Date.now() < deadline) return;
      // If navigation still returns the old lite page it can retry later.
      const attempt = { version: info.version, at: Date.now() };
      history.replaceState({ ...history.state, fufuLaunchReload: attempt }, "");
      stop();
      location.reload();
    } catch { /* Stay on the invitation while the network or deployment is unavailable. */ }
    finally {
      clearTimeout(timeout);
      if (request === controller) request = undefined;
    }
  }

  function wake() {
    if (document.hidden) return;
    nextCheck = 0;
    tick();
  }

  function tick() {
    window.clearTimeout(timer);
    if (stopped) return;
    const now = Date.now();
    const remaining = deadline - now;
    if (remaining <= 0 && loadGame) {
      void enterGame();
      return;
    }
    if (remaining <= 0) {
      if (waitingFor !== deadline) {
        view!.setTime(countdownParts(deadline, now), deadline);
        view!.setWaiting();
        waitingFor = deadline;
      }
      if (now >= nextCheck) void checkRelease();
      timer = window.setTimeout(tick, retryInterval);
    } else {
      waitingFor = undefined;
      view!.setTime(countdownParts(deadline, now), deadline);
      timer = window.setTimeout(tick, remaining % 1000 || 1000);
    }
  }

  if (loadGame && Date.now() >= deadline) {
    await enterGame();
    return;
  }
  document.title = "芙芙的晚安小屋，即将开门";
  try {
    const { createCountdownView: createView } = await import("./view");
    view = createView(root);
  } catch {
    showRetry("邀请函未能载入，点击重试");
    return;
  }
  window.addEventListener("online", wake);
  window.addEventListener("pageshow", wake);
  document.addEventListener("visibilitychange", wake);
  tick();
  if (debug && !stopped) {
    const { mountCountdownDebug } = await import("./debug");
    if (stopped) return;
    disposeDebug = mountCountdownDebug(view.debugHost, {
      mode: "countdown",
      getDeadline: () => deadline,
      changeDeadline: value => {
        setDebugDeadline(value);
        deadline = value ?? OPEN_AT;
        request?.abort();
        request = undefined;
        nextCheck = 0;
        tick();
      },
    });
  }
}
