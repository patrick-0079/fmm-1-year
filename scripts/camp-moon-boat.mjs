const path = (d, fill, stroke = "none", width = 1) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const line = (d, ink, width = 1) => path(d, "none", ink, width);
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const star = (x, y, size, fill) => path(
  `M${x} ${y-size} Q${x+.15} ${y-.2} ${x+size*.78} ${y} Q${x+.15} ${y+.2} ${x} ${y+size} Q${x-.15} ${y+.2} ${x-size*.78} ${y} Q${x-.15} ${y-.2} ${x} ${y-size}Z`, fill);

const sailColours = `<defs>
  <linearGradient id="ivory" x2=".2" y2="1"><stop stop-color="#fffbe3"/><stop offset=".68" stop-color="#ffefc3"/><stop offset="1" stop-color="#e9c595"/></linearGradient>
  <linearGradient id="chart" x2=".7" y2="1"><stop stop-color="#25315d"/><stop offset=".55" stop-color="#354979"/><stop offset="1" stop-color="#566db0"/></linearGradient>
  <linearGradient id="crease" x2="1" y2=".5"><stop stop-color="#aaa9cb"/><stop offset="1" stop-color="#d7c6cf"/></linearGradient>
</defs>`;

// Both pointed ends sit high above the little flat keel. The six marked
// vertices follow the paper as the hull tips and then gathers way again.
// The painted waterline stays on the registration at (40,48).
const hulls = [
  [9,29,69,27.5,35,36.6], [10,30.6,69.5,26.2,35.5,37.1], [9.7,30.1,69.1,26.8,35.4,36.9], [9,28.9,68.6,27.7,35,36.4],
  [9.5,28.2,68,28.1,34.9,36.3], [9,27.5,68,28.8,34.6,36], [9.2,28.6,68.5,28.1,35,36.3], [10,30.2,69.2,26.5,35.6,37],
  [9.2,29,68.6,27.7,35,36.4], [9.7,29.6,68.9,27,35.4,36.7], [10,30.1,69.4,26.6,35.5,36.9], [9.5,29.2,69,27.2,35.2,36.5],
  [9.1,28.8,68.8,27.7,35,36.3], [9.6,28,68.2,28.1,34.8,36.2], [10,29.8,69.4,26.6,35.4,36.8], [11,31,70,25.5,36,37.2],
];

// In the furled cels the navy printing is on the inside; only a thin strip
// shows between the two folds. Frames 8–10 turn that fold out towards Fufu.
// The lee edge, free corner and crease are inked independently on each cel.
const foldedSails = [
  ["M26 34 L36 24.5 51 31 55 33.3 37 36.5Z","M36 24.5 L40 31 51 31 55 33.3 38 32.9Z","M28 33.1 L38 30.2 36 25.2"],
  ["M25.7 35 L36.2 25.3 52.3 31.1 55.2 33 37 37Z","M36.2 25.3 L40.4 31.4 52.3 31.1 55.2 33 38.1 33.4Z","M28.3 33.9 L38 30.9 36.5 26"],
  ["M26 34.8 L36.5 25 52.1 31.2 54.8 33.2 37.2 36.8Z","M36.5 25 L40.4 31.1 52.1 31.2 54.8 33.2 38.1 33.2Z","M28.5 33.5 L38.1 30.6 36.6 25.6"],
  ["M25.8 34 L36.4 24 51 31 54.2 33.2 37.1 36.5Z","M36.4 24 L40 30.9 51 31 54.2 33.2 37.8 32.9Z","M28.1 32.9 L37.8 30.1 36.4 24.7"],
  ["M26 33.6 L36.1 24.1 50.4 31.5 54.1 33.7 36.8 36.5Z","M36.1 24.1 L39.9 31 50.4 31.5 54.1 33.7 37.8 33Z","M28.2 32.6 L37.8 30 36.2 24.8"],
  ["M25.5 33.5 L35.9 24.7 49.7 31.5 53.5 34.3 36.6 36.6Z","M35.9 24.7 L39.7 31.1 49.7 31.5 53.5 34.3 37.7 33.1Z","M27.9 32.5 L37.5 30.3 36 25.4"],
  ["M26.2 34 L36.4 24.6 51.4 31.5 54.3 33.6 37.1 36.7Z","M36.4 24.6 L40.1 31.1 51.4 31.5 54.3 33.6 38.1 33.1Z","M28.6 33 L38 30.5 36.5 25.2"],
  ["M27 34.8 L37.1 25 52.6 30.8 55.7 32.7 37.6 37Z","M37.1 25 L41 31.2 52.6 30.8 55.7 32.7 38.6 33.3Z","M29.1 33.8 L38.6 30.6 37.2 25.6"],
  ["M26.2 34.2 L36.7 23.8 50.6 30.1 54.3 32.5 37 36.6Z","M36.7 23.8 L41.2 30.3 50.6 30.1 54.3 32.5 38.2 32.8Z","M28.1 33.2 L38.2 29.7 36.8 24.4"],
];

// Paper vertices: mast tip, leeward corner, foot; the pale return on the
// opposite side grows from a pleat into a second, backlit triangular plane.
const openSails = [
  {tip:[37,21.8], rim:[55,29.3], foot:[38,35.4], returnTip:[32.2,27.5], heel:[25.7,34.9], map:[[41,28.6],[44.2,29.8]]},
  {tip:[36.5,16.4], rim:[59.6,28.9], foot:[37.2,35.4], returnTip:[31,24], heel:[24.1,35], map:[[41,25.5],[44,27.2],[48.8,25.6]]},
  {tip:[36.2,10.1], rim:[64.6,28.3], foot:[36.6,35.8], returnTip:[30.3,20.8], heel:[22,34.6], map:[[39.8,18.6],[41.3,26.2],[46.3,23.7],[51.2,28.6],[56.3,27.2]]},
  {tip:[36.2,8], rim:[65.7,28.3], foot:[36.6,35.5], returnTip:[29.1,19.9], heel:[21.1,34.4], map:[[39.8,16.9],[41.1,25.8],[46.7,23],[51.4,28.6],[57.1,27.3]]},
  {tip:[35.8,8.7], rim:[64,29.2], foot:[36.3,35.8], returnTip:[28.5,20.6], heel:[20.8,34.3], map:[[39.3,17.7],[40.8,26.2],[46,23.9],[50.7,29.1],[55.7,28.1]]},
  {tip:[36.9,9.3], rim:[64.9,27.4], foot:[37.2,35.5], returnTip:[30.7,20.3], heel:[22.4,35.1], map:[[40.5,17.7],[42,25.8],[47,23.3],[51.5,28.2],[56.2,26.8]]},
  {tip:[37.8,10.2], rim:[66.3,26.2], foot:[37.7,35.7], returnTip:[32.3,20.5], heel:[24.4,35.5], map:[[41.5,18.1],[43,25.6],[47.8,22.9],[52.4,27.7],[57.5,26.2]]},
];

function sail(frame) {
  if (frame < foldedSails.length) {
    const [front, fold, crease] = foldedSails[frame];
    return path(front, "url(#ivory)", "#75637e", 1.2)
      + path(fold, "#91a0b9", "#757493", .8) + line(crease, "#c1a0a4", .9);
  }
  const {tip:[tx,ty], rim:[rx,ry], foot:[fx,fy], returnTip:[ax,ay], heel:[bx,by], map} = openSails[frame-9];
  const back = `M${tx} ${ty+.6} Q${ax+1.2} ${ay+4} ${bx} ${by} Q${ax+3} ${by-1.65} ${fx-.2} ${fy+.7}Z`;
  const outer = `M${tx} ${ty} Q${tx+6.5} ${(ty+ry)/2+1} ${rx} ${ry} Q${rx-11.2} ${ry+.25} ${fx} ${fy}Z`;
  const printed = `M${tx+1.45} ${ty+3.6} Q${tx+7.9} ${(ty+ry)/2+2.2} ${rx-2.7} ${ry-.1} Q${rx-12} ${ry+.1} ${fx+.95} ${fy-1.45}Z`;
  let ink = path(back, "url(#ivory)", "#796780", 1.18)
    + path(`M${ax} ${ay} L${fx-.4} ${fy} ${bx+.6} ${by-.3}Z`, "#dac6d0")
    + line(`M${bx+2.3} ${by-.8} Q${ax+.9} ${ay+3} ${tx-.4} ${ty+3.7}`, "#fff6cc", 1)
    + path(outer, "#f5dca9", "#635978", 1.25) + path(printed, "url(#chart)");
  const chart = map.map(([x,y], i) => (i ? "L" : "M")+x+" "+y).join(" ");
  ink += line(chart,"#d4e4ed",.92);
  for (const [i,[x,y]] of map.entries()) {
    if (i === 1 || i === map.length-1) {
      const size = frame >= 11 ? (i===1?2.7:1.95) : 1.55;
      ink += star(x,y,size,"#ffe299")+dot(x,y,size*.33,"#fff6cd");
    } else ink += dot(x,y,1,"#edf3fa");
  }
  if (frame >= 11) {
    ink += dot(fx+4.1,fy-4.2,.63,"#c7d2ed") + dot(fx+7.4,fy-4.7,.55,"#c7d2ed");
    ink += line(`M${tx} ${ty+.2} l-.25 -1.8`,"#795e72",1.3)
      + path(`M${tx-.2} ${ty-1.8} q3.5 .7 6.4 -.4 l-2 1.8 2.25 .65 q-3.85 1.3 -6.5 .15Z`,"#ecc187","#977882",.7);
  }
  return ink;
}

function boat([left, ly, right, ry, fold, vy], frame) {
  const ink = "#665772", stampX = 48.3+(fold-35)*.45, stampY = 40+(ry-27.5)*.18;
  const silhouette = `M${left} ${ly} L${fold} ${vy} Q42.2 ${vy+.7} ${right} ${ry} L55.1 43.5 41 48.05 25.4 45.15Z`;
  const bow = `M${fold} ${vy} Q44.4 ${vy+.2} ${right} ${ry} L55.1 43.5 41 48.05Z`;
  const crescent = `M${stampX+1.8} ${stampY-2.9} c-1.2 1.05 -1.25 3.1 .04 4.05 1.13 .88 2.47 .68 3.23 .25 -1.02 2.24 -4.02 3.03 -6.02 1.51 -2.26 -1.75 -1.61 -4.96 .52 -6.01 q1.08 -.55 2.23 .2Z`;
  return sailColours
    + path(`M${left} ${ly} L29 31.6 Q39.6 29.4 46.4 31.2 L${right} ${ry} 52.5 38 34 39Z`, "#b4aec6", ink, 1.34)
    + line(`M${left+3} ${ly+.4} L29.4 32.7 Q39.2 30.7 46.3 32.2 L${right-2.8} ${ry+1}`, "#f8e7cc", .95)
    + sail(frame) + path(silhouette,"url(#ivory)",ink,1.5)
    + path(`M${left+.8} ${ly+.9} L${fold} ${vy} 40.2 47.15 25.7 44.5Z`, "url(#crease)")
    + path(`M${left+1.6} ${ly+1} L${fold-.5} ${vy+.4} 26.3 42.1Z`, "#f0d9b8")
    + path(bow,"url(#ivory)",ink,1.12)
    + path(`M39.9 46.7 L54.7 42.2 ${right-1.6} ${ry+1.4} 55.1 43.5 41 48.05Z`,"#c6b7bf")
    + line(`M${left+2} ${ly+1} L${fold-.4} ${vy+.9} M${fold+2.7} ${vy+.15} Q48.7 34.8 ${right-2.5} ${ry+1.25}`,"#fff7de",1.05)
    + line("M25.6 44.9 L39.2 47.4", "#a297af",.8)
    + path(crescent,"#f1c662","#b08055",.72) + dot(stampX+3.1,stampY-2.05,.58,"#ad825e");
}

export const moonBoatCels = hulls.map(boat);

// Each line is the rim of a shallow moonlit trough in the grass. The upper
// stroke fits around the paper keel; the broken lower one lingers in its wake.
const ripples = [
  [7,29.1,61,32,13,26,50], [5.5,29.7,62,32.6,13,24,49], [8,30.3,63.5,32.5,15,25,52], [11,30.3,63,31.5,16,27,53],
  [10.4,30.6,62,31,16.8,29,52], [9.5,31.1,62.6,30.6,16,30.2,54], [7.9,30.3,63.3,31.2,14,27.4,52.4], [6,29.3,64,32.2,12.1,24,50.7],
  [11.2,30.1,62.3,31.5,16,28,52.8], [9.6,30.4,63,31.2,15,26.5,53.8], [8.7,30.2,64,31.5,13.5,25,52.1], [7.5,30,65.3,31.3,12.5,24,51.5],
  [7.8,29.8,65.8,31,13,23.9,51], [8.3,30.3,65.3,30.6,14.3,25.6,51.5], [6,29.7,66,31.3,11,22.7,48.8], [4,29.4,66.7,32.2,8.5,20.3,46],
];
export const boatWakeCels = ripples.map(([left, y, right, by, low, gap, end]) =>
  line(`M${left} ${y} Q${left+7.8} ${y+3.75} ${gap+7} 33.1 M${gap+11} 33.4 Q${right-5} 34.35 ${right} ${by-1.7}`,"#b6e1e3be",1.15)
  + line(`M${low} ${y+5} Q${low+8.4} 38.8 ${gap+10} 37.6 M${gap+15.2} 37.65 Q${end-1.4} 37.35 ${end+3.4} 35.9`,"#92b3db9e",.96)
  + line(`M${right-8.2} ${by+2.3} q3.3 -.25 5.55 -1.4 M${left+4.2} ${y-.8} q1.7 1.1 3.55 1.45`,"#fff1b8bc",.9));

// The bubble ring has its own cel origin, so it can rise away from the
// whale. In the open centre the meadow remains visible through the bubbles.
const bubbles = [
  [[39,34,2.1],[42,30.4,1.1]], [[37.9,33.6,2.2],[42.1,29.9,1.5]], [[37,33.8,2.5],[42.5,29,1.7],[45,33.2,.9]],
  [[36,33.3,2.4],[42.3,28.6,1.9],[45.4,32.8,1.15]], [[36.4,33.2,2.4],[42.1,28.8,2],[46,33.5,1.2]],
  [[35.2,32,2.3],[42.8,28.2,1.8],[46.6,34,1.25]], [[34,30.5,1.7],[44.1,27.2,1.5],[47,34.3,1]],
  [[32.7,29.6,1.1],[45,26.2,.85]], [[39,34,2.2],[42.4,30.2,1.35]], [[36.4,34.2,3.1],[43.3,29.6,2.4],[46.4,34.2,1.5]],
  [[32,33.5,3.4],[36.6,26.5,2.1],[43.7,25.3,3.0],[49,30.3,2.2],[45.9,37.1,1.6]],
  [[27.8,31.6,2.85],[31.7,24.8,2.1],[39,21.8,2.8],[47,23.6,2.15],[51.8,29.6,3],[49.4,36.2,2.3],[41,40.4,1.65],[33.2,38.2,1.5]],
  [[24.9,31.7,3.1],[28.6,23.8,2.15],[38.5,19.5,3.05],[48.9,22.7,2.35],[55,30,3.15],[51.8,38.8,2.15],[41.6,44,2.8],[31,40.3,2.3]],
  [[23.5,30.5,2.8],[27.6,22.1,1.9],[38.2,17.8,2.9],[50,20.8,2.2],[56.6,29.7,2.85],[53.7,39,1.95],[42,45.4,2.5],[30.1,41.8,1.85]],
  [[20.6,29.6,1.85],[25.5,20.7,1.55],[37.6,15.6,2.1],[51.6,18.4,1.4],[59.6,28.3,1.8],[55.8,40.6,1.45],[42.5,47.2,1.7],[28.4,43,1.3]],
  [[18.2,27.8,.95],[36.8,13.4,1.05],[61,27.2,1.1],[43,48.8,.95],[26.6,44.4,.8]],
];
const ringArcs = {
  10:"M33.2 29.2 Q34.5 27.1 35.3 27 M45.7 25.7 Q48.5 26.7 49.4 28",
  11:"M28.6 28.8 Q29.6 26.6 30.3 26.2 M33.5 23.4 Q35.1 22.2 36.4 22 M41.9 21.7 Q44.1 21.8 45.6 22.9 M52.4 32.7 Q52.1 34.2 51.3 34.9 M46.6 38.4 Q45.1 39.6 43.3 40",
  12:"M25.6 28.4 Q26.1 26.3 27.2 25.2 M30.5 22.5 Q33.4 20.2 35.7 20 M41.7 19.5 Q44.7 19.9 47.1 21.4 M51 23.8 Q53.4 25.5 54.2 27.3 M55.3 33.3 Q54.9 35.8 53.35 37.2 M49.6 40 Q46.8 42.4 44.1 43 M38.5 43.8 Q35.3 43.4 32.8 41.6 M28.9 38.7 Q26.4 36.6 25.6 34.9",
  13:"M24.3 27.1 Q25.1 24.5 26.2 23.4 M30.7 20.2 Q33 18.1 35.4 17.9 M41.7 18 Q45.2 18 47.4 19.2 M57.3 33 Q56.9 36 55.4 37.8 M49 42.3 Q46.8 44.1 44.7 44.6 M34.5 44.3 L32.4 43.25",
  14:"M21.4 25.9 Q22.2 24.1 23 23.5 M31.9 16.9 L34 16 M55.6 21.2 Q57.3 22.6 57.8 23.7 M50.9 44.6 L48.7 46",
};
export const whaleRingCels = bubbles.map((group,frame) => {
  let ink = ringArcs[frame] ? line(ringArcs[frame],frame===12?"#b3e3f1c4":"#add6e99e",.95) : "";
  for (const [i,[x,y,r]] of group.entries()) {
    const bright=i%3===0;
    if (r<1.25) { ink+=star(x,y,r+.3,bright?"#f5dcab":"#d9e5ff"); continue; }
    ink+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${bright?"#c4e6f752":"#c1baf94d"}" stroke="${bright?"#b3ddeb":"#d4c8ed"}" stroke-width=".83"/>`;
    ink+=line(`M${x-r*.68} ${y-r*.12} Q${x-r*.6} ${y-r*.65} ${x-r*.16} ${y-r*.72}`,"#fbf6e8",.77);
    if (bright && r>=2.7) ink+=star(x+.28,y+.55,r*.6,"#ffedb2");
  }
  if (frame===12) ink+=star(33.7,20.9,2.35,"#ffe9ac")+star(54.2,36,2,"#f9e8c9");
  if (frame===13) ink+=star(32.2,18.9,2.15,"#ffe6ab")+star(57.4,36.7,2.05,"#e9d9fd");
  return ink;
});
