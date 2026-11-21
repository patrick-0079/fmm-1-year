import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { AlbumPreviewQueue } from "../src/album-preload.ts";

const photos = Array.from({length: 8}, (_, i) => ({
  src: `preview-${i}`, thumbnail: `thumb-${i}`, originalSrc: `original-${i}`,
}));

test("album warming bounds concurrency, promotes new spreads and leaves originals on demand", async () => {
  const requests: string[] = [];
  const decoded: string[] = [];
  const transfers = new Map<string, () => void>();
  const queue = new AlbumPreviewQueue((url, priority) => {
    assert.ok(transfers.size < 2);
    assert.ok(!transfers.has(url));
    if (url.startsWith("thumb-")) assert.equal(priority, "low");
    requests.push(url);
    return new Promise(resolve => transfers.set(url, () => {
      transfers.delete(url);
      resolve({decode: async () => { decoded.push(url); }} as HTMLImageElement);
    }));
  });
  queue.warm(photos);
  queue.warm(photos);
  assert.deepEqual(requests, ["preview-0", "preview-1"]);

  queue.prioritize(photos, 6, 2);
  for (const finish of [...transfers.values()]) finish();
  await setImmediate();
  assert.deepEqual(requests.slice(2), ["preview-6", "preview-7"]);
  while (transfers.size) {
    for (const finish of [...transfers.values()]) finish();
    await setImmediate();
  }
  assert.deepEqual(decoded, ["preview-6", "preview-7", "preview-4", "preview-5"]);
  assert.deepEqual(requests.sort(), photos.flatMap(p => [p.src, p.thumbnail]).sort());
});

test("failed previews retry on a later pass while successfully warmed images stay cached", async () => {
  const attempts = new Map<string, number>();
  const queue = new AlbumPreviewQueue(async url => {
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    if (count === 1 && url === photos[0].src) throw new Error("temporarily offline");
    return { decode: async () => {} } as HTMLImageElement;
  });
  const page = photos.slice(0, 1);
  queue.warm(page);
  await setImmediate();
  assert.deepEqual([...attempts.values()], [1, 1]);
  queue.warm(page);
  await setImmediate();
  queue.prioritize(page, 0);
  queue.warm(page);
  await setImmediate();
  assert.deepEqual([...attempts.entries()], [["preview-0", 2], ["thumb-0", 1]]);
});
