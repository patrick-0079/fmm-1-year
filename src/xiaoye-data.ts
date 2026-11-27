import type { Obstacle, Point } from "./core.ts";
import type { Phase } from "./day.ts";
import type { Hotspot } from "./maps.ts";
import { EMBRACE_SECONDS } from "./xiaoye-embrace.ts";

/** Grass northwest of the central plaza's west entrance. Keep the y=340
 * cross-plaza passage entirely open, including the player's foot radius. */
export const xiaoyeSpot: Hotspot = {
  id: "xiaoye-plush",
  title: "小叶子 · 大猫猫玩偶",
  x: 330,
  y: 315,
  approach: { x: 354, y: 327 },
  radius: 29,
  selfMarked: true,
  hitAreas: [{ x: 303, y: 255, w: 57, h: 64 }],
  cue: {
    kind: "talk", action: "和小叶子聊聊", verb: "交谈", natural: true,
    anchor: { x: 18, y: -43 },
    objectBox: { x: -27, y: -60, w: 57, h: 64 },
  },
};
export const xiaoyeFootprint: Obstacle = {
  label: "来宾 · 小叶子",
  x: xiaoyeSpot.x - 9, y: xiaoyeSpot.y - 4, w: 18, h: 8,
};
export const XIAOYE_HUG_SECONDS = EMBRACE_SECONDS;

export const xiaoyeLanternOn = (phase: Phase) => phase === "dusk" || phase === "night";
export const xiaoyeFrame = (phase: Phase, hugging: boolean) =>
  (xiaoyeLanternOn(phase) ? 2 : 0) + (hugging ? 1 : 0);

/** Absolute source pixels, with two clear pixels around each measured silhouette.
 * Separate foot anchors keep the idle, hugging and lantern poses on the ground. */
export const xiaoyeFrames = [
  { x: 280, y: 23, w: 323, h: 426, top: 25, footX: 466.5, footY: 445, lantern: null, paw: null },
  { x: 862, y: 21, w: 366, h: 428, top: 23, footX: 1051, footY: 445, lantern: null,
    paw: { x: 1173, y: 216, w: 54, h: 72 } },
  { x: 282, y: 538, w: 361, h: 442, top: 540, footX: 472, footY: 976, lantern: { x: 327, y: 875 }, paw: null },
  { x: 862, y: 538, w: 380, h: 444, top: 540, footX: 1059, footY: 978, lantern: { x: 909, y: 878 },
    paw: { x: 1177, y: 730, w: 49, h: 68 } },
] as const;
export const xiaoyeScale = (frame: number, height: number) => {
  const pose = xiaoyeFrames[frame];
  return height / (pose.footY - pose.top);
};

/** Shared by the sprite and glow; mirroring never leaves the light on the old paw. */
export function xiaoyeLanternPoint(frame: number, height: number, mirror: boolean, lean: number): Point | null {
  const pose = xiaoyeFrames[frame];
  if (!pose.lantern) return null;
  const scale = xiaoyeScale(frame, height),
    x = (pose.lantern.x - pose.footX) * scale,
    y = (pose.lantern.y - pose.footY) * scale;
  return { x: (Math.cos(lean) * x - Math.sin(lean) * y) * (mirror ? -1 : 1),
    y: Math.sin(lean) * x + Math.cos(lean) * y };
}

/** Ephemeral only: a hug never grants items or changes the player's save. */
export class XiaoyeHug {
  private remaining = 0;
  private start: Point = { ...xiaoyeSpot.approach };
  get active() { return this.remaining > 0; }
  get progress() { return this.active ? 1 - this.remaining / XIAOYE_HUG_SECONDS : 0; }
  get mirrored() { return this.start.x < xiaoyeSpot.x; }

  begin(player: Point) {
    if (this.active || !Number.isFinite(player.x) || !Number.isFinite(player.y) ||
      Math.hypot(player.x - xiaoyeSpot.x, player.y - xiaoyeSpot.y) > xiaoyeSpot.radius!) return false;
    this.start = { ...player };
    this.remaining = XIAOYE_HUG_SECONDS;
    return true;
  }
  cancel() { this.remaining = 0; }
  tick(dt: number, player: Point, available: boolean) {
    if (!this.active) return false;
    // A player can leave immediately. Never move their feet, clear held keys,
    // or keep embracing empty space after another panel takes over.
    if (!available || !Number.isFinite(player.x) || !Number.isFinite(player.y) ||
      Math.hypot(player.x - this.start.x, player.y - this.start.y) > 7) {
      this.cancel();
      return false;
    }
    if (Number.isFinite(dt)) this.remaining = Math.max(0, this.remaining - Math.max(0, dt));
    return !this.active;
  }
}
