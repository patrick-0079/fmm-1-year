import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { preview } from "vite";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const directory = resolve(process.argv[2] ?? "dist");
const marker = JSON.parse(await readFile(resolve(directory, "release.json")));
assert.equal(marker.mode, "full");
const files = JSON.parse(await readFile(resolve(directory, `game-assets-${marker.version}.json`)));
const asset = prefix => "/" + files.find(([name]) => name.startsWith("assets/" + prefix + "-"))[0];
const gates = new Map(), requests = [];
const filmMethods = [];
function hold(path, partial = false) {
  const seen = Promise.withResolvers(), reply = Promise.withResolvers(), closed = Promise.withResolvers();
  gates.set(path, { seen, reply, closed, partial });
  return { seen: seen.promise, closed: closed.promise, release(status = 200) { gates.delete(path); reply.resolve(status); } };
}
const server = await preview({ configFile: false, build: { outDir: directory }, logLevel: "error",
  preview: { host: "127.0.0.1", port: 0, cors: false }, plugins: [{
    name: "controlled-network", configurePreviewServer(host) {
      host.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, "http://localhost/").pathname;
        if (path === "/qa-film.mp4") {
          filmMethods.push(req.method);
          const chunk = Buffer.alloc(64 * 1024), chunks = 16;
          res.writeHead(200, { "Content-Length": chunk.length * chunks, "Content-Type": "video/mp4",
            "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "ETag", ETag: '"qa-v1"' });
          if (req.method === "HEAD") { res.end(); return; }
          for (let index = 0; index < chunks && !res.destroyed; index++) {
            res.write(chunk);
            await new Promise(done => setTimeout(done, 200));
          }
          res.end(); return;
        }
        requests.push(path);
        if (path.startsWith("/assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        const gate = gates.get(path);
        if (gate) {
          res.once("close", () => { if (!res.writableEnded) gate.closed.resolve(); });
          const bytes = gate.partial ? await readFile(resolve(directory, "." + path)) : undefined;
          if (bytes) {
            res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": bytes.length });
            res.write(bytes.subarray(0, 8192));
          }
          gate.seen.resolve();
          const status = await gate.reply.promise;
          if (res.destroyed) return;
          if (bytes) { res.end(bytes.subarray(8192)); return; }
          if (status !== 200) { res.writeHead(status, { "Cache-Control": "no-store" }); res.end(); return; }
        }
        next();
      });
    },
  }] });
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined) });
  const base = server.resolvedUrls.local[0];
  for (const restored of [false, true]) {
    requests.length = 0;
    const context = await browser.newContext({ viewport: restored ? { width: 390, height: 844 } : { width: 827, height: 763 },
      isMobile: restored, hasTouch: restored, reducedMotion: "reduce", serviceWorkers: restored ? "block" : "allow" });
    const visit = { scene: "town-radio", x: 240, y: 222, savedAt: 1700000000000 };
    if (restored) await context.addInitScript(value => localStorage.setItem("fufu-journey-v1", JSON.stringify(value)), visit);
    let films = 0, originals = 0;
    await context.route(/^https:\/\/cdn\./, route => {
      if (/\.mp4(?:\?|$)/i.test(route.request().url())) films++; else originals++;
      return route.fulfill({ status: 503, headers: { "Access-Control-Allow-Origin": "*" }, body: "QA: offline CDN" });
    });
    const page = await context.newPage(), errors = [], warnings = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Images loaded lazily and replaced with placeholders/i.test(message.text())) warnings.push(message.text()); });
    await page.clock.setFixedTime(new Date("2026-12-02T12:00:00+08:00"));
    const entrance = page.locator(".enter-button"), meter = page.locator(".entry-progress");
    const roomMap = asset("room-interactive"), townMap = asset("town-quarry");
    const toHold = restored ? files.find(([name,, scenes]) => /^assets\/radio-[\w-]{8}\.webp$/.test(name) && scenes.includes("town-radio"))[0] : null;
    const firstPath = restored ? asset("wardrobe-v11") : asset("stationery-desk");
    const starting = hold(firstPath);
    const savedMap = restored ? hold("/" + toHold) : null;
    const destination = hold(restored ? roomMap : townMap), last = hold(asset("meadow-jelly-bells"));
    const backgroundPath = asset("anniversary-garden-tree-free"), background = hold(backgroundPath, true);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await Promise.all([starting.seen, page.waitForFunction(() => {
      const bar = document.querySelector(".entry-progress");
      return bar && bar.value > 0 && bar.value < bar.max;
    })]);
    assert.ok(await entrance.isDisabled());
    assert.ok(await page.locator('[data-memory="letters"]').isDisabled());
    assert.ok(await meter.isVisible());
    const checkRatio = async (selector, scene) => {
      const total = files.filter(([, , group]) => group.includes("*") || group.includes(scene)).length;
      const bar = page.locator(selector);
      await bar.locator("..").locator(".resource-count").waitFor();
      const result = await bar.evaluate(el => ({ total: el.max, ready: el.value,
        text: el.nextElementSibling.textContent, accessible: el.getAttribute("aria-valuetext") }));
      assert.equal(result.total, total);
      assert.equal(result.text, `${result.ready}/${total}`);
      assert.equal(result.accessible, result.text);
      assert.ok(result.ready < total);
    };
    await checkRatio(".entry-progress", restored ? "town-radio" : "room");
    assert.equal(requests.includes(restored ? roomMap : townMap), false);
    assert.equal(films, 0);
    if (restored) {
      await savedMap.seen;
      savedMap.release();
      await page.waitForFunction(() => {
        const bar = document.querySelector(".entry-progress");
        return bar.value === bar.max - 1;
      });
      assert.ok(await entrance.isDisabled(), "the wardrobe alone must hold the saved-map gate");
      const previousMapReads = requests.filter(path => path === "/" + toHold).length;
      starting.release(503);
      await page.getByRole("button", { name: /未载齐，点击重试/ }).waitFor();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("fufu-journey-v1")).scene), "town-radio");
      const second = hold(firstPath);
      await entrance.click();
      await second.seen;
      assert.equal(requests.includes(roomMap), false);
      assert.equal(requests.filter(path => path === "/" + toHold).length, previousMapReads, "retry skips the already downloaded saved map");
      second.release();
    } else starting.release();
    await page.getByRole("button", { name: restored ? /继续上次的冒险/ : /开始小冒险/ }).click();
    const current = page.locator(".scene-wrap");
    assert.equal(await current.getAttribute("data-current-map"), restored ? "town-radio" : "room");
    await page.locator(".bag-toggle").click();
    assert.ok(await page.locator(".bag-avatar").evaluate(canvas =>
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((value, i) => i % 4 === 3 && value)));
    await page.locator(".bag-close").click();
    if (!restored) {
      await page.locator('[data-memory="letters"]').click();
      await page.locator(".game-letter-reader .mail-envelope").waitFor();
      const surfaces = await page.locator(".game-letter-reader").evaluate(async el => {
        const sources = [getComputedStyle(el).backgroundImage, ...["pocket", "flap", "seal"].map(key =>
          getComputedStyle(el.querySelector(".mail-envelope")).getPropertyValue("--mail-" + key + "-image"))];
        return Promise.all(sources.map(async source => {
          const image = new Image(); image.src = /url\(["']?(.*?)["']?\)/.exec(source)[1];
          await image.decode(); return image.naturalWidth > 0;
        }));
      });
      assert.deepEqual(surfaces, [true, true, true, true]);
      await page.locator(".game-letter-reader .reader-close").click();
    }
    const target = restored ? "room" : "town", nav = page.locator(`.scene-nav [data-scene="${target}"]`);
    await background.seen;
    const backgroundReads = () => requests.filter(path => path === backgroundPath).length;
    const beforeCrossing = backgroundReads();
    await nav.click();
    await Promise.race([background.closed, new Promise((_, reject) => {
      const timeout = setTimeout(() => reject(Error("切图未中断后台下载：" + target)), 12_000);
      timeout.unref();
    })]);
    background.release();
    await Promise.all([destination.seen, page.locator(".scene-transition.active").waitFor()]);
    await checkRatio(".map-progress", target);
    assert.equal(backgroundReads(), beforeCrossing, "background transfers stay suspended while the destination is held");
    assert.equal(await current.getAttribute("data-current-map"), restored ? "town-radio" : "room");
    assert.equal(films, 0);
    if (!restored) {
      destination.release(503);
      await page.locator(".scene-transition.active").waitFor({ state: "hidden" });
      assert.equal(await current.getAttribute("data-current-map"), "room");
      await nav.click();
    } else destination.release();
    await page.locator(`.scene-wrap[data-current-map="${target}"]`).waitFor();
    await last.seen;
    assert.equal(films, 0);
    last.release();
    await page.waitForFunction(() => document.querySelector(".cinema-shortcut small")?.textContent?.includes("视频预载失败"));
    assert.equal(films, 1);
    assert.ok(backgroundReads() > beforeCrossing, "interrupted background downloads resume after the crossing");
    assert.equal(originals, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    console.log(restored ? "手机／无 Worker：非小屋存档、背包单项拦截、原地重试、返屋抢占下载、视频顺序通过" :
      "桌面／Worker：信箱实图、资源数量、切图抢占和恢复后台下载、失败留在原图、视频顺序通过");
    await context.close();
  }
  const maps = ["room", "garden", "challenge", "town", "meadow", "ruins",
    ...["florist", "baker", "maker", "post", "books", "radio", "hall"].map(key => "town-" + key)];
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.route(/^https:\/\/cdn\./, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
  await page.addInitScript(() => {
    const scene = new URL(location.href).searchParams.get("map");
    localStorage.setItem("nemu-anniversary-v1", JSON.stringify({ rainbowFlowers:
      ["rose","calendula","lily","peony","bell","iris","cosmos"].map(key => "prism-" + key) }));
    localStorage.setItem("fufu-journey-v1", JSON.stringify({ scene, x: 200, y: 200, savedAt: Date.now() }));
  });
  for (const map of maps) {
    await page.goto(base + "?map=" + map);
    await page.getByRole("button", { name: /继续上次的冒险/ }).click();
    assert.equal(await page.locator(".scene-wrap").getAttribute("data-current-map"), map);
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log("全部 13 张地图（含七间室内）按存档直接进入通过");
  if (process.argv.includes("--debug")) {
    const debug = await browser.newContext();
    const page = await debug.newPage();
    const held = hold(asset("stationery-desk"));
    await debug.route(/\.mp4$/, route => route.request().url().startsWith(base) ? route.continue() :
      route.fulfill({ status: 307, headers: { Location: base + "qa-film.mp4", "Access-Control-Allow-Origin": "*" } }));
    await page.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
    await page.goto(base);
    await page.locator(".debug-trigger").click();
    const readout = page.locator(".debug-network:visible");
    await held.seen;
    await page.waitForFunction(() => parseFloat(document.querySelector('[data-speed="assets"]')?.textContent) > 0);
    assert.equal(await readout.locator('[data-speed="film"]').innerText(), "0 B/s");
    held.release();
    await page.locator("#game-debug-panel .debug-network:visible").waitFor();
    await page.waitForFunction(() => parseFloat(document.querySelector('[data-speed="film"]')?.textContent) > 0);
    await page.waitForFunction(() => document.querySelector(".network-state")?.textContent?.includes("影片：已完成"));
    await page.waitForFunction(() => [...document.querySelectorAll("[data-speed]")].every(el => el.textContent === "0 B/s"));
    await page.reload();
    await page.getByRole("button", { name: /开始小冒险/ }).waitFor();
    await page.locator(".debug-trigger").click();
    await page.waitForFunction(() => document.querySelector(".network-state")?.textContent?.includes("影片：使用本机缓存"));
    assert.equal(await readout.locator('[data-speed="film"]').innerText(), "0 B/s");
    assert.match(await readout.locator(".network-state").innerText(), /缓存 [1-9]\d* 项/);
    assert.deepEqual(filmMethods, ["GET", "HEAD"]);
    console.log("调试网速：入口即显示、面板交接、两路独立读数、停传归零、缓存不虚报通过");
    await debug.close();
  }
} finally {
  for (const gate of gates.values()) gate.reply.resolve(503);
  await browser?.close();
  await server.close();
}
