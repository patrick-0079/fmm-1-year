import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join, resolve } from "node:path";
import { build, preview } from "vite";
import { OPEN_AT } from "../src/launch/time.ts";

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
      /\/(?:main-|application-|room-interactive-|nemu-sprites-|texture-cache\.js)/.test(new URL(entry.name).pathname))));
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

  await enter.click();
  assert.equal(await game.locator(".debug-trigger,.launch-debug-trigger,[data-debug]").count(), 0);
  const frame = await game.locator(".adventure-layout").boundingBox();
  const canvas = await game.locator("#world").boundingBox();
  assert.ok(Math.abs(frame.width - canvas.width) <= 4 && Math.abs(canvas.width / canvas.height - 1.5) < .01);
  const book = game.getByRole("button", { name: "周年徽章册", exact: true });
  await book.click();
  assert.ok(await game.locator("#anniversary-badges").evaluate(dialog => dialog.matches(":modal")));
  await game.mouse.click(2, 2);
  assert.equal(await book.getAttribute("aria-expanded"), "false");
  const helpButton = game.locator('.window-tools button[aria-controls="game-help"]');
  const help = game.getByRole("dialog", { name: "小冒险怎么玩" });
  await helpButton.click();
  assert.ok(await help.evaluate(dialog => dialog.matches(":modal")));
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
  const assets = await readdir(join(outDir, "assets"));
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
  await game.locator(".save-now").click();
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
  assert.deepEqual(errors, []);
  console.log(`正式游戏：帮助、锁定装扮、双标签读信、相册回退、${assets.length} 项站内缓存、断网切图与刷新续档通过`);
} finally {
  await browser?.close();
  await server?.close();
  if (dirname(outDir) === tempRoot) await rm(outDir, { recursive: true, force: true });
}
