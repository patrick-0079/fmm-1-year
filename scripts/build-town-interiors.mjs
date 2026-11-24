import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { finishTownInterior, readTownInteriorArt } from "./town-interior-finish.mjs";

const places = ["florist", "baker", "maker", "post", "books", "radio", "hall"];
const phases = ["dawn", "day", "dusk", "night"];
const size = { width: 600, height: 400 };
const sourceFolder = new URL("../doc/artwork/town-interiors/", import.meta.url);
const assetFolder = new URL("../src/assets/town-interiors/", import.meta.url);
const conversation = (await readFile(new URL("../doc/artwork/ARTWORK-town-interiors.md", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const furnishings = await readTownInteriorArt();
const phaseNames = { dawn: "清晨", day: "白昼", dusk: "黄昏", night: "星夜" };
const footprints = {
  温室花架: "温室花架脚", 温室木玻隔断: "温室隔断", 砖炉和炉膛: "砖炉炉基",
  手绘白板脚: "白板两只木脚", 临池侧窗木座: "临池侧窗窗座",
  七屋模型展桌: "模型展桌底与桌脚", 隔音玻璃与底轨: "隔音玻璃底轨",
};

function groups(source, attribute) {
  const matches = [...source.matchAll(/<\/?g\b[^>]*>/g)];
  const open = [];
  const found = [];
  for (const token of matches) {
    if (token[0].startsWith("</")) {
      const entry = open.pop();
      if (entry && attribute.test(entry[0])) {
        found.push({ index: entry.index, body: source.slice(entry.index, token.index + token[0].length) });
      }
    } else if (!token[0].endsWith("/>")) open.push(token);
  }
  return found.sort((a, b) => a.index - b.index).map(entry => entry.body);
}

function group(source, id) {
  const [result] = groups(source, new RegExp(' id="' + id + '"'));
  if (!result) throw Error("Missing art group " + id);
  return result;
}

function showVariant(source, name) {
  return source.replace(/class="(?:phase-view|collection-view) [^"]*" display="(?:inline|none)"/g,
    tag => 'display="' + (tag.includes("phase-" + name) || tag.includes("collection-empty") ? "inline" : "none") + '"');
}

async function compile(place) {
  const source = await readFile(new URL(place + ".svg", sourceFolder), "utf8");
  const plan = JSON.parse(source.match(/<metadata id="review-geometry">([^<]+)<\/metadata>/)[1]);
  const walls = Array.from(source.matchAll(/<polygon points="([^"]+)" data-name="([^"]+)"/g),
    ([, points, label]) => ({ label, points: points.split(" ").map(pair => pair.split(",").map(Number)) }));
  const title = source.match(/<title id="title">([^<]+) ·/)[1];
  const roomText = conversation.split(/^## /m).find(section => section.startsWith(title + "\n"));
  const lines = Object.fromEntries(Array.from(roomText.matchAll(/^\| ([^|\r\n]+) \| ([^|\r\n]+) \|\r?$/gm),
    ([, heading, line]) => [heading, line.replace(/^“|”$/g, "")]));
  const chat = {
    phases: Object.fromEntries(Object.keys(plan.shifts).map(phase => [phase, lines[phaseNames[phase] + "开场"]])),
    familiar: [lines.熟客话题一, lines.熟客话题二],
  };
  if ([...Object.values(chat.phases), ...chat.familiar].some(line => !line)) throw Error("Missing dialogue " + place);
  const architecture = group(source, "architecture").replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, "")
    .replace(/<rect\b[^>]* y="16" [^>]*\/>/g, "")
    .replace(/<polyline\b[^>]*37\.5[^>]*\/>/g, "");
  const furniture = groups(group(source, "furniture"), / data-object="/);
  const lighting = group(source, "room-light");
  if (furniture.length !== walls.length) throw Error(place + " furniture and ground shapes must correspond");
  const finished = finishTownInterior(place, plan, {
    architecture, floorDetails: group(source, "floor-details"), backWall: group(source, "back-wall-details"), furniture,
  }, furnishings);
  const defs = source.match(/<defs>[\s\S]*?<\/defs>/)[0]
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/<image\b[^>]*\/>/g, "")
    .replace("</defs>", finished.defs + "</defs>");
  const sprites = new Map();

  async function raster(content, phase, full = false) {
    const body = showVariant(content, phase);
    const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" stroke-linejoin="round" stroke-linecap="round" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">' + defs + body + '</svg>';
    const { data, info } = await sharp(Buffer.from(markup)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let l = info.width, t = info.height, r = 0, b = 0;
    if (full) [l, t, r, b] = [0, 0, info.width, info.height];
    else {
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (!data[(y * info.width + x) * 4 + 3]) continue;
        l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x + 1); b = Math.max(b, y + 1);
      }
    }
    if (r <= l || b <= t) return null;
    const width = r - l, height = b - t;
    const buffer = await sharp(data, { raw: { ...size, channels: 4 } })
      .extract({ left: l, top: t, width, height }).png().toBuffer();
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (!sprites.has(hash)) sprites.set(hash, { buffer, width, height, x: 0, y: 0 });
    return () => {
      const packed = sprites.get(hash);
      return [packed.x, packed.y, width, height, l, t];
    };
  }

  const frames = { backgrounds: {}, lights: {}, props: [], models: {} };
  for (const phase of phases) {
    frames.backgrounds[phase] = await raster(finished.background, phase, true);
    frames.lights[phase] = await raster(lighting + finished.glows, phase);
  }
  for (const [index, part] of furniture.entries()) {
    const depth = Math.max(...walls[index].points.map(point => point[1]));
    const name = part.match(/data-object="([^"]+)"/)[1];
    if ((footprints[name] ?? name) !== walls[index].label) throw Error(`Mismatched footprint for ${place}/${name}`);
    const variants = {};
    for (const phase of phases) variants[phase] = await raster(finished.furniture[index], phase);
    frames.props.push({ name, depth, variants });
  }
  if (place === "hall") {
    for (const key of places) {
      const [lit] = groups(source, new RegExp(' data-building="' + key + '" data-lit="true"'));
      if (!lit) throw Error("Missing lit miniature " + key);
      frames.models[key] = await raster(lit, "dusk");
    }
  }

  const width = 1200;
  let x = 0, y = 0, shelf = 0;
  const layers = [];
  for (const sprite of [...sprites.values()].sort((a, b) => b.height - a.height)) {
    if (x + sprite.width > width) { x = 0; y += shelf; shelf = 0; }
    sprite.x = x; sprite.y = y;
    layers.push({ input: sprite.buffer, left: x, top: y });
    x += sprite.width;
    shelf = Math.max(shelf, sprite.height);
  }
  const pixels = await sharp({ create: { width, height: y + shelf, channels: 4, background: "#00000000" } })
    .composite(layers).webp({ lossless: true, effort: 5 }).toBuffer();
  await writeFile(new URL(place + ".webp", assetFolder), pixels);
  console.log(place, width + "×" + (y + shelf), Math.round(pixels.length / 1024) + " KiB");
  return { title, plan, walls, chat, art: JSON.parse(JSON.stringify(frames, (_, v) => typeof v === "function" ? v() : v)) };
}

await mkdir(assetFolder, { recursive: true });
const data = {};
for (const place of places) data[place] = await compile(place);
await writeFile(new URL("../src/town-interiors.generated.json", import.meta.url),
  "{\n" + places.map(place => "  " + JSON.stringify(place) + ": " + JSON.stringify(data[place])).join(",\n") + "\n}\n");
