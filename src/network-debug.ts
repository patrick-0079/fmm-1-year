import { DownloadRate, rateLabel } from "./download-rate";
import { debugIsOpen, rememberDebugOpen } from "./launch/debug-open";

export const traffic = import.meta.env.VITE_WARDROBE_DEBUG === "true" ? {
  assets: new DownloadRate(), film: new DownloadRate(), filmStatus: "等待游戏资源",
  active: 0, cached: 0, completed: 0, total: 0, unknown: 0,
} : undefined;

export function recordTransfer(bytes: number, duration: number, source?: string) {
  if (!traffic) return;
  if (source && bytes >= 0) traffic.assets.forget(source);
  if (bytes === 0) traffic.cached++;
  else if (bytes > 0) traffic.assets.add(bytes, performance.now(), duration);
  else traffic.unknown++;
}

function monitor(panel: HTMLElement) {
  const info = document.createElement("section");
  info.className = "debug-network";
  info.innerHTML = `<h4>网络下载</h4><dl aria-live="off">
    <div><dt>游戏资源</dt><dd data-speed="assets"></dd></div>
    <div><dt>周年视频</dt><dd data-speed="film"></dd></div></dl>
    <p class="network-state"></p><p>近 5 秒平均，按收到的数据块更新。网络请求结束后核对实际传输量，本机缓存单独计数。</p>`;
  panel.querySelector("header")!.after(info);
  const assets = info.querySelector<HTMLElement>('[data-speed="assets"]')!;
  const film = info.querySelector<HTMLElement>('[data-speed="film"]')!;
  const status = info.querySelector<HTMLElement>(".network-state")!;
  let timer: number | undefined;
  const paint = () => {
    if (!traffic) return;
    const now = performance.now();
    assets.textContent = rateLabel(traffic.assets.perSecond(now));
    film.textContent = rateLabel(traffic.film.perSecond(now));
    status.textContent = `全站队列 ${traffic.completed}/${traffic.total} · 在途 ${traffic.active} · 缓存 ${traffic.cached} 项 · 影片：${traffic.filmStatus}` +
      (traffic.unknown ? ` · ${traffic.unknown} 项缺少网络计时` : "");
  };
  const update = () => {
    window.clearInterval(timer);
    if (!panel.hidden && !document.hidden) { paint(); timer = window.setInterval(paint, 500); }
  };
  const observer = new MutationObserver(update);
  observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("visibilitychange", update);
  update();
  return () => {
    observer.disconnect(); window.clearInterval(timer);
    document.removeEventListener("visibilitychange", update);
  };
}

let removeEarly: (() => boolean) | undefined;

export function mountLoadingMonitor() {
  if (!traffic) return;
  performance.setResourceTimingBufferSize?.(1500);
  const dock = document.createElement("div");
  dock.className = "debug-dock";
  dock.innerHTML = `<button type="button" class="debug-trigger" aria-expanded="false" aria-controls="loading-debug">⚙ 调试</button>
    <aside class="debug-panel" id="loading-debug" aria-label="加载调试面板" hidden><header><h3>加载调试</h3><button type="button" class="debug-close">关闭 ×</button></header></aside>`;
  const panel = dock.querySelector("aside")!, trigger = dock.querySelector("button")!, close = panel.querySelector("button")!;
  const toggle = () => {
    panel.hidden = !panel.hidden;
    rememberDebugOpen(!panel.hidden);
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
    (panel.hidden ? trigger : close).focus({ preventScroll: true });
  };
  trigger.onclick = close.onclick = toggle;
  dock.onkeydown = event => { if (!panel.hidden && event.key === "Escape") { event.preventDefault(); toggle(); } };
  document.body.append(dock);
  if (debugIsOpen()) toggle();
  const stop = monitor(panel);
  removeEarly = () => { stop(); dock.remove(); return !panel.hidden; };
}

export function attachDownloadMonitor(panel: HTMLElement) {
  const wasOpen = removeEarly?.() ?? false;
  removeEarly = undefined;
  monitor(panel);
  return wasOpen;
}
