import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { decorateTownInterior } from "./town-interior-celebration.mjs";
import { drawTownWallFurnishings, townFurnishingDefs, redrawTownFurnishing } from "./town-interior-furnishings.mjs";

const colors = {
  florist: { wall: "#e2dfb8", trim: "#54795a", wood: "#ca955e", accent: "#c76f8a", cloth: "#f4dbaf", stitch: "#af5671", window: [405, 59, 89, 38] },
  baker: { wall: "#f5dfb7", trim: "#ad5c45", wood: "#d9a174", accent: "#c26b61", cloth: "#b96464", stitch: "#ffe3aa", window: [250, 59, 80, 38] },
  maker: { wall: "#e2c7d9", trim: "#745582", wood: "#bd8b6c", accent: "#9a73b6", cloth: "#70517f", stitch: "#f2c68b", window: [212, 57, 92, 40] },
  post: { wall: "#f0deae", trim: "#4c7762", wood: "#c7915d", accent: "#bf635c", cloth: "#46786c", stitch: "#eed8a6", window: [348, 60, 78, 37] },
  books: { wall: "#e0dfb9", trim: "#4b7965", wood: "#bb895c", accent: "#5f927d", cloth: "#4b776b", stitch: "#e1d9a1", window: [407, 59, 69, 38] },
  radio: { wall: "#a8b3c3", trim: "#4c506e", wood: "#737b8d", accent: "#c47795", cloth: "#784c66", stitch: "#edbcac", window: [410, 59, 92, 37] },
  hall: { wall: "#f4dfbd", trim: "#965760", wood: "#dfbc91", accent: "#b96375", cloth: "#a25567", stitch: "#f3cd98", window: [218, 57, 143, 42] },
};

const phases = ["dawn", "day", "dusk", "night"];
const clothShape = {
  florist: [465, 207, 101, 53, "rose"], maker: [300, 221, 100, 53, "star"],
  post: [274, 207, 104, 43, "envelope"], books: [460, 177, 103, 54, "flower"],
};
const replaceFloorTextiles = new Set(["baker", "maker", "books", "hall"]);
const facePanels = {
  木面压模案: [132, 150, 86, 8], 中央试光台: [248, 214, 103, 8],
};
const glowSpots = {
  florist: [[538, 82, 39, 33], [466, 159, 83, 56]], baker: [[82, 109, 55, 53], [474, 106, 55, 47]],
  maker: [[334, 173, 60, 53], [445, 84, 48, 37], [516, 134, 38, 24]], post: [[492, 195, 54, 42], [142, 76, 44, 35]],
  books: [[503, 142, 62, 57], [150, 123, 66, 45]], radio: [[263, 72, 48, 27], [110, 143, 60, 40]],
  hall: [[418, 85, 75, 40], [478, 113, 48, 45], [300, 147, 99, 31]],
};

const shade = (color, target, amount) => {
  const from = parseInt(color.slice(1), 16), to = parseInt(target.slice(1), 16);
  return "#" + [16, 8, 0].map(shift => {
    const a = from >> shift & 255, b = to >> shift & 255;
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  }).join("");
};
const light = (c, n) => shade(c, "#fff0c7", n);
const dark = (c, n) => shade(c, "#352135", n);
const round = value => Math.round(value * 10) / 10;
const gradient = (id, top, bottom) => `<linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
const rect = (x, y, w, h, fill, rest = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${rest}/>`;
const path = (d, fill, rest = "") => `<path d="${d}" fill="${fill}" ${rest}/>`;
const line = (d, color, width = 1, opacity = 1) => path(d, "none", `stroke="${color}" stroke-width="${width}" opacity="${opacity}"`);
const circle = (x, y, r, fill, rest = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${rest}/>`;
const png = buffer => `data:image/png;base64,${buffer.toString("base64")}`;

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

async function readPortraits() {
  const album = new URL("../ref/相册/", import.meta.url);
  const { photos } = JSON.parse(await readFile(new URL("album.json", album), "utf8"));
  const portraits = await Promise.all(["morning", "reading", "fox", "bass"].map(async name => {
    const { id, version } = photos.find(photo => photo.id === `fufu-${name}`);
    const image = await readFile(new URL(`previews/${id}.${version}.webp`, album));
    return [name, png(await sharp(image).resize(154, 108, { fit: "cover" }).png().toBuffer())];
  }));
  return Object.fromEntries(portraits);
}

// Keep the luminance of the strokes from the live map paintings and tint them over each room's colors.
async function surfaceSample(image, bounds, amount) {
  const { data, info } = await sharp(image)
    .extract(bounds).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const values = Array.from({ length: width * height }, (_, i) =>
    data[i * channels] * .25 + data[i * channels + 1] * .64 + data[i * channels + 2] * .11);
  const columns = new Float32Array(width), rows = new Float32Array(height);
  for (const [i, value] of values.entries()) {
    columns[i % width] += value / height;
    rows[Math.floor(i / width)] += value / width;
  }
  const mean = columns.reduce((sum, value) => sum + value, 0) / width;
  const pixels = Buffer.alloc(values.length * 4);
  for (const [i, value] of values.entries()) {
    const x = i % width, y = Math.floor(i / width);
    // Remove the baked light sweep and blend away the sample edges before tiling.
    const delta = value - mean - (columns[x] - mean) * .94 - (rows[y] - mean) * .75;
    const taper = Math.min(1, (x + .5) * 14 / width, (width - x - .5) * 14 / width,
      (y + .5) * 8 / height, (height - y - .5) * 8 / height);
    const [r, g, b] = delta < 0 ? [93, 64, 59] : [255, 231, 179];
    pixels.set([r, g, b, Math.round(Math.min(55, Math.abs(delta) * amount) * taper)], i * 4);
  }
  return png(await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer());
}

async function readSurfaceSamples() {
  const [cottage, paving] = await Promise.all([
    readFile(new URL("../src/assets/room-interactive.webp", import.meta.url)),
    readFile(new URL("../src/assets/town-paving-v12.webp", import.meta.url)),
  ]);
  const [oak1, oak2, stone, fabric] = await Promise.all([
    surfaceSample(cottage, { left: 485, top: 304, width: 304, height: 24 }, 5.2),
    surfaceSample(cottage, { left: 645, top: 332, width: 338, height: 25 }, 4.8),
    surfaceSample(paving, { left: 301, top: 89, width: 56, height: 35 }, 2.2),
    surfaceSample(cottage, { left: 1190, top: 315, width: 118, height: 67 }, 1.8),
  ]);
  return { oak1, oak2, stone, fabric };
}

function surfacePatterns({ oak1, oak2, stone, fabric }) {
  return `<pattern id="cottage-oak" width="146" height="33" patternUnits="userSpaceOnUse">
    <image href="${oak1}" width="146" height="16.5" preserveAspectRatio="none"/>
    <image href="${oak2}" y="16.5" width="146" height="16.5" preserveAspectRatio="none"/>
  </pattern><pattern id="town-stone" width="32" height="23" patternUnits="userSpaceOnUse">
    <image href="${stone}" width="32" height="23" preserveAspectRatio="none"/>
  </pattern><pattern id="cottage-fabric" width="31" height="19" patternUnits="userSpaceOnUse">
    <image href="${fabric}" width="31" height="19" preserveAspectRatio="none"/>
  </pattern>`;
}

export async function readTownInteriorArt() {
  const [portraits, materials, skies] = await Promise.all([
    readPortraits(), readSurfaceSamples(),
    readFile(new URL("../src/assets/window-skies-v12.webp", import.meta.url)),
  ]);
  const skyFrames = await Promise.all(phases.map(async (phase, index) => [phase, png(await sharp(skies)
    .extract({ left: index % 2 * 768, top: Math.floor(index / 2) * 512 + 28, width: 768, height: 317 })
    .resize(255, 110).png().toBuffer())]));
  return { portraits, materials, skies: Object.fromEntries(skyFrames) };
}

function floor(color, kind, x, y, width, height, next) {
  const tiles = kind === "terracotta" || kind === "stone" || kind === "greenhouse";
  const parts = [rect(x, y, width, height, dark(color, tiles ? .49 : .42))];
  const texture = tiles ? "url(#town-stone)" : "url(#cottage-oak)";
  const stepY = kind === "stone" ? 29 : tiles ? 19 : 17;
  for (let row = 0; row * stepY < height; row++) {
    const top = row * stepY, h = Math.min(stepY, height - top);
    const period = kind === "greenhouse" ? 34 : kind === "stone" ? 49 : 36;
    let right = -Math.round(next() * (tiles ? period : 136));
    while (right < width) {
      const length = tiles ? period : (kind === "parquet" ? 54 : 90) + Math.round(next() * 73);
      const left = Math.max(0, right), w = Math.min(width, right + length) - left;
      right += length;
      if (w < 1) continue;
      const bx = x + left, by = y + top;
      const tone = shade(color, (row + Math.floor(left / period)) % 2 ? "#fae4b3" : "#713e38", next() * (tiles ? .23 : .16));
      const tile = [bx + .45, by + .4, Math.max(.1, w - .85), Math.max(.1, h - .75)];
      const radius = tiles ? 'rx="1.6"' : 'rx=".85"';
      parts.push(rect(...tile, tone, radius), rect(...tile, texture, radius + ' opacity=".87"'));
      if (w < 5 || h < 4) continue;
      parts.push(line(`M${bx + 2} ${by + 1.35}h${w - 4}`, light(tone, .83), .75, .72));
      parts.push(line(`M${bx + 1.8} ${by + h - 1.15}h${w - 4}`, dark(tone, .58), .6, .50));
      for (let i = 0; i < Math.ceil(w / 20); i++) {
        const gx = round(bx + 2 + next() * (w - 4)), gy = round(by + 2 + next() * (h - 4));
        const stroke = round(Math.min(bx + w - gx - 1, 2 + next() * (tiles ? 9 : 25)));
        if (stroke > 1) parts.push(line(`M${gx} ${gy}q${round(stroke * .4)} ${round(next() - .5)} ${stroke} 0`,
          i % 3 ? dark(tone, .55) : light(tone, .9), .33 + .30 * next(), .13 + .16 * next()));
      }
      if (tiles && w >= period - 1 && h >= stepY - 1 && (kind === "greenhouse" || kind === "stone") && (row + Math.floor(left / period)) % 2 === 0) {
        const gx = bx + w / 2, gy = by + h / 2;
        parts.push(path(`M${gx} ${gy - 3}l4 3-4 3-4-3Z`, dark(tone, .31), `stroke="${light(tone, .47)}" stroke-width=".45"`));
      } else if (!tiles && w > 30 && h > 7 && next() > .6) {
        const gx = bx + Math.round(w * (.25 + next() * .5)), gy = by + 6;
        parts.push(line(`M${gx - 9} ${gy + 1}q5 -3 11 -1t13 -.6 M${gx - 5} ${gy + 1}q4 -1 7 0t-7 0Z`, dark(tone, .54), .6, .36));
      }
    }
  }
  return parts.join("");
}

function wainscot(theme) {
  const parts = [rect(24, 88, 552, 25, "url(#wainscot)"), line("M24 89h552", light(theme.wall, .66), 1.1, .8)];
  for (let x = 28; x < 552; x += 28) {
    parts.push(rect(x, 92, 23, 14, light(theme.trim, .19), `rx=".8" stroke="${dark(theme.trim, .54)}" stroke-width=".8"`),
      line(`M${x + 2} 103V93h19`, light(theme.trim, .65), .55, .86),
      line(`M${x + 7} 101q3 -4 10 -4m-8 4 3-2`, light(theme.trim, .73), .46, .37));
  }
  return parts.join("");
}

function ovenMasonry() {
  const glaze = ["#b9795b", "#d49b72", "#c58764", "#a86450", "#d29b77", "#bd7758"];
  const bricks = [];
  for (let row = 0; row < 10; row++) {
    const y = 62 + row * 8;
    for (let col = 0; col < 10; col++) {
      const x = 33 + col * 11 + row % 2 * 5.5;
      const fill = glaze[(col * 7 + row * 5) % glaze.length];
      bricks.push(rect(x, y, 10.9, 7.9, fill, 'rx="1.2" stroke="#704838" stroke-width=".6"'),
        line(`M${x + 1.3} ${y + 1.1}h7.8m-5.1 3.5 1.8-.4 1.9.4`, light(fill, .65), .65, .8),
        line(`M${x + 1.4} ${y + 6.7}h7.5`, dark(fill, .36), .52, .75));
    }
  }
  const mouth = "M50 135v-25q0-26 31-27q31 0 33 27v25";
  return `<g clip-path="url(#oven-brick-face)">${bricks.join("")}</g>` +
    line(mouth, "#f6bf83", 2, .82) + line(mouth, "#754d3d", .55, .82) +
    path("M75 78Q82 67 89 78L84 82H80Z", "#ad5948", 'stroke="#f7c786" stroke-width="1"') +
    line("M41 136h83", "#ffe1a4", 1.1, .74);
}

function rug(x, y, rx, ry, color, stitch, motif) {
  const petals = motif === "rose" || motif === "flower";
  const ring = (scale, n, waved) => Array.from({ length: n }, (_, i) => {
    const angle = i * Math.PI * 2 / n;
    const r = scale * (waved && i % 3 === 0 ? .98 : 1);
    return `${round(x + rx * r * Math.cos(angle))},${round(y + ry * r * Math.sin(angle))}`;
  }).join(" ");
  const carpet = (s, fill, stroke, width, more = "") => `<polygon points="${ring(s, petals ? 96 : 12, petals)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${more}/>`;
  const fabric = [
    `<g transform="translate(0 3)" opacity=".26">${carpet(1.014, "#56283a", "#56283a", 1.6)}</g>`,
    carpet(1, dark(color, .34), dark(color, .61), 1.4), carpet(.977, light(color, .17), stitch, 1.3),
    carpet(.93, color, dark(stitch, .37), .8), carpet(.87, "none", stitch, .95, 'stroke-dasharray=".8 2.3"'),
    carpet(.78, light(color, .075), light(color, .24), .65),
    carpet(.92, "url(#cottage-fabric)", "none", 0, 'opacity=".43"'),
  ];
  const emblem = {
    rose: "M-6 1Q-9 -4 -4 -5Q-4 -9 0 -7Q4 -9 5 -4Q9 -4 7 1Q3 7 0 8Q-4 5-6 1Z",
    flower: "M0 -6C2 -10 6 -6 4 -2C9 -4 10 1 5 2C8 7 2 8 0 4C-3 8-8 7-5 2C-10 1-8 -4-4 -2C-6 -6-2 -10 0 -6Z",
    star: "M0 -9L2.3 -2.8 8.5 -2.8 3.7 1.4 5.4 7.4 0 4 -5.4 7.4 -3.7 1.4 -8.5 -2.8 -2.3 -2.8Z",
    envelope: "M-8 -4H8V5H-8Z M-8 -4L0 1 8 -4",
  }[motif];
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, px = round(x + rx * .83 * Math.cos(a)), py = round(y + ry * .83 * Math.sin(a));
    const angle = i * 22.5 + 90;
    fabric.push(`<g transform="translate(${px} ${py}) rotate(${angle}) scale(.62 .51)">${path(emblem,
      petals ? (i % 2 ? stitch : "#816c57") : "none", `stroke="${stitch}" stroke-width="1.35" opacity=".87"`)}</g>`);
  }
  if (petals) {
    fabric.push(carpet(.98, "none", light(stitch, .62), 1, 'stroke-dasharray=".9 2.35" opacity=".72"'));
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI / 15, px = round(x + rx * .77 * Math.cos(a)), py = round(y + ry * .77 * Math.sin(a));
      const angle = i * 12 + 83;
      fabric.push(`<g transform="translate(${px} ${py}) rotate(${angle})"><path d="M0 0q2-2.7 4-.8Q3.5 1.5 0 0Z" fill="${i % 2 ? "#92a078" : "#bb907e"}" opacity=".68"/></g>`);
    }
  }
  const threads = Array.from({ length: 22 }, (_, i) => {
    const along = (i - 10.5) / 12;
    const length = round(rx * .7 * Math.sqrt(1 - along ** 2));
    return line(`M${x - length} ${round(y + ry * .73 * along)}h${2 * length}`, dark(color, .3), .5, .17);
  });
  return fabric.concat(threads).join("");
}

function clothStrip(x, y, w, h, color, trim, gingham = false) {
  const trimColor = light(trim, .53);
  const body = [rect(x, y + 2, w, h + 1.5, "#492636", 'rx="3" opacity=".29"'),
    rect(x, y, w, h, dark(color, .25), `rx="3" stroke="${dark(color, .53)}" stroke-width=".9"`),
    rect(x + 2, y + 2, w - 4, h - 4, color, `rx="1" stroke="${trimColor}" stroke-width=".95"`),
    rect(x + 2.5, y + 2.5, w - 5, h - 5, "url(#cottage-fabric)", 'rx="1" opacity=".39"'),
    rect(x + 4, y + 4, w - 8, h - 8, "none", `stroke="${light(trim, .25)}" stroke-dasharray="1.1 2" stroke-width=".7"`)];
  for (let i = 7; i < w - 5; i += 6) {
    body.push(line(`M${x + i} ${y + 1}v${h - 2}`, gingham ? trimColor : dark(color, .4), gingham ? 2.3 : .43, gingham ? .22 : .24));
    body.push(line(`M${x + i} ${y + h}l.6 2.3`, trimColor, .65, .82));
  }
  if (gingham) for (let i = 8; i < h - 5; i += 6) body.push(line(`M${x + 3} ${y + i}h${w - 6}`, trimColor, 2.2, .25));
  return body.join("");
}

function galleryRunner(theme) {
  const leaf = "M0 0q-6-4-6-10q5 2 6 10Zm0 0q5-5 8-6q-.6 5-8 6Z";
  const sprigs = [225, 242, 280, 297].map((y, i) => {
    const angle = i < 2 ? 0 : 180;
    return [262, 338].map(x => `<g transform="translate(${x} ${y}) rotate(${angle})">` +
      path(leaf, theme.stitch, 'opacity=".35"') + line(leaf, theme.stitch, .51, .75) + "</g>").join("");
  }).join("");
  return clothStrip(246, 203, 108, 126, theme.cloth, theme.stitch) + sprigs +
    line("M254 224v-13h13m66 0h13v13m-92 83v13h13m66 0h13v-13", theme.stitch, .94, .68) +
    line("M300 245l16 16-16 16-16-16Z M300 251l10 10-10 10-10-10Z", theme.stitch, 1.05, .58) +
    line("M278 261q-7-9-14-8q4 6 14 8q-10 1-13 8q8-1 13-8m44 0q7-9 14-8q-4 6-14 8q10 1 13 8q-8-1-13-8", theme.stitch, .85, .62);
}

function furnishingFloor(place) {
  switch (place) {
    case "florist":
      return clothStrip(198, 277, 95, 43, "#809276", "#efce9e") +
        line("M205 304q8 3 17-.5m-13 2q1-5 6-6q.7 4-6 6m73-1q-1-5-6-6q-.7 4 6 6", "#e7d1a0", .76, .86) +
        line("M42 267h82v58H42Zm3 3h76v52H45Z", "#4b735e", .8, .49) +
        line("M45 269h76v53H45Z", "#e6dbad", .53, .68);
    case "baker":
      return clothStrip(111, 282, 112, 38, "#ab6666", "#f0cf9c", true);
    case "maker":
      return clothStrip(466, 146, 94, 32, "#6c566d", "#e4ba89") +
        line("M472 174h80m-80-1 5-4 5 4 5-4 5 4m42 0 5-4 5 4 5-4 5 4", "#e6c094", .78, .83);
    case "post":
      return clothStrip(210, 292, 174, 37, "#637e70", "#e3c39b") +
        line("M273 307h16v10h-16Zm0 .5 8 5 8-5m-12 13h8", "#ebce9f", .77, .76);
    case "books":
      return clothStrip(113, 281, 115, 40, "#7a8d79", "#e9ce9e") +
        line("M118 313q4-3 9 0q5-3 9 0v3q-4-3-9 0q-5-3-9 0Zm9 0v3m80-3q4-3 8 0q5-3 8 0v3q-4-3-8 0q-5-3-8 0Zm8 0v3", "#eed6a4", .7, .88);
    case "radio": {
      const cable = "M60 180q-24 5-20 30t15 22q10 3 7 13";
      return clothStrip(508, 240, 58, 34, "#57536a", "#b9afa3") +
        line(cable, "#3a3746", 2.2, .81) + line(cable, "#8a7b82", .51, .84);
    }
    case "hall":
      return clothStrip(48, 216, 96, 33, "#aa6b74", "#e4bf8e") +
        clothStrip(365, 228, 80, 29, "#ac7380", "#e4bf8e") +
        line("M54 243h84m235 8h64", "#e7c99c", .67, .83);
  }
}

function builtInFrame(theme, doorX) {
  const { wood, trim, accent } = theme;
  const beam = `stroke="${dark(wood, .64)}" stroke-width="1.2"`;
  const outline = [rect(0, 0, 600, 400, "url(#room-surround)"),
    rect(5, 10, 590, 367, "url(#edge-wood)", `rx="5" ${beam}`),
    rect(12, 18, 576, 353, "url(#frame-patina)", 'rx="3"'),
    rect(14, 19, 572, 350, "url(#cottage-oak)", 'rx="3" opacity=".62"'),
    rect(17, 32, 566, 325, dark(wood, .41), 'rx="2"'),
    rect(20, 40, 560, 315, light(theme.wall, .17), 'rx="1"')];
  for (const [y, opacity] of [[12, .82], [23, .5], [34, .71], [359, .58], [370, .72]]) {
    outline.push(line(`M13 ${y}H587`, light(wood, .78), 1.3, opacity));
  }
  for (let x = 32; x < 580; x += 38) {
    outline.push(line(`M${x} 35q12 -2 29 -1 M${x} 25q7 1 20 -.3`, dark(wood, .61), .7, .45));
  }
  outline.push(path("M8 15h41L22 49l-5 2Z M592 15h-41l27 34 5 2Z", light(wood, .34), beam),
    line("M13 17h28L21 43m566-26h-28l20 26", light(wood, .68), .85, .84),
    rect(8, 39, 13, 333, "url(#edge-wood)", `rx="1.6" ${beam}`),
    rect(579, 39, 13, 333, "url(#edge-wood)", `rx="1.6" ${beam}`));
  for (const x of [13, 584]) {
    outline.push(line(`M${x} 41V369`, light(wood, .74), .85, .77));
    for (const y of [47, 114, 213, 306, 357]) outline.push(circle(x + 2, y, 1.25, light(accent, .63), `stroke="${dark(trim, .57)}" stroke-width=".7"`));
  }
  // Treads below the walkable landing give the cropped room a visible doorway.
  outline.push(path(`M${doorX - 30} 348h60l5 37h-70Z`, "url(#edge-wood)", 'stroke="#4b322f" stroke-width="1.1"'),
    line(`M${doorX - 30} 361h60m-62 7h64m-65 8h66`, light(wood, .74), 1.65, .85),
    line(`M${doorX - 34} 382h68`, dark(wood, .58), 2));
  return outline.join("");
}

function windowBackdrop(backWall, theme, skies) {
  const [x, y, w, h] = theme.window;
  const pane = new RegExp(`<g class="phase-view phase-(dawn|day|dusk|night)[^"]*" display="(?:none|inline)">\\s*<rect x="${x}" y="${y}" width="${w}" height="${h}"[^>]*\\/>[\\s\\S]*?<\\/g>`, "g");
  const replaced = new Set();
  const next = backWall.replace(pane, (_, phase) => {
    replaced.add(phase);
    return `<g class="phase-view phase-${phase}" display="none"><image href="${skies[phase]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>
      ${line(`M${x + 1.5} ${y + h - 1.6}V${y + 1.5}H${x + w - 1.5}`, "#fff3ce", .85, .51)}</g>`;
  });
  if (replaced.size !== phases.length) throw Error(`Missing sky pane at ${x}, ${y}`);
  return next;
}

function cabinetPanel(name, theme) {
  const panel = facePanels[name];
  if (!panel) return "";
  const [x, y, w, h] = panel;
  const gold = light(theme.stitch, .53), wood = dark(theme.wood, .45);
  const pieces = [rect(x, y, w, h, dark(theme.trim, .26), `rx="1.3" stroke="${wood}" stroke-width=".85"`),
    line(`M${x + 3} ${y + 1}h${w - 6}`, gold, .6, .78),
    line(`M${x + 3} ${y + h - 1.2}h${w - 6}`, light(theme.trim, .49), .55, .7)];
  for (let i = 8; i <= w - 8; i += 12) {
    const bx = x + i, cy = y + h / 2;
    pieces.push(path(`M${bx} ${cy - 1.9}l3 1.9-3 1.9-3-1.9Z`, theme.accent,
      `stroke="${gold}" stroke-width=".55"`));
  }
  return pieces.join("");
}

// The source SVGs carry gameplay geometry. This finish is paint only, with each
// accessory assigned to the same depth layer as the object supporting it.
export function finishTownInterior(place, plan, base, assets) {
  const theme = colors[place];
  const celebration = decorateTownInterior(place, plan, assets);
  const randomFloor = random(Array.from(place).reduce((key, char) => key * 13 + char.charCodeAt(0), 619));
  const finish = new Set();
  const surfaces = part => part.replace(/<(?:rect|polygon)\b[^>]*>/g, tag => {
    const color = tag.match(/ fill="(#[\da-f]{6})"/i)?.[1];
    if (!color || tag.includes("fill-opacity") || tag.includes(" opacity=")) return tag;
    const width = Number(tag.match(/ width="([\d.]+)"/)?.[1]);
    const height = Number(tag.match(/ height="([\d.]+)"/)?.[1]);
    const points = tag.match(/ points="([^"]+)"/)?.[1]?.split(" ").map(pair => pair.split(",").map(Number));
    const panel = width >= 19 && height >= 6 || points && Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])) >= 28;
    if (!panel) return tag;
    finish.add(color);
    const painted = tag.replace(`fill="${color}"`, `fill="url(#paint-${color.slice(1)})"`);
    const grain = tag.replace(/ stroke(?:-width|-opacity)?="[^"]*"/g, "").replace(`fill="${color}"`, 'fill="url(#furniture-grain)"');
    return painted + grain;
  });
  const kind = place === "baker" ? "terracotta" : place === "hall" ? "stone" : place === "maker" ? "parquet" : "wood";
  const architecture = base.architecture.replace(/<rect x="0" y="0" width="600" height="400" fill="[^"]+"\s*\/>/, builtInFrame(theme, plan.exit[0]))
    .replace('<rect x="24" y="51" width="552" height="63" fill="url(#wall)" />',
      rect(24, 51, 552, 63, "url(#painted-wall)") + rect(24, 51, 552, 63, "url(#cottage-oak)", 'opacity=".19"') + wainscot(theme))
    .replace(/<rect x="24" y="112" width="552" height="239" fill="url\(#floor\)"\s*\/>/,
      floor(theme.wood, kind, 24, 112, 552, 239, randomFloor) + rect(24, 113, 552, 237, "url(#footlight)") +
      rect(24, 113, 552, 237, "url(#warm-floor)", place === "radio" ? 'opacity=".49"' : ""));
  const furnishingDetails = furnishingFloor(place);
  let floorDetails = furnishingDetails + base.floorDetails;
  if (place === "florist") {
    const firstPhase = base.floorDetails.indexOf('<g class="phase-view');
    floorDetails = '<g clip-path="url(#inside)">' + floor("#9bab83", "greenhouse", 25, 116, 151, 230, random(815)) +
      furnishingDetails + base.floorDetails.slice(firstPhase);
  } else if (place === "radio") {
    const carpets = clothStrip(42, 125, 246, 90, "#7f5266", "#d4ae9d") + clothStrip(411, 125, 132, 91, "#4d657a", "#bbbda8");
    floorDetails = carpets + furnishingDetails + timedFloorLight(base.floorDetails);
  } else if (replaceFloorTextiles.has(place)) {
    floorDetails = furnishingDetails + timedFloorLight(base.floorDetails);
  }
  const rugArgs = clothShape[place];
  const runner = place === "hall" ? galleryRunner(theme)
    : place === "maker" ? rug(104, 236, 68, 37, "#684f67", theme.stitch, "star")
    : place === "books" ? clothStrip(270, 218, 70, 111, "#5e7769", "#dac999") : "";
  const textiles = rugArgs ? rug(...rugArgs.slice(0, 4), theme.cloth, theme.stitch, rugArgs[4])
    : place === "baker" ? clothStrip(169, 230, 243, 39, theme.cloth, theme.stitch, true) : "";
  const doorstep = clothStrip(plan.spawn[0] - 27, 325, 54, 23, theme.trim, theme.stitch);
  const backWall = windowBackdrop(base.backWall, theme, assets.skies);
  const mounted = drawTownWallFurnishings(place);
  const background = architecture + runner + textiles + floorDetails + celebration.floor + doorstep + backWall + mounted + celebration.wall;
  const furniture = base.furniture.map(part => {
    const name = part.match(/data-object="([^"]+)"/)[1];
    const redrawn = redrawTownFurnishing(place, name, part, assets);
    if (redrawn) return redrawn + celebration.furniture(name);
    let painted = name.includes("隔断") || name.includes("玻璃") ? part : surfaces(part);
    if (name === "砖炉和炉膛") {
      for (const color of ["#b67c65", "#d59a77", "#6f554d"]) {
        finish.add(color);
        painted = painted.replace(`fill="${color}"`, `fill="url(#paint-${color.slice(1)})"`);
      }
      painted = painted.replace('<path d="M51 135', ovenMasonry() + '<path d="M51 135');
    }
    return painted + cabinetPanel(name, theme) + celebration.furniture(name);
  });
  const defs = [gradient("room-surround", shade(theme.wood, "#563843", .71), shade(theme.wood, "#54353f", .82)),
    gradient("edge-wood", light(theme.wood, .58), dark(theme.wood, .43)),
    gradient("frame-patina", light(theme.wood, .24), dark(theme.wood, .43)),
    gradient("painted-wall", light(theme.wall, .35), shade(theme.wall, theme.trim, .24)),
    gradient("wainscot", light(theme.trim, .38), dark(theme.trim, .14)),
    '<linearGradient id="footlight" x2="0" y2="1"><stop stop-color="#392736" stop-opacity=".3"/><stop offset=".17" stop-color="#533848" stop-opacity=".02"/><stop offset=".72" stop-color="#fff0b2" stop-opacity=".045"/><stop offset="1" stop-color="#533848" stop-opacity=".18"/></linearGradient>',
    '<radialGradient id="warm-floor" cx="55%" cy="38%" r="68%"><stop stop-color="#ffe3a2" stop-opacity=".23"/><stop offset=".59" stop-color="#fff2be" stop-opacity=".08"/><stop offset="1" stop-color="#793f39" stop-opacity=".06"/></radialGradient>',
    '<radialGradient id="reflected-lamp"><stop stop-color="#ffc982" stop-opacity=".45"/><stop offset=".42" stop-color="#ffd986" stop-opacity=".16"/><stop offset="1" stop-color="#ffce89" stop-opacity="0"/></radialGradient>',
    `<pattern id="furniture-grain" width="80" height="10" patternUnits="userSpaceOnUse"><image href="${assets.materials.oak2}" width="80" height="10" preserveAspectRatio="none" opacity=".89"/></pattern>`,
    '<clipPath id="oven-brick-face"><path d="M42 137v-30q0-40 40-41q43 1 43 41v30Z M50 137v-26q0-27 31-28q31 0 33 28v26Z" clip-rule="evenodd"/></clipPath>',
    surfacePatterns(assets.materials), townFurnishingDefs(place),
    celebration.defs,
    ...Array.from(finish, color => gradient("paint-" + color.slice(1), light(color, .23), dark(color, .29))),
  ].join("");
  const glows = ["dusk", "night"].map(phase => `<g class="phase-view phase-${phase}" display="none" clip-path="url(#inside)">${glowSpots[place]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#reflected-lamp)" opacity="${phase === "night" ? .75 : .42}"/>`).join("")}</g>`).join("");
  return { defs, background, furniture, glows: glows + celebration.glows, sign: celebration.sign };
}

function timedFloorLight(source) {
  const layers = source.match(/<g class="phase-view[^>]*>[\s\S]*?<\/g>/g) ?? [];
  return '<g clip-path="url(#inside)">' + layers.join("") + "</g>";
}
