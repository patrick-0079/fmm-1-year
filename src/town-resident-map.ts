import {
  canStand,
  obstacleContainsFoot,
  type Obstacle,
  type Point,
} from "./core.ts";
import type { Hotspot, Scene } from "./maps.ts";
import { TOWN_NPCS } from "./town-data.ts";
import type { TownResidentId } from "./town-dialogue.ts";
import type { ResidentMotion } from "./town-routines.ts";
import { interiorForResident, residentFeet, residentSpot, townInteriors, type TownArea } from "./town-interiors.ts";

function translated(wall: Obstacle, dx: number, dy: number): Obstacle {
  if (!dx && !dy) return wall;
  if ("points" in wall)
    return {
      ...wall,
      points: wall.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    };
  return { ...wall, x: wall.x + dx, y: wall.y + dy };
}

/** Keep one stable interaction anchor per performer, also used by open dialogue. */
export class TownResidentMap {
  readonly scene: Scene;
  private readonly area: TownArea;
  private fixedWalls: Obstacle[];
  private fixedSpots: Hotspot[];
  private actors: {
    id: TownResidentId;
    home: Hotspot;
    spot: Hotspot;
    original: Obstacle;
    wall: Obstacle;
    assignedApproach?: Point;
    yielding: boolean;
    present: boolean;
    solid: boolean;
    usesDoor: boolean;
  }[];

  constructor(base: Scene, area: TownArea = "town") {
    this.area = area;
    const interior = area === "town" ? undefined : townInteriors[area];
    this.actors = TOWN_NPCS.filter(npc => !interior || npc.id === interior.resident).map(npc => {
      const station = interior && Object.values(interior.shifts)[0];
      const home = station ? residentSpot(npc, station.foot, station.approach) : base.spots.find(s => s.id === "npc-" + npc.id)!;
      const wall = station ? residentFeet(npc, station.foot) : base.walls.find(w => w.label === "镇民 · " + npc.name)!;
      return {
        id: npc.id,
        home,
        spot: { ...home },
        original: wall,
        wall,
        yielding: false,
        present: !interior,
        solid: !interior,
        usesDoor: interiorForResident.has(npc.id),
      };
    });
    this.fixedWalls = base.walls.filter(
      (w) => !this.actors.some((a) => a.original === w),
    );
    this.fixedSpots = base.spots.filter(s => !this.actors.some(a=>a.home===s));
    this.scene = {
      ...base,
      spots: base.spots.map(
        (s) => this.actors.find((a) => a.home === s)?.spot ?? s,
      ),
    };
  }

  anchor(id: string): Hotspot {
    return this.actors.find(a=>a.id===id)!.spot;
  }

  update(player?: Point, actorId?: string, foot?: Point, people?: ReadonlyMap<TownResidentId,ResidentMotion>) {
    let changed = false;
    let rosterChanged = false;
    const moved: typeof this.actors = [];
    for (const actor of this.actors) {
      const resident=people?.get(actor.id);
      const present = !resident || resident.scene === this.area &&
        (resident.status === "present" || resident.status === "arriving" && resident.opacity >= .8);
      if (present!==actor.present) {
        actor.present=present;
        rosterChanged=true;
      }
      const solid = present || actor.usesDoor && resident?.scene === this.area &&
        resident.status === "leaving" && resident.opacity >= .5;
      if (solid !== actor.solid) {
        actor.solid = solid;
        changed = true;
      }
      if (!solid) continue;
      const at = actor.id === actorId && foot ? foot : resident ?? actor.home;
      const movedFoot = actor.spot.x !== at.x || actor.spot.y !== at.y;
      if (movedFoot) {
        actor.spot.x = at.x;
        actor.spot.y = at.y;
        actor.wall = translated(
          actor.original,
          at.x - actor.home.x,
          at.y - actor.home.y,
        );
      }
      if (movedFoot || actor.assignedApproach !== resident?.approach) {
        actor.assignedApproach = resident?.approach;
        changed = true;
        moved.push(actor);
      }
      // A performer returning to their mark can land directly on the player.
      // Give way until the feet separate so movement and click routes still work.
      const yielding = !!player && obstacleContainsFoot(player, actor.wall);
      if (actor.yielding !== yielding) {
        actor.yielding = yielding;
        changed = true;
      }
    }
    if (!changed && !rosterChanged) return;
    if (rosterChanged) this.scene.spots = [...this.fixedSpots,...this.actors.filter(a=>a.present).map(a=>a.spot)];
    this.scene.walls = [
      ...this.fixedWalls,
      ...this.actors.filter((a) => a.solid && !a.yielding).map((a) => a.wall),
    ];
    for (const { home, spot, assignedApproach } of rosterChanged ? this.actors.filter(a=>a.present) : moved) {
      const shifted = assignedApproach ?? {
        x: home.approach.x + spot.x - home.x,
        y: home.approach.y + spot.y - home.y,
      };
      const { walls, bounds, floor, surfaces } = this.scene;
      const candidates = [
        shifted,
        home.approach,
        { x: spot.x - 18, y: spot.y },
        { x: spot.x + 18, y: spot.y },
        { x: spot.x, y: spot.y - 18 },
      ];
      spot.approach =
        candidates.find(
          (p) =>
            Math.hypot(p.x - spot.x, p.y - spot.y) < (spot.radius ?? 48) &&
            canStand(p, walls, bounds, floor, surfaces),
        ) ?? home.approach;
    }
  }
}
