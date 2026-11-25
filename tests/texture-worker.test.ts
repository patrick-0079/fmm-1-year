import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createContext, runInContext } from "node:vm";
import test from "node:test";
import { setImmediate } from "node:timers/promises";

import { textureWorkerSource } from "../scripts/texture-worker-source.mjs";
const script = textureWorkerSource();
type Files = readonly (readonly [path: string, contents: string | Buffer])[];
type Lifetime = { waitUntil(task: Promise<unknown>): void };
type WorkerFetch = Lifetime & { request: Request; clientId: string; respondWith(task: Promise<Response>): void };

function mountWorker(scope: string, files: Files, entries: Map<string, Response>, network: typeof fetch, version = "release") {
  const cache = {
    match: async (url: string) => entries.get(url)?.clone(),
    put: async (url: string, response: Response) => { entries.set(url, response); },
    keys: async () => [...entries.keys()].map(url => new Request(url)),
    delete: async (key: string | Request) => entries.delete(typeof key === "string" ? key : key.url),
  };
  let onFetch!: (event: WorkerFetch) => void;
  let onActivate!: (event: Lifetime) => void;
  let onMessage!: (event: { source: { id: string }; data: { type: string; token: string } }) => void;
  const context = createContext({
    self: { registration: { scope }, clients: { claim() {} }, addEventListener(name: string, listener: (event: never) => void) {
      if (name === "fetch") onFetch = listener as typeof onFetch;
      if (name === "activate") onActivate = listener as typeof onActivate;
      if (name === "message") onMessage = listener as typeof onMessage;
    } },
    assetVersion: version,
    assetFiles: files.map(([name, body]) => [name, createHash("sha256").update(body).digest("base64")]),
    caches: { open: async () => cache },
    fetch: network, Response, Headers, Blob, crypto, URL, btoa, AbortSignal, AbortController, performance, setInterval, clearInterval,
  });
  runInContext(script, context);
  return {
    activate() {
      let result: Promise<unknown> | undefined;
      onActivate({ waitUntil: task => { result = task; } });
      return result;
    },
    yieldPreload(clientId: string, token: string) {
      onMessage({ source: { id: clientId }, data: { type: "yield-preload", token } });
    },
    async load(path: string, init?: RequestInit, clientId = "player") {
      const lifetime: Promise<unknown>[] = [];
      let result: Promise<Response> | undefined;
      onFetch({
        request: new Request(new URL(path, scope), init),
        clientId,
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

test("a cold preload uses one normal fetch, shares it with the renderer and preserves WAV ranges", async () => {
  const scope = "https://game.test/preview/";
  const files = [["garden.webp", "garden"], ["photo.webp", "photo"], ["letter.webp", "letter"], ["song.wav", "01234567"]] as const;
  const entries = new Map<string, Response>();
  const pending = new Map<string, PromiseWithResolvers<Response>>();
  const requested: string[] = [];
  const modes: (RequestCache | undefined)[] = [];
  const worker = mountWorker(scope, files, entries, async (input, options) => {
    const name = String(input).slice(scope.length);
    assert.ok(!pending.has(name), "duplicate download for " + name);
    modes.push(options?.cache);
    requested.push(name);
    const transfer = Promise.withResolvers<Response>();
    pending.set(name, transfer);
    return transfer.promise.finally(() => pending.delete(name));
  });
  const warming = worker.load("garden.webp", { headers: { "X-Fufu-Preload": "background" } });
  const garden = worker.load("garden.webp");
  const audio = worker.load("song.wav", { headers: { Range: "bytes=1-3" } });
  await setImmediate();
  assert.deepEqual(requested, ["garden.webp", "song.wav"]);
  pending.get("song.wav")!.resolve(new Response("01234567", { headers: { "Content-Type": "audio/wav" } }));
  const partial = await audio;
  assert.equal(partial?.status, 206);
  assert.equal(partial?.headers.get("Content-Range"), "bytes 1-3/8");
  assert.equal(await partial?.text(), "123");

  pending.get("garden.webp")!.resolve(new Response("garden"));
  assert.equal(await (await garden)?.text(), "garden");
  assert.equal(await (await warming)?.text(), "garden");
  const failure = assert.rejects(worker.load("letter.webp"));
  await setImmediate();
  pending.get("letter.webp")!.reject(new Error("disconnected"));
  await failure;
  const recovery = worker.load("letter.webp");
  await setImmediate();
  pending.get("letter.webp")!.resolve(new Response("letter"));
  assert.equal(await (await recovery)?.text(), "letter");
  assert.equal(await (await worker.load("letter.webp"))?.text(), "letter");
  assert.deepEqual(modes, ["default", "default", "default", "reload"]);
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
  await worker.activate();
  await worker.load("letter.webp");
  await worker.load("map.webp");
  assert.deepEqual(downloads, [scope + "map.webp"]);
  assert.equal(await entries.get(scope + "map.webp")?.text(), "new map");
  assert.equal(entries.has(scope + "retired.webp"), false);
});

test("a scene change releases its background transfer and preserves other players' active requests", async () => {
  const requests: { signal: AbortSignal; cache?: RequestCache; finish: (res: Response) => void }[] = [];
  const worker = mountWorker("https://game.test/", [["garden.webp", "garden"], ["room.webp", "room"]], new Map(), async (_, options) => {
    const signal = options!.signal!;
    return new Promise<Response>((finish, reject) => {
      requests.push({ signal, cache: options?.cache, finish });
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
  const background = { headers: { "X-Fufu-Preload": "job" } };
  const cancelled = assert.rejects(worker.load("garden.webp", background, "first"), { name: "AbortError" });
  await setImmediate();
  worker.yieldPreload("second", "job");
  assert.equal(requests[0].signal.aborted, false);
  worker.yieldPreload("first", "job");
  await cancelled;
  assert.equal(requests[0].signal.aborted, true);

  const warming = worker.load("garden.webp", background, "first");
  const foreground = worker.load("garden.webp", {}, "second");
  await setImmediate();
  worker.yieldPreload("first", "job");
  assert.equal(requests.length, 2, "both tabs reuse the resumed request");
  assert.equal(requests[1].signal.aborted, false);
  assert.equal(requests[1].cache, "default", "yielding did not invalidate the HTTP cache");
  requests[1].finish(new Response("garden"));
  assert.equal(await (await foreground)?.text(), "garden");
  await warming;
});
