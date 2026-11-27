import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { makeGamePacks, packBranch } from "../scripts/game-packs.mjs";
import { recordPublished, syncPack, withBranchState } from "../scripts/publish-game-packs.mjs";
import { PackResources } from "../src/pack-resources.ts";
import type { Resource } from "../src/resource-queue.ts";

const bytes = new Map([["a.webp", "abcd"], ["b.webp", "efg"], ["c.webp", "hijk"], ["town.webp", "town"]]);
const files: Resource[] = [...bytes].map(([name, body]) =>
  [name, createHash("sha256").update(body).digest("base64"), [name === "town.webp" ? "town" : "room"]]);
const build = () => makeGamePacks(files, (path: string) => bytes.get(path), "preview");
function inScenes([path, digest]: Resource, ...scenes: string[]): Resource {
  return [path, digest, scenes];
}
function setup() {
  const base = new URL("https://game.test/");
  const hits = new Map<string, Response>();
  const cache = { match: async (url: string) => hits.get(url)?.clone(),
    put: async (url: string, res: Response) => { hits.set(url, res); }, delete: async (url: string) => hits.delete(url) };
  const open = (index = build().index, manifest: readonly Resource[] = files) =>
    new PackResources(index, manifest, base, cache as unknown as Cache);
  return { hits, open, base, cache };
}

test("pack identities are independent of code, branch prefixes and unrelated maps", () => {
  const a = build();
  const changed = [...files, ["code.js", "modified code", ["*"]], ["cover.webp", "", ["page"]], ["invite.webp", "", []]];
  const b = makeGamePacks(changed, (name: string) => bytes.get(name), "main");
  assert.equal(a.index.version, b.index.version);
  assert.ok(a.index.packs.every((p: {file: string}) => p.file.startsWith("preview-")));
  assert.ok(b.index.packs.every((p: {file: string}) => p.file.startsWith("main-")));
  const c = makeGamePacks(files, (name: string) => name === "town.webp" ? "changed" : bytes.get(name), "preview");
  assert.notEqual(c.index.version, a.index.version);
  assert.equal([...a.bodies.keys()].filter(name => !c.bodies.has(name)).length, 1);
  assert.notEqual(packBranch("feature/map"), packBranch("feature-map"));
});

test("pack requests complete one at a time in manifest order and preserve member order", async t => {
  const [a, b, c, town] = files;
  const manifest = [town, inScenes(a, "*"), inScenes(c, "town", "room"), inScenes(b, "room", "town")];
  const { index, bodies } = makeGamePacks(manifest, (path: string) => bytes.get(path), "preview");
  assert.deepEqual(index.packs.map(pack => pack.group), ["town", "common", "shared-room-town"]);
  const sharedPack = index.packs[2];
  assert.deepEqual(sharedPack.entries, [["c.webp", 0, 4], ["b.webp", 4, 3]]);
  assert.equal(bodies.get(sharedPack.file).toString(), "hijkefg");

  const requested: string[] = [];
  const started = index.packs.map(() => Promise.withResolvers<ReadableStreamDefaultController<Uint8Array>>());
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    const name = url.pathname.split("/").at(-1)!;
    const request = started[requested.length];
    requested.push(name);
    return new Response(new ReadableStream({ start(controller) { request.resolve(controller); } }));
  });
  const resources = setup().open(index, manifest);
  const run = resources.prepare("town");
  const seenBeforeCompletion: number[] = [];
  for (const [i, request] of started.entries()) {
    const stream = await request.promise;
    await setImmediate();
    seenBeforeCompletion.push(requested.length);
    stream.enqueue(bodies.get(requested[i]));
    stream.close();
  }
  await run;
  assert.deepEqual(seenBeforeCompletion, [1, 2, 3], "the next request must wait for the previous response body");
  assert.deepEqual(requested, index.packs.map(pack => pack.file));
  for (const [path] of manifest) assert.equal(await resources.wait(path, new AbortController().signal), true);
});

test("a mixed-scene pack is rejected before scene loading can wait for an unscheduled member", () => {
  const { open } = setup();
  const [a, b, c, town] = files;
  for (const scenes of [["town"], ["room", "town"], ["*"]]) {
    assert.throws(() => open(build().index, [a, inScenes(b, ...scenes), c, town]), /成员所属场景不一致/);
  }
});

test("an interrupted pack keeps completed members and retries from the first incomplete member in the same run", async t => {
  const { hits, base, open } = setup();
  const first = open(), signal = new AbortController().signal;
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const net = t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { stream = controller; controller.enqueue(new TextEncoder().encode("abcde")); },
  })));
  const run = first.prepare("room");
  assert.equal(await first.wait("a.webp", signal), true);
  assert.equal(await hits.get(base + "a.webp")!.clone().text(), "abcd");
  assert.equal(first.progress(files).received, 5);
  const retryRanges: (string | null)[] = [];
  net.mock.mockImplementation(async (_: URL, init: RequestInit) => {
    retryRanges.push(new Headers(init.headers).get("Range"));
    return new Response("efghijk", {status: 206, headers: { "Content-Range": "bytes 4-10/11" }});
  });
  stream.error(Error("interrupted"));
  await run;
  assert.deepEqual(retryRanges, ["bytes=4-10"]);
  assert.equal(await first.wait("b.webp", signal), true);
  assert.equal(first.progress(files).fallback, false);
  assert.equal(hits.size, 3);
  assert.equal(await hits.get(base + "b.webp")!.clone().text(), "efg");
  const coldTab = open();
  await coldTab.prepare("room");
  assert.equal(net.mock.callCount(), 2, "a warm cache needs no object storage");
});

test("corrupt bytes, missing objects and invalid Range responses fall back only after three attempts", async t => {
  const net = t.mock.method(globalThis, "fetch");
  const signal = new AbortController().signal;
  for (const response of [
    () => new Response("XXXhijk", { status: 206, headers: { "Content-Range": "bytes 4-10/11" } }),
    () => new Response(null, { status: 404 }),
    () => new Response("all content"),
    () => new Response("efghijk", { status: 206 }),
  ]) {
    const { hits, base, open } = setup();
    hits.set(base + "a.webp", new Response("abcd"));
    hits.set(base + "b.webp", new Response("bad"));
    const ranges: (string | null)[] = [];
    net.mock.mockImplementation(async (_: URL, init: RequestInit) => {
      ranges.push(new Headers(init.headers).get("Range"));
      return response();
    });
    const packs = open();
    await packs.prepare("room");
    assert.deepEqual(ranges, Array(3).fill("bytes=4-10"));
    assert.equal(await packs.wait("a.webp", signal), true);
    assert.equal(await packs.wait("b.webp", signal), false);
    assert.equal(await packs.wait("c.webp", signal), false);
    assert.deepEqual([...hits.keys()], [base + "a.webp"]);
  }
});

test("a pack receiving data every 45 seconds can finish beyond two minutes and cache every member", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { open, hits, base } = setup();
  const packs = open();
  const started = Promise.withResolvers<AbortSignal>();
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const net = t.mock.method(globalThis, "fetch", async (_url: URL, init: RequestInit) => {
    const signal = init.signal!;
    return new Response(new ReadableStream({
      start(controller) {
        stream = controller;
        signal.addEventListener("abort", () => controller.error(signal.reason));
        started.resolve(signal);
      },
    }));
  });
  const run = packs.prepare("room");
  const signal = await started.promise;
  t.mock.timers.tick(45_000);
  assert.equal(signal.aborted, false);
  const encoder = new TextEncoder();
  stream.enqueue(encoder.encode("a"));
  await setImmediate();
  assert.equal(packs.progress(files).received, 1);
  t.mock.timers.tick(45_000);
  assert.equal(signal.aborted, false);
  stream.enqueue(encoder.encode("bc"));
  await setImmediate();
  assert.equal(packs.progress(files).received, 3);
  t.mock.timers.tick(45_000);
  assert.equal(signal.aborted, false);
  stream.enqueue(encoder.encode("defghijk"));
  stream.close();
  await run;
  assert.equal(net.mock.callCount(), 1);
  const room = files.filter(([, , scenes]) => scenes.includes("room"));
  assert.deepEqual(packs.progress(room), { received: 11, total: 11, fallback: false });
  for (const [path] of room) {
    assert.equal(await hits.get(new URL(path, base).href)?.text(), bytes.get(path));
  }
});

test("the network idle timeout excludes time spent writing verified members to the cache", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { open, hits, base, cache } = setup();
  const startedWrite = Promise.withResolvers<void>();
  const releaseWrite = Promise.withResolvers<void>();
  const put = cache.put;
  t.mock.method(cache, "put", async (url: string, response: Response) => {
    startedWrite.resolve();
    await releaseWrite.promise;
    await put(url, response);
  }, { times: 1 });
  let signal!: AbortSignal;
  t.mock.method(globalThis, "fetch", async (_url: URL, init: RequestInit) => {
    signal = init.signal!;
    return new Response("abcdefghijk");
  });
  const packs = open();
  const run = packs.prepare("room");
  await startedWrite.promise;
  t.mock.timers.tick(130_000);
  const abortedDuringWrite = signal.aborted;
  releaseWrite.resolve();
  await run;
  assert.equal(abortedDuringWrite, false);
  assert.equal(hits.size, 3);
  assert.equal(await hits.get(new URL("c.webp", base).href)?.text(), "hijk");
  assert.equal(packs.progress(files).fallback, false);
});

test("each of three attempts waits 60 seconds for the first byte or further data before fallback", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const net = t.mock.method(globalThis, "fetch");
  for (const firstByte of [false, true]) {
    const { open } = setup(), packs = open();
    const signals: AbortSignal[] = [], cacheModes: (RequestCache | undefined)[] = [];
    net.mock.mockImplementation(async (_: URL, init: RequestInit) => {
      const signal = init.signal!;
      signals.push(signal);
      cacheModes.push(init.cache);
      if (signals.length > 3) return new Response(null, { status: 404 });
      return new Response(new ReadableStream({
        start(controller) {
          if (firstByte) controller.enqueue(new Uint8Array([97]));
          signal.addEventListener("abort", () => controller.error(signal.reason));
        },
      }));
    });
    const run = packs.prepare("room");
    for (let attempt = 0; attempt < 3; attempt++) {
      await setImmediate();
      assert.equal(signals.length, attempt + 1);
      t.mock.timers.tick(59_999);
      assert.equal(signals[attempt].aborted, false);
      assert.equal(packs.progress(files).fallback, false);
      t.mock.timers.tick(1);
      assert.equal(signals[attempt].aborted, true);
    }
    await run;
    assert.equal(signals.length, 3);
    assert.deepEqual(cacheModes.slice(1), ["reload", "reload"]);
    assert.equal(packs.progress(files).fallback, true);
    assert.equal(await packs.wait("a.webp", new AbortController().signal), false);
  }
});

test("yielding a background pack to a foreground scene leaves its three network attempts available", async t => {
  const { open } = setup();
  const { index, bodies } = build();
  const room = index.packs.find(pack => pack.group === "room")!.file;
  const town = index.packs.find(pack => pack.group === "town")!.file;
  const started = Promise.withResolvers<AbortSignal>();
  const requested: string[] = [];
  let roomAttempts = 0;
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    const name = url.pathname.split("/").at(-1)!;
    requested.push(name);
    if (name === room) {
      roomAttempts++;
      if (roomAttempts === 1) {
        const signal = init.signal!;
        return new Response(new ReadableStream({
          start(controller) {
            signal.addEventListener("abort", () => controller.error(signal.reason));
            started.resolve(signal);
          },
        }));
      }
      if (roomAttempts < 4) return new Response(null, { status: 503 });
    }
    return new Response(bodies.get(name));
  });
  const packs = open();
  const background = packs.prepare();
  const firstRequest = await started.promise;
  await packs.prepare("town");
  assert.equal(firstRequest.aborted, true);
  await background;
  assert.deepEqual(requested, [room, town, room, room, room]);
  assert.equal(packs.progress(files).fallback, false);
  assert.equal(await packs.wait("c.webp", new AbortController().signal), true);
});

test("uploads repair mismatches and reuse complete packs on code-only builds", async t => {
  const dir = await mkdtemp(join(tmpdir(), "fmm-pack-sync-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const {index, bodies} = build();
  const stored = new Map<string, Headers>();
  const request = async (method: string, name: string, init?: RequestInit) => {
    if (method === "HEAD") return new Response(null, {status: stored.has(name) ? 200 : 404, headers: stored.get(name)});
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("content-md5"), createHash("md5").update(bodies.get(name)).digest("base64"));
    headers.set("content-length", String(bodies.get(name).length));
    headers.set("etag", '"' + createHash("md5").update(bodies.get(name)).digest("hex") + '"');
    stored.set(name, headers);
    return new Response(null);
  };
  for (const pack of index.packs) {
    await writeFile(join(dir,pack.file), bodies.get(pack.file));
    assert.equal(await syncPack(request,dir,pack),"uploaded");
    assert.equal(await syncPack(request,dir,pack),"reused");
    stored.get(pack.file)!.set("etag",'"different-bytes"');
    assert.equal(await syncPack(request,dir,pack),"uploaded");
    stored.get(pack.file)!.set("x-amz-meta-sha256","wrong");
    assert.equal(await syncPack(request,dir,pack),"uploaded");
  }
});

test("two publications update the same JSON ledger with strong ETags even when compressed reads have weak ETags", async () => {
  let body = "", etag = "";
  const request = async (method: string, _: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (method === "GET") return body ? new Response(body, { headers: {
      etag: headers.get("accept-encoding") === "identity" ? etag : "W/" + etag,
    } }) : new Response(null, { status:404 });
    assert.equal(headers.get(body ? "if-match" : "if-none-match"), body ? etag : "*");
    body = String(options.body);
    etag = '"' + createHash("md5").update(body).digest("hex") + '"';
    return new Response(null, { headers: { etag } });
  };
  for (const run of ["a","b"]) await withBranchState(request, async (state: {pending:Record<string,string>}) => {
    state.pending[run] = run;
  });
  assert.deepEqual(JSON.parse(body).pending,{a:"a",b:"b"});
  assert.equal(JSON.parse(body).lease,null);
});

test("retention keeps two different live sets, including shared packs and in-flight releases", () => {
  const state = { history: [], pending: {}, retired: [] } as {history: {version:string;files:string[]}[];
    pending: Record<string,{files:string[]; started:number}>; retired:string[]};
  const set = (version:string, files:string[]) => ({version,files});
  recordPublished(state, set("A",["common","a","protected"]), "a");
  recordPublished(state, set("B",["common","b"]), "b");
  for (let i=0;i<10;i++) recordPublished(state,set("B",["common","b"]),"code-"+i);
  state.pending.next={files:["protected"],started:Date.now()};
  assert.deepEqual(recordPublished(state,set("C",["common","c"]),"c"),["a"]);
  assert.deepEqual(state.history.map(s=>s.version),["C","B"]);
  assert.deepEqual(recordPublished(state,set("B",["common","b"]),"next"),["a","protected"]);
});
