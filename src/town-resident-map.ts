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
  private fixedWalls: Obstacle[];
  private fixedSpots: Hotspot[];
  private actors: {
    id: TownResidentId;
    home: Hotspot;
    spot: Hotspot;
    original: Obstacle;
    wall: Obstacle;
    yielding: boolean;
    present: boolean;
  }[];

  constructor(base: Scene) {
    this.actors = TOWN_NPCS.map((npc) => {
      const home = base.spots.find((s) => s.id === "npc-" + npc.id)!;
      const wall = base.walls.find((w) => w.label === "镇民 · " + npc.name)!;
      return {
        id: npc.id,
        home,
        spot: { ...home },
        original: wall,
        wall,
        yielding: false,
        present: true,
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
      const present=!resident || resident.status==="present" || resident.status==="arriving" && resident.opacity>=.8;
      if (present!==actor.present) {
        actor.present=present;
        rosterChanged=true;
      }
      if (!present) continue;
      const at = actor.id === actorId && foot ? foot : resident ?? actor.home;
      if (actor.spot.x !== at.x || actor.spot.y !== at.y) {
        actor.spot.x = at.x;
        actor.spot.y = at.y;
        actor.wall = translated(
          actor.original,
          at.x - actor.home.x,
          at.y - actor.home.y,
        );
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
      ...this.actors.filter((a) => a.present && !a.yielding).map((a) => a.wall),
    ];
    for (const { home, spot } of rosterChanged ? this.actors.filter(a=>a.present) : moved) {
      const shifted = {
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
