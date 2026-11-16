import type { Point } from "./core.ts";

export const EMBRACE_SECONDS = 4.8;
export type EmbraceStage = "anticipate" | "open" | "close" | "hold" | "release" | "settle";
export interface EmbracePose {
  stage: EmbraceStage;
  frame: 0 | 1 | 2 | 3;
  contact: number;
  lean: number;
  playerLean: number;
  pat: number;
  glow: number;
}

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const ease = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};

/** Visual timing only. Callers own interaction cancellation and real foot positions.
 * Positive lean is for a cat reaching right; mirror its sign for a left-side hug. */
export function embracePose(progress: number, reduced: boolean): EmbracePose {
  if (reduced) return { stage: "hold", frame: 2, contact: 1, lean: 0, playerLean: 0, pat: 0, glow: .65 };
  const p = unit(progress);
  const stage: EmbraceStage = p < .12 ? "anticipate" : p < .28 ? "open" : p < .42 ? "close"
    : p < .7 ? "hold" : p < .86 ? "release" : "settle";
  const contact = p < .42 ? ease((p - .12) / .3) : p < .7 ? 1 : 1 - ease((p - .7) / .3);
  // Exactly two gentle taps during the hold. Squared sine starts and ends each
  // tap at rest, avoiding hard sign changes in the foreground paw movement.
  const hold = (p - .42) / .28;
  const pat = stage === "hold" ? Math.sin(hold * Math.PI * 2) ** 2 : 0;
  const frame = stage === "anticipate" || stage === "settle" ? 0
    : stage === "open" || stage === "release" ? 1
    : stage === "hold" && pat > .35 ? 3 : 2;
  return { stage, frame, contact, lean: .024 * contact,
    playerLean: -.045 * contact, pat, glow: contact * (.65 + .2 * pat) };
}

/** Absolute visual foot point, at most maxDistance from origin. This is not a
 * collision bypass: the caller must validate the returned segment against its map. */
export function boundedEmbraceFoot(origin: Point, target: Point, maxDistance = 12): Point {
  const start = { x: Number.isFinite(origin.x) ? origin.x : 0,
    y: Number.isFinite(origin.y) ? origin.y : 0 };
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y) ||
    !Number.isFinite(target.x) || !Number.isFinite(target.y) ||
    !Number.isFinite(maxDistance) || maxDistance <= 0) return start;
  const dx = target.x - start.x, dy = target.y - start.y, distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance === 0) return start;
  const fraction = Math.min(1, maxDistance / distance);
  return { x: start.x + dx * fraction, y: start.y + dy * fraction };
}
