import waterMaskUrl from "./assets/town-pond-water.webp?no-inline";
import { pondArtBounds, pondFishAt } from "./town-pond-motion.ts";
import type { Rect } from "./core";

type Brush = CanvasRenderingContext2D;
const palettes = [
  { edge:"#2e5758", back:"#77785d", gold:"#a5aa7c", belly:"#a9bc9d", fin:"#7d9a81" },
  { edge:"#7f6553", back:"#d98b52", gold:"#f0ac68", belly:"#e2bf91", fin:"#cc9e76" },
] as const;

function fish(c: Brush, index: 0 | 1, time: number) {
  const {x,y,angle} = pondFishAt(index, time), colors = palettes[index];
  const tail = Math.sin(time * (index ? 5.7 : 4.6) + index) * 2.2;
  const fin = .45 * Math.sin(time * 3.2 + index);
  c.save();
  c.translate(x, y); c.rotate(angle); c.scale(index ? .90 : 1, .85);
  // Lower tail lobe, paired fins and the narrow peduncle sit underneath the back.
  c.globalAlpha = .79;
  c.fillStyle = colors.fin; c.strokeStyle = colors.edge; c.lineWidth = .5;
  c.beginPath(); c.moveTo(-4.1, tail * .13 - .65);
  c.quadraticCurveTo(-7.2, tail * .65 - .6, -9.6, tail - 2.65);
  c.quadraticCurveTo(-10, tail - .5, -8.2, tail + .1);
  c.lineTo(-9.5, tail + 2.4); c.quadraticCurveTo(-6.8, tail + 1.7, -4, tail * .13 + .55);
  c.closePath(); c.fill(); c.stroke();
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(.9, side * 1.25);
    c.quadraticCurveTo(.6 + fin, side * 3.4, -2 + fin, side * 4.15);
    c.quadraticCurveTo(-2.4, side * 2.7, -1.4, side * 1.4);
    c.closePath(); c.fill();
  }
  c.globalAlpha = .85;
  c.fillStyle = colors.back; c.lineWidth = .65;
  c.beginPath(); c.moveTo(6.9,-.2);
  c.quadraticCurveTo(6.5,-2.3,3.2,-2.7); c.bezierCurveTo(-.3,-3.5,-2.4,-1.55,-5.5,tail*.19-.6);
  c.lineTo(-5.5,tail*.19+.65); c.bezierCurveTo(-2.6,1.5,-1,2.75,2.6,2.55);
  c.quadraticCurveTo(6.45,2.55,6.9,-.2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = colors.belly;
  c.beginPath(); c.ellipse(1.2,-.85,2.6,.6,-.1,0,2*Math.PI); c.fill();
  c.fillStyle = colors.gold; c.fillRect(-2.1,-.7,1.7,1); c.fillRect(3,-1.2,1,.8);
  c.fillStyle = colors.edge; c.fillRect(4.9,-1.4,.9,.85); c.fillRect(4.9,.95,.9,.75);
  c.restore();
}

function ripples(c: Brush, index: 0 | 1, time: number) {
  const age = (time + (index ? 5.4 : 2)) % (index ? 14 : 12);
  if (age > 1.8) return;
  const at = pondFishAt(index, time-age);
  const x = at.x + Math.cos(at.angle) * 4, y = at.y + Math.sin(at.angle) * 4;
  c.strokeStyle = "#d8ece3"; c.lineWidth = .85;
  for (const delay of [0, .38]) {
    const fraction = (age - delay) / 1.42;
    if (fraction < 0 || fraction >= 1) continue;
    const radius = 1.3 + 7.8 * fraction;
    c.globalAlpha = Math.sin(fraction * Math.PI) * .51;
    c.beginPath();
    c.ellipse(x, y, radius, radius * .38, -.08, .19, Math.PI * .94);
    c.stroke();
    c.beginPath();
    c.ellipse(x, y, radius, radius * .38, -.08, Math.PI * 1.18, Math.PI * 1.87);
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** The alpha of the original HD water cuts each moving fish behind the real
 * petals, pads and bank. Only this small pond patch needs compositing. */
export class TownPond {
  private mask?: HTMLImageElement;
  private water?: Brush;
  private retryAfter = 0;
  private lastFrame = NaN;
  draw(c: Brush, view: Rect, time: number, still: boolean) {
    const { x,y,w,h } = pondArtBounds;
    if (view.x > x+w || view.y > y+h || view.x+view.w < x || view.y+view.h < y) return;
    if (!this.mask) {
      if (performance.now() < this.retryAfter) return;
      this.mask = new Image();
      this.mask.decoding = "async";
      this.mask.onerror = () => {
        this.retryAfter = performance.now() + 15_000;
        this.mask = undefined;
      };
      this.mask.src = waterMaskUrl;
    }
    if (!this.mask.complete || !this.mask.naturalWidth) return;
    if (!this.water) {
      const canvas = document.createElement("canvas");
      canvas.width = this.mask.naturalWidth; canvas.height = this.mask.naturalHeight;
      this.water = canvas.getContext("2d")!;
    }
    const paint = this.water;
    const frame = still ? -1 : time;
    if (frame !== this.lastFrame) {
      this.lastFrame = frame;
      paint.clearRect(0,0,paint.canvas.width,paint.canvas.height);
      paint.save(); paint.setTransform(2,0,0,2,-2*x,-2*y);
      fish(paint,0,Math.max(0,frame)); fish(paint,1,Math.max(0,frame));
      if (!still) { ripples(paint,0,time); ripples(paint,1,time); }
      paint.restore();
      paint.globalCompositeOperation = "destination-in";
      paint.drawImage(this.mask,0,0);
      paint.globalCompositeOperation = "source-over";
    }
    c.drawImage(paint.canvas,x,y,w,h);
  }
}
