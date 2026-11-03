import type { World, DepthLayer } from "./world";
import type { Inventory } from "./inventory";
import type { Activities } from "./activities";
import type { Arcade } from "./arcade";
import { ARCADES, TOWN_NPCS, TOWN_FRAMES } from "./town-data";
import { drawArcadeStall } from "./arcade-stall";
import type { GameId } from "./arcade-engines";
import npcUrl from "./assets/town-npcs.webp";
import cakeUrl from "./assets/anniversary-cake.webp";
import { drawPartyProp } from "./party-art";
import {
  townCanopies,
  festivalProps,
  drawTownSigns,
  drawFestivalProp,
} from "./town-scenery";
export const TOWN_TALKED_KEY = "fufu-town-talked-v1";
export class Town {
  private sprites = new Image();
  private cake = new Image();
  private visited = new Set<string>();
  private time = 0;
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
    private arcade: Arcade,
  ) {
    this.sprites.src = npcUrl;
    this.cake.src = cakeUrl;
    try {
      const list = JSON.parse(
        localStorage.getItem(TOWN_TALKED_KEY) || "[]",
      );
      if (Array.isArray(list))
        for (const id of list)
          if (TOWN_NPCS.some((n) => n.id === id)) this.visited.add(id);
    } catch {}
    const layers = world.getDepthLayers,
      environment = world.onEnvironment,
      tick = world.onTick;
    world.getDepthLayers = () => [...layers(), ...this.layers()];
    world.onEnvironment = (c, t) => {
      environment(c, t);
      this.drawSigns(c);
    };
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.time = t;
    };
    this.updateJournal();
  }
  reset() {
    this.visited.clear();
    this.save();
    this.updateJournal();
  }
  interact(id: string) {
    if (id.startsWith("arcade-")) {
      const key = id.slice(7) as GameId;
      if (ARCADES[key]) {
        this.activities.close();
        this.arcade.open(key);
        return true;
      }
    }
    if (!id.startsWith("npc-")) return false;
    const npc = TOWN_NPCS.find((n) => n.id === id.slice(4));
    if (!npc) return false;
    this.visited.add(npc.id);
    this.save();
    this.updateJournal();
    let line = 0;
    const talk = () =>
      this.activities.dialogue(
        `${npc.name} · ${npc.role}`,
        npc.lines[line % npc.lines.length],
        [
          ...(npc.lines.length > 1
            ? [
                {
                  title: "再聊一句",
                  run: () => {
                    line++;
                    talk();
                  },
                },
              ]
            : []),
          ...(npc.game
            ? [
                {
                  title: "去玩「" + ARCADES[npc.game].title + "」",
                  run: () => {
                    this.activities.close();
                    this.world.visit("arcade-" + npc.game);
                  },
                },
              ]
            : []),
          ...(npc.gift && !this.inventory.has(npc.gift)
            ? [
                {
                  title: "领取周年纪念胸针",
                  run: () => {
                    this.inventory.grant(npc.gift!);
                    talk();
                  },
                },
              ]
            : []),
          { title: "看看纪念背包", run: () => this.inventory.open() },
        ],
        (c) => {
          if (!this.sprites.complete || !this.sprites.naturalWidth) return;
          const f = TOWN_FRAMES[npc.sprite],
            scale = 47 / f.h;
          c.drawImage(
            this.sprites,
            f.x,
            f.y,
            f.w,
            f.h,
            (48 - f.w * scale) / 2,
            5,
            f.w * scale,
            47,
          );
        },
      );
    talk();
    return true;
  }
  private save() {
    try {
      localStorage.setItem(
        TOWN_TALKED_KEY,
        JSON.stringify([...this.visited]),
      );
    } catch {}
  }
  private updateJournal() {
    const count = document.querySelector("#town-npc-count");
    if (count) count.textContent = `${this.visited.size} / ${TOWN_NPCS.length}`;
  }
  private layers(): DepthLayer[] {
    if (this.world.scene !== "town") return [];
    return [
      ...townCanopies.map((t) => ({
        y: t.y,
        draw: (c: CanvasRenderingContext2D) => {
          const behind =
            this.world.player.y < t.y &&
            this.world.player.y > Math.min(...t.points.map((p) => p.y)) - 4 &&
            Math.abs(this.world.player.x - t.x) < 62;
          c.save();
          if (behind) c.globalAlpha = 0.5;
          this.world.drawMapFragment(c, t.points);
          c.restore();
        },
      })),
      ...festivalProps.map((p) => ({
        y: p.y + (p.kind === "cake" ? 15 : 3),
        draw: (c: CanvasRenderingContext2D) =>
          drawFestivalProp(c, p, this.time, this.cake, (x, y, color) =>
            drawPartyProp(
              c,
              color === "#edca8b"
                ? 1
                : ["#db9cc3", "#e9a2c4"].includes(color)
                  ? 0
                  : 2,
              x - 12,
              y - 16,
              24,
              51,
            ),
          ),
      })),
      ...Object.entries(ARCADES).map(([id, g]) => ({
        y: g.y + 15,
        draw: (c: CanvasRenderingContext2D) =>
          drawArcadeStall(c, g, id as GameId),
      })),
      ...TOWN_NPCS.map((n) => ({
        y: n.y,
        draw: (c: CanvasRenderingContext2D) => {
          if (!this.sprites.complete || !this.sprites.naturalWidth) return;
          const f = TOWN_FRAMES[n.sprite],
            scale = 43 / 337,
            h = f.h * scale,
            w = f.w * scale,
            bob = matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : Math.sin(this.time * 1.7 + n.sprite) * 0.5;
          c.fillStyle = "#3f51432e";
          c.beginPath();
          c.ellipse(n.x, n.y, 9, 3, 0, 0, Math.PI * 2);
          c.fill();
          c.drawImage(
            this.sprites,
            f.x,
            f.y,
            f.w,
            f.h,
            n.x - w / 2,
            n.y - h + bob,
            w,
            h,
          );
          if (
            Math.hypot(this.world.player.x - n.x, this.world.player.y - n.y) <
            100
          ) {
            c.font = '8px "Microsoft YaHei", "PingFang SC", sans-serif';
            c.textAlign = "center";
            const width = c.measureText(n.name).width + 10;
            c.fillStyle = "#fff4dce8";
            c.fillRect(n.x - width / 2, n.y + 5, width, 12);
            c.fillStyle = this.visited.has(n.id) ? "#8e8969" : "#9b6e84";
            c.fillText(n.name, n.x, n.y + 14);
          }
        },
      })),
    ];
  }
  private drawSigns(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "town") return;
    drawTownSigns(c);
    c.save();
    c.fillStyle = "#87634d";
    c.fillRect(680, 371, 174, 23);
    c.fillStyle = "#f3dfb1";
    c.fillRect(683, 374, 168, 17);
    c.fillStyle = "#a17183";
    c.font = '10px "Microsoft YaHei",sans-serif';
    c.textAlign = "center";
    c.fillText("芙芙一周年 · 晚安小镇", 767, 386);
    c.restore();
  }
}
