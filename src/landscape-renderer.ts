import type { GardenTree } from "./landscape";
import { drawTreeInBreeze } from "./scenery-wind";

export function drawGardenTree(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tree: GardenTree,
  wind = 0,
) {
  const { x, y, scale } = tree;
  c.save();
  c.fillStyle = "#4e715333";
  c.beginPath();
  c.ellipse(x, y + 24 * scale, 28 * scale, 8 * scale, 0, 0, Math.PI * 2);
  c.fill();
  c.filter = `hue-rotate(${tree.tone}deg)`;
  if (image.complete && image.naturalWidth) {
    c.translate(x - 36 * scale,y - 53 * scale);
    c.scale(scale,scale);
    drawTreeInBreeze(c,image,wind);
  }
  c.restore();
}
