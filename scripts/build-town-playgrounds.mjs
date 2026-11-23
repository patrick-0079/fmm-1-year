import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  blockBoard, flightPad, flightRings, rabbitPlatforms, townAttractionBases, wishLawn,
} from "../src/town-attraction-layout.ts";
import { townArtworkForeground as townForeground } from "../src/town-foreground.ts";
import { townCanopies } from "../src/town-scenery.ts";
import { bakeryPennants } from "../src/bakery-pennants.ts";
import "./build-town-pond-mask.mjs";

const assets = new URL("../src/assets/", import.meta.url);
const artwork = new URL("../ref/素材/周年小镇/", import.meta.url);
const file = (directory, name) => fileURLToPath(new URL(name, directory));
const mapSize = { width: 3072, height: 2048 };
const cell = { width: 316, height: 224, baseline: 216 };
const frames = { stump: 0, moon: 1, cloud: 2, board: 3, ring: 4, smallRing: 5, rabbit: 7, kite: 9, flightPad: 10 };
const source = sharp(file(artwork, "设施图集.webp"));
const xy = points => points.map(({x,y}) => `${x},${y}`).join(" ");
const clothColors = ["#fff1a8","#f8e6e3","#ffb8c2","#fff3c7","#ffebe7","#ffb8be","#ffe8bf"];
const silks = bakeryPennants.map(({cord,cloth}, i) => {
  const [a,b] = cord;
  const panel = cloth.length ? `<defs><linearGradient id="silk${i}" x2="1" y2="1"
    gradientUnits="objectBoundingBox"><stop stop-color="#fff7e6"/><stop offset=".32" stop-color="${clothColors[i]}"/>
    <stop offset=".78" stop-color="${clothColors[i]}"/><stop offset="1" stop-color="#ef9caa"/></linearGradient></defs>
    <polygon points="${xy(cloth)}" fill="url(#silk${i})"
    stroke="#dc2455" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M${cloth[0].x+1} ${cloth[0].y+1.35} L${cloth[1].x-.6} ${cloth[1].y+1.1}
      L${cloth[0].x+1.2} ${cloth[0].y+3.45}Z" fill="#f49fb1"/>
    <path d="M${cloth[0].x+1} ${cloth[0].y+1} L${cloth[1].x-.6} ${cloth[1].y+.75}"
      fill="none" stroke="#fff1df" stroke-width=".4"/>` : "";
  return `${panel}<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#d32456"
    stroke-width="1.52" stroke-linecap="round"/>
    <path d="M${a.x} ${a.y-.32}L${b.x} ${b.y-.32}" stroke="#ed5c7b"
    stroke-width=".36" stroke-linecap="round"/>`;
}).join("");
const silkArt = svg(456, 552, `<g transform="scale(6) translate(-744 -246)">${silks}
  <path d="M810.7 250l5-1.3m-4.8 2.6l5.2-1.3m-3.1 1.7l2.1 2.7"
    fill="none" stroke="#aa3250" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M811 249.8l4.2-1m-2.8 2.1l2.7-.8" fill="none" stroke="#f5a9ad" stroke-width=".5"/>
  </g>`);
const apron = await sharp(silkArt).resize(152,184).blur(.38).png().toBuffer();
const map = sharp(await sharp(file(assets, "anniversary-town-hd-v13.png"))
  .composite([{ input: apron, left:1488, top:492 }]).png().toBuffer());

async function tile(name) {
  const index = frames[name];
  return source.clone().extract({
    left: index % 5 * cell.width, top: Math.floor(index / 5) * cell.height,
    width: cell.width, height: cell.height,
  }).png().toBuffer();
}

async function prop({ sprite, x, y }) {
  return {
    input: await tile(sprite), left: x * 2 - cell.width / 2, top: y * 2 - cell.baseline,
    width: cell.width, height: cell.height, depth: y,
  };
}

function svg(width, height, body) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`);
}

function intersects(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left &&
    a.top < b.top + b.height && a.top + a.height > b.top;
}

async function originalForeground(part, props) {
  const xs = part.points.map(point => point.x * 2), ys = part.points.map(point => point.y * 2);
  const left = Math.floor(Math.min(...xs)), top = Math.floor(Math.min(...ys));
  const width = Math.ceil(Math.max(...xs)) - left, height = Math.ceil(Math.max(...ys)) - top;
  const area = { left, top, width, height };
  if (!props.some(item => item.depth < part.y && intersects(area, item))) return null;
  const points = xs.map((x, i) => `${x - left},${ys[i] - top}`).join(" ");
  const mask = svg(width, height, `<polygon fill="white" points="${points}"/>`);
  const region = await map.clone().extract(area).ensureAlpha().png().toBuffer();
  const input = await sharp(region).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { input, left, top, depth: part.y };
}

// These paths only tell the renderer which pixels of the finished map should
// cover a character's head. Deriving them from alpha leaves the ring holes open.
async function cover(id, item, depth, start = 0, end = cell.width) {
  const { data, info } = await sharp(item.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rectangles = [];
  let active = new Map();
  for (let y = 0; y < info.height; y++) {
    const row = new Map();
    let left = start;
    while (left < end) {
      if (data[(y * info.width + left) * 4 + 3] < 176) { left++; continue; }
      let right = left + 1;
      while (right < end && data[(y * info.width + right) * 4 + 3] >= 176) right++;
      const key = left * info.width + right;
      const previous = active.get(key);
      if (previous) previous.h++;
      else rectangles.push({ x: left, y, w: right - left, h: 1 });
      row.set(key, previous ?? rectangles.at(-1));
      left = right;
    }
    active = row;
  }
  const x = item.left / 2, y = item.top / 2;
  const path = rectangles.map(r => `M${x + r.x / 2} ${y + r.y / 2}h${r.w / 2}v${r.h / 2}h-${r.w / 2}z`).join("");
  return { id, depth, x, y, w: cell.width / 2, h: cell.height / 2, path };
}

const [stump, moon, cloud, smallRing, ring, board] = await Promise.all(
  [...rabbitPlatforms, ...flightRings, blockBoard].map(prop),
);
const structures = [stump, moon, cloud, smallRing, ring, board];
const landing = await prop(flightPad);
landing.depth = -1;
const lawn = {
  input: await sharp(file(artwork, "心愿阵草坪.webp")).resize(wishLawn.w * 2, wishLawn.h * 2).png().toBuffer(),
  left: wishLawn.x * 2, top: wishLawn.y * 2, width: wishLawn.w * 2, height: wishLawn.h * 2, depth: -1,
};
const shadows = svg(mapSize.width, mapSize.height, townAttractionBases.map(({ x, y, w, h }) =>
  `<ellipse cx="${2 * x + w}" cy="${2 * y + h + 3}" rx="${w + 3}" ry="${h * .6}" fill="#543d2e" opacity=".23"/>`,
).join(""));
const front = await Promise.all([...townForeground, ...townCanopies].map(part =>
  originalForeground(part, [...structures, landing, lawn]),
));
const layers = [landing, lawn, ...structures, ...front.filter(Boolean)].sort((a, b) => a.depth - b.depth);
const finished = await map.clone().composite([
  { input: shadows }, ...layers.map(({ input, left, top }) => ({ input, left, top })),
]).png().toBuffer();
await Promise.all([
  sharp(finished).webp({ lossless: true, effort: 6 }).toFile(file(assets, "anniversary-town-hd-v13.webp")),
  sharp(finished).resize(1536, 1024).webp({ quality: 85, smartSubsample: true, effort: 6 })
    .toFile(file(assets, "anniversary-town-v13.webp")),
]);

const masks = await Promise.all([
  cover("rabbit-stump", stump, stump.depth), cover("rabbit-moon", moon, moon.depth),
  cover("rabbit-cloud", cloud, cloud.depth), cover("flight-small-ring", smallRing, smallRing.depth),
  cover("flight-ring", ring, ring.depth), cover("blocks-left", board, board.depth - 20, 0, 80),
  cover("blocks-centre", board, board.depth - 12, 80, 170),
  cover("blocks-right", board, board.depth - 2, 170, cell.width),
]);
const maskFile = new URL("../src/town-playground-masks.generated.json", import.meta.url);
await writeFile(maskFile, `${JSON.stringify(masks, null, 2)}\n`);

const animation = await Promise.all(["rabbit", "kite"].map(async name => sharp(await tile(name)).extract({
  left: 104, top: 144, width: 108, height: 74,
}).png().toBuffer()));
await sharp({ create: { width: 216, height: 74, channels: 4, background: "#00000000" } })
  .composite(animation.map((input, index) => ({ input, left: index * 108, top: 0 })))
  .webp({ lossless: true, effort: 6 }).toFile(file(assets, "town-playground-animation.webp"));
