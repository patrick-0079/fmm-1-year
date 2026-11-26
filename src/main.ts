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
import { achievementBookMarkup, mountAchievementBook } from "./achievement-book";
import { helpMarkup } from "./help";
import letterCover from "./assets/journal-letter.webp";
import albumCover from "./assets/journal-album.webp";
import cinemaCover from "./assets/journal-cinema.webp";
import { NATURE_KEY, pickedGardenEggs, readGardenBag } from "./nature-save";
import { mailSummary } from "./resident-story";
import { migrateAchievementFacts, reconcileAchievements } from "./achievements";
import { INVENTORY_KEY, readInventory } from "./items";
import { PLAYTIME_KEY, readClock } from "./playtime";
import { TOWN_TALKED_KEY, readTownVisits } from "./town-data";
import meadowCover from "./assets/meadow-postcard.webp";
import { anniversary, collections } from "./content";
import { EVENT_IDS, SAVE_KEY, readProgress } from "./core";
import { JOURNEY_KEY, readJourney, showJourneyStatus } from "./journey";
import { scenes } from "./maps";
import { icon } from "./icons";
import { REAL_MINUTES_PER_DAY } from "./day";
import { prepareMapArt, registerResourceCache } from "./texture-cache";
import { resourceMeter, showResourceCount } from "./loading-meter";
import { mountLoadingMonitor } from "./network-debug";
import { fitGameViewport } from "./game-viewport";
import { gameControlMenuMarkup, mountGameControlMenu } from "./game-control-menu";
import { mountJournalStarlight } from "./journal-starlight";

function journalCover(src: string, fallback: string) {
  return `<span class="memory-cover"><img src="${src}" width="720" height="480" alt="" loading="eager" decoding="async" fetchpriority="high"/>${icon(fallback, "cover-fallback")}</span>`;
}
const initialProgress = readProgress(stored(SAVE_KEY));
const initialMail = mailSummary(initialProgress.residents);

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
          <div class="game-viewport">
          <div class="window-bar">
            <div class="window-dots"><i></i><i></i><i></i></div>
            <span><span class="window-title-prefix" lang="en">fufu’s little world / </span>周年特别篇</span>
            <div class="window-tools">
              <button class="music-toggle icon-button" aria-label="关闭背景音乐" title="背景音乐">${icon("music")}</button>
              <button type="button" class="effects-toggle icon-button" aria-label="互动音效" aria-pressed="true" title="关闭互动音效">${icon("effects")}</button>
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
              <button class="button primary enter-button" disabled>正在准备首页插图…</button>${resourceMeter("entry-progress", "首页插图")}<small>正在展开晚安手账…</small>
            </div>
            <section class="game-letter-reader" aria-label="在游戏中阅读晚安信箱" hidden></section>
            <div class="scene-transition">
              <div class="scene-transition-card">
                <div class="scene-transition-art"><span class="scene-transition-star"><span class="scene-transition-face"></span></span></div>
                <span class="scene-transition-label">正在前往</span>
                <strong class="scene-transition-destination"></strong>
                ${resourceMeter("map-progress", "公共资源与目标地图")}
              </div>
              <span class="scene-transition-status" role="status"></span>
            </div>
            <button class="bag-toggle" type="button" aria-label="打开纪念背包，快捷键 B" aria-controls="inventory-panel" aria-expanded="false" aria-keyshortcuts="B" title="背包（B）">${icon("backpack", "bag-trigger-art")}<kbd aria-hidden="true">B</kbd></button>
            <section id="inventory-panel" class="inventory-panel" aria-label="芙芙的背包" hidden></section>
          </div>
          <section class="arcade-hud" hidden aria-label="小镇与遗迹小游戏"></section></div></div>
          <div class="game-controls">
            ${gameControlMenuMarkup}
            ${achievementBookMarkup}
            <div class="touch-controls"><div class="dpad" aria-label="移动方向键"><button data-direction="0,-1" class="dpad-up" aria-label="向上移动">↑</button><button data-direction="-1,0" class="dpad-left" aria-label="向左移动">←</button><span>${icon("heart")}</span><button data-direction="1,0" class="dpad-right" aria-label="向右移动">→</button><button data-direction="0,1" class="dpad-down" aria-label="向下移动">↓</button></div><button class="touch-interact">${icon("interact")}<span>互动</span></button></div>
            <div class="game-meta">
              <div class="garden-pocket">
                <span class="pocket-items">${icon("gift")}<span class="bag-count">苹果 0 · 花朵 0 · 星屑 0</span></span>
                <span class="exploration-count">${icon("star")} <span id="explored">0</span>/${EVENT_IDS.length} 个角落</span>
                <span class="day-hint">${REAL_MINUTES_PER_DAY} 分钟一昼夜 · 找长椅休息，等一场黄昏和星夜</span>
                <small class="save-status"></small>
              </div>
            </div>
          </div>
          </div>
          <details class="flower-book" hidden><summary>✿ 七色花谱 <span class="prism-count">0 / 7</span></summary><p class="prism-hint"></p><ol class="prism-list"></ol></details><section class="map-reader" aria-label="地图物件阅读区" hidden></section>
          ${helpMarkup}
        </section>
      </div>
      <section class="page-memory-section" aria-labelledby="page-memory-title" data-page-ui>
        <div class="page-section-heading"><div><span class="eyebrow">把喜欢，妥帖收藏</span><h2 id="page-memory-title">留一格，给回忆</h2></div><p>一些写下的话，一些平常的日子。</p></div>
        <div class="page-memory-cards">
          <button class="page-memory-card memory-letter${initialMail.unread ? " has-unread" : ""}" data-memory="letters">
            ${journalCover(letterCover, "mail")}
            <span class="memory-card-copy"><span class="memory-card-title">晚安信箱</span><span class="memory-description">把想说的话，折成一封小小的信。</span><small>${initialMail.label}</small><span class="memory-card-action">去小屋读信 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card memory-album" data-memory="album">
            ${journalCover(albumCover, "book")}
            <span class="memory-card-copy"><span class="memory-card-title">回忆相册</span><span class="memory-description">从草莓吐司的早晨，到轻轻说晚安。</span><small>${collections.album.items.length} 张日常回忆</small><span class="memory-card-action">去小屋看相册 ${icon("arrow")}</span></span>
          </button>
          <button class="page-memory-card cinema-shortcut memory-cinema">
            ${journalCover(cinemaCover, "tv")}
            <span class="memory-card-copy"><span class="memory-card-title">周年放映</span><span class="memory-description">坐下来，一起重温这一年的小瞬间。</span><small>游戏资源备齐后再下载影片</small><span class="memory-card-action">去花园看放映 ${icon("arrow")}</span></span>
          </button>
        </div>
      </section>
      <section class="credits page-meadow-note" aria-labelledby="credits-title"><img src="${meadowCover}" width="640" height="427" alt="" loading="eager" decoding="async" fetchpriority="high"/><div class="credits-heading"><span class="eyebrow">还有一些喜欢，藏在星星里</span><h2 id="credits-title">草地上的署名</h2><p>集齐七色花，去夜里的花海走走。<br>拾起一颗落星，就能遇见一位制作人。</p><span class="meadow-note-sign" aria-hidden="true">✧ 愿每一份晚安，都被温柔珍藏</span></div></section>
    </main>
    <footer data-page-ui><span>${icon("heart")} 献给芙眠眠的第一年</span><p>粉丝制作的一周年纪念礼物 · 愿下一个晚安，依然有你。</p><button class="text-button reset-button">重新探索</button><span class="reset-confirmation" hidden>清除本机进度？<button class="reset-confirm map-action">重新开始</button><button class="reset-cancel map-action">保留进度</button></span></footer>
  </div><div class="toast" role="status" aria-live="polite"></div><div class="confetti-layer" aria-hidden="true"></div>`;

mountJournalStarlight();

showJourneyStatus(document.querySelector(".save-status")!, readJourney(stored(JOURNEY_KEY), initialProgress.rainbowFlowers));
const book = mountAchievementBook();
// While the map downloads, read the current save when the player chooses the tab.
let showBadges = () => {
  const saved = readProgress(stored(SAVE_KEY));
  const legacy = stored(NATURE_KEY);
  const bag = readInventory(stored(INVENTORY_KEY), legacy);
  const context = {
    townTalked: readTownVisits(stored(TOWN_TALKED_KEY)), owned: bag.owned,
    pickedEggs: pickedGardenEggs(readGardenBag(legacy)), wearingWreath: bag.equipped.wreath === "wreath",
    playSeconds: Math.floor(readClock(stored(PLAYTIME_KEY)).milliseconds / 1000),
  };
  migrateAchievementFacts(saved, context);
  book.update(reconcileAchievements(saved, context).entries, saved.achievements.earned.at(-1));
};
mountGameControlMenu(document.querySelector<HTMLElement>(".game-control-menu")!, () => showBadges());
const pageArt = [...document.querySelectorAll<HTMLImageElement>(".memory-cover img, .page-meadow-note > img")];
async function decodePageImage(image: HTMLImageElement) {
  try { await image.decode(); }
  catch {
    const src = image.src;
    image.removeAttribute("src");
    image.src = src;
    try { await image.decode(); }
    catch (error) {
      image.hidden = true;
      window.addEventListener("online", () => {
        image.src = src;
        void image.decode().then(() => { image.hidden = false; }).catch(() => {});
      }, { once: true });
      throw error;
    }
  }
}
const gameWindow = document.querySelector<HTMLElement>(".game-window")!;
const stage = gameWindow.querySelector<HTMLElement>(".game-stage")!;
fitGameViewport(gameWindow);
const startupButtons = [...document.querySelectorAll<HTMLButtonElement>(".game-window button:enabled, .page-memory-cards button, footer button")]
  .filter(button => !button.closest(".control-tabs, .achievement-book"));
for (const button of startupButtons) button.disabled = true;
const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
const meter = document.querySelector<HTMLProgressElement>(".entry-progress")!;
function stored(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
let pageLoaded = 0;
showResourceCount(meter, pageLoaded, pageArt.length);
const pageReady = Promise.allSettled([
  ...pageArt.map(async image => {
    await decodePageImage(image);
    showResourceCount(meter, ++pageLoaded, pageArt.length);
  }),
  document.fonts.ready,
]);
async function start(): Promise<void> {
  enter.disabled = true;
  stage.setAttribute("aria-busy", "true");
  await pageReady;
  void registerResourceCache();
  meter.setAttribute("aria-label", "公共资源与初始地图");
  document.querySelector(".intro-screen small")!.textContent = "正在准备背包、信笺和地图画面…";
  const progress = readProgress(stored(SAVE_KEY));
  const journey = readJourney(stored(JOURNEY_KEY), progress.rainbowFlowers);
  const scene = journey?.scene ?? "room", title = scenes[scene].title;
  document.querySelector("#location-name")!.textContent = title;
  enter.textContent = "正在准备" + title + "…";
  try {
    await prepareMapArt(scene, (loaded, total) => showResourceCount(meter, loaded, total));
  } catch {
    enter.disabled = false;
    enter.textContent = title + "未载齐，点击重试";
    enter.onclick = start;
    stage.removeAttribute("aria-busy");
    return;
  }
  enter.onclick = null;
  enter.textContent = "正在布置" + title + "…";
  try {
    const { mountGame } = await import("./application");
    const latest = readProgress(stored(SAVE_KEY));
    const latestJourney = readJourney(stored(JOURNEY_KEY), latest.rainbowFlowers);
    if ((latestJourney?.scene ?? "room") !== scene) return start();
    for (const button of startupButtons) button.disabled = false;
    mountGame(latest, latestJourney, book);
    showBadges = book.show;
  } catch {
    for (const button of startupButtons) button.disabled = true;
    enter.disabled = false;
    enter.textContent = "游戏未能载入，点击重试";
    enter.onclick = () => location.reload();
  }
  stage.removeAttribute("aria-busy");
}
if (import.meta.env.VITE_WARDROBE_DEBUG === "true") mountLoadingMonitor();
void start();
