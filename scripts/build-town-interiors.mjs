import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import silhouettes from "../doc/artwork/town-interiors/masks/props.json" with { type: "json" };
import windows from "../doc/artwork/town-interiors/masks/windows.json" with { type: "json" };

const places = Object.keys(silhouettes);
const phases = ["dawn", "day", "dusk", "night"];
const gutter = 2;
const sourceFolder = new URL("../doc/artwork/town-interiors/", import.meta.url);
const assetFolder = new URL("../src/assets/town-interiors/", import.meta.url);
const conversation = (await readFile(new URL("../doc/artwork/ARTWORK-town-interiors.md", import.meta.url), "utf8")).replaceAll("\r", "");
const phaseNames = { dawn: "清晨", day: "白昼", dusk: "黄昏", night: "星夜" };
const matchingFoot = { 温室花架: "温室花架脚", 温室木玻隔断: "温室隔断", 砖炉和炉膛: "砖炉炉基", 手绘白板脚: "白板两只木脚", 隔音玻璃与底轨: "隔音玻璃底轨" };
// Empty velvet compartments in logical coordinates, four above and three below.
const caseCells = [
  ["florist", 204, 118, 45, 23], ["baker", 253, 118, 44, 23], ["hall", 301, 118, 43, 23], ["maker", 348, 118, 43, 23],
  ["post", 203, 142, 65, 23], ["books", 271, 142, 58, 23], ["radio", 331, 142, 60, 23],
];

function svg(body, scale = 2) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${600 * scale}" height="${400 * scale}" viewBox="0 0 600 400">${body}</svg>`);
}

function blind(phase, raised) {
  const slats = raised ? 1 : { dawn: 6, day: 3, dusk: 8, night: 13 }[phase];
  let wood = '';
  for (let i = 0; i < slats; i++) {
    const y = 55.5 + i * 1.65;
    wood += `<path d="M404 ${y}Q438 ${y + .6} 479 ${y - .2}" fill="none" stroke="#805834" stroke-width="1.65"/><path d="M405 ${y - .4}Q437 ${y + .25} 478 ${y - .65}" fill="none" stroke="#d7b378" stroke-width=".65"/>`;
  }
  const edge = 55.5 + slats * 1.65;
  return wood + `<path d="M416 55V${edge}m48 -${edge - 55}V${edge}M477 55v${raised ? 9 : 24}" fill="none" stroke="#765536" stroke-width=".8"/><circle cx="477" cy="${raised ? 65 : 80}" r="1.4" fill="#d9ac61" stroke="#815832" stroke-width=".7"/>`;
}

async function sky(rgb, alpha, rect, phase) {
  const { width, height } = rect;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < alpha.length; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const light = (.26 * r + .54 * g + .2 * b) / 255;
    const horizon = (rect.top + Math.floor(i / width)) / 205;
    let red = r, green = g, blue = b;
    if (phase === "dawn") {
      red = r * .76 + 64 * light; green = g * .82 + 36 * light; blue = b * .81 + 39 * light;
    } else if (phase === "dusk") {
      red = r * .48 + light * (85 + 55 * horizon); green = g * .49 + light * (42 + 39 * horizon);
      blue = b * .48 + light * (51 - 14 * horizon);
    } else if (phase === "night") {
      red = r * .16 + 13 * light; green = g * .20 + 18 * light; blue = b * .30 + 33 * light;
    }
    pixels[i * 4] = Math.round(red); pixels[i * 4 + 1] = Math.round(green);
    pixels[i * 4 + 2] = Math.round(blue); pixels[i * 4 + 3] = alpha[i];
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function light(phase, [x, y]) {
  const settings = { dawn: ["#fff0bd", .13, "#bb8993", .11], day: ["#ffffff", 0, "#ffffff", 0], dusk: ["#edaa6c", .19, "#785674", .28], night: ["#404875", .45, "#252b51", .54] };
  const [a, ao, b, bo] = settings[phase];
  const warmth = phase === "night" ? .22 : phase === "dusk" ? .1 : 0;
  return `<defs><linearGradient id="wash" x2=".75" y2="1"><stop stop-color="${a}" stop-opacity="${ao}"/><stop offset="1" stop-color="${b}" stop-opacity="${bo}"/></linearGradient><radialGradient id="lamp"><stop stop-color="#ffc47e" stop-opacity="${warmth}"/><stop offset="1" stop-color="#ffc47e" stop-opacity="0"/></radialGradient></defs><rect width="600" height="400" fill="url(#wash)"/><ellipse cx="${x}" cy="${y - 28}" rx="106" ry="72" fill="url(#lamp)"/>`;
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
  const original = await readFile(new URL("daylight-concepts/" + place + ".png", sourceFolder));
  const meta = await sharp(original).metadata();
  if (meta.width !== 1200 || meta.height !== 800) throw Error("Unexpected painting size: " + place);
  const sprites = new Map();
  async function register(buffer, left = 0, top = 0) {
    const { width, height } = await sharp(buffer).metadata();
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (!sprites.has(hash)) sprites.set(hash, { buffer, width, height });
    return () => { const p = sprites.get(hash); return [p.x, p.y, width, height, left, top]; };
  }

  async function trimmed(buffer, scale = 2) {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let l = info.width, t = info.height, r = -1, b = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (!data[(y * info.width + x) * 4 + 3]) continue;
      l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y);
    }
    if (r < l) return register(await sharp({ create: { width: 1, height: 1, channels: 4, background: "#00000000" } }).png().toBuffer());
    const crop = await sharp(data, { raw: info }).extract({ left: l, top: t, width: r - l + 1, height: b - t + 1 }).png().toBuffer();
    return register(crop, l / scale, t / scale);
  }

  const frames = { scale: 2, backgrounds: {}, skies: {}, lights: {}, props: [] };
  let base = original;
  if (place === "hall") {
    const empty = await readFile(new URL("empty-case.webp", sourceFolder));
    const inserts = [[59, 163, 180, 84], [255, 163, 177, 84], [446, 163, 174, 84], [634, 163, 171, 84], [59, 259, 254, 89], [329, 259, 227, 89], [571, 259, 234, 89]];
    const layers = [];
    frames.collection = {};
    for (const [i, [key, x, y, w, h]] of caseCells.entries()) {
      const rect = { left: x * 2, top: y * 2, width: w * 2, height: h * 2 };
      frames.collection[key] = [x, y, w, h];
      const [left, top, width, height] = inserts[i];
      const input = await sharp(empty).extract({ left, top, width, height }).resize(rect.width, rect.height, { fit: "fill" }).png().toBuffer();
      layers.push({ input, left: rect.left, top: rect.top });
    }
    base = await sharp(original).composite(layers).png().toBuffer();
  }
  const backdrop = await register(base);
  const [left, top, width, height, maskTop] = windows[place];
  const glass = { left, top, width, height };
  const glassRGB = await sharp(base).extract(glass).removeAlpha().raw().toBuffer();
  const glassAlpha = await sharp(await readFile(new URL("masks/windows.png", sourceFolder)))
    .extract({ left: 0, top: maskTop, width, height }).extractChannel(0).raw().toBuffer();
  if (place === "books") frames.blind = { lowered: {}, raised: {} };
  for (const phase of phases) {
    frames.backgrounds[phase] = backdrop;
    frames.lights[phase] = await trimmed(svg(light(phase, plan.actions[0].anchor), 1), 1);
    const exterior = await sky(glassRGB, glassAlpha, glass, phase);
    frames.skies[phase] = await register(exterior, left / 2, top / 2);
    if (frames.blind) {
      const rect = { left: 802, top: 104, width: 164, height: 101 };
      for (const state of ["lowered", "raised"]) {
        const slats = await sharp(svg(blind(phase, state === "raised"))).extract(rect).png().toBuffer();
        const patch = await sharp(base).extract(rect).composite([
          { input: exterior, left: left - rect.left, top: top - rect.top }, { input: slats },
        ]).png().toBuffer();
        frames.blind[state][phase] = await register(patch, rect.left / 2, rect.top / 2);
      }
    }
  }
  const maskSheet = await readFile(new URL("masks/" + place + ".png", sourceFolder));
  if (walls.length !== silhouettes[place].length) throw Error("Missing prop silhouette for " + place);
  let maskY = 0;
  for (const [i, [name, left, top, width, height]] of silhouettes[place].entries()) {
    if ((matchingFoot[name] ?? name) !== walls[i].label) throw Error("Mismatched footprint: " + name);
    const depth = Math.max(...walls[i].points.map(p => p[1]));
    const rgb = await sharp(base).extract({ left, top, width, height }).removeAlpha().png().toBuffer();
    const alpha = await sharp(maskSheet).extract({ left: 0, top: maskY, width, height }).extractChannel(0).raw().toBuffer();
    const sprite = await sharp(rgb).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
    const frame = await register(sprite, left / 2, top / 2);
    maskY += height;
    frames.props.push({ name, depth, variants: Object.fromEntries(phases.map(p => [p, frame])) });
  }

  if ((await sharp(maskSheet).metadata()).height !== maskY) throw Error("Unused silhouette rows in " + place);
  const atlasWidth = 1720;
  let x = 0, y = 0, shelf = 0;
  const layers = [];
  for (const sprite of [...sprites.values()].sort((a, b) => b.height - a.height)) {
    const cellWidth = sprite.width + 2 * gutter;
    if (x + cellWidth > atlasWidth) { x = 0; y += shelf; shelf = 0; }
    sprite.x = x + gutter; sprite.y = y + gutter;
    layers.push({ input: sprite.buffer, left: sprite.x, top: sprite.y });
    x += cellWidth;
    shelf = Math.max(shelf, sprite.height + 2 * gutter);
  }
  const pixels = await sharp({ create: { width: atlasWidth, height: y + shelf, channels: 4, background: "#00000000" } })
    .composite(layers).webp({ quality: 91, alphaQuality: 100, smartSubsample: true, effort: 5 }).toBuffer();
  await writeFile(new URL(place + ".webp", assetFolder), pixels);
  console.log(place, atlasWidth + "×" + (y + shelf), Math.round(pixels.length / 1024) + " KiB");
  return { title, plan, walls, chat, art: JSON.parse(JSON.stringify(frames, (_, v) => typeof v === "function" ? v() : v)) };
}

await mkdir(assetFolder, { recursive: true });
const data = {};
for (const place of places) data[place] = await compile(place);
await writeFile(new URL("../src/town-interiors.generated.json", import.meta.url),
  "{\n" + places.map(place => "  " + JSON.stringify(place) + ": " + JSON.stringify(data[place])).join(",\n") + "\n}\n");
