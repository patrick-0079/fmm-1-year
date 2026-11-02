import meadowAtlasUrl from "./assets/meadow-life-v16.webp";
import orchardAtlasUrl from "./assets/orchard-v16.webp";
export { meadowAtlasUrl, orchardAtlasUrl };

// Sprites retain their aspect ratio inside square cells and share a foot anchor.
export function drawWildSprite(c: CanvasRenderingContext2D, atlas: HTMLImageElement | undefined,
  index: number, x: number, footY: number, size: number, faceLeft = false) {
  if (!atlas?.naturalWidth) return;
  const cell = atlas.naturalWidth / 2;
  c.save();
  c.translate(Math.round(x), Math.round(footY));
  if (faceLeft) c.scale(-1, 1);
  c.drawImage(atlas, (index % 2) * cell, Math.floor(index / 2) * cell, cell, cell,
    -size / 2, -size, size, size);
  c.restore();
}
