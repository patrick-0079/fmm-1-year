// A faceted, four-point pixel star. Canvas and the bottle use the same pixels,
// so collecting the star changes neither its silhouette nor its warm colours.
const width = 19;
const spans = [1, 1, 3, 3, 3, 5, 5, 7, 13, 19, 13, 7, 5, 5, 3, 3, 3, 1, 1];
const colors = ["#b98a58", "#e6b96b", "#ffdc8a", "#fff0b8", "#fffbe5"];
const pixels: { x: number; y: number; color: string }[] = [];
for (const [y, span] of spans.entries()) {
  const left = (width - span) / 2;
  for (let x = left; x < left + span; x++) {
    const distance = Math.abs(x - 9) + Math.abs(y - 9);
    const rim = x === left || x === left + span - 1;
    const shade = distance <= 2 ? 4 : distance <= 4 ? 3 : rim ? (x <= 9 && y <= 9 ? 2 : 0) : 2;
    pixels.push({ x, y, color: colors[shade] });
  }
}

export const crossStarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}" width="${width}" height="${width}" shape-rendering="crispEdges">${pixels.map(p => `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${p.color}"/>`).join("")}</svg>`;
export const crossStarUrl = `data:image/svg+xml,${encodeURIComponent(crossStarSvg)}`;

export function drawCrossStar(c: CanvasRenderingContext2D, x: number, footY: number, size: number) {
  c.save();
  c.translate(Math.round(x - size / 2), Math.round(footY - size));
  c.scale(size / width, size / width);
  for (const p of pixels) {
    c.fillStyle = p.color;
    c.fillRect(p.x, p.y, 1, 1);
  }
  c.restore();
}
