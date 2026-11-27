import { anniversary } from "./anniversary";
import cottage from "./launch-cottage.webp";
import fufu from "./launch-fufu.webp";
import foxLetter from "./launch-fox-letter.webp";
import player from "./launch-player.webp";
import "./invitation.css";
import "./cursors.css";

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const units = [
  ["days", "天"],
  ["hours", "时"],
  ["minutes", "分"],
  ["seconds", "秒"],
] as const;

const beijingDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const beijingTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function createCountdownView(root: HTMLElement) {
  const page = document.createElement("main");
  page.className = "launch-invitation";
  page.setAttribute("aria-labelledby", "launch-title");
  page.innerHTML = `
    <div class="launch-desk" aria-hidden="true">
      <div class="launch-charms"><i class="launch-chain"><b></b></i><i class="launch-chain launch-chain-moon"><b></b></i></div>
      <div class="launch-charms launch-charms-right"><i class="launch-chain"><b></b></i><i class="launch-chain launch-chain-moon"><b></b></i></div>
      <div class="launch-mail-route"><i></i></div><div class="launch-mail-route launch-mail-route-right"><i></i></div>
    </div>
    <article class="launch-card">
      <header class="launch-letterhead">
        <span class="launch-envelope" aria-hidden="true"></span>
        <span>芙眠眠 · 直播一周年邀请函</span>
      </header>
      <div class="launch-photo-mount"><div class="launch-postcard">
        <img class="launch-landscape" src="${cottage}" width="1280" height="533"
          alt="月光下，晚安小屋亮起了暖灯。">
        <img class="launch-hostess" src="${fufu}" width="540" height="675"
          alt="戴着白色荷叶边发箍的 Q 版芙芙在小屋前双手捧着一封草莓印章邀请函。" fetchpriority="high">
        <i class="launch-glimmer" aria-hidden="true"></i>
        <div class="launch-fireflies" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="launch-bow" aria-hidden="true"><i></i><b></b></span>
      </div></div>
      <div class="launch-message">
        <h1 id="launch-title"><span>芙芙的晚安小屋，</span><span>即将开门</span></h1>
        <div class="launch-clock" role="timer" aria-label="距离正式开放" aria-live="off">
          ${units.map(([key, unit]) => `<div class="launch-unit"><b data-unit="${key}">00</b><span>${unit}</span></div>`).join("")}
        </div>
        <p class="launch-waiting" role="status" hidden>小屋正在准备开放</p>
        <p class="launch-date"><span>北京时间</span><time></time></p>
        <a class="launch-visit" href="${anniversary.bilibili}" target="_blank" rel="noopener noreferrer"
          aria-label="去见芙芙（在新标签页打开哔哩哔哩）">去见芙芙 <span aria-hidden="true">↗</span></a>
      </div>
      <footer class="launch-keepsakes" aria-label="邀请人">
        <img class="launch-keepsake launch-fox-letter" src="${foxLetter}" alt="">
        <span class="launch-signature"><i aria-hidden="true">♡</i> 芙眠眠</span>
        <img class="launch-keepsake launch-player" src="${player}" alt="">
      </footer>
      <button type="button" class="launch-restore-pet" title="重新显示桌宠" data-pet-restore>小小芙</button>
    </article>
    <div class="launch-debug-host"></div>`;

  root.replaceChildren(page);
  document.documentElement.classList.add("launch-present");
  const fields = units.map(([key]) => ({ key, value: page.querySelector<HTMLElement>(`[data-unit="${key}"]`)! }));
  const clock = page.querySelector<HTMLElement>(".launch-clock")!;
  const waiting = page.querySelector<HTMLElement>(".launch-waiting")!;
  const time = page.querySelector<HTMLTimeElement>("time")!;
  let displayedDeadline: number | undefined;

  return {
    debugHost: page.querySelector<HTMLElement>(".launch-debug-host")!,
    setTime(parts: CountdownParts, deadline: number) {
      for (const { key, value } of fields) {
        const text = String(parts[key]).padStart(2, "0");
        if (value.textContent !== text) {
          value.textContent = text;
          value.style.setProperty("--digit-count", String(text.length));
        }
      }
      if (displayedDeadline !== deadline) {
        time.dateTime = new Date(deadline).toISOString();
        time.textContent = `${beijingDate.format(deadline)}  ${beijingTime.format(deadline)}`;
        displayedDeadline = deadline;
      }
      waiting.hidden = true;
      clock.hidden = false;
    },
    setWaiting() {
      clock.hidden = true;
      waiting.hidden = false;
    },
    destroy() {
      page.remove();
      document.documentElement.classList.remove("launch-present");
    },
  };
}
