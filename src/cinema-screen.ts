import { gardenScreen, gardenScreenCorners } from "./cinema-config";

type Point = { x: number; y: number };
function path(c: CanvasRenderingContext2D, points: Point[]) {
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) c.lineTo(p.x, p.y);
  c.closePath();
}

/** Two affine halves follow the slight perspective of the original screen. */
export function drawGardenScreen(
  c: CanvasRenderingContext2D,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const [tl, tr, br, bl] = gardenScreenCorners;
  const { w, h } = gardenScreen;
  c.save();
  path(c, gardenScreenCorners);
  c.clip(); // The outer clip protects the bezel, including the overlap below.
  for (const [triangle, matrix] of [
    [
      [tl, tr, br],
      [
        (tr.x - tl.x) / w,
        (tr.y - tl.y) / w,
        (br.x - tr.x) / h,
        (br.y - tr.y) / h,
        tl.x,
        tl.y,
      ],
    ],
    [
      [tl, br, bl],
      [
        (br.x - bl.x) / w,
        (br.y - bl.y) / w,
        (bl.x - tl.x) / h,
        (bl.y - tl.y) / h,
        tl.x,
        tl.y,
      ],
    ],
  ] as [Point[], number[]][]) {
    c.save();
    // A tiny overlap avoids an antialiased hairline along the internal diagonal.
    const center = triangle.reduce(
      (p, q) => ({ x: p.x + q.x / 3, y: p.y + q.y / 3 }),
      { x: 0, y: 0 },
    );
    path(
      c,
      triangle.map((p) => {
        const dx = p.x - center.x,
          dy = p.y - center.y;
        const scale = 1 + 0.3 / Math.hypot(dx, dy);
        return { x: center.x + dx * scale, y: center.y + dy * scale };
      }),
    );
    c.clip();
    c.transform(
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
    );
    draw(c);
    c.restore();
  }
  c.restore();
}
