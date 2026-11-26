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
    run.transfers.push({ file:pack.file, start, end });
    res.writeHead(range ? 206 : 200, { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Content-Range",
      "Content-Type": "application/octet-stream", "Cache-Control": "no-store", "Content-Length": end-start,
      ...(range ? { "Content-Range": "bytes " + start + "-" + (end-1) + "/" + body.length } : {}) });
    const partial = run.fault && pack.file === common.file;
    const limit = partial ? Math.min(end, common.entries[0][2] + 300) : end;
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
        if (path.startsWith("assets/")) scenario?.files.push(path);
        next();
      });
    }}]});
}

let browser;
try {
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined)});
  const base = live || site.resolvedUrls.local[0];
  for (const [fault, worker] of (live ? [[false,"allow"]] : [[false,"allow"],[true,"block"]])) {
    const run = scenario = {fault, transfers:[], files:[]};
    const ctx = await browser.newContext({serviceWorkers:worker, viewport:{width:390,height:844}});
    try {
      const page = await ctx.newPage(), errors=[];
      page.on("pageerror", e=>errors.push(e.message));
      page.setDefaultTimeout(live ? 180000 : 30000);
      await page.clock.setFixedTime(new Date("2026-12-03T12:00:00+08:00"));
      await page.addInitScript(() => {
        window.packReadings=[];
        new MutationObserver(() => {
          const bar=document.querySelector('.entry-progress[aria-label="公共资源与初始地图"]');
          const value=bar?.getAttribute("aria-valuetext");
          if (value && value!==window.packReadings.at(-1)) window.packReadings.push(value);
        }).observe(document,{attributes:true, childList:true, subtree:true});
      });
      const requests=[];
      page.on("request", r=>{if (r.url().endsWith(".pack")) requests.push(r.url());});
      await page.goto(base,{waitUntil:"domcontentloaded"});
      await page.getByRole("button",{name:/开始小冒险/}).waitFor();
      const result=await page.evaluate(async first => {
        const cache = await caches.open("fufu-game-textures-v1:/");
        return { readings:window.packReadings, saved:!!(await cache.match(new URL(first,location.href))) };
      },first);
      assert.ok(result.saved);
      assert.ok(result.readings.some(v=>/^\d+\.\d%$/.test(v) && parseFloat(v)>0 && parseFloat(v)<100));
      assert.equal(result.readings.at(-1),fault ? "站内补载 100.0%" : "100.0%");
      assert.equal(result.readings.some(v=>v.startsWith("站内补载")),fault);
      assert.ok(requests.some(url=>url.endsWith(common.file)));
      if (!live) {
        assert.equal(run.transfers.filter(x=>x.file===common.file).length,1);
        assert.ok(!run.files.includes(first),"a fully received member should never be fetched from the site again");
        if (fault) assert.ok(run.files.includes(common.entries[1][0]),"only the missing tail falls back");
      }
      await page.getByRole("button",{name:/开始小冒险/}).click();
      await page.locator('.scene-wrap[data-current-map="room"]').waitFor();
      assert.deepEqual(errors,[]);
      console.log(fault ? "断流后复用已收齐文件，站内百分比完成并进入小屋" : "对象存储字节进度完成并进入小屋",
        {packRequests:requests.length, intermediate:result.readings.find(v=>parseFloat(v)>0 && parseFloat(v)<99.9),
          final:result.readings.at(-1)});
    } finally { await ctx.close(); }
  }
} finally { await browser?.close(); await site?.close(); publicServer?.closeAllConnections(); publicServer?.close(); }
