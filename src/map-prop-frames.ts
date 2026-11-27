// Map-scale illustrations. Each frame includes the transparent margins of the
// original sprite, so its feet and any interaction geometry stay aligned.
const frames = {
  groundStar: [2, 2, 87, 58],
  vine: [150, 2, 144, 54],
  starJar: [298, 2, 51, 51],
  cake: [2, 150, 48, 43],
  bouquet: [150, 150, 48, 56],
  daisies: [298, 150, 144, 144],
} as const;

export function drawMapProp(c: CanvasRenderingContext2D, image: HTMLImageElement,
  prop: keyof typeof frames, x: number, y: number, width: number, height: number) {
  if (!image.naturalWidth) return;
  const [sx, sy, sw, sh] = frames[prop];
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  c.restore();
}
