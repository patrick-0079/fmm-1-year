import type { Point } from "./core.ts";

export type PeachFacing = "left" | "right" | "front" | "back";
/** One four-pose stride per 26 world pixels, independent of the refresh rate. */
export class PeachGait {
  facing: PeachFacing = "front";
  walking = false;
  private distance = 0;
  get frame() { return this.walking ? Math.floor(this.distance/6.5)%4 : 1; }
  reset() { this.distance=0; this.walking=false; this.facing="front"; }
  move(before:Point, after:Point) {
    const dx=after.x-before.x, dy=after.y-before.y, travelled=Math.hypot(dx,dy);
    if (travelled>12) { this.reset(); return; } // a scene arrival or recovery, not a step
    this.walking=travelled>.005;
    if (!this.walking) return;
    this.distance=(this.distance+travelled)%26;
    if (Math.abs(dx)>=Math.abs(dy)) this.facing=dx<0?"left":"right";
    else this.facing=dy<0?"back":"front";
  }
}
