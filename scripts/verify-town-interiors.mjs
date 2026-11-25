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
  await context.addInitScript(() => { window.qaUseBrowserStorage = true; });
  const page = await context.newPage();
  const cdp = touch ? await context.newCDPSession(page) : undefined;
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("response", response => {
    if (response.url().startsWith(server.resolvedUrls.local[0]) && response.status() >= 400) errors.push(response.url());
  });
  await page.route(/^https:\/\/cdn\./, route => route.abort());
  await page.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html");
  async function enter(tab = page) {
    await tab.waitForFunction(() => window.contentQA?.ready());
    await tab.locator(".enter-button").click();
    await tab.locator("#world").scrollIntoViewIfNeeded();
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
  async function phase(name) {
    await page.locator(".debug-trigger").click();
    await page.locator('[data-debug="time:' + name + '"]').click();
    await page.locator(".debug-close").click();
    await page.waitForFunction(name => document.querySelector(".time-pill").dataset.phase === name, name);
  }
  const windowSamples = { florist: [61,91], baker: [277,66], maker: [266,85], post: [372,62], books: [452,88], radio: [437,70], hall: [301,62] };
  const previous = {};
  for (const name of ["day", "dusk", "night"]) {
    await phase(name);
    for (const [room, [x, y]] of Object.entries(windowSamples)) {
      await visit("town-" + room);
      const glass = await pixels(x, y, 3, 3);
      if (previous[room]) assert.ok(difference(previous[room], glass) > 3, room + " rendered " + name + " window");
      previous[room] = glass;
      if (name !== "day") await picture(room + "-window-" + name);
    }
  }
  // Compare the same patch of map before and after the player walks behind the prop.
  for (const [room, time, size, poses] of [
    ["baker", "day", 3, [
      [178,281,[176,278],[175,269]], [61,279,[58,252],[59,244]],
      [50,235,[55,208],[44,207]], [300,124,[306,96],[295,98]],
      [85,238,[77,209],[81,204]],
    ]],
    ["radio", "dusk", 2, [[193,145,[198,115],[195,109]]]],
    ["radio", "day", 1, [[107,121,[110,114],[113,110]]]],
    ["hall", "night", 2, [[111,124,[108,108],[109,100]]]],
    ["books", "dawn", 2, [
      [181,131,[191,114],[187,112]], [557,184,[553,170],[559,180]],
    ]],
  ]) {
    await phase(time);
    const scene = "town-" + room;
    for (const [x, y, solid, air] of poses) {
      await stand(scene, 300, 340);
      const floor = await pixels(...air, size, size), prop = await pixels(...solid, size, size);
      await stand(scene, x, y);
      assert.ok(difference(floor, await pixels(...air, size, size)) > 7, scene + " character visible at " + air);
      assert.ok(difference(prop, await pixels(...solid, size, size)) < 5, scene + " furniture covers the character at " + solid);
      await picture(room + "-" + x + "-" + y);
    }
  }
  for (const time of ["dawn", "day", "dusk", "night"]) {
    await phase(time);
    await visit("town-florist", "town-florist-extra");
    await page.locator("#world").scrollIntoViewIfNeeded();
    const beam = [90,32,37,6], rail = [93,60,28,2];
    const [closedBeam, closedRail] = await Promise.all([pixels(...beam), pixels(...rail)]);
    await hit(await page.evaluate(() => window.contentQA.pointAt(107,55)));
    await page.getByRole("button", { name: "放回窗把" }).waitFor();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.ok(difference(closedBeam, await pixels(...beam)) < 3, time + " open sash clears the lintel");
    assert.ok(difference(closedRail, await pixels(...rail)) > 9, time + " raised rail is visible inside the jamb");
    await picture("florist-vent-" + time);
    await page.getByRole("button", { name: "放回窗把" }).click();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.ok(difference(closedRail, await pixels(...rail)) < 3, time + " sash returned to its closed position");
  }
  await phase("day");
  async function overlay(command, layersOn, collisionOn) {
    await page.locator(".debug-trigger").click();
    const layers = page.locator('[data-debug="layers"]'), collision = page.locator('[data-debug="collision"]');
    const [a, b] = await Promise.all([collision.boundingBox(), layers.boundingBox()]);
    assert.ok(b.x >= a.x + a.width - 1 && Math.abs(b.y - a.y) < 3, "layer toggle is to the right of collision");
    await page.locator('[data-debug="' + command + '"]').click();
    assert.equal(await layers.getAttribute("aria-pressed"), String(layersOn));
    assert.equal(await collision.getAttribute("aria-pressed"), String(collisionOn));
    await page.locator(".debug-close").click();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  await stand("town-baker", 300, 340);
  const edge = [76,198,11,22], icing = [69,214,4,3];
  const [bareEdge, bareIcing] = await Promise.all([pixels(...edge), pixels(...icing)]);
  await overlay("layers", true, false);
  const traced = await pixels(...edge);
  assert.ok(difference(bareEdge, traced) > 2, "actual cake edge is outlined");
  assert.ok(difference(bareIcing, await pixels(...icing)) < 3, "solid cake interior stays clear of debug ink");
  await stand("town-baker", 85, 238);
  await picture("baker-85-238-layers");
  await stand("town-baker", 300, 340);
  await overlay("collision", true, true);
  assert.ok(difference(bareEdge, await pixels(...edge)) > 2);
  await overlay("layers", false, true);
  assert.ok(difference(bareEdge, await pixels(...edge)) < 3, "collision alone draws no cake silhouette");
  await overlay("collision", false, false);
  assert.ok(difference(bareEdge, await pixels(...edge)) < 3);
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
  const emptyCells = {};
  async function collection(total) {
    await activity("hall", "extra", [300, 143]);
    assert.match(await page.locator(".collection-count").innerText(), new RegExp(total + " / 7"));
    assert.equal(await page.locator('.collection-state[data-collected="true"]').count(), total);
    await close();
    await stand("town-hall", 300, 327);
    const cells = await page.evaluate(async () => (await import("/src/town-interiors.ts")).townInteriors["town-hall"].art.collection);
    const owned = (await state()).townKeepsakes.items;
    for (const [key, [x, y, w, h]] of Object.entries(cells)) {
      const cell = await pixels(x + 2, y + 2, w - 4, h - 4);
      if (!total) emptyCells[key] = cell;
      else {
        const changed = difference(cell, emptyCells[key]);
        assert.ok(owned.includes(key) ? changed > 1.5 : changed < 2, key + " display cell at " + total + "/7: " + changed);
      }
    }
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
  async function iconPixels(selector, tab = page) {
    await tab.waitForFunction(selector => {
      const c = document.querySelector(selector)?.getContext("2d");
      return c && c.getImageData(0, 0, 48, 52).data.some((v, i) => i % 4 === 3 && v > 200);
    }, selector);
    return tab.locator(selector).evaluate(canvas =>
      Array.from(canvas.getContext("2d").getImageData(0, 0, 48, 52).data));
  }
  function sameIcon(actual, expected, message) {
    const count = actual.reduce((n, value, i) => n + Number(value !== expected[i]), 0);
    assert.equal(count, 0, message + "; different channels: " + count + ", mean difference: " + difference(actual, expected).toFixed(3));
  }
  const received = {};
  const choiceFor = (key, alternate) => ({ florist: alternate ? "cream" : "lilac", post: alternate ? "lamps" : "flags", radio: alternate ? "bells" : "creek" })[key];
  async function verifyFinishedPiece(room, alternate = touch) {
    await page.locator('.town-workbench[data-step="ready"]').waitFor();
    const choice = choiceFor(room, alternate);
    const matches = await page.evaluate(async ([room, choice]) => {
      const { default: tools } = await import("/src/town-workbench-frames.json");
      const { default: prizes } = await import("/src/town-keepsake-frames.json");
      const load = async name => { const image = new Image(); image.src = "/src/assets/town-interiors/" + name + ".webp"; await image.decode(); return image; };
      const [workbench, souvenirs] = await Promise.all([load("workbench"), load("keepsakes")]);
      const board = document.querySelector(".town-workbench canvas"), reference = document.createElement("canvas");
      reference.width = board.width; reference.height = board.height;
      const c = reference.getContext("2d"); c.scale(2, 2); c.imageSmoothingQuality = "high";
      c.drawImage(workbench, ...tools[room], 0, 0, 336, 134);
      const [sx, sy, w, h, x, y] = prizes[room + "-" + choice] ?? prizes[room];
      c.drawImage(souvenirs, sx, sy, w, h, 168 + x, 67 + y, w / 3, h / 3);
      const a = c.getImageData(0, 0, board.width, board.height).data;
      const b = board.getContext("2d").getImageData(0, 0, board.width, board.height).data;
      return a.every((value, index) => value === b[index]);
    }, [room, choice]);
    assert.ok(matches, room + " finished workbench shows the collected sprite and selected design");
  }
  async function expectedVariant(room, choice) {
    return page.evaluate(async ([room, choice]) => {
      const { default: frames } = await import("/src/town-keepsake-frames.json");
      const sprite = new Image();
      sprite.src = "/src/assets/town-interiors/keepsakes.webp";
      await sprite.decode();
      const [sx, sy, w, h, x, y] = frames[room + "-" + choice] ?? frames[room];
      const canvas = document.createElement("canvas");
      canvas.width = 48; canvas.height = 52;
      const c = canvas.getContext("2d", { willReadFrequently: true }), scale = 44 / { florist: 112, post: 145, radio: 139 }[room];
      c.imageSmoothingQuality = "high";
      c.drawImage(sprite, sx, sy, w, h, 24 + x * scale, 26 + y * scale, w * scale / 3, h * scale / 3);
      return Array.from(c.getImageData(0, 0, 48, 52).data);
    }, [room, choice]);
  }
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
    await verifyFinishedPiece(key);
    const badge = "town-keepsake-" + key;
    assert.ok(!(await state()).achievements.earned.includes(badge), key + " unclaimed");
    assert.equal((await state()).townKeepsakes.items.length, i);
    await page.getByRole("button", { name: "收下", exact: true }).click();
    const earned = await state();
    assert.ok(earned.achievements.earned.includes(badge), badge);
    assert.ok(earned.townKeepsakes.items.includes(key));
    if (key === "radio") assert.equal(earned.townKeepsakes.radioTrack, touch ? "bells" : "creek");
    if (key === "florist" || key === "post") assert.equal(earned.townKeepsakes.designs[key].choice, choiceFor(key, touch));
    received[key] = await iconPixels(".dialogue-portrait");
    if (choiceFor(key, touch)) sameIcon(received[key], await expectedVariant(key, choiceFor(key, touch)), key + " first selected variant");
    await page.getByRole("button", { name: "查看纪念物" }).click();
    sameIcon(await iconPixels(".bag-town-detail canvas"), received[key], key + " receipt and bag use identical pixels");
    if (choiceFor(key, touch)) await picture(key + "-" + choiceFor(key, touch), ".bag-town-detail");
    await page.locator(".bag-close").click();
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
  // A saved shop must wait for the shared inventory illustration before opening.
  await visit("town-baker");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("fufu-journey-v1"))?.scene === "town-baker");
  const artworkSeen = Promise.withResolvers(), artworkReady = Promise.withResolvers();
  const prizeRequest = /\/src\/assets\/town-interiors\/keepsakes\.webp(?:\?.*)?$/;
  await page.route(prizeRequest, async route => {
    if (route.request().resourceType() === "image") {
      artworkSeen.resolve();
      await artworkReady.promise;
    }
    await route.continue();
  });
  const startX = await page.evaluate(() => window.contentQA.snapshot().player.x);
  await page.locator("#world").focus();
  await page.keyboard.down("ArrowLeft");
  try {
    await page.waitForFunction(x => window.contentQA.snapshot().player.x < x - 5, startX);
  } finally {
    await page.keyboard.up("ArrowLeft");
  }
  const lastPosition = await page.evaluate(() => window.contentQA.snapshot().player);
  await page.reload({ waitUntil: "domcontentloaded" });
  await artworkSeen.promise;
  await page.waitForFunction(() => {
    const meter = document.querySelector(".entry-progress");
    return meter?.value === meter?.max - 1;
  });
  assert.ok(await page.locator(".enter-button").isDisabled());
  artworkReady.resolve();
  await enter();
  assert.deepEqual(await page.evaluate(() => window.contentQA.snapshot().player), lastPosition, "moving and reloading restores the exact position");
  await page.locator(".bag-toggle").click();
  await page.locator('[data-tab="keepsakes"]').click();
  await page.locator("[data-town-keepsakes]").click();
  for (const key of Object.keys(steps)) sameIcon(await iconPixels('canvas[data-town-icon="' + key + '"]'), received[key], key + " cold inventory");
  await page.unroute(prizeRequest);
  await page.locator(".bag-close").click();
  await phase("day");
  await collection(7);
  const saved = await state();
  assert.equal(new Set(saved.townKeepsakes.items).size, 7);
  assert.equal(saved.achievements.earned.filter(id => id.startsWith("town-keepsake-")).length, 7);
  const shelf = await page.evaluate(async () => (await import("/src/town-interiors.ts")).townInteriors["town-hall"].art.collection);
  const firstShelf = {};
  for (const key of ["florist","post","radio","baker"]) firstShelf[key] = await pixels(...shelf[key]);
  const sibling = await context.newPage();
  await sibling.route(/^https:\/\/cdn\./, route => route.abort());
  await sibling.goto(server.resolvedUrls.local[0] + "tests/exploration-fixture.html"); await enter(sibling);
  await sibling.locator(".bag-toggle").click();
  await sibling.locator('[data-tab="keepsakes"]').click();
  await sibling.locator("[data-town-keepsakes]").click();
  await page.bringToFront();
  for (const key of ["florist", "post", "radio"]) {
    const choice = choiceFor(key, !touch), current = await state();
    await activity(key, "main", main[key]);
    for (const stage of steps[key]) await perform(stage, key, !touch);
    await verifyFinishedPiece(key, !touch);
    assert.deepEqual((await state()).townKeepsakes, current.townKeepsakes, key + " finished remake waits for claim");
    await page.getByRole("button", { name: "收下", exact: true }).click();
    const remade = await state(), book = remade.townKeepsakes;
    assert.equal(key === "radio" ? book.radioTrack : book.designs[key].choice, choice);
    assert.deepEqual(book.items, saved.townKeepsakes.items);
    assert.deepEqual(remade.achievements.earned, saved.achievements.earned);
    const expected = await expectedVariant(key, choice);
    assert.ok(difference(expected, received[key]) > 1, key + " variants are visually distinct");
    received[key] = expected;
    sameIcon(await iconPixels(".dialogue-portrait"), expected, key + " replay receipt");
    await page.getByRole("button", { name: "查看纪念物" }).click();
    sameIcon(await iconPixels(".bag-town-detail canvas"), expected, key + " remade bag detail");
    await picture(key + "-" + choice, ".bag-town-detail");
    await sibling.waitForFunction(([key, expected]) => {
      const c = document.querySelector('canvas[data-town-icon="' + key + '"]').getContext("2d");
      return c.getImageData(0, 0, 48, 52).data.every((v, i) => v === expected[i]);
    }, [key, expected], { polling: 100 });
    if (key === "radio") assert.match(await page.locator(".bag-town-detail").innerText(), touch ? /溪水/ : /檐铃/);
    await page.locator(".bag-close").click();
  }
  await sibling.close();
  await stand("town-hall", 300, 327);
  for (const key of ["florist","post","radio"]) assert.ok(difference(firstShelf[key], await pixels(...shelf[key])) > .15, key + " remade shelf illustration");
  assert.ok(difference(firstShelf.baker, await pixels(...shelf.baker)) < 1, "other shelf items keep their artwork");
  await page.reload(); await enter();
  await page.locator(".bag-toggle").click();
  await page.locator('[data-tab="keepsakes"]').click();
  await page.locator("[data-town-keepsakes]").click();
  assert.equal(await page.locator(".bag-town-grid button:enabled").count(), 7);
  for (const key of Object.keys(steps)) sameIcon(await iconPixels('canvas[data-town-icon="' + key + '"]'), received[key], key + " persisted icon");
  await page.locator(".bag-close").click();
  await page.getByRole("tab", { name: "徽章", exact: true }).click();
  await page.locator('[data-book-chapter="explore"]').click();
  for (const key of ["florist","post","radio"]) {
    const stamp = page.locator('.achievement-grid canvas[data-stamp-art="town-keepsake-' + key + '"]');
    assert.equal(await stamp.getAttribute("data-stamp-choice"), choiceFor(key, !touch), key + " persisted stamp artwork");
  }
  assert.deepEqual(errors, []);
  console.log(width, "seven paintings and workbenches, gallery 0/3/7, reload, replay and inventory passed");
} finally {
  await browser?.close();
  await server.close();
}
