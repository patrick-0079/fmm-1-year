import flowerUrl from "./assets/courage-tall-flowers.webp";
import { courageFlowerbeds } from "./courage-flowerbeds";
import type { DepthLayer } from "./world";

export { flowerUrl as courageFlowerUrl };
const columns = { bells: 0, daisies: 1, cosmos: 2 } as const;
const sheets = new WeakMap<HTMLImageElement, DepthLayer[]>();

export function courageFlowerLayers(image: HTMLImageElement | undefined): DepthLayer[] {
  if (!image) return [];
  const cached = sheets.get(image);
  if (cached) return cached;
  const layers = courageFlowerbeds.map(bed => ({
    y: bed.y,
    draw(c: CanvasRenderingContext2D) {
      const scale = bed.height / 176;
      c.save();
      c.translate(bed.x, bed.y);
      c.fillStyle = "#344f342e";
      c.beginPath();
      c.ellipse(0, -.5, bed.height * .30, bed.height * .066, 0, 0, Math.PI * 2);
      c.fill();
      if (bed.turned) c.scale(-1, 1);
      c.imageSmoothingEnabled = true;
      c.drawImage(image, columns[bed.flower] * 192, 0, 192, 192, -96 * scale, -184 * scale, 192 * scale, 192 * scale);
      c.restore();
    },
  }));
  sheets.set(image, layers);
  return layers;
}
