import type { Point } from "./core";
import { drawPartyProp, drawGiftPaper } from "./party-art";
import { drawItem } from "./item-art";

export type GiftStage = "tied" | "untying" | "ready" | "opening" | "revealed" | "collected";
export const giftPosition = { x: 448, y: 316 };
const ends = [{ x: 416, y: 280 }, { x: 481, y: 280 }];
const ease = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** Every transition is driven by a fresh input or an active-world tick. */
export class GiftUnwrapping {
  stage: GiftStage = "tied";
  ribbons = [false, false];
  time = 0;
  previouslyCollected = false;
  private drag: { index: number; start: Point } | null = null;

  reset(collected = false) {
    this.stage = "tied";
    this.ribbons = [false, false];
    this.time = 0;
    this.previouslyCollected = collected;
    this.cancelPointer();
  }
  get busy() { return this.stage === "untying" || this.stage === "opening"; }
  cancelPointer() { this.drag = null; }
  untie(index: number) {
    if (this.stage !== "tied" || this.ribbons[index]) return false;
    this.ribbons[index] = true;
    if (this.ribbons.every(Boolean)) { this.stage = "untying"; this.time = 0; }
    return true;
  }
  open() {
    if (this.stage !== "ready") return false;
    this.stage = "opening";
    this.time = 0;
    return true;
  }
  collect() {
    if (this.stage !== "revealed") return false;
    this.stage = "collected";
    this.time = 0;
    const first = !this.previouslyCollected;
    this.previouslyCollected = true;
    return first;
  }
  tick(dt: number, reduced = false) {
    this.time += dt;
    if (this.stage === "untying" && this.time >= (reduced ? .08 : .55)) {
      this.stage = "ready"; this.time = 0; return true;
    }
    if (this.stage === "opening" && this.time >= (reduced ? .08 : .9)) {
      this.stage = "revealed"; this.time = 0; return true;
    }
    return false;
  }
  pointer(type: string, point: Point) {
    if (type === "cancel") { this.cancelPointer(); return false; }
    if (this.stage === "tied") {
      if (type === "down") {
        const index = ends.findIndex(p => Math.hypot(p.x - point.x, p.y - point.y) < 15);
        this.drag = index >= 0 && !this.ribbons[index] ? {index, start: {...point}} : null;
      } else if (this.drag && type === "move") {
        const {index, start} = this.drag;
        // Pull the tail away from the bow. A tap on the tail also works.
        if ((point.x - start.x) * (index === 0 ? -1 : 1) >= 7) {
          this.cancelPointer(); return this.untie(index);
        }
      } else if (type === "up" && this.drag) {
        const {index, start} = this.drag;
        this.cancelPointer();
        if (Math.hypot(point.x - start.x, point.y - start.y) < 12) return this.untie(index);
      }
    } else if (this.stage === "ready" && type === "down" &&
      point.x > 412 && point.x < 484 && point.y > 247 && point.y < 298) return this.open();
    return false;
  }
}

function shape(c: CanvasRenderingContext2D, path: string, fill: string, stroke = "#aa7281", width = .65) {
  const p = new Path2D(path);
  c.fillStyle = fill; c.fill(p);
  if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); }
}

/** The gift sits on the wooden floor, with a lid and wrapping laid beside it. */
export function drawUnwrappingGift(c: CanvasRenderingContext2D, gift: GiftUnwrapping, time: number, reduced: boolean) {
  c.save(); c.translate(giftPosition.x, giftPosition.y);
  const untie = gift.stage === "tied" ? 0 : gift.stage === "untying" ? ease(gift.time / .55) : 1;
  const open = gift.stage === "opening" ? ease(gift.time / .9) : ["revealed","collected"].includes(gift.stage) ? 1 : 0;
  const sway = reduced ? 0 : Math.sin(time * 2) * .6;
  c.lineJoin = "round"; c.lineCap = "round";

  c.fillStyle = "#6d4b5333";
  c.beginPath(); c.ellipse(0, 1, 33, 4, 0, 0, Math.PI * 2); c.fill();
  if (open) {
    const glow = c.createRadialGradient(0,-36,1,0,-36,43);
    glow.addColorStop(0,"#fff3bd77"); glow.addColorStop(1,"#fff3bd00");
    c.fillStyle = glow; c.fillRect(-45,-82,90,90);
  }

  // Retain the original detailed strawberry wrapping on the two box walls.
  c.save();
  c.beginPath(); c.moveTo(-31,-35); c.lineTo(-3,-22); c.lineTo(32,-41);
  c.lineTo(30,-17); c.lineTo(-1,0); c.lineTo(-30,-14); c.closePath(); c.clip();
  drawPartyProp(c,4,-35,-76,70,76);
  c.restore();
  shape(c,"M-31-35 L-3-22 L32-41 L30-17 L-1 0 L-30-14 Z","#e6a4b22b");
  c.strokeStyle="#ffe4bb";c.lineWidth=.8;
  c.stroke(new Path2D("M-29-17 L-1-2 L28-18 M-29-33 L-28-16 M28-38 L28-19"));
  for(const [x,y] of [[-28,-16],[-1,-3],[28,-19]]) {
    c.fillStyle="#f7dc9d";c.fillRect(x-1,y-1,2,2);
  }

  // A lined interior is revealed by the lifting lid, rather than a flat card.
  shape(c,"M-31-35 L-3-52 L32-41 L-3-22 Z","#a76f80");
  shape(c,"M-28-35 L-3-48 L28-40 L-3-25 Z","#f5d8cd","#e6b99e");
  if (open) {
    shape(c,"M-27-34 L-25-45 L-20-42 L-16-49 L-10-43 L-4-48 L4-43 L11-47 L15-39 L25-43 L24-31 L-4-24 Z","#fff5e1","#e6c2b8");
    c.strokeStyle="#e5c5ba";c.lineWidth=.45;
    c.stroke(new Path2D("M-23-42 L-15-32 M-14-46 L-7-33 M1-44 L-1-31 M13-42 L7-31 M22-39 L16-33"));
    const rise = gift.stage === "collected" ? 8 : 16 * open + sway;
    drawItem(c,"ribbonShoes",-21,-41-rise,43,33);
    shape(c,"M-28-34 L-22-37 L-16-31 L-10-35 L-3-29 L5-34 L11-30 L17-35 L25-34 L-3-23 Z","#fff2df","#dfb8ae",.45);
    c.strokeStyle="#f8e2c3";c.lineWidth=1;
    c.stroke(new Path2D("M-29-34 L-3-22 L30-39"));
  }

  // Lid swings down to the floor at the left, keeping the package physically present.
  c.save();
  c.translate(-44 * open, 28 * open - Math.sin(open * Math.PI) * 12);
  c.rotate(-.32 * open);
  shape(c,"M-32-41 L-3-58 L33-46 L33-39 L-3-20 L-32-34 Z","#db91aa");
  shape(c,"M-32-41 L-3-58 L33-46 L-3-27 Z","#f6cbce","#ab7383");
  drawGiftPaper(c, new Path2D("M-31-41 L-3-57 L32-46 L-3-28 Z"));
  c.strokeStyle="#ffedca";c.lineWidth=1;
  c.stroke(new Path2D("M-29-41 L-3-55 L29-45 L-3-29 Z"));
  for(const [x,y] of [[-21,-40],[10,-44],[-4,-49],[3,-35]]) {
    c.fillStyle="#fff1d5";
    for(let i=0;i<5;i++) {c.beginPath();c.ellipse(x+Math.cos(i*1.26)*1.15,y+Math.sin(i*1.26)*.8,.85,.55,0,0,Math.PI*2);c.fill();}
    c.fillStyle="#dcac71";c.fillRect(x-.4,y-.4,.8,.8);
  }
  // The broad satin cross loosens in opposite directions as each tail is released.
  c.globalAlpha = 1 - untie;
  shape(c,"M-20-48 L-13-52 L20-40 L13-36 Z","#d57b9b","#f9d69a",.5);
  shape(c,"M10-54 L17-51 L-20-31 L-26-34 Z","#e498b3","#f9d69a",.5);
  c.restore();

  // Two separately selectable satin tails. Their enlarged hit areas stay invisible.
  for(let i=0;i<2;i++) {
    const side=i===0?-1:1, released=gift.ribbons[i], spread=released?8+untie*9:0;
    c.save();c.translate(side*spread,untie*20);c.globalAlpha=1-untie;
    c.scale(side,1);
    shape(c,"M0-49 C9-58 23-60 23-51 C23-45 9-46 0-49 Z",released?"#e8acbd":"#ed9fbc","#a46885");
    shape(c,"M2-48 C16-48 24-46 31-39 L36-36 L30-34 L29-30 C23-39 11-43 2-45 Z","#dc8ea7","#ac6880");
    c.strokeStyle="#ffe0a6";c.lineWidth=.65;
    c.stroke(new Path2D("M3-49 C13-55 21-57 21-52 M4-45 C16-44 25-41 30-35"));
    c.strokeStyle="#ffd9e5";c.lineWidth=1.1;
    c.stroke(new Path2D("M6-49 C13-51 18-53 20-51"));
    if(!released && gift.stage==="tied") {
      c.fillStyle="#fff1c4";c.fillRect(30,-37,2,2);
      c.strokeStyle="#fff2d6";c.lineWidth=.65;
      c.stroke(new Path2D("M33-39 L36-36 L33-33"));
    }
    c.restore();
  }
  if (untie) {
    c.save();c.globalAlpha=untie;
    for(const side of [-1,1]) {
      c.save();c.translate(side*29,3);c.scale(side,1);
      shape(c,"M-6-4 C0-10 8-10 14-4 C20 1 24 1 28-3 L30 1 C23 8 17 5 10 1 C5-3 0-4-3 1 Z","#e7a4b6","#b77b8e",.55);
      c.strokeStyle="#ffe4b6";c.lineWidth=.6;
      c.stroke(new Path2D("M-4-3 C1-7 7-7 12-2 C19 3 23 4 28 0"));
      c.restore();
    }
    c.restore();
  }
  if(untie<1) {
    c.globalAlpha=1-untie;
    shape(c,"M-3-51 Q0-54 3-51 L3-46 Q0-43-3-46 Z","#fbd3dc","#b57c8c");
    c.globalAlpha=1;
  }
  // A cream tag stays on the floor; it never obscures the present or the character.
  c.save();c.translate(27,7);c.rotate(.16);
  shape(c,"M-8-5 L5-5 L8-2 L8 5 L-8 5 Z","#fff1d2","#c7a577",.55);
  c.fillStyle="#9c6d78";c.font='5px "Microsoft YaHei",sans-serif';c.textAlign="center";
  c.fillText("给芙芙",0,1.8);c.restore();

  if(open && !reduced) {
    const age=gift.stage==="opening"?gift.time:gift.time+.9;
    for(let i=0;i<12;i++) {
      const p=(age*.35+i*.079)%1;
      c.globalAlpha=Math.sin(p*Math.PI)*.6;
      c.fillStyle=["#f6c6b1","#fff2bd","#d3dcad","#d4c6e4"][i%4];
      const x=Math.sin(i*2.4)*27*(.4+p),y=-38-p*34;
      c.fillRect(x,y,i%3===0?1.4:.8,i%2===0?2:.8);
    }
  }
  c.restore();
}
