performance.setResourceTimingBufferSize?.(1500);
measureDownload = async (url, { response, stored, timingStart }) => {
  let bytes = 0, duration = 0;
  if (timingStart !== undefined) {
    await (stored ?? response.clone().arrayBuffer());
    const find = () => performance.getEntriesByName(url).reverse().find(entry =>
      entry.initiatorType === "fetch" && entry.startTime >= timingStart - 1);
    let entry = find();
    if (!entry) { await new Promise(resolve => setTimeout(resolve, 0)); entry = find(); }
    bytes = entry ? Math.max(0, entry.transferSize - 300) : -1;
    duration = entry?.duration ?? 0;
  }
  const headers = new Headers(response.headers);
  headers.set("X-Fufu-Transfer", bytes + "," + duration);
  return new Response(response.clone().body, { status: response.status, statusText: response.statusText, headers });
};
