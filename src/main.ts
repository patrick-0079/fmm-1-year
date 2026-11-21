import "./style.css";
import "./world-details.css";
import "./town-style.css";
import "./cinema.css";
import "./readability.css";
import "./festival-v11.css";
import "./ruins.css";
import "./exploration.css";
import "./bass-stage.css";
import "./debug-panel.css";
import "./wardrobe.css";
import "./ruin-journal.css";
import "./launch/cursors.css";
import "./fufu-cursors.css";
import "./page-journal.css";
import { helpMarkup } from "./help";
import { ARCADES, TOWN_NPCS, TOWN_FRAMES } from "./town-data";
import { ITEMS, type ItemId } from "./items";
import { drawItem, rewardsUrl, whenWardrobeReady } from "./item-art";
import { albumCoverPhoto, albumStampPhoto } from "./album-catalog";
import cinemaCover from "./assets/arcade-postcard-v14.webp";
import townCover from "./assets/anniversary-town-v13.webp";
import ruinsCover from "./assets/echo-ruins.webp";
import meadowCover from "./assets/night-meadow-v16.webp";
import residentsUrl from "./assets/town-npcs.webp";
import yeshenhuaUrl from "./assets/yeshenhua.webp";
import { drawYeshenhuaGuide } from "./yeshenhua-art";
import { drawTownGuest } from "./town-guest-art";
import { prepareProp, sceneArt } from "./scene-art";
import { anniversary, collections } from "./content";
import { EVENT_IDS } from "./core";
import { escapeHtml, icon } from "./icons";
import { prepareTextureCache } from "./texture-cache";
import roomUrl from "./assets/room-interactive.webp";
import spriteUrl from "./assets/nemu-sprites.webp";

// This module first runs when the invitation opens. Keep the waiting page
// independent of the two large images needed for the first playable frame.
for (const href of [roomUrl, spriteUrl]) {
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.href = href;
  preload.fetchPriority = "high";
  document.head.append(preload);
}

const tasks = [
  {
    id: "courage",
    title: "带着勇气出发",
    subtitle: "带着勇气，摘一朵花",
    icon: "heart",
    scene: "challenge",
  },
  {
    id: "cake",
    title: "分一口甜甜",
    subtitle: "吹蜡烛，再尝一口蛋糕",
    icon: "cake",
    scene: "room",
  },
  {
    id: "gifts",
    title: "拆一份心意",
    subtitle: "解开缎带，收下心意",
    icon: "gift",
    scene: "room",
  },
  {
    id: "balloons",
    title: "放飞小心愿",
    subtitle: "让气球装满快乐",
    icon: "balloon",
    scene: "garden",
  },
  {
    id: "fireworks",
    title: "点亮这片夜空",
    subtitle: "送芙芙三朵烟花",
    icon: "star",
    scene: "garden",
  },
];
function gameTickets(scene: "town" | "ruins") {
  return Object.entries(ARCADES).filter(([, game]) => game.scene === scene).map(([id, game]) => `
    <button class="page-game-ticket" data-arcade="${id}">
      <canvas data-page-reward="${game.reward}" width="80" height="80" aria-hidden="true"></canvas>
      <span><strong>${game.title}</strong><small>纪念奖励 · ${ITEMS[game.reward].name}</small></span>
      <span class="ticket-arrow" aria-hidden="true">↗</span>
    </button>`).join("");
}

const coverImage = albumCoverPhoto?.thumbnail && albumCoverPhoto.src
  ? `<img src="${escapeHtml(albumCoverPhoto.thumbnail)}" srcset="${escapeHtml(albumCoverPhoto.thumbnail)} 240w, ${escapeHtml(albumCoverPhoto.src)} 640w" sizes="(max-width: 699px) 104px, (max-width: 1099px) 30vw, 410px" alt="" loading="lazy"/><span class="photo-tape" aria-hidden="true"></span><span class="photo-caption" aria-hidden="true">${escapeHtml(albumCoverPhoto.title)} ♡</span>`
  : "";
const stampImage = albumStampPhoto?.thumbnail
  ? `<image href="${escapeHtml(albumStampPhoto.thumbnail)}" x="233" y="45" width="30" height="34" preserveAspectRatio="xMidYMid slice"/>`
  : "";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="page-shell page-journal">
    <header class="site-header" data-page-ui>
      <a class="brand" href="#" aria-label="芙眠眠一周年首页"><span class="brand-mark">${icon("heart")}</span><span>芙芙的晚安小世界<small>一周年 · 把喜欢藏进每一天</small></span></a>
      <div class="header-right"><a class="bili-link" href="${anniversary.bilibili}" target="_blank" rel="noopener noreferrer">${icon("tv")} 去见芙芙 <span>↗</span></a></div>
    </header>
    <main>
      <section class="page-intro">
        <div><p class="eyebrow">写给芙眠眠的第一年</p><h1>把一整年的晚安，<span>变成一场小冒险。</span></h1><p class="intro-copy">慢慢走，快乐藏在每个小角落。今晚，也一起留下新的回忆。</p></div>
        <div class="date-stamp"><span>和芙芙一起</span><strong>第一年的晚安</strong><small>${anniversary.start}<br>— ${anniversary.end}</small><i>${icon("heart")}</i></div>
      </section>
      <div class="adventure-layout">
        <section class="game-window" aria-label="芙芙的像素小世界">
          <div class="window-bar"><div class="window-dots"><i></i><i></i><i></i></div><span>fufu’s little world / 周年特别篇</span><div class="window-tools"><button class="music-toggle icon-button" aria-label="关闭背景音乐" title="背景音乐">♫</button><button class="icon-button sound-toggle" aria-label="游戏声音" title="静音游戏声音" aria-pressed="true">${icon("sound")}</button><button class="icon-button help-button" aria-label="查看操作说明" title="操作说明">?</button></div></div>
          <div class="game-stage-frame"><div class="game-stage"><div class="scene-wrap">
            <canvas id="world" tabindex="0" aria-label="像素探索场景。使用 WASD 或方向键移动，E、空格或鼠标右键互动；左键点击地面行走、物件或提示签互动。Tab 切换选项，Enter 确认。">浏览器需要支持 Canvas 才能游玩。</canvas>
            <div class="scene-top"><span class="location-pill">${icon("moon")} <span id="location-name">ROOM 01 · 晚安小屋</span></span><span class="time-pill" role="timer" aria-live="off">☀ 08:00 · 白昼</span></div>
            <section class="cinema-hud" aria-label="花园小电视放映控制" hidden></section><div class="activity-hud" hidden><div class="activity-heading"><span class="activity-status" role="status" aria-live="polite"></span><button class="activity-close" aria-label="结束当前互动，回到地图">收起 ×</button></div><div class="activity-actions"></div></div><div class="rest-tools" hidden><span></span><button class="camp-letter map-action" type="button" aria-label="读派大星的来信" hidden>读来信</button><button class="stand-up map-action">起身 <kbd>E</kbd></button></div><button class="bed-note-pin map-tool" hidden>♡ 床边便签</button><article class="bed-note" aria-label="小叶子的床边便签" hidden></article>
            <div class="ruin-stamp-flash" role="status" aria-live="polite" aria-atomic="true" hidden></div>
            <div class="intro-screen"><div class="intro-stars">✧ <span>✦</span> ✧</div><span class="intro-pill">芙眠眠 · 直播一周年纪念</span><h2>今晚的快乐，<br>等你来发现。</h2><p>一间温暖小屋，两座缤纷花园，<br>还有东北山洞深处的回声遗迹。<br>和藏在街角的，一点点喜欢。</p><button class="button primary enter-button" disabled>正在点亮小世界…</button><small>点击开始会播放轻柔音乐 · 可随时关闭 ♡</small></div>
            <section class="game-letter-reader" aria-label="在游戏中阅读晚安信箱" hidden></section><div class="scene-transition" aria-hidden="true"></div>
            <button class="bag-toggle" type="button" aria-label="打开纪念背包，快捷键 B" aria-controls="inventory-panel" aria-expanded="false" aria-keyshortcuts="B" title="背包（B）"><span class="bag-trigger-art" aria-hidden="true"></span><kbd aria-hidden="true">B</kbd></button>
            <section id="inventory-panel" class="inventory-panel" aria-label="芙芙的背包" hidden></section>
          </div>
          <section class="arcade-hud" hidden aria-label="小镇与遗迹小游戏"></section></div></div>
          <nav class="scene-nav" aria-label="地图导航"><button data-scene="room">晚安小屋</button><button data-scene="garden">周年花园</button><button data-scene="challenge">勇气花园</button><button data-scene="town">周年小镇</button><button data-scene="meadow" hidden>✿ 花海</button><button data-scene="ruins">回声遗迹</button><div class="volume-tools"><button class="volume-down" aria-label="降低游戏音量">−</button><span class="volume-value">45%</span><button class="volume-up" aria-label="提高游戏音量">＋</button></div></nav>
          <div class="garden-pocket"><span>${icon("gift")}<span class="bag-count">苹果 0 · 花朵 0 · 星屑 0</span></span><span class="day-hint">十分钟一昼夜 · 找长椅休息，等一场黄昏和星夜</span></div><details class="flower-book" hidden><summary>✿ 七色花谱 <span class="prism-count">0 / 7</span></summary><p class="prism-hint"></p><ol class="prism-list"></ol></details><section class="map-reader" aria-label="地图物件阅读区" hidden></section><section class="inline-help" aria-label="完整游玩说明" hidden></section><div class="game-bottom"><div class="desktop-instructions"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>E</kbd> / 右键 互动</span><i></i><span>左键走动 / 点物件 · <kbd>B</kbd> 背包 · <kbd>H</kbd> 花环</span></div><span class="exploration-count">${icon("star")} <span id="explored">0</span>/${EVENT_IDS.length} 个角落</span></div>
          <p class="journey-legend">${icon("star")} 遇到小挫折，回小屋的床休息一下 <span>·</span> 勇气花园里藏着小挫折，小屋与周年花园安心玩</p>
          <div class="touch-controls"><div class="dpad" aria-label="移动方向键"><button data-direction="0,-1" class="dpad-up" aria-label="向上移动">↑</button><button data-direction="-1,0" class="dpad-left" aria-label="向左移动">←</button><span>${icon("heart")}</span><button data-direction="1,0" class="dpad-right" aria-label="向右移动">→</button><button data-direction="0,1" class="dpad-down" aria-label="向下移动">↓</button></div><div class="touch-hint">走近发光的小物件<br><span>也可轻触物件或提示签</span></div><button class="touch-interact">${icon("star")}<span>互动</span></button></div>
        </section>
        <aside class="journal" aria-label="庆典手账" data-page-ui>
          <div class="journal-heading"><span class="eyebrow">给今晚留一点甜</span><h2>今晚的小心愿 ${icon("heart")}</h2><p class="wish-count">已收集 <strong id="completed">0 / 5</strong> 份快乐</p><p>做一点小事，收集一点快乐。</p></div>
          <div class="task-list">${tasks.map((task, i) => `<button class="task" data-task="${task.id}"><span class="task-icon task-color-${i}">${icon(task.icon)}</span><span class="task-label"><strong>${task.title}</strong><small>${task.subtitle}</small></span><span class="task-check" aria-hidden="true"></span></button>`).join("")}</div>
          <div class="journal-progress"><div class="progress-track"><span></span></div><p id="progress-note">第一份快乐，会藏在哪里呢？</p><div class="local-save"><small class="save-status">开始冒险后自动保存</small><button class="save-now map-action" disabled>保存进度</button></div></div>
        </aside>
      </div>
      <section class="page-memory-section" aria-labelledby="page-memory-title" data-page-ui>
        <div class="page-section-heading"><div><span class="eyebrow">把喜欢，妥帖收藏</span><h2 id="page-memory-title">留一格，给回忆</h2></div><p>一些写下的话，一些平常的日子。</p></div>
        <div class="page-memory-cards">
          <button class="page-memory-card memory-letter" data-memory="letters" aria-controls="page-memory-reader">
            <span class="memory-cover"><svg class="letter-envelope" viewBox="0 0 300 180" aria-hidden="true"><path d="M22 39h260v118H22z" fill="#b8a288" opacity=".15"/><rect x="17" y="30" width="266" height="122" rx="5" fill="#efdcc2" stroke="#cdb393"/><path d="M18 31h264L155 119a10 10 0 0 1-10 0Z" fill="#fff3dd" stroke="#d8c0a2"/><path d="m18 151 1-76 119 61q12 7 24 0l120-61v76Z" fill="#f8e8ce" stroke="#d6bda0"/><path d="m23 145 104-48m150 48-104-48" fill="none" stroke="#e5cfb3"/><rect x="229" y="41" width="38" height="42" fill="#fffcf0" stroke="#cbb69d" stroke-dasharray="2 2"/>${stampImage}<path d="M34 54h62m-62 7h54m-54 7h59" stroke="#d3b6a9" stroke-width="1.2"/><circle cx="150" cy="116" r="16" fill="#c590a1" stroke="#e4b9c4" stroke-width="3"/><g fill="#fff0da"><circle cx="150" cy="110" r="4"/><circle cx="156" cy="114" r="4"/><circle cx="154" cy="121" r="4"/><circle cx="146" cy="121" r="4"/><circle cx="144" cy="114" r="4"/></g><circle cx="150" cy="116" r="3" fill="#d8b576"/></svg><span class="memory-postmark" aria-hidden="true">${icon("mail")} 晚安邮局</span></span>
            <span class="memory-card-copy"><span class="memory-card-title">晚安信箱</span><span class="memory-description">把想说的话，折成一封小小的信。</span><small></small><span class="memory-card-action">阅读来信 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card memory-album" data-memory="album" aria-controls="page-memory-reader">
            <span class="memory-cover">${coverImage}</span>
            <span class="memory-card-copy"><span class="memory-card-title">回忆相册</span><span class="memory-description">从草莓吐司的早晨，到轻轻说晚安。</span><small>${collections.album.items.length} 张日常回忆</small><span class="memory-card-action">翻开相册 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card cinema-shortcut memory-cinema">
            <span class="memory-cover"><img src="${cinemaCover}" alt="" loading="lazy"/><span class="cinema-play" aria-hidden="true">▶</span><span class="memory-film-label" aria-hidden="true">第一年的晚安</span></span>
            <span class="memory-card-copy"><span class="memory-card-title">周年放映</span><span class="memory-description">坐下来，一起重温这一年的小瞬间。</span><small>视频异步准备，可以先逛逛</small><span class="memory-card-action">去花园看放映 ${icon("arrow")}</span></span>
          </button>
        </div>
        <section class="page-memory-reader" id="page-memory-reader" hidden aria-label="回忆阅读区"></section>
      </section>
      <section class="page-exploration" aria-labelledby="page-explore-title" data-page-ui>
        <div class="page-section-heading"><div><span class="eyebrow">下一站，也有小小的惊喜</span><h2 id="page-explore-title">沿着晚安，继续探索</h2></div><p>选一条喜欢的路，慢慢走就好。</p></div>
        <div class="page-postcards">
          <article class="page-postcard postcard-town">
            <div class="postcard-cover"><img src="${townCover}" alt="灯光与鲜花环绕的周年小镇街道" loading="lazy"/><span class="page-postcard-stamp" aria-hidden="true">${icon("heart")} 周年小镇</span></div>
            <div class="postcard-copy"><div><h3>周年小镇</h3><p>沿着街灯，认识一些新朋友。</p></div><button class="page-travel" data-explore-scene="town">前往小镇 ${icon("arrow")}</button></div>
            <details class="page-games"><summary><span>${icon("gift")} 小镇游园券 <small>4 个小游戏</small></span><span class="details-action">展开</span></summary><div class="page-game-tickets">${gameTickets("town")}</div></details>
          </article>
          <article class="page-postcard postcard-ruins">
            <div class="postcard-cover"><img src="${ruinsCover}" alt="月光下长满苔纹的回声遗迹" loading="lazy"/><span class="page-postcard-stamp" aria-hidden="true">${icon("moon")} 回声遗迹</span></div>
            <div class="postcard-copy"><div><h3>回声遗迹</h3><p>循着回声，寻找藏在石廊里的秘密。</p></div><button class="page-travel" data-explore-scene="ruins">前往遗迹 ${icon("arrow")}</button></div>
            <details class="page-games"><summary><span>${icon("star")} 遗迹游园券 <small>3 个小游戏</small></span><span class="details-action">展开</span></summary><div class="page-game-tickets">${gameTickets("ruins")}</div></details>
          </article>
        </div>
        <details class="town-guide page-residents"><summary><span>认识小镇居民 <strong id="town-npc-count">0 / ${TOWN_NPCS.length}</strong><small>镇民为游戏角色</small></span><span class="details-action">展开导览</span></summary><div>${TOWN_NPCS.map((npc) => `<button data-town-npc="${npc.id}"><span class="resident-portrait"><canvas data-page-npc="${npc.sprite}" data-page-resident="${npc.id}" width="80" height="88" aria-hidden="true"></canvas></span><span><strong>${npc.name}</strong><small>${npc.role}</small></span><span class="resident-arrow" aria-hidden="true">↗</span></button>`).join("")}</div></details>
      </section>
      <section class="credits page-meadow-note" aria-labelledby="credits-title"><img src="${meadowCover}" alt="" loading="lazy"/><div class="credits-heading"><span class="eyebrow">还有一些喜欢，藏在星星里</span><h2 id="credits-title">草地上的署名</h2><p>集齐七色花，去夜里的花海走走。<br>拾起一颗落星，就能遇见一位制作人。</p><span class="meadow-note-sign" aria-hidden="true">✧ 愿每一份晚安，都被温柔珍藏</span></div></section>
    </main>
    <footer data-page-ui><span>${icon("heart")} 献给芙眠眠的第一年</span><p>粉丝制作的一周年纪念礼物 · 愿下一个晚安，依然有你。</p><button class="text-button reset-button">重新探索</button><span class="reset-confirmation" hidden>清除本机进度？<button class="reset-confirm map-action">重新开始</button><button class="reset-cancel map-action">保留进度</button></span></footer>
  </div><div class="toast" role="status" aria-live="polite"></div><div class="confetti-layer" aria-hidden="true"></div>`;

document.querySelector(".inline-help")!.innerHTML = helpMarkup;
// These illustrations are only needed when their paper guide is unfolded.
// The same sprite crops and equipment renderer are used by the game itself.
let guideArtRequested = false;
const paintGuideArt = () => {
  if (guideArtRequested) return;
  guideArtRequested = true;
  const residents = new Image(), yeshenhua = new Image(), rewards = new Image();
  const paintResidents = () => {
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas[data-page-npc]")) {
      const npc = TOWN_NPCS.find(n => n.id === canvas.dataset.pageResident);
      if (!npc) continue;
      const c = canvas.getContext("2d")!;
      if (npc.appearance === "yeshenhua") {
        drawYeshenhuaGuide(c, yeshenhua);
        continue;
      }
      if (npc.appearance === "guest") {
        c.clearRect(0, 0, 80, 88);
        c.imageSmoothingEnabled = false;
        drawTownGuest(c, sceneArt.townGuests, npc.sprite, 40, 84, 80);
        continue;
      }
      if (!residents.complete || !residents.naturalWidth) continue;
      const frame = TOWN_FRAMES[npc.sprite];
      const cropHeight = Math.min(frame.h, frame.w * 1.1);
      const scale = Math.min(72 / frame.w, 80 / cropHeight);
      c.clearRect(0, 0, 80, 88);
      c.imageSmoothingEnabled = true;
      c.drawImage(residents, frame.x, frame.y, frame.w, cropHeight, (80-frame.w*scale)/2, 4, frame.w*scale, cropHeight*scale);
    }
  };
  residents.onload = paintResidents;
  yeshenhua.onload = paintResidents;
  void prepareProp("townGuests").then(paintResidents, () => {});
  const paintRewards = () => {
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas[data-page-reward]")) {
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, 80, 80);
      drawItem(c, canvas.dataset.pageReward as ItemId, 5, 5, 70, 70, undefined, rewards);
    }
  };
  rewards.onload = paintRewards;
  whenWardrobeReady(paintRewards);
  residents.src = residentsUrl; yeshenhua.src = yeshenhuaUrl; rewards.src = rewardsUrl;
};
document.querySelectorAll<HTMLDetailsElement>(".page-games, .page-residents").forEach(details => {
  details.addEventListener("toggle", () => {
    const action = details.querySelector(".details-action");
    if (action) action.textContent = details.open ? "收起" : details.classList.contains("page-residents") ? "展开导览" : "展开";
    if (details.open) paintGuideArt();
  });
});
// The paper cards render before the deferred game module. Do not present live
// buttons without handlers while that module (or the cache worker) is loading.
const startupButtons = [...document.querySelectorAll<HTMLButtonElement>("#app button:not([disabled])")];
for (const button of startupButtons) button.disabled = true;
document.querySelector("#app")!.setAttribute("aria-busy", "true");
void prepareTextureCache().then(() => import("./application")).then(({mountGame}) => {
  for (const button of startupButtons) button.disabled = false;
  mountGame(tasks);
  document.querySelector("#app")!.removeAttribute("aria-busy");
})
  .catch(() => {
    for (const button of startupButtons) button.disabled = true;
    document.querySelector("#app")!.removeAttribute("aria-busy");
    const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
    enter.disabled = false;
    enter.textContent = "游戏未能载入，点击重试";
    enter.onclick = () => location.reload();
  });
