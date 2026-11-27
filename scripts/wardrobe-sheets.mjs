import sharp from "sharp";
import { fileURLToPath } from "node:url";

export const master = name => new URL("../doc/artwork/wardrobe/" + name + ".webp", import.meta.url);
export const output = name => new URL("../src/assets/" + name, import.meta.url);
export const filename = fileURLToPath;
export const transparent = (width, height) => sharp({create:{width, height, channels:4, background:"#0000"}});
export async function readSheet(file) {
  return sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
}

// Alpha components keep a neighbour's hair or shoes out of a sprite even when
// the sleeping figure crosses the grid line between the two seated figures.
export function figures({data, info:{width, height}}, columns, rows) {
  const count = width * height;
  const labels = new Int32Array(count), queue = new Int32Array(count);
  const found = [];
  let label = 0;
  for (let i = 0; i < count; i++) {
    if (labels[i] || data[i*4+3] < 24) continue;
    label++;
    let cursor = 0, end = 1, left = width, top = height, right = 0, bottom = 0;
    queue[0] = i; labels[i] = label;
    while (cursor < end) {
      const p = queue[cursor++], x = p % width, y = Math.floor(p / width);
      left = Math.min(left,x); right = Math.max(right,x);
      top = Math.min(top,y); bottom = Math.max(bottom,y);
      for (const n of [x > 0 ? p-1 : -1, x+1 < width ? p+1 : -1, p-width, p+width]) {
        if (n < 0 || n >= count || labels[n] || data[n*4+3] < 24) continue;
        labels[n] = label; queue[end++] = n;
      }
    }
    if (end > count / (rows * columns * 25)) found.push({left,top,right,bottom,label});
  }
  if (found.length !== columns * rows)
    throw new Error("Expected " + columns*rows + " figures, found " + JSON.stringify(found));
  found.sort((a,b) => a.top - b.top);
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (const f of found.slice(row*columns, (row+1)*columns).sort((a,b) => a.left-b.left)) {
      const w = f.right-f.left+1, h = f.bottom-f.top+1, pixels = Buffer.alloc(w*h*4);
      for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
        const p=(f.top+y)*width+f.left+x;
        if (labels[p] === f.label || !labels[p]) data.copy(pixels,(y*w+x)*4,p*4,p*4+4);
      }
      frames.push({pixels, width:w, height:h});
    }
  }
  return frames;
}
export const raster = f => sharp(f.pixels,{raw:{width:f.width,height:f.height,channels:4}});
