import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join, resolve } from "node:path";
import { build, preview } from "vite";
import { OPEN_AT } from "../src/launch/time.ts";
import { townInteriorKeys } from "../src/town-interior-id.ts";
import { rainbowIds } from "../src/rainbow-flowers.ts";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const tempRoot = resolve(tmpdir());
const outDir = await mkdtemp(join(tempRoot, "fufu-release-browser-"));
assert.equal(dirname(outDir), tempRoot);
const releaseFile = join(outDir, "release.json");
const release = async full => {
  process.env.FULL_BUILD = String(full);
  process.env.VITE_WARDROBE_DEBUG = "false";
  await build({ build: { outDir, emptyOutDir: true }, logLevel: "error" });
  const marker = JSON.parse(await readFile(releaseFile, "utf8"));
  assert.equal(marker.mode, full ? "full" : "lite");
  return marker;
};

async function checkPlayViewport(page) {
  await page.waitForFunction(() => {
    const frame = document.querySelector("#world").getBoundingClientRect();
    const controls = document.querySelectorAll(".window-bar, .window-bar button, .control-tabs button, #maps-panel:not([inert]) button, .dpad button, .touch-interact");
    const fits = box => box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1;
    const hittable = button => {
      const rect = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    };
    const directions = [...document.querySelectorAll(".dpad button")].filter(button => button.getClientRects().length);
    return frame.width > 160 && fits(frame) && Math.abs(frame.width - frame.height * 1.5) < 1 &&
      [...controls].every(control => !control.getClientRects().length ||
        (fits(control.getBoundingClientRect()) && (!control.matches("button:enabled") || hittable(control)))) &&
      hittable(document.querySelector(".bag-toggle")) && directions.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44 && hittable(button);
      });
  }, undefined, { timeout: 5000 }).catch(async error => {
    const layout = await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight], scrollY, focus: document.activeElement?.outerHTML.slice(0, 60),
      boxes: Object.fromEntries(["#world", ".window-bar", ".scene-nav", ".touch-controls", ".bag-toggle", ".dpad-left"].map(selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        const atCenter = document.elementFromPoint(x + width / 2, y + height / 2);
        return [selector, { rect: [x, y, width, height].map(Math.round), hit: atCenter?.getAttribute("class") }];
      })),
    }));
    throw new Error("游戏或操作键超出视口 " + JSON.stringify(layout), { cause: error });
  });
}

async function checkWorldTime(page, label, phase, day) {
  await page.waitForFunction(({ label, phase, day }) => {
    const clock = document.querySelector(".time-pill");
    return clock?.dataset.phase === phase && clock.textContent.includes(label) &&
      document.querySelector(".day-hint")?.textContent.includes(`第 ${day} 天 · 24 分钟一昼夜`);
  }, { label, phase, day }, { timeout: 5000 });
}

let server, browser;
try {
  const lite = await release(false);
  server = await preview({ build: { outDir }, preview: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined),
  });
  const errors = [];
  const beforeOpening = async (width, mode) => {
    const context = await browser.newContext({ viewport: { width, height: 820 }, hasTouch: width < 600,
      reducedMotion: "reduce", timezoneId: "America/New_York" });
    await context.route(/^https:\/\/cdn\./, route => route.abort());
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(String(error)));
    await page.clock.setFixedTime(new Date(OPEN_AT - 1500));
    await page.addInitScript(() => sessionStorage.setItem("fufu-launch-preview-v1", "1"));
    if (mode === "lite") {
      const chunk = /\/assets\/view-[^/]+\.js$/;
      await page.route(chunk, route => route.abort());
      await page.goto(base);
      const retry = page.getByRole("button", { name: /重试/ });
      await retry.waitFor({ timeout: 5000 });
      await page.unroute(chunk);
      await Promise.all([page.waitForEvent("domcontentloaded"), retry.click()]);
    } else {
      await page.goto(base);
    }
    await page.locator(".launch-clock").waitFor();
    assert.equal(await page.locator(".launch-date time").getAttribute("datetime"), new Date(OPEN_AT).toISOString());
    assert.equal(await page.locator('[data-unit="seconds"]').innerText(), "02");
    assert.equal(await page.locator(".launch-debug-trigger, #world").count(), 0);
    assert.ok(!await page.evaluate(() => performance.getEntriesByType("resource").some(entry =>
      /\/(?:main-|application-|room-interactive-|fufu-garments-|journal-celestial-paper-|texture-cache\.js)/.test(new URL(entry.name).pathname))));
    await page.locator(".launch-invitation img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    return page;
  };
  const waiting = await beforeOpening(320, "lite");
  await Promise.all([
    waiting.waitForResponse(response => response.url() === base + "release.json"),
    waiting.clock.setFixedTime(new Date(OPEN_AT)),
  ]);
  await waiting.locator(".launch-waiting").waitFor();
  assert.equal(await waiting.locator("#world").count(), 0);
  console.log("精简包：倒计时、资源失败重试、到点等待均通过");

  const full = await release(true);
  assert.notEqual(full.version, lite.version);
  const game = await beforeOpening(1280, "full");
  await game.clock.setFixedTime(new Date(OPEN_AT));
  const enter = game.getByRole("button", { name: /开始小冒险/ });
  await enter.waitFor();
  await waiting.evaluate(() => window.dispatchEvent(new Event("online")));
  await waiting.getByRole("button", { name: /开始小冒险/ }).waitFor();
  assert.equal(await waiting.locator('meta[name="fufu-release"]').getAttribute("data-version"), full.version);
  await waiting.context().close();
  console.log("全量包：到点自动开门，旧邀请函自动更新，无需调试或手动刷新");

  const badges = game.getByRole("tab", { name: "徽章", exact: true });
  const maps = game.getByRole("tab", { name: "地图", exact: true });
  const book = game.getByRole("tabpanel", { name: "徽章", exact: true });
  assert.equal(await maps.getAttribute("aria-selected"), "true");
  assert.ok(await book.isHidden());
  assert.equal(await game.getByRole("button", { name: /保存进度|周年徽章册/, includeHidden: true }).count(), 0);
  assert.match(await game.locator(".save-status").innerText(), /开始冒险后自动保存/);
  await maps.press("End");
  assert.ok(await badges.evaluate(tab => tab === document.activeElement));
  assert.equal(await badges.getAttribute("aria-selected"), "true");
  assert.ok(await book.isVisible());
  assert.match(await book.innerText(), /0\s*\/\s*55/);
  assert.equal(await game.locator(":modal").count(), 0);
  // Keep a stamp open while the journal moves between the rail and the bottom sheet.
  await book.locator('[data-book-pick="gifts"]').click();
  for (const [width, height, side] of [[1920, 1080, true], [768, 1024, false], [390, 844, false], [1280, 820, true]]) {
    await game.setViewportSize({ width, height });
    const layout = await book.evaluate(panel => {
      const map = document.querySelector("#world").getBoundingClientRect();
      const book = panel.getBoundingClientRect();
      const grid = panel.querySelector(".achievement-grid");
      const stamps = [...grid.querySelectorAll("[data-book-pick]")].map(el => el.getBoundingClientRect());
      const firstRow = stamps.filter(stamp => Math.abs(stamp.top - stamps[0].top) < 1);
      const selected = grid.querySelector('[aria-expanded="true"]').getBoundingClientRect();
      const detail = grid.querySelector(".achievement-detail");
      return {
        beside: book.left >= map.right - 1 && book.top < map.bottom,
        below: book.top >= map.bottom - 1,
        firstRow: firstRow.length,
        filled: Math.abs(firstRow.at(-1).right - grid.getBoundingClientRect().right) < 1,
        detailGap: detail.getBoundingClientRect().top - selected.bottom - parseFloat(getComputedStyle(grid).rowGap),
        focused: document.activeElement === detail,
      };
    });
    assert.ok(side ? layout.beside : layout.below, `${width}px 徽章册位置不正确`);
    assert.ok(layout.filled && Math.abs(layout.detailGap) < 1 && layout.focused, `${width}px 展开的详情应紧跟完整的一行徽章`);
    if (width === 768) assert.ok(layout.firstRow >= 4, "平板下方的徽章应充分利用整行宽度");
  }
  await badges.press("ArrowLeft");
  assert.equal(await maps.getAttribute("aria-selected"), "true");
  assert.ok(await book.isHidden());
  await enter.click();
  for (const [ms, label, phase, day] of [
    [999, "08:00", "day", 1], [1000, "08:01", "day", 1],
    [539999, "16:59", "day", 1], [540000, "17:00", "dusk", 1], [720000, "20:00", "night", 1],
    [959999, "23:59", "night", 1], [960000, "00:00", "night", 2],
    [1260000, "05:00", "dawn", 2], [1440000, "08:00", "day", 2],
  ]) {
    await game.clock.setFixedTime(new Date(OPEN_AT + ms));
    await checkWorldTime(game, label, phase, day);
  }
  assert.equal(await game.locator(".scene-nav button:visible").count(), 5);
  const stamps = await game.locator(".scene-nav .map-stamp").evaluateAll(icons => icons.map(icon => icon.innerHTML));
  assert.equal(new Set(stamps).size, 6);
  assert.equal(await game.locator(".debug-trigger,.launch-debug-trigger,[data-debug]").count(), 0);
  await checkPlayViewport(game);
  for (const [width, height] of [[1413, 763], [1366, 768], [1920, 1080], [1280, 600], [540, 480], [827, 763], [1280, 820]]) {
    await game.setViewportSize({ width, height });
    await checkPlayViewport(game);
    if (width === 1413) {
      const cards = game.locator(".scene-nav button:visible");
      assert.equal(await cards.locator(".map-note:visible").count(), 5);
      const first = await cards.first().boundingBox(), last = await cards.last().boundingBox();
      const panel = await game.locator("#maps-panel").boundingBox();
      assert.ok(first.height >= 50 && Math.abs(first.x - last.x) < 1 && panel.y + panel.height - last.y - last.height < 12);
      assert.equal(await game.getByRole("button", { name: "晚安小屋", exact: true }).getAttribute("aria-pressed"), "true");
    } else if (width === 827) {
      assert.equal(await game.locator(".scene-nav .map-note:visible").count(), 0);
    } else if (width === 1920) {
      await badges.click();
      assert.ok(await book.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1));
      await maps.click();
      await checkPlayViewport(game);
    }
  }
  await game.locator("footer").evaluate(footer => footer.scrollIntoView({ block: "end", behavior: "instant" }));
  await game.setViewportSize({ width: 1270, height: 790 });
  await delay(300);
  assert.ok(await game.locator("footer").evaluate(footer => footer.getBoundingClientRect().top < innerHeight), "reading the journal must retain its scroll position");
  await game.locator('.scene-nav [data-scene="room"]').click();
  await checkPlayViewport(game);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  await phone.route(/^https:\/\//, route => route.abort());
  const rotated = await phone.newPage();
  rotated.on("pageerror", error => errors.push(error.message));
  await rotated.addInitScript(({ now, flowers }) => {
    if (localStorage.getItem("fufu-world-clock-v1") !== null) return;
    localStorage.setItem("fufu-world-clock-v1", JSON.stringify({ origin: now - 2_500_000, shift: 125 }));
    localStorage.setItem("nemu-anniversary-v1", JSON.stringify({ rainbowFlowers: flowers }));
  }, { now: OPEN_AT, flowers: rainbowIds });
  await rotated.clock.setFixedTime(new Date(OPEN_AT));
  await rotated.goto(base);
  await rotated.getByRole("button", { name: /开始小冒险/ }).tap();
  await checkWorldTime(rotated, "17:00", "dusk", 5);
  await rotated.clock.setFixedTime(new Date(OPEN_AT + 1000));
  await checkWorldTime(rotated, "17:01", "dusk", 5);
  await rotated.reload();
  await rotated.getByRole("button", { name: /继续上次的冒险/ }).tap();
  await checkWorldTime(rotated, "17:01", "dusk", 5);
  await checkPlayViewport(rotated);
  for (const [width, height] of [[844, 390], [568, 320], [320, 568], [320, 480], [390, 844]]) {
    await rotated.setViewportSize({ width, height });
    await checkPlayViewport(rotated);
    await rotated.locator(".bag-toggle").tap();
    await rotated.locator(".bag-close").tap();
    const frame = await rotated.locator("#world").boundingBox();
    await rotated.getByRole("tab", { name: "徽章", exact: true }).tap();
    const phoneBook = rotated.getByRole("tabpanel", { name: "徽章", exact: true });
    assert.ok(await phoneBook.isVisible());
    assert.ok(await phoneBook.evaluate(panel => panel.clientHeight >= 100 && panel.scrollWidth <= panel.clientWidth + 1 &&
      panel.getBoundingClientRect().bottom <= innerHeight + 1));
    const after = await rotated.locator("#world").boundingBox();
    assert.ok(Math.abs(frame.width - after.width) < 1 && Math.abs(frame.height - after.height) < 1);
    await phoneBook.locator('[data-book-chapter="advanced"]').tap();
    await phoneBook.locator("[data-book-pick]").last().tap();
    assert.ok(await phoneBook.locator("#achievement-detail").evaluate(detail => {
      const bounds = detail.getBoundingClientRect(), panel = detail.closest('[role="tabpanel"]').getBoundingClientRect();
      return bounds.top >= panel.top - 1 && bounds.top < panel.bottom && document.activeElement === detail;
    }));
    await rotated.getByRole("tab", { name: "地图", exact: true }).tap();
    await checkPlayViewport(rotated);
  }
  await rotated.locator('.scene-nav [data-scene="garden"]').tap();
  await rotated.locator('.scene-wrap[data-current-map="garden"]').waitFor();
  assert.equal(await rotated.locator('.scene-nav [data-scene="garden"]').getAttribute("aria-pressed"), "true");
  await checkPlayViewport(rotated);
  for (const [scene, label, ms, outsidePhase] of [
    ["meadow", "花海 · 静夜", 180000, "night"], ["ruins", "遗迹 · 长明灯", 720000, "dawn"],
  ]) {
    await rotated.locator(`.scene-nav [data-scene="${scene}"]`).tap();
    await rotated.locator(`.scene-wrap[data-current-map="${scene}"]`).waitFor();
    await rotated.clock.setFixedTime(new Date(OPEN_AT + ms));
    await rotated.locator(`.time-pill[data-phase="${outsidePhase}"]`).filter({ hasText: label }).waitFor();
  }
  await rotated.locator('.scene-nav [data-scene="garden"]').tap();
  await checkWorldTime(rotated, "05:00", "dawn", 6);
  console.log("24 分钟昼夜逐分钟显示，旧档迁移与刷新续时、花海和遗迹的独立光景通过");
  await phone.close();
  console.log("桌面缩放及手机横竖屏切换后，3:2 地图、声音、地图导航与操作键均在视口内，背包和切图可触摸");
  const frameBeforeTabs = await game.locator("#world").boundingBox();
  await badges.click();
  const frameAfterTabs = await game.locator("#world").boundingBox();
  assert.equal(frameAfterTabs.height, frameBeforeTabs.height);
  assert.equal(frameAfterTabs.width, frameBeforeTabs.width);
  assert.ok(await book.isVisible());
  assert.equal(await game.locator(":modal").count(), 0);
  await game.locator(".bag-toggle").click();
  assert.ok(await game.locator(".inventory-panel").isVisible());
  await game.locator(".bag-close").click();
  assert.ok(await book.isVisible());
  await maps.click();
  const helpButton = game.locator('.window-tools button[aria-controls="game-help"]');
  const help = game.getByRole("dialog", { name: "小冒险怎么玩" });
  await helpButton.click();
  assert.ok(await help.evaluate(dialog => dialog.matches(":modal")));
  assert.match(await help.innerText(), /WASD/);
  assert.match(await help.innerText(), /花环/);
  assert.equal(await game.locator(".game-viewport .desktop-instructions, .game-viewport .touch-hint").count(), 0);
  assert.equal(await help.getByRole("button").count(), 1);
  assert.equal(await helpButton.getAttribute("aria-expanded"), "true");
  const done = help.getByRole("button", { name: "知道了" });
  assert.ok(await done.evaluate(button => button === document.activeElement));
  await game.keyboard.press("Escape");
  await help.waitFor({ state: "hidden" });
  assert.ok(await helpButton.evaluate(button => button === document.activeElement));
  await helpButton.press("Enter");
  await done.click();
  assert.equal(await helpButton.getAttribute("aria-expanded"), "false");
  await game.locator(".bag-toggle").click();
  await game.locator(".bag-item.is-locked").first().click();
  assert.ok(await game.locator(".bag-apply").isDisabled());
  await game.locator('.bag-tabs [data-tab="keepsakes"]').click();
  await game.locator("[data-mail]").click();
  await game.locator(".inventory-panel .mail-envelope").click();
  await game.locator('.inventory-panel [data-mail-state="reading"]').waitFor();
  await game.locator("[data-mail-back]").click();
  await game.locator(".bag-close").click();
  await game.locator('[data-memory="album"]').click();
  await game.locator(".photo-book-next").click();
  await game.locator(".photo-book-photo").first().click();
  await game.locator(".photo-original-retry").waitFor();
  await game.locator(".photo-original-back").click();
  await game.locator(".game-album-reader .reader-close").click();
  const assets = (await readdir(join(outDir, "assets"))).filter(name => !name.startsWith("journal-celestial-paper-"));
  await game.waitForFunction(() => !!navigator.serviceWorker.controller);
  const deadline = Date.now() + 90000;
  let cached;
  do {
    cached = await game.evaluate(async () => (await (await caches.open("fufu-game-textures-v1:/")).keys())
      .map(request => decodeURIComponent(new URL(request.url).pathname).slice("/assets/".length)).sort());
    if (cached.length >= assets.length) break;
    await delay(200);
  } while (Date.now() < deadline);
  assert.deepEqual(cached, assets.sort());
  await game.context().setOffline(true);
  await game.locator('.scene-nav [data-scene="town"]').click();
  await game.locator('.scene-wrap[data-current-map="town"]').waitFor();
  await game.waitForFunction(() => JSON.parse(localStorage.getItem("fufu-journey-v1"))?.scene === "town");
  assert.match(await game.locator(".save-status").innerText(), /本机已保存 · 晚安周年小镇/);
  await game.context().setOffline(false);
  await game.reload();
  await game.getByRole("button", { name: /继续上次的冒险/ }).click();
  await game.locator('.scene-wrap[data-current-map="town"]').waitFor();
  assert.match(await game.locator('[data-memory="letters"] small').innerText(), /1 封未读/);
  const peer = await game.context().newPage();
  peer.on("pageerror", error => errors.push(String(error)));
  await peer.goto(base);
  await peer.getByRole("button", { name: /继续上次的冒险/ }).click();
  await peer.locator(".bag-toggle").click();
  await peer.locator('.bag-tabs [data-tab="keepsakes"]').click();
  await peer.locator("[data-mail]").click();
  await peer.locator('.mail-envelope[data-sealed="true"]').click();
  await game.waitForFunction(() => document.querySelector('[data-memory="letters"] small')?.textContent === "2 封来信");
  const collector = await browser.newPage({viewport:{width:1280,height:800},reducedMotion:"reduce"});
  collector.on("pageerror",error=>errors.push(error.message));
  await collector.route(/^https:\/\//,route=>route.abort());
  await collector.clock.setFixedTime(new Date(OPEN_AT + 60000));
  const hall = JSON.parse(await readFile(new URL("../src/town-interiors.generated.json",import.meta.url),"utf8")).hall;
  await collector.addInitScript(({items,at})=>{
    if (localStorage.getItem("nemu-anniversary-v1")) return;
    localStorage.setItem("nemu-anniversary-v1",JSON.stringify({townKeepsakes:{items}}));
    localStorage.setItem("fufu-journey-v1",JSON.stringify({scene:"town-hall",x:at[0],y:at[1],savedAt:Date.now()}));
  },{items:townInteriorKeys,at:hall.plan.shifts.day.approach});
  await collector.goto(base);
  await collector.getByRole("button",{name:/继续上次的冒险/}).click();
  await collector.locator('.scene-wrap[data-current-map="town-hall"]').waitFor();
  await collector.locator("#world").press("e");
  await collector.getByRole("button",{name:"收下巫女服",exact:true}).click();
  await collector.getByRole("button",{name:"打开衣橱",exact:true}).click();
  assert.equal(await collector.locator(".debug-trigger").count(),0);
  assert.ok(await collector.evaluate(()=>{
    const bag=JSON.parse(localStorage.getItem("fufu-souvenirs-v1"));
    const book=JSON.parse(localStorage.getItem("nemu-anniversary-v1")).achievements.earned;
    return ["witchDress","witchHat","mikoOutfit"].every(id=>bag.owned.includes(id)) && book.filter(id=>id==="town-miko").length===1;
  }));
  await collector.close();
  console.log("调试关闭的全量包：集齐七件小物后，通过暖栗对话领取巫女服、盖章和打开衣橱。");
  assert.deepEqual(errors, []);
  console.log(`正式游戏：帮助、锁定装扮、双标签读信、相册回退、${assets.length} 项站内缓存、断网切图与刷新续档通过`);
} finally {
  await browser?.close();
  await server?.close();
  if (dirname(outDir) === tempRoot) await rm(outDir, { recursive: true, force: true });
}
