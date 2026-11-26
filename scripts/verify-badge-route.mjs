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
    const targetMinutes = days * 24;
    const target = targetMinutes * 60_000;
    let elapsed = await played();
    while (elapsed < target - 10000) {
      await page.clock.fastForward(10000);
      const next = await played();
      assert.ok(next > elapsed, "前台可见时累计时长没有增加");
      elapsed = next;
    }
    assert.ok(!(await earned()).includes(id), "提前解锁 " + id);
    await page.clock.fastForward(target - elapsed + 2200);
    assert.ok((await earned()).includes(id), "应在累计 " + targetMinutes + " 分钟时解锁 " + id);
    console.log("前台 " + targetMinutes + " 分钟，徽章已保存");
  }
  assert.deepEqual((await earned()).sort(), catalogue);
  await page.reload();
  const total = catalogue.length;
  await page.getByRole("tab", { name: "徽章", exact: true }).click();
  await page.locator(".achievement-count strong").filter({ hasText: `${total} / ${total}` }).waitFor();
  await page.getByRole("tab", { name: "地图", exact: true }).click();
  await page.locator('.scene-nav [data-scene="meadow"] .map-stamp').waitFor();
  assert.equal(await page.locator(".scene-nav button:visible").count(), 6);
  assert.deepEqual((await earned()).sort(), catalogue);
  assert.deepEqual(errors, []);
  console.log(`${width}px · 同档从 0 到 ${total}，刷新后仍为 ${total} 枚`);

  // Use the meadow unlocked by the seven real pickups above, including on a cold return.
  await page.getByRole("button", { name: /继续上次的冒险/ }).click();
  await page.setViewportSize({ width: 1413, height: 763 });
  const meadow = page.getByRole("navigation", { name: "地图导航" }).getByRole("button", { name: "花海", exact: true });
  await meadow.locator(".map-note").waitFor({ state: "visible" });
  assert.equal(await meadow.locator(".map-note").innerText(), "拾落星 · 看星空");
  const fitsRail = await page.locator(".scene-nav").evaluate(nav => {
    const bounds = nav.getBoundingClientRect();
    const cards = [...nav.querySelectorAll("button:not([hidden])")].map(button => button.getBoundingClientRect());
    return cards.length === 6 && cards.every((box, i) => box.height >= 44 && box.bottom <= bounds.bottom &&
      Math.abs(box.left - cards[0].left) < 1 && (!i || cards[i - 1].bottom <= box.top));
  });
  assert.ok(fitsRail, "全部六张地图卡应在同一侧栏内可见");
  await meadow.click();
  await page.locator('.scene-wrap[data-current-map="meadow"]').waitFor();
  assert.equal(await meadow.getAttribute("aria-pressed"), "true");
  await page.reload();
  await page.getByRole("button", { name: /继续上次的冒险/ }).click();
  await page.locator('.scene-wrap[data-current-map="meadow"]').waitFor();
  assert.equal(await meadow.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator('.scene-nav [aria-pressed="true"]').count(), 1);
  if (process.argv[3]) await page.locator(".game-viewport").screenshot({ path: process.argv[3] });
  const garden = page.getByRole("button", { name: "周年花园", exact: true });
  await garden.click();
  await page.locator('.scene-wrap[data-current-map="garden"]').waitFor();
  assert.equal(await garden.getAttribute("aria-pressed"), "true");
  assert.equal(await meadow.getAttribute("aria-pressed"), "false");
  console.log("六张卡片同栏，花海往返、当前位置与花海续档通过");
  await page.close();

  // Repeat the reported sequence through native mouse/touch input on a fresh
  // page. Ask only for the same camera projection used to draw the two props.
  const walk = await browser.newPage(device);
  walk.on("pageerror", error => errors.push(String(error)));
  await walk.route(/^https:\/\/cdn\./, route => route.abort());
  await walk.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html", { waitUntil: "domcontentloaded" });
  const press = async (selector) => {
    const node = walk.locator(selector).first();
    if (device.hasTouch) await node.tap();
    else await node.click();
  };
  const checkTapeKeepsake = async (status) => {
    await press(".bag-toggle");
    await press('.bag-tabs [data-tab="keepsakes"]');
    const bag = walk.locator('.inventory-panel[data-tab="keepsakes"]');
    await bag.locator(".bag-keepsakes").waitFor({ state: "visible" });
    const tape = bag.locator("[data-garden-tape]");
    if (status) {
      assert.equal(await tape.count(), 1);
      assert.ok(await tape.isVisible());
      const text = await tape.innerText();
      assert.ok(text.includes("周年录像带") && text.includes(status), text);
      assert.ok(await tape.evaluate(card => {
        const action = 'button, a[href], [role="button"], [tabindex="0"]';
        return !card.matches(action) && !card.querySelector(action);
      }), "录像带纪念卡只展示收藏状态");
    } else {
      assert.equal(await tape.count(), 0, "取带前背包里不应出现录像带");
    }
    await press(".bag-close");
  };
  const chooseProp = async id => {
    const canvas = walk.locator("#world");
    await canvas.scrollIntoViewIfNeeded();
    // Rotation can realign the toolbar. Use coordinates on the canvas, so a page
    // scroll between measuring the prop and dispatching the tap keeps the same target.
    const position = await canvas.evaluate((el, id) => {
      const point = window.contentQA.point(id), bounds = el.getBoundingClientRect();
      return { x: point.x - bounds.left, y: point.y - bounds.top };
    }, id);
    if (device.hasTouch) await canvas.tap({ position });
    else await canvas.click({ position });
  };
  await press(".enter-button");
  await checkTapeKeepsake(null);
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
  await walk.locator(".activity-status").filter({ hasText: "小叶子" }).waitFor();
  assert.ok(await walk.locator(".cinema-hud").isHidden());
  await press(".activity-close");
  const arrive = (scene, id) => walk.evaluate(([scene, id]) => window.contentQA.visit(scene, id), [scene, id]);
  const interact = async () => {
    if (device.hasTouch) await press(".touch-interact");
    else { await walk.locator("#world").focus(); await walk.keyboard.press("e"); }
  };
  await arrive("garden", "xiaoye-plush");
  await interact();
  const clue = walk.getByRole("button", { name: "周年录像带在哪里？", exact: true });
  await clue.click();
  assert.match(await walk.locator(".activity-status").innerText(), /七色花[\s\S]*帐篷/);
  await press(".activity-close");
  const flowers = await walk.evaluate(async () => (await import("/src/rainbow-flowers.ts")).rainbowFlowers);
  for (const { scene, id } of flowers) {
    await arrive(scene, id);
    await interact();
    await walk.waitForFunction(id => window.contentQA.snapshot().progress.rainbowFlowers.includes(id), id);
  }
  await arrive("garden", "prism-arch");
  await interact();
  await walk.waitForFunction(() => window.contentQA.snapshot().scene === "meadow" && !window.contentQA.snapshot().paused);
  await arrive("meadow", "meadow-garden-tape");
  if (device.hasTouch) await chooseProp("meadow-garden-tape");
  else await interact();
  await walk.waitForFunction(() => window.contentQA.snapshot().progress.gardenTape === "carried");
  assert.ok(await walk.evaluate(() => window.contentQA.snapshot().progress.achievements.earned.includes("garden-tape")));
  await checkTapeKeepsake("已拾取");
  await walk.reload({ waitUntil: "domcontentloaded" });
  await press(".enter-button");
  await checkTapeKeepsake("已拾取");
  await arrive("garden", "danmaku");
  await chooseProp("danmaku");
  const insert = walk.getByRole("button", { name: "放入录像带", exact: true });
  if (device.hasTouch) await insert.tap();
  else await insert.click();
  await walk.locator(".cinema-hud").waitFor({ state: "visible" });
  assert.ok(await walk.evaluate(() => window.contentQA.snapshot().progress.achievements.earned.includes("memories")));
  await press(".cinema-leave");
  await checkTapeKeepsake("已放入放映机");
  await walk.reload({ waitUntil: "domcontentloaded" });
  await press(".enter-button");
  await checkTapeKeepsake("已放入放映机");
  assert.deepEqual(errors, []);
  console.log("相册、周年海报、小叶子线索、七色花门、帐篷取带、放映与勋章均通过。背包纪念卡在拾取和插带后分别刷新仍显示对应状态。");
} finally {
  await browser?.close();
  await server.close();
  if (dirname(cache) === tempRoot) await rm(cache, { recursive: true, force: true });
}
