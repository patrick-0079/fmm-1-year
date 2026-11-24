import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createServer } from "vite";

// Run against the ordinary game in the exploration fixture's isolated save.
// PLAYWRIGHT_MODULE can point to a local playwright-core installation.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const width = Number(process.argv[2] || 1366);
const touch = width < 600;
const out = process.argv[3];
if (out) await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, logLevel: "error" });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined) });
  const context = await browser.newContext({
    viewport: { width, height: touch ? 844 : 940 }, hasTouch: touch,
    deviceScaleFactor: touch ? 2 : 1, reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const cdp = touch ? await context.newCDPSession(page) : undefined;
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("response", response => {
    if (response.url().startsWith(server.resolvedUrls.local[0]) && response.status() >= 400) errors.push(response.url());
  });
  await page.route(/^https:\/\/cdn\./, route => route.abort());
  await page.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html");
  async function enter() {
    await page.waitForFunction(() => window.contentQA?.ready());
    await page.locator(".enter-button").click();
    await page.locator("#world").scrollIntoViewIfNeeded();
  }
  await enter();
  const steps = await page.evaluate(async () => (await import("/src/town-workbench-steps.ts")).workbenchSteps);
  const state = () => page.evaluate(() => window.contentQA.snapshot().progress);
  const visit = (scene, id) => page.evaluate(([s, i]) => window.contentQA.visit(s, i), [scene, id]);
  const picture = async (name, selector = "#world") => {
    if (out) await page.locator(selector).screenshot({ path: join(out, width + "-" + name + ".png") });
  };
  const hit = async p => touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y);
  async function stand(scene, x, y) {
    await page.evaluate(([s, x, y]) => window.contentQA.visit(s, undefined, { x, y }), [scene, x, y]);
    assert.deepEqual(await page.evaluate(() => window.contentQA.snapshot().player), { x, y }, scene + " walkable test position");
  }
  const pixels = (x, y, w, h) => page.evaluate(([x, y, w, h]) => {
    const world = document.querySelector("#world"), bounds = world.getBoundingClientRect();
    const start = window.contentQA.pointAt(x, y), end = window.contentQA.pointAt(x + w, y + h);
    const scale = world.width / bounds.width;
    const sample = document.createElement("canvas");
    sample.width = w; sample.height = h;
    const c = sample.getContext("2d");
    c.drawImage(world, (start.x - bounds.left) * scale, (start.y - bounds.top) * scale,
      (end.x - start.x) * scale, (end.y - start.y) * scale, 0, 0, w, h);
    return Array.from(c.getImageData(0, 0, w, h).data);
  }, [x, y, w, h]);
  const difference = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
  async function walkTo(x, y) {
    await hit(await page.evaluate(([x, y]) => window.contentQA.pointAt(x, y), [x, y]));
    await page.waitForFunction(([x, y]) => {
      const p = window.contentQA.snapshot().player;
      return Math.hypot(p.x - x, p.y - y) < 6;
    }, [x, y], { timeout: 8000 });
  }
  for (const [shop, start, pane, opening, end] of [
    ["florist", 155, 176, 242, 213], ["radio", 325, 344, 281, 384],
  ]) {
    await stand("town-" + shop, start, 174);
    await page.locator("#world").focus();
    await page.keyboard.down("ArrowRight");
    try {
      await page.waitForFunction(x => window.contentQA.snapshot().player.x > x + 5, start);
      await page.waitForTimeout(420);
    } finally { await page.keyboard.up("ArrowRight"); }
    assert.ok((await page.evaluate(() => window.contentQA.snapshot().player.x)) < pane, shop + " glass stops the actor");
    await stand("town-" + shop, start, opening);
    await walkTo(end, opening);
  }
  await stand("town-maker", 222, 251);
  for (const [x, y] of [[224, 181], [380, 181], [380, 252], [222, 251]]) await walkTo(x, y);
  const tabletop = [280, 177, 17, 13], above = [279, 156, 20, 16], drawers = [279, 216, 19, 10];
  const [bareTop, bareAir, bareDrawer] = await Promise.all([pixels(...tabletop), pixels(...above), pixels(...drawers)]);
  await stand("town-maker", 289, 193);
  await picture("maker-back");
  assert.ok(difference(bareAir, await pixels(...above)) > 6, "actor is visible above the far side");
  assert.ok(difference(bareTop, await pixels(...tabletop)) < 5, "tabletop covers the actor's lower half");
  await stand("town-maker", 289, 249);
  await picture("maker-front");
  assert.ok(difference(bareDrawer, await pixels(...drawers)) > 8, "near actor covers the front of the table");
  await stand("town-hall", 300, 277);
  await walkTo(300, 201);
  console.log(width, "glass collision and passages, full circuit of worktable, museum aisle passed");
  async function activity(key, action, at) {
    const scene = "town-" + key;
    await visit(scene, scene + "-" + action);
    await page.locator("#world").scrollIntoViewIfNeeded();
    const point = await page.evaluate(at => window.contentQA.pointAt(...at), at);
    await hit(point);
    await page.locator(".activity-hud:visible").waitFor();
  }
  const close = () => page.locator(".activity-close:visible").click();
  async function collection(total) {
    await activity("hall", "extra", [300, 143]);
    assert.match(await page.locator(".collection-count").innerText(), new RegExp(total + " / 7"));
    assert.equal(await page.locator('.collection-state[data-collected="true"]').count(), total);
    await close();
    await picture("hall-" + total);
  }
  async function pointer(type, p) {
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
type: { down: "touchStart", move: "touchMove", up: "touchEnd" }[type],
        touchPoints: type === "up" ? [] : [{ x: p.x, y: p.y, id: 1, radiusX: 2, radiusY: 2 }]
});
    } else if (type === "down") { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
    else if (type === "move") await page.mouse.move(p.x, p.y);
    else await page.mouse.up();
  }
  async function perform(stage, key, secondChoice = touch) {
    const board = page.locator('.town-workbench[data-step="' + stage.id + '"]');
    await board.waitFor();
    if (stage.kind === "wait") return;
    const tool = stage.tools[(secondChoice && stage.tools.length > 1) ? 1 : 0];
    const rect = await board.locator(".town-workbench-surface").boundingBox();
    const onBoard = (x, y) => ({ x: rect.x + x * rect.width / 336, y: rect.y + y * rect.height / 134 });
    let from = onBoard(tool.at.x, tool.at.y), to = from;
    if (stage.kind === "dial" || stage.kind === "crank") {
      const angle = stage.kind === "dial" ? 55 : 361;
      from = onBoard(tool.at.x + 20, tool.at.y);
      await pointer("down", from);
      for (let i = 1; i <= 24; i++) {
        const theta = angle * Math.PI * i / (180 * 24);
        to = onBoard(tool.at.x + 20 * Math.cos(theta), tool.at.y + 20 * Math.sin(theta));
        await pointer("move", to);
      }
    } else {
      await pointer("down", from);
      if (stage.kind === "hold") await page.waitForTimeout(730);
      else {
        to = onBoard(stage.target.x, stage.target.y);
        await pointer("move", { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
        await pointer("move", to);
      }
    }
    await pointer("up", to);
    await board.waitFor({ state: "detached", timeout: 4500 }).catch(() => {
      throw Error(key + "/" + stage.id + " did not accept its " + (touch ? "touch" : "mouse") + " gesture");
    });
  }
  const main = {
florist: [422, 150], baker: [191, 131], maker: [331, 189], post: [523, 177],
    books: [105, 132], radio: [120, 145], hall: [536, 123]
};
  const secondary = {
florist: [107, 55], baker: [478, 114], maker: [89, 126], post: [79, 100],
    books: [477, 79], radio: [486, 155]
};
  await collection(0);
  for (const [i, key] of Object.keys(steps).entries()) {
    const scene = "town-" + key;
    await visit("town", scene + "-door");
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await page.waitForFunction(s => window.contentQA.snapshot().scene === s, scene);
    await picture(key);
    if (secondary[key]) {
      await activity(key, "extra", secondary[key]);
      assert.ok((await page.locator(".activity-status").innerText()).length > 6, key + " secondary action");
      if (key === "books") assert.equal(await page.getByRole("button", { name: "展开折页对照" }).count(), 0);
      await close();
    }
    await activity(key, "main", main[key]);
    await page.evaluate(async () => (await import("/src/town-workbench-art.ts")).prepareWorkbenchArt());
    await page.waitForFunction(() => {
      const canvas = document.querySelector(".town-workbench canvas");
      if (!canvas) return false;
      const rgb = canvas.getContext("2d").getImageData(4, 4, canvas.width - 8, 30).data;
      const colors = new Set();
      for (let i = 0; i < rgb.length; i += 32) colors.add((rgb[i] << 16) + (rgb[i + 1] << 8) + rgb[i + 2]);
      return colors.size > 180;
    });
    await picture(key + "-workbench", ".activity-hud");
    if (key === "florist") {
      const at = await page.locator('[data-tool="lilac"]').boundingBox();
      await hit({ x: at.x + at.width / 2, y: at.y + at.height / 2 });
      assert.equal(await page.locator(".town-workbench").getAttribute("data-step"), "petal");
      await close();
      assert.equal((await state()).townKeepsakes.items.length, 0);
      await activity(key, "main", main[key]);
    }
    for (const stage of steps[key]) await perform(stage, key);
    await page.locator('.town-workbench[data-step="ready"]').waitFor();
    const badge = "town-keepsake-" + key;
    assert.ok(!(await state()).achievements.earned.includes(badge), key + " unclaimed");
    assert.equal((await state()).townKeepsakes.items.length, i);
    await page.getByRole("button", { name: "收下", exact: true }).click();
    const earned = await state();
    assert.ok(earned.achievements.earned.includes(badge), badge);
    assert.ok(earned.townKeepsakes.items.includes(key));
    if (key === "radio") assert.equal(earned.townKeepsakes.radioTrack, touch ? "bells" : "creek");
    await close();
    if (key === "books") {
      await activity(key, "extra", secondary.books);
      await page.getByRole("button", { name: "展开折页对照" }).click();
      assert.match(await page.locator(".activity-status").innerText(), /青瓦/);
      await close();
    }
    await visit(scene, scene + "-exit");
    await page.locator("#world").focus(); await page.keyboard.press("e");
    await page.waitForFunction(() => window.contentQA.snapshot().scene === "town");
    if (i === 2) await collection(3);
    console.log(width, key, "entrance, controls, claim, exit passed");
  }
  await collection(7);
  await page.reload(); await enter(); await collection(7);
  const saved = await state();
  assert.equal(new Set(saved.townKeepsakes.items).size, 7);
  assert.equal(saved.achievements.earned.filter(id => id.startsWith("town-keepsake-")).length, 7);
  await activity("radio", "main", main.radio);
  for (const stage of steps.radio) await perform(stage, "radio", !touch);
  await page.getByRole("button", { name: "收下", exact: true }).click();
  assert.deepEqual((await state()).townKeepsakes, saved.townKeepsakes, "recording again preserves the first take");
  await page.getByRole("button", { name: "查看纪念物" }).click();
  assert.match(await page.locator(".bag-town-detail").innerText(), touch ? /檐铃/ : /溪水/);
  await page.getByRole("button", { name: "返回小镇小物" }).click();
  assert.equal(await page.locator(".bag-town-grid button:enabled").count(), 7);
  assert.deepEqual(errors, []);
  console.log(width, "seven paintings and workbenches, gallery 0/3/7, reload, replay and inventory passed");
} finally {
  await browser?.close();
  await server.close();
}
