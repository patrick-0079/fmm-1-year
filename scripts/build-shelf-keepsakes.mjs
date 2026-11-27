import sharp from "sharp";
import frames from "../src/town-keepsake-frames.json" with { type: "json" };

// Exhibit miniatures keep the original paper, ticket notches and postcard edges.
// Coordinates in the overlays are the dimensions of the actual shelf pieces.
const source = "src/assets/town-interiors/keepsakes.webp";
const parts = [];
function layer(width, height, markup) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${height * 2}" viewBox="0 0 ${width} ${height}">${markup}</svg>`);
}
async function add(key, width, height, left, markup) {
  const [sx, sy, sw, sh] = frames[key];
  const paper = await sharp(source).extract({left: sx, top: sy, width: sw, height: sh})
    .resize(width * 2, height * 2, { fit: "fill" }).png().toBuffer();
  const input = await sharp(paper).composite([{input: layer(width, height, markup)}]).png().toBuffer();
  parts.push({input, left: left * 2, top: 0});
}

function flower(cream) {
  const shadow = cream ? "#ad7c48" : "#885887";
  const bud = cream ? "#e1b96b" : "#ae72b6";
  const light = cream ? "#fff3ce" : "#efd0e5";
  return `<g transform="rotate(-5 6 10)">
    <path d="M1.7 4H10.2V17.1H1.7Z" fill="#fff3d4"/>
    <path d="M5.4 10.1L6.4 16.4M6.1 14.5Q8.4 11.4 9.4 12Q8.2 14.5 6.1 14.5" fill="#71834b" stroke="#657844" stroke-width=".7"/>
    <path d="M3 9.4Q2 8 2.5 6.8L3.6 7Q3.7 5.4 4.9 5.7L5.4 6Q5.8 4.3 6.8 4.9L7.2 5.6Q8.1 4.5 8.8 5.5L9 6.4Q10.2 6.1 9.7 7.5Q8.8 8.6 7.2 9.5L5.2 11.3Q3.9 10.8 3 9.4Z" fill="${bud}" stroke="${shadow}" stroke-width=".8"/>
    <path d="M8.6 6.5Q8 8.3 5.6 9.9Q6.4 8.3 8.6 6.5ZM4.2 6.8Q5.5 8 4.8 9.5Q4.1 8.4 4.2 6.8Z" fill="${light}"/>
  </g>`;
}
await add("florist", 12, 20, 0, flower(false));
await add("florist-cream", 12, 20, 14, flower(true));
await add("hall", 37, 19, 28, `
  <path d="M3.2 3H24.8V15.9H3.2Z" fill="#ffe2a1"/>
  <path d="M3.4 5.1Q10 8 15.3 3.5" fill="none" stroke="#b8754a" stroke-width=".65"/>
  <path d="M5 5.8L8.1 6L6.1 8.3ZM10.2 5.6L13.3 4.5L12.2 7.2Z" fill="#c45c4f"/>
  <path d="M6.2 14.4V10.5H11V8.7Q12.2 5 15 5Q18 5.2 19.1 8.7V10.2H23V14.4Z" fill="#efb273" stroke="#ac7246" stroke-width=".75"/>
  <path d="M10 9Q11.1 5.1 15.2 5Q18.4 5.3 20 9Z" fill="#bb6550"/>
  <path d="M9.7 9.1H20.2M5.3 14.8H24" fill="none" stroke="#9c6949" stroke-width=".9"/>
  <path d="M13.4 14.1V11.8Q15 9.7 16.6 11.8V14.1Z" fill="#8a644c"/>
  <path d="M11.6 11.2V13.9M18.4 11.2V13.9" fill="none" stroke="#b67950" stroke-width=".75"/>
  <path d="M14.9 5.5V2.6L18 3.4L15.2 4.1" fill="#bc6654" stroke="#ac7047" stroke-width=".45"/>
  <path d="M26.9 4V15.3" fill="none" stroke="#b58155" stroke-width="1" stroke-dasharray=".8 1.6"/>
`);
function postcard(night) {
  const sky = night ? "#3d4d75" : "#a9d7e2";
  const far = night ? "#67738a" : "#90b9a6";
  const ground = night ? "#53566c" : "#7d9969";
  const architecture = night ? "#99816f" : "#efd3a0";
  const roof = night ? "#8a6371" : "#b97253";
  const motif = night ? `<path d="M2.2 5.6Q10 8.6 18.8 4.5" fill="none" stroke="#ddd2a2" stroke-width=".8"/>
    <g fill="#ffd467" stroke="#bb8046" stroke-width=".6"><rect x="5.2" y="7.4" width="2.7" height="3.5" rx=".8"/><rect x="11.8" y="7.4" width="2.7" height="3.5" rx=".8"/></g>`
    : `<path d="M1.8 5Q10 7.8 19.2 3.7" fill="none" stroke="#947559" stroke-width=".75"/>
    <path d="M3.6 5.5L7.8 6.1L5.6 9.2Z" fill="#e0ab48"/><path d="M10.2 6L14.7 5.2L13.2 8.8Z" fill="#c96867"/>`;
  return `<rect x="1.5" y="1.65" width="26" height="16.7" rx=".7" fill="${sky}"/>
    <path d="M1.5 13.4L6.9 10.3L11.8 12.5L18.3 9L27.5 12V18.3H1.5Z" fill="${far}"/>
    <path d="M1.5 16L8 13L17.5 15L27.5 11.8V18.4H1.5Z" fill="${ground}"/>
    <path d="M16.8 16V12.3H19V11.1Q20 8.8 21.5 9.2Q23 9.3 23.6 11.1V12.3H25.8V16Z" fill="${architecture}"/>
    <path d="M18.5 11.4Q19.5 8.5 21.5 8.7Q23.1 8.9 24 11.4Z" fill="${roof}"/>
    <path d="M20.7 16V13.8Q21.6 12.8 22.4 13.8V16Z" fill="${night ? "#efbc77" : "#9b735b"}"/>
    ${motif}
    <circle cx="24.2" cy="4.7" r="3.75" fill="#a85654" stroke="#f7d99c" stroke-width=".65"/>
    <path d="M24.9 2.25Q22.15 2.7 22.9 5.2Q23.6 7.3 26.1 5.65Q25 7.9 22.75 6.95Q20.75 6 21.6 3.65Q22.65 1.6 24.9 2.25Z" fill="#ffe38c"/>
  `;
}
await add("post", 29, 20, 67, postcard(false));
await add("post-lamps", 29, 20, 98, postcard(true));
parts.push({input: await sharp("doc/artwork/small-sprites/shelf-foldout.png").resize(104, 40, {kernel: "nearest"}).png().toBuffer(), left: 258, top: 0});
await sharp({create:{width:362, height:40, channels:4, background:"#0000"}})
  .composite(parts).webp({lossless:true, effort:6}).toFile("src/assets/shelf-keepsakes.webp");
