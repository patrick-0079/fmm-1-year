// Draw the three translucent bells on the same small pixel grid as the meadow.
// The open fringe baseline is row 28 in every cell; animated filaments attach there.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const cell = 48, columns = 8, rows = 3;
const width = cell * columns, height = cell * rows;
const image = Buffer.alloc(width * height * 4);
const strokes = [0, .15, .46, 1, .83, .47, .16, .03];
const hues = [
  { glass:[116,211,244], edge:[103,235,249], veil:[86,144,219], glint:[229,255,250] },
  { glass:[110,161,235], edge:[128,211,252], veil:[105,115,211], glint:[210,251,255] },
  { glass:[148,157,238], edge:[176,199,255], veil:[107,111,208], glint:[229,238,255] },
];
const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))));
for (const [species, colors] of hues.entries()) {
  for (const [frame, contraction] of strokes.entries()) {
    const radius = 20 * (1 - contraction * .16);
    const depth = [17,16,14][species] + contraction * 3;
    for (let iy=0; iy<cell; iy++) for (let ix=0; ix<cell; ix++) {
      const x = (ix + .5 - cell/2) / radius;
      if (Math.abs(x) > 1) continue;
      const arch = Math.sqrt(1-x*x);
      const top = 28 - depth * arch;
      const brim = 28 + arch * 1.65 - (1-arch)*1.5;
      const scallop = .5 + Math.cos((x+1)*Math.PI*[4,5,4][species])*.5;
      const tip = brim + arch * (1.6+2.2*scallop);
      const y = iy + .5;
      if (y < top || y > tip) continue;
      const v = (y-top)/Math.max(1,brim-top);
      const ribbon = (x+.06) + .12*Math.sin(v*2.8);
      const crown = Math.max(0,1 - Math.hypot((x+.12)*1.9,(v-.55)*3));
      const falloff = Math.max(0,1-Math.abs(ribbon)*1.25);
      let rgb = mix(colors.glass,colors.veil,.26+.30*v+.1*x);
      let alpha = 83 + crown*61 + 10*arch;
      // Four internal radial canals and a pearly oral cluster under the glass.
      const canal = Math.abs(Math.sin((ribbon/(.39+v*.61)+.03)*Math.PI*2));
      if (v>.27 && v<.92 && canal<.14 && Math.abs(x)<.89) {
        rgb=mix(rgb,colors.edge,.72); alpha+=34;
      }
      if (crown>.65) {rgb=mix(colors.glass,colors.glint,.7); alpha+=30;}
      const edge = y-top;
      if (edge<1.2) {rgb=colors.edge; alpha=181;}
      if (edge>=1.2 && edge<3.4 && x>-.74 && x<-.12) {
        rgb=colors.glint; alpha=x>-.46 && x<-.37 ? 131 : 228;
      }
      if (v>.65 && v<.91) {rgb=mix(rgb,colors.veil,.38); alpha-=17;}
      // Repeated little lappets have a violet underside and a backlit lip.
      if (y>brim-.85) {
        const along=(y-brim+.85)/(tip-brim+.85);
        rgb=along<.38 ? colors.veil : mix(colors.edge,colors.glint,scallop*.46);
        alpha=along<.38 ? 135 : 155+55*falloff;
        if (tip-y<.95 && scallop>.65) {rgb=colors.glint;alpha=217;}
      }
      if (Math.abs(x-.66)<.055 && v>.28 && v<.38) {rgb=colors.glint;alpha=192;}
      const offset=((species*cell+iy)*width + frame*cell+ix)*4;
      image.set([...rgb,Math.round(alpha)],offset);
    }
  }
}
const output=fileURLToPath(new URL("../src/assets/meadow-jelly-bells.webp",import.meta.url));
await sharp(image,{raw:{width,height,channels:4}}).webp({lossless:true,effort:6}).toFile(output);
