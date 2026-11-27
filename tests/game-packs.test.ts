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
  return { hits, open, base };
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

test("pack requests and their member bytes follow the first appearance in the manifest", async t => {
  const [a, b, c, town] = files;
  const manifest = [town, inScenes(a, "*"), inScenes(c, "town", "room"), inScenes(b, "room", "town")];
  const { index, bodies } = makeGamePacks(manifest, (path: string) => bytes.get(path), "preview");
  assert.deepEqual(index.packs.map(pack => pack.group), ["town", "common", "shared-room-town"]);
  const [townPack, commonPack, sharedPack] = index.packs;
  assert.deepEqual(sharedPack.entries, [["c.webp", 0, 4], ["b.webp", 4, 3]]);
  assert.equal(bodies.get(sharedPack.file).toString(), "hijkefg");

  const requested: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    const name = url.pathname.split("/").at(-1)!;
    requested.push(name);
    return new Response(bodies.get(name));
  });
  const resources = setup().open(index, manifest);
  await resources.prepare("town");
  assert.deepEqual(new Set(requested.slice(0, 2)), new Set([townPack.file, commonPack.file]));
  assert.deepEqual(requested.slice(2), [sharedPack.file]);
  for (const [path] of manifest) assert.equal(await resources.wait(path, new AbortController().signal), true);
});

test("a mixed-scene pack is rejected before scene loading can wait for an unscheduled member", () => {
  const { open } = setup();
  const [a, b, c, town] = files;
  for (const scenes of [["town"], ["room", "town"], ["*"]]) {
    assert.throws(() => open(build().index, [a, inScenes(b, ...scenes), c, town]), /成员所属场景不一致/);
  }
});

test("an interrupted pack commits complete members immediately and resumes at the first missing byte", async t => {
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
  stream.error(Error("interrupted"));
  await run;
  assert.equal(await first.wait("b.webp", signal), false);
  assert.equal(first.progress(files).fallback, true);
  assert.equal(hits.size, 1);
  const second = open();
  net.mock.mockImplementation(async (_: URL, init: RequestInit) => {
    assert.deepEqual(init.headers, { Range: "bytes=4-10" });
    return new Response("efghijk", {status: 206, headers: { "Content-Range": "bytes 4-10/11" }});
  });
  await second.prepare("room");
  assert.equal(hits.size, 3);
  assert.equal(await hits.get(base + "b.webp")!.clone().text(), "efg");
  const coldTab = open();
  await coldTab.prepare("room");
  assert.equal(net.mock.callCount(), 2, "a warm cache needs no object storage");
});

test("a wrong digest, missing object or invalid Range response only releases missing files to fallback", async t => {
  const { hits, base, open } = setup();
  const net = t.mock.method(globalThis, "fetch", async () => new Response("abcdXXXhijk"));
  let packs = open(); await packs.prepare("room");
  assert.deepEqual([...hits.keys()], [base + "a.webp"]);
  for (const res of [new Response(null,{status:404}), new Response("all content"), new Response("efghijk",{status:206})]) {
    net.mock.mockImplementation(async () => res);
    packs = open(); await packs.prepare("room");
    assert.equal(await packs.wait("a.webp", new AbortController().signal), true);
    assert.equal(await packs.wait("b.webp", new AbortController().signal), false);
    assert.equal(hits.size, 1);
  }
});

test("object storage has distinct first-byte and idle timeouts", async t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const net = t.mock.method(globalThis, "fetch");
  for (const firstByte of [false, true]) {
    const { open } = setup(), packs = open();
    let signal!: AbortSignal;
    const called = Promise.withResolvers<void>();
    net.mock.mockImplementation(async (_: URL, init: RequestInit) => {
      signal = init.signal!;
      called.resolve();
      return new Response(new ReadableStream({
        start(controller) {
          if (firstByte) controller.enqueue(new Uint8Array([97]));
          signal.addEventListener("abort", () => controller.error(signal.reason));
        },
      }));
    });
    const run = packs.prepare("room");
    await called.promise; await setImmediate();
    t.mock.timers.tick((firstByte ? 15000 : 8000) - 1);
    assert.equal(signal.aborted, false);
    t.mock.timers.tick(1);
    await run;
    assert.equal(packs.progress(files).fallback, true);
  }
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
