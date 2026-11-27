import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { preview } from "vite";
import { packDirectory } from "./game-packs.mjs";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const live = process.argv[2];
const json = async path => JSON.parse(await readFile(join("dist", path), "utf8"));
const marker = live ? await (await fetch(new URL("release.json", live))).json() : await json("release.json");
const indexFile = "game-packs-" + marker.version + ".json";
const index = live ? await (await fetch(new URL(indexFile, live))).json() : await json(indexFile);
const common = index.packs.find(p => p.group === "common");
const first = common.entries[0][0];
let scenario, publicServer, site, origin;
const packs = new Map(index.packs.map(p => [p.file, p]));

if (!live) {
  publicServer = createServer(async (req, res) => {
    const pack = packs.get(new URL(req.url, "http://localhost").pathname.slice(1));
    const run = scenario;
    if (!pack || !run) { res.writeHead(404).end(); return; }
    const body = await readFile(join(packDirectory("dist", index.branch), pack.file));
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
    const start = range ? Number(range[1]) : 0, end = range ? Number(range[2]) + 1 : body.length;
    if (pack.file === common.file) run.commonRanges.push([start, end]);
    res.writeHead(range ? 206 : 200, { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Content-Range",
      "Content-Type": "application/octet-stream", "Cache-Control": "no-store", "Content-Length": end-start,
      ...(range ? { "Content-Range": "bytes " + start + "-" + (end-1) + "/" + body.length } : {}) });
    const attempt = run.commonRanges.length;
    const partial = pack.file === common.file && attempt <= run.interruptions;
    // Deliver another whole member and part of the next one on every interrupted request.
    const limit = partial ? common.entries[attempt][1] + Math.min(300, common.entries[attempt][2] - 1) : end;
    for (let offset = start; !res.destroyed && offset < limit; offset += 65536) {
      res.write(body.subarray(offset, Math.min(offset + 65536, limit)));
      await delay(6);
    }
    if (partial) { await delay(180); res.destroy(); } else res.end();
  });
  await new Promise(resolve => publicServer.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + publicServer.address().port + "/";
  site = await preview({configFile:false, build:{outDir:"dist"}, logLevel:"error",
    preview:{host:"127.0.0.1",port:0,cors:false}, plugins:[{name:"pack-test", configurePreviewServer(server) {
      server.middlewares.use((req,res,next) => {
        const path = new URL(req.url,"http://localhost").pathname.slice(1);
        if (path === indexFile) { res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({...index,base:origin})); return; }
        if (scenario && path.startsWith("assets/") && !scenario.files.has(path)) {
          scenario.files.set(path, scenario.commonRanges.length);
        }
        next();
      });
    }}]});
}

let browser;
try {
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined)});
  const base = live || site.resolvedUrls.local[0];
  const cases = [{ interruptions: 0, worker: "allow", scene: "room" }];
  if (!live) cases.push(
    { interruptions: 1, worker: "block", scene: "room" },
    { interruptions: 3, worker: "block", scene: "room" },
    { interruptions: 0, worker: "block", scene: "garden" },
  );
  const packedPaths = new Set(index.packs.flatMap(p => p.entries.map(entry => entry[0])));
  for (const { interruptions, worker, scene } of cases) {
    const fallback = interruptions === 3;
    const run = scenario = { interruptions, commonRanges: [], files: new Map() };
    const ctx = await browser.newContext({serviceWorkers:worker, viewport:{width:390,height:844}});
    try {
      const page = await ctx.newPage(), errors=[], looseImages = new Set();
      page.on("pageerror", e=>errors.push(e.message));
      page.setDefaultTimeout(live ? 180000 : 30000);
      await page.clock.setFixedTime(new Date("2026-12-03T12:00:00+08:00"));
      let indexRequests = 0;
      if (interruptions === 1) await page.route("**/" + indexFile, route => {
        indexRequests++;
        return indexRequests === 1 ? route.abort("connectionreset") : route.continue();
      });
      if (scene === "garden") await page.addInitScript(() => {
        localStorage.setItem("fufu-journey-v1", JSON.stringify({scene:"garden", x:0, y:0, savedAt:Date.now()}));
      });
      await page.addInitScript(() => {
        window.packReadings=[];
        new MutationObserver(() => {
          const bar=document.querySelector('.entry-progress[aria-label="公共资源与初始地图"]');
          const value=bar?.getAttribute("aria-valuetext");
          if (value && value!==window.packReadings.at(-1)) window.packReadings.push(value);
        }).observe(document,{attributes:true, childList:true, subtree:true});
      });
      const requests=[];
      page.on("request", r=>{
        if (r.url().endsWith(".pack")) requests.push(r.url());
        if (r.resourceType() === "image" && r.url().startsWith(base)) {
          const path = decodeURIComponent(new URL(r.url()).pathname.slice(1));
          if (packedPaths.has(path)) looseImages.add(path);
        }
      });
      await page.goto(base,{waitUntil:"domcontentloaded"});
      const enter = page.getByRole("button",{name:/开始小冒险|继续上次的冒险/});
      await enter.waitFor();
      const result=await page.evaluate(async first => {
        const cache = await caches.open("fufu-game-textures-v1:/");
        return { readings:window.packReadings, saved:!!(await cache.match(new URL(first,location.href))) };
      },first);
      assert.ok(result.saved);
      assert.ok(result.readings.some(v=>/^\d+\.\d%$/.test(v) && parseFloat(v)>0 && parseFloat(v)<100));
      assert.equal(result.readings.at(-1),fallback ? "站内补载 100.0%" : "100.0%");
      assert.equal(result.readings.some(v=>v.startsWith("站内补载")),fallback);
      assert.ok(requests.some(url=>url.endsWith(common.file)));
      if (!live) {
        if (interruptions === 1) assert.equal(indexRequests, 2, "retry the interrupted pack index");
        const expectedAttempts = fallback ? 3 : interruptions + 1;
        const expectedRanges = common.entries.slice(0, expectedAttempts).map(([, offset]) => [offset, common.size]);
        assert.deepEqual(run.commonRanges, expectedRanges, "each retry must start at its first unfinished member");
        for (const [path] of common.entries.slice(0, interruptions)) {
          assert.ok(!run.files.has(path), "fully received member fetched from the site: " + path);
        }
        const unfinished = common.entries[interruptions][0];
        if (fallback) assert.equal(run.files.get(unfinished), 3, "the site fallback must wait for all three attempts");
        else assert.ok(!run.files.has(unfinished), "a successful pack request must satisfy the missing member");
      }
      await enter.click();
      await page.locator(`.scene-wrap[data-current-map="${scene}"]`).waitFor();
      if (scene === "garden") {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.deepEqual([...looseImages], [], "uncontrolled garden must reuse unpacked sprites and leave the bedroom note unloaded");
      }
      assert.deepEqual(errors,[]);
      console.log("对象存储加载完成",
        {scene, worker, interruptions, packRequests:requests.length, intermediate:result.readings.find(v=>parseFloat(v)>0 && parseFloat(v)<99.9),
          final:result.readings.at(-1)});
      if (worker === "allow") {
        const manifestFile = "game-assets-" + marker.version + ".json";
        const manifest = live ? await (await fetch(new URL(manifestFile, live))).json() : await json(manifestFile);
        const roomFiles = new Set(manifest.filter(([, , scenes]) => scenes.includes("*") || scenes.includes("room")).map(([path]) => path));
        const coldPacks = new Set(index.packs.filter(p => roomFiles.has(p.entries[0][0])).map(p => p.file));
        requests.length = 0;
        await page.reload({waitUntil:"domcontentloaded"});
        await enter.waitFor();
        assert.equal(await page.locator(".entry-progress").getAttribute("aria-valuetext"), "100.0%");
        assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
        assert.ok(requests.every(url => !coldPacks.has(new URL(url).pathname.split("/").at(-1))));
        await enter.click();
        await page.locator('.scene-nav [data-scene="town"]').click();
        await page.locator('.scene-wrap[data-current-map="town"]').waitFor();
        assert.deepEqual(errors, []);
        console.log("热启动复用小屋的全部资源包，已从小屋进入小镇");
      }
    } finally { await ctx.close(); }
  }
} finally { await browser?.close(); await site?.close(); publicServer?.closeAllConnections(); publicServer?.close(); }
