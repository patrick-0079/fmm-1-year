import test from "node:test";
import assert from "node:assert/strict";
import { FilmPreloader, downloadLabel } from "../src/film-preloader.ts";

const filmSrc = "https://example.com/persistent.mp4";
function memoryCache() {
  const entries = new Map<string, Response>();
  return {
    match: async (url: string) => entries.get(url)?.clone(),
    put: async (url: string, response: Response) => { entries.set(url, response.clone()); },
    delete: async (url: string) => entries.delete(url),
  };
}
async function playBytes(film: FilmPreloader) {
  const url = await film.start();
  try { return [...new Uint8Array(await (await fetch(url)).arrayBuffer())]; }
  finally { URL.revokeObjectURL(url); }
}

test("unchanged films cost only a HEAD, and a new ETag replaces even an equally large file", async () => {
  const cache = memoryCache(), requests: string[] = [];
  let version = 1, network = true;
  const open = () => new FilmPreloader(filmSrc, () => {}, async (_, options) => {
    const method = options?.method ?? "GET";
    requests.push(method);
    assert.equal(options?.cache,"no-store");
    if (!network) throw new TypeError("offline");
    return new Response(method === "HEAD" ? null : Uint8Array.of(version, version), {
      headers: {ETag: '"version-' + version + '"', "Content-Length":"2", "Last-Modified":"Sun, 01 Nov 2026 06:18:05 GMT"},
    });
  }, 500, async () => cache);
  assert.deepEqual(await playBytes(open()),[1,1]);
  const warm = open();
  assert.deepEqual(await playBytes(warm),[1,1]);
  assert.equal(warm.progress.source,"local");
  version++;
  assert.deepEqual(await playBytes(open()),[2,2]);
  network = false;
  const offline = open();
  assert.deepEqual(await playBytes(offline),[2,2]);
  assert.equal(offline.progress.source,"unverified");
  assert.deepEqual(requests,["GET","HEAD","HEAD","GET","HEAD"]);
});

test("hidden ETags require both a modification date and source length, never just a size", async () => {
  const cache = memoryCache(), requests: string[] = [];
  let date = "Sun, 01 Nov 2026 06:18:05 GMT";
  const open = () => new FilmPreloader(filmSrc, () => {}, async (_, options) => {
    const method = options?.method ?? "GET";
    requests.push(method);
    const headers = new Headers({"Content-Length":"2"});
    if (date) headers.set("Last-Modified",date);
    return new Response(method === "HEAD" ? null : Uint8Array.of(1,2), {headers});
  }, 500, async () => cache);
  await playBytes(open()); await playBytes(open());
  date = "Mon, 02 Nov 2026 06:18:05 GMT";
  await playBytes(open());
  date = "";
  await playBytes(open()); await playBytes(open());
  assert.deepEqual(requests, ["GET","HEAD","HEAD","GET","HEAD","GET","HEAD","GET"]);
});

test("failed replacement preserves the last complete copy and disk quota cannot block playback", async () => {
  const cache = memoryCache();
  let id = "v1", body = Uint8Array.of(1,2);
  const get: typeof fetch = async (_, options) => new Response(options?.method === "HEAD" ? null : body, {
    headers: {ETag: id, "Content-Length":"2"},
  });
  const open = () => new FilmPreloader(filmSrc, () => {}, get, 500, async () => cache);
  await playBytes(open());
  id = "v2"; body = Uint8Array.of(3);
  await assert.rejects(open().start(),/Incomplete/);
  assert.equal((await cache.match(filmSrc))?.headers.get("ETag"),"v1");
  cache.put = async () => { throw new Error("quota"); };
  body = Uint8Array.of(3,4);
  assert.deepEqual(await playBytes(open()),[3,4]);
});

test("the CDN can turn off local storage without leaving an obsolete playable entry", async () => {
  const cache = memoryCache();
  let allow = true, gets = 0;
  const open = () => new FilmPreloader(filmSrc, () => {}, async (_, opt) => {
    const head = opt?.method === "HEAD";
    if (!head) gets++;
    return new Response(head ? null : Uint8Array.of(4,5), { headers: {
      ETag:'"same"', "Content-Length":"2", "Cache-Control":allow ? "public" : "no-store",
    } });
  }, 500, async () => cache);
  await playBytes(open());
  assert.ok(await cache.match(filmSrc));
  allow = false;
  assert.deepEqual(await playBytes(open()),[4,5]);
  assert.equal(await cache.match(filmSrc),undefined);
  await playBytes(open());
  assert.equal(gets,3);
});

test("full preload continues independently of playback and publishes a Blob only after the final chunk", async () => {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let requests = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const film = new FilmPreloader(
    "https://example.com/film.mp4",
    () => {},
    async () => {
      requests++;
      return new Response(stream, {
        headers: { "Content-Length": "8", "Content-Type": "video/mp4" },
      });
    },
  );
  const ready = film.start();
  assert.equal(
    film.start(),
    ready,
    "opening or leaving the TV must not restart a download",
  );
  controller!.enqueue(new Uint8Array([1, 2, 3, 4]));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(film.progress.state, "loading");
  assert.equal(film.progress.received, 4);
  assert.match(downloadLabel(film.progress), /50%/);
  controller!.enqueue(new Uint8Array([5, 6, 7, 8]));
  controller!.close();
  const url = await ready;
  assert.equal(film.progress.state, "ready");
  assert.equal(requests, 1);
  assert.deepEqual(
    new Uint8Array(await (await fetch(url)).arrayBuffer()),
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  );
  URL.revokeObjectURL(url);
});

test("a truncated download cannot be marked complete, and retry starts from clean bytes", async () => {
  let requests = 0;
  const film = new FilmPreloader(
    "https://example.com/film.mp4",
    () => {},
    async () => {
      requests++;
      return new Response(new Uint8Array(requests === 1 ? 3 : 8), {
        headers: { "Content-Length": "8" },
      });
    },
  );
  await assert.rejects(film.start(), /Incomplete/);
  assert.equal(film.progress.state, "error");
  const url = await film.start();
  assert.equal(film.progress.received, 8);
  assert.equal(film.progress.state, "ready");
  URL.revokeObjectURL(url);
});

test("HTTP and stream failures remain retryable instead of exposing partial media", async () => {
  const film = new FilmPreloader(
    "https://example.com/film.mp4",
    () => {},
    async () => new Response("missing", { status: 404 }),
  );
  await assert.rejects(film.start(), /download failed/);
  assert.equal(film.progress.state, "error");
  assert.match(downloadLabel(film.progress), /重新加载/);
});

test("a stalled request times out and can be retried without reloading the page", async () => {
  let requests = 0;
  let signal: AbortSignal | null | undefined;
  const film = new FilmPreloader("https://example.com/film.mp4", () => {},
    async (_url, options) => {
      signal = options?.signal;
      requests++;
      return requests === 1 ? new Promise<Response>(() => {}) : new Response(new Uint8Array([1, 2]));
    }, 25);
  await assert.rejects(film.start(), /stalled/);
  assert.equal(signal?.aborted, true);
  assert.equal(film.progress.state, "error");
  const url = await film.start();
  assert.equal(film.progress.state, "ready");
  assert.equal(film.progress.received, 2);
  URL.revokeObjectURL(url);
});

test("a stalled body is cancelled and never published as a partial video", async () => {
  let cancelled = false;
  const film = new FilmPreloader("https://example.com/film.mp4", () => {},
    async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array([1, 2])); },
      cancel() { cancelled = true; },
    })), 25);
  await assert.rejects(film.start(), /stalled/);
  assert.equal(cancelled, true);
  assert.equal(film.progress.state, "error");
  assert.equal(film.progress.received, 2);
});

test("ongoing slow progress extends the idle timeout instead of imposing a total deadline", async () => {
  const film = new FilmPreloader("https://example.com/film.mp4", () => {},
    async () => new Response(new ReadableStream({
      async start(controller) {
        for (let i = 0; i < 6; i++) {
          controller.enqueue(new Uint8Array([i]));
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        controller.close();
      },
    })), 100);
  const url = await film.start();
  assert.equal(film.progress.received, 6);
  assert.equal(film.progress.state, "ready");
  URL.revokeObjectURL(url);
});

test("partial HTTP responses are rejected and compressed lengths do not mark decoded bodies incomplete", async () => {
  const partial = new FilmPreloader("https://example.com/film.mp4", () => {},
    async () => new Response(new Uint8Array([1]), { status: 206 }));
  await assert.rejects(partial.start(), /complete response/);
  const encoded = new FilmPreloader("https://example.com/film.mp4", () => {},
    async () => new Response(new Uint8Array(12), { headers: { "Content-Length": "6", "Content-Encoding": "gzip" } }));
  const url = await encoded.start();
  assert.equal(encoded.progress.received, 12);
  assert.equal(encoded.progress.total, 0);
  URL.revokeObjectURL(url);
});
