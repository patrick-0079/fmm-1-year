import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "vite";

// Hold both player actions at the same save boundary until both UIs accepted them.
async function simultaneousGardenActions(page, actions) {
  await page.evaluate(() => new Promise(held => {
    void navigator.locks.request("fufu-garden-bag-v1", () => new Promise(release => { window.qaReleaseGarden = release; held(); }));
  }));
  try { await Promise.all(actions.map(act => act())); }
  finally { await page.evaluate(() => window.qaReleaseGarden()); }
}

async function verifyFlowerReminder(browser, url, epoch) {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  try {
    await page.route(/^https:\/\//, route => route.abort());
    await page.clock.install({ time: epoch });
    await page.goto(url);
    await page.waitForFunction(() => window.contentQA?.ready());
    await page.evaluate(async () => {
      const { rainbowFlowers } = await import("/src/rainbow-flowers.ts");
      const rose = rainbowFlowers[0];
      const ctx = document.querySelector("#world").getContext("2d");
      const gradient = ctx.createRadialGradient.bind(ctx);
      window.qaRoseLit = false;
      ctx.createRadialGradient = (...args) => {
        if (args[0] === rose.x && args[3] === rose.x && args[5] === 17) window.qaRoseLit = true;
        return gradient(...args);
      };
    });
    const start = epoch + 120_000;
    await page.clock.pauseAt(start);
    await page.locator(".enter-button").evaluate(button => button.click());
    await page.clock.runFor(80);
    async function visitGarden() {
      await page.evaluate(() => { void window.contentQA.visit("garden", "prism-rose"); });
      for (let i = 0; i < 100; i++) {
        await page.clock.runFor(50);
        if (await page.evaluate(() => window.contentQA.snapshot().scene === "garden")) return;
      }
      throw Error("周年庭院未就绪");
    }
    async function litAt(time) {
      const now = await page.evaluate(() => { window.qaRoseLit = false; return Date.now(); });
      await page.clock.fastForward(time - now);
      await page.clock.runFor(50);
      return page.evaluate(() => window.qaRoseLit);
    }
    await visitGarden();
    assert.equal(await litAt(start + 31_000), true, "首次探索 30 秒后，七色花没有亮起");
    await litAt(start + 50_000);
    await page.evaluate(() => { document.querySelector(".reset-button").click(); document.querySelector(".reset-confirm").click(); });
    await page.clock.runFor(120);
    assert.equal(await page.evaluate(() => window.contentQA.snapshot().scene), "room");
    const restarted = await page.evaluate(() => Date.now());
    await visitGarden();
    assert.equal(await litAt(start + 61_000), false, "重新开档后七色花沿用了上一局的提示时间");
    assert.equal(await litAt(restarted + 31_000), true, "新一局 30 秒后七色花没有亮起");
    assert.equal(await litAt(restarted + 34_000), false, "七色花的三秒提示未收起");
    console.log("七色花在新旧两局均从探索开始计时，30 秒亮起、3 秒后收起");
  } finally { await page.close(); }
}

async function verifyForeground(context, first, second) {
  const key = "fufu-foreground-play-v1";
  const total = () => second.evaluate(key => JSON.parse(localStorage.getItem(key))?.milliseconds ?? 0, key);
  async function owner(expected, previous = null) {
    const handle = await second.waitForFunction(async ({ key, expected, previous }) => {
      const lock = (await navigator.locks.query()).held.find(entry => entry.name === key);
      return expected ? lock && lock.clientId !== previous && lock.clientId : !lock;
    }, { key, expected, previous });
    return handle.jsonValue();
  }
  // Headless tabs can both stay visible. Drive the real visibility listener and
  // use browser offline events and actual navigations for disconnect and handoff.
  function hide(page, hidden) {
    return page.evaluate(hidden => {
      Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  }
  await context.setOffline(true);
  await owner(false);
  const initial = await total();
  await delay(2200);
  assert.equal(await total(), initial, "断网期间累计了陪伴时长");
  await Promise.all([hide(first, true), hide(second, true)]);
  await context.setOffline(false);
  await second.waitForFunction(() => navigator.onLine);
  await delay(2200);
  assert.equal(await total(), initial, "两个页面都在后台时仍累计时长");
  await owner(false);

  const start = performance.now();
  await hide(first, false);
  const originalOwner = await owner(true);
  await hide(second, false);
  await delay(2300);
  await first.goto("about:blank");
  await owner(true, originalOwner);
  await delay(900);
  await context.setOffline(true);
  const elapsed = performance.now() - start;
  await owner(false);
  const credited = await total() - initial;
  assert.ok(Math.abs(credited - elapsed) < 550, `两页接力，实过 ${Math.round(elapsed)} ms，累计 ${credited} ms`);

  await context.setOffline(false);
  await owner(true);
  await second.reload();
  await second.locator(".enter-button").waitFor();
  await owner(false);
  const beforeEntry = await total();
  await delay(2200);
  assert.equal(await total(), beforeEntry, "开始页累计了陪伴时长");
  await second.locator(".enter-button").click();
  await owner(true);
  await second.waitForFunction(({ key, before }) => JSON.parse(localStorage.getItem(key)).milliseconds > before, { key, before: beforeEntry });
  console.log(`前台计时通过后台、断网、开始页和刷新检查。两页接力实过 ${Math.round(elapsed)} ms，计入 ${credited} ms`);
}

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const server = await createServer({ server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, logLevel: "error" });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined) });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.route(/^https:\/\//, route => route.abort());
  await context.addInitScript(() => { window.qaUseBrowserStorage = true; });
  const epoch = Date.UTC(2026, 11, 2);
  await context.clock.setFixedTime(epoch);
  const errors = [];
  async function open() {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html");
    await page.locator(".enter-button").click();
    return page;
  }
  async function approach(page, scene, id) {
    const close = page.locator(".activity-close");
    if (await close.isVisible()) await close.click();
    await page.evaluate(([scene, id]) => window.contentQA.visit(scene, id), [scene, id]);
  }
  const use = page => page.locator("#world").press("e");
  const clock = (page, phase, label) => page.locator('.time-pill[data-phase="' + phase + '"]').filter({ hasText: label }).waitFor();
  const bag = page => page.evaluate(() => JSON.parse(localStorage.getItem("fufu-garden-bag-v1")));
  const apples = (page, count) => page.locator(".bag-count").filter({ hasText: "苹果 " + count + " ·" }).waitFor({ state: "attached" });

  const first = await open(), second = await open();
  await Promise.all([approach(first, "garden", "apple"), approach(second, "garden", "apple")]);
  await use(first);
  await Promise.all([apples(first, 1), apples(second, 1)]);
  await Promise.all([first.getByRole("button", { name: "再拿一颗" }).click(), use(second)]);
  await Promise.all([apples(first, 3), apples(second, 3)]);
  await context.clock.setFixedTime(epoch + 959_999);
  await clock(second, "night", "23:59");
  await approach(second, "garden", "apple");
  assert.notEqual(await second.evaluate(() => window.contentQA.snapshot().activeCue), "apple");
  await approach(second, "garden", "firefly");
  await use(second);
  await first.locator(".bag-count").filter({ hasText: "星屑 1" }).waitFor({ state: "attached" });
  assert.deepEqual((await bag(second)).picked, { "1:garden:apple": 3, "1:garden:firefly": 1 });

  await context.clock.setFixedTime(epoch + 960_000);
  await clock(first, "night", "00:00");
  await Promise.all([approach(first, "garden", "apple"), approach(second, "challenge", "apple")]);
  await Promise.all([use(first), use(second)]);
  await Promise.all([apples(first, 5), apples(second, 5)]);
  await approach(first, "garden", "firefly");
  await use(first);
  await second.locator(".bag-count").filter({ hasText: "星屑 2" }).waitFor({ state: "attached" });
  assert.deepEqual((await bag(first)).picked, { "1:garden:apple": 3, "1:garden:firefly": 1,
    "2:garden:apple": 1, "2:challenge:apple": 1, "2:garden:firefly": 1 });
  console.log("两个标签争取最后两颗苹果、午夜两座花园分别补货、同时采集并保留总数均通过");

  await approach(second, "town-radio", "town-radio-extra");
  await approach(first, "challenge", "rest");
  await use(first);
  await first.getByRole("button", { name: "坐着等到下一时段" }).evaluate(button => { button.click(); button.click(); });
  await Promise.all([clock(first, "dawn", "05:00"), clock(second, "dawn", "05:00")]);
  await use(second);
  await second.locator(".activity-status").filter({ hasText: "已收播" }).waitFor();
  await second.reload();
  await second.locator(".enter-button").click();
  await clock(second, "dawn", "05:00");
  await apples(second, 5);
  await context.clock.setFixedTime(epoch + 961_000);
  await Promise.all([clock(first, "dawn", "05:01"), clock(second, "dawn", "05:01")]);
  await Promise.all([approach(first, "challenge", "rest"), approach(second, "challenge", "rest")]);
  await Promise.all([use(first), use(second)]);
  const waitOnBench = page => page.getByRole("button", { name: "坐着等到下一时段" }).click();
  await simultaneousGardenActions(first, [() => waitOnBench(first), () => waitOnBench(second)]);
  for (const page of [first, second]) {
    await page.locator(".activity-status").filter({ hasText: "伸个懒腰" }).waitFor();
    await clock(page, "day", "08:00");
  }
  console.log("双击与两页同时休息只到下一个时段，电台换班、刷新续时和采集记录均通过");
  await Promise.all([approach(first, "garden", "apple"), approach(second, "garden", "apple")]);
  await use(first);
  await Promise.all([apples(first, 6), apples(second, 6)]);
  await simultaneousGardenActions(first, [
    () => first.getByRole("button", { name: "再拿一颗" }).click(), () => use(second),
  ]);
  const receipts = await Promise.all([first, second].map(async page => {
    const status = page.locator(".activity-status").filter({ hasText: /还剩 0 颗|苹果拿完啦/ });
    await status.waitFor();
    return status.innerText();
  }));
  assert.equal(receipts.filter(text => text.includes("还剩 0 颗")).length, 1);
  await Promise.all([apples(first, 7), apples(second, 7)]);
  assert.equal((await bag(first)).picked["2:garden:apple"], 3);
  console.log("两页同时拿最后一颗苹果，仅一页收获，另一页看到果篮已空");
  await verifyForeground(context, first, second);
  assert.deepEqual(errors, []);
  await context.close();
  await verifyFlowerReminder(browser, server.resolvedUrls.local[0] + "tests/exploration-fixture.html", epoch);
} finally {
  await browser?.close();
  await server.close();
}
