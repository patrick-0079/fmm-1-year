const scheme = {
  florist: {
    ink: "#64394c", silk: "#af596d", enamel: "#446d56",
    sign: { x: 341, y: 69, w: 62, h: 36, title: "晚安花礼", detail: "芙眠眠一周年", size: 11 },
    pictures: [["morning", 503, 68, 55, 37]], swag: [300, 39, 63],
    balloons: { 花店南壁盆栽: [552, 318, 1] }, strand: [191, 559, 40, 15, 17],
  },
  baker: {
    ink: "#783546", silk: "#c36468", enamel: "#8d4446",
    sign: { x: 341, y: 51, w: 96, h: 34, title: "周年甜点", detail: "草莓与奶油", size: 13 },
    pictures: [["morning", 512, 69, 49, 33]], swag: [431, 37, 78],
    balloons: { 南角香草盆: [55, 317, -1] }, strand: [47, 553, 40, 14, 21],
  },
  maker: {
    ink: "#472e57", silk: "#84649e", enamel: "#66517c",
    sign: { x: 59, y: 57, w: 99, h: 32, title: "周年星月饰", detail: "芙眠眠一周年", size: 12 },
    pictures: [["fox", 509, 66, 53, 36]], swag: [156, 38, 62],
    balloons: {}, strand: [40, 560, 40, 11, 20],
  },
  post: {
    ink: "#344d47", silk: "#ac625c", enamel: "#395e50",
    sign: { x: 187, y: 63, w: 132, h: 40, title: "寄一封晚安", detail: "芙眠眠直播一周年", size: 14 },
    pictures: [["fox", 49, 46, 39, 26], ["morning", 104, 45, 40, 27]], swag: [411, 39, 67],
    balloons: { 信袋底: [516, 303, 1] }, strand: [48, 558, 39, 13, 19],
  },
  books: {
    ink: "#3e4c44", silk: "#5f8a78", enamel: "#3d6660",
    sign: { x: 491, y: 64, w: 72, h: 35, title: "晚安留影", detail: "芙眠眠一周年", size: 12 },
    pictures: [["reading", 48, 63, 49, 34], ["fox", 105, 60, 54, 37]], swag: [328, 37, 69],
    balloons: {}, strand: [41, 550, 40, 14, 18],
  },
  radio: {
    ink: "#392e51", silk: "#825169", enamel: "#444967",
    sign: { x: 210, y: 84, w: 131, h: 30, title: "一周年特别节目", detail: "晚安电台", size: 12 },
    pictures: [["bass", 514, 65, 48, 34]], swag: [348, 39, 65],
    balloons: {}, strand: [48, 560, 39, 12, 17],
  },
  hall: {
    ink: "#733047", silk: "#af536d", enamel: "#883e50",
    sign: { x: 196, y: 88, w: 208, h: 34, title: "芙眠眠直播一周年", date: true, size: 15 },
    pictures: [["reading", 117, 54, 47, 34], ["bass", 183, 62, 29, 26]],
    swag: [474, 38, 90],
    balloons: { 相片墙旁绿植: [48, 280, -1], 展厅东南角绿植: [544, 306, 1] }, strand: [43, 557, 40, 15, 25],
  },
};

const brass = "#d7a45f", highlight = "#ffdda4", shadow = "#4b263a";
const round = n => Math.round(n * 10) / 10;
const rect = (x, y, w, h, fill, attrs = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${attrs}/>`;
const path = (d, fill, attrs = "") => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const circle = (x, y, r, fill, attrs = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${attrs}/>`;
const stroke = (d, color, width, opacity = 1) => path(d, "none", `stroke="${color}" stroke-width="${width}" opacity="${opacity}"`);

function curtainTie([x, y, width], design) {
  const right = x + width;
  const lower = `M${x} ${y + 5}q${width * .5} 28 ${width} 0l-3 8q-${width * .48} 23-${width - 6} 0Z`;
  const bows = [x + 2, right - 2].map(end => {
    const knot = `M${end} ${y + 7}q-11-9-12-1q-2 7 12 4q15 3 12-5q-3-6-12 2Z`;
    return path(knot, design.silk, `stroke="${design.ink}" stroke-width=".72"`) +
      stroke(`M${end - 9} ${y + 4}l9 5 8-5`, highlight, .52, .87) +
      path(`M${end - 1} ${y + 9}l-5 15 4-2 2 2 4-14Z`, design.silk, `stroke="${design.ink}" stroke-width=".65"`) +
      circle(end, y + 8.4, 2, brass, `stroke="${design.ink}" stroke-width=".5"`);
  }).join("");
  return path(lower, design.silk, `stroke="${design.ink}" stroke-width=".82"`) +
    path(lower, "url(#celebration-velvet)") + stroke(`M${x + 5} ${y + 9}q${width * .45} 23 ${width - 10} 0`, highlight, .72, .77) + bows;
}

function picture(photo, x, y, w, h, design) {
  return rect(x - 2, y + 2, w + 4, h + 3, shadow, 'rx="2" opacity=".34"') +
    rect(x - 2, y - 2, w + 4, h + 4, design.ink, `rx="1.5" stroke="${brass}" stroke-width="1"`) +
    rect(x + 1, y + 1, w - 2, h - 2, "#efd0a4", `stroke="${highlight}" stroke-width=".55"`) +
    `<image href="${photo}" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" preserveAspectRatio="xMidYMid slice"/>` +
    stroke(`M${x + 4} ${y + h - 4}V${y + 4}H${x + w - 4}`, "#543343", .65, .7) +
    stroke(`M${x + 1} ${y + h - 2}l4 -4m${w - 10} 0 4 4`, highlight, .9);
}

function plaque(design) {
  const { x, y, w, h } = design.sign;
  const shape = `M${x + 6} ${y}h${w - 12}q1 5 6 6v${h - 12}q-5 1-6 6h-${w - 12}q-1-5-6-6v-${h - 12}q5-1 6-6Z`;
  return path(shape, shadow, 'transform="translate(0 2.5)" opacity=".46"') +
    path(shape, design.enamel, `stroke="${shadow}" stroke-width="2"`) + path(shape, "url(#celebration-velvet)") +
    path(shape, "none", `stroke="${brass}" stroke-width="1.1"`) +
    rect(x + 4, y + 4, w - 8, h - 8, "none", `rx="2" stroke="${highlight}" stroke-width=".55" opacity=".7"`) +
    circle(x + 7, y + 7, 1.05, highlight) + circle(x + w - 7, y + 7, 1.05, highlight) +
    circle(x + 7, y + h - 7, 1.05, brass) + circle(x + w - 7, y + h - 7, 1.05, brass);
}

function garland([x, end, y, sag, count], design) {
  const control = round((x + end) / 2);
  const cord = `M${x} ${y}Q${control} ${y + sag * 2} ${end} ${y}`;
  const thread = stroke(cord, shadow, 2, .78) + stroke(cord, highlight, .7, .83);
  const star = "M0 -4.6l1.4 2.9 3.3 .4 -2.4 2.2 .6 3.3L0 2.7l-2.9 1.5 .6-3.3-2.4-2.2 3.3-.4Z";
  const glassHighlight = circle(0, -.65, 1, "#fff3cc") + circle(-.85, .7, .51, "#fce9be");
  const flags = [design.silk, "#8298bc", "#bd7e9c", "#a18ab7"];
  let bulbs = "", glow = "";
  for (let index = 0; index < count; index++) {
    const f = (index + .5) / count, px = round(x + (end - x) * f), py = round(y + sag * 4 * f * (1 - f));
    if (index % 4 === 0) {
      bulbs += stroke(`M${px} ${py}v6.5`, "#c29763", .75) +
        `<g transform="translate(${px} ${py + 10})">${path(star, "#f6d798", 'stroke="#a87749" stroke-width=".95"')}${glassHighlight}</g>`;
      glow += circle(px, py + 10, 13, "url(#celebration-bulb)") +
        `<g transform="translate(${px} ${py + 10}) scale(.68)">${path(star, "#fff2bb")}</g>`;
      continue;
    }
    bulbs += stroke(`M${px} ${py}v3.5`, shadow, .7, .9) + circle(px, py + 5, 2.15, index % 3 ? "#f3d09f" : design.silk,
      `stroke="${shadow}" stroke-width=".6"`) + circle(px - .5, py + 4.6, .65, "#fff1cb");
    glow += circle(px, py + 5, 6.2, "url(#celebration-bulb)") + circle(px, py + 5, 1.22, "#fff1bf");
    if (index % 2 === 1) {
      bulbs += path(`M${px + 3} ${py}l12 .3-5.1 9.4q-.7.9-1.1 0Z`, flags[(index >> 1) % flags.length],
        `stroke="${shadow}" stroke-width=".69"`) +
        stroke(`M${px + 5} ${py + 1.35}l8.4 .3M${px + 6} ${py + 2}l3.1 5.4`, highlight, .61, .76);
    }
  }
  return { art: thread + bulbs, glow };
}

function balloons(x, y, side, design) {
  const parts = [];
  for (const [i, [offset, rise, color]] of [[-12, 60, "#e5a4b0"], [4, 72, design.silk], [13, 52, "#e5bf82"]].entries()) {
    const tx = x + offset * side, ty = y - rise;
    const silhouette = `M${tx} ${ty + 11}C${tx - 8} ${ty + 5} ${tx - 13} ${ty - 5} ${tx - 8} ${ty - 10}C${tx - 5} ${ty - 14} ${tx + 5} ${ty - 15} ${tx + 8} ${ty - 9}C${tx + 12} ${ty - 2} ${tx + 7} ${ty + 6} ${tx} ${ty + 11}Z`;
    parts.push(stroke(`M${tx} ${ty + 12}q${side * 9} 12 ${x - tx} ${rise - 12}`, "#e3bf94", .75, .87),
      path(silhouette, color, `stroke="${design.ink}" stroke-width=".8"`), path(silhouette, "url(#celebration-velvet)"),
      path(`M${tx - 1.6} ${ty + 12.5}l1.6-2.2 1.9 2.5Z`, color, `stroke="${design.ink}" stroke-width=".55"`),
      stroke(`M${tx - 5} ${ty - 7}q1 -3 4 -3.4`, "#fff8db", 1.15, .73),
      i === 1 ? path(`M${tx} ${ty - 5}q-4-4-4 .5q0 2.5 4 5q4-2.5 4-5q-.2-4.5-4-.5Z`, "#ffe1ae", 'opacity=".75"') : "");
  }
  return parts.join("");
}

function floorTrim(design, doorX) {
  const pieces = [stroke(`M31 128v209h${doorX - 67}m72 0h${533 - doorX}v-209`, shadow, 1.5, .49),
    stroke(`M34 130v204h${doorX - 71}m74 0h${529 - doorX}v-204`, highlight, .92, .61)];
  for (const x of [38, 562]) {
    for (let y = 140; y < 330; y += 17) {
      pieces.push(path(`M${x} ${y - 2}l2.7 2-2.7 2-2.7-2Z`, (y % 3) ? brass : design.silk,
        `stroke="${design.ink}" stroke-width=".43" opacity=".8"`));
    }
  }
  for (const [i, x] of [64, 91, 113, 158, 197, 237, 289, 331, 386, 437, 478, 514, 539].entries()) {
    const y = 306 + 21 * Math.sin(i * 2.6);
    if (Math.abs(x - doorX) < 29) continue;
    pieces.push(path(`M${x} ${round(y)}q4 -3 5-.2l-4 2Z`, i % 3 ? design.silk : highlight,
      `stroke="${design.ink}" stroke-width=".42" opacity=".78"`));
  }
  return pieces.join("");
}

export function decorateTownInterior(place, plan, assets) {
  const design = scheme[place];
  const { art, glow } = garland(design.strand, design);
  const photos = design.pictures.map(([photo, ...bounds]) => picture(assets.portraits[photo], ...bounds, design)).join("");
  const swag = curtainTie(design.swag, design);
  return {
    defs: '<linearGradient id="celebration-velvet" x2="0" y2="1"><stop stop-color="#ffe2bf" stop-opacity=".28"/><stop offset=".45" stop-color="#edbdac" stop-opacity="0"/><stop offset="1" stop-color="#34152e" stop-opacity=".33"/></linearGradient>' +
      '<radialGradient id="celebration-bulb"><stop stop-color="#fff297" stop-opacity=".55"/><stop offset="1" stop-color="#ffc577" stop-opacity="0"/></radialGradient>',
    floor: floorTrim(design, plan.spawn[0]),
    wall: swag + photos + plaque(design) + art,
    glows: ["dusk", "night"].map(phase => `<g class="phase-view phase-${phase}" display="none" opacity="${phase === "night" ? .94 : .67}">${glow}</g>`).join(""),
    sign: design.sign,
    furniture(name) {
      const ribbons = design.balloons[name];
      return ribbons ? balloons(...ribbons, design) : "";
    },
  };
}
