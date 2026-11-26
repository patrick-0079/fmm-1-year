import { drawItem } from "./item-art";
import { sceneArt } from "./scene-art";
import type { RingId } from "./astrolabe";

const cells = {vine:0, star:1, brass:2, brooch:3} as const;
const mapCells = {vine:0, star:1, brass:2, book:3, mirror:4, brick:5} as const;
export function drawAstrolabeMapProp(c: CanvasRenderingContext2D, id: keyof typeof mapCells, x: number, y: number, size: number) {
  const sheet = sceneArt.astrolabeMap;
  if (!sheet.naturalWidth) return;
  const cell = sheet.naturalWidth / 3, index = mapCells[id];
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(sheet, index % 3 * cell, Math.floor(index / 3) * cell, cell, cell, x, y, size, size);
  c.restore();
}
export function drawRelic(c: CanvasRenderingContext2D, id: RingId | "brooch", x: number, y: number, w: number, h = w) {
  const sheet=sceneArt.relics;
  if (id === "brooch") return drawItem(c,"echoBrooch",x,y,w,h);
  if (w === h && w <= 24) return drawAstrolabeMapProp(c,id,x,y,w);
  if (!sheet.naturalWidth) return;
  const tile=sheet.naturalWidth/2, index=cells[id];
  c.drawImage(sheet,(index%2)*tile,Math.floor(index/2)*tile,tile,tile,x,y,w,h);
}
