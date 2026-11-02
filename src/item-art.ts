import type { ItemId } from "./items";
import { fitItem, type EquipmentPart } from "./equipment";
import wreathUrl from "./assets/flower-wreath.webp";
import rewardsUrl from "./assets/reward-icons.webp";
import wardrobeUrl from "./assets/wardrobe-v11.webp";
export { wreathUrl, rewardsUrl };
const wardrobe = new Image();
wardrobe.src = wardrobeUrl;
export function whenWardrobeReady(callback: () => void) {
  if (wardrobe.complete && wardrobe.naturalWidth) callback();
  else wardrobe.addEventListener("load", callback, { once: true });
}
export const wardrobeFrames = [
  [17, 67, 409, 378],
  [439, 105, 455, 317],
  [908, 96, 412, 357],
  [1360, 88, 399, 366],
  [35, 477, 405, 369],
  [486, 492, 383, 345],
  [945, 466, 391, 386],
  [1360, 467, 384, 384],
];
const wardrobeIndex: Partial<Record<ItemId, number>> = {
  roseDress: 0,
  mintCape: 1,
  ribbonShoes: 2,
  starShoes: 3,
  berryBag: 4,
  petBunny: 5,
  petCat: 6,
  rabbitSatchel: 7,
};
export const rewardFrames = [
  { x: 75, y: 122, w: 493, h: 416 },
  { x: 663, y: 57, w: 546, h: 555 },
  { x: 45, y: 583, w: 598, h: 604 },
  { x: 646, y: 707, w: 585, h: 411 },
];
// Worn bags show the pouch itself. The long loose carrying handles belong
// to the inventory illustration; straps on the avatar follow the garment.
const wornBags = {
  moonBag: [79, 715, 548, 417],
  berryBag: [75, 569, 339, 272],
  rabbitSatchel: [1390, 580, 342, 255],
} as const;
export function drawWornBag(c: CanvasRenderingContext2D, part: EquipmentPart, profile: boolean, rewards: HTMLImageElement) {
  const id = part.id;
  if (id !== "moonBag" && id !== "berryBag" && id !== "rabbitSatchel") return;
  const sheet = id === "moonBag" ? rewards : wardrobe;
  if (!sheet.complete || !sheet.naturalWidth) return;
  const [x, y, w, h] = wornBags[id], inset = profile ? w * .20 : 0;
  c.translate(part.mirror ? part.x + part.w : part.x, part.y);
  if (part.mirror) c.scale(-1,1);
  // The top handle is behind the hair when worn; turn the visible pouch
  // back under it with rounded shoulders instead of exposing a hard crop.
  c.beginPath(); c.roundRect(0,0,part.w,part.h,[part.w*.32,part.w*.32,part.w*.20,part.w*.20]); c.clip();
  c.drawImage(sheet, x+inset, y, w-inset, h, 0, 0, part.w, part.h);
}
export function drawItem(
  c: CanvasRenderingContext2D,
  id: ItemId,
  x: number,
  y: number,
  w: number,
  h: number,
  wreath?: HTMLImageElement,
  rewards?: HTMLImageElement,
) {
  const extra = wardrobeIndex[id];
  if (extra !== undefined) {
    if (wardrobe.complete && wardrobe.naturalWidth) {
      const [sx, sy, sw, sh] = wardrobeFrames[extra];
      const b = fitItem(sw, sh, x, y, w, h);
      c.drawImage(wardrobe, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
    }
    return;
  }
  if (id === "anniversaryPin") {
    c.fillStyle = "#b67b39";
    c.fillRect(x + w * 0.25, y + h * 0.18, w * 0.5, h * 0.65);
    c.fillStyle = "#f6d67c";
    c.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.55);
    c.fillStyle = "#d87c98";
    c.fillRect(x + w * 0.4, y + h * 0.32, w * 0.2, h * 0.25);
    return;
  }
  if (id === "wreath") {
    if (wreath?.complete && wreath.naturalWidth) {
      const b = fitItem(239, 76, x, y, w, h);
      c.drawImage(wreath, 10, 13, 239, 76, b.x, b.y, b.w, b.h);
    }
    return;
  }
  const index = (
    { candyClip: 0, headphones: 1, moonBag: 2, starWings: 3 } as Partial<
      Record<ItemId, number>
    >
  )[id];
  if (index === undefined) return;
  const f = rewardFrames[index];
  if (rewards?.complete && rewards.naturalWidth) {
    const b = fitItem(f.w, f.h, x, y, w, h);
    c.drawImage(rewards, f.x, f.y, f.w, f.h, b.x, b.y, b.w, b.h);
  }
}
