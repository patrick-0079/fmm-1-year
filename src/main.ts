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
import "./scene-transition.css";
import { achievementBookMarkup } from "./achievement-book";
import { helpMarkup } from "./help";
import { albumCoverPhoto, albumStampPhoto } from "./album-catalog";
import { scheduleAlbumPreviews } from "./album-preload";
import cinemaCover from "./assets/arcade-postcard-v14.webp";
import meadowCover from "./assets/night-meadow-v16.webp";
import { anniversary, collections } from "./content";
import { EVENT_IDS } from "./core";
import { escapeHtml, icon } from "./icons";
import { scheduleResourcePreload } from "./texture-cache";
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
          <div class="window-bar">
            <div class="window-dots"><i></i><i></i><i></i></div>
            <span><span class="window-title-prefix" lang="en">fufu’s little world / </span>周年特别篇</span>
            <div class="window-tools">
              <button class="music-toggle icon-button" aria-label="关闭背景音乐" title="背景音乐">♫</button>
              <button type="button" class="effects-toggle icon-button" aria-label="互动音效" aria-pressed="true" title="关闭互动音效">音效</button>
              <div class="volume-tools" role="group" aria-label="游戏音量">
                <button class="icon-button sound-toggle" aria-label="游戏声音" title="静音游戏声音" aria-pressed="true">${icon("sound")}</button>
                <button class="icon-button volume-down" aria-label="降低游戏音量">−</button>
                <output class="volume-value" aria-label="当前游戏音量">45%</output>
                <button class="icon-button volume-up" aria-label="提高游戏音量">＋</button>
              </div>
              <button type="button" class="icon-button help-button" aria-label="查看操作说明" title="操作说明" aria-haspopup="dialog" aria-expanded="false" aria-controls="game-help">?</button>
            </div>
          </div>
          <div class="game-stage-frame"><div class="game-stage"><div class="scene-wrap">
            <canvas id="world" tabindex="0" aria-label="像素探索场景。使用 WASD 或方向键移动，E、空格或鼠标右键互动；左键点击地面行走、物件或提示签互动。Tab 切换选项，Enter 确认。">浏览器需要支持 Canvas 才能游玩。</canvas>
            <div class="scene-top"><span class="location-pill">${icon("moon")} <span id="location-name">ROOM 01 · 晚安小屋</span></span><span class="time-pill" role="timer" aria-live="off">☀ 08:00 · 白昼</span></div>
            <section class="cinema-hud" aria-label="花园小电视放映控制" hidden></section><div class="activity-hud" hidden><div class="activity-heading"><span class="activity-status" role="status" aria-live="polite"></span><button class="activity-close" aria-label="结束当前互动，回到地图">收起 ×</button></div><div class="activity-actions"></div></div><div class="rest-tools" hidden><span></span><button class="camp-letter map-action" type="button" aria-label="读派大星的来信" hidden>读来信</button><button class="stand-up map-action">起身 <kbd>E</kbd></button></div><button class="bed-note-pin map-tool" hidden>♡ 床边便签</button><article class="bed-note" aria-label="小叶子的床边便签" hidden></article>
            <div class="ruin-stamp-flash" role="status" aria-live="polite" aria-atomic="true" hidden></div>
            <div class="intro-screen"><div class="intro-stars">✧ <span>✦</span> ✧</div><span class="intro-pill">芙眠眠 · 直播一周年纪念</span><h2>今晚的快乐，<br>等你来发现。</h2><p>一间温暖小屋，两座缤纷花园，<br>还有东北山洞深处的回声遗迹。<br>和藏在街角的，一点点喜欢。</p>
              <button class="button primary enter-button" disabled>正在点亮小世界…<span class="scene-loading-track" aria-hidden="true"><span class="scene-loading-fill"></span></span></button><small>点击开始会播放轻柔音乐 · 可随时关闭 ♡</small>
            </div>
            <section class="game-letter-reader" aria-label="在游戏中阅读晚安信箱" hidden></section>
            <div class="scene-transition">
              <div class="scene-transition-card" aria-hidden="true">
                <div class="scene-transition-art"><span class="scene-transition-star"><span class="scene-transition-face"></span></span></div>
                <span class="scene-transition-label">正在前往</span>
                <strong class="scene-transition-destination"></strong>
                <span class="scene-loading-track"><span class="scene-loading-fill"></span></span>
              </div>
              <span class="scene-transition-status" role="status"></span>
            </div>
            <button class="bag-toggle" type="button" aria-label="打开纪念背包，快捷键 B" aria-controls="inventory-panel" aria-expanded="false" aria-keyshortcuts="B" title="背包（B）"><span class="bag-trigger-art" aria-hidden="true"></span><kbd aria-hidden="true">B</kbd></button>
            <section id="inventory-panel" class="inventory-panel" aria-label="芙芙的背包" hidden></section>
          </div>
          <section class="arcade-hud" hidden aria-label="小镇与遗迹小游戏"></section></div></div>
          <nav class="scene-nav" aria-label="地图导航"><button data-scene="room">晚安小屋</button><button data-scene="garden">周年花园</button><button data-scene="challenge">勇气花园</button><button data-scene="town">周年小镇</button><button data-scene="meadow" hidden>✿ 花海</button><button data-scene="ruins">回声遗迹</button></nav>
          <div class="garden-pocket"><span>${icon("gift")}<span class="bag-count">苹果 0 · 花朵 0 · 星屑 0</span></span><span class="day-hint">十分钟一昼夜 · 找长椅休息，等一场黄昏和星夜</span></div><details class="flower-book" hidden><summary>✿ 七色花谱 <span class="prism-count">0 / 7</span></summary><p class="prism-hint"></p><ol class="prism-list"></ol></details><section class="map-reader" aria-label="地图物件阅读区" hidden></section>
          ${helpMarkup}
          <div class="game-bottom"><div class="desktop-instructions"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>E</kbd> / 右键 互动</span><i></i><span>左键走动 / 点物件 · <kbd>B</kbd> 背包 · <kbd>H</kbd> 花环</span></div><span class="exploration-count">${icon("star")} <span id="explored">0</span>/${EVENT_IDS.length} 个角落</span></div>
          <p class="journey-legend">${icon("star")} 遇到小挫折，回小屋的床休息一下 <span>·</span> 勇气花园里藏着小挫折，小屋与周年花园安心玩</p>
          <div class="touch-controls"><div class="dpad" aria-label="移动方向键"><button data-direction="0,-1" class="dpad-up" aria-label="向上移动">↑</button><button data-direction="-1,0" class="dpad-left" aria-label="向左移动">←</button><span>${icon("heart")}</span><button data-direction="1,0" class="dpad-right" aria-label="向右移动">→</button><button data-direction="0,1" class="dpad-down" aria-label="向下移动">↓</button></div><div class="touch-hint">走近发光的小物件<br><span>也可轻触物件或提示签</span></div><button class="touch-interact">${icon("star")}<span>互动</span></button></div>
        </section>
        ${achievementBookMarkup}
      </div>
      <section class="page-memory-section" aria-labelledby="page-memory-title" data-page-ui>
        <div class="page-section-heading"><div><span class="eyebrow">把喜欢，妥帖收藏</span><h2 id="page-memory-title">留一格，给回忆</h2></div><p>一些写下的话，一些平常的日子。</p></div>
        <div class="page-memory-cards">
          <button class="page-memory-card memory-letter" data-memory="letters">
            <span class="memory-cover"><svg class="letter-envelope" viewBox="0 0 300 180" aria-hidden="true"><path d="M22 39h260v118H22z" fill="#b8a288" opacity=".15"/><rect x="17" y="30" width="266" height="122" rx="5" fill="#efdcc2" stroke="#cdb393"/><path d="M18 31h264L155 119a10 10 0 0 1-10 0Z" fill="#fff3dd" stroke="#d8c0a2"/><path d="m18 151 1-76 119 61q12 7 24 0l120-61v76Z" fill="#f8e8ce" stroke="#d6bda0"/><path d="m23 145 104-48m150 48-104-48" fill="none" stroke="#e5cfb3"/><rect x="229" y="41" width="38" height="42" fill="#fffcf0" stroke="#cbb69d" stroke-dasharray="2 2"/>${stampImage}<path d="M34 54h62m-62 7h54m-54 7h59" stroke="#d3b6a9" stroke-width="1.2"/><circle cx="150" cy="116" r="16" fill="#c590a1" stroke="#e4b9c4" stroke-width="3"/><g fill="#fff0da"><circle cx="150" cy="110" r="4"/><circle cx="156" cy="114" r="4"/><circle cx="154" cy="121" r="4"/><circle cx="146" cy="121" r="4"/><circle cx="144" cy="114" r="4"/></g><circle cx="150" cy="116" r="3" fill="#d8b576"/></svg><span class="memory-postmark" aria-hidden="true">${icon("mail")} 晚安邮局</span></span>
            <span class="memory-card-copy"><span class="memory-card-title">晚安信箱</span><span class="memory-description">把想说的话，折成一封小小的信。</span><small></small><span class="memory-card-action">去小屋读信 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card memory-album" data-memory="album">
            <span class="memory-cover">${coverImage}</span>
            <span class="memory-card-copy"><span class="memory-card-title">回忆相册</span><span class="memory-description">从草莓吐司的早晨，到轻轻说晚安。</span><small>${collections.album.items.length} 张日常回忆</small><span class="memory-card-action">去小屋看相册 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card cinema-shortcut memory-cinema">
            <span class="memory-cover"><img src="${cinemaCover}" alt="" loading="lazy"/><span class="cinema-play" aria-hidden="true">▶</span><span class="memory-film-label" aria-hidden="true">第一年的晚安</span></span>
            <span class="memory-card-copy"><span class="memory-card-title">周年放映</span><span class="memory-description">坐下来，一起重温这一年的小瞬间。</span><small>视频异步准备，可以先逛逛</small><span class="memory-card-action">去花园看放映 ${icon("arrow")}</span></span>
          </button>
        </div>
      </section>
      <section class="credits page-meadow-note" aria-labelledby="credits-title"><img src="${meadowCover}" alt="" loading="lazy"/><div class="credits-heading"><span class="eyebrow">还有一些喜欢，藏在星星里</span><h2 id="credits-title">草地上的署名</h2><p>集齐七色花，去夜里的花海走走。<br>拾起一颗落星，就能遇见一位制作人。</p><span class="meadow-note-sign" aria-hidden="true">✧ 愿每一份晚安，都被温柔珍藏</span></div></section>
    </main>
    <footer data-page-ui><span>${icon("heart")} 献给芙眠眠的第一年</span><p>粉丝制作的一周年纪念礼物 · 愿下一个晚安，依然有你。</p><button class="text-button reset-button">重新探索</button><span class="reset-confirmation" hidden>清除本机进度？<button class="reset-confirm map-action">重新开始</button><button class="reset-cancel map-action">保留进度</button></span></footer>
  </div><div class="toast" role="status" aria-live="polite"></div><div class="confetti-layer" aria-hidden="true"></div>`;

// The paper cards render before the deferred game module. Do not present live
// buttons without handlers while that module is loading.
const startupButtons = [...document.querySelectorAll<HTMLButtonElement>("#app button:not([disabled])")];
for (const button of startupButtons) button.disabled = true;
document.querySelector("#app")!.setAttribute("aria-busy", "true");
void import("./application").then(({mountGame}) => {
  for (const button of startupButtons) button.disabled = false;
  mountGame();
  scheduleResourcePreload(() => scheduleAlbumPreviews(collections.album.items));
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
