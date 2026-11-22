import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createContext, runInContext } from "node:vm";
import test from "node:test";

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
  const request = new Request(scope + "map.webp");
  let stored: Response | undefined;
  const cache = {
    match: async () => stored?.clone(),
    put: async (_: Request, response: Response) => { stored = response; },
    delete: async () => { stored = undefined; return true; },
  };
  type FetchEvent = {
    request: Request;
    respondWith(result: Promise<Response>): void;
    waitUntil(task: Promise<unknown>): void;
  };
  const makeWorker = () => {
    let onFetch!: (event: FetchEvent) => void;
    const context = createContext({
      self: { registration: {scope}, addEventListener(name: string, handle: typeof onFetch) {
        if (name === "fetch") onFetch = handle;
      } },
      textureFiles: [["map.webp", createHash("sha256").update(good).digest("base64")]],
      caches: {open: async () => cache}, fetch, crypto, URL, btoa,
    });
    runInContext(readFileSync(new URL("../scripts/texture-worker.js", import.meta.url), "utf8"), context);
    return async () => {
      const writes: Promise<unknown>[] = [];
      let result!: Promise<Response>;
      onFetch({
        request, respondWith: (r: Promise<Response>) => { result = r; },
        waitUntil: (p: Promise<unknown>) => writes.push(p),
      });
      const bytes = await (await result).text();
      await Promise.all(writes);
      return bytes;
    };
  };
  const load = makeWorker();
  await assert.rejects(load);
  assert.equal(stored, undefined);
  // Previous releases cached any HTTP 200 with an image MIME type.
  stored = new Response(body);
  body = good;
  assert.equal(await load(), good.toString());
  assert.equal(downloads, 2);
  body = Buffer.from("network no longer has the original");
  assert.equal(await makeWorker()(), good.toString());
  assert.equal(downloads, 2, "even a newly started worker should accept a valid offline copy");
});
