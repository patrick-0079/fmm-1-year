import { avatarUrls, drawAvatar } from "../src/avatar";
import { prepareCampCostumes, type CampAvatarPose } from "../src/camp-costumes";
import { campEncounterIds } from "../src/camp-encounters";
import { campEncounterExpression, campEncounterHead, campExpressionDrawings, campHeadOffsets, type CampHeadPose } from "../src/camp-expression-cels";
import { footwearIds, outfits } from "../src/costume-frames";
import type { Equipped, ItemId } from "../src/items";
import { loadSceneImage } from "../src/texture-cache";

const width = 224, height = 216;
// The native wardrobe cell starts 40 px from the canvas's left and 32 px from its top.
const index = (x: number, y: number) => (y + 32) * width + x + 40;
const chinY = [116, 118, 119, 117, 118, 118, 115, 118, 116];

function checkExpression(reference: Uint32Array, actual: Uint32Array, expression: number, label: string) {
  const drawing = campExpressionDrawings[expression];
  const paintsLips = ["closing", "bite", "taste", "softSmile"].includes(drawing);
  let changed = 0;
  for (let i = 0; i < actual.length; i++) {
    if (reference[i] === actual[i]) continue;
    const x = i % width - 40, y = Math.floor(i / width) - 32;
    const eye = y >= 89 && y <= 112 && ((x >= 47 && x <= 69) || (x >= 77 && x <= 100));
    const mouth = paintsLips && x >= 66 && x <= 80 && y >= 105 && y <= 116;
    if (!eye && !mouth) throw Error(`${label} changes the seated drawing at (${x}, ${y})`);
    changed++;
  }
  if (expression === -1 && changed) throw Error(label + " changes the neutral face");
  if (expression >= 0 && !changed) throw Error(label + " does not draw the requested expression");
}

function checkHead(reference: Uint32Array, actual: Uint32Array, head: CampHeadPose, row: number, label: string, headwear = false) {
  const [dx, dy] = campHeadOffsets[head];
  const originalRGBA = new Uint8Array(reference.buffer), posedRGBA = new Uint8Array(actual.buffer);
  // Eyes, bangs, nose and lips move together. At the centre follow the original
  // chin line down to the neck; above the eyes include the whole hat and wreath.
  for (let y = -28; y <= chinY[row]; y++) {
    const [left, right] = y < 89 ? [-33, 177] : y <= 106 ? [48, 97] : y <= 111 ? [60, 86] : [70, 76];
    for (let x = left; x <= right; x++) {
      const a = index(x, y), b = index(x + dx, y + dy);
      if (reference[a] === actual[b]) continue;
      if (headwear) {
        // Canvas resamples fractional-size accessories. Allow one coverage step
        // at an antialiased edge, while comparing the visible premultiplied colour.
        const alpha = originalRGBA[4*a+3], beta = posedRGBA[4*b+3];
        const tolerance = y < 89 || (x >= 85 && y <= 100) ? 16 : 2;
        if (Math.abs(alpha - beta) <= tolerance && [0, 1, 2].every(k =>
          Math.abs(originalRGBA[4*a+k] * alpha - posedRGBA[4*b+k] * beta) <= tolerance * 255)) continue;
      }
      throw Error(`${label} misaligns the head or headwear at (${x}, ${y})`);
    }
  }
  // The original hands, sleeve ends, skirt, knees and shoes keep their seat.
  for (let i = index(-40, 132); i < actual.length; i++)
    if (reference[i] !== actual[i]) throw Error(`${label} shifts the lower costume at pixel ${i}`);
}

export async function verifyCampCostumes() {
  await Promise.all([prepareCampCostumes(), ...avatarUrls.map(url => loadSceneImage(url))]);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d", {willReadFrequently: true})!;
  c.setTransform(4, 0, 0, 4, 112, 216);
  const render = (equipped: Equipped, pose?: CampAvatarPose) => {
    c.clearRect(-28, -54, 56, 54);
    drawAvatar(c, "sitting", 0, 0, equipped, pose);
    return new Uint32Array(c.getImageData(0, 0, width, height).data.buffer);
  };
  const bags: ItemId[] = ["moonBag", "berryBag", "rabbitSatchel", "letterPack", "bearPack", "compassPack"];
  let count = 0;
  for (const [row, clothes] of outfits.entries()) {
    const bare = render({clothes});
    if (!bare.some(Boolean)) throw Error("Missing seated costume " + clothes);
    const equipment: Equipped[] = Array.from({length: 16}, (_, frame) => ({
      clothes, shoes: footwearIds[frame % footwearIds.length], backpack: bags[frame % bags.length],
      body: "anniversaryPin", head: "witchHat", wreath: "wreath", hair: "heartClip",
    }));
    const dressed = equipment.map(items => render(items));
    for (const [expression, name] of campExpressionDrawings.entries())
      checkExpression(bare, render({clothes}, {expression}), expression, [clothes ?? "base", name].join("/"));
    for (const head of Object.keys(campHeadOffsets) as CampHeadPose[]) {
      const label = [clothes ?? "base", head].join("/");
      checkHead(bare, render({clothes}, {head, expression: -1}), head, row, label);
      checkHead(dressed[0], render(equipment[0], {head, expression: -1}), head, row, label + "/equipped", true);
    }
    for (const id of campEncounterIds) {
      for (let frame = 0; frame < 16; frame++) {
        const phase = frame < 4 ? "arrival" : frame < 8 ? "passive" : "active";
        const first = frame < 4 ? 0 : frame < 8 ? 4 : 8;
        const elapsed = (frame - first + .5) * (phase === "passive" ? .5 : .4);
        const expression = campEncounterExpression({id, phase, elapsed}, frame, false);
        const head = campEncounterHead(id, frame), label = [clothes ?? "base", id, frame].join("/");
        for (const [items, reference] of [[{clothes}, bare], [equipment[frame], dressed[frame]]] as const) {
          const face = render(items, {expression});
          checkExpression(reference, face, expression, label);
          checkHead(face, render(items, {expression, head}), head, row, label, reference !== bare);
        }
        count++;
      }
    }
  }
  return count;
}
