import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { shoeLayers } from "../scripts/build-shoes.mjs";
import { figures, master, raster, readSheet, transparent } from "../scripts/wardrobe-sheets.mjs";
import { artScale, cellHeight, cellWidth, footStripHeight, footwearIds, outfitIndex } from "../src/costume-frames.ts";
import { spriteFrames } from "../src/sprite-frames.ts";

// Coordinates on the normalized garment artwork. On the back stride, the
// planted slipper continues past the column of the shorter, raised foot.
const apricotEdge = [[74,176],[75,176],[74,177],[75,177],[74,178],[75,178],
  [74,179],[75,179],[74,180],[75,180],[74,181],[75,181]] as const;
const roseEdge = [[74,177],[75,177],[74,178],[75,178],[74,179],[75,179],
  [74,180],[75,180],[74,181]] as const;
const samples = [
  {sheet:"apricot", outfit:"apricotNightgown", frame:10, slipper:apricotEdge, garment:[[62,152],[65,157]]},
  {sheet:"rose", outfit:"roseDress", frame:10, slipper:roseEdge, garment:[[65,152]]},
  // The same overlap is visible facing the camera on the opposite stride.
  {sheet:"base", outfit:null, frame:2, slipper:[[74,176],[74,177],[74,178],[74,179]], garment:[[60,155]]},
  // Antialiased pixels along an angled planted sole and a lifted far toe.
  {sheet:"base", outfit:null, frame:7, slipper:[[50,180],[52,181],[54,182],[55,182],[57,183],[58,183]], garment:[[58,151]]},
  {sheet:"mint", outfit:"mintCape", frame:5, slipper:[[25,171],[27,172]], garment:[[60,145]]},
] as const;

for (const sample of samples) {
  test(`${sample.sheet} stride ${sample.frame} replaces the exposed original slipper edge on every shoe`, async () => {
    const figure = figures(await readSheet(master(sample.sheet + "-walk")), 3, 4)[sample.frame];
    const scale = Math.min(spriteFrames[sample.frame].h * 43 / 330 * artScale / figure.height, (cellWidth-4) / figure.width);
    const width = Math.round(figure.width * scale), height = Math.round(figure.height * scale);
    const body = await raster(figure).resize(width, height, {fit:"fill"}).png().toBuffer();
    const original = await transparent(cellWidth, cellHeight).composite([{
      input:body, left:Math.round((cellWidth-width)/2), top:cellHeight-height,
    }]).raw().toBuffer();
    // A newly painted outline can legitimately match the old outline's brown.
    // Mark just the old slipper, keeping its alpha, to detect colour leaking
    // through without imposing a colour on the replacement artwork.
    const marked = Buffer.from(original);
    for (const [x,y] of sample.slipper) {
      const source = (y*cellWidth+x)*4;
      assert.ok(original[source+3] > 70, "the reference point must be part of the original sole");
      marked.set([0,255,180], source);
    }
    const row = outfitIndex(sample.outfit);
    const [layers, traced] = await Promise.all([shoeLayers(original, row, sample.frame), shoeLayers(marked, row, sample.frame)]);
    assert.equal(layers.length, footwearIds.length);
    const stripTop = cellHeight - footStripHeight;
    for (const [index, layer] of layers.entries()) {
      const [worn, markedWorn] = await Promise.all([layer, traced[index]].map(
        part => sharp(part.input).ensureAlpha().raw().toBuffer(),
      ));
      for (const [x,y] of sample.slipper) {
        const dest = ((y-stripTop)*cellWidth+x)*4;
        assert.deepEqual(worn.subarray(dest, dest+4), markedWorn.subarray(dest, dest+4),
          `${footwearIds[index]} kept the original slipper colour at (${x}, ${y})`);
      }
      for (const [x,y] of sample.garment) {
        const source = (y*cellWidth+x)*4, dest = ((y-stripTop)*cellWidth+x)*4;
        assert.deepEqual(worn.subarray(dest, dest+4), original.subarray(source, source+4),
          `${footwearIds[index]} covered the garment above the ankle at (${x}, ${y})`);
      }
    }
  });
}
