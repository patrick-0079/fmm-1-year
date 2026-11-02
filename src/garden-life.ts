import type { World } from "./world";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import { gardenGuests, gardenCritters } from "./garden-guests";
import { TOWN_FRAMES } from "./town-data";
import npcUrl from "./assets/town-npcs.webp";
import { canStand } from "./core";
import { drawItem } from "./item-art";
import { CompanionMotion } from "./companion-motion";

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
  private motion = new CompanionMotion();
  private time = 0;
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
      this.motion.reset(this.world.player);
    }
    this.motion.update(this.world.player, c, dt,
      !this.world.paused && !this.world.suspended && !this.world.busy && !this.world.restState);
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
        y: this.motion.position.y + 1,
        draw: (c: CanvasRenderingContext2D) => {
          const p = this.motion.position,
            bob = this.world.paused ? 0 : Math.sin(this.time * 6) * 0.5;
          c.fillStyle = "#5e63462b";
          c.beginPath();
          c.ellipse(p.x, p.y, 7, 2.5, 0, 0, Math.PI * 2);
          c.fill();
          c.save();
          c.translate(p.x, p.y + bob);
          if (this.motion.mirrored) c.scale(-1, 1);
          drawItem(c, this.id as "petBunny" | "petCat", -10, -18, 20, 19);
          c.restore();
        },
      },
    ];
  }
}
