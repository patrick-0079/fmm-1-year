import sharp from "sharp";

const dir = "src/assets/";
for (const name of ["orchard-v16", "meadow-life-v16"]) {
  const file = dir + name + ".png", {width, height} = await sharp(file).metadata();
  const size = 192, frames = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const left = Math.round(col * width / 2), top = Math.round(row * height / 2);
    const crop = await sharp(file).extract({left, top,
      width: Math.round((col + 1) * width / 2) - left,
      height: Math.round((row + 1) * height / 2) - top}).png().toBuffer();
    const input = await sharp(crop).trim({background: "#0000", threshold: 32})
      .resize(size, size, {fit: "contain", position: "south", background: "#0000"}).png().toBuffer();
    frames.push({input, left: col * size, top: row * size});
  }
  await sharp({create: {width: 2 * size, height: 2 * size, channels: 4, background: "#0000"}})
    .composite(frames).webp({lossless: true, effort: 6}).toFile(dir + name + ".webp");
}

// Scatter a few of the original meadow's wildflowers into the open grass.
// Feather only the surrounding grass, so the individual pixels of petals stay crisp.
const map = dir + "night-meadow-v16.png";
const {width} = await sharp(map).metadata(), scale = width / 900;
const at = n => Math.round(n * scale);
const sprigs = [[77,186], [810,86], [775,75], [782,505]];
const patches = [[0,304,289,30], [1,321,298,18], [2,645,205,35], [1,262,411,36],
  [3,536,355,32], [2,560,346,20], [0,461,519,25], [2,447,236,24], [1,740,446,21]];
const layers = [];
for (const [kind, x, y, size] of patches) {
  const [sx, sy] = sprigs[kind], side = at(size);
  const raw = await sharp(map).extract({left: at(sx - 24), top: at(sy - 24), width: at(48), height: at(48)})
    .resize(side, side).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < side * side; i++) {
    const r = Math.hypot((i % side + 0.5) / side * 2 - 1, (Math.floor(i / side) + 0.5) / side * 2 - 1);
    raw[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (1 - r) * 4)));
  }
  const input = await sharp(raw, {raw: {width: side, height: side, channels: 4}}).png().toBuffer();
  layers.push({input, left: at(x - size / 2), top: at(y - size / 2)});
}
await sharp(map).composite(layers).webp({quality: 93, smartSubsample: true, effort: 6})
  .toFile(dir + "night-meadow-v16.webp");
