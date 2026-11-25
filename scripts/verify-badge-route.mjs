// Run with Node from this repository. A local Playwright installation is sufficient.
// PLAYWRIGHT_MODULE may also point to an externally installed playwright-core.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const width = Number(process.argv[2] || 1366);
assert.ok(Number.isInteger(width) && width >= 320, "请传入至少 320px 的屏宽");
const tempRoot = resolve(tmpdir());
const cache = await mkdtemp(join(tempRoot, "fufu-badge-route-"));
const server = await createServer({
  cacheDir: cache,
  server: { host: "127.0.0.1", port: 0, hmr: false, watch: null },
  logLevel: "error",
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
  });
  const device = {
    viewport: { width, height: width < 600 ? 800 : 900 },
    hasTouch: width < 600,
    reducedMotion: "reduce",
  };
  const page = await browser.newPage(device);
  // The photo and projector must register even if the CDN is unavailable.
  await page.route(/^https:\/\/cdn\./, route => route.abort());
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.clock.install();
  await page.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html");
  await page.waitForFunction(() => window.contentQA?.ready());
  await page.exposeFunction("reportBadgeStep", line => console.log(line));
  await page.evaluate(() => {
    new MutationObserver(changes => {
      for (const change of changes) for (const node of change.addedNodes) window.reportBadgeStep(node.textContent);
    }).observe(document.querySelector("#evidence"), { childList: true });
  });
  await page.locator("#check-full-badge-route").click();
  const report = page.locator("#report");
  await report.filter({ hasText: /全部通过|失败/ }).waitFor({ timeout: 300000 });
  assert.equal(await report.innerText(), "全部通过");

  const earned = () => page.evaluate(() => JSON.parse(localStorage.getItem("nemu-anniversary-v1")).achievements.earned);
  const played = () => page.evaluate(() => JSON.parse(localStorage.getItem("fufu-foreground-play-v1")).milliseconds);
  const catalogue = await page.evaluate(async () => {
    const { achievementDefinitions } = await import("/src/achievements.ts");
    return achievementDefinitions.map(entry => entry.id).sort();
  });
  assert.deepEqual((await earned()).sort(), catalogue.filter(id => !id.startsWith("days-")));
  // Large wall-clock jumps deliberately earn nothing. Advance the browser in
  // 10-second foreground intervals through the game's unmodified sampling timer.
  for (const days of [1, 3, 7]) {
    const id = "days-" + days;
    const target = days * 600000;
    let elapsed = await played();
    while (elapsed < target - 10000) {
      await page.clock.fastForward(10000);
      const next = await played();
      assert.ok(next > elapsed, "前台可见时累计时长没有增加");
      elapsed = next;
    }
    assert.ok(!(await earned()).includes(id), "提前解锁 " + id);
    await page.clock.fastForward(target - elapsed + 2200);
    assert.ok((await earned()).includes(id), "应在累计 " + days * 10 + " 分钟时解锁 " + id);
    console.log("前台 " + days * 10 + " 分钟，徽章已保存");
  }
  assert.deepEqual((await earned()).sort(), catalogue);
  await page.reload();
  const total = catalogue.length;
  await page.getByRole("tab", { name: "徽章与存档" }).click();
  await page.locator("[data-book-toggle]").click();
  await page.locator(".achievement-count strong").filter({ hasText: `${total} / ${total}` }).waitFor();
  await page.locator(".book-close").click();
  await page.getByRole("tab", { name: "地图", exact: true }).click();
  await page.locator('.scene-nav [data-scene="meadow"] .map-stamp').waitFor();
  assert.equal(await page.locator(".scene-nav button:visible").count(), 6);
  assert.deepEqual((await earned()).sort(), catalogue);
  assert.deepEqual(errors, []);
  console.log(`${width}px · 同档从 0 到 ${total}，刷新后仍为 ${total} 枚`);
  await page.close();

  // Repeat the reported sequence through native mouse/touch input on a fresh
  // page. Ask only for the same camera projection used to draw the two props.
  const walk = await browser.newPage(device);
  walk.on("pageerror", error => errors.push(String(error)));
  await walk.route(/^https:\/\/cdn\./, route => route.abort());
  await walk.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html");
  const press = async (selector) => {
    const node = walk.locator(selector).first();
    if (device.hasTouch) await node.tap();
    else await node.click();
  };
  const chooseProp = async id => {
    await walk.locator("#world").scrollIntoViewIfNeeded();
    const { x, y } = await walk.evaluate(id => window.contentQA.point(id), id);
    if (device.hasTouch) await walk.touchscreen.tap(x, y);
    else await walk.mouse.click(x, y);
  };
  await press(".enter-button");
  await walk.setViewportSize(device.hasTouch ? { width: 844, height: 390 } : { width: 827, height: 763 });
  await chooseProp("album");
  await press(".photo-book-photo");
  await press(".photo-original-back");
  await press(".game-album-reader .reader-close");
  await press('.scene-nav [data-scene="garden"]');
  await walk.waitForFunction(() => {
    const { scene, paused } = window.contentQA.snapshot();
    return scene === "garden" && !paused;
  });
  await walk.setViewportSize(device.viewport);
  await chooseProp("danmaku");
  await walk.locator(".cinema-hud").waitFor({ state: "visible" });
  assert.ok(await walk.evaluate(() => window.contentQA.snapshot().progress.achievements.earned.includes("memories")));
  await press(".cinema-leave");
  assert.deepEqual(errors, []);
  console.log("从小屋出生，" + (device.hasTouch ? "触屏" : "鼠标") + "点相册、单张照片、地图导航和大屏，自动寻路后盖章");
} finally {
  await browser?.close();
  await server.close();
  if (dirname(cache) === tempRoot) await rm(cache, { recursive: true, force: true });
}
