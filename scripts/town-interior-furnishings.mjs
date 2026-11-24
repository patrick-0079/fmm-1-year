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
  return group(`translate(${x} ${y}) scale(${size})`,
    oval(0, .1, 9, 2.4, p.ink, 'opacity=".2"') +
    path("M-8-14L-6.5-3Q0 1.5 6.5-3L8-14Z", ceramic, edge(p)) +
    path("M-5.8-12Q-2.5-9-2.6-2Q-4-2-5-3Z", "#fff2ce", 'opacity=".43"') +
    line("M-6.7-7Q0-4.2 7-7M-5.9-5.3Q0-3 6-5.3", p.edge, .55, .94) +
    path("M0-7.8l1.35 1.1L0-5.4l-1.35-1.3Z", "#f3deba", edge(p, .4)) +
    oval(0, -14, 8.6, 3, ceramic, edge(p)) + oval(0, -14.5, 6.4, 1.65, "#665541") +
    line("M-5.8-13.2Q-.7-11.5 5.8-13.2", "#f5dabb", .61) +
    line("M0-14Q-1-25-10-32m12 18Q4-29 11-33M1-15Q0-26 1-39", "#587458", 1.1) +
    leaf(p, -1.5, -18, -21, "#789267") + leaf(p, 3, -21, 110, "#829d71") +
    leaf(p, -4, -23, 5, "#91a77a") + leaf(p, 5, -28, 117, "#698d70") + leaf(p, -.4, -28, 32, "#6d8b66") +
    blossom(p, -10, -32, petals) + blossom(p, 10.2, -32.8, "#d99ca4") + blossom(p, 1, -38.5, petals));
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
    path("M472 165h32l5 10-3 5h-37l-4-5Z", p.top, edge(p, .96)) + line("M470 175h35", p.edge, .73) +
    rect(465, 161.5, 6.5, 10.5, p.face, `rx="1.9" ${edge(p, .71)}`) + rect(505, 161.5, 6.5, 10.5, p.face, `rx="1.9" ${edge(p, .71)}`) +
    path("M482 171v-4q0-4 5-5q5 .6 5 4v4", "none", `stroke="${p.ink}" stroke-width="1.45"`) +
    rect(480.2, 168.5, 3.6, 4.2, p.soft, `rx=".7" ${edge(p, .59)}`) + rect(490.6, 168.5, 3.6, 4.2, p.soft, `rx=".7" ${edge(p, .59)}`);
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
      return shelf(p, 214, 58, 113, 49, flowerPot(p, 235, 101, 0, .86) + flowerPot(p, 267, 101, 1, .93) + flowerPot(p, 302, 101, 2, .77));
    case "baker":
      return shelf(p, 145, 59, 91, 44, [154, 177, 202].map((x, i) =>
        path(`M${x} 87h17l-2 8q-6 3-13 0Z`, i === 1 ? p.soft : p.lining, edge(p, .64)) +
        oval(x + 8.5, 86.8, 8.7, 2.9, p.top, edge(p, .68)) + line(`M${x + 2} 89.5q6 2 13 0`, p.edge, .6)).join("")) +
        [164, 188, 214].map((x, i) => line(`M${x} 103v8`, p.ink, .87) + oval(x, 114, i === 1 ? 4.4 : 3.9, 3.6, p.face, edge(p, .66)) +
          oval(x - .5, 113.7, 2.5, 2.25, p.top, `stroke="${p.edge}" stroke-width=".56"`)).join("");
    case "maker":
      return shelf(p, 334, 55, 160, 52, [346, 392, 438].map((x, i) =>
        line(`M${x + 17} 63v6q-14 7-7.5 14l7.5 4q16-5 9-13l-9-5`, p.edge, .95, .92) +
        dot(x + 17, 64, 1.4, p.top, edge(p, .54)) + jewelry(p, x, 87 - i % 2 * 2, 34)).join(""));
    case "post":
      return shelf(p, 441, 59, 117, 48, [449, 482, 515].map((x, i) =>
        paper(p, x + 6, 71 + i % 2 * 5, 20, 14) + envelope(p, x, 82, 26, 14, true)).join(""));
    case "books":
      return shelf(p, 187, 57, 143, 49, Array.from({ length: 12 }, (_, i) => {
        const x = 194 + i * 10.6, y = 66 + (i * 7) % 15;
        const fabric = [p.soft, p.top, p.lining, "#798c9d"][i % 4];
        return rect(x, y, 8.3, 99 - y, fabric, `rx="1" ${edge(p, .62)}`) +
          line(`M${x + 1.9} ${y + 3}h4.4m-4.4 2.3h4.4M${x + 1.9} 95.3h4.4`, p.edge, .59, .93);
      }).join(""));
    case "radio":
      return shelf(p, 41, 56, 149, 51, reelMachine(p, 48, 63) + line("M172 70q14 4 9 18m-6-12v11m7-9v7", p.edge, 1.05) +
        rect(169, 81, 5, 10, p.soft, `rx="1.4" ${edge(p, .72)}`) + rect(179, 81, 5, 10, p.soft, `rx="1.4" ${edge(p, .72)}`));
    case "hall":
      return line("M371 52h91", p.dark, 3.1) + line("M373 51.7h87", p.edge, .7) + [380, 414, 448].map((x, i) =>
        line(`M${x} 53v${11 + i % 2 * 6}`, p.ink, 1) + path(`M${x - 3} ${64 + i % 2 * 6}h6q0 7 7 13q-10 8-20 0q6-5 7-13Z`,
          "#f0ce93", edge(p, .85)) + line(`M${x - .7} ${66 + i % 2 * 6}q-.5 9-4 12`, "#fff0c7", 1.05, .86)).join("");
  }
}

export function redrawTownFurnishing(place, name, source) {
  const p = finishes[place];
  switch (name) {
    case "温室花桶":
    case "花店南壁盆栽": {
      const [, cx, cy] = source.match(/<ellipse cx="([\d.]+)" cy="([\d.]+)"/);
      return flowerPot(p, Number(cx), Math.floor(Number(cy)), Math.floor(Number(cx) / 20));
    }
    case "温室花架":
      return shelf(p, 37, 111, 118, 24, "") + [49, 72, 95, 118, 140].map((x, i) => flowerPot(p, x, 123, i, .49)).join("");
    case "花墙矮柜":
      return desk(p, 212, 108, 137, 15, 145, [229, 255, 313, 333].map((x, i) => flowerPot(p, x, 114 + i % 2 * 2, i, .52)).join("") + paper(p, 275, 110, 24, 9), true);
    case "压花台": {
      const stationery = rect(414, 146, 45, 14, p.dark, `rx="1.6" ${edge(p, .72)}`) + paper(p, 418, 147, 34, 10) +
        leaf(p, 439, 153, 94, "#769578") + blossom(p, 429, 153, p.soft) +
        line("M469 156l19-7m-18 8 19-7", p.dark, .85) +
        [495, 507, 517].map((x, i) => blossom(p, x, 154 + i % 2, [p.soft, "#dbc5ae", "#a69bb8"][i])).join("");
      return desk(p, 402, 141, 128, 23, 192, stationery);
    }
    case "缎带边桌":
      return desk(p, 485, 247, 68, 20, 284, flowerPot(p, 500, 254, 0, .47) +
        flowerPot(p, 519, 257, 1, .53) + paper(p, 532, 250, 14, 10));
    case "左侧品尝柜":
      return desk(p, 42, 223, 57, 23, 265, simpleCake(p, 70, 236));
    case "烘焙原料柜":
      return desk(p, 283, 109, 101, 16, 149, [299, 322, 346, 366].map((x, i) =>
        rect(x, 99 - i % 2 * 2, 11, 15 + i % 2 * 2, [p.soft, "#e8c6a0", p.lining, "#e7d3ab"][i], `rx="1.7" ${edge(p, .67)}`) +
        rect(x - .5, 98 - i % 2 * 2, 12, 3, p.dark, `rx="1.25" ${edge(p, .55)}`) + line(`M${x + 2.2} 103v7`, p.edge, .7)).join(""), true);
    case "东侧丈量柜":
      return desk(p, 488, 212, 63, 19, 250, jewelry(p, 498, 215, 43), true);
    case "长柜台":
      return desk(p, 176, 108, 207, 15, 146,
        rect(191, 110, 53, 11, p.dark, `rx="1.3" ${edge(p, .65)}`) + envelope(p, 195, 111, 22, 8, true) + envelope(p, 216, 111, 23, 8) +
        paper(p, 266, 110, 37, 10) + rect(328, 109, 45, 12, p.lining, `rx="1.4" ${edge(p, .65)}`) + envelope(p, 334, 110, 27, 10, true), true);
    case "L 形短边":
      return desk(p, 353, 128, 30, 43, 195, envelope(p, 360, 147, 16, 10, false));
    case "邮戳机工作桌":
      return desk(p, 452, 194, 87, 17, 236,
        envelope(p, 460, 198, 26, 11, true) + rect(503, 193, 24, 13, p.dark, `rx="2" ${edge(p)}`) +
        rect(514, 178, 9, 20, p.face, `rx="2" ${edge(p)}`) + line("M517 180v12", p.edge, 1) +
        path("M516 178l8-6 8 5-2 3-6-3-6 5Z", p.soft, edge(p, .86)) + dot(509, 201, 2, p.soft));
    case "临池侧窗木座":
      return sideWindow(p);
    case "装帧桌":
      return desk(p, 73, 121, 129, 23, 166, openAlbum(p, 83, 124) +
        paper(p, 137, 125, 29, 13) + line("M171 137l13-10", "#7b6958", 2.1) +
        line("M172 136l12-9", p.edge, .6) + rect(187, 125, 7, 8, p.dark, `rx="1.1" ${edge(p, .65)}`) + oval(190.5, 125, 3.5, 1.2, p.lining));
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
    case "手摇影箱柜":
      return shadowBox(p);
    case "靠墙照片边柜":
      return anniversaryDisplay(p);
  }
}
