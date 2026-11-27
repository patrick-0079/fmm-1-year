import { avatarUrls, drawAvatar } from "../src/avatar";
import { campCostume, prepareCampCostumes } from "../src/camp-costumes";
import { campEncounterIds } from "../src/camp-encounters";
import { footwearIds, outfits } from "../src/costume-frames";
import type { ItemId } from "../src/items";
import { loadSceneImage } from "../src/texture-cache";

// Measure the finished sprite at the artwork's own resolution, including the
// replacement shoes, the original shoulder straps and the new foreground hands.
export async function verifyCampCostumes() {
  await Promise.all([prepareCampCostumes(), ...avatarUrls.map(url => loadSceneImage(url))]);
  const canvas = document.createElement("canvas");
  canvas.width = 224; canvas.height = 216;
  const c = canvas.getContext("2d", {willReadFrequently: true})!;
  c.setTransform(4, 0, 0, 4, 112, 216);
  const clear = () => c.clearRect(-28, -54, 56, 54);
  const crop = () => c.getImageData(87, 190, 52, 26).data;
  const bags: ItemId[] = ["moonBag", "berryBag", "rabbitSatchel", "letterPack", "bearPack", "compassPack"];
  let count = 0;
  for (const [row, clothes] of outfits.entries()) {
    const feet = footwearIds.map(shoes => {
      clear();
      drawAvatar(c, "sitting", 0, 0, {clothes, shoes});
      return crop();
    });
    for (const id of campEncounterIds) {
      const drawings = new Set<string>();
      for (let frame = 0; frame < 16; frame++) {
        const pose = {id, frame}, label = [clothes ?? "base", id, frame].join("/");
        const art = campCostume(pose, row);
        if (!art) throw Error("Missing pose " + label);
        clear();
        drawAvatar(c, "sitting", 0, 0, {clothes}, pose);
        const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
        drawings.add(new Uint8Array(await crypto.subtle.digest("SHA-256", pixels)).join(","));
        clear();
        art.drawSleeves(c);
        const sleeves = c.getImageData(40, 128, 144, 72).data;
        const shoe = frame % footwearIds.length;
        clear();
        drawAvatar(c, "sitting", 0, 0, {clothes, shoes: footwearIds[shoe]}, pose);
        const shoed = crop();
        for (let i = 0; i < shoed.length; i += 4) {
          const x = 47+(i/4)%52, y = 62+Math.floor(i/4/52);
          // The hem of a lowered kimono sleeve can sit in front of the shoe.
          if (y < 72 && sleeves[4*(y*144+x)+3]) continue;
          for (let channel = i; channel < i+4; channel++)
            if (Math.abs(shoed[channel]-feet[shoe][channel]) > 1) throw Error("Seated footwear shifted in " + label);
        }
        clear();
        drawAvatar(c, "sitting", 0, 0, {
          clothes, shoes: footwearIds[shoe], backpack: bags[frame % bags.length], body: "anniversaryPin",
          head: "witchHat", wreath: "wreath", hair: "heartClip",
        }, pose);
        const dressed = c.getImageData(40, 128, 144, 72).data;
        let opaqueSleevePixels = 0;
        for (let i = 3; i < sleeves.length; i += 4) {
          // The original seated painting uses 253–254 alpha even inside a cuff.
          const transparency = 255-sleeves[i];
          if (transparency > 3) continue;
          opaqueSleevePixels++;
          for (let channel = i-3; channel < i; channel++)
            if (Math.abs(sleeves[channel]-dressed[channel]) > transparency+2) throw Error("Accessory over the hand or sleeve in " + label);
        }
        if (!opaqueSleevePixels) throw Error("Empty foreground in " + label);
        count++;
      }
      if (drawings.size !== 16) throw Error(`Repeated character drawing in ${clothes ?? "base"}/${id}: ${drawings.size} distinct frames`);
    }
  }
  return count;
}
