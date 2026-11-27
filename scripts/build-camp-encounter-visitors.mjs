// Contact sheets for the seated camp encounters. Every drawing is inked at
// its final pixel density. Only the position of a cel changes in the game.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const cell = 48;
const path = (d, fill, stroke = "none", weight = 1) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d, color, width = 1) => path(d, "none", color, width);
const spot = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const at = (x,y,ink) => `<g transform="translate(${x} ${y})">${ink}</g>`;

// The sparrow has a cinnamon cap, cream bib, chestnut coverts and two pale wing bars.
const quills = {
  folded: ["M22 22 Q18 21 14 24 L9 30 12 30 10 32 Q17 32 23 27 Q25 24 22 22Z","M12 29 L18 24 21 24 M15 29 L20 26"],
  loose: ["M23 23 Q19 20 14 22 L8 26 4 29 9 28 6 31 Q15 31 22 27Z","M8 28 L15 24 20 23 M12 28 L18 25"],
  high: ["M22 24 Q17 23 13 19 L10 12 11 5 13 6 15 12 15 7 18 9 20 16 Q25 18 22 24Z","M13 10 L15 17 20 21 M17 12 L19 17"],
  open: ["M22 23 Q17 24 12 20 L4 13 2 9 7 10 11 13 8 8 13 10 18 15 21 16 24 20Z","M5 12 L12 16 18 21 M12 12 L17 17"],
  sweep: ["M23 23 Q18 21 13 22 L3 20 6 24 3 24 8 28 13 29 20 27Z","M6 23 L14 26 20 24 M12 23 L18 23"],
  down: ["M22 22 Q17 21 16 25 L13 32 13 38 15 36 16 39 19 34 20 32 22 30 24 25Z","M15 34 L18 28 21 24 M18 33 L20 28"],
};
const birdCels = [
  // wing, head x/y, tail tip y, foot gesture, beak, score
  ["open",1,-1,27,"trail",0,0], ["down",1,-1,27,"trail",0,0],
  ["high",0,-1,30,"brace",0,0], ["folded",0,0,30,"perch",0,0],
  ["loose",0,-1,29,"perch",1,1], ["folded",1,-2,32,"perch",2,2],
  ["high",1,-1,30,"brace",1,1], ["sweep",1,-1,25,"trail",0,0],
  ["loose",1,0,32,"brace",0,0], ["open",1,-2,29,"trail",0,0],
  ["high",0,-1,31,"brace",0,0], ["folded",.5,-.7,28,"perch",0,0],
  ["loose",0,-1,31,"perch",1,1], ["folded",1,-1,31,"perch",0,0],
  ["high",1,-1,28,"brace",0,0], ["open",1,-1,25,"trail",0,0],
];
function bird([wing,hx,hy,tail,foot,beak,score]) {
  const ink = "#503c43", rust = "#965841";
  const toes = {
    trail:"M20 31 L17 32 14 32 M26 31 L23 33 20 33",
    brace:"M21 31 L20 34 17 35 M21 34 L22 35 M27 31 L27 34 24 35 M27 34 L29 34",
    perch:"M21 31 L22 35 19 35.5 M22 35 L24 36 M27 31 L26 34.8 24 35.8 M26 34.8 L28.5 35.4",
  };
  const head = path("M20 19 Q20 14 25 12 Q30 10.5 33 14 L34.5 18 33.5 23 30 25 24 25 21 23Z","#c58a65",ink,1.3)
    + path("M21 17 Q25 12 29 12.5 L32 14.5 31 16 26 15.5 23 18Z","#a9684d")
    + path("M20 22 L23 18.5 26 17 30.5 17 33.5 18.5 33.2 22 29 25.5 23 25Z","#ffe1b1")
    + path("M23.5 18.5 L26 16.5 30 16 29 18.5 26 19.5Z","#795040")
    + spot(30.1,17.4,1.85,ink) + spot(30.55,16.8,.62,"#fff5db")
    + path(beak ? "M33.3 18 L38 17.6 35 19.6 33 19.6Z" : "M33.2 18 L37.5 19 33.5 20.3Z","#edb268",ink,.8)
    + (beak ? path(beak===2 ? "M33 21 L36.5 20 34.1 22.2Z" : "M33 20 L36.2 20 34 21.2Z","#e8a766",ink,.65) : "");
  return path(`M15 24 L8 ${tail-2} 3 ${tail} 4 ${tail+2} 12 ${tail+1} 15 ${tail} 18 27Z`,"#865440",ink)
    + line(`M5 ${tail+.25} L13 ${tail-1}`,"#d5a173",1)
    + line(toes[foot],ink,1.75) + line(toes[foot],"#d99663",.82)
    + path("M11 27 Q13 23 20 20 L25 18 30.5 20 Q34 24 31 28 Q28 33.5 22 33 Q15 33 11 29Z","#c78d69",ink,1.45)
    + path("M15 28 Q21 28 24 23 L31 20 32 23 Q32 30 26 32 L20 32 17 31Z","#f5d5a9")
    + line("M18 30 L20 30.5 M23 31 L24 30.5","#e5bb94",1)
    + at(hx,hy,head) + path(quills[wing][0],rust,ink,1.25)
    + line(quills[wing][1],"#e6b182",1.05) + line("M18 23.8 L20.5 23","#fad6a1",1.2)
    + (score ? line("M36 12 L38 9 M38 14 L41.5 12","#ffdb8b",1.6) : "")
    + (score===2 ? line("M39 7.5 L39.5 4.5 42 4 M38 8 L39 8","#fff1b9",1.2) : "");
}

// The four wing positions are separately drawn: open wings reveal all four
// scalloped panels, and the edge-on fold exposes the underside and veins.
const wings = {
  spread: [
    ["M23 26 Q17 15 8 13 L5 14 6 19 8 21 8 23 13 26 18 27Z","M23 26 Q15 23 11 26 L11 29 13 32 16 31 17 34 20 32Z"],
    ["M25 25 Q29 13 39 9 L41 10 40 15 38 17 39 18 35 22 30 25Z","M25 26 Q32 22 37 23 L38 26 36 29 33 29 32 32 28 31Z"],
    "M22 25 L14 19 8 16 M18 23 L10 21 M22 26 L15 29 M26 24 L31 17 38 12 M29 22 L36 17 M26 26 L34 26",
    [[9,16],[13,18],[11,22],[14,28],[37,13],[34,15],[35,19],[34,25]],
  ],
  lift: [
    ["M23 26 Q15 21 13 11 L15 9 18 11 18 13 20 13 21 18 24 23Z","M23 26 Q18 22 16 24 L17 29 19 32 21 31Z"],
    ["M25 25 Q25 14 33 6 L35 7 35 11 33 14 34 15 30 21Z","M25 26 Q30 20 34 20 L35 22 33 27 30 28 29 31Z"],
    "M22 24 L17 13 M22 27 L19 27 M26 24 L29 15 33 9 M27 26 L32 23",
    [[16,13],[18,17],[19,25],[32,10],[30,14],[32,23]],
  ],
  fold: [
    ["M23 26 Q22 21 21 16 L19 11 18 12 18 16 20 22Z","M23 26 Q20 24 20 27 L21 30 22 30Z"],
    ["M25 25 Q24 15 28 8 L30 7 31 9 29 13 30 15 27 22Z","M25 27 Q28 22 31 20 L32 22 29 27 27 30Z"],
    "M24 24 L21 16 M26 23 L28 13 M26 26 L30 23",
    [[20,15],[28,11],[27,16],[29,24]],
  ],
  low: [
    ["M23 26 Q15 20 8 21 L6 23 8 26 11 27 12 29 17 28Z","M23 26 L14 29 15 32 18 34 20 32Z"],
    ["M25 25 Q30 17 38 16 L40 18 37 21 36 23 31 24Z","M25 26 Q30 23 36 24 L36 27 32 30 30 29 28 32Z"],
    "M22 25 L10 23 M22 27 L17 31 M26 24 L37 18 M27 26 L33 26",
    [[10,23],[13,25],[17,30],[36,19],[33,21],[32,26]],
  ],
  bank: [
    ["M23 26 Q16 22 11 16 L11 12 14 13 16 16 18 16 21 21Z","M23 26 Q17 22 14 24 L15 28 18 30 19 33 22 30Z"],
    ["M25 25 Q31 16 38 14 L42 14 40 18 37 20 37 22 31 25Z","M25 26 Q32 23 37 25 L37 28 34 30 31 29 29 32Z"],
    "M22 24 L14 15 M22 27 L17 26 M26 24 L31 21 39 16 M28 26 L34 27",
    [[14,16],[17,19],[17,25],[38,17],[34,20],[34,27]],
  ],
};
const butterflyCels = [
  ["fold",0],["spread",1],["lift",2],["spread",1],["low",0],["lift",1],["fold",0],["bank",2],
  ["lift",2],["bank",1],["fold",1],["low",0],["spread",0],["bank",0],["lift",1],["spread",2],
];
// Abdomen tip and two antenna tips mark the pitch at each beat or turn.
const butterflyTips = [
  [23,30,23,15,29,15], [22,31,22,15.5,29,16], [21,29,23,15,30,17],
  [22.5,30,21.5,16,29,16], [22,31,22,16,29,17], [20.5,30,22,16.5,30,17.5],
  [21,30.5,22.5,16,29.5,17.5], [20.5,29,23,15,30.5,17], [22,32,21.5,17,28.5,17.5],
  [22.5,31.5,21.5,16.5,28.5,17], [23,31,22,15,29.5,16], [22,30,21,16,30,16],
  [22.5,31,22,15.5,29,15.5], [21.7,31,21.5,16.5,29,16], [21,30,22.5,15,30,16],
  [20.5,29,23,15,30.5,16.5],
];
function butterfly([pose,cinders], frame) {
  const [left,right,veins,marks] = wings[pose];
  const [tx,ty,lx,ly,rx,ry] = butterflyTips[frame];
  const wing = ([fore,hind]) => path(hind,"url(#copper)","#693e3e",1.1) + path(fore,"url(#amber)","#713f38",1.25);
  return wing(left) + wing(right) + line(veins,"#b96534",1.1)
    + marks.map(([x,y])=>spot(x,y,.88,"#fff2a3")).join("")
    + path(`M${tx} ${ty} Q22 27 24 22 L25 22 25 25 Q24 27 ${tx+.7} ${ty}Z`,"#783d41","#573942",.8)
    + line("M23.7 26 L25 22","#ffd985",.9) + spot(25.1,21.5,1.35,"#6c4341")
    + line(`M24.8 20.9 Q24 17 ${lx} ${ly} M25.7 20.8 Q27 17.6 ${rx} ${ry}`,"#734b40",.9)
    + (cinders ? spot(16,35,.8,"#ffb660")+spot(12,38,.5,"#ffdc8a") : "")
    + (cinders===2 ? line("M10 36 L11 34.5","#f08347",.85) : "");
}

// Painted ribbons lead a drifting jelly to the right palm. The lowest filament
// reaches (10,40) in the touch cels. The glass has a pearl rim and four canals.
const bells = {
  open: ["M10 21 Q10 13 16 9 Q22 5 29 8 Q35 10 38 16 L38 19 35 21 32 20 30 23 26 22 23 24 20 22 17 23 15 21 12 22Z","M12 19 Q14 12 20 10 M24 9 L27 9.5","M16 20 Q16 13 22 9 M23 22 Q22 15 24 10 M31 20 Q30 14 26 10"],
  rise: ["M12 20 Q10 13 15 8 Q20 4 27 6 Q34 7 37 14 L37 17 35 20 32 19 29 22 26 21 23 23 19 21 16 22 14 20Z","M13 16 Q14 10 19 8 M24 7 L26 7","M17 19 Q15 12 21 8 M23 21 Q21 14 23 8 M30 19 Q29 12 25 8"],
  tuck: ["M14 20 Q12 13 17 7 Q21 3.5 26.5 5 Q33 6 35 13 L35 17 33 19 31 18 29 21 26 20 23 22 20 20 17 21Z","M15 15 Q16 9 20 7 M24 6 L25 6","M18 19 Q16 12 21 7 M24 20 Q22 13 23.5 7 M30 18 Q29 12 25 7"],
  lean: ["M10 22 Q10 15 15 11 Q20 7 26 7 Q33 7 37 13 L38 16 36 19 33 18 30 21 27 21 24 24 20 23 17 25 15 23 12 24Z","M12 19 Q13 15 18 12 M23 9.5 L26 9","M16 22 Q16 15 21 11 M23 22 Q22 17 24 10 M30 19 Q30 13 26 10"],
};
const strings = {
  drift:["M16 21 C18 28 8 28 10 34 Q11 37 8 39","M22 21 C25 28 18 29 19 34 Q19 37 16 39","M27 21 C29 25 24 29 24 32 Q25 35 22 37","M32 20 Q36 25 31 30 Q29 32 30 34"],
  float:["M16 21 C15 25 12 27 13 31 Q14 35 12 37","M22 21 C20 26 23 28 20 32 Q16.5 36 19 39","M27 20 C28 24 24 27 26 31 Q28 34 25 37","M32 19 Q34 24 31 28 Q29 32 33 33"],
  pull:["M17 20 C20 25 18 29 15 32 Q13 34 15 36","M22 21 Q27 24 22 31 Q18 35 21 37","M27 19 C31 25 27 28 28 31 Q29 35 27 36","M32 18 Q36 23 32 27 Q31 30 33 32"],
  touch:["M16 22 C17 26 10 29 12 34 Q13 37 15 36","M22 22 C22 27 16 31 15 35 Q14 38 10 40","M27 21 Q29 26 21 31 Q17 35 17 37","M32 19 C35 25 27 30 29 33"],
};
const jellyCels = [
  ["lean","drift",0],["tuck","pull",0],["rise","float",0],["open","drift",0],
  ["rise","float",0],["tuck","pull",0],["lean","drift",0],["open","float",0],
  ["rise","float",0],["tuck","pull",0],["lean","drift",0],["open","touch",1],
  ["rise","touch",2],["open","touch",1],["tuck","pull",0],["lean","drift",0],
];
// This free filament drags through the turn a beat behind the other three.
const freeFilament = [
  "M16 22 C16 28 7 30 8.5 34 Q10 37 6 39", "M17 20 C18 24 13 29 14 32 Q16 35 12 37",
  "M16 21 C18 28 12 28 13 33 Q14 35 11 37", "M16 21 C17 25 10 29 10 33 Q9 36 7.5 37",
  "M16 21 C14 26 13 27 13 31 Q14 35 12 37", "M17 20 C17 25 19 26 16.5 31 Q13 35 15 36",
  "M16 23 C17 25 15 30 16 32 Q18 36 14.5 38", "M16 21 C13 26 18 28 16 31 Q14 35 15 36",
  "M16 21 C14 25 10 26 11 30 Q12 35 9.5 35", "M17 20 C18 24 12 28 13 31 Q15 35 12 36",
  "M16 23 C15 27 11 27 11 31 Q10.5 35 13 36", "M16 21 C17 26 10 29 12 34 Q13 37 15 36",
  "M16 21 C19 25 12 28 13 34 Q14 36 16 36", "M16 21 C17 27 12 28 13.5 34 Q15 36 16.5 35",
  "M17 20 C19 24 15 28 17 32 Q19 35 17 37", "M16 23 C17 27 16 29 19 32 Q21 35 19 37",
];
function jelly([bell,tail,touch], frame) {
  const [rim,gloss,canals] = bells[bell];
  return strings[tail].map((d,i)=>line(i===0?freeFilament[frame]:d,["#8bbbe9","#b8e7fb","#92d9f4","#83b4e4"][i],i===1?1.45:1)).join("")
    + path(rim,"url(#glass)","#9adcf4",1.4) + line(canals,"#9bc9ed",.8)
    + line(gloss,"#def8ff",1.45)
    + path("M20 14 Q21 12 23 13 L24 15 Q26 11 28 13 Q29 15 26 16 Q28 17.5 26 18 L23.5 16 Q21 19 20 17 Q18.5 15.5 22 15.5Z","none","#d5e9ff",.88)
    + (touch ? spot(10,39.75,touch===2?2.2:1.5,"#9ee7ff88")+spot(10,39.75,1.1,"#e5fdff") : "")
    + (touch===2 ? line("M6 39 L4 38 M13.5 40 L15.5 40 M10 36 L10 34.5","#c2f4ff",.8) : "");
}

// The candy keeps its volume while the skewer turns. Distinct views expose the
// toasted lower edge, then the two scallops left by the bite.
const candies = {
  left: ["M15 18 Q15 15 19 15 L31 18 Q35 19 34 23 L32 29 Q31 32 27 31 L15 27 Q12 26 13 23Z","M17 16 L28 19 Q31 20 30 23 L28 29 16 26 14 24 16 20Z","M29 20 Q32 18 33 21 L31 28 29 29 29 25Z"],
  slant: ["M16 17 Q18 14 21 16 L32 21 Q35 23 32 26 L29 30 Q28 32 24 30 L15 26 Q12 24 13.5 21Z","M18 17 L28.5 21.5 Q31 23 28 26 L25 29 16 25 14 23Z","M31 21.5 Q34 23 31 26 L28.5 29.5 26 29Z"],
  level: ["M14 18 Q14 15 18 15.5 L31 16 Q34 16.5 34 20 L34 26 Q34 30 30 30 L16 29 Q13 28 13.5 25Z","M16 17 L28 17 Q30 17.5 30 20 L29 27.5 16 27 15 24Z","M31 17 Q33 17 33 20 L32.5 27 30 28 30.5 22Z"],
  upright: ["M18 14 Q19 12.5 22 14 L30 17 Q33 18 32 21 L28 31 Q27 34 23 32 L16 29 Q13.5 28 15 24Z","M19 15 L28 18 30 20 26 30 17 27 16 24Z","M30.5 18.5 L31 21 27.5 30.5 25 31 27 25Z"],
  turning: ["M18 15 Q19 13 22 14 L31 17 Q33 18 32 20.5 L29 29.5 Q28 32 24.5 31 L16.5 28 Q14 27.5 15 24Z","M19 15.5 L29 18 30 20 27 29 17 26.5 16 24Z","M30.5 18.5 L31 20.5 28.5 29.5 26.5 30Z"],
  nibble: ["M18 16 Q22 18 23 15 Q25.5 18 28 15.5 L31 17 Q32 18 31 21 L28 30 Q27 33 24 32 L16 29 Q14 28 15 24Z","M18.5 18 Q22 19 23.5 17 Q26 19 28 17.5 L29.5 19.5 26 29.5 17 27 16.5 24Z","M30 18.5 L30.5 20.5 27.5 29.5 25.5 30Z"],
  bitten: ["M17 18 Q18 20 20.5 20 Q22.5 19 22 17 Q25 19 26.5 16.5 L30 17 Q32 18 31 21 L29 28 Q28 31 25 31 L16 28 Q14 27 15 24Z","M17 20 Q21 23 23 19 Q26 20 27 18 L29 19 26 28.5 17 26.5 16 24.5Z","M30 19 L30.5 21 28.5 27.5 26 29Z"],
  lowering: ["M15.5 18 Q17.5 21 20 20 Q22 20 22 17.5 Q25 20 26.5 17 L30 17.5 Q32 18 31.5 21 L30 27.5 Q29.5 31 26 30.5 L16.5 28.5 Q14.5 28 14.5 25Z","M16.5 20 Q20 23 23 19.5 Q25 21 27 18.5 L30 19.5 27 28.5 17 27 16 25Z","M30 19 L30.5 21 29.5 27 27.5 29Z"],
};
const sweetCels = [
  ["level",0],["left",0],["slant",1],["slant",2],
  ["left",3],["upright",4],["turning",5],["left",4],
  ["slant",3],["level",4],["turning",4],["upright",5],["nibble",5],["bitten",5],["lowering",5],["lowering",4],
];
function marshmallow([view,toast]) {
  const [outline,face,side] = candies[view];
  const warmth = ["#ecd5c0","#ecccc0","#e7bc99","#dfa778","#d9925c","#cd8755"][toast];
  const freckles = [[17,24],[19,26],[22,26.8],[24,27.5],[26,26.3]];
  return path(outline,warmth,"#775142",1.35)
    + path(face,toast<2?"#fff2da":"url(#toasted)") + path(side,warmth)
    + line(view==="bitten" || view==="nibble" ? "M17.5 19.5 Q21 22 23 18.5" : "M17.3 20 L18.5 17.8 22 18","#fff8e7",1.15)
    + freckles.slice(0,toast).map(([x,y],i)=>line(`M${x} ${y} l1 .2`,i%2?"#c98850":"#dca463",.82)).join("");
}

const gradients = `<defs>
  <linearGradient id="amber" x2=".2" y2="1"><stop stop-color="#fff7a0"/><stop offset=".43" stop-color="#ffcb58"/><stop offset="1" stop-color="#ed843a"/></linearGradient>
  <linearGradient id="copper" x2="0" y2="1"><stop stop-color="#ffdd6d"/><stop offset="1" stop-color="#db793b"/></linearGradient>
  <linearGradient id="glass" x2=".2" y2="1"><stop stop-color="#8cbeef" stop-opacity=".91"/><stop offset=".45" stop-color="#627bbf" stop-opacity=".89"/><stop offset="1" stop-color="#8ccde6" stop-opacity=".65"/></linearGradient>
  <linearGradient id="toasted" x2=".15" y2="1"><stop stop-color="#fff6df"/><stop offset=".5" stop-color="#ffe9c6"/><stop offset="1" stop-color="#e8b277"/></linearGradient>
</defs>`;
const rows = [birdCels.map(bird),butterflyCels.map(butterfly),jellyCels.map(jelly),sweetCels.map(marshmallow)];
const frames = [];
for (const [row,drawings] of rows.entries()) for (const [column,drawing] of drawings.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${cell}">${gradients}${drawing}</svg>`;
  frames.push({input: await sharp(Buffer.from(svg)).png().toBuffer(), top: row * cell, left: column * cell});
}
const output = fileURLToPath(new URL("../src/assets/meadow-camp-encounter-visitors.webp",import.meta.url));
await sharp({create:{width:16*cell,height:4*cell,channels:4,background:"#0000"}})
  .composite(frames).webp({lossless:true,effort:6}).toFile(output);
