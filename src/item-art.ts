import type { ItemId } from "./items";
import { fitItem } from "./equipment";
import wardrobeUrl from "./assets/wardrobe-icons.webp";
import frames from "./wardrobe-icons.json";
import { sceneImage } from "./texture-cache";

export { wardrobeUrl };
const wardrobe = sceneImage(wardrobeUrl);
export function whenWardrobeReady(callback: () => void) {
  if (wardrobe.naturalWidth) callback();
  else wardrobe.addEventListener("load", callback, {once:true});
}

export function drawItem(c: CanvasRenderingContext2D, id: ItemId | "rabbitPouch" | "witchHatProfile" | "witchHatBack",
  x: number, y: number, w: number, h: number, fitted = true) {
  if (!wardrobe.naturalWidth) return;
  const [sx,sy,sw,sh] = frames[id];
  const b = fitted ? fitItem(sw,sh,x,y,w,h) : {x,y,w,h};
  c.drawImage(wardrobe,sx,sy,sw,sh,b.x,b.y,b.w,b.h);
}
