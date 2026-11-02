import { canStand, canTravelBetween, type Geometry, type Point } from "./core.ts";

/** A cosmetic companion follows the player's known-safe footsteps, never a global search. */
export class CompanionMotion {
  position: Point = { x: 0, y: 0 };
  mirrored = false;
  private trail: Point[] = [];
  private lastPlayer: Point = { x: 0, y: 0 };
  private blockedFor = 0;

  reset(point: Point) {
    this.position = { ...point };
    this.lastPlayer = { ...point };
    this.trail = [];
    this.blockedFor = 0;
    this.mirrored = false;
  }

  update(player: Point, geometry: Geometry, dt: number, moving: boolean) {
    if (!moving || dt <= 0) return;
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return;
    const delta = Math.hypot(player.x - this.lastPlayer.x, player.y - this.lastPlayer.y);
    // Scene portals, respawns and getting out of bed are not walking segments.
    if (delta > 90 || this.trail.length >= 256) {
      this.reset(player);
      return;
    }
    if (delta >= 2) {
      this.trail.push({ ...player });
      this.lastPlayer = { ...player };
    }
    let budget = Math.min(dt, 0.05) * 110;
    while (budget > 0 && this.trail.length &&
      Math.hypot(this.position.x - player.x, this.position.y - player.y) > 20) {
      const target = this.trail[0];
      const dx = target.x - this.position.x, dy = target.y - this.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.01) { this.trail.shift(); continue; }
      const step = Math.min(distance, budget);
      const next = { x: this.position.x + dx / distance * step, y: this.position.y + dy / distance * step };
      if (!canTravelBetween(this.position, next, geometry)) {
        this.blockedFor += dt;
        // A scenery change may invalidate an old footprint. Rejoin safely beside the player.
        if (this.blockedFor > 1 && canStand(player, geometry.walls, geometry.bounds, geometry.floor, geometry.surfaces))
          this.reset(player);
        return;
      }
      this.blockedFor = 0;
      this.mirrored = dx < 0;
      this.position = next;
      budget -= step;
      if (step >= distance) this.trail.shift();
    }
  }
}
