import { drawItem } from "./item-art";
import { sceneArt } from "./scene-art";
import type { RingId } from "./astrolabe";

const cells = {vine:0, star:1, brass:2, brooch:3} as const;
export function drawRelic(c: CanvasRenderingContext2D, id: RingId | "brooch", x: number, y: number, w: number, h = w) {
  const sheet=sceneArt.relics;
  if (id === "brooch") return drawItem(c,"echoBrooch",x,y,w,h);
  if (!sheet.naturalWidth) return;
  const tile=sheet.naturalWidth/2, index=cells[id];
  c.drawImage(sheet,(index%2)*tile,Math.floor(index/2)*tile,tile,tile,x,y,w,h);
}
