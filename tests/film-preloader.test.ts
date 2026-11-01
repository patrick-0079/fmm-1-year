import test from "node:test";
import assert from "node:assert/strict";
import { FilmPreloader, downloadLabel } from "../src/film-preloader.ts";

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
