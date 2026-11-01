import type { Point } from "./core";
import type { Creek, GardenTree } from "./landscape";
function path(c: CanvasRenderingContext2D, points: Point[]) {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
}
export function drawCreek(
  c: CanvasRenderingContext2D,
  creek: Creek,
  t: number,
) {
  c.save();
  c.lineJoin = "round";
  for (const points of [creek.upper, creek.lower]) {
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    path(c, points);
    c.strokeStyle = "#648c68";
    c.lineWidth = 13;
    c.stroke();
    c.strokeStyle = "#acbd82";
    c.lineWidth = 8;
    c.stroke();
    const gradient = c.createLinearGradient(minX, 0, maxX, 0);
    gradient.addColorStop(0, "#66b9bb");
    gradient.addColorStop(0.5, "#6ac7d0");
    gradient.addColorStop(1, "#499fae");
    c.fillStyle = gradient;
    c.fill();
    c.strokeStyle = "#3c94a4";
    c.lineWidth = 1.5;
    c.stroke();
    c.save();
    c.clip();
    for (let i = 0; i < 85; i++) {
      const x = minX + ((i * 37) % (maxX - minX)),
        y = minY + ((i * 53 + t * 8) % (maxY - minY));
      c.fillStyle =
        i % 3 === 0 ? "#d9f4dfaa" : i % 3 === 1 ? "#8fdfde88" : "#378fae66";
      c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 3 + (i % 4), 1);
      if (i % 7 === 0)
        c.fillRect(Math.round(x / 2) * 2 + 2, Math.round(y / 2) * 2 + 3, 2, 1);
    }
    c.restore();
    for (let i = 0; i < points.length; i += 2) {
      const p = points[i];
      c.fillStyle = "#83a16e";
      c.fillRect(p.x - 5, p.y - 2, 4, 3);
      c.fillStyle = "#d8dfb4";
      c.fillRect(p.x - 3, p.y - 5, 2, 4);
      if (i % 4 === 0) {
        c.fillStyle = "#edb1c2";
        c.fillRect(p.x - 8, p.y - 4, 3, 3);
        c.fillStyle = "#fff1ba";
        c.fillRect(p.x - 7, p.y - 3, 1, 1);
      }
    }
  }
  const b = creek.bridge;
  c.fillStyle = "#4d6e684d";
  c.fillRect(b.x + 2, b.y + 6, b.w, b.h);
  c.fillStyle = "#775d56";
  c.fillRect(b.x, b.y, b.w, b.h);
  for (let y = 2; y < b.h - 1; y += 5) {
    c.fillStyle = y % 2 ? "#d2b084" : "#bb946e";
    c.fillRect(b.x + 2, b.y + y, b.w - 4, 4);
    c.fillStyle = "#e8c79c";
    c.fillRect(b.x + 4, b.y + y, b.w - 8, 1);
  }
  for (const x of [b.x + 3, b.x + b.w - 7]) {
    c.fillStyle = "#7c645c";
    c.fillRect(x, b.y - 4, 5, b.h + 6);
    c.fillStyle = "#d0ac83";
    c.fillRect(x + 1, b.y - 4, 3, b.h + 3);
    c.fillStyle = "#f0d1a0";
    c.fillRect(x, b.y - 5, 5, 3);
    c.fillRect(x, b.y + b.h - 1, 5, 3);
  }
  c.restore();
}
export function drawGardenTree(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tree: GardenTree,
) {
  const { x, y, scale } = tree;
  c.save();
  c.fillStyle = "#4e715333";
  c.beginPath();
  c.ellipse(x, y + 24 * scale, 28 * scale, 8 * scale, 0, 0, Math.PI * 2);
  c.fill();
  c.filter = `hue-rotate(${tree.tone}deg)`;
  if (image.complete && image.naturalWidth)
    c.drawImage(image, x - 36 * scale, y - 53 * scale, 72 * scale, 80 * scale);
  c.restore();
}
