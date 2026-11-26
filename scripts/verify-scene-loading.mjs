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
let filmPause;
let film;

async function recordLocalFilm(browser, base) {
  const page = await browser.newPage();
  try {
    await page.goto(base + "release.json");
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 100;
      const paint = canvas.getContext("2d"), stream = canvas.captureStream(15);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType }), parts = [];
      const finished = new Promise((resolve, reject) => {
        recorder.ondataavailable = event => parts.push(event.data);
        recorder.onstop = resolve; recorder.onerror = reject;
      });
      recorder.start();
      for (let frame = 0; frame < 16; frame++) {
        paint.fillStyle = "#292539"; paint.fillRect(0, 0, 160, 100);
        paint.fillStyle = "#f6accb"; paint.fillRect(frame * 8, 28, 30, 30);
        await new Promise(done => setTimeout(done, 75));
      }
      recorder.stop();
      await finished;
      stream.getTracks().forEach(track => track.stop());
      return { mimeType, data: [...new Uint8Array(await new Blob(parts).arrayBuffer())] };
    });
    assert.ok(bytes.data.length > 1024);
    return { type: bytes.mimeType, data: Buffer.from(bytes.data) };
  } finally { await page.close(); }
}
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
          const size = film.data.length;
          res.writeHead(200, { ...(req.url.includes("chunked") ? {} : { "Content-Length": size }), "Content-Type": film.type,
            "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "ETag", ETag: '"qa-v1"' });
          if (req.method === "HEAD") { res.end(); return; }
          for (let index = 0; index < 16 && !res.destroyed; index++) {
            res.write(film.data.subarray(Math.ceil(size * index / 16), Math.ceil(size * (index + 1) / 16)));
            if (filmPause && index === 3) await filmPause.promise;
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
    if (restored) await context.addInitScript(value => {
      localStorage.setItem("fufu-journey-v1", JSON.stringify(value));
      localStorage.setItem("nemu-anniversary-v1", JSON.stringify({ completed: ["gifts"] }));
      localStorage.setItem("fufu-garden-bag-v1", JSON.stringify({ wearing: true, picked: {
        "1:garden:dew": 1, "2:challenge:sunset": 1, "3:garden:firefly": 1,
      } }));
    }, visit);
    let films = 0, originals = 0;
    await context.route(/^https:\/\/cdn\./, route => {
      const url = route.request().url();
      if (/\.mp4(?:\?|$)/i.test(url)) films++;
      else if (!url.endsWith(".pack")) originals++;
      return route.fulfill({ status: 503, headers: { "Access-Control-Allow-Origin": "*" }, body: "QA: offline CDN" });
    });
    const page = await context.newPage(), errors = [], warnings = [];
    let albumRequests = 0;
    if (restored) await page.route("**/assets/journal-album-*", route => {
      if (++albumRequests === 1) return route.fulfill({ status: 503, headers: { "Cache-Control": "no-store" } });
      return route.continue();
    });
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Images loaded lazily and replaced with placeholders/i.test(message.text())) warnings.push(message.text()); });
    await page.clock.setFixedTime(new Date("2026-12-02T12:00:00+08:00"));
    const entrance = page.locator(".enter-button"), meter = page.locator(".entry-progress");
    const roomMap = asset("room-interactive"), townMap = asset("town-quarry");
    const toHold = restored ? files.find(([name,, scenes]) => /^assets\/radio-[\w-]{8}\.webp$/.test(name) && scenes.includes("town-radio"))[0] : null;
    const firstPath = restored ? asset("wardrobe-icons") : asset("stationery-desk");
    const starting = hold(firstPath);
    const savedMap = restored ? hold("/" + toHold) : null;
    const destination = hold(restored ? roomMap : townMap), last = hold(asset("meadow-jelly-bells"));
    const backgroundPath = asset("anniversary-garden-tree-free"), background = hold(backgroundPath, true);
    const cover = hold(asset("journal-cinema"), true);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await cover.seen;
    await page.waitForFunction(() => [...document.querySelectorAll(".memory-letter img,.memory-album img,.page-meadow-note > img")]
      .length === 3 && [...document.querySelectorAll(".memory-letter img,.memory-album img,.page-meadow-note > img")].every(image => image.complete && image.naturalWidth));
    assert.ok(!requests.some(path => path.startsWith("/game-assets-") || path === roomMap || path === firstPath),
      "game downloads started before the page covers finished");
    const journalImages = ["journal-letter", "journal-album", "journal-cinema", "meadow-postcard"].map(asset);
    const paper = await page.locator("#journal-paper-preload").evaluate(link => new URL(link.href).pathname);
    const artwork = requests.filter(path => /\.(webp|wav)$/i.test(path));
    assert.equal(artwork[0], paper, "journal paper starts before the other page artwork");
    assert.deepEqual(artwork.filter(path => !journalImages.includes(path)), [paper], "journal paper transfers once");
    assert.ok(await entrance.isDisabled());
    await page.waitForFunction(() => document.querySelector(".entry-progress")?.getAttribute("aria-valuetext") === "75.0%");
    assert.equal(await meter.getAttribute("aria-valuetext"), "75.0%");
    if (restored) assert.equal(albumRequests, 2, "the journal recovered its failed cover before the game started");
    const badges = page.getByRole("tab", { name: "徽章", exact: true });
    await badges.click();
    assert.ok(await page.getByRole("tabpanel", { name: "徽章", exact: true }).isVisible());
    assert.equal(await page.locator(":modal").count(), 0);
    // Legacy saves also retain the original public letter from Kerry as already read.
    const historical = ["day-secrets", "gifts", "letter-kerry", "wreath"];
    assert.equal(await page.locator(".achievement-count strong").textContent(), restored ? `${historical.length} / 56` : "0 / 56");
    await page.getByRole("tab", { name: "地图", exact: true }).click();
    cover.release();
    await Promise.all([starting.seen, page.waitForFunction(() => {
      const bar = document.querySelector(".entry-progress");
      return bar && bar.value > 0 && bar.value < bar.max;
    })]);
    assert.ok(await entrance.isDisabled());
    assert.ok(await page.locator('[data-memory="letters"]').isDisabled());
    assert.ok(await meter.isVisible());
    assert.deepEqual(await page.locator(".memory-cover img, .page-meadow-note > img").evaluateAll(images =>
      images.map(image => image.complete && image.naturalWidth > 0)), [true, true, true, true]);
    const checkRatio = async (selector, scene) => {
      const total = files.filter(([, , group]) => group.includes("*") || group.includes(scene)).length;
      const bar = page.locator(selector);
      await bar.locator("..").locator(".resource-count").waitFor();
      const result = await bar.evaluate(el => ({ total: el.max, ready: el.value,
        text: el.nextElementSibling.textContent, accessible: el.getAttribute("aria-valuetext") }));
      assert.equal(result.total, total);
      assert.equal(result.text, "站内补载 " + (100 * result.ready / total).toFixed(1) + "%");
      assert.equal(result.accessible, result.text);
      assert.ok(result.ready < total);
    };
    await checkRatio(".entry-progress", restored ? "town-radio" : "room");
    const runner = await page.locator(".entry-progress").evaluate(el => {
      const root = el.parentElement, runner = root.querySelector(".resource-runner"), fill = root.querySelector(".resource-fill");
      return { sprite: getComputedStyle(runner).backgroundImage, stripes: getComputedStyle(fill).backgroundImage,
        right: root.querySelector(".resource-count").getBoundingClientRect().left >= fill.parentElement.getBoundingClientRect().right,
        reduced: getComputedStyle(runner).animationName };
    });
    assert.match(runner.sprite, /data:image\/webp/);
    assert.match(runner.stripes, /repeating-linear-gradient/);
    assert.ok(runner.right);
    assert.equal(runner.reduced, "none");
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
    if (restored) {
      await badges.click();
      assert.equal(await page.locator(".achievement-count strong").textContent(), `${historical.length} / 56`);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("nemu-anniversary-v1")).achievements.earned.sort()), historical);
      await page.getByRole("tab", { name: "地图", exact: true }).click();
      assert.ok(await page.locator(".achievement-flash").isHidden(), "loading legacy achievements must stay silent");
    }
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
    const failedFilm = page.waitForResponse(response => /\.mp4(?:\?|$)/i.test(response.url()) && response.status() === 503);
    last.release();
    await failedFilm;
    assert.match(await page.locator(".cinema-shortcut small").innerText(), /小叶子.*录像带/);
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
  const recovered = await browser.newContext({ serviceWorkers: "block" });
  try {
    let offline = true;
    await recovered.route(/^https:\/\//, route => route.abort());
    await recovered.route("**/assets/journal-letter-*", route => offline
      ? route.fulfill({ status: 503, headers: { "Cache-Control": "no-store" } }) : route.continue());
    const page = await recovered.newPage();
    await page.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
    const map = hold(asset("room-interactive"));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await map.seen;
    assert.ok(await page.locator(".memory-letter .cover-fallback").isVisible());
    offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(() => {
      const img = document.querySelector(".memory-letter img");
      return img && !img.hidden && img.complete && img.naturalWidth > 0;
    });
    map.release();
    await page.getByRole("button", { name: /开始小冒险/ }).waitFor();
    console.log("首页封面连续失败时保留图标，网络恢复后补回插图，地图可正常进入");
  } finally { await recovered.close(); }

  if (process.argv.includes("--debug")) {
    film = await recordLocalFilm(browser, base);
    filmPause = Promise.withResolvers();
    const debug = await browser.newContext();
    const page = await debug.newPage();
    const held = hold(asset("stationery-desk"));
    const routeFilm = async (ctx, path, tape, failFirst = false) => {
      await ctx.addInitScript(tape => {
        if (!localStorage.getItem("nemu-anniversary-v1")) {
          localStorage.setItem("nemu-anniversary-v1", JSON.stringify({ gardenTape: tape, sound: true, bgm: true }));
        }
      }, tape);
      await ctx.route(/^https?:\/\/(?!127\.0\.0\.1:)/, route => {
        if (!/\.mp4$/.test(route.request().url())) return route.abort();
        if (failFirst) {
          failFirst = false;
          return route.fulfill({ status: 503, headers: { "Access-Control-Allow-Origin": "*" } });
        }
        return route.fulfill({ status: 307, headers: { Location: base + path, "Access-Control-Allow-Origin": "*" } });
      });
    };
    await routeFilm(debug, "qa-film.mp4", "carried");
    await page.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        if (/^25% · /.test(text)) window.projectorProgress = text;
        return draw.call(this, text, ...args);
      };
    });
    await page.clock.setFixedTime(new Date("2026-11-20T09:00:00+08:00"));
    await page.goto(base);
    await page.locator(".launch-debug-trigger").click();
    await page.locator("#launch-title").click();
    assert.ok(await page.locator(".launch-debug-panel").isVisible());
    await page.reload();
    await page.locator(".launch-debug-panel:visible").waitFor();
    await page.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
    await page.locator("#loading-debug:visible").waitFor();
    const readout = page.locator(".debug-network:visible");
    await held.seen;
    await page.waitForFunction(() => parseFloat(document.querySelector('[data-speed="assets"]')?.textContent) > 0);
    assert.equal(await readout.locator('[data-speed="film"]').innerText(), "0 B/s");
    await page.getByRole("tab", { name: "徽章", exact: true }).click();
    const book = page.getByRole("tabpanel", { name: "徽章", exact: true });
    assert.ok(await book.isVisible());
    assert.ok(await page.locator("#loading-debug").isVisible());
    held.release();
    await page.locator("#game-debug-panel .debug-network:visible").waitFor();
    assert.ok(await book.isVisible());
    await page.getByRole("tab", { name: "地图", exact: true }).click();
    assert.ok(await page.locator("#game-debug-panel").isVisible());
    const panel = page.locator("#game-debug-panel");
    const wardrobe = panel.locator('[data-debug="wardrobe"]');
    assert.equal(await wardrobe.getAttribute("aria-pressed"), "false");
    await wardrobe.click();
    assert.equal(await wardrobe.getAttribute("aria-pressed"), "true");
    await page.locator(".music-toggle").click();
    assert.ok(await panel.isVisible());
    await page.locator(".help-button").click();
    await page.waitForFunction(() => {
      const button = document.querySelector("#game-help[open] .debug-close");
      if (!button) return false;
      const bounds = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2));
    });
    await page.locator(".help-close").click();
    assert.ok(await panel.isVisible());
    const effects = page.locator(".effects-toggle"), on = await effects.innerHTML();
    assert.equal(await effects.innerText(), "");
    assert.ok(await effects.locator("svg").isVisible());
    await effects.click();
    assert.equal(await effects.getAttribute("aria-pressed"), "false");
    assert.notEqual(await effects.innerHTML(), on);
    await panel.evaluate(el => el.scrollTop = el.scrollHeight);
    const sticky = await panel.evaluate(el => el.scrollTop > 50 && Math.abs(el.querySelector("header").getBoundingClientRect().top - el.getBoundingClientRect().top) < 3);
    assert.ok(sticky, "debug close stays at the top of the scrolling panel");
    await panel.getByText("庆典互动与复活", { exact: true }).click();
    await panel.locator('[data-debug="event:garden:danmaku"]').click();
    await page.getByRole("button", { name: "放入录像带", exact: true }).click();
    await page.locator(".cinema-hud:visible").waitFor();
    assert.ok(await panel.isVisible());
    await page.waitForFunction(() => parseFloat(document.querySelector('[data-speed="film"]')?.textContent) > 0);
    await page.waitForFunction(size => document.querySelector(".cinema-hud .cinema-download-meter").value === size, Math.ceil(film.data.length / 4));
    assert.match(await page.locator(".cinema-hud .cinema-progress").innerText(), /25%/);
    await page.waitForFunction(() => window.projectorProgress?.startsWith("25%"));
    await page.locator(".cinema-fullscreen").click();
    await page.locator(".cinema-player:visible .cinema-download-meter").waitFor();
    assert.match(await page.locator(".cinema-player-loading").innerText(), /25%/);
    assert.ok(await panel.isVisible());
    await page.locator(".cinema-shrink").click();
    await page.locator(".cinema-play").click();
    await page.locator(".cinema-leave").click();
    filmPause.resolve();
    await page.waitForFunction(() => document.querySelector(".network-state")?.textContent?.includes("影片：已完成"));
    await page.waitForFunction(() => document.querySelector("video[data-garden-video]").readyState >= 3);
    assert.ok(await page.locator("video[data-garden-video]").evaluate(video => video.paused && video.currentTime === 0));
    await panel.locator('[data-debug="event:garden:danmaku"]').click();
    await page.locator('.cinema-hud[data-stage="ready"]:visible').waitFor();
    assert.ok(await page.locator("video[data-garden-video]").evaluate(video => video.paused && video.currentTime === 0));
    await page.locator(".cinema-hud .cinema-play").click();
    await page.waitForFunction(() => document.querySelector("video[data-garden-video]").currentTime > 0);
    await page.waitForFunction(() => [...document.querySelectorAll("[data-speed]")].every(el => el.textContent === "0 B/s"));
    await page.reload();
    await page.getByRole("button", { name: /继续上次的冒险|开始小冒险/ }).waitFor();
    await page.locator("#game-debug-panel .debug-network:visible").waitFor();
    assert.equal(await wardrobe.getAttribute("aria-pressed"), "false");
    await page.waitForFunction(() => document.querySelector(".network-state")?.textContent?.includes("影片：使用本机缓存"));
    assert.equal(await readout.locator('[data-speed="film"]').innerText(), "0 B/s");
    assert.match(await readout.locator(".network-state").innerText(), /缓存 [1-9]\d* 项/);
    assert.deepEqual(filmMethods, ["GET", "HEAD"]);
    await panel.locator(".debug-close").click();
    await page.reload();
    await page.getByRole("button", { name: /继续上次的冒险|开始小冒险/ }).waitFor();
    assert.ok(await panel.isHidden());
    await debug.close();

    filmPause = Promise.withResolvers();
    const unknown = await browser.newContext();
    await routeFilm(unknown, "qa-film.mp4?chunked", "inserted", true);
    const other = await unknown.newPage();
    await other.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
    await other.goto(base);
    await other.getByRole("button", { name: /开始小冒险/ }).click();
    await other.locator(".debug-trigger").click();
    await other.getByText("庆典互动与复活", { exact: true }).click();
    await other.locator('[data-debug="event:garden:danmaku"]').click();
    await other.locator(".cinema-retry:visible").click();
    const amount = other.locator(".cinema-hud .cinema-progress");
    await amount.filter({ hasText: /已接收 [1-9]/ }).waitFor();
    assert.doesNotMatch(await amount.innerText(), /%/);
    assert.equal(await other.locator(".cinema-hud .cinema-download-meter").getAttribute("value"), null);
    filmPause.resolve();
    await other.waitForFunction(() => document.querySelector("video[data-garden-video]")?.readyState >= 3);
    await unknown.close();
    const buffered = await browser.newContext();
    await routeFilm(buffered, "qa-film.mp4", "carried");
    const ready = await buffered.newPage();
    await ready.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      window.gardenFrames = 0;
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (image instanceof HTMLVideoElement && image.hasAttribute("data-garden-video")) window.gardenFrames++;
        return draw.call(this, image, ...args);
      };
    });
    await ready.clock.setFixedTime(new Date("2026-12-03T09:00:00+08:00"));
    await ready.goto(base);
    await ready.getByRole("button", { name: /开始小冒险/ }).click();
    await ready.waitForFunction(() => document.querySelector("video[data-garden-video]")?.readyState >= 3);
    await ready.locator(".debug-trigger").click();
    await ready.getByText("庆典互动与复活", { exact: true }).click();
    await ready.locator('[data-debug="event:garden:danmaku"]').click();
    const insert = ready.getByRole("button", { name: "放入录像带", exact: true });
    await insert.waitFor();
    await ready.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await ready.evaluate(() => window.gardenFrames), 0, "a decoded frame must stay behind the poster until insertion");
    assert.ok(await ready.locator(".cinema-hud").isHidden());
    assert.match(await ready.locator(".cinema-shortcut small").innerText(), /已拿到录像带/);
    await insert.click();
    await ready.locator('.cinema-hud[data-stage="ready"]:visible').waitFor();
    await ready.waitForFunction(() => window.gardenFrames > 0);
    assert.ok(await ready.locator("video[data-garden-video]").evaluate(video => video.paused && video.currentTime === 0));
    await ready.locator(".cinema-play").click();
    await ready.waitForFunction(() => document.querySelector("video[data-garden-video]").currentTime > 0);
    await buffered.close();
    console.log("插带时影片已就绪与下载中两种情况、离开期间完成下载、回场手动播放、下载失败后重试、全屏与缓存复用通过");
  }
} finally {
  filmPause?.resolve();
  for (const gate of gates.values()) gate.reply.resolve(503);
  await browser?.close();
  await server.close();
}
