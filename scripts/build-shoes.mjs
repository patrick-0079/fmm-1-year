// Trace and recolor the shoes already painted on each animation frame. Only
// opaque shoe pixels are exported; the transparent gap between feet stays open.
import sharp from "sharp";
import { spriteFrames } from "../src/sprite-frames.ts";

// [left, top, right, bottom, ornament x, ornament y] in the bottom 50 source
// pixels of each standing crop, or the bottom 100 pixels of the seated crop.
const feet = [
  [[81,24,118,49,101,34], [117,24,154,49,134,34]],
  [[76,14,117,49,96,24], [114,28,144,47,127,37]],
  [[78,25,120,49,98,35], [116,13,153,40,134,24]],
  [[52,23,83,46,65,32], [68,26,121,49,84,38]],
  [[16,16,72,49,34,29], [89,18,142,46,109,32]],
  [[22,17,78,49,38,30], [99,15,150,45,118,30]],
  [[126,19,168,47,151,30], [99,24,148,49,132,36]],
  [[72,20,125,47,105,31], [147,15,205,49,181,29]],
  [[78,14,130,43,109,27], [155,16,214,49,189,30]],
  [[75,25,116,49,94,36], [113,24,155,49,137,36]],
  [[113,11,154,35,137,24], [77,24,122,49,99,36]],
  [[115,13,153,38,137,25], [76,17,120,49,98,30]],
  [[175,15,281,99,228,44], [279,15,388,99,332,44]],
];
const sitting = { x: 87, y: 88, w: 593, h: 733 };
const frames = [...spriteFrames, sitting];
const palettes = [
  [[78,46,64],[140,66,91],[205,101,126],[244,163,173],[255,221,203]],
  [[76,55,79],[119,91,131],[166,145,181],[221,196,207],[255,233,195]],
];
const ornaments = [
  ["p...p","ppgpp","..g..",".p.p."],
  ["..g..",".ggg.","gglgg","..g..","..g.."],
];
const cellW = 128, cellH = 40, layers = [];
for (let index = 0; index < frames.length; index++) {
  const frame = frames[index], seated = index === 12;
  const height = seated ? 100 : 50, scale = seated ? 30 / frame.w : 43 / 330;
  const { data } = await sharp(seated ? "src/assets/fufu-rest-poses.png" : "src/assets/nemu-sprites.png")
    .extract({ left: frame.x, top: frame.y + frame.h - height, width: frame.w, height })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [kind, palette] of palettes.entries()) {
    const pixels = Buffer.alloc(data.length);
    for (const [left, top, right, bottom, cx, cy] of feet[index]) {
      const badgeSize = seated ? 8 : 3;
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const p = (y * frame.w + x) * 4;
        const [r,g,b,a] = data.subarray(p, p + 4);
        if (a < 160 || (g - b > 5 && r - b > 23)) continue;
        const brightness = .37*r + .42*g + .21*b;
        const shade = Math.min(3.999, Math.max(0, (brightness - 43) / 48));
        const low = Math.floor(shade), blend = shade - low;
        const color = palette[low].map((v, i) => Math.round(v + (palette[low+1][i] - v) * blend));
        const mark = ornaments[kind][Math.floor((y-cy)/badgeSize+2)]?.[Math.floor((x-cx)/badgeSize+2)];
        const ink = mark === "p" ? [255,206,211] : mark === "g" ? [250,197,92] : mark === "l" ? [255,242,191] : color;
        pixels.set([...ink, a], p);
      }
    }
    const width = Math.round(frame.w * scale * 4), h = Math.round(height * scale * 4);
    const layer = await sharp(pixels,{raw:{width:frame.w,height,channels:4}})
      .resize(width,h,{fit:"fill"}).png().toBuffer();
    layers.push({input:layer,left:index*cellW+Math.round((cellW-width)/2),top:(kind+1)*cellH-h});
  }
}
await sharp({create:{width:cellW*frames.length,height:cellH*2,channels:4,background:"#0000"}})
  .composite(layers).webp({lossless:true}).toFile("src/assets/fufu-footwear-v14.webp");
