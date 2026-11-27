import type { Rect } from "./core";
import type { DepthLayer } from "./world";

type Frame = readonly [number, number, number, number, number, number];
export type LayerOutline = Path2D | { image: HTMLImageElement; frame: Frame; scale: number };
const colors = ["#71fbff", "#ff77ba", "#bfff65", "#ffab57", "#a097ff", "#fff16b", "#56ffc4", "#ff86ff", "#77baff", "#ff846d", "#e1ffac"];

// Trace alpha transitions, including inner holes. Semi-transparent glass and
// fine threads are part of the silhouette even when they transmit the actor.
function alphaPath({ data, width, height }: ImageData, x: number, y: number, pixel: number) {
  const path = new Path2D(), stride = width * 4;
  const line = (ax: number, ay: number, bx: number, by: number) => {
    path.moveTo(x + ax * pixel, y + ay * pixel);
    path.lineTo(x + bx * pixel, y + by * pixel);
  };
  for (let row = 0; row < height; row++) {
    for (let col = 0, i = row * stride + 3; col < width; col++, i += 4) {
      if (data[i] < 24) continue;
      if (!row || data[i - stride] < 24) line(col, row, col + 1, row);
      if (row + 1 === height || data[i + stride] < 24) line(col, row + 1, col + 1, row + 1);
      if (!col || data[i - 4] < 24) line(col, row, col, row + 1);
      if (col + 1 === width || data[i + 4] < 24) line(col + 1, row, col + 1, row + 1);
    }
  }
  return path;
}

export class LayerOutlines {
  private probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  private sprites = new WeakMap<Frame, Path2D>();
  private moving: { path: Path2D; color: string }[] = [];
  private sampledScene = "";
  private sampledAt = -Infinity;

  private context(width: number, height: number) {
    const c = this.probe;
    if (c.canvas.width < width) c.canvas.width = width;
    if (c.canvas.height < height) c.canvas.height = height;
    c.resetTransform();
    c.clearRect(0, 0, width, height);
    return c;
  }

  private outline(source: LayerOutline) {
    if (source instanceof Path2D) return source;
    const { image, frame, scale } = source;
    let path = this.sprites.get(frame);
    if (!path) {
      const [sx, sy, w, h, x, y] = frame, c = this.context(w, h);
      c.drawImage(image, sx, sy, w, h, 0, 0, w, h);
      path = alphaPath(c.getImageData(0, 0, w, h), x, y, 1 / scale);
      this.sprites.set(frame, path);
    }
    return path;
  }

  private capture(draw: DepthLayer["draw"], area: Rect, scale: number) {
    const w = Math.ceil(area.w * scale), h = Math.ceil(area.h * scale), c = this.context(w, h);
    c.save();
    c.setTransform(scale, 0, 0, scale, -area.x * scale, -area.y * scale);
    draw(c);
    c.restore();
    return alphaPath(c.getImageData(0, 0, w, h), area.x, area.y, 1 / scale);
  }

  draw(c: CanvasRenderingContext2D, scene: string, view: Rect, layers: DepthLayer[], actor: DepthLayer, actorArea: Rect) {
    const zoom = 600 / view.w, now = performance.now();
    const sample = scene !== this.sampledScene || now - this.sampledAt >= 100;
    if (sample) {
      this.sampledScene = scene;
      this.sampledAt = now;
      this.moving = [];
    }
    c.save();
    c.lineCap = "round";
    const stroke = (path: Path2D, color: string) => {
      c.lineWidth = 1.9 / zoom; c.strokeStyle = "#27303abf"; c.stroke(path);
      c.lineWidth = .95 / zoom; c.strokeStyle = color; c.stroke(path);
    };
    for (const [i, layer] of layers.entries()) {
      const color = colors[i % colors.length];
      if (layer.outline) stroke(this.outline(layer.outline), color);
      else if (sample) this.moving.push({ path: this.capture(layer.draw, view, zoom), color });
    }
    for (const { path, color } of this.moving) stroke(path, color);
    stroke(this.capture(actor.draw, actorArea, 1.5), "#ffffff");
    c.restore();
  }
}
