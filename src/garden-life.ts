import type { World } from "./world";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import { gardenGuests, gardenCritters } from "./garden-guests";
import { TOWN_FRAMES } from "./town-data";
import npcUrl from "./assets/town-npcs.webp";
import { canStand, canTravelBetween, findPath, type Point } from "./core";
import { drawItem } from "./item-art";

export class GardenLife {
  private npcs = new Image();
  private time = 0;
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
  ) {
    this.npcs.src = npcUrl;
    const tick = world.onTick,
      layers = world.getDepthLayers;
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.time = t;
    };
    world.getDepthLayers = () => [
      ...layers(),
      ...(world.scene === "garden" ? this.layers() : []),
    ];
  }
  interact(id: string) {
    const npc = gardenGuests.find((n) => id === "garden-guest-" + n.id);
    if (!npc || this.world.scene !== "garden") return false;
    const talk = () =>
      this.activities.dialogue(
        `${npc.name} · ${npc.role}`,
        npc.line,
        [
          ...(npc.gift && !this.inventory.has(npc.gift)
            ? [
                {
                  title: "领取这份陪伴礼物",
                  run: () => {
                    this.inventory.grant(npc.gift!);
                    talk();
                  },
                },
              ]
            : []),
          ...(npc.gift && this.inventory.has(npc.gift)
            ? [
                {
                  title:
                    this.inventory.state.equipped.pet === npc.gift
                      ? "让伙伴休息一会"
                      : "邀请伙伴一起散步",
                  run: () => {
                    this.inventory.toggle(npc.gift!);
                    talk();
                  },
                },
              ]
            : []),
          { title: "看看周年衣橱", run: () => this.inventory.open() },
        ],
        (c) => {
          if (!this.npcs.complete || !this.npcs.naturalWidth) return;
          const f = TOWN_FRAMES[npc.sprite],
            s = 46 / f.h;
          c.drawImage(
            this.npcs,
            f.x,
            f.y,
            f.w,
            f.h,
            (48 - f.w * s) / 2,
            5,
            f.w * s,
            46,
          );
        },
      );
    talk();
    return true;
  }
  private layers() {
    const c = this.world.config;
    return [
      ...gardenGuests.map((n) => ({
        y: n.y,
        draw: (g: CanvasRenderingContext2D) => {
          if (!this.npcs.complete || !this.npcs.naturalWidth) return;
          const f = TOWN_FRAMES[n.sprite],
            s = 43 / 337,
            bob = matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : Math.sin(this.time * 0.8 + n.x) * 0.4;
          g.fillStyle = "#5e63462b";
          g.beginPath();
          g.ellipse(n.x, n.y, 8, 3, 0, 0, Math.PI * 2);
          g.fill();
          g.drawImage(
            this.npcs,
            f.x,
            f.y,
            f.w,
            f.h,
            n.x - (f.w * s) / 2,
            n.y - f.h * s + bob,
            f.w * s,
            f.h * s,
          );
        },
      })),
      ...gardenCritters.map((n) => {
        const moving =
          !this.world.paused &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches;
        const candidate = {
          x: n.x + (moving ? Math.sin(this.time * 0.32 + n.phase) * 8 : 0),
          y: n.y + (moving ? Math.cos(this.time * 0.26 + n.phase) * 5 : 0),
        };
        const p = canStand(candidate, c.walls, c.bounds, c.floor, c.surfaces)
          ? candidate
          : n;
        return {
          y: p.y,
          draw: (g: CanvasRenderingContext2D) => {
            g.fillStyle = "#6b74552b";
            g.beginPath();
            g.ellipse(p.x, p.y, 7, 2.5, 0, 0, Math.PI * 2);
            g.fill();
            drawItem(g, n.id, p.x - 9, p.y - 17, 18, 18);
          },
        };
      }),
    ];
  }
}

export class Companion {
  private scene = "";
  private id = "";
  private position: Point = { x: 0, y: 0 };
  private trail: Point[] = [];
  private path: Point[] = [];
  private retry = 0;
  private time = 0;
  private mirrored = false;
  constructor(private world: World) {
    const tick = world.onTick,
      layers = world.getDepthLayers;
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.time = t;
      this.update(dt);
    };
    world.getDepthLayers = () => [...layers(), ...this.layers()];
  }
  private update(dt: number) {
    const id = this.world.equipment.pet ?? "";
    if (id !== "petBunny" && id !== "petCat") {
      this.id = "";
      return;
    }
    const c = this.world.config;
    if (this.scene !== this.world.scene || this.id !== id) {
      this.scene = this.world.scene;
      this.id = id;
      this.position = { ...this.world.player };
      this.trail = [];
      this.path = [];
    }
    if (this.world.paused || this.world.restState?.kind === "lying") return;
    const last = this.trail.at(-1) ?? this.position;
    if (
      Math.hypot(last.x - this.world.player.x, last.y - this.world.player.y) > 4
    )
      this.trail.push({ ...this.world.player });
    this.retry -= dt;
    if (
      !this.trail.length ||
      Math.hypot(
        this.position.x - this.world.player.x,
        this.position.y - this.world.player.y,
      ) < 22
    ) {
      this.path = [];
      return;
    }
    const target = this.trail[0];
    if (!canTravelBetween(this.position, target, c) && this.retry <= 0) {
      this.path = findPath(this.position, target, c, []) ?? [];
      this.retry = 0.6;
    }
    const next = this.path[0] ?? target,
      dx = next.x - this.position.x,
      dy = next.y - this.position.y,
      d = Math.hypot(dx, dy),
      step = Math.min(d, 85 * dt);
    if (d < 1) {
      if (this.path.length) this.path.shift();
      else this.trail.shift();
      return;
    }
    const p = {
      x: this.position.x + (dx / d) * step,
      y: this.position.y + (dy / d) * step,
    };
    if (canTravelBetween(this.position, p, c)) {
      this.mirrored = dx < 0;
      this.position = p;
    }
    if (this.trail.length > 200) this.trail.splice(0, this.trail.length - 200);
  }
  private layers() {
    if (
      !this.id ||
      this.world.restState?.kind === "lying" ||
      this.world.actorHidden
    )
      return [];
    return [
      {
        y: this.position.y + 1,
        draw: (c: CanvasRenderingContext2D) => {
          const p = this.position,
            bob = this.world.paused ? 0 : Math.sin(this.time * 6) * 0.5;
          c.fillStyle = "#5e63462b";
          c.beginPath();
          c.ellipse(p.x, p.y, 7, 2.5, 0, 0, Math.PI * 2);
          c.fill();
          c.save();
          c.translate(p.x, p.y + bob);
          if (this.mirrored) c.scale(-1, 1);
          drawItem(c, this.id as "petBunny" | "petCat", -10, -18, 20, 19);
          c.restore();
        },
      },
    ];
  }
}
