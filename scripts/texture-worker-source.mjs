import { readFileSync } from "node:fs";

export function textureWorkerSource(debug = false) {
  const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
  return read("../src/resource-stream.js").replace(/^export /m, "") + "\n" + read("./texture-worker.js") +
    (debug ? "\n" + read("./texture-debug.js") : "");
}
