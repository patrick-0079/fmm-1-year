import type { AchievementEntry } from "./achievements";
import { paintAchievementArt } from "./achievement-art";
import { achievementStampMarkup } from "./achievement-book";
import { playAchievementSound } from "./sound";
import "./achievement-flash.css";

export function mountAchievementNotices() {
  const flash = document.createElement("div");
  flash.className = "achievement-flash";
  flash.hidden = true;
  if (typeof flash.showPopover === "function") flash.popover = "manual";
  flash.setAttribute("role", "status");
  flash.setAttribute("aria-live", "polite");
  flash.setAttribute("aria-atomic", "true");
  document.body.append(flash);
  const queue: AchievementEntry[] = [];
  let timer: number | undefined;

  function hide() {
    if (flash.popover) flash.hidePopover();
    flash.hidden = true;
    window.clearTimeout(timer);
    timer = undefined;
  }
  function next() {
    if (timer !== undefined || document.hidden || !queue.length) return;
    const entry = queue.shift()!;
    flash.innerHTML = achievementStampMarkup(entry) + "<span><small>成就已解锁</small><strong></strong></span>";
    flash.querySelector("strong")!.textContent = entry.name;
    paintAchievementArt(flash);
    flash.hidden = false;
    if (flash.popover) flash.showPopover();
    void playAchievementSound();
    timer = window.setTimeout(() => { hide(); next(); }, 3000);
  }
  document.addEventListener("visibilitychange", next);
  return {
    show(entries: AchievementEntry[]) { queue.push(...entries); next(); },
    clear() { queue.length = 0; hide(); },
  };
}
