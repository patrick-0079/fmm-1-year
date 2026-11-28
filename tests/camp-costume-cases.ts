import { avatarUrls, drawAvatar } from "../src/avatar";
import { prepareCampCostumes, type CampAvatarPose } from "../src/camp-costumes";
import { campEncounterIds } from "../src/camp-encounters";
import { footwearIds, outfits } from "../src/costume-frames";
import type { Equipped, ItemId } from "../src/items";
import { loadSceneImage } from "../src/texture-cache";

export async function verifyCampCostumes() {
  await Promise.all([prepareCampCostumes(), ...avatarUrls.map(url => loadSceneImage(url))]);
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 216;
  const c = canvas.getContext("2d", {willReadFrequently: true})!;
  c.setTransform(4, 0, 0, 4, 112, 216);
  const render = (equipped: Equipped, pose?: CampAvatarPose) => {
    c.clearRect(-28, -54, 56, 54);
    drawAvatar(c, "sitting", 0, 0, equipped, pose);
    return new Uint32Array(c.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
  };
  const bags: ItemId[] = ["moonBag", "berryBag", "rabbitSatchel", "letterPack", "bearPack", "compassPack"];
  let count = 0;
  for (const clothes of outfits) {
    const bare = render({clothes});
    if (!bare.some(Boolean)) throw Error("Missing seated costume " + clothes);
    const equipment: Equipped[] = Array.from({length: 16}, (_, frame) => ({
      clothes, shoes: footwearIds[frame % footwearIds.length], backpack: bags[frame % bags.length],
      body: "anniversaryPin", head: "witchHat", wreath: "wreath", hair: "heartClip",
    }));
    const dressed = equipment.map(items => render(items));
    for (const id of campEncounterIds) {
      for (let frame = 0; frame < 16; frame++) {
        const pose = {id, frame}, label = [clothes ?? "base", id, frame].join("/");
        const bite = id === "marshmallow" && frame >= 11 && frame <= 13;
        for (const [items, reference] of [[{clothes}, bare], [equipment[frame], dressed[frame]]] as const) {
          const actual = render(items, pose);
          let changed = 0;
          for (let i = 0; i < actual.length; i++) {
            if (reference[i] === actual[i]) continue;
            // Artwork coordinates. The canvas has a 40 px left and 32 px top margin.
            const x = i % canvas.width - 40, y = Math.floor(i / canvas.width) - 32;
            const eye = y >= 89 && y <= 112 && ((x >= 47 && x <= 69) || (x >= 77 && x <= 100));
            const mouth = bite && x >= 66 && x <= 80 && y >= 105 && y <= 116;
            if (!eye && !mouth) throw Error(`${label} shifts the seated drawing at (${x}, ${y})`);
            changed++;
          }
          if (frame === 0 && changed) throw Error(label + " changes the face on entry");
          if (bite && !changed) throw Error(label + " does not render the tasting expression");
        }
        count++;
      }
    }
  }
  return count;
}
