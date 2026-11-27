// Read the network body before verifying it. Native fetch integrity buffers the
// entire file before exposing its first byte to the caller.
export async function fetchVerifiedAsset(url, digest, options, onBytes) {
  const controller = new AbortController();
  const stop = () => controller.abort(options.signal.reason);
  options.signal.throwIfAborted();
  options.signal.addEventListener("abort", stop, { once: true });
  let activeAt = performance.now(), pending = 0, lastReport = activeAt;
  const timer = setInterval(() => {
    if (performance.now() - activeAt >= 120000) controller.abort(new Error("游戏资源传输中断"));
  }, 15000);
  try {
    const subtle = globalThis.crypto?.subtle;
    const response = await fetch(url, { ...options, signal: controller.signal,
      integrity: digest && !subtle ? "sha256-" + digest : undefined });
    if (response.status !== 200) return response;
    if (!response.body) throw new Error("游戏资源内容为空");
    const reader = response.body.getReader(), chunks = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        activeAt = performance.now();
        chunks.push(value);
        pending += value.byteLength;
        if (onBytes && activeAt - lastReport >= 125) {
          onBytes(pending);
          pending = 0;
          lastReport = activeAt;
        }
      }
    } finally { reader.releaseLock(); }
    const body = new Blob(chunks, { type: response.headers.get("Content-Type") || "" });
    if (digest && subtle) {
      const hash = await subtle.digest("SHA-256", await body.arrayBuffer());
      if (btoa(String.fromCharCode(...new Uint8Array(hash))) !== digest) throw new Error("游戏资源校验失败");
    }
    controller.signal.throwIfAborted();
    const headers = new Headers(response.headers);
    headers.delete("Content-Encoding");
    headers.set("Content-Length", String(body.size));
    return new Response(body, { headers, status: response.status, statusText: response.statusText });
  } finally {
    clearInterval(timer);
    options.signal.removeEventListener("abort", stop);
  }
}
