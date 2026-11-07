import type { World, DepthLayer } from "./world";
import type { Inventory } from "./inventory";
import type { Activities } from "./activities";
import { arcadesIn, TOWN_NPCS, type TownNpc } from "./town-data";
import { residentOpening, townDialogues, type TownPage } from "./town-dialogue";
import type { ResidentStory } from "./resident-story";
import { townResidentLayers, residentPlacement, drawResidentPortrait, type TownAct } from "./town-acting";
import { TownResidentMap } from "./town-resident-map";
import { townScene } from "./town-map";
import { drawArcadeStall } from "./arcade-stall";
import type { GameId } from "./arcade-engines";
import npcUrl from "./assets/town-npcs.webp";
import { drawPartyProp } from "./party-art";
import {
  townCanopies,
  festivalProps,
  drawTownSigns,
  drawFestivalProp,
} from "./town-scenery";
export const TOWN_TALKED_KEY = "fufu-town-talked-v1";
interface StoryHooks {
  story: () => ResidentStory;
  save: () => void;
  notify: (text: string) => void;
}

export class Town {
  private sprites = new Image();
  private visited = new Set<string>();
  private time = 0;
  private residents = new TownResidentMap(townScene);
  private placement?: ReturnType<typeof residentPlacement>;
  private act?: TownAct & { npc: TownNpc; after?: TownPage["after"] };
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
    private visitGame: (id: GameId) => void,
    private hooks: StoryHooks,
  ) {
    world.townMap = this.residents.scene;
    this.sprites.src = npcUrl;
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
      this.updateAct(dt);
      const performer = this.act?.npc;
      this.placement = performer && residentPlacement(performer, world.player, this.act);
      this.residents.update(world.scene === "town" ? world.player : undefined, performer?.id, this.placement?.foot);
      world.canvas.parentElement!.toggleAttribute("data-quarry-view",
        world.scene==="town" && world.player.x>1150 && world.player.y<260);
    };
    this.updateJournal();
  }
  reset() {
    this.act = undefined;
    this.visited.clear();
    this.save();
    this.updateJournal();
  }
  interact(id: string) {
    if (this.world.scene !== "town" || !id.startsWith("npc-")) return false;
    const npc = TOWN_NPCS.find((n) => n.id === id.slice(4));
    if (!npc) return false;
    if (!this.visited.has(npc.id)) {
      this.visited.add(npc.id);
      this.save();
      this.updateJournal();
    }
    this.showPage(npc, residentOpening(npc.id, this.hooks.story(), this.inventory.hasBouquet()));
    return true;
  }

  private updateAct(dt: number) {
    const act = this.act;
    if (!act) return;
    const anchor = this.residents.anchor(act.npcId);
    if (this.world.scene !== "town" || Math.hypot(this.world.player.x - anchor.x, this.world.player.y - anchor.y) > 72) {
      this.act = undefined;
      return;
    }
    act.elapsed += dt;
    if (act.after && act.elapsed >= act.after.seconds) this.showPage(act.npc, act.after.next);
    else if (act.pageId === "decline" && act.elapsed >= 0.5) this.act = undefined;
  }

  private showPage(npc: TownNpc, pageId: string) {
    const page = townDialogues[npc.id][pageId];
    const act = { npc, npcId: npc.id, pageId, elapsed: 0, after: page.after };
    this.activities.dialogue(
      page.speaker ?? `${npc.name} · ${npc.role}`,
      page.text,
      (page.choices ?? []).map(([title, target]) => ({
        title,
        run: () => this.answer(npc, target),
      })),
      page.speaker ? null : c => drawResidentPortrait(c, npc, this.sprites, pageId),
      this.residents.anchor(npc.id),
      () => { if (this.act === act) this.act = undefined; },
      page.hint,
    );
    this.act = act;
    if (npc.id === "photo-visitor" && pageId === "move") this.world.facing = this.world.facing === 2 ? 1 : 2;
    if (npc.id === "baker" && pageId === "eat") this.world.facing = 0;
    if (page.effect) this.applyEffect(page.effect);
  }

  private answer(npc: TownNpc, target: string) {
    if (!target.startsWith("@")) {
      this.showPage(npc, target);
      return;
    }
    this.activities.close();
    switch (target) {
      case "@bag": this.inventory.openWardrobe(); break;
      case "@bouquet": this.inventory.openBouquet(); break;
      case "@game": if (npc.game) this.visitGame(npc.game); break;
      case "@decline": this.act = { npc, npcId: npc.id, pageId: "decline", elapsed: 0 }; break;
    }
  }

  private applyEffect(effect: NonNullable<TownPage["effect"]>) {
    const state = this.hooks.story();
    switch (effect) {
      case "deliver":
        if (state.postDelivered) return;
        state.postDelivered = true;
        this.hooks.save();
        this.hooks.notify("晚安信箱里面好像多了点什么");
        break;
      case "pin":
        this.inventory.grant("anniversaryPin");
        state.welcomeReceived = true;
        this.hooks.save();
        break;
      case "bouquet":
        this.inventory.collectBouquet();
        break;
      case "reserve":
        if (state.cake !== "new") return;
        state.cake = "reserved";
        this.hooks.save();
        break;
      case "taste":
        state.cake = "eaten";
        this.hooks.save();
        break;
    }
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
        y: p.y + 3,
        draw: (c: CanvasRenderingContext2D) =>
          drawFestivalProp(c, p, this.time, (x, y, color) =>
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
      ...arcadesIn("town").map(([id, g]) => ({
        y: g.y + 15,
        draw: (c: CanvasRenderingContext2D) =>
          drawArcadeStall(c, g, id),
      })),
      ...TOWN_NPCS.flatMap(n => townResidentLayers(
        n, this.sprites, this.world, this.visited.has(n.id), this.time, this.act,
        this.act?.npcId === n.id ? this.placement : undefined,
      )),
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
