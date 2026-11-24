import sharp from "sharp";
import { readFile } from "node:fs/promises";

const colors = {
  florist: { wall: "#e1d9a8", trim: "#687a50", wood: "#c89560", accent: "#c66e86", cloth: "#eed5b1", stitch: "#a4536d", window: [405, 59, 89, 38] },
  baker: { wall: "#f2dfb4", trim: "#a25b43", wood: "#d39a6f", accent: "#a44845", cloth: "#ba6557", stitch: "#ffe3aa", window: [250, 59, 80, 38] },
  maker: { wall: "#dfc8d4", trim: "#775370", wood: "#ab7a68", accent: "#8661a0", cloth: "#67496e", stitch: "#ecc28a", window: [212, 57, 92, 40] },
  post: { wall: "#e4d2a4", trim: "#5b7359", wood: "#c98d60", accent: "#a7564c", cloth: "#567869", stitch: "#eed8a6", window: [348, 60, 78, 37] },
  books: { wall: "#ded3ae", trim: "#53786a", wood: "#ae7e59", accent: "#548579", cloth: "#527a75", stitch: "#d9d6a4", window: [407, 59, 69, 38] },
  radio: { wall: "#9facc0", trim: "#535772", wood: "#8d8592", accent: "#aa667f", cloth: "#73576f", stitch: "#e4b8ab", window: [410, 59, 92, 37] },
  hall: { wall: "#eddbb7", trim: "#956352", wood: "#d1a982", accent: "#a95464", cloth: "#8f5060", stitch: "#f3cd98", window: [218, 57, 143, 42] },
};

const phases = ["dawn", "day", "dusk", "night"];
const clothShape = {
  florist: [465, 207, 101, 53, "rose"], maker: [300, 221, 100, 53, "star"],
  post: [274, 207, 104, 43, "envelope"], books: [460, 177, 103, 54, "flower"],
  hall: [295, 212, 138, 68, "laurel"],
};
const replaceFloorTextiles = new Set(["baker", "maker", "books"]);
const furnitureDress = {
  florist: { 花墙矮柜: [["florist", 309, 106, 40]], 缎带边桌: [["florist", 493, 253, 41]] },
  baker: { 烘焙原料柜: [["baker", 324, 112, 57]], 左侧品尝柜: [["baker", 57, 246, 38]] },
  maker: { 东侧丈量柜: [["maker", 492, 224, 52]] },
  post: { 长柜台: [["post", 185, 116, 52]] },
  books: { 装帧桌: [["books", 75, 132, 50]] },
  radio: { 片带柜: [["radio", 213, 307, 51]] },
  hall: { 靠墙照片边柜: [["hall", 55, 115, 62]] },
};
const wallDisplays = {
  florist: [202, 51, 115, 66], baker: [144, 51, 102, 64], maker: [329, 46, 164, 66],
  post: [433, 48, 131, 63], books: [183, 47, 151, 67], radio: [40, 43, 151, 71], hall: [41, 51, 164, 55],
};
const facePanels = {
  压花台: [415, 167, 102, 9], 木面压模案: [132, 150, 86, 8], 中央试光台: [248, 214, 103, 8],
  邮戳机工作桌: [464, 217, 60, 7], 调音台: [65, 159, 134, 10], 七屋模型展桌: [208, 220, 172, 11],
};
const glowSpots = {
  florist: [[538, 82, 39, 33], [466, 159, 83, 56]], baker: [[82, 109, 55, 53], [474, 106, 55, 47]],
  maker: [[334, 173, 60, 53], [445, 84, 48, 37]], post: [[492, 195, 54, 42], [142, 76, 44, 35]],
  books: [[503, 142, 62, 57], [150, 123, 66, 45]], radio: [[263, 72, 48, 27], [110, 143, 60, 40]],
  hall: [[424, 88, 86, 44], [478, 113, 48, 45]],
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

async function readAtlas(name, names) {
  const image = await readFile(new URL(`../doc/artwork/town-interiors/${name}-atlas.webp`, import.meta.url));
  const { width, height } = await sharp(image).metadata();
  const cellW = width / 4, cellH = height / 2;
  const entries = await Promise.all(names.map(async (key, index) => {
    const cell = await sharp(image).extract({ left: (index % 4) * cellW, top: Math.floor(index / 4) * cellH,
      width: cellW, height: cellH }).png().toBuffer();
    const { data, info } = await sharp(cell).trim({ background: "#00000000", threshold: 9 })
      .png().toBuffer({ resolveWithObject: true });
    return [key, { url: png(data), aspect: info.height / info.width }];
  }));
  return Object.fromEntries(entries);
}

export async function readTownInteriorArt() {
  const names = Object.keys(colors);
  const [decor, walls, skies, town] = await Promise.all([
    readAtlas("dressing", [...names, "ivy"]), readAtlas("wall", [...names, "pendants"]),
    readFile(new URL("../src/assets/window-skies-v12.webp", import.meta.url)),
    readFile(new URL("../src/assets/anniversary-town-hd-v13.webp", import.meta.url)),
  ]);
  const skyFrames = await Promise.all(phases.map(async (phase, index) => [phase, png(await sharp(skies)
    .extract({ left: index % 2 * 768, top: Math.floor(index / 2) * 512 + 28, width: 768, height: 317 })
    .resize(255, 110).png().toBuffer())]));
  const pond = png(await sharp(town).extract({ left: 1350, top: 1626, width: 114, height: 204 })
    .resize(66, 118).png().toBuffer());
  return { decor, walls, pond, skies: Object.fromEntries(skyFrames) };
}

function floor(color, kind, x, y, width, height, next) {
  const parts = [rect(x, y, width, height, dark(color, .53))];
  const tiles = kind === "terracotta" || kind === "stone" || kind === "greenhouse";
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
      const tone = shade(color, (row + Math.floor(left / period)) % 2 ? "#f7dbae" : "#503342", next() * .18);
      parts.push(rect(bx + .45, by + .4, Math.max(.1, w - .85), Math.max(.1, h - .75), tone, tiles ? 'rx="1.2"' : 'rx=".6"'));
      if (w < 5 || h < 4) continue;
      parts.push(line(`M${bx + 2} ${by + 1.4}h${w - 4}`, light(tone, .8), .7, .62));
      parts.push(line(`M${bx + 1.8} ${by + h - 1.6}h${w - 4}`, dark(tone, .62), .7, .48));
      for (let i = 0; i < Math.ceil(w / 14); i++) {
        const gx = round(bx + 2 + next() * (w - 4)), gy = round(by + 2 + next() * (h - 4));
        const stroke = round(Math.min(bx + w - gx - 1, 2 + next() * (tiles ? 9 : 25)));
        if (stroke > 1) parts.push(line(`M${gx} ${gy}q${round(stroke * .4)} ${round(next() - .5)} ${stroke} 0`,
          i % 3 ? dark(tone, .48) : light(tone, .9), .46 + .26 * next(), .12 + .17 * next()));
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
  ];
  const emblem = {
    rose: "M-6 1Q-9 -4 -4 -5Q-4 -9 0 -7Q4 -9 5 -4Q9 -4 7 1Q3 7 0 8Q-4 5-6 1Z",
    flower: "M0 -6C2 -10 6 -6 4 -2C9 -4 10 1 5 2C8 7 2 8 0 4C-3 8-8 7-5 2C-10 1-8 -4-4 -2C-6 -6-2 -10 0 -6Z",
    star: "M0 -9L2.3 -2.8 8.5 -2.8 3.7 1.4 5.4 7.4 0 4 -5.4 7.4 -3.7 1.4 -8.5 -2.8 -2.3 -2.8Z",
    envelope: "M-8 -4H8V5H-8Z M-8 -4L0 1 8 -4",
    laurel: "M-5 -7L-2 -3L0 3L2 -3L5 -7M-7 -1L-4 2L0 4L4 2L7 -1M-5 4L0 8L5 4",
  }[motif];
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, px = round(x + rx * .83 * Math.cos(a)), py = round(y + ry * .83 * Math.sin(a));
    const angle = i * 22.5 + 90;
    fabric.push(`<g transform="translate(${px} ${py}) rotate(${angle}) scale(.62 .51)">${path(emblem,
      petals ? (i % 2 ? stitch : "#816c57") : "none", `stroke="${stitch}" stroke-width="1.35" opacity=".87"`)}</g>`);
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
    rect(x + 4, y + 4, w - 8, h - 8, "none", `stroke="${light(trim, .25)}" stroke-dasharray="1.1 2" stroke-width=".7"`)];
  for (let i = 7; i < w - 5; i += 6) {
    body.push(line(`M${x + i} ${y + 1}v${h - 2}`, gingham ? trimColor : dark(color, .4), gingham ? 2.3 : .43, gingham ? .22 : .24));
    body.push(line(`M${x + i} ${y + h}l.6 2.3`, trimColor, .65, .82));
  }
  if (gingham) for (let i = 8; i < h - 5; i += 6) body.push(line(`M${x + 3} ${y + i}h${w - 6}`, trimColor, 2.2, .25));
  return body.join("");
}

function builtInFrame(theme, doorX) {
  const { wood, trim, accent } = theme;
  const outline = [rect(0, 0, 600, 400, "url(#room-surround)"), rect(8, 20, 584, 351, "url(#edge-wood)",
    'rx="5" stroke="#392839" stroke-width="3"'), rect(14, 29, 572, 338, dark(wood, .39), 'rx="3"'),
  rect(17, 33, 566, 323, "url(#frame-patina)", 'rx="2"')];
  for (const [y, opacity] of [[22, .65], [28, .42], [39, .8], [367, .43], [373, .28]]) {
    outline.push(line(`M13 ${y}H587`, light(wood, .64), 1.25, opacity));
  }
  for (let x = 32; x < 580; x += 38) {
    outline.push(line(`M${x} 35q12 -2 29 -1 M${x} 25q7 1 20 -.3`, dark(wood, .61), .7, .45));
  }
  outline.push(rect(9, 25, 12, 346, "url(#edge-wood)", `rx="2" stroke="${dark(wood, .7)}" stroke-width="1.15"`),
    rect(579, 25, 12, 346, "url(#edge-wood)", `rx="2" stroke="${dark(wood, .7)}" stroke-width="1.15"`));
  for (const x of [13, 584]) {
    outline.push(line(`M${x} 28V365`, light(wood, .62), .8, .71));
    for (const y of [35, 114, 213, 306, 357]) outline.push(circle(x + 2, y, 1.25, light(accent, .56), `stroke="${dark(trim, .69)}" stroke-width=".7"`));
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

function pondWindow(furniture, pond) {
  const colors = { dawn: ["#ffe0a7", .16], day: ["#c5ebce", .05], dusk: ["#e78e92", .24], night: ["#292c5a", .53] };
  // Retain the four real blind positions above the pond pixels.
  return furniture.replace(/(<g class="phase-view phase-(dawn|day|dusk|night)[^"]*" display="(?:none|inline)">\s*)<rect x="28" y="164" width="33" height="59"[^>]*\/>[\s\S]*?(?=<rect x="28" y="164" width="33" height="5\.25")/g,
    (_, header, phase) => {
      const [tint, amount] = colors[phase];
      return `${header}<image href="${pond}" x="28" y="164" width="33" height="59"/>${rect(28, 164, 33, 59, tint, `opacity="${amount}"`)}`;
    });
}

function banner(x, x2, y, depth, theme, pennants) {
  const cord = [line(`M${x} ${y}Q${(x + x2) / 2} ${y + depth * 2} ${x2} ${y}`, dark(theme.trim, .46), .9)];
  for (let n = 0; n < pennants; n++) {
    const f = (n + .5) / pennants, px = round(x + (x2 - x) * f), py = round(y + depth * 4 * f * (1 - f));
    const fill = [theme.accent, light(theme.trim, .36), light(theme.wood, .46)][n % 3];
    cord.push(path(`M${px - 6} ${py}h12l-6 9Z`, fill, `stroke="${dark(fill, .56)}" stroke-width=".65"`),
      line(`M${px - 3} ${py + 2}l3 4 3 -4`, light(fill, .8), .55, .78));
  }
  return cord.join("");
}

function wallAccents(place, theme, stamp) {
  switch (place) {
    case "florist":
      return stamp("ivy", 510, 47, 60) + banner(341, 397, 55, 10, theme, 4);
    case "baker":
      return banner(345, 523, 48, 12, theme, 8) + stamp("ivy", 532, 47, 37);
    case "maker":
      return banner(43, 177, 49, 11, theme, 7) + stamp("ivy", 510, 48, 50);
    case "post":
      return banner(171, 328, 50, 12, theme, 8);
    case "books":
      return banner(50, 172, 48, 8, theme, 6) + stamp("ivy", 497, 48, 65);
    case "radio":
      return banner(257, 358, 51, 8, theme, 5) + stamp("ivy", 514, 45, 42);
    case "hall":
      return stamp("ivy", 495, 46, 62) + banner(464, 520, 50, 8, theme, 4);
  }
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
    if (name === "调音台") {
      pieces.push(line(`M${bx - 4} ${cy + 1}h8m-8 -2h8`, light(theme.trim, .27), .75, .9));
    } else {
      pieces.push(path(`M${bx} ${cy - 1.9}l3 1.9-3 1.9-3-1.9Z`, theme.accent,
        `stroke="${gold}" stroke-width=".55"`));
    }
  }
  return pieces.join("");
}

// The source SVGs carry gameplay geometry. This finish is paint only, with each
// accessory assigned to the same depth layer as the object supporting it.
export function finishTownInterior(place, plan, base, assets) {
  const theme = colors[place];
  const art = ({ url, aspect }, x, y, w) => `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${round(w * aspect)}"/>`;
  const stamp = (name, x, y, w, byFoot = false) => {
    const sprite = assets.decor[name];
    return art(sprite, x, byFoot ? y - round(w * sprite.aspect) : y, w);
  };
  const mount = (name, x, y, w, h) => {
    const sprite = assets.walls[name], width = round(Math.min(w, h / sprite.aspect));
    return art(sprite, x + round((w - width) / 2), y + round((h - width * sprite.aspect) / 2), width);
  };
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
    return tag.replace(`fill="${color}"`, `fill="url(#paint-${color.slice(1)})"`);
  });
  const kind = place === "baker" ? "terracotta" : place === "hall" ? "stone" : place === "maker" ? "parquet" : "wood";
  const architecture = base.architecture.replace(/<rect x="0" y="0" width="600" height="400" fill="[^"]+"\s*\/>/, builtInFrame(theme, plan.exit[0]))
    .replace('fill="url(#wall)"', 'fill="url(#painted-wall)"')
    .replace(/<rect x="24" y="112" width="552" height="239" fill="url\(#floor\)"\s*\/>/,
      floor(theme.wood, kind, 24, 112, 552, 239, randomFloor) + rect(24, 113, 552, 237, "url(#footlight)"));
  let floorDetails = base.floorDetails;
  if (place === "florist") {
    const firstPhase = floorDetails.indexOf('<g class="phase-view');
    floorDetails = '<g clip-path="url(#inside)">' + floor("#9bab83", "greenhouse", 25, 116, 151, 230, random(815)) + floorDetails.slice(firstPhase);
  } else if (place === "radio") {
    const carpets = clothStrip(42, 125, 246, 90, "#7f5266", "#d4ae9d") + clothStrip(411, 125, 132, 91, "#4d657a", "#bbbda8");
    floorDetails = carpets + timedFloorLight(floorDetails);
  } else if (replaceFloorTextiles.has(place)) {
    floorDetails = timedFloorLight(floorDetails);
  }
  const rugArgs = clothShape[place];
  const textiles = rugArgs ? rug(...rugArgs.slice(0, 4), theme.cloth, theme.stitch, rugArgs[4])
    : place === "baker" ? clothStrip(201, 244, 193, 27, theme.cloth, theme.stitch, true) : "";
  const doorstep = clothStrip(plan.spawn[0] - 27, 325, 54, 23, theme.trim, theme.stitch);
  const backWall = windowBackdrop(base.backWall, theme, assets.skies);
  const mounted = mount(place, ...wallDisplays[place]) + (place === "hall" ? mount("pendants", 365, 48, 99, 47) : "");
  const background = architecture + textiles + floorDetails + doorstep + backWall + wallAccents(place, theme, stamp) + mounted;
  const furniture = base.furniture.map(part => {
    const name = part.match(/data-object="([^"]+)"/)[1];
    const accessories = furnitureDress[place][name]?.map(args => stamp(...args, true)).join("") ?? "";
    const source = name === "临池侧窗木座" ? pondWindow(part, assets.pond) : part;
    let painted = name.includes("隔断") || name.includes("玻璃") ? source : surfaces(source);
    if (name === "砖炉和炉膛") {
      for (const color of ["#b67c65", "#d59a77", "#6f554d"]) {
        finish.add(color);
        painted = painted.replace(`fill="${color}"`, `fill="url(#paint-${color.slice(1)})"`);
      }
    }
    return painted + cabinetPanel(name, theme) + accessories;
  });
  const defs = [gradient("room-surround", dark(theme.trim, .75), dark(theme.trim, .97)),
    gradient("edge-wood", light(theme.wood, .48), dark(theme.wood, .57)),
    gradient("frame-patina", dark(theme.wood, .22), dark(theme.wood, .47)),
    gradient("painted-wall", light(theme.wall, .21), shade(theme.wall, theme.trim, .25)),
    '<linearGradient id="footlight" x2="0" y2="1"><stop stop-color="#392736" stop-opacity=".3"/><stop offset=".17" stop-color="#533848" stop-opacity=".02"/><stop offset=".72" stop-color="#fff0b2" stop-opacity=".045"/><stop offset="1" stop-color="#533848" stop-opacity=".18"/></linearGradient>',
    '<radialGradient id="reflected-lamp"><stop stop-color="#ffc982" stop-opacity=".45"/><stop offset=".42" stop-color="#ffd986" stop-opacity=".16"/><stop offset="1" stop-color="#ffce89" stop-opacity="0"/></radialGradient>',
    ...Array.from(finish, color => gradient("paint-" + color.slice(1), light(color, .23), dark(color, .29))),
  ].join("");
  const glows = ["dusk", "night"].map(phase => `<g class="phase-view phase-${phase}" display="none" clip-path="url(#inside)">${glowSpots[place]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#reflected-lamp)" opacity="${phase === "night" ? .75 : .42}"/>`).join("")}</g>`).join("");
  return { defs, background, furniture, glows };
}

function timedFloorLight(source) {
  const layers = source.match(/<g class="phase-view[^>]*>[\s\S]*?<\/g>/g) ?? [];
  return '<g clip-path="url(#inside)">' + layers.join("") + "</g>";
}
