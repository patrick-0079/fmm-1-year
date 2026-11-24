import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createContext, runInContext } from "node:vm";
import test from "node:test";
import { setImmediate } from "node:timers/promises";

const script = readFileSync(new URL("../scripts/texture-worker.js", import.meta.url), "utf8");
type Files = readonly (readonly [path: string, contents: string | Buffer])[];
type Lifetime = { waitUntil(task: Promise<unknown>): void };
type WorkerFetch = Lifetime & { request: Request; respondWith(task: Promise<Response>): void };
type WorkerMessage = Lifetime & { data: { type: string; version: string; retry: boolean } };

function mountWorker(scope: string, files: Files, entries: Map<string, Response>, network: typeof fetch, version = "release") {
  const cache = {
    match: async (url: string) => entries.get(url)?.clone(),
    put: async (url: string, response: Response) => { entries.set(url, response); },
    keys: async () => [...entries.keys()].map(url => new Request(url)),
    delete: async (key: string | Request) => entries.delete(typeof key === "string" ? key : key.url),
  };
  let onFetch!: (event: WorkerFetch) => void;
  let onMessage!: (event: WorkerMessage) => void;
  const context = createContext({
    self: { registration: { scope }, addEventListener(name: string, listener: (event: never) => void) {
      if (name === "fetch") onFetch = listener as typeof onFetch;
      if (name === "message") onMessage = listener as typeof onMessage;
    } },
    assetVersion: version,
    assetFiles: files.map(([name, body]) => [name, createHash("sha256").update(body).digest("base64")]),
    caches: { open: async () => cache },
    // Node fetch has no native HTTP cache. Model a local miss without a request.
    fetch: (input: RequestInfo | URL, init?: RequestInit) => init?.cache === "only-if-cached"
      ? Promise.resolve(new Response(null, { status: 504 })) : network(input, init),
    Response, crypto, URL, btoa,
  });
  runInContext(script, context);
  return {
    warm(pageVersion = version, retry = false) {
      let result: Promise<unknown> | undefined;
      onMessage({ data: { type: "warm-assets", version: pageVersion, retry }, waitUntil: task => { result = task; } });
      return result;
    },
    async load(path: string, init?: RequestInit) {
      const lifetime: Promise<unknown>[] = [];
      let result: Promise<Response> | undefined;
      onFetch({
        request: new Request(new URL(path, scope), init),
        respondWith: task => { result = task; },
        waitUntil: task => { lifetime.push(task); },
      });
      const response = await result;
      await Promise.all(lifetime);
      return response;
    },
  };
}

test("a damaged map can be retried, including old cached copies, while valid textures remain usable offline", async t => {
  const good = Buffer.from("reference image bytes");
  let body = Buffer.from("truncated image");
  let downloads = 0;
  const server = createServer((_, res) => {
    downloads++;
    res.writeHead(200, { "Content-Type": "image/webp" });
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const scope = `http://127.0.0.1:${address.port}/`;
  const entries = new Map<string, Response>();
  const makeWorker = () => mountWorker(scope, [["map.webp", good]], entries, fetch);
  const worker = makeWorker();
  await assert.rejects(worker.load("map.webp"));
  assert.equal(entries.size, 0);
  // Previous releases cached any HTTP 200 with an image MIME type.
  entries.set(scope + "map.webp", new Response(body));
  body = good;
  assert.equal(await (await worker.load("map.webp"))?.text(), good.toString());
  assert.equal(downloads, 2);
  body = Buffer.from("network no longer has the original");
  assert.equal(await (await makeWorker().load("map.webp"))?.text(), good.toString());
  assert.equal(downloads, 2, "even a newly started worker should accept a valid offline copy");
});

test("background warming shares transfers with foreground requests and retries after reconnect", async () => {
  const scope = "https://game.test/preview/";
  const files = [["garden.webp", "garden"], ["photo.webp", "photo"], ["letter.webp", "letter"], ["song.wav", "01234567"]] as const;
  const entries = new Map<string, Response>();
  const pending = new Map<string, PromiseWithResolvers<Response>>();
  const requested: string[] = [];
  const secondLetter = Promise.withResolvers<void>();
  const worker = mountWorker(scope, files, entries, async input => {
    const name = String(input).slice(scope.length);
    assert.ok(!pending.has(name), "duplicate download for " + name);
    if (name === "letter.webp" && requested.includes(name)) secondLetter.resolve();
    requested.push(name);
    const transfer = Promise.withResolvers<Response>();
    pending.set(name, transfer);
    return transfer.promise.finally(() => pending.delete(name));
  });
  assert.equal(worker.warm("older-release"), undefined);
  const pass = worker.warm();
  assert.ok(pass);
  assert.equal(worker.warm(), pass, "pages share the running queue");
  await setImmediate();
  assert.deepEqual(requested, ["garden.webp", "photo.webp"]);

  const garden = worker.load("garden.webp");
  const audio = worker.load("song.wav", { headers: { Range: "bytes=1-3" } });
  await setImmediate();
  assert.deepEqual(requested, ["garden.webp", "photo.webp", "song.wav"], "foreground bypasses the queue");
  pending.get("song.wav")!.resolve(new Response("01234567", { headers: { "Content-Type": "audio/wav" } }));
  const partial = await audio;
  assert.equal(partial?.status, 206);
  assert.equal(partial?.headers.get("Content-Range"), "bytes 1-3/8");
  assert.equal(await partial?.text(), "123");

  pending.get("garden.webp")!.resolve(new Response("garden"));
  assert.equal(await (await garden)?.text(), "garden");
  await setImmediate();
  assert.ok(pending.has("letter.webp"));
  pending.get("letter.webp")!.reject(new Error("disconnected"));
  const recovery = worker.warm("release", true);
  pending.get("photo.webp")!.resolve(new Response("photo"));
  await pass;
  await secondLetter.promise;
  pending.get("letter.webp")!.resolve(new Response("letter"));
  await recovery;
  assert.equal(entries.size, 4);
  assert.deepEqual(requested, ["garden.webp", "photo.webp", "song.wav", "letter.webp", "letter.webp"]);

  await worker.warm();
  assert.equal(requested.length, 5, "a new pass checks the cache without transferring unchanged bodies");
});

test("a newer release keeps unchanged cached bytes, repairs stale entries and removes retired URLs", async () => {
  const scope = "https://game.test/";
  const entries = new Map([
    [scope + "letter.webp", new Response("stationery")],
    [scope + "map.webp", new Response("old map")],
    [scope + "retired.webp", new Response("retired")],
  ]);
  const downloads: string[] = [];
  const worker = mountWorker(scope, [["letter.webp", "stationery"], ["map.webp", "new map"]], entries, async input => {
    downloads.push(String(input));
    return new Response("new map");
  }, "new-release");
  await worker.warm("new-release");
  assert.deepEqual(downloads, [scope + "map.webp"]);
  assert.equal(await entries.get(scope + "map.webp")?.text(), "new map");
  assert.equal(entries.has(scope + "retired.webp"), false);
});
