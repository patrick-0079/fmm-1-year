import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as footwearBuilder from "../scripts/build-shoes.mjs";
import { cellWidth, cellHeight, footStripHeight, footwearIds, outfitIndex, outfits } from "../src/costume-frames.ts";

const readAtlas = (name: string) => sharp(fileURLToPath(new URL("../src/assets/" + name, import.meta.url)))
  .ensureAlpha().raw().toBuffer({resolveWithObject:true});

test("the clean garment plate removes both source shoes down to transparent pixels, preserving cuffs and clothing", async () => {
  const masks = await sharp(fileURLToPath(new URL("../doc/artwork/wardrobe/footwear-profile-masks.png", import.meta.url)))
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  const body = await readAtlas("fufu-garments.webp");
  assert.equal(masks.info.width, 14*cellWidth, "every standing and seated pose needs a cutout");
  assert.equal(masks.info.height, outfits.length*footStripHeight);
  assert.equal(typeof footwearBuilder.clearFootwear, "function", "the builder must supply the clean plate used for compositing");
  for (let row = 0; row < outfits.length; row++) for (let frame = 0; frame < 14; frame++) {
    const bodyCell = Buffer.alloc(cellWidth*cellHeight*4);
    for (let y = 0; y < cellHeight; y++) {
      const start = ((row*cellHeight+y)*body.info.width+frame*cellWidth)*4;
      body.data.copy(bodyCell, y*cellWidth*4, start, start+cellWidth*4);
    }
    const clean = await footwearBuilder.clearFootwear(bodyCell, row, frame);
    assert.equal(clean.length, cellWidth*footStripHeight*4);
    // These antialiased source pixels form a floating arc over the right
    // toe when the narrower native shoe uncovers the old slipper edge.
    const stripPixel = (x: number, y: number) => ((y-cellHeight+footStripHeight)*cellWidth+x)*4;
    if (row === outfitIndex(null) && frame === 8) {
      for (const [x,y] of [[121,157],[123,158],[124,159]]) {
        assert.ok(bodyCell[(y*cellWidth+x)*4+3] > 100);
        assert.equal(clean[stripPixel(x,y)+3], 0, `floating slipper rim at (${x}, ${y})`);
      }
    }
    if (outfits[row] === "mikoOutfit" && (frame === 12 || frame === 13)) {
      // Both white sock tops and the scarlet hem sit above the zori straps.
      const hem = frame === 12 ? [52,171] : [55,155];
      for (const [x,y] of [[65,172],[79,172],hem]) {
        const i = stripPixel(x,y), original = (y*cellWidth+x)*4;
        assert.deepEqual(clean.subarray(i,i+4), bodyCell.subarray(original,original+4));
      }
    }
    let removed = 0;
    for (let y = 0; y < footStripHeight; y++) for (let x = 0; x < cellWidth; x++) {
      const mark = ((row*footStripHeight+y)*masks.info.width + frame*cellWidth+x)*masks.info.channels;
      const shoe = (masks.data[mark] || masks.data[mark+2]) && !masks.data[mark+1];
      const offset = (y*cellWidth+x)*4, original = (cellHeight-footStripHeight)*cellWidth*4+offset;
      if (shoe) {
        if (clean[offset+3] !== 0) assert.fail(`${outfits[row]} frame ${frame}: original shoe remains at (${x}, ${y})`);
        if (bodyCell[original+3] >= 128) removed++;
      } else if (clean[offset+3] !== bodyCell[original+3] || (clean[offset+3] &&
        [0,1,2].some(c => clean[offset+c] !== bodyCell[original+c]))) {
        assert.fail(`${outfits[row]} frame ${frame}: erasing the slipper changed its surroundings at (${x}, ${y})`);
      }
    }
    assert.ok(removed > 0, `${outfits[row]} frame ${frame} had no original leather cut out`);
  }
});

test("each of the five shoes has its own visible outline on every dressed pose", async () => {
  const [body, shoes] = await Promise.all([readAtlas("fufu-garments.webp"), readAtlas("fufu-footwear.webp")]);
  const frames = 14; // Twelve standing frames, sit on the ground, sit on the bench.
  assert.equal(shoes.info.width, cellWidth * frames);
  assert.equal(shoes.info.height, footStripHeight * footwearIds.length * outfits.length);
  for (let row = 0; row < outfits.length; row++) {
    const edges = Array.from({length:6}, () => ({vacated:false, added:false}));
    for (let frame = 0; frame < frames; frame++) {
      const outlines = new Set<string>();
      const edge = edges[frame < 12 ? Math.floor(frame/3) : frame-8];
      const bodyY = row * cellHeight + cellHeight - footStripHeight;
      const x0 = frame * cellWidth;
      for (const [kind, shoe] of footwearIds.entries()) {
        const label = `${outfits[row] ?? "base"} / ${shoe} frame ${frame}`;
        const shoeY = (row * footwearIds.length + kind) * footStripHeight;
        const outline = Buffer.alloc(cellWidth*footStripHeight);
        let changed = false, lowest = -1;
        for (let y = 0; y < footStripHeight; y++) {
          const garmentStart = ((bodyY + y) * body.info.width + x0) * 4;
          const shoeStart = ((shoeY + y) * shoes.info.width + x0) * 4;
          for (let x = 0; x < cellWidth; x++) {
            const a = x*4+3, original = body.data[garmentStart+a], worn = shoes.data[shoeStart+a];
            if (y < 6) assert.equal(worn, original, label + " changed the garment at the top of the foot strip");
            if (worn >= 128) {
              outline[y*cellWidth+x] = 1;
              lowest = y;
            }
            if ((original >= 128) !== (worn >= 128)) changed = true;
            if (original >= 192 && worn <= 63) edge.vacated = true;
            if (original <= 63 && worn >= 192) edge.added = true;
          }
        }
        assert.ok(changed, label + " recoloured the original silhouette");
        assert.ok(lowest >= footStripHeight-4, label + " lost its ground contact");
        outlines.add(outline.toString("base64"));
      }
      assert.equal(outlines.size, footwearIds.length, `${outfits[row]} frame ${frame}: shoes share a silhouette`);
    }
    // A long cuff can hide the entire upper of a lifted shoe for one frame.
    // Across each direction and each seat, check both sides of the old edge.
    for (const [view, edge] of edges.entries())
      assert.ok(edge.vacated && edge.added, `${outfits[row]} view ${view}: the stock shoe edge was only enlarged or trimmed`);
  }
});

test("the leg meets the shoe opening in four directions and both seated poses", async () => {
  const atlas = await readAtlas("fufu-footwear.webp");
  // Each three-pixel-wide sample follows the middle of an ankle, from
  // visible shin to visible upper. The witch's right shin in particular
  // used to have two completely transparent rows above her seated sneaker.
  const ankles = [
    [null, 1, 64, 163, 168],
    ["mintCape", 3, 60, 170, 175],
    [null, 6, 91, 167, 172],
    [null, 11, 64, 155, 160],
    ["witchDress", 12, 67, 165, 170],
    ["witchDress", 12, 81, 165, 170],
    ["witchDress", 13, 79, 167, 172],
  ] as const;
  for (const [clothes, frame, x, top, bottom] of ankles) {
    for (const [kind, shoe] of footwearIds.entries()) {
      const row = outfitIndex(clothes) * footwearIds.length + kind;
      for (let y = top; y <= bottom; y++) {
        const atlasY = row*footStripHeight + y - (cellHeight-footStripHeight);
        const pixel = (atlasY*atlas.info.width + frame*cellWidth+x)*4+3;
        const alpha = Math.max(atlas.data[pixel-4], atlas.data[pixel], atlas.data[pixel+4]);
        assert.ok(alpha >= 128, `${clothes ?? "base"} / ${shoe} frame ${frame}: background through ankle at (${x}, ${y})`);
      }
    }
  }
});

test("the far foot under a long hem and both seated tabi receive the selected leather", async () => {
  const shoes = await readAtlas("fufu-footwear.webp");
  const kind = footwearIds.indexOf("pennyLoafers");
  for (const [clothes, frame, x, y] of [
    ["apricotNightgown", 11, 61, 167], ["apricotNightgown", 11, 80, 175],
    ["mikoOutfit", 13, 65, 177], ["mikoOutfit", 13, 79, 178],
  ] as const) {
    const row = outfitIndex(clothes) * footwearIds.length + kind;
    const imageY = row * footStripHeight + y - (cellHeight - footStripHeight);
    const offset = (imageY * shoes.info.width + frame * cellWidth + x) * 4;
    const [r, g, b, a] = shoes.data.subarray(offset, offset + 4);
    assert.ok(a > 200 && r - g > 35 && r - b > 45, clothes + " should show brown leather at " + x + ", " + y);
  }
});

test("the seated witch's purple hem continues between her low sneakers", async () => {
  const [body, shoes] = await Promise.all([readAtlas("fufu-garments.webp"), readAtlas("fufu-footwear.webp")]);
  const outfit = outfitIndex("witchDress"), frame = 12, y = 175;
  const shoeRow = outfit * footwearIds.length + footwearIds.indexOf("mintSneakers");
  const shoeY = shoeRow*footStripHeight + y - (cellHeight-footStripHeight);
  const center = (shoeY*shoes.info.width + frame*cellWidth + 74)*4;
  assert.ok(shoes.data[center+3] > 220, "the garment is opaque between the two feet");
  assert.ok(shoes.data[center+2] > shoes.data[center] && shoes.data[center+2] > shoes.data[center+1]+10,
    "the dress shows through between the sneaker edges");
  // The undisturbed fabric bordering both feet is the same purple here.
  for (const x of [54, 94]) {
    const edge = ((outfit*cellHeight+y)*body.info.width + frame*cellWidth+x)*4;
    for (let c = 0; c < 3; c++)
      assert.ok(Math.abs(shoes.data[center+c] - body.data[edge+c]) < 30, "the newly exposed area follows the dress fabric");
  }
});

test("the raised side-view toe samples the painted upper and sole of each source design", async () => {
  const shoes = await readAtlas("fufu-footwear.webp");
  const frame = 8;
  const patch = (id: typeof footwearIds[number], cx: number, cy: number) => {
    const pixels = [];
    for (let y = cy-1; y <= cy+1; y++) for (let x = cx-1; x <= cx+1; x++) {
      const imageY = footwearIds.indexOf(id)*footStripHeight + y - (cellHeight-footStripHeight);
      const offset = (imageY*shoes.info.width + frame*cellWidth+x)*4;
      pixels.push(shoes.data.subarray(offset, offset+4));
    }
    return pixels;
  };
  // The raised toe points right. Its upper is yellow on the rain boot and
  // cream on the canvas sneaker; their outsole material is visible below.
  const boot = patch("honeyRainboots", 119, 162);
  const sneaker = patch("mintSneakers", 119, 162);
  const bootSole = patch("honeyRainboots", 118, 168);
  assert.ok(boot.filter(([r,g,b,a]) => a > 220 && r > 175 && g > 130 && g-b > 60).length >= 6, "yellow rubber toe");
  assert.ok(sneaker.filter(([r,g,b,a]) => a > 220 && Math.min(r,g,b) > 145).length >= 6, "cream canvas toe");
  assert.ok(bootSole.filter(([r,g,b,a]) => a > 200 && r < 150 && g < 105 && b < 110).length >= 6, "dark tread below the yellow toe");
});

test("front shoes admit the ankle behind the upper and show the tread on the advancing foot", async () => {
  const [body, shoes] = await Promise.all([readAtlas("fufu-garments.webp"), readAtlas("fufu-footwear.webp")]);
  const pixel = (outfit: typeof outfits[number], id: typeof footwearIds[number], frame: number, x: number, y: number) => {
    const row = outfitIndex(outfit) * footwearIds.length + footwearIds.indexOf(id);
    const sy = row*footStripHeight + y - (cellHeight-footStripHeight);
    const i = (sy*shoes.info.width + frame*cellWidth+x)*4;
    return shoes.data.subarray(i, i+4);
  };
  // Along the left shin, the illustrated back counter belongs behind the leg.
  for (const [id,y] of [["ribbonShoes",167],["starShoes",162],["mintSneakers",169],["pennyLoafers",169]] as const) {
    const worn = pixel(null,id,0,62,y), shin = (y*body.info.width+62)*4;
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(worn[c]-body.data[shin+c]) < 24, id+" covers the shin with the empty shoe opening");
  }
  const [red,green] = pixel(null,"honeyRainboots",0,62,163);
  assert.ok(green > red+8, "the boot's green pull tab remains visible");
  const rubberDepth = (outfit: typeof outfits[number], frame: number, x: number) => {
    let darkRows = 0;
    for (let y=169; y<cellHeight; y++) {
      const [r,g,b,a] = pixel(outfit,"honeyRainboots",frame,x,y);
      if (a>155 && r<170 && g<105 && b<110) darkRows++;
    }
    return darkRows;
  };
  const standing = rubberDepth(null,0,62), advancing = rubberDepth(null,1,62);
  assert.ok(advancing >= standing+3 && advancing >= rubberDepth(null,1,82)+3, "only the advancing toe presents its sole");
  assert.ok(rubberDepth("mikoOutfit",2,84) >= standing+3, "the hakama's second step presents the opposite sole");
});
