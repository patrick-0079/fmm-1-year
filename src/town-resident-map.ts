import {
  canStand,
  obstacleContainsFoot,
  type Obstacle,
  type Point,
} from "./core.ts";
import type { Hotspot, Scene } from "./maps.ts";
import { TOWN_NPCS } from "./town-data.ts";

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
  private actors: {
    id: string;
    home: Hotspot;
    spot: Hotspot;
    original: Obstacle;
    wall: Obstacle;
    yielding: boolean;
  }[];

  constructor(base: Scene) {
    this.actors = TOWN_NPCS.filter((npc) =>
      ["cat", "bunny", "walker"].includes(npc.id),
    ).map((npc) => {
      const home = base.spots.find((s) => s.id === "npc-" + npc.id)!;
      const wall = base.walls.find((w) => w.label === "镇民 · " + npc.name)!;
      return {
        id: npc.id,
        home,
        spot: { ...home },
        original: wall,
        wall,
        yielding: false,
      };
    });
    this.fixedWalls = base.walls.filter(
      (w) => !this.actors.some((a) => a.original === w),
    );
    this.scene = {
      ...base,
      spots: base.spots.map(
        (s) => this.actors.find((a) => a.home === s)?.spot ?? s,
      ),
    };
  }

  anchor(id: string): Hotspot {
    return this.scene.spots.find((s) => s.id === "npc-" + id)!;
  }

  update(player?: Point, actorId?: string, foot?: Point) {
    let changed = false;
    for (const actor of this.actors) {
      const at = actor.id === actorId && foot ? foot : actor.home;
      if (actor.spot.x !== at.x || actor.spot.y !== at.y) {
        actor.spot.x = at.x;
        actor.spot.y = at.y;
        actor.wall = translated(
          actor.original,
          at.x - actor.home.x,
          at.y - actor.home.y,
        );
        changed = true;
      }
      // A performer returning to their mark can land directly on the player.
      // Give way until the feet separate so movement and click routes still work.
      const yielding = !!player && obstacleContainsFoot(player, actor.wall);
      if (actor.yielding !== yielding) {
        actor.yielding = yielding;
        changed = true;
      }
    }
    if (!changed) return;
    this.scene.walls = [
      ...this.fixedWalls,
      ...this.actors.filter((a) => !a.yielding).map((a) => a.wall),
    ];
    for (const { home, spot } of this.actors) {
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
