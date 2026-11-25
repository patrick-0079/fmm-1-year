import { icon } from "./icons";
import type { BaseSceneId } from "./maps";
import { revealGame } from "./game-viewport";

// Small signposts remain legible on the narrow landscape rail.
const destinations: Record<BaseSceneId, [string, string]> = {
  room: ["晚安小屋", `<path fill="#f7d6ac" d="M4 11h16v10H4z"/><path fill="#c98186" d="m2 11 10-9 10 9-2 2-8-6-8 6z"/><path fill="#ffd476" d="M7 13h4v4H7z"/><path fill="#ae7967" d="M14 14h3v7h-3z"/>`],
  garden: ["周年花园", `<g fill="none"><path d="M8 13q-2 5 4 9m5-10q2 5-5 10"/></g><ellipse fill="#ecadbd" cx="8" cy="8" rx="5" ry="6"/><ellipse fill="#f3ce80" cx="17" cy="7" rx="4" ry="5"/><path fill="#fff4db" stroke="none" d="m5 6 2-2 1 1-2 2zm10-1 2-1v2h-2z"/>`],
  challenge: ["勇气花园", `<path fill="#91b28b" d="M4 16q6-1 8 5 1-7 8-8-1 7-8 9-5-1-8-6z"/><path fill="#e6ae7d" d="M12 2q4 0 3 5 5-2 6 2 0 3-5 4 2 4-1 5l-3-4-3 4q-4-1-1-5-5 0-5-4 1-4 6-2-1-5 3-5z"/><circle cx="12" cy="10" r="2.5" fill="#f7d67b"/>`],
  town: ["周年小镇", `<path fill="#f3dfb5" d="M4 10h16v11H4z"/><path fill="#83aba8" d="M5 4h14l3 7-2 2-3-2-3 2-3-2-3 2-3-2-3 1z"/><path fill="#f2cfaa" d="m9 4-1 6m6-6 1 6"/><path fill="#8aa2a5" d="M7 15h4v4H7zm7 0h3v6h-3z"/>`],
  meadow: ["花海", `<path fill="#e8cb88" d="M11 2a7 7 0 1 0 9 9c-7 2-11-2-9-9z"/><path fill="#a2b48a" d="m3 21 2-5 4 3 3-5 3 5 4-4 2 6z"/><path fill="#edbbce" d="m4 11 2 2-2 2-2-2zm13-8 1.5 2L17 7l-2-2z"/>`],
  ruins: ["回声遗迹", `<path fill="#a3acba" d="m3 3 18 1-1 4-16-1zM5 8h4v11H5zm10 0h4v11h-4z"/><path fill="#d6c7e2" d="m12 10 2 3-2 3-2-3z"/><path fill="#c4b7ad" d="M3 19h8v2H3zm10 0h8v2h-8z"/><path fill="none" d="m8 4 3 1-1 2m6 4 2 2-2 2"/>`],
};

const mapButtons = Object.entries(destinations).map(([scene, [name, art]]) => `
  <button type="button" data-scene="${scene}"${scene === "meadow" ? " hidden" : ""}>
    <svg class="map-stamp" viewBox="0 0 24 24" fill="none" stroke="#695660" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art}</svg>
    <span>${name}</span>
  </button>`).join("");

export const gameControlMenuMarkup = `
  <div class="game-control-menu">
    <div class="control-tabs" role="tablist" aria-label="游戏导航" data-page-ui>
      <button type="button" role="tab" id="maps-tab" aria-controls="maps-panel" aria-selected="true">${icon("foldedMap")} 地图</button>
      <button type="button" role="tab" id="records-tab" aria-controls="records-panel" aria-selected="false" tabindex="-1">${icon("journal")} 徽章与存档</button>
    </div>
    <div class="control-pages">
      <div id="maps-panel" role="tabpanel" aria-labelledby="maps-tab">
        <nav class="scene-nav" aria-label="地图导航">${mapButtons}</nav>
      </div>
      <div id="records-panel" class="control-records" role="tabpanel" aria-labelledby="records-tab" data-page-ui inert>
        <button type="button" class="book-trigger" data-book-toggle aria-haspopup="dialog" aria-controls="anniversary-badges" aria-expanded="false">${icon("journal")} 周年徽章册</button>
        <button type="button" class="save-now" aria-describedby="journey-save-status" disabled>${icon("save")} 保存进度</button>
        <small id="journey-save-status" class="save-status"></small>
      </div>
    </div>
  </div>`;

export function mountGameControlMenu(menu: HTMLElement) {
  const tabs = [...menu.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  function select(active: HTMLButtonElement) {
    for (const tab of tabs) {
      const selected = tab === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")!)!.inert = !selected;
    }
    if (document.querySelector(".intro-screen.dismissed")) revealGame(document.querySelector<HTMLCanvasElement>("#world")!);
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let next: HTMLButtonElement;
      switch (event.key) {
        case "ArrowRight": next = tabs[(index + 1) % tabs.length]; break;
        case "ArrowLeft": next = tabs[(index + tabs.length - 1) % tabs.length]; break;
        case "Home": next = tabs[0]; break;
        case "End": next = tabs[tabs.length - 1]; break;
        default: return;
      }
      event.preventDefault();
      event.stopPropagation();
      select(next);
      next.focus({ preventScroll: true });
    });
  }
}
