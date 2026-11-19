import type { RestState } from "./rest.ts";
import type { DepthLayer, World } from "./world";
import { campLetterSpot } from "./meadow-map.ts";
import type { ResidentStory } from "./resident-story.ts";

export const campGuestStart = { x: 164, y: 184 };
export const campGuestSeat = { x: 216, y: 179 };
const waitSeconds = 30;
const walkSeconds = 1;
const offerUntil = 1.75;
const placedAt = 2.2;
const cell = 128, baseline = 126;

// The narrow part of the head ends just above the brows. Align the tip to the
// eyes, widening both edges up to the original contour at the join.
const headCaps = [
  { join: 32, center: 66.5 },
  { join: 31, center: 62.5 },
  { join: 32, center: 64.5 },
  { join: 32, center: 64.5 },
];
const alignedSheets = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

function alignedCampSheet(sheet: HTMLImageElement) {
  const cached = alignedSheets.get(sheet);
  if (cached) return cached;
  const output = document.createElement("canvas");
  output.width = output.height = cell * 2;
  const c = output.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(sheet, 0, 0);
  const { data } = c.getImageData(0, 0, output.width, output.height);

  headCaps.forEach(({ join, center }, frame) => {
    const sx = (frame % 2) * cell, sy = Math.floor(frame / 2) * cell;
    const boundsAt = (y: number) => {
      let left = 0, right = cell - 1;
      const alpha = (x: number) => data[((sy + y) * output.width + sx + x) * 4 + 3];
      while (left < cell && alpha(left) < 38) left++;
      while (right > left && alpha(right) < 38) right--;
      return { left, right };
    };
    const spans = Array.from({ length: join + 1 }, (_, y) => boundsAt(y));
    const top = spans.findIndex(({ left }) => left < cell);
    const base = spans[join];
    if (top < 0 || top >= join || base.left >= cell) return;
    const tip = spans[top];
    const radius = (tip.right - tip.left) / 2;
    c.clearRect(sx, sy, cell, join);
    for (let row = top; row < join; row++) {
      const source = spans[row];
      if (source.left >= cell) continue;
      const widen = Math.pow((row - top) / (join - top), .65);
      const left = Math.round((center - radius) * (1 - widen) + base.left * widen);
      const right = Math.round((center + radius) * (1 - widen) + base.right * widen);
      c.drawImage(sheet, sx + source.left, sy + row, source.right - source.left + 1, 1,
        sx + left, sy + row, right - left + 1, 1);
    }
  });
  alignedSheets.set(sheet, output);
  return output;
}

type CampWorld = Pick<World, "scene" | "restState" | "paused">;
interface CampVisit {
  seat: RestState;
  satAt: number;
  arrivalAge?: number;
}

function drawEnvelope(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = "#8f6958";
  c.fillRect(x - 6, y - 8, 12, 9);
  c.fillStyle = "#fff0cf";
  c.fillRect(x - 5, y - 7, 10, 7);
  c.fillStyle = "#c29874";
  c.fillRect(x - 5, y - 6, 2, 1);
  c.fillRect(x + 3, y - 6, 2, 1);
  c.fillRect(x - 3, y - 5, 6, 1);
  c.fillStyle = "#c36e79";
  c.fillRect(x - 1, y - 4, 3, 2);
}

export class CampGuest {
  private visit?: CampVisit;
  private world: CampWorld;
  private story: () => ResidentStory;
  private save: () => void;

  constructor(world: CampWorld, story: () => ResidentStory, save: () => void) {
    this.world = world;
    this.story = story;
    this.save = save;
  }

  get letterOnGround() {
    const state = this.story();
    return this.world.scene === "meadow" && state.patrickArrived && !state.patrickDelivered &&
      (this.visit?.arrivalAge ?? placedAt) >= placedAt;
  }

  reset() {
    this.visit = undefined;
  }

  tick(dt: number, time: number) {
    const seat = this.world.restState;
    const visit = this.visit;
    if (this.world.scene !== "meadow") {
      this.reset();
      return;
    }
    if (visit?.arrivalAge !== undefined) {
      if (!this.world.paused) visit.arrivalAge = Math.min(placedAt, visit.arrivalAge + dt);
      if (visit.arrivalAge >= placedAt && seat !== visit.seat) this.reset();
      return;
    }
    if (seat?.kind !== "sitting" || seat.scene !== "meadow") {
      this.reset();
      return;
    }
    const waiting = this.visit = visit?.seat === seat ? visit : { seat, satAt: time };
    if (this.world.paused || dt === 0 || time - waiting.satAt < waitSeconds) return;
    const state = this.story();
    if (state.patrickArrived) return;
    waiting.arrivalAge = 0;
    state.patrickArrived = true;
    this.save();
  }

  layers(sheet: HTMLImageElement, still: boolean): DepthLayer[] {
    if (this.world.scene !== "meadow") return [];
    const age = this.visit?.arrivalAge;
    const layers: DepthLayer[] = [];
    if (age !== undefined && sheet.naturalWidth) layers.push(this.guestLayer(sheet, age, still));
    const { x, y } = campLetterSpot;
    if (this.letterOnGround) {
      layers.push({ y, draw: c => drawEnvelope(c, x, y) });
    } else if (!still && age !== undefined && age >= offerUntil && age < placedAt) {
      const mix = (age - offerUntil) / (placedAt - offerUntil);
      const fromX = campGuestSeat.x + 13, fromY = campGuestSeat.y - 11;
      const px = Math.round(fromX + (x - fromX) * mix);
      const py = Math.round(fromY + (y - fromY) * mix - 2 * Math.sin(mix * Math.PI));
      layers.push({ y, draw: c => drawEnvelope(c, px, py) });
    }
    return layers;
  }

  private guestLayer(sheet: HTMLImageElement, age: number, still: boolean): DepthLayer {
    const walking = !still && age < walkSeconds;
    const step = walking ? Math.min(1, age / walkSeconds) : 1;
    const x = Math.round(campGuestStart.x + (campGuestSeat.x - campGuestStart.x) * step);
    const y = Math.round(campGuestStart.y + (campGuestSeat.y - campGuestStart.y) * step);
    const frame = walking ? Math.floor(age * 6) % 2 : age < offerUntil ? 3 : 2;
    const size = 36;
    return {
      y,
      draw(c) {
        c.save();
        c.globalAlpha *= still ? 1 : Math.min(1, age / .25);
        c.fillStyle = "#20374485";
        c.beginPath();
        c.ellipse(x, y - 1, 10, 2.7, 0, 0, Math.PI * 2);
        c.fill();
        c.drawImage(alignedCampSheet(sheet), (frame % 2) * cell, Math.floor(frame / 2) * cell, cell, cell,
          x - size / 2, y - baseline * size / cell, size, size);
        c.restore();
      },
    };
  }
}
