import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { preview } from "vite";

const directory = resolve(process.argv[2] ?? "dist");
const release = JSON.parse(await readFile(resolve(directory, "release.json")));
const files = JSON.parse(await readFile(resolve(directory, `game-assets-${release.version}.json`)));
const map = "/" + files.find(([path]) => path.startsWith("assets/anniversary-town-hd-"))[0];
const garden = "/" + files.find(([path]) => path.startsWith("assets/anniversary-garden-tree-free-"))[0];
const data = await readFile(resolve(directory, "." + map));
const chunk = 16 * 1024, interval = 200;
let crossing;
const server = await preview({ configFile: false, build: { outDir: directory }, logLevel: "error",
  preview: { host: "127.0.0.1", port: 0, cors: false }, plugins: [{
    name: "local-bandwidth-test", configurePreviewServer(host) {
      host.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, "http://localhost").pathname, run = crossing;
        if (path.startsWith("/assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        if (path === garden && run && !run.done) {
          run.background.resolve();
          res.once("close", () => { if (!res.writableEnded) run.interrupted.resolve(); });
          await run.release.promise;
          if (res.destroyed) return;
        }
        if (path !== map || !run || run.done) { next(); return; }
        res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": data.length });
        let sent = 0;
        while (!run.done && !res.destroyed && sent < data.length - chunk) {
          res.write(data.subarray(sent, sent + chunk));
          sent += chunk;
          run.bytes = sent;
          run.first.resolve(performance.now());
          await delay(interval);
        }
        if (!res.destroyed) res.end(data.subarray(sent));
      });
    },
  }] });
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined) });
  for (const worker of ["allow","block"]) {
    crossing = { first: Promise.withResolvers(), background: Promise.withResolvers(), interrupted: Promise.withResolvers(),
      release: Promise.withResolvers(), bytes: 0, done: false };
    const run = crossing, context = await browser.newContext({ serviceWorkers: worker, viewport: { width: 1180, height: 850 } });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/, route => route.abort());
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2026-12-02T12:00:00+08:00"));
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole("button", { name: /开始小冒险/ }).click();
    await run.background.promise;
    const start = performance.now();
    await page.locator('.scene-nav [data-scene="town"]').click();
    const deadline = AbortSignal.timeout(15000);
    await Promise.race([Promise.all([run.first.promise, run.interrupted.promise]),
      new Promise((_, reject) => deadline.addEventListener("abort", () => reject(Error("目标请求未起传或后台连接仍在")), { once: true }))]);
    const startDelay = Math.round(await run.first.promise - start);
    await page.locator(".debug-trigger").click();
    const rate = page.locator('.debug-network:visible [data-speed="assets"]');
    await page.waitForFunction(() => {
      const meter = document.querySelector(".map-progress");
      return meter.max > 1 && meter.value === meter.max - 1;
    });
    await delay(5750); // All small transfers have left the five-second rate window.
    const before = run.bytes, sampledAt = performance.now(), samples = [];
    for (let i = 0; i < 3; i++) { samples.push(await rate.innerText()); await delay(550); }
    const delivered = run.bytes - before;
    const observedRate = delivered * 1000 / (performance.now() - sampledAt);
    console.log(`Worker ${worker}: 首包 ${startDelay} ms，采样期间本机发出 ${delivered} B，面板 ${samples.join(" / ")}`);
    assert.ok(delivered >= 4 * chunk && startDelay < 4000);
    for (const sample of samples) {
      assert.match(sample, /^[\d.]+ KiB\/s$/, "本地限速下载应显示 KiB/s");
      const displayedRate = parseFloat(sample) * 1024;
      assert.ok(displayedRate > observedRate * .65 && displayedRate < observedRate * 1.4,
        `面板 ${sample} 与服务器实发 ${Math.round(observedRate)} B/s 不符`);
    }
    assert.equal(await page.locator('.debug-network:visible [data-speed="film"]').innerText(), "0 B/s");
    run.done = true; run.release.resolve();
    await page.locator('.scene-wrap[data-current-map="town"]').waitFor();
    await context.close();
  }
} finally {
  if (crossing) { crossing.done = true; crossing.release.resolve(); }
  await browser?.close(); await server.close();
}
