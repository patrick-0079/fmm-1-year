import type { World, DepthLayer } from "./world";
import type { Inventory } from "./inventory";
import type { Activities } from "./activities";
import { TOWN_NPCS, type TownNpc } from "./town-data";
import { residentOpening, townDialogues, type TownPage } from "./town-dialogue";
import { letterChoice, type LetterHandoff, type ResidentStory } from "./resident-story";
import { townResidentLayers, residentPlacement, drawResidentPortrait, type TownAct } from "./town-acting";
import { TownResidentMap } from "./town-resident-map";
import { TownRoutines, worksInTown } from "./town-routines";
import { prepareTownWork } from "./town-work-art";
import { prepareResidentWalk } from "./resident-walk";
import type { SceneId } from "./maps";
import { townForeground } from "./town-foreground";
import { townScene } from "./town-map";
import { drawWishLights, townAttractionLayers, townPlaygroundCovers } from "./town-attraction-art";
import type { GameId } from "./arcade-engines";
import npcUrl from "./assets/town-npcs.webp";
import { drawPartyProp } from "./party-art";
import { TownPond } from "./town-pond";
import { drawTownCrown, drawTownWeather, windAllowance } from "./scenery-wind";
import {
  townCanopies,
  festivalProps,
  drawTownSigns,
  drawFestivalProp,
} from "./town-scenery";
export const TOWN_TALKED_KEY = "fufu-town-talked-v1";
interface StoryHooks {
  story: () => ResidentStory;
  mail: LetterHandoff;
  save: () => void;
  notify: (text: string) => void;
}

export class Town {
  private sprites = new Image();
  private visited = new Set<string>();
  private time = 0;
  private pond = new TownPond();
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  private residents = new TownResidentMap(townScene);
  private lives = new TownRoutines();
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
    this.enterScene(world.scene);
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
      if (world.scene === "town") {
        this.time = world.ambientTime;
        if (!world.paused) this.updateAct(dt);
        this.lives.tick(world.paused ? 0 : dt,world.currentPhase,world.player,world.visibleArea,
          world.pendingInteractionId,this.act?.npcId,this.reducedMotion.matches);
        const performer = this.act?.npc;
        this.placement = performer && residentPlacement(performer, world.player, this.act);
        this.residents.update(world.player,performer?.id,this.placement?.foot,this.lives.people);
      }
      world.canvas.parentElement!.toggleAttribute("data-quarry-view",
        world.scene==="town" && world.player.x>1150 && world.player.y<260);
    };
  }
  get talkedIds(): ReadonlySet<string> { return this.visited; }
  enterScene(scene:SceneId) {
    this.act=undefined;
    this.placement=undefined;
    this.lives.enter(this.world.currentPhase);
    this.residents.update(scene==="town"?this.world.player:undefined,undefined,undefined,this.lives.people);
    if (scene === "town") {
      prepareTownWork();
      for (const npc of TOWN_NPCS) {
        if (worksInTown(npc.id, this.world.currentPhase)) prepareResidentWalk(npc.id);
      }
    }
  }

  reset() {
    this.act = undefined;
    this.visited.clear();
    this.save();
  }
  interact(id: string) {
    if (this.world.scene !== "town" || !id.startsWith("npc-")) return false;
    const npc = TOWN_NPCS.find((n) => n.id === id.slice(4));
    if (!npc || !this.residents.scene.spots.includes(this.residents.anchor(npc.id))) return false;
    const person=this.lives.people.get(npc.id)!;
    if (!worksInTown(npc.id,this.world.currentPhase) && this.act?.npcId!==npc.id) return false;
    if (!this.visited.has(npc.id)) {
      this.visited.add(npc.id);
      this.save();
    }
    const at = {...npc,x:person.x,y:person.y};
    this.showPage(at, residentOpening(npc.id, this.hooks.story(), this.inventory.hasBouquet()));
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
    const pages = townDialogues[npc.id], page = pages[pageId];
    const act = { npc, npcId: npc.id, pageId, elapsed: 0, after: page.after };
    const options = page.letter
      ? [letterChoice(this.hooks.mail, page.letter, () => this.showPage(npc, pageId))]
      : (page.choices ?? []).flatMap(([title, target]) => {
        const letter = pages[target]?.letter;
        return letter && this.hooks.mail.received(letter) ? [] : [{ title, run: () => this.answer(npc, target) }];
      });
    this.activities.dialogue(
      page.speaker ?? `${npc.name} · ${npc.role}`,
      page.text,
      options,
      page.speaker ? null : c => drawResidentPortrait(c, npc, this.sprites, pageId),
      this.residents.anchor(npc.id),
      () => { if (this.act === act) this.act = undefined; },
      page.hint,
    );
    this.act = act;
    if (npc.id === "photo-visitor" && pageId === "move") this.world.facing = this.world.facing === 2 ? 1 : 2;
    if (npc.id === "baker" && pageId === "eat") this.world.facing = 0;
    if (npc.id === "xiaoyou" && (pageId === "receive-orange" || pageId === "taste-orange"))
      this.world.facing = 0;
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
  private layers(): DepthLayer[] {
    if (this.world.scene !== "town") return [];
    const view = this.world.visibleArea;
    const visible = (x: number, y: number) =>
      x + 64 >= view.x && x - 64 <= view.x + view.w && y + 18 >= view.y && y - 76 <= view.y + view.h;
    return [
      ...townPlaygroundCovers(this.world),
      ...townForeground.map(part => ({
        y: part.y,
        draw: (c: CanvasRenderingContext2D) => this.world.drawMapFragment(c, part.points),
      })),
      ...townCanopies.map((t) => ({
        y: t.y,
        draw: (c: CanvasRenderingContext2D) => {
          const behind =
            this.world.player.y < t.y &&
            this.world.player.y > Math.min(...t.points.map((p) => p.y)) - 4 &&
            Math.abs(this.world.player.x - t.x) < 62;
          c.save();
          if (behind) c.globalAlpha = 0.5;
          drawTownCrown(c,this.world,t.x,t.points,this.reducedMotion.matches);
          c.restore();
        },
      })),
      ...festivalProps.filter(p => visible(p.x,p.y)).map((p) => ({
        y: p.y + 3,
        draw: (c: CanvasRenderingContext2D) =>
          drawFestivalProp(c, p, this.reducedMotion.matches ? 0 : this.time, (x, y, color) =>
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
            windAllowance(this.world),
          ),
      })),
      ...townAttractionLayers(this.time, this.reducedMotion.matches),
      ...TOWN_NPCS.flatMap(n => {
        const person=this.lives.people.get(n.id)!;
        if(person.status==="absent" || !visible(person.x,person.y)) return [];
        const placed=this.act?.npcId===n.id ? this.act.npc : {...n,x:person.x,y:person.y};
        return townResidentLayers(placed,this.sprites,this.world,this.visited.has(n.id),this.time,this.act,
          this.act?.npcId===n.id ? this.placement : undefined,person,this.hooks.story().welcomeReceived);
      }),
    ];
  }
  private drawSigns(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "town") return;
    this.pond.draw(c, this.world.visibleArea, this.time, this.reducedMotion.matches);
    if (!this.reducedMotion.matches) drawTownWeather(c,this.world);
    drawTownSigns(c);
    drawWishLights(c, this.time, this.reducedMotion.matches);
  }
}
