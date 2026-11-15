import type { Point } from "./core";
import { drawGiftArt } from "./gift-art";

export type GiftStage = "tied" | "untying" | "ready" | "opening" | "revealed" | "collected";
export const giftPosition = { x: 448, y: 316 };
export const giftRibbonEnds = [{ x: 435, y: 295 }, { x: 461, y: 295 }];

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
        const distances = giftRibbonEnds.map(p => Math.hypot(p.x-point.x,p.y-point.y));
        const index = distances[0] <= distances[1] ? 0 : 1;
        this.drag = distances[index] < 15 && !this.ribbons[index] ? {index, start: {...point}} : null;
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

/** Gift components share one projection; interaction progress lives above. */
export function drawUnwrappingGift(c: CanvasRenderingContext2D, gift: GiftUnwrapping, time: number, reduced: boolean) {
  drawGiftArt(c, gift, time, reduced, giftPosition);
}
