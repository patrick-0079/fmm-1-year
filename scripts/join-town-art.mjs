// Given four registered, overlapping HD crops (NW, NE, SW, SE), rebuild the
// town master. Pick a low-difference seam through the overlap so railings,
// roof edges and flags stay single, sharp lines rather than a double exposure.
import sharp from "sharp";
const [out, ...files] = process.argv.slice(2);
if (!out || files.length !== 4) throw new Error("usage: node scripts/join-town-art.mjs output.png nw.png ne.png sw.png se.png");

async function tile(file) {
  const {data, info} = await sharp(file).removeAlpha().toColourspace("srgb")
    .resize(1632, 1088, {fit: "fill"}).raw().toBuffer({resolveWithObject: true});
  return {data, w: info.width, h: info.height};
}
function join(a, b, overlap, horizontal) {
  const extent = horizontal ? a.w : a.h, offset = extent - overlap;
  const lines = horizontal ? a.h : a.w;
  const index = (im, line, col) => (horizontal ? (line * im.w + col) : (col * im.w + line)) * 3;
  const trace = new Int8Array(lines * overlap);
  let prev = new Float64Array(overlap), row = new Float64Array(overlap);
  const lo = Math.ceil(overlap * 0.12), hi = overlap - lo;
  prev.fill(Infinity); prev.fill(0, lo, hi + 1);
  for (let line = 0; line < lines; line++) {
    row.fill(Infinity);
    for (let col = lo; col <= hi; col++) {
      const i = index(a, line, offset + col), j = index(b, line, col);
      let d = 0;
      for (let k = 0; k < 3; k++) d += Math.abs(a.data[i+k] - b.data[j+k]);
      let best = prev[col], step = 0;
      for (const s of [-1, 1]) if (prev[col+s] + 3 < best) { best = prev[col+s] + 3; step = s; }
      row[col] = best + d; trace[line * overlap + col] = step;
    }
    [prev, row] = [row, prev];
  }
  const seam = new Int16Array(lines);
  let col = lo;
  for (let i = lo+1; i <= hi; i++) if (prev[i] < prev[col]) col = i;
  for (let line = lines-1; line >= 0; line--) {
    seam[line] = col + offset;
    col += trace[line * overlap + col];
  }
  const w = horizontal ? a.w+b.w-overlap : a.w, h = horizontal ? a.h : a.h+b.h-overlap;
  const result = {w, h, data: Buffer.alloc(w*h*3)};
  for (let line = 0; line < lines; line++) for (let col = 0; col < (horizontal ? w : h); col++) {
    const o = index(result, line, col), i = index(a, line, col), j = index(b, line, col-offset);
    const mix = Math.min(1, Math.max(0, (col - seam[line] + 3) / 6));
    for (let k = 0; k < 3; k++) result.data[o+k] = mix === 0 ? a.data[i+k] : mix === 1 ? b.data[j+k] : Math.round(a.data[i+k]*(1-mix) + b.data[j+k]*mix);
  }
  return result;
}
const [nw, ne, sw, se] = await Promise.all(files.map(tile));
const map = join(join(nw, ne, 192, true), join(sw, se, 192, true), 128, false);
await sharp(map.data, {raw: {width: map.w, height: map.h, channels: 3}}).png().toFile(out);
console.log(`${out} · ${map.w} × ${map.h}`);
