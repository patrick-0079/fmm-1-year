// The furnishings use the same fine outlines, painted wood and warm edges as the rooms.
const finishes = {
  florist: { ink: "#514338", face: "#789174", dark: "#526f55", top: "#d7ba93", edge: "#edd1a0", lining: "#a7b598", soft: "#c98894" },
  baker: { ink: "#654638", face: "#bb8058", dark: "#8a5b47", top: "#dfb386", edge: "#f3d7a2", lining: "#c89475", soft: "#b96c67" },
  maker: { ink: "#533b50", face: "#99768c", dark: "#674f6d", top: "#c599a5", edge: "#ecc092", lining: "#806788", soft: "#b183a0" },
  post: { ink: "#4c4b3b", face: "#75907e", dark: "#4c695b", top: "#c6aa81", edge: "#e8cb99", lining: "#a3a992", soft: "#ad6861" },
  books: { ink: "#4d4339", face: "#8e7056", dark: "#5e6453", top: "#c4a27c", edge: "#e1c59b", lining: "#719384", soft: "#b78586" },
  radio: { ink: "#353346", face: "#65708a", dark: "#434d68", top: "#808aa0", edge: "#c4b0ad", lining: "#556b82", soft: "#9b667b" },
  hall: { ink: "#5b4346", face: "#a67365", dark: "#805262", top: "#cb9a83", edge: "#edc794", lining: "#ad807c", soft: "#ac6879" },
};

const rect = (x, y, w, h, fill, style = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${style}/>`;
const path = (d, fill, style = "") => `<path d="${d}" fill="${fill}" ${style}/>`;
const line = (d, color, width = .7, opacity = 1) => path(d, "none", `stroke="${color}" stroke-width="${width}" opacity="${opacity}"`);
const oval = (x, y, rx, ry, fill, style = "") => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${style}/>`;
const dot = (x, y, r, fill, style = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${style}/>`;
const group = (transform, inner) => `<g transform="${transform}">${inner}</g>`;
const edge = (p, width = .85) => `stroke="${p.ink}" stroke-width="${width}"`;

function shelf(p, x, y, w, h, contents) {
  return rect(x + 1, y + 3, w, h, p.ink, 'rx="4" opacity=".25"') +
    rect(x, y, w, h, "url(#furnishing-front)", `rx="3" ${edge(p)}`) +
    rect(x + 3, y + 3, w - 6, h - 9, p.dark, `rx="1.6" ${edge(p, .65)}`) +
    line(`M${x + 5} ${y + 4}h${w - 10}`, p.edge, .7, .85) + contents +
    rect(x - 2, y + h - 5, w + 4, 5, "url(#furnishing-top)", `rx="1.5" ${edge(p)}`) +
    line(`M${x + 1} ${y + h - 4}h${w - 2}`, p.edge);
}

function desk(p, x, y, w, depth, foot, contents, doors = false) {
  const front = y + depth, right = x + w;
  const top = `M${x + 4} ${y}H${right - 4}L${right} ${front - 3}v3H${x}v-3Z`;
  let apron = rect(x + 3, front + 1, w - 6, 9, p.dark, `rx="1" ${edge(p)}`);
  if (doors) {
    const width = (w - 21) / 2;
    apron += rect(x + 4, front + 5, w - 8, foot - front - 7, "url(#furnishing-front)", `rx="2" ${edge(p)}`);
    for (const left of [x + 7, x + 13 + width]) {
      apron += rect(left, front + 7, width, foot - front - 11, p.dark, `rx="1.5" stroke="${p.edge}" stroke-width=".65"`) +
        rect(left + 2, front + 9, width - 4, foot - front - 15, "url(#furnishing-front)", 'rx="1"') +
        dot(left + width * .74, (front + foot) / 2 + 1, 1.25, p.edge, edge(p, .55));
    }
  } else {
    apron += rect(x + 8, front + 3, w - 16, 3.6, p.face, 'rx="1"') +
      line(`M${x + 8} ${front + 7}h${w - 16}`, p.edge, .65, .81);
    for (const side of [x + 10, right - 10]) apron += dot(side, front + 4.4, .95, p.edge);
  }
  return oval(x + w / 2, foot - 1.3, w * .52, 7.2, "url(#furnishing-contact)") +
    rect(x + 5, front - 2, 7, foot - front + 2, p.face, `rx="1" ${edge(p)}`) +
    rect(right - 12, front - 2, 7, foot - front + 2, p.face, `rx="1" ${edge(p)}`) +
    line(`M${x + 6.8} ${front + 3}v${foot - front - 5}m${w - 17} ${-(foot - front - 5)}v${foot - front - 5}`, p.edge, .65, .84) +
    apron + path(top, "url(#furnishing-top)", edge(p, 1.15)) + path(top, "url(#furniture-grain)") +
    line(`M${x + 5} ${y + 1.4}h${w - 10}M${x + 4} ${front - 2.5}h${w - 8}`, p.edge, .86, .92) + contents;
}

function leaf(p, x, y, angle, color) {
  return group(`translate(${x} ${y}) rotate(${angle})`,
    path("M0 0Q-7-1-6-6Q0-7 0 0Z", color, edge(p, .48)) + line("M-4.7-4.7L0 0", "#f8e8b8", .42, .72));
}

function blossom(p, x, y, color) {
  return group(`translate(${x} ${y})`, path("M0-3.6C2-4.7 3.9-2.9 3.1-1.6C5-.4 4.4 1.9 2.5 2.2C2.2 4 .2 4.7-.9 3C-2.9 4-4.2 2.3-3.4 .8C-5.4-.6-3.4-3-1.8-2.6Q-1.7-4.5 0-3.6Z", color, edge(p, .53)) +
    dot(0, .1, 1.15, "#e4ae6b") + dot(-.9, -.9, .55, "#fff1cf"));
}

function flowerPot(p, x, y, index, size = 1) {
  const ceramic = ["#b78070", "#8ba894", "#d2b393"][index % 3];
  const petals = ["#e0a6ae", "#f3ddbc", "#b995b8"][index % 3];
  const stems = [
    [-11, -30, 1, -41, 10, -34],
    [-11, -36, -1, -32, 9, -41],
    [-10, -32, 0, -36, 12, -29],
  ][index % 3];
  const [left, high, centre, top, right, low] = stems;
  return group(`translate(${x} ${y}) scale(${size})`,
    oval(0, .1, 9, 2.4, p.ink, 'opacity=".2"') +
    path("M-8-14L-6.5-3Q0 1.5 6.5-3L8-14Z", ceramic, edge(p)) +
    path("M-5.8-12Q-2.5-9-2.6-2Q-4-2-5-3Z", "#fff2ce", 'opacity=".43"') +
    path("M3-12l4-1-1.5 9q-2 .9-3.8 1.1Z", p.ink, 'opacity=".17"') +
    line("M-6.7-7Q0-4.2 7-7M-5.9-5.3Q0-3 6-5.3", p.edge, .55, .94) +
    path("M0-7.8l1.35 1.1L0-5.4l-1.35-1.3Z", "#f3deba", edge(p, .4)) +
    oval(0, -14, 8.6, 3, ceramic, edge(p)) + oval(0, -14.5, 6.4, 1.65, "#665541") +
    line("M-5.8-13.2Q-.7-11.5 5.8-13.2", "#f5dabb", .61) +
    line(`M0-14Q-1-25 ${left} ${high}M2-14Q5-26 ${right} ${low}M1-15Q0-26 ${centre} ${top}m-.5 13q-4-6-6-6`, "#587458", 1.05) +
    leaf(p, -1.5, -18, -21, "#789267") + leaf(p, 3, -21, 110, "#829d71") +
    leaf(p, -4, -23, 5, "#91a77a") + leaf(p, 5, -25, 117, "#698d70") + leaf(p, -.4, -27, 32, "#6d8b66") +
    oval(centre - 6.5, top + 7, 1.6, 2.5, "#ce9e9f", edge(p, .53)) +
    blossom(p, left, high, petals) + blossom(p, right, low, "#d99ca4") + blossom(p, centre, top, petals));
}

function envelope(p, x, y, w, h, sealed = false) {
  return rect(x + 1, y + 1.1, w, h, p.ink, 'rx="1" opacity=".25"') +
    rect(x, y, w, h, "#ecd5ae", `rx="1.2" ${edge(p, .67)}`) +
    line(`M${x + 1} ${y + 1}l${w / 2 - 1} ${h * .45} ${w / 2 - 1} ${-h * .45}m0 ${h - 1}l-${w * .31} -${h * .38}m-${w * .36} 0l-${w * .28} ${h * .38}`, "#a9866f", .6) +
    (sealed ? dot(x + w / 2, y + h * .51, 1.65, p.soft, edge(p, .44)) +
      line(`M${x + w / 2 - .8} ${y + h * .51}q1.15 1 1.8-.4`, "#f3cead", .53) : "");
}

function paper(p, x, y, w, h) {
  return rect(x + 1, y + 1.3, w, h, p.ink, 'rx="1" opacity=".21"') + rect(x, y, w, h, "#eddbb7", `rx="1" ${edge(p, .52)}`) +
    line(`M${x + 2} ${y + 2.1}h${w - 4}m-${w - 4} 2.6h${w - 8}`, "#b48d78", .48, .76);
}

function simpleCake(p, x, y) {
  return group(`translate(${x} ${y})`, oval(0, 1.3, 16, 4.2, p.ink, 'opacity=".23"') +
    oval(0, 0, 15, 4.3, "#e7c19b", edge(p, .74)) + line("M-13 1Q0 6 13 1", "#f4deb8", .82) +
    path("M-11.9-10V-2Q0 4 11.9-2v-8Z", "#d7977e", edge(p, .83)) +
    path("M-11.9-9.6V-6q3 2 5 .8q2 3 5.7 1.2q3 2 7 .3q3 1.1 6.2-2.2v-4Z", "#f4dabc", edge(p, .54)) +
    oval(0, -10.1, 12.1, 4.1, "#ffe8c6", edge(p, .76)) +
    path("M-7.3-11.9q2-3 4 .1l-1.8 2.8Z M4-11.7q2-3 4.6 .1l-2.5 2.9Z", "#bc655f", edge(p, .54)) +
    rect(-.9, -17.3, 1.8, 6.7, "#c78b88", `rx=".4" ${edge(p, .44)}`) +
    path("M0-17.8q-2.4-.4 0-4.8q2.4 4 .2 4.8Z", "#f3c975", edge(p, .44)));
}

function jewelry(p, x, y, w) {
  return rect(x, y, w, 12, p.dark, `rx="1.7" ${edge(p, .73)}`) +
    rect(x + 1.7, y + 1.5, w - 3.4, 8.3, p.lining, `rx="1" ${edge(p, .52)}`) +
    path(`M${x + 9} ${y + 3.2}q-6 2.7-.1 6q-5.1 1-5.6-2.5q-.8-2.7 5.7-3.5Z`, p.edge, edge(p, .44)) +
    path(`M${x + w * .5} ${y + 2}l1.3 3 2.8 1-2.8 1-1.3 2.6-1.3-2.6-2.8-1 2.8-1Z`, p.edge, edge(p, .5)) +
    path(`M${x + w - 7} ${y + 3.5}l3.2 2.5-3.2 2.4-3.1-2.4Z`, "#adc0a0", `stroke="${p.edge}" stroke-width=".65"`);
}

function tape(p, x, y, w = 16) {
  return rect(x, y, w, 8.6, p.top, `rx="1.4" ${edge(p, .73)}`) +
    rect(x + 1.5, y + 1.3, w - 3, 4.5, p.soft, 'rx=".7"') +
    rect(x + w * .22, y + 2.7, w * .56, 2.8, p.dark, `rx=".5" ${edge(p, .42)}`) +
    dot(x + w * .33, y + 4, .82, p.edge) + dot(x + w * .67, y + 4, .82, p.edge) +
    line(`M${x + 3} ${y + 6.8}h${w - 6}`, p.edge, .57);
}

function openAlbum(p, x, y) {
  return group(`translate(${x} ${y})`, path("M0 0Q12-3 20 1Q28-2 42 1l2 13Q31 11 21 15Q10 12-2 14Z", p.dark, edge(p)) +
    path("M1-1Q12-3 20 1Q29-3 41-1l1 12Q30 9 21 13Q9 10 0 12Z", "#f0debf", edge(p, .65)) +
    path("M4 1l10-.6v7l-10 1Zm22 0 11-1 1 7-10 1Z", "#92a293", 'stroke="#b79676" stroke-width=".55"') +
    line("M20 2l1 10m-17-2 12-1m10 2 12-2", "#b29175", .61) +
    line("M6 4l8-.6m15 2 8-.8", "#e5c4a3", .67));
}

function wrappedFlowers(p, x, y) {
  return group(`translate(${x} ${y}) rotate(-10)`,
    oval(2, 5, 17, 4, p.ink, 'opacity=".24"') +
    line("M14 4L-8-5M14 4L-9 2M14 4L-7-9", "#6e8663", 1.1) +
    leaf(p, -4, 0, -28, "#789977") + leaf(p, 0, -3, 112, "#90a881") +
    blossom(p, -9, -4, "#d9a3a5") + blossom(p, -6, -10, "#bc9eb9") + blossom(p, -12, 2, "#f1d9b2") +
    path("M-4-4q5 1 10-2l11 10-1 5-17-4Z", "#c58d65", edge(p, .63)) +
    path("M-1-3q6 2 8-3l9 10-4 2Z", "#e8c299", edge(p, .52)) +
    line("M10 3l-1 5m0-3q-6-7-7-3q0 2 7 3q5-5 6-2q1 2-6 2l2 5m-2-5-3 5", "#8e5966", 1));
}

function ribbonSpool(p, x, y, color) {
  return group(`translate(${x} ${y})`,
    oval(0, 0, 6.2, 2.5, p.ink, 'opacity=".25"') +
    oval(0, -1.5, 5.9, 2, "#d9b98c", edge(p, .62)) +
    path("M-5-2.7v-6.2H5v6.2q-5 3-10 0Z", color, edge(p, .62)) +
    line("M-4-6.4q4 1.7 8 0m-8 1.5q4 1.7 8 0", "#f7dbb7", .53, .82) +
    oval(0, -8.7, 5.8, 2.2, "#ebd6a8", edge(p, .74)) + oval(0, -8.7, 1.5, .7, p.ink) +
    path("M4-3q5 3 9-2", "none", `stroke="${color}" stroke-width="1.8"`) + line("M5-3q3.5 1.6 6-.7", "#f5d2ac", .5));
}

function cookieTin(p, x, y, open = false) {
  const lid = open ? "#e3bd8f" : "#c77d74";
  return group(`translate(${x} ${y})`,
    oval(.5, 3.5, 13.5, 4.7, p.ink, 'opacity=".24"') +
    path("M-12-5v6q1 4 12 4t12-4v-6Z", "#a65b58", edge(p, .76)) +
    line("M-11-1q5 4 15 3m3-.5 3-1.3", "#ebad90", .64) +
    oval(0, -5, 12.3, 4.5, lid, edge(p, .78)) +
    oval(0, -5, 10.6, 3.35, "none", 'stroke="#f5d099" stroke-width=".63"') +
    (open ? [-6, 0, 6].map((dx, i) =>
      oval(dx, -4.7 - i % 2 * 1.1, 2.9, 1.9, "#cc8d5e", edge(p, .47)) +
      dot(dx - .55, -5.3 - i % 2 * 1.1, .58, "#ad5c57")).join("") :
      path("M-3-6.9Q0-8 3-6.9Q3-4 0-3.4Q-3-4-3-6.9Z", "#f2d6aa", edge(p, .47)) +
      line("M-1-7l1 1 1-1", "#588362", .65)));
}

function tiedParcel(p, x, y, w, h, accent) {
  const mid = w * .57;
  return group(`translate(${x} ${y})`,
    rect(-.5, 3.1, w + 2, h, p.ink, 'rx="1.7" opacity=".22"') +
    path(`M0 0l3-3h${w - 3}v${h}l-3 3H0Z`, "#b98964", edge(p, .65)) +
    rect(0, 0, w - 3, h, "#d4ac80", edge(p, .57)) +
    path(`M0 0l3-3h${w - 3}l-3 3Z`, "#e8c697", edge(p, .55)) +
    line(`M${mid} -3l-2.8 3v${h}M0 ${h * .44}h${w - 3}l3-3`, accent, 1.08) +
    line(`M${mid - 2.8} ${h * .44}q-5-5-6-2q-.8 2 6 2q5-3 5-1q0 2-5 1l4 3`, accent, .65) +
    rect(2.3, h * .52, w * .26, h * .27, "#f0d4aa", `rx=".5" ${edge(p, .39)}`));
}

function clothBook(p, x, y, w, color) {
  return rect(x + 1, y + 1, w, 8, p.ink, 'rx="1" opacity=".21"') +
    rect(x, y, w, 7.4, color, `rx="1" ${edge(p, .66)}`) +
    rect(x + 3, y + 3.45, w - 4.1, 2.6, "#e2c9a4", 'rx=".35"') +
    line(`M${x + 4} ${y + 4.7}h${w - 6}`, "#af9777", .52) +
    line(`M${x + 2} ${y + 1.3}h${w - 4}`, p.edge, .61, .73);
}

function mountedPrint(p, photo, x, y, w, h) {
  return rect(x + 1.2, y + 1.6, w, h, p.ink, 'rx="1" opacity=".37"') +
    rect(x, y, w, h, "#ddbd91", `rx="1" ${edge(p, .81)}`) +
    `<image href="${photo}" x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" preserveAspectRatio="xMidYMid slice"/>` +
    rect(x + 1.6, y + 1.6, w - 3.2, h - 3.2, "none", `stroke="${p.ink}" stroke-width=".52"`) +
    line(`M${x + 1.2} ${y + h - 1.2}V${y + 1.2}h${w - 2.4}`, "#f4d9ae", .52, .85);
}

function sideWindow(p) {
  const pane = "M32 165l27-9v54l-27 13Z";
  const states = [
    ["dawn", "#dcc0a2", "#86967d", "#8aa6a0", 3],
    ["day", "#b8c7b5", "#759480", "#86a6a0", 1],
    ["dusk", "#d4a58a", "#8a8b76", "#869996", 5],
    ["night", "#637988", "#4e6c65", "#607e80", 8],
  ];
  const views = states.map(([phase, sky, bank, water, slats]) => {
    const blinds = Array.from({ length: slats }, (_, n) => line(`M32 ${166 + n * 5.6}l27-9`, "#a38261", 4.6) +
      line(`M32 ${165 + n * 5.6}l27-9`, "#d7b387", .82)).join("");
    return `<g class="phase-view phase-${phase}" display="none" clip-path="url(#bookshop-side-pane)">` + path(pane, sky) +
      path("M30 188q9-7 14-5q8-7 20-8v51H30Z", bank) + path("M30 202l31-10v19l-31 13Z", water) +
      line("M34 207l10-3m4-4 9-3m-24 15 9-4", "#e2caaa", .72, .69) +
      line("M33 188l-2-13m20 5 3-15m-1 17 5-15", "#5c765f", 1.1, .9) + blinds + "</g>";
  }).join("");
  return path("M25 154l40-13 2 86-4 25H25Z", p.face, edge(p, 1.05)) +
    path("M26 158l35-12 3 70-34 15Z", p.dark, edge(p, .9)) + views +
    path(pane, "none", `stroke="${p.edge}" stroke-width="1"`) +
    line("M33 195l25-10m-13-23v54", p.ink, 1.55) + line("M34 194l24-9", p.edge, .6) +
    path("M25 229l39-13 3 7-42 14Z", p.top, edge(p, .96)) +
    path("M25 237l42-14v24l-6 5H25Z", p.dark, edge(p, .95)) +
    line("M28 239l35-11v17l-3 3H28Z", p.edge, .74, .84) +
    line("M60 155q26 14 33 43v33", p.ink, .8) + line("M62 156q25 15 33 42v32", p.edge, .65) +
    oval(94, 230, 2.4, 4.4, "#c39773", edge(p, .72)) + dot(93.5, 229, .82, p.edge);
}

function studioDesk(p, source) {
  const phaseMeters = source.match(/<g class="phase-view[^>]*>[\s\S]*?<\/g>/g).join("");
  let sliders = "";
  for (let i = 0; i < 6; i++) {
    const x = 135 + i * 11, y = 136 + i % 3 * 3;
    sliders += line(`M${x} 130v18`, p.ink, 1.05) + line(`M${x + 2.5} 134h1.5m-1.5 4h1.5m-1.5 4h1.5`, p.edge, .45, .7) +
      rect(x - 2.6, y, 5.3, 2.5, i % 3 === 1 ? p.soft : p.edge, `rx=".55" ${edge(p, .54)}`) + dot(x, 127.2, 1.45, p.top, edge(p, .63));
  }
  const controls = path("M60 125h145l3 24H58Z", p.dark, edge(p, .93)) +
    rect(63.5, 125.6, 41, 14.8, p.ink, `rx="1.4" stroke="${p.edge}" stroke-width=".62"`) +
    rect(105, 126.4, 23, 13, p.ink, 'rx="1.4"') + line("M63 142h64m1-15v19", p.edge, .63, .8) +
    rect(67, 144.2, 10, 2.4, p.soft, `rx=".55" ${edge(p, .46)}`) +
    rect(80, 144.2, 10, 2.4, p.lining, `rx=".55" ${edge(p, .46)}`) + sliders + phaseMeters;
  return desk(p, 54, 120, 159, 36, 183, controls);
}

function reelMachine(p, x, y) {
  return group(`translate(${x} ${y})`, rect(0, 0, 116, 30, p.dark, `rx="2.5" ${edge(p)}`) +
    rect(2.5, 2.5, 111, 24, p.top, `rx="1.5" ${edge(p, .68)}`) +
    line("M6 5h103m-61 2v15", p.edge, .65, .81) +
    [15, 35].map(cx => dot(cx, 14, 8, p.edge, edge(p, .7)) + dot(cx, 14, 6, p.face, edge(p, .55)) +
      dot(cx, 14, 1.6, p.ink) + line(`M${cx - 4.5} 11.5l3 2m2.7 2 2 2.3m.6-5.8 1.6-1.5`, p.ink, 1.5)).join("") +
    rect(55, 8, 27, 9.5, "#d5b68b", `rx="1" ${edge(p, .63)}`) + line("M59 14.2q9-5 18-.8m-9 2.2 5-4.3", "#8d6e68", .67) +
    dot(93, 12, 1.5, p.soft, edge(p, .53)) + dot(103, 14, 3, p.face, edge(p, .58)) +
    line("M54 21h29m14 0h9", p.ink, .95, .85));
}

function listeningChair(p) {
  return oval(487, 185, 23.4, 3.4, p.ink, 'opacity=".28"') +
    rect(469, 171, 5, 16, p.face, `rx=".8" ${edge(p)}`) + rect(502, 170, 5, 16, p.face, `rx=".8" ${edge(p)}`) +
    path("M468 171v-16q0-10 10-11h19q10 1 11 11v16Z", p.dark, edge(p)) +
    path("M471 167v-11q0-8 8-9h17q8 1 9 9v11Z", p.lining, edge(p, .65)) +
    line("M475 158q0-6 6-7h13q7 1 7 7m-21 0h15", p.edge, .6, .83) +
    path("M475 165v-8q1-5 6-6h13q6.4 0 7 7v7Z", "url(#cottage-fabric)", 'opacity=".74"') +
    path("M477 163v-6q0-4 5-4h10q6 0 7 5v5", "none", `stroke="${p.edge}" stroke-width=".56" stroke-dasharray="1.2 1.3" opacity=".73"`) +
    path("M472 165h32l5 10-3 5h-37l-4-5Z", p.top, edge(p, .96)) + line("M470 175h35", p.edge, .73) +
    rect(465, 161.5, 6.5, 10.5, p.face, `rx="1.9" ${edge(p, .71)}`) + rect(505, 161.5, 6.5, 10.5, p.face, `rx="1.9" ${edge(p, .71)}`) +
    path("M482 171v-4q0-4 5-5q5 .6 5 4v4", "none", `stroke="${p.ink}" stroke-width="1.45"`) +
    rect(480.2, 168.5, 3.6, 4.2, p.soft, `rx=".7" ${edge(p, .59)}`) + rect(490.6, 168.5, 3.6, 4.2, p.soft, `rx=".7" ${edge(p, .59)}`);
}

function upholsteredChair(p, x, y, blanket = false) {
  const seat = "M3 17h32l4 12H-2Z";
  return group(`translate(${x} ${y})`,
    oval(19, 38, 22, 4, "url(#furnishing-contact)") +
    rect(2, 24, 4.5, 14, p.face, `rx=".9" ${edge(p)}`) + rect(32, 24, 4.5, 14, p.face, `rx=".9" ${edge(p)}`) +
    rect(0, 0, 38, 23, "url(#furnishing-front)", `rx="4" ${edge(p, .95)}`) +
    rect(3, 3, 32, 16, p.lining, `rx="3" ${edge(p, .68)}`) +
    rect(3, 3, 32, 16, "url(#cottage-fabric)", 'rx="3" opacity=".82"') +
    line("M5 10q0-4 4-4h21q3 0 3 4", p.edge, .65, .88) +
    path(seat, p.lining, edge(p)) + path(seat, "url(#cottage-fabric)", 'opacity=".74"') +
    line("M1 27h35m-29-8h25", p.edge, .66, .86) +
    rect(-2, 29, 41, 4, p.top, `rx="1" ${edge(p, .82)}`) +
    (blanket ? path("M5 4q5 1 13 0l-2 13 1.5 10-3 4H4l-2-4 3-8Z", p.soft, edge(p, .62)) +
      path("M5 4q5 1 13 0l-2 13 1.5 10-3 4H4l-2-4 3-8Z", "url(#cottage-fabric)", 'opacity=".67"') +
      line("M7 5v11l-2 9m8-20-1 12 1.5 8m-9 2h11m-10 3v2m3-2v2m3-2v2", "#e7ccaa", .61, .89) :
      line("M8 12h22m-22 0 3 3 3-3m9 0 3 3 3-3", p.edge, .69, .62)));
}

function shadowBox(p) {
  const film = rect(442, 84, 72, 50, p.dark, `rx="4.5" ${edge(p, 1.2)}`) +
    rect(447, 88, 62, 40, p.face, `rx="2.2" stroke="${p.edge}" stroke-width=".9"`) +
    rect(448, 97, 56, 25, p.ink, `rx="1.4" ${edge(p, .75)}`) +
    [451, 468, 485].map((x, i) => rect(x, 100, 15, 18, "#dcc39b", `rx=".55" ${edge(p, .57)}`) +
      rect(x + 1.4, 102, 12.2, 13, ["#aaa992", "#bea28e", "#908293"][i], 'rx=".4"') +
      path(`M${x + 2} 113l4-6 3 4 3-2v5h-10Z`, ["#778575", "#916e71", "#675a73"][i]) +
      dot(x + 10, 106, 1.25, "#ecd0a2")).join("") +
    line("M451 91h52m-49 34h10m16 0h21", p.edge, .7, .89) +
    dot(517, 115, 4.8, p.top, edge(p, .78)) + line("M518 116l7 4v7h4", p.ink, 1.6) +
    line("M521 117l4 2.6", p.edge, .65) + rect(525.5, 125, 5.5, 3.8, p.edge, `rx=".7" ${edge(p, .74)}`);
  return desk(p, 432, 124, 98, 17, 162, film, true);
}

function anniversaryDisplay(p) {
  return desk(p, 47, 112, 81, 18, 146,
    path("M60 116h54l4 9H58Z", p.dark, edge(p, .73)) + line("M63 122h51", p.edge, .67) +
    anniversaryBadge(p, 86, 98) + paper(p, 105, 110, 15, 10), true);
}

function anniversaryBadge(p, x, y) {
  return group(`translate(${x} ${y})`,
    path("M-6 11l-5 10 9-2 4 3L9 10Z", p.soft, edge(p, .85)) +
    path("M0-21 6-18 12-17 14-12 19-7 18-1 20 5 16 10 13 16 7 16 1 19-5 17-12 18-15 13-20 9-19 3-21-3-17-8-16-14-10-16-6-20Z",
      "#d2a76d", edge(p, .95)) + dot(0, -1, 15.3, "#ecd0a0", edge(p, .94)) +
    dot(0, -1, 13, p.dark, `stroke="#997359" stroke-width=".6"`) +
    path("M-6-7l6-4h4V6h4v3H-5V6h4V-6l-5 2Z", "#efcc83", edge(p, .52)) +
    line("M-5-6 1-9m2 1V5m-8 2h11", "#fff0c1", .75, .85) +
    dot(-7.2, 2, .9, "#f3d19c") + dot(8, -4, 1, "#f3d19c"));
}

export function townFurnishingDefs(place) {
  const p = finishes[place];
  return '<clipPath id="bookshop-side-pane"><path d="M32 165l27-9v54l-27 13Z"/></clipPath>' +
    `<radialGradient id="furnishing-contact"><stop stop-color="${p.ink}" stop-opacity=".34"/><stop offset=".55" stop-color="${p.ink}" stop-opacity=".23"/><stop offset="1" stop-color="${p.ink}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="furnishing-top" x2="0" y2="1"><stop stop-color="${p.edge}"/><stop offset=".34" stop-color="${p.top}"/><stop offset=".84" stop-color="${p.top}"/><stop offset="1" stop-color="${p.face}"/></linearGradient>` +
    `<linearGradient id="furnishing-front" x2="0" y2="1"><stop stop-color="${p.top}"/><stop offset=".28" stop-color="${p.face}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>`;
}

export function drawTownWallFurnishings(place) {
  const p = finishes[place];
  switch (place) {
    case "florist":
      return shelf(p, 214, 58, 113, 49, flowerPot(p, 235, 101, 0, .86) + flowerPot(p, 267, 101, 1, .93) + flowerPot(p, 302, 101, 2, .77)) +
        line("M168 55q-14 5-10 15q7 10-5 13q-8 5-7 16m13-24q10 7 7 24", "#597252", 1.18) +
        [[163, 59, 26], [158, 68, 122], [158, 76, -24], [154, 82, 63], [149, 88, -25], [145, 96, 13], [165, 86, 127], [166, 95, 112]]
          .map(([x, y, turn], i) => leaf(p, x, y, turn, i % 2 ? "#829c75" : "#658561")).join("") +
        blossom(p, 161, 73, "#d5adac") + dot(168, 55, 1.4, "#d6bd86", edge(p, .53));
    case "baker": {
      const plates = [95, 91.6, 88].map((y, i) => oval(168, y, 12.6 - i * .8, 3.1, "#e2c097", edge(p, .58)) +
        line(`M${159 + i} ${y + .8}q8 2 ${17 - i}-.2`, "#f5ddae", .6)).join("");
      const bowl = path("M180 85h19l-2.3 9q-6 5-13.7 0Z", p.soft, edge(p, .7)) +
        oval(189.5, 85, 9.5, 3.15, "#d89d82", edge(p, .73)) + oval(189.5, 85.2, 6.7, 1.8, "#b97562") +
        line("M183 89q6 2.8 12.5 0m-9 5.4h6", "#eac39d", .68);
      const jam = rect(208, 75, 14, 22, "#ac655e", `rx="2" ${edge(p, .68)}`) +
        rect(207.2, 72, 15.5, 5.5, "#e6b995", `rx="1.2" ${edge(p, .64)}`) +
        line("M209 73v3m3-3v3m3-3v3m3-3v3", p.soft, .55, .89) +
        rect(210.5, 83, 9, 8, "#ebcba0", `rx=".9" ${edge(p, .48)}`) +
        dot(215, 87, 1.65, p.soft);
      return shelf(p, 145, 59, 91, 44, plates + bowl + jam) +
        [164, 188, 214].map((x, i) => line(`M${x} 103v8`, p.ink, .87) + oval(x, 114, i === 1 ? 4.4 : 3.9, 3.6, p.face, edge(p, .66)) +
          oval(x - .5, 113.7, 2.5, 2.25, p.top, `stroke="${p.edge}" stroke-width=".56"`)).join("");
    }
    case "maker":
      return shelf(p, 334, 55, 160, 52, [346, 392, 438].map((x, i) =>
        line(`M${x + 17} 63v6q-14 7-7.5 14l7.5 4q16-5 9-13l-9-5`, p.edge, .95, .92) +
        dot(x + 17, 64, 1.4, p.top, edge(p, .54)) + jewelry(p, x, 87 - i % 2 * 2, 34)).join("")) +
        shelf(p, 174, 63, 27, 34,
          line("M179 73h17", p.edge, .73) +
          line("M180.7 73v16m8-16v7m-2.5 8 2.5-8 2.7 8m3.6-15v15", "#c7a68d", 1.35) +
          line("M180.7 82v7m5.5-1 1.4-4m3.7 4-1.4-4m5.5-2v6", "#c18998", 1.43));
    case "post":
      return shelf(p, 441, 59, 117, 48,
        paper(p, 451, 71, 19, 14) + envelope(p, 447, 82, 25, 14, true) +
        rect(479, 66, 35, 29, "#d6b88e", `rx="1.6" ${edge(p, .7)}`) +
        path("M481 89q8-13 15-10q7 1 15-7v17Z", "#8ba390", `stroke="${p.ink}" stroke-width=".48"`) +
        line("M483 86l8-11 8 7 11-9", "#986167", .81) +
        [483, 491, 499, 510].map((x, i) => dot(x, [86, 75, 82, 73][i], 1.3, "#ebd2a4", edge(p, .42))).join("") +
        paper(p, 521, 70, 22, 19) + envelope(p, 520, 84, 29, 12, true));
    case "books":
      return shelf(p, 187, 57, 143, 49, Array.from({ length: 12 }, (_, i) => {
        const x = 194 + i * 10.6, y = 66 + (i * 7) % 15;
        const fabric = [p.soft, p.top, p.lining, "#798c9d"][i % 4];
        const spine = rect(x, y, 8.3, 99 - y, fabric, `rx="1" ${edge(p, .62)}`) +
          rect(x + 1, y + 1.7, 5.6, 95 - y, "url(#cottage-fabric)", 'opacity=".71"') +
          line(`M${x + 1.9} ${y + 3}h4.4m-4.4 2.3h4.4M${x + 1.9} 95.3h4.4`, p.edge, .59, .93) +
          (i % 3 ? line(`M${x + 2} ${y + 9}h3.8m-3.8 1.7h3.8`, "#edcf9f", .56, .8)
            : path(`M${x + 4.2} ${y + 8}l1.65 2.1-1.65 2.1-1.65-2.1Z`, p.edge, edge(p, .4)));
        return i === 2 || i === 11 ? group(`rotate(8 ${x + 3} 98)`, spine) : spine;
      }).join(""));
    case "radio":
      return shelf(p, 41, 56, 149, 51, reelMachine(p, 48, 63) + line("M172 70q14 4 9 18m-6-12v11m7-9v7", p.edge, 1.05) +
        rect(169, 81, 5, 10, p.soft, `rx="1.4" ${edge(p, .72)}`) + rect(179, 81, 5, 10, p.soft, `rx="1.4" ${edge(p, .72)}`)) +
        [355, 378].map((x, i) =>
          rect(x + 1.8, 65, 22, 43, p.ink, 'rx="2" opacity=".22"') +
          rect(x, 62, 22, 42, "#66576e", `rx="1.7" ${edge(p, .86)}`) +
          rect(x + 2, 64, 18, 38, i === 0 ? "#846077" : "#69778d", 'rx="1"') +
          rect(x + 2, 64, 18, 38, "url(#cottage-fabric)", 'rx="1" opacity=".86"') +
          [70, 77, 84, 91, 98].map(y => line(`M${x + 3} ${y}q7 .9 16 0`, p.ink, 1.5, .8) +
            line(`M${x + 3} ${y + .9}q7 .9 16 0`, p.edge, .52, .56)).join("")).join("");
    case "hall":
      return line("M371 52h91", p.dark, 3.1) + line("M373 51.7h87", p.edge, .7) + [380, 414, 448].map((x, i) =>
        line(`M${x} 53v${11 + i % 2 * 6}`, p.ink, 1) + path(`M${x - 3} ${64 + i % 2 * 6}h6q0 7 7 13q-10 8-20 0q6-5 7-13Z`,
          "#f0ce93", edge(p, .85)) + line(`M${x - .7} ${66 + i % 2 * 6}q-.5 9-4 12`, "#fff0c7", 1.05, .86)).join("");
  }
}

export function redrawTownFurnishing(place, name, source, { portraits }) {
  const p = finishes[place];
  switch (name) {
    case "温室花桶":
    case "花店南壁盆栽": {
      const [, cx, cy] = source.match(/<ellipse cx="([\d.]+)" cy="([\d.]+)"/);
      return flowerPot(p, Number(cx), Math.floor(Number(cy)), Math.floor(Number(cx) / 20));
    }
    case "温室花架":
      return shelf(p, 37, 111, 118, 24, "") + [49, 72, 95, 118, 140].map((x, i) =>
        flowerPot(p, x, 123 + i % 2 * 1.4, i, [.55, .48, .59, .51, .54][i]) +
        path(`M${x + 4} 125l4-4 1 1.2-3 4Z`, "#dec39e", edge(p, .49))).join("");
    case "花墙矮柜":
      return desk(p, 212, 108, 137, 15, 145, [229, 255, 313, 333].map((x, i) => flowerPot(p, x, 114 + i % 2 * 2, i, .52)).join("") + paper(p, 275, 110, 24, 9), true);
    case "压花台": {
      const stationery = rect(414, 146, 45, 14, p.dark, `rx="1.6" ${edge(p, .72)}`) + paper(p, 418, 147, 34, 10) +
        leaf(p, 439, 153, 94, "#769578") + blossom(p, 429, 153, p.soft) +
        line("M468 156l20-7m-20 7 21-5", p.dark, .85) + line("M471 155l14-5", p.edge, .6) +
        rect(490, 145.5, 34, 15, p.lining, `rx="2" ${edge(p, .63)}`) +
        line("M492 147h30m-31 11h31", p.edge, .58) +
        [496, 507, 517].map((x, i) => blossom(p, x, 153 + i % 2, [p.soft, "#dbc5ae", "#a69bb8"][i])).join("");
      return desk(p, 402, 141, 128, 23, 192, stationery);
    }
    case "缎带边桌":
      return desk(p, 485, 247, 68, 20, 284, flowerPot(p, 500, 254, 0, .47) +
        ribbonSpool(p, 527, 252, "#b27d90") + paper(p, 535, 252, 12, 8));
    case "花礼包扎台":
      return desk(p, 208, 274, 72, 16, 313,
        ribbonSpool(p, 222, 281, "#ba7c89") + ribbonSpool(p, 237, 278, "#81947a") + wrappedFlowers(p, 258, 281), true) +
        path("M260 290q2-3 5-1l-2.1 11-4-2 1.4-4Z", p.soft, edge(p, .58)) + line("M261 292q3-1 3-3", p.edge, .62);
    case "左侧品尝柜":
      return desk(p, 42, 223, 57, 23, 265, simpleCake(p, 70, 236));
    case "烘焙原料柜":
      return desk(p, 283, 109, 101, 16, 149, [299, 322, 346, 366].map((x, i) =>
        rect(x, 99 - i % 2 * 2, 11, 15 + i % 2 * 2, [p.soft, "#e8c6a0", p.lining, "#e7d3ab"][i], `rx="1.7" ${edge(p, .67)}`) +
        rect(x - .5, 98 - i % 2 * 2, 12, 3, p.dark, `rx="1.25" ${edge(p, .55)}`) +
        rect(x + 3, 104, 5.5, 5.7, "#e9cea4", `rx=".35" ${edge(p, .51)}`) +
        line(`M${x + 4} 106h3.1m-2.9 1.65h2.4M${x + 1.3} 103v7`, p.edge, .63)).join(""), true);
    case "饼干装盒台":
      return desk(p, 124, 279, 87, 15, 311,
        rect(131, 280, 73, 11, "#dab48c", `rx="1.3" ${edge(p, .58)}`) +
        line("M134 281h67m-66 9h65", "#f6d9a5", .7) +
        cookieTin(p, 146, 281) + cookieTin(p, 176, 280, true) +
        paper(p, 192, 280, 11, 8), true) +
        path("M156 294q7 1 11-1l-1 13-11-.6Z", "#e2c098", edge(p, .63)) +
        line("M157 296q3 1 9 0m-10 6 10 .6m-9-5v6m6-7v7", "#ab6c63", .72, .85);
    case "东侧丈量柜":
      return desk(p, 488, 212, 63, 19, 250, jewelry(p, 498, 215, 43), true);
    case "铜片样板架": {
      const shapes = [
        "M0-4l1.2 2.7 3.2 1-2.7 1.2L0 4-1.7 .9-4.5-.3l3.1-1Z",
        "M1-4C-5.5-4-5.3 4.1.75 4.1q2-.1 3.1-1.6Q.4 2.8-.7 0-.9-2.1 1-4Z",
        "M0-4.8l4.2 4.6L0 4.4-4.2-.2Z",
      ];
      const board = rect(486, 117, 56, 27, p.dark, `rx="2" ${edge(p)}`) +
        rect(488, 119, 52, 23, "#8b7086", `rx="1.2" stroke="${p.edge}" stroke-width=".67"`) +
        rect(489, 120, 50, 21, "url(#cottage-fabric)", 'rx="1" opacity=".62"') +
        shapes.map((d, i) => group(`translate(${497 + i * 17} ${130 + i % 2 * 2})`,
          dot(0, -7, .9, p.edge) + line("M0-7v4", p.edge, .6) + path(d, "#cea26d", edge(p, .61)) +
          line("M-1.4 1.8L.4-2.5", "#f2d59c", .61, .8))).join("");
      return desk(p, 476, 140, 77, 15, 170,
        board + jewelry(p, 480, 139, 69), true);
    }
    case "长柜台":
      return desk(p, 176, 108, 207, 15, 146,
        rect(191, 110, 53, 11, p.dark, `rx="1.3" ${edge(p, .65)}`) + envelope(p, 195, 111, 22, 8, true) + envelope(p, 216, 111, 23, 8) +
        clothBook(p, 258, 110, 43, p.lining) + paper(p, 262, 109, 34, 8) +
        line("M303 118l8-8", "#714f45", 1.2) + line("M304 116l6-5", p.edge, .58) +
        rect(328, 109, 45, 12, p.lining, `rx="1.4" ${edge(p, .65)}`) + envelope(p, 334, 110, 27, 10, true), true);
    case "L 形短边":
      return desk(p, 353, 128, 30, 43, 195, envelope(p, 360, 147, 16, 10, false));
    case "邮戳机工作桌":
      return desk(p, 452, 194, 87, 17, 236,
        rect(457, 196, 40, 12.5, p.lining, `rx="2" ${edge(p, .56)}`) +
        envelope(p, 460, 198, 26, 10, true) + rect(488, 198, 6, 6.8, "#ddbb90", `rx=".5" ${edge(p, .5)}`) +
        dot(491, 201.4, 1.2, p.soft) + rect(503, 193, 24, 13, p.dark, `rx="2" ${edge(p)}`) +
        rect(514, 178, 9, 20, p.face, `rx="2" ${edge(p)}`) + line("M517 180v12", p.edge, 1) +
        path("M516 178l8-6 8 5-2 3-6-3-6 5Z", p.soft, edge(p, .86)) + dot(509, 201, 2, p.soft));
    case "待寄包裹柜":
      return desk(p, 297, 292, 70, 13, 322,
        tiedParcel(p, 303, 287, 25, 13, "#84917d") + tiedParcel(p, 309, 277, 17, 11, "#b26f63") +
        tiedParcel(p, 332, 283, 29, 18, "#b87467"), true);
    case "木等候椅":
      return upholsteredChair(p, 225, 282);
    case "临池侧窗木座":
      return sideWindow(p);
    case "装帧桌":
      return desk(p, 73, 121, 129, 23, 166, openAlbum(p, 83, 124) +
        clothBook(p, 139, 131, 29, p.lining) + paper(p, 137, 123, 29, 12) + line("M171 137l13-10", "#7b6958", 2.1) +
        line("M172 136l12-9", p.edge, .6) + rect(187, 125, 7, 8, p.dark, `rx="1.1" ${edge(p, .65)}`) + oval(190.5, 125, 3.5, 1.2, p.lining));
    case "待装帧书箱": {
      const folios = [[134, 267, 15, p.lining], [151, 259, 14, "#9497a1"], [166, 262, 10, p.soft]];
      const contents = folios.map(([x, y, w, cover], i) =>
        rect(x + 1, y + 1, w, 285 - y, p.ink, 'rx="1.1" opacity=".4"') +
        rect(x, y, w, 285 - y, cover, `rx="1" ${edge(p, .74)}`) +
        line(`M${x + 3} ${y + 2}v${279 - y}m2 ${y - 275}h${w - 7}m-${w - 7} 3h${w - 7}`, p.edge, .72) +
        dot(x + w / 2 + 1.2, y + 13, .83, i === 1 ? "#b7c1b3" : "#f3deaa")).join("");
      return desk(p, 123, 276, 94, 17, 311,
        contents + clothBook(p, 180, 279, 27, p.lining) + clothBook(p, 179, 273, 28, p.soft) +
        line("M195 273v12l-2 1.7-2.5-1.7v-12", "#edd8a9", .82), true);
    }
    case "临窗阅读椅":
      return upholsteredChair(p, 497, 133, true);
    case "调音台":
      return studioDesk(p, source);
    case "片带柜":
      return desk(p, 211, 288, 54, 12, 325, tape(p, 215, 291) + tape(p, 236, 289, 20) + tape(p, 234, 284, 18), true);
    case "靠墙音箱":
      return rect(45, 227, 27, 39, p.dark, `rx="2.5" ${edge(p)}`) +
        rect(48, 231, 21, 31, p.face, `rx="2" ${edge(p, .65)}`) +
        dot(58.5, 250, 7.2, p.dark, `stroke="${p.edge}" stroke-width=".9"`) +
        dot(58.5, 250, 2.85, p.soft, edge(p, .66)) + dot(58.5, 237.6, 3.6, p.dark, edge(p, .65));
    case "试听椅":
      return listeningChair(p);
    case "监听设备架": {
      const front = [
        path("M522 215l6-5h33v47l-5 7h-34Z", p.dark, edge(p, 1.04)),
        rect(520, 215, 37, 48, "url(#furnishing-front)", `rx="2" ${edge(p, .97)}`),
        rect(523.5, 220, 29.5, 37, p.ink, `rx="1" stroke="${p.edge}" stroke-width=".64"`),
        line("M524 217h31m-33 43h33m3-43 2-4v42l-2 4", p.edge, .7, .78),
      ];
      for (let i = 0; i < 3; i++) {
        const y = 221 + i * 12;
        front.push(rect(525, y, 27, 10.5, p.lining, `rx=".85" ${edge(p, .61)}`),
          line(`M527 ${y + 1.6}h23m-12 5h6`, p.edge, .57, .85),
          dot(531, y + 5.7, 2.65, p.top, edge(p, .66)), line(`M531 ${y + 5.7}l1-1.5`, p.ink, .57),
          dot(548, y + 5.7, .9, i === 0 ? "#c1916c" : "#8a938d"));
      }
      const running = ["dusk", "night"].map(phase => `<g class="phase-view phase-${phase}" display="none">` +
        dot(548, 226.7, 4, "url(#celebration-bulb)") + dot(548, 226.7, 1, "#ffe0a7") + "</g>").join("");
      return oval(540, 263, 24, 5.5, "url(#furnishing-contact)") + front.join("") + running +
        tape(p, 527, 209) + tape(p, 535, 204, 17);
    }
    case "手摇影箱柜":
      return shadowBox(p);
    case "靠墙照片边柜":
      return anniversaryDisplay(p);
    case "筹备相片展架":
      return oval(97, 237, 37, 5.3, "url(#furnishing-contact)") +
        path("M68 194h6v45h-6ZM120 194h6v45h-6Z", p.face, edge(p, .83)) +
        line("M69.6 212v24m52-24v24m-50-3h50", p.edge, .69, .9) +
        rect(61, 176, 71, 50, "url(#furnishing-front)", `rx="2" ${edge(p, 1.06)}`) +
        rect(64, 179, 65, 44, "#9f7f83", `rx="1.25" stroke="${p.edge}" stroke-width=".79"`) +
        rect(66, 181, 61, 40, "url(#cottage-fabric)", 'opacity=".65"') +
        mountedPrint(p, portraits.morning, 67, 183, 29, 31) +
        mountedPrint(p, portraits.reading, 100, 183, 25, 18) +
        mountedPrint(p, portraits.bass, 101, 204, 24, 15) +
        line("M64 224h64", p.edge, .69);
    case "周年册小展台":
      return desk(p, 376, 218, 58, 13, 246,
        path("M381 219l7-10h37l4 10v9h-48Z", p.dark, edge(p, .78)) +
        group("translate(385 212) scale(.88 .77)", openAlbum(p, 0, 0)) +
        line("M405 213l1 9-1 3-1-3", "#b66674", .93) +
        dot(381, 225, 1.2, p.edge) + dot(428, 225, 1.2, p.edge), true);
  }
}
