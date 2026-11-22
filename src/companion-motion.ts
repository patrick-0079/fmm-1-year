import { canStand, canTravelBetween, type Geometry, type Point } from "./core.ts";

export const COMPANION_GAP = 30;
const angles = [0, Math.PI, Math.PI/2, -Math.PI/2,
  Math.PI/4, Math.PI*3/4, -Math.PI/4, -Math.PI*3/4,
  Math.PI/8, Math.PI*3/8, Math.PI*5/8, Math.PI*7/8,
  -Math.PI/8, -Math.PI*3/8, -Math.PI*5/8, -Math.PI*7/8];

/** A local, reachable resting place; never spawn a pet on the player's feet. */
export function companionJoinPoint(player: Point, geometry: Geometry, from = player): Point {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return { ...from };
  const awayX=from.x-player.x,awayY=from.y-player.y;
  const directions=Math.hypot(awayX,awayY)>1
    ? [...angles].sort((a,b)=>(Math.cos(b)*awayX+Math.sin(b)*awayY)-(Math.cos(a)*awayX+Math.sin(a)*awayY))
    : angles;
  for (const radius of [32, 30, 28, 24, 20, 16, 12]) {
    for (const angle of directions) {
      const at = { x: player.x + Math.cos(angle)*radius, y: player.y + Math.sin(angle)*radius };
      if (canStand(at, geometry.walls, geometry.bounds, geometry.floor, geometry.surfaces) &&
        canTravelBetween(player, at, geometry) && canTravelBetween(from, at, geometry)) return at;
    }
  }
  // Very confined pockets can have no separate safe footpoint. Preserve the
  // existing valid feet until the player walks back into an open space.
  return { ...from };
}

/** A cosmetic companion follows the player's known-safe footsteps, never a global search. */
export class CompanionMotion {
  position: Point = { x: 0, y: 0 };
  mirrored = false;
  private trail: Point[] = [];
  private lastPlayer: Point = { x: 0, y: 0 };
  private blockedFor = 0;
  private aside: Point | null = null;

  reset(point: Point) {
    this.position = { ...point };
    this.lastPlayer = { ...point };
    this.trail = [];
    this.blockedFor = 0;
    this.mirrored = false;
    this.aside = null;
  }

  join(player: Point, geometry: Geometry) {
    this.reset(player);
    this.position = companionJoinPoint(player, geometry);
    this.trail = [{ ...player }];
    this.mirrored = player.x < this.position.x;
  }

  update(player: Point, geometry: Geometry, dt: number, moving: boolean) {
    if (!moving || dt <= 0) return;
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return;
    const delta = Math.hypot(player.x - this.lastPlayer.x, player.y - this.lastPlayer.y);
    // Scene portals, respawns and getting out of bed are not walking segments.
    if (delta > 90 || this.trail.length >= 256) {
      this.join(player, geometry);
      return;
    }
    if (delta >= 2) {
      this.trail.push({ ...player });
      this.lastPlayer = { ...player };
    }
    let budget = Math.min(dt, 0.05) * 110;
    // An invitation ends close to the player, or the player may walk back into
    // their companion. Let the pet take a short visible step aside, not remain
    // stacked on the player's torso until another long walk happens.
    if (Math.hypot(this.position.x-player.x,this.position.y-player.y)<24 &&
      (!this.aside || Math.hypot(this.aside.x-player.x,this.aside.y-player.y)<24)) {
      this.aside = companionJoinPoint(player, geometry, this.position);
      // We have rejoined the player here. Following the older trail after
      // stepping aside would send the pet back to the other end of the room.
      this.trail = [{ ...player }];
      this.lastPlayer = { ...player };
    }
    if (this.aside) {
      const dx=this.aside.x-this.position.x,dy=this.aside.y-this.position.y,distance=Math.hypot(dx,dy);
      if (distance<.05) this.aside=null;
      else {
        const step=Math.min(distance,budget),next={x:this.position.x+dx/distance*step,y:this.position.y+dy/distance*step};
        if(canTravelBetween(this.position,next,geometry)) {
          this.position=next;this.mirrored=dx<0;
        } else this.aside=null;
        return;
      }
    }
    while (budget > 0 && this.trail.length &&
      Math.hypot(this.position.x - player.x, this.position.y - player.y) > COMPANION_GAP) {
      const target = this.trail[0];
      const dx = target.x - this.position.x, dy = target.y - this.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.01) { this.trail.shift(); continue; }
      const gap = Math.hypot(this.position.x-player.x,this.position.y-player.y);
      const step = Math.min(distance, budget, gap-COMPANION_GAP);
      if (step<.001) break;
      const next = { x: this.position.x + dx / distance * step, y: this.position.y + dy / distance * step };
      if (!canTravelBetween(this.position, next, geometry)) {
        this.blockedFor += dt;
        // A scenery change may invalidate an old footprint. Rejoin safely beside the player.
        if (this.blockedFor > 1 && canStand(player, geometry.walls, geometry.bounds, geometry.floor, geometry.surfaces))
          this.join(player, geometry);
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
