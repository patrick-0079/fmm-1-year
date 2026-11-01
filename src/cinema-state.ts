export type CinemaStage =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";
/** Playback intent is separate from readiness: a late canplay must never play offscreen. */
export class CinemaSession {
  active = false;
  wanted = false;
  hasFrame = false;
  stage: CinemaStage = "idle";
  open() {
    this.active = true;
    this.wanted = false;
    if (this.stage === "idle") this.stage = "loading";
  }
  leave() {
    this.active = false;
    this.wanted = false;
    if (["playing", "buffering"].includes(this.stage))
      this.stage = this.hasFrame ? "paused" : "loading";
  }
  request() {
    if (!this.active || this.stage === "error") return false;
    this.wanted = true;
    this.stage = this.hasFrame ? "buffering" : "loading";
    return true;
  }
  ready() {
    this.hasFrame = true;
    if (this.stage !== "playing" && this.stage !== "ended")
      this.stage = this.active && this.wanted ? "buffering" : "ready";
  }
  playing() {
    if (!this.active || !this.wanted) return false;
    this.hasFrame = true;
    this.stage = "playing";
    return true;
  }
  pause() {
    this.wanted = false;
    if (!["idle", "error", "ended"].includes(this.stage))
      this.stage = this.hasFrame ? "paused" : "loading";
  }
  waiting() {
    if (this.stage !== "error" && this.stage !== "ended")
      this.stage = this.hasFrame ? "buffering" : "loading";
  }
  end() {
    this.wanted = false;
    this.stage = "ended";
  }
  fail() {
    this.wanted = false;
    this.stage = "error";
  }
  retry() {
    this.wanted = false;
    this.hasFrame = false;
    this.stage = "loading";
  }
}
export function mediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const n = Math.floor(seconds),
    h = Math.floor(n / 3600),
    m = Math.floor((n % 3600) / 60),
    s = String(n % 60).padStart(2, "0");
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${s}`
    : `${String(m).padStart(2, "0")}:${s}`;
}
export function bufferedUntil(
  ranges: Pick<TimeRanges, "length" | "start" | "end">,
  position: number,
) {
  for (let i = 0; i < ranges.length; i++)
    if (position >= ranges.start(i) - 0.2 && position <= ranges.end(i) + 0.2)
      return ranges.end(i);
  return 0;
}
export function containVideo(
  sw: number,
  sh: number,
  box: { x: number; y: number; w: number; h: number },
) {
  const scale = Math.min(box.w / sw, box.h / sh),
    w = sw * scale,
    h = sh * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
