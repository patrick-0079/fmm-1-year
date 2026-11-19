import type { RestState } from "./rest.ts";
import type { DepthLayer, World } from "./world";

export const campGuestStart = { x: 164, y: 184 };
export const campGuestSeat = { x: 216, y: 179 };
const waitSeconds = 60;
const walkSeconds = 1;
const offerUntil = 1.75;
const handoffUntil = 2.2;
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

interface CampVisit {
  seat: RestState;
  satAt: number;
  arrival?: { age: number; hasLetter: boolean };
}

export class CampGuest {
  private visit?: CampVisit;
  private world: Pick<World, "scene" | "restState" | "paused">;
  private deliver: () => boolean;

  constructor(world: Pick<World, "scene" | "restState" | "paused">, deliver: () => boolean) {
    this.world = world;
    this.deliver = deliver;
  }

  reset() {
    this.visit = undefined;
  }

  tick(dt: number, time: number) {
    const seat = this.world.restState;
    if (this.world.scene !== "meadow" || seat?.kind !== "sitting") {
      this.reset();
      return;
    }
    if (this.visit?.seat !== seat) this.visit = { seat, satAt: time };
    if (this.world.paused || dt === 0) return;
    if (this.visit.arrival) {
      this.visit.arrival.age = Math.min(handoffUntil, this.visit.arrival.age + dt);
    } else if (time - this.visit.satAt >= waitSeconds) {
      this.visit.arrival = { age: 0, hasLetter: this.deliver() };
    }
  }

  layers(sheet: HTMLImageElement, still: boolean): DepthLayer[] {
    const visit = this.visit;
    if (this.world.scene !== "meadow" || !visit?.arrival ||
        this.world.restState !== visit.seat || !sheet.naturalWidth) return [];
    const { age, hasLetter } = visit.arrival;
    const walking = !still && age < walkSeconds;
    const step = walking ? Math.min(1, age / walkSeconds) : 1;
    const x = Math.round(campGuestStart.x + (campGuestSeat.x - campGuestStart.x) * step);
    const y = Math.round(campGuestStart.y + (campGuestSeat.y - campGuestStart.y) * step);
    const frame = walking ? Math.floor(age * 6) % 2 : hasLetter && age < offerUntil ? 3 : 2;
    const size = 36;
    const layers: DepthLayer[] = [{
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
    }];
    if (!still && hasLetter && age >= offerUntil && age < handoffUntil) {
      const mix = (age - offerUntil) / (handoffUntil - offerUntil);
      const fromX = campGuestSeat.x + 13, fromY = campGuestSeat.y - 16;
      const to = visit.seat.anchor;
      const px = Math.round(fromX + (to.x - 8 - fromX) * mix);
      const py = Math.round(fromY + (to.y - 12 - fromY) * mix - 4 * Math.sin(mix * Math.PI));
      layers.push({
        y: Math.max(campGuestSeat.y, to.y) + .1,
        draw(c) {
          c.fillStyle = "#8f6958";
          c.fillRect(px - 5, py - 3, 10, 7);
          c.fillStyle = "#fff0cf";
          c.fillRect(px - 4, py - 2, 8, 5);
          c.fillStyle = "#c29874";
          c.fillRect(px - 4, py - 1, 2, 1);
          c.fillRect(px + 2, py - 1, 2, 1);
          c.fillStyle = "#c36e79";
          c.fillRect(px - 1, py + 1, 2, 1);
        },
      });
    }
    return layers;
  }
}
