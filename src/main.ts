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
import "./fufu-cursors.css";
import { helpMarkup } from "./help";
import { ARCADES, TOWN_NPCS } from "./town-data";
import { ITEMS } from "./items";
import { anniversary, collections } from "./content";
import { icon } from "./icons";
import { prepareTextureCache } from "./texture-cache";

const tasks = [
  {
    id: "courage",
    title: "带着勇气出发",
    subtitle: "绕过小挫折 · 摘一朵勇气之花",
    icon: "heart",
    scene: "challenge",
  },
  {
    id: "cake",
    title: "分一口甜甜",
    subtitle: "吹蜡烛 · 切六块 · 尝一口",
    icon: "cake",
    scene: "room",
  },
  {
    id: "gifts",
    title: "拆一份心意",
    subtitle: "找到礼物的好朋友",
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
const memories = [
  { id: "letters", icon: "mail", empty: "待寄达", unit: "封来信" },
  { id: "album", icon: "book", empty: "待收集", unit: "张回忆" },
  { id: "radio", icon: "sound", empty: "待开播", unit: "段录音" },
  { id: "tv", icon: "tv", empty: "待放映", unit: "段视频" },
];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="芙眠眠一周年首页"><span class="brand-mark">${icon("heart")}</span><span>芙芙的晚安小世界<small>FUFU’S LITTLE WORLD</small></span></a>
      <div class="header-right"><span class="anniversary-tag">${icon("star")} 1st Anniversary</span><a class="bili-link" href="${anniversary.bilibili}" target="_blank" rel="noopener noreferrer">${icon("tv")} 去见芙芙 <span>↗</span></a></div>
    </header>
    <main>
      <section class="page-intro">
        <div><p class="eyebrow">A LITTLE ADVENTURE, A WHOLE YEAR OF GOOD NIGHTS</p><h1>把一整年的晚安，<span>变成一场小冒险。</span></h1><p class="intro-copy">欢迎来到芙眠眠的周年小世界。慢慢走，快乐藏在每个小角落。</p></div>
        <div class="date-stamp"><span>和芙芙一起</span><strong>ONE LOVELY YEAR</strong><small>${anniversary.start} — ${anniversary.end}</small><i>${icon("heart")}</i></div>
      </section>
      <div class="adventure-layout">
        <section class="game-window" aria-label="芙芙的像素小世界">
          <div class="window-bar"><div class="window-dots"><i></i><i></i><i></i></div><span>fufu’s little world / 周年特别篇</span><div class="window-tools"><button class="music-toggle icon-button" aria-label="关闭背景音乐" title="背景音乐">♫</button><button class="icon-button sound-toggle" aria-label="开启游戏音效" title="游戏音效">${icon("mute")}</button><button class="icon-button help-button" aria-label="查看操作说明" title="操作说明">?</button></div></div>
          <div class="game-stage"><div class="scene-wrap">
            <canvas id="world" tabindex="0" aria-label="像素探索场景。使用 WASD 或方向键移动，E、空格或鼠标右键互动；左键点击地面行走、标记互动。Tab 切换选项，Enter 确认。">浏览器需要支持 Canvas 才能游玩。</canvas>
            <div class="scene-top"><span class="location-pill">${icon("moon")} <span id="location-name">ROOM 01 · 晚安小屋</span></span><button class="map-switch" title="切换到另一个场景">周年花园 ${icon("arrow")}</button></div>
            <span class="time-pill" role="timer" aria-live="off">☀ 08:00 · 白昼</span><span class="checkpoint-pill">${icon("star")} 复活点 · <span id="checkpoint-name">小屋的床</span></span>
            <section class="cinema-hud" aria-label="花园小电视放映控制" hidden></section><div class="activity-hud" hidden><div class="activity-heading"><span class="activity-status" role="status" aria-live="polite"></span><button class="activity-close" aria-label="结束当前互动，回到地图">收起 ×</button></div><div class="activity-actions"></div></div><button class="crown-toggle map-tool" aria-pressed="false" hidden aria-label="戴上花环，快捷键 H">戴上花环 <kbd>H</kbd></button><div class="rest-tools" hidden><span></span><button class="stand-up map-action">起身 <kbd>E</kbd></button></div><button class="bed-note-pin map-tool" hidden>♡ 床边便签</button><article class="bed-note" aria-label="小叶子的床边便签" hidden></article><div class="nearby-prompt" hidden><span></span><kbd>E</kbd><span class="prompt-verb">互动</span></div>
            <div class="ruin-stamp-flash" role="status" aria-live="polite" aria-atomic="true" hidden></div>
            <div class="intro-screen"><div class="intro-stars">✧ <span>✦</span> ✧</div><span class="intro-pill">芙眠眠 · 直播一周年纪念</span><h2>今晚的快乐，<br>等你来发现。</h2><p>一间温暖小屋，两座缤纷花园，<br>还有东北山洞深处的回声遗迹。<br>和藏在街角的，一点点喜欢。</p><button class="button primary enter-button" disabled>正在点亮小世界…</button><small>点击开始会播放轻柔音乐 · 可随时关闭 ♡</small></div>
            <section class="game-letter-reader" aria-label="在游戏中阅读晚安信箱" hidden></section><div class="scene-transition" aria-hidden="true"></div>
            <button class="bag-toggle" type="button" aria-label="打开纪念背包，快捷键 B" aria-controls="inventory-panel" aria-expanded="false" aria-keyshortcuts="B" title="背包（B）"><span class="bag-trigger-art" aria-hidden="true"></span><kbd aria-hidden="true">B</kbd></button>
            <section id="inventory-panel" class="inventory-panel" aria-label="芙芙的背包" hidden></section>
          </div>
          <section class="arcade-hud" hidden aria-label="小镇与遗迹小游戏"></section></div>
          <nav class="scene-nav" aria-label="地图导航"><button data-scene="room">晚安小屋</button><button data-scene="garden">周年花园</button><button data-scene="challenge">勇气花园</button><button data-scene="town">周年小镇</button><button data-scene="meadow" hidden>✿ 花海</button><button data-scene="ruins">回声遗迹</button><div class="volume-tools"><button class="volume-down" aria-label="降低游戏音量">−</button><span class="volume-value">45%</span><button class="volume-up" aria-label="提高游戏音量">＋</button></div></nav>
          <div class="garden-pocket"><span>${icon("gift")}<span class="bag-count">苹果 0 · 花朵 0 · 星屑 0</span></span><span class="day-hint">十分钟一昼夜 · 找长椅休息，等一场黄昏和星夜</span></div><details class="flower-book" hidden><summary>✿ 七色花谱 <span class="prism-count">0 / 7</span></summary><p class="prism-hint"></p><ol class="prism-list"></ol></details><section class="map-reader" aria-label="地图物件阅读区" hidden></section><section class="inline-help" aria-label="完整游玩说明" hidden></section><div class="game-bottom"><div class="desktop-instructions"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>E</kbd> / 右键 互动</span><i></i><span>左键走动 / 点标记 · <kbd>B</kbd> 背包 · <kbd>H</kbd> 花环</span></div><span class="exploration-count">${icon("star")} <span id="explored">0</span>/11 个角落</span></div>
          <p class="journey-legend">${icon("star")} 遇到小挫折，回小屋的床休息一下 <span>·</span> 勇气花园里藏着小挫折，小屋与周年花园安心玩</p>
          <div class="touch-controls"><div class="dpad" aria-label="移动方向键"><button data-direction="0,-1" class="dpad-up" aria-label="向上移动">↑</button><button data-direction="-1,0" class="dpad-left" aria-label="向左移动">←</button><span>${icon("heart")}</span><button data-direction="1,0" class="dpad-right" aria-label="向右移动">→</button><button data-direction="0,1" class="dpad-down" aria-label="向下移动">↓</button></div><div class="touch-hint">走近发光的小物件<br><span>或者直接点标记</span></div><button class="touch-interact">${icon("star")}<span>互动</span></button></div>
        </section>
        <aside class="journal" aria-label="庆典手账">
          <div class="journal-heading"><span class="eyebrow">TONIGHT’S LITTLE WISHES</span><h2>今晚的小心愿 ${icon("heart")}</h2><p>做一点小事，收集一点快乐。</p></div>
          <div class="task-list">${tasks.map((task, i) => `<button class="task" data-task="${task.id}"><span class="task-icon task-color-${i}">${icon(task.icon)}</span><span class="task-label"><strong>${task.title}</strong><small>${task.subtitle}</small></span><span class="task-check" aria-hidden="true"></span></button>`).join("")}</div>
          <div class="journal-progress"><div><span>庆典心愿</span><strong id="completed">0 / 5</strong></div><div class="progress-track"><span></span></div><p id="progress-note">第一份快乐，会藏在哪里呢？</p><div class="local-save"><small class="save-status">开始冒险后自动保存</small><button class="save-now map-action" disabled>保存进度</button></div></div>
          <div class="journal-divider"><span>✧</span></div>
          <div class="memory-heading-small"><h3>留一格，给回忆</h3><span>慢慢收集，慢慢珍藏</span></div>
          <div class="memory-shortcuts">${memories.map((memory) => `<button data-memory="${memory.id}">${icon(memory.icon)}<span>${collections[memory.id].title}</span><small>${collections[memory.id].items.length ? `${collections[memory.id].items.length} ${memory.unit}` : memory.empty}</small></button>`).join("")}</div>
          <button class="cinema-shortcut"><span>▶ 花园小电视 · 周年放映</span><small>视频异步准备，可以先逛逛，稍后回来继续看</small></button><section class="town-journal"><span class="eyebrow">FUFU’S ANNIVERSARY TOWN</span><h3>沿着晚安，逛逛小镇</h3><p>认识居民 <strong id="town-npc-count">0 / 15</strong> · 镇民为游戏角色</p><div class="arcade-shortcuts">${Object.entries(
            ARCADES,
          )
            .map(
              ([id, g]) =>
                `<button data-arcade="${id}"><strong>${g.title}</strong><small>${g.scene === "ruins" ? "回声遗迹" : "周年小镇"} · ${ITEMS[g.reward].name}</small></button>`,
            )
            .join(
              "",
            )}</div><details class="town-guide"><summary>小镇居民与店铺导览</summary><div>${TOWN_NPCS.map((n) => `<button data-town-npc="${n.id}">${n.name}<small>${n.role}</small></button>`).join("")}</div></details></section><div class="journal-note">${icon("moon")}<p>今晚不用着急。<br>每一份晚安，都值得被珍惜。</p></div>
        </aside>
      </div>
      <section class="world-note"><span>${icon("tv")} 小电视也来庆祝啦</span><p>穿过小屋的门，到花园看一段周年回忆、放飞一只气球，<br class="desktop-break">再为这场相遇，点亮一片小小的星空。</p><button class="text-button garden-link">去花园看看 ${icon("arrow")}</button></section>
      <section class="credits" aria-labelledby="credits-title"><div class="credits-heading"><span class="eyebrow">MADE TOGETHER, WITH LOVE</span><h2 id="credits-title">草地上的署名</h2><p>集齐七色花，去夜里的花海走走。拾起一颗落星，就能遇见一位制作人。</p></div></section>
    </main>
    <footer><span>MADE WITH ${icon("heart")} FOR 芙眠眠</span><p>粉丝制作的一周年纪念礼物 · 愿下一个晚安，依然有你。</p><button class="text-button reset-button">重新探索</button><span class="reset-confirmation" hidden>清除本机进度？<button class="reset-confirm map-action">重新开始</button><button class="reset-cancel map-action">保留进度</button></span></footer>
  </div><div class="toast" role="status" aria-live="polite"></div><div class="confetti-layer" aria-hidden="true"></div>`;

document.querySelector(".inline-help")!.innerHTML = helpMarkup;
void prepareTextureCache().then(() => import("./application")).then(({mountGame}) => mountGame(tasks))
  .catch(() => {
    const enter = document.querySelector<HTMLButtonElement>(".enter-button")!;
    enter.disabled = false;
    enter.textContent = "游戏未能载入，点击重试";
    enter.onclick = () => location.reload();
  });
